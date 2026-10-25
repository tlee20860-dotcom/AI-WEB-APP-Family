// ============================================
// handlers-core.js — 核心業務處理（V2 重構版）
// 位置：api/handlers-core.js
// 說明：包含實體 CRUD、銀行、保險同步等核心邏輯。
// ============================================

import { dbGet, dbPut, dbPatch, dbPush, dbDelete } from './config.js';
import {
  authenticate, errorResponse, successResponse, handleError,
  requireFields, roundInt, extractToken, verifyFamilyAccess
} from './helpers.js';

/* ============================================
   1. 查詢家庭 (lookup-family)
   ============================================ */
export async function handleLookupFamily(context) {
  try {
    const { request } = context;
    const auth = await authenticate(request);
    if (auth instanceof Response) return auth;
    const { user, token } = auth;

    const familyId = await dbGet(`platform/uid_index/${user.localId}`, token);
    if (!familyId || typeof familyId !== 'string') {
      return errorResponse('NOT_FOUND', '此帳號不屬於任何家庭，請聯繫管理員');
    }

    let familyName = '我的家庭';
    const snap = await dbGet(`platform/families/${familyId}`, token);
    if (snap?.name) familyName = snap.name;

    const memberAccount = await dbGet(`platform/families/${familyId}/memberAccounts/${user.localId}`, token);

    return successResponse({
      familyId,
      familyName,
      memberAccount: memberAccount || {
        email: user.email || '',
        displayName: '成員',
        role: 'member',
        canInput: true,
      }
    });
  } catch (err) { return handleError(err); }
}

/* ============================================
   2. 家庭設定 (family-settings)
   ============================================ */
export async function handleFamilySettings(context) {
  try {
    const { request } = context;
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');

    const auth = await authenticate(request, { needFamily: true, body: { familyId } });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    if (request.method === 'GET') {
      const basePath = `families/${familyId}`;
      const [statuses, options, yearRange, uiConstants] = await Promise.all([
        dbGet(`${basePath}/statuses`, token),
        dbGet(`${basePath}/settings/options`, token),
        dbGet(`${basePath}/settings/year_range`, token),
        dbGet(`${basePath}/settings/ui_constants`, token),
      ]);
      const statusList = Object.entries(statuses || {}).map(([id, s]) => ({ id, ...s })).sort((a, b) => (a.order || 0) - (b.order || 0));

      return successResponse({
        familyId,
        statuses: statusList,
        options: options || null,
        yearRange: yearRange || null,
        uiConstants: uiConstants || null,
      });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { action, id, data } = body || {};
      const basePath = `families/${familyId}`;

      if (action === 'update') {
        const results = {};
        if (data.options !== undefined) results.options = await dbPut(`${basePath}/settings/options`, data.options, token);
        if (data.yearRange !== undefined) results.yearRange = await dbPut(`${basePath}/settings/year_range`, data.yearRange, token);
        if (data.uiConstants !== undefined) results.uiConstants = await dbPut(`${basePath}/settings/ui_constants`, data.uiConstants, token);
        return successResponse({ results });
      }
      
      if (action === 'put-status') {
        const clean = {
          name: String(data.name).trim(),
          category: ['personal', 'fixed', 'insurance'].includes(data.category) ? data.category : 'personal',
          isDone: !!data.isDone,
          order: Number(data.order) || 0,
          createdAt: data.createdAt || Date.now(),
        };
        let savedId = id;
        if (id) await dbPut(`${basePath}/statuses/${id}`, clean, token);
        else savedId = await dbPush(`${basePath}/statuses`, clean, token);
        return successResponse({ id: savedId, data: clean });
      }

      if (action === 'delete-status') {
        await dbDelete(`${basePath}/statuses/${id}`, token);
        return successResponse({ deletedId: id });
      }
    }
    return errorResponse('BAD_REQUEST', '未知的請求');
  } catch (err) { return handleError(err); }
}

/* ============================================
   3. 統一實體 CRUD (entity-create)
   ============================================ */
const ENTITY_PATH = {
  member: 'members', bank: 'banks', bankAccount: 'bank_accounts',
  category: 'expense_categories', item: 'expense_items', payment: 'payment_methods',
  company: 'insurance_companies', policy: 'insurance_policies', fund: 'funds',
};

export async function handleEntityPost(context) {
  try {
    const { request } = context;
    const body = await request.json();
    const { familyId, action, entityType, id, code, name, extra } = body;

    const auth = await authenticate(request, { needFamily: true, body });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    // 特殊處理：expense 路徑含年 / 月 / 成員三層，非 ENTITY_PATH 單層列表
    if (entityType === 'expense') {
      if (action !== 'update') {
        return errorResponse('INVALID_BODY', 'expense 僅支援 update（新增請走 db/write 的 addExpense）');
      }
      if (!id) return errorResponse('MISSING_FIELDS', '缺少 id');

      const year = String(extra?.year || '');
      const month = String(extra?.month || '').padStart(2, '0');
      const memberId = String(extra?.memberId || '');

      if (!year || !month || month === '00' || !memberId) {
        return errorResponse('MISSING_FIELDS', 'expense 更新需 year / month / memberId');
      }
      if (!/^\d{4}$/.test(year)) {
        return errorResponse('INVALID_BODY', 'year 需為四位數字');
      }
      if (!/^(0[1-9]|1[0-2])$/.test(month)) {
        return errorResponse('INVALID_BODY', 'month 需為 01~12');
      }

      const expensePath = `families/${familyId}/expenses/${year}/${month}/member_expenses/${memberId}/${id}`;
      const existing = await dbGet(expensePath, token);
      if (!existing) return errorResponse('NOT_FOUND', `找不到支出：${id}`);

      const patch = {};
      if (extra.status !== undefined) patch.status = extra.status;
      if (extra.name !== undefined) patch.name = String(extra.name);
      if (extra.amount !== undefined) patch.amount = roundInt(extra.amount);
      if (extra.date !== undefined) patch.date = String(extra.date);
      if (!Object.keys(patch).length) {
        return errorResponse('INVALID_BODY', '無可更新欄位');
      }
      patch.updatedAt = Date.now();

      await dbPatch(expensePath, patch, token);
      return successResponse({ id });
    }

    if (!entityType || !ENTITY_PATH[entityType]) return errorResponse('INVALID_BODY', `未知的 entityType：${entityType}`);
    const listPath = `families/${familyId}/${ENTITY_PATH[entityType]}`;

    if (action === 'create') {
      if (!name) return errorResponse('MISSING_FIELDS', '缺少 name');
      if (!code) return errorResponse('MISSING_FIELDS', '缺少 code');
      const list = (await dbGet(listPath, token)) || {};
      
      if (Object.values(list).some((v) => v.code === code)) return errorResponse('CODE_DUPLICATE', `編號已存在：${code}`, 409);
      if (Object.values(list).some((v) => v.name === name)) return errorResponse('NAME_DUPLICATE', `名稱重複：${name}`, 409);

      const payload = { code, name, ...extra, createdAt: Date.now() };
      const newId = await dbPush(listPath, payload, token);
      return successResponse({ id: newId, code });
    }

    if (action === 'update') {
      if (!id) return errorResponse('MISSING_FIELDS', '缺少 id');
      const itemPath = `${listPath}/${id}`;
      const existing = await dbGet(itemPath, token);
      if (!existing) return errorResponse('NOT_FOUND', `找不到：${id}`);

      if (name) {
        const list = (await dbGet(listPath, token)) || {};
        if (Object.entries(list).some(([k, v]) => k !== id && v.name === name)) {
          return errorResponse('NAME_DUPLICATE', `名稱重複：${name}`, 409);
        }
      }
      const payload = { ...(name !== undefined ? { name } : {}), ...extra, updatedAt: Date.now() };
      await dbPatch(itemPath, payload, token);
      return successResponse({ id });
    }

    if (action === 'delete') {
      if (!id) return errorResponse('MISSING_FIELDS', '缺少 id');
      await dbDelete(`${listPath}/${id}`, token);
      return successResponse({ id });
    }

    return errorResponse('INVALID_BODY', `未知的 action：${action}`);
  } catch (err) { return handleError(err); }
}

/* ============================================
   4. 銀行與交易
   ============================================ */
export async function handleBankAccounts(context) {
  try {
    const { request } = context;
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    const auth = await authenticate(request, { needFamily: true, body: { familyId } });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    const basePath = `families/${familyId}/bank_accounts`;
    if (request.method === 'GET') {
      const data = await dbGet(basePath, token) || {};
      const list = Object.entries(data).map(([id, x]) => ({ id, ...x })).sort((a, b) => (a.order || 0) - (b.order || 0));
      return successResponse({ accounts: list });
    }

    const body = await request.json();
    const { action, id, data } = body;
    if (action === 'create') {
      const clean = { name: String(data.name).trim(), type: data.type || 'family', initialBalance: roundInt(data.initialBalance), initialYear: String(data.initialYear), initialMonth: String(data.initialMonth), order: Number(data.order) || 0, createdAt: Date.now() };
      const newId = await dbPush(basePath, clean, token);
      return successResponse({ id: newId, data: clean });
    }
    if (action === 'update') {
      await dbPatch(`${basePath}/${id}`, data, token);
      return successResponse({ id });
    }
    if (action === 'remove') {
      await dbDelete(`${basePath}/${id}`, token);
      return successResponse({ removedId: id });
    }
    return errorResponse('BAD_REQUEST', '未知 action');
  } catch (err) { return handleError(err); }
}

export async function handleBankTransactions(context) {
  try {
    const { request } = context;
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    const bankId = url.searchParams.get('bankId');
    const action = url.searchParams.get('action') || 'list';

    const auth = await authenticate(request, { needFamily: true, body: { familyId } });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    if (request.method === 'GET') {
      if (action === 'listAll') {
        const allBanks = await dbGet(`families/${familyId}/bank_accounts`, token) || {};
        const flat = [];
        Object.entries(allBanks).forEach(([bid, bd]) => {
          Object.entries(bd.transactions || {}).forEach(([tid, txn]) => flat.push({ id: tid, bankId: bid, bankName: bd.name || '', ...txn }));
        });
        return successResponse({ transactions: flat });
      }
      const data = await dbGet(`families/${familyId}/bank_accounts/${bankId}/transactions`, token) || {};
      const list = Object.entries(data).map(([id, x]) => ({ id, ...x }));
      return successResponse({ transactions: list });
    }

    const body = await request.json();
    const { txnId, data } = body;
    const basePath = `families/${familyId}/bank_accounts/${bankId}/transactions`;

    if (body.action === 'create') {
      const newId = await dbPush(basePath, { ...data, amount: roundInt(data.amount), createdAt: Date.now() }, token);
      return successResponse({ id: newId });
    }
    if (body.action === 'update') {
      await dbPatch(`${basePath}/${txnId}`, { ...data, updatedAt: Date.now() }, token);
      return successResponse({ txnId });
    }
    if (body.action === 'remove') {
      await dbDelete(`${basePath}/${txnId}`, token);
      return successResponse({ removedId: txnId });
    }
    return errorResponse('BAD_REQUEST', '未知 action');
  } catch (err) { return handleError(err); }
}

/* ============================================
   5. 保險同步
   ============================================ */
export async function handleInsuranceSync(context) {
  try {
    const { request } = context;
    const body = await request.json();
    const { action, familyId, policyId, memberId, policyName, monthlyAverage, year, month, bankId, txnId, paymentMode, advanceHolderId } = body;
    
    const auth = await authenticate(request, { needFamily: true, body });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    const basePath = `families/${familyId}`;
    const linkedKey = `linked_${policyId}`;
    const expensePath = `${basePath}/expenses/${year}/${month}/member_expenses/${memberId}/${linkedKey}`;
    const paymentPath = `${basePath}/insurance_payments/${policyId}/${year}/${month}`;
    const amount = roundInt(monthlyAverage);

    if (action === 'delete') {
      await dbDelete(expensePath, token);
      await dbDelete(paymentPath, token);
      if (paymentMode === 'advance' && advanceHolderId) {
        await _refundAdvance(basePath, policyId, advanceHolderId, amount, year, month, token);
      }
      await _reverseFundAccumulation(basePath, policyId, year, month, token);
      return successResponse({ deleted: true });
    }

    const statuses = await dbGet(`${basePath}/statuses`, token) || {};
    const firstCategoryId = _getFirstCategoryId(await dbGet(`${basePath}/expense_categories`, token));
    const resolvedExpenseStatus = _findDoneStatus(statuses, 'personal') || '已還款';
    const resolvedPaymentStatus = _findDoneStatus(statuses, 'insurance') || '已扣款';

    await dbPut(expensePath, {
      name: `${policyName} (平攤)`, amount, status: resolvedExpenseStatus, date: '',
      categoryId: firstCategoryId, bankId: bankId || '', txnId: txnId || '',
      isAutoLinked: true, policyId, createdAt: Date.now(),
    }, token);

    await dbPut(paymentPath, {
      status: resolvedPaymentStatus, amount, date: new Date().toISOString().slice(0, 10),
      bankId: bankId || '', txnId: txnId || '', paymentMode: paymentMode || 'direct',
    }, token);

    if (paymentMode === 'advance' && advanceHolderId) {
      await _deductAdvance(basePath, policyId, advanceHolderId, amount, year, month, token);
    }
    await _accumulateFunds(basePath, policyId, year, month, token);

    return successResponse({ synced: true });
  } catch (err) { return handleError(err); }
}

/* --- 內部輔助：基金與代墊 --- */
async function _accumulateFunds(basePath, policyId, year, month, token) {
  const policy = await dbGet(`${basePath}/insurance_policies/${policyId}`, token);
  if (!policy || policy.type !== 'fund_insurance' || !policy.fundsAllocation) return;
  const monthlyPremium = roundInt(policy.monthlyPremium);
  for (const a of policy.fundsAllocation) {
    if (!a.fundId) continue;
    const addCost = Math.round(monthlyPremium * (Number(a.pct) || 0) / 100);
    const snapPath = `${basePath}/funds/${a.fundId}/snapshots/${year}/${String(month).padStart(2, '0')}`;
    const snap = await dbGet(snapPath, token) || {};
    await dbPatch(snapPath, { cumulativeCost: roundInt(snap.cumulativeCost) + addCost, updatedAt: Date.now() }, token);
  }
}
async function _reverseFundAccumulation(basePath, policyId, year, month, token) {
  const policy = await dbGet(`${basePath}/insurance_policies/${policyId}`, token);
  if (!policy || policy.type !== 'fund_insurance' || !policy.fundsAllocation) return;
  const monthlyPremium = roundInt(policy.monthlyPremium);
  for (const a of policy.fundsAllocation) {
    if (!a.fundId) continue;
    const subCost = Math.round(monthlyPremium * (Number(a.pct) || 0) / 100);
    const snapPath = `${basePath}/funds/${a.fundId}/snapshots/${year}/${String(month).padStart(2, '0')}`;
    const snap = await dbGet(snapPath, token);
    if (snap) await dbPatch(snapPath, { cumulativeCost: Math.max(0, roundInt(snap.cumulativeCost) - subCost) }, token);
  }
}
async function _deductAdvance(basePath, policyId, holderId, amount, year, month, token) {
  const advances = await dbGet(`${basePath}/member_advances/${holderId}`, token);
  if (!advances) return;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  for (const [id, adv] of Object.entries(advances)) {
    if (adv.policyId !== policyId) continue;
    const paid = { ...(adv.paidMonths || {}) };
    if (paid[monthKey]) return;
    paid[monthKey] = true;
    await dbPatch(`${basePath}/member_advances/${holderId}/${id}`, { remainingAmount: Math.max(0, roundInt(adv.remainingAmount) - amount), paidMonths: paid, updatedAt: Date.now() }, token);
    return;
  }
}
async function _refundAdvance(basePath, policyId, holderId, amount, year, month, token) {
  const advances = await dbGet(`${basePath}/member_advances/${holderId}`, token);
  if (!advances) return;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  for (const [id, adv] of Object.entries(advances)) {
    if (adv.policyId !== policyId) continue;
    const paid = { ...(adv.paidMonths || {}) };
    if (!paid[monthKey]) return;
    delete paid[monthKey];
    await dbPatch(`${basePath}/member_advances/${holderId}/${id}`, { remainingAmount: Math.min(roundInt(adv.totalAmount), roundInt(adv.remainingAmount) + amount), paidMonths: paid, updatedAt: Date.now() }, token);
    return;
  }
}
function _getFirstCategoryId(categories) {
  const list = Object.entries(categories || {}).map(([id, c]) => ({ id, ...c })).sort((a, b) => (a.order || 0) - (b.order || 0));
  return list.length > 0 ? list[0].id : '';
}
function _findDoneStatus(statuses, category) {
  const list = Object.entries(statuses).map(([id, s]) => ({ id, ...s })).filter((s) => s.category === category && s.isDone);
  return list.length > 0 ? list[0].name : null;
}

/* ═══ EOF ═══
F: api/handlers-core.js
V: 1792901200
W: webapp-20261025-001#1
═══ */