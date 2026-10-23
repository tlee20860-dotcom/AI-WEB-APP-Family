// ============================================
// _api-core.js — 後端核心邏輯 (v2.1.0)
// 版本：2.1.0（FIX-B：補齊 GAP-02~08 所有空殼 Handler）
// ============================================

const _DB_CONFIGS = {
  old: { url: 'https://family-fin-a6dd1-default-rtdb.asia-southeast1.firebasedatabase.app', apiKey: 'AIzaSyCQlrNdorKJI9xsqr4m4ME046lrubo9Y7I' },
  new: { url: 'https://family-3d0a5-default-rtdb.asia-southeast1.firebasedatabase.app', apiKey: 'AIzaSyBJCK83RQyHbol4yJ4UDo3pOUXpUgcW9hU' },
};

let FIREBASE_DB_URL = _DB_CONFIGS.old.url;
let FIREBASE_API_KEY = _DB_CONFIGS.old.apiKey;
const SUPERADMIN_EMAIL = 'superadmin@familyfin.local';
const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1';

export function initConfig(env) {
  const target = (env && env.DB_TARGET) || 'old';
  const cfg = _DB_CONFIGS[target] || _DB_CONFIGS.old;
  FIREBASE_DB_URL = cfg.url;
  FIREBASE_API_KEY = cfg.apiKey;
}

/* ============================================
   Firebase REST 操作
   ============================================ */
async function dbGet(path, token = '') {
  const url = `${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}
async function dbPut(path, data, token = '') {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.ok;
}
async function dbPatch(path, data, token = '') {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.ok;
}
async function dbPush(path, data, token = '') {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) return null;
  const result = await res.json();
  return result?.name || null;
}
async function dbDelete(path, token = '') {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`, { method: 'DELETE' });
  return res.ok;
}
async function dbSignUp(email, password) {
  const res = await fetch(`${IDENTITY_TOOLKIT_URL}/accounts:signUp?key=${FIREBASE_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: false }) });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data?.error?.message || 'UNKNOWN_ERROR' };
  return { ok: true, uid: data.localId, email: data.email };
}

/* ============================================
   工具函式
   ============================================ */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function errorResponse(code, message = '', status) {
  const statusMap = { UNAUTHORIZED: 401, FORBIDDEN: 403, MISSING_FIELDS: 400, INVALID_BODY: 400, BAD_REQUEST: 400, NOT_FOUND: 404, CONFLICT: 409, INTERNAL: 500 };
  return jsonResponse({ ok: false, error: code, message: message || undefined }, status || statusMap[code] || 500);
}
function handleError(err) {
  console.error('[_api-core] error:', err);
  return errorResponse('INTERNAL', String(err?.message || err));
}
function successResponse(data = {}) {
  return jsonResponse({ ok: true, ...data });
}
function extractToken(request) {
  return (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
}
function requireFields(body, fields) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'INVALID_BODY', fields };
  const missing = fields.filter((f) => body[f] === '' || body[f] == null);
  return missing.length > 0 ? { ok: false, error: 'MISSING_FIELDS', fields: missing } : null;
}

/* ============================================
   認證與權限
   ============================================ */
const _tokenCache = new Map();
async function verifyToken(token) {
  if (!token) return null;
  const cached = _tokenCache.get(token);
  if (cached && cached.expireAt > Date.now()) return cached.user;
  try {
    const res = await fetch(`${IDENTITY_TOOLKIT_URL}/accounts:lookup?key=${FIREBASE_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.users?.[0] || null;
    if (user) _tokenCache.set(token, { user, expireAt: Date.now() + 60000 });
    return user;
  } catch { return null; }
}

async function verifySuperAdmin(token) {
  const user = await verifyToken(token);
  return user?.email === SUPERADMIN_EMAIL ? user : null;
}

async function verifyFamilyAccess(token, familyId) {
  if (!familyId) return null;
  const user = await verifyToken(token);
  if (!user) return null;
  const isSuper = user.email === SUPERADMIN_EMAIL;
  if (isSuper) return { user, isSuper: true, isOwner: true, canInput: true };
  if (user.localId === familyId) return { user, isSuper: false, isOwner: true, canInput: true, isLegacy: true };
  const memberAccount = await dbGet(`platform/families/${familyId}/memberAccounts/${user.localId}`, token);
  if (memberAccount) return { user, isSuper: false, isOwner: memberAccount.role === 'owner', canInput: memberAccount.canInput !== false };
  return null;
}

async function verifyFamilyAccessByUid(uid, token = '') {
  if (!uid) return null;
  const familyId = await dbGet(`platform/uid_index/${uid}`, token);
  if (familyId && typeof familyId === 'string') {
    const memberAccount = await dbGet(`platform/families/${familyId}/memberAccounts/${uid}`, token);
    return { familyId, memberAccount: memberAccount || null, isLegacy: false };
  }
  const familySnap = await dbGet(`platform/families/${uid}`, token);
  if (familySnap) return { familyId: uid, memberAccount: { email: '', displayName: familySnap.name || '我的家庭', role: 'owner', canInput: true }, isLegacy: true };
  return null;
}

async function authenticate(request, options = {}) {
  const { body, requiredFields: reqFields, needSuperAdmin, needFamily } = options;
  const token = extractToken(request);
  if (reqFields && body) { const missing = requireFields(body, reqFields); if (missing) return errorResponse('MISSING_FIELDS', '', 400); }
  
  if (needSuperAdmin) {
    const user = await verifySuperAdmin(token);
    return user ? { token, user, isSuper: true } : errorResponse('FORBIDDEN', '需要超級管理員權限');
  }
  
  if (needFamily) {
    let familyId = body?.familyId || new URL(request.url).searchParams.get('familyId');
    if (!familyId) return errorResponse('MISSING_FIELDS', 'familyId 為必填');
    const result = await verifyFamilyAccess(token, familyId);
    if (!result) return errorResponse('FORBIDDEN', '無權存取此家庭');
    return { token, user: result.user, isSuper: result.isSuper, isOwner: result.isOwner, canInput: result.canInput, familyId };
  }
  
  const user = await verifyToken(token);
  return user ? { token, user, isSuper: user.email === SUPERADMIN_EMAIL } : errorResponse('UNAUTHORIZED', '請重新登入');
}

/* ============================================
   輔助函式
   ============================================ */
const objToList = (obj, sortFn) => { const list = Object.entries(obj || {}).map(([id, x]) => ({ id, ...x })); if (sortFn) list.sort(sortFn); return list; };
const roundInt = (v) => Math.round(Number(v) || 0);
const LINKED_PREFIX = 'linked_';
const buildLinkedKey = (policyId) => `${LINKED_PREFIX}${policyId}`;

async function _signInWithPassword(email, password) {
  try {
    const url = `${IDENTITY_TOOLKIT_URL}/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: false }) });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error?.message || 'UNKNOWN_ERROR' };
    return { ok: true, uid: data.localId, email: data.email };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

async function _resolveMemberId(familyId, displayName, token) {
  const dn = String(displayName || '').trim();
  if (!dn) return '';
  try {
    const members = await dbGet(`families/${familyId}/members`, token);
    if (!members || typeof members !== 'object') return '';
    const matched = Object.entries(members).find(([, m]) => String((m && m.name) || '').trim() === dn);
    return matched ? matched[0] : '';
  } catch (err) { return ''; }
}

async function _resolveOwnMemberId(familyId, uid, token) {
  const memberAccount = await dbGet(`platform/families/${familyId}/memberAccounts/${uid}`, token);
  if (memberAccount && memberAccount.memberId) return memberAccount.memberId;
  if (memberAccount && memberAccount.displayName) {
    const mid = await _resolveMemberId(familyId, memberAccount.displayName, token);
    if (mid) return mid;
  }
  try {
    const members = await dbGet(`families/${familyId}/members`, token);
    if (members && typeof members === 'object') {
      const keys = Object.keys(members);
      if (keys.length === 1) return keys[0];
    }
  } catch (e) {}
  return '';
}

/* ============================================
   Admin Handlers
   ============================================ */
async function handleAdminFamiliesGet(request) {
  try {
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const list = await dbGet('platform/families', auth.token);
    const families = Object.entries(list || {}).map(([uid, data]) => ({ uid, ...data })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return successResponse({ families });
  } catch (err) { return handleError(err); }
}

async function handleAdminFamiliesPost(request) {
  try {
    const body = await request.json();
    const { action, uid, name, email } = body || {};
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    if (action === 'add') {
      const missing = requireFields(body, ['uid', 'name']);
      if (missing) return errorResponse('MISSING_FIELDS', '缺少 uid 或 name');
      const success = await dbPut(`platform/families/${uid}`, { name: String(name).trim(), ownerEmail: email ? String(email).trim() : '', createdAt: Date.now() }, token);
      if (!success) return errorResponse('INTERNAL', 'Firebase 寫入失敗');
      return successResponse();
    }
    if (action === 'remove') {
      const missing = requireFields(body, ['uid']);
      if (missing) return errorResponse('MISSING_FIELDS', '缺少 uid');
      let accounts = null;
      try { accounts = await dbGet(`platform/families/${uid}/memberAccounts`, token); } catch (e) {}
      const cleanups = [];
      if (accounts) {
        Object.entries(accounts).forEach(([mUid, acc]) => {
          cleanups.push(dbDelete(`platform/uid_index/${mUid}`, token).catch(() => false));
          if (acc?.account) cleanups.push(dbDelete(`platform/email_index/${acc.account}`, token).catch(() => false));
        });
      }
      await Promise.all(cleanups);
      const ok1 = await dbDelete(`platform/families/${uid}`, token);
      const ok2 = await dbDelete(`families/${uid}`, token);
      if (!ok1 && !ok2) return errorResponse('INTERNAL', '刪除失敗');
      return successResponse({ deletedPlatform: ok1, deletedFamilyData: ok2, cleanedIndexes: cleanups.length });
    }
    return errorResponse('BAD_REQUEST', '未知的 action');
  } catch (err) { return handleError(err); }
}

const FALLBACK = {
  members: { mem_husband: { name: '成員1', role: 'husband', order: 0 }, mem_wife: { name: '成員2', role: 'wife', order: 1 }, mem_son: { name: '成員3', role: 'child', order: 2 }, mem_daughter: { name: '成員4', role: 'child', order: 3 } },
  banks: {}, insurance_companies: { comp_ftlife: { name: '富通', order: 1 }, comp_prudential: { name: '保誠', order: 2 }, comp_fwd: { name: 'FWD', order: 3 }, comp_aia: { name: 'AIA', order: 4 }, comp_manulife: { name: '宏利', order: 5 }, comp_axa: { name: 'AXA', order: 6 } },
  payment_methods: { pm_cash: { name: '現金', order: 1 }, pm_boc: { name: '中銀', order: 2 }, pm_hsbc: { name: '匯豐', order: 3 }, pm_hangs: { name: '恆生', order: 4 }, pm_credit: { name: '信用卡', order: 5 } },
  expense_categories: { cat_medical: { name: '醫療類', order: 1 }, cat_school: { name: '學校類', order: 2 }, cat_insurance: { name: '保險類', order: 3 }, cat_fixed: { name: '固定費用類', order: 4 }, cat_other: { name: '其他', order: 5 } },
  expense_items: { item_med_01: { categoryKey: 'cat_medical', name: '看病-一般' }, item_sch_01: { categoryKey: 'cat_school', name: '學費' } },
  statuses: { status_untreated: { name: '未處理', category: 'personal', isDone: false, order: 1 }, status_done: { name: '已處理', category: 'personal', isDone: true, order: 2 }, status_unbilled: { name: '未扣款', category: 'insurance', isDone: false, order: 8 }, status_billed: { name: '已扣款', category: 'insurance', isDone: true, order: 9 } },
  options: { memberRoles: [{ value: 'husband', label: '老公 / 丈夫' }, { value: 'wife', label: '老婆 / 妻子' }, { value: 'child', label: '子女' }, { value: 'other', label: '其他' }], policyTypes: [{ value: 'normal', label: '普通保險' }, { value: 'fund_insurance', label: '基金保險' }], categoryOrder: ['銀行類', '醫療類', '學校類', '保險類', '固定費用類', '交通類', '其他'] },
  year_range: { startYear: null, futureYears: 5 }, ui_constants: { nameMaxLenDesktop: 12, nameMaxLenMobile: 6, toastDuration: 2000 },
};

async function handleAdminInitFamily(request) {
  try {
    const body = await request.json();
    const { uid } = body || {};
    if (!uid) return errorResponse('MISSING_FIELDS', '缺少 uid');
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${uid}`;
    const existing = await dbGet(`${basePath}/members`, token);
    if (existing && Object.keys(existing).length > 0) return successResponse({ skipped: true, message: '此家庭已有資料' });

    const defaults = {};
    for (const k of Object.keys(FALLBACK)) {
      const val = await dbGet(`platform/defaults/${k}`, token);
      defaults[k] = (val && Object.keys(val).length > 0) ? val : FALLBACK[k];
    }
    const now = Date.now();
    const results = { members: false, banks: false, insurance_companies: false, payment_methods: false, expense_categories: false, expense_items: false, statuses: false, options: false, year_range: false, ui_constants: false };

    results.members = await dbPut(`${basePath}/members`, Object.fromEntries(Object.entries(defaults.members).map(([k, v], i) => [k, { ...v, createdAt: now + i }])), token);
    results.banks = await dbPut(`${basePath}/banks`, {}, token);
    results.insurance_companies = await dbPut(`${basePath}/insurance_companies`, Object.fromEntries(Object.entries(defaults.insurance_companies).map(([k, v], i) => [k, { ...v, createdAt: now + i }])), token);
    results.payment_methods = await dbPut(`${basePath}/payment_methods`, Object.fromEntries(Object.entries(defaults.payment_methods).map(([k, v], i) => [k, { ...v, createdAt: now + i }])), token);
    results.expense_categories = await dbPut(`${basePath}/expense_categories`, Object.fromEntries(Object.entries(defaults.expense_categories).map(([k, v], i) => [k, { ...v, createdAt: now + i }])), token);
    results.expense_items = await dbPut(`${basePath}/expense_items`, Object.fromEntries(Object.entries(defaults.expense_items).map(([k, v], i) => [k, { name: v.name || '', categoryId: v.categoryKey || v.categoryId || '', createdAt: now + i }])), token);
    results.statuses = await dbPut(`${basePath}/statuses`, Object.fromEntries(Object.entries(defaults.statuses).map(([k, v], i) => [k, { ...v, createdAt: now + i }])), token);
    results.options = await dbPut(`${basePath}/settings/options`, defaults.options, token);
    results.year_range = await dbPut(`${basePath}/settings/year_range`, defaults.year_range, token);
    results.ui_constants = await dbPut(`${basePath}/settings/ui_constants`, defaults.ui_constants, token);

    const failed = Object.entries(results).filter(([, ok]) => ok === false).map(([k]) => k);
    return successResponse({ created: true, partial: failed.length > 0, failedSteps: failed, results });
  } catch (err) { return handleError(err); }
}

const LEGACY_STATUS_MAP = { '未處理': 'pending', '未還款': 'pending', '未付款': 'pending', '未扣款': 'pending', '未轉入': 'pending', '已處理': 'done', '已還款': 'done', '已付款': 'done', '已扣款': 'done', '已轉入': 'done', '不適用': 'skipped' };
const _normalizeStatus = (raw) => (raw == null || raw === '') ? 'pending' : (['pending', 'done', 'skipped'].includes(raw) ? raw : (LEGACY_STATUS_MAP[raw] || 'pending'));

async function handleAdminMigrate(request) {
  try {
    const body = await request.json();
    const { familyId, confirm } = body || {};
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    if (confirm !== 'MIGRATE_ALL') return errorResponse('BAD_REQUEST', '必須提供確認參數');
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${familyId}`;
    const summary = { expenses: { scanned: 0, normalized: 0 }, payments: { scanned: 0, normalized: 0 }, policies: { scanned: 0, patched: 0 }, funds: { scanned: 0, patched: 0 } };

    const expensesSnap = await dbGet(`${basePath}/expenses`, token);
    if (expensesSnap) {
      for (const [y, months] of Object.entries(expensesSnap)) {
        for (const [m, monthData] of Object.entries(months || {})) {
          for (const [mid, items] of Object.entries(monthData?.member_expenses || {})) {
            for (const [eid, e] of Object.entries(items || {})) {
              if (!e || typeof e !== 'object') continue;
              summary.expenses.scanned++;
              let changed = false;
              const ns = _normalizeStatus(e.status);
              if (e.status !== ns) { e.status = ns; changed = true; }
              if (e.isAutoLinked === undefined) { e.isAutoLinked = !!e.policyId; changed = true; }
              if (changed) { await dbPut(`${basePath}/expenses/${y}/${m}/member_expenses/${mid}/${eid}`, e, token); summary.expenses.normalized++; }
            }
          }
        }
      }
    }

    const paymentsSnap = await dbGet(`${basePath}/insurance_payments`, token);
    if (paymentsSnap) {
      for (const [pid, years] of Object.entries(paymentsSnap)) {
        for (const [y, months] of Object.entries(years || {})) {
          for (const [m, p] of Object.entries(months || {})) {
            if (!p || typeof p !== 'object') continue;
            summary.payments.scanned++;
            const ns = _normalizeStatus(p.status);
            if (p.status !== ns) { await dbPut(`${basePath}/insurance_payments/${pid}/${y}/${m}`, { ...p, status: ns }, token); summary.payments.normalized++; }
          }
        }
      }
    }

    const policiesSnap = await dbGet(`${basePath}/insurance_policies`, token);
    if (policiesSnap) {
      for (const [pid, p] of Object.entries(policiesSnap)) {
        if (!p || typeof p !== 'object') continue;
        summary.policies.scanned++;
        const patch = {};
        if (!Array.isArray(p.fundsAllocation)) patch.fundsAllocation = [];
        if (p.type === undefined) patch.type = 'normal';
        if (Object.keys(patch).length > 0) { await dbPut(`${basePath}/insurance_policies/${pid}`, { ...p, ...patch }, token); summary.policies.patched++; }
      }
    }

    const fundsSnap = await dbGet(`${basePath}/funds`, token);
    if (fundsSnap) {
      for (const [fid, f] of Object.entries(fundsSnap)) {
        if (!f || typeof f !== 'object') continue;
        summary.funds.scanned++;
        const patch = {};
        if (f.type === undefined) patch.type = 'standalone';
        if (f.policyId === undefined) patch.policyId = '';
        if (Object.keys(patch).length > 0) { await dbPut(`${basePath}/funds/${fid}`, { ...f, ...patch }, token); summary.funds.patched++; }
      }
    }

    return successResponse({ migrated: true, familyId, summary });
  } catch (err) { return handleError(err); }
}

/* ============================================
   Bank Handlers (GAP-02)
   ============================================ */
async function handleBankAccountsGet(request) {
  try {
    const familyId = new URL(request.url).searchParams.get('familyId');
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    const auth = await authenticate(request, { needFamily: true });
    if (auth instanceof Response) return auth;
    const data = await dbGet(`families/${familyId}/bank_accounts`, auth.token);
    const list = objToList(data, (a, b) => (a.order ?? 9999) - (b.order ?? 9999) || (a.createdAt || 0) - (b.createdAt || 0));
    return successResponse({ familyId, accounts: list, count: list.length });
  } catch (err) { return handleError(err); }
}

async function handleBankAccountsPost(request) {
  try {
    const body = await request.json();
    const { familyId, action, id, data } = body || {};
    if (!familyId || !action) return errorResponse('MISSING_FIELDS', '缺少參數');
    const auth = await authenticate(request, { needFamily: true, body });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${familyId}/bank_accounts`;

    if (action === 'create') {
      if (!data || !data.name) return errorResponse('MISSING_FIELDS', '缺少 data 或 name');
      const clean = { name: String(data.name).trim(), type: ['family', 'personal'].includes(data.type) ? data.type : 'family', initialBalance: roundInt(data.initialBalance), initialYear: String(data.initialYear || new Date().getFullYear()), initialMonth: String(data.initialMonth || '01').padStart(2, '0'), order: Number(data.order) || 0, createdAt: Date.now() };
      const newId = await dbPush(basePath, clean, token);
      return newId ? successResponse({ id: newId, data: clean }) : errorResponse('INTERNAL', '寫入失敗');
    }
    if (action === 'update') {
      if (!id || !data) return errorResponse('MISSING_FIELDS', '缺少 id 或 data');
      const existing = await dbGet(`${basePath}/${id}`, token);
      if (!existing) return errorResponse('NOT_FOUND', '找不到');
      const clean = { ...existing };
      if (data.name !== undefined) clean.name = String(data.name).trim();
      if (data.type !== undefined) clean.type = data.type;
      if (data.initialBalance !== undefined) clean.initialBalance = roundInt(data.initialBalance);
      if (data.initialYear !== undefined) clean.initialYear = String(data.initialYear);
      if (data.initialMonth !== undefined) clean.initialMonth = String(data.initialMonth).padStart(2, '0');
      if (data.order !== undefined) clean.order = Number(data.order) || 0;
      clean.updatedAt = Date.now();
      return await dbPut(`${basePath}/${id}`, clean, token) ? successResponse({ id, data: clean }) : errorResponse('INTERNAL', '更新失敗');
    }
    if (action === 'remove') {
      if (!id) return errorResponse('MISSING_FIELDS', '缺少 id');
      const refCount = await _countBankReferences(basePath, id, token);
      if (refCount > 0) return errorResponse('CONFLICT', `此銀行仍被 ${refCount} 筆記錄引用，請先移除引用`, 409);
      return await dbDelete(`${basePath}/${id}`, token) ? successResponse({ removedId: id }) : errorResponse('INTERNAL', '刪除失敗');
    }
    return errorResponse('BAD_REQUEST', '未知 action');
  } catch (err) { return handleError(err); }
}

async function handleBankTransactionsGet(request) {
  try {
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    const bankId = url.searchParams.get('bankId');
    const action = url.searchParams.get('action') || 'list';
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');

    const auth = await authenticate(request, { needFamily: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    if (action === 'listAll') {
      const allBanks = await dbGet(`families/${familyId}/bank_accounts`, token);
      const flat = [];
      for (const [bid, bankData] of Object.entries(allBanks || {})) {
        Object.entries(bankData.transactions || {}).forEach(([txnId, txn]) => {
          flat.push({ id: txnId, bankId: bid, bankName: bankData.name || '', ...txn });
        });
      }
      flat.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      return successResponse({ familyId, transactions: flat, count: flat.length });
    }

    if (!bankId) return errorResponse('MISSING_FIELDS', '缺少 bankId');
    const data = await dbGet(`families/${familyId}/bank_accounts/${bankId}/transactions`, token);
    const list = objToList(data || {}, (a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    return successResponse({ familyId, bankId, transactions: list, count: list.length });
  } catch (err) { return handleError(err); }
}

async function handleBankTransactionsPost(request) {
  try {
    const body = await request.json();
    const { familyId, bankId, action, txnId, data } = body || {};
    if (!familyId || !bankId || !action) return errorResponse('MISSING_FIELDS', '缺少參數');

    const auth = await authenticate(request, { needFamily: true, body });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    const bankSnap = await dbGet(`families/${familyId}/bank_accounts/${bankId}`, token);
    if (!bankSnap) return errorResponse('NOT_FOUND', `找不到銀行帳號 ${bankId}`);

    const basePath = `families/${familyId}/bank_accounts/${bankId}/transactions`;
    const VALID_TYPES = ['in', 'out', 'transfer'];
    const VALID_CATEGORIES = ['contribution', 'expense', 'insurance', 'reimbursement', 'manual'];

    if (action === 'create') {
      if (!data || !data.type || !data.amount) return errorResponse('MISSING_FIELDS', '缺少 type 或 amount');
      if (!VALID_TYPES.includes(data.type)) return errorResponse('BAD_REQUEST', `無效的 type`);
      const clean = {
        type: data.type,
        category: VALID_CATEGORIES.includes(data.category) ? data.category : 'manual',
        amount: roundInt(data.amount),
        date: data.date || new Date().toISOString().slice(0, 10),
        memberId: data.memberId || '', refId: data.refId || '', note: data.note || '',
        createdAt: Date.now(),
      };
      const newId = await dbPush(basePath, clean, token);
      return newId ? successResponse({ id: newId, data: clean }) : errorResponse('INTERNAL', '寫入失敗');
    }

    if (action === 'update') {
      if (!txnId || !data) return errorResponse('MISSING_FIELDS', '缺少 txnId 或 data');
      const existing = await dbGet(`${basePath}/${txnId}`, token);
      if (!existing) return errorResponse('NOT_FOUND', '找不到此交易');
      const clean = { ...existing };
      if (data.type !== undefined) {
        if (!VALID_TYPES.includes(data.type)) return errorResponse('BAD_REQUEST', `無效的 type`);
        clean.type = data.type;
      }
      if (data.category !== undefined) clean.category = VALID_CATEGORIES.includes(data.category) ? data.category : 'manual';
      if (data.amount !== undefined) clean.amount = roundInt(data.amount);
      if (data.date !== undefined) clean.date = String(data.date);
      if (data.memberId !== undefined) clean.memberId = String(data.memberId);
      if (data.refId !== undefined) clean.refId = String(data.refId);
      if (data.note !== undefined) clean.note = String(data.note);
      clean.updatedAt = Date.now();
      return await dbPut(`${basePath}/${txnId}`, clean, token) ? successResponse({ txnId, data: clean }) : errorResponse('INTERNAL', '更新失敗');
    }

    if (action === 'remove') {
      if (!txnId) return errorResponse('MISSING_FIELDS', '缺少 txnId');
      const existing = await dbGet(`${basePath}/${txnId}`, token);
      if (!existing) return errorResponse('NOT_FOUND', '找不到此交易');
      let cleanedSource = null;
      try { cleanedSource = await _cleanupSourceRef({ familyId, bankId, txnId, txn: existing, token }); } catch (e) {}
      const ok = await dbDelete(`${basePath}/${txnId}`, token);
      return ok ? successResponse({ removedId: txnId, cleanedSource }) : errorResponse('INTERNAL', '刪除失敗');
    }

    return errorResponse('BAD_REQUEST', `未知 action`);
  } catch (err) { return handleError(err); }
}

async function _countBankReferences(bankAccountsBasePath, bankId, token) {
  const familyBase = bankAccountsBasePath.replace(/\/bank_accounts$/, '');
  let count = 0;
  try {
    const expensesSnap = await dbGet(`${familyBase}/expenses`, token);
    if (expensesSnap) {
      Object.values(expensesSnap).forEach((ms) => Object.values(ms || {}).forEach((md) => Object.values(md?.member_expenses || {}).forEach((items) => Object.values(items || {}).forEach((e) => { if (e?.bankId === bankId) count++; }))));
    }
    const paySnap = await dbGet(`${familyBase}/insurance_payments`, token);
    if (paySnap) {
      Object.values(paySnap).forEach((ys) => Object.values(ys || {}).forEach((ms) => Object.values(ms || {}).forEach((p) => { if (p?.bankId === bankId) count++; })));
    }
  } catch (e) {}
  return count;
}

async function _cleanupSourceRef({ familyId, bankId, txnId, txn, token }) {
  const { category, refId, memberId, date } = txn;
  const base = `families/${familyId}`;
  if (category === 'expense' && refId && memberId && date) {
    const [y, m] = (date || '').split('-');
    if (y && m) {
      const mm = String(m).padStart(2, '0');
      const path = `${base}/expenses/${y}/${mm}/member_expenses/${memberId}/${refId}`;
      const src = await dbGet(path, token);
      if (src && src.txnId === txnId) {
        await dbPut(path, { ...src, txnId: '' }, token);
        return { type: 'expense', path, clearedTxnId: true };
      }
    }
  }
  if ((category === 'insurance' || category === 'reimbursement') && refId && date) {
    const [y, m] = (date || '').split('-');
    if (y && m) {
      const mm = String(m).padStart(2, '0');
      const path = `${base}/insurance_payments/${refId}/${y}/${mm}`;
      const src = await dbGet(path, token);
      if (src && src.txnId === txnId) {
        await dbPut(path, { ...src, txnId: '' }, token);
        return { type: 'insurance_payment', path, clearedTxnId: true };
      }
    }
  }
  return null;
}

async function handleClearBankBalances(request) {
  try {
    const body = await request.json();
    if (body.confirm !== 'CONFIRM_DELETE') return errorResponse('BAD_REQUEST', '必須提供確認');
    const auth = await authenticate(request, { needFamily: true, body });
    if (auth instanceof Response) return auth;
    await dbDelete(`families/${body.familyId}/bank_balances`, auth.token);
    return successResponse({ cleared: true });
  } catch (err) { return handleError(err); }
}

/* ============================================
   Family Handlers (GAP-05)
   ============================================ */
async function handleLookupFamily(request) {
  try {
    const auth = await authenticate(request);
    if (auth instanceof Response) return auth;
    const result = await verifyFamilyAccessByUid(auth.user.localId, auth.token);
    if (!result) return errorResponse('NOT_FOUND', '此帳號不屬於任何家庭');
    let familyName = '我的家庭';
    try { const s = await dbGet(`platform/families/${result.familyId}`, auth.token); if (s?.name) familyName = s.name; } catch (e) {}
    return successResponse({ familyId: result.familyId, familyName, memberAccount: result.memberAccount, isLegacy: result.isLegacy });
  } catch (err) { return handleError(err); }
}

async function handleFamilySettingsGet(request) {
  try {
    const familyId = new URL(request.url).searchParams.get('familyId');
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    const auth = await authenticate(request, { needFamily: true });
    if (auth instanceof Response) return auth;
    const basePath = `families/${familyId}`;
    const [statuses, options, yearRange, uiConstants] = await Promise.all([
      dbGet(`${basePath}/statuses`, auth.token),
      dbGet(`${basePath}/settings/options`, auth.token),
      dbGet(`${basePath}/settings/year_range`, auth.token),
      dbGet(`${basePath}/settings/ui_constants`, auth.token),
    ]);
    const byOrder = (a, b) => (a.order || 0) - (b.order || 0);
    return successResponse({ familyId, statuses: objToList(statuses || {}, byOrder), options: options || null, yearRange: yearRange || null, uiConstants: uiConstants || null });
  } catch (err) { return handleError(err); }
}

async function handleFamilySettingsPost(request) {
  try {
    const body = await request.json();
    const { familyId, action, id, data } = body || {};
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    const auth = await authenticate(request, { needFamily: true, body });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${familyId}`;

    if (action === 'update') {
      if (!data) return errorResponse('MISSING_FIELDS', '缺少 data');
      const results = {};
      const sanitizeOpts = (o) => { const c = {}; ['memberRoles', 'cycles', 'policyTypes', 'insurancePaymentTypes', 'categoryOrder'].forEach((k) => { if (Array.isArray(o[k])) c[k] = o[k]; }); return c; };
      const sanitizeYear = (d) => ({ startYear: d.startYear != null && d.startYear !== '' ? Number(d.startYear) : null, futureYears: Number(d.futureYears) || 5 });
      const sanitizeUI = (d) => { const c = {}; if (d.nameMaxLenDesktop != null) c.nameMaxLenDesktop = Number(d.nameMaxLenDesktop); if (d.nameMaxLenMobile != null) c.nameMaxLenMobile = Number(d.nameMaxLenMobile); if (d.toastDuration != null) c.toastDuration = Number(d.toastDuration); return c; };

      if (data.options !== undefined) results.options = await dbPut(`${basePath}/settings/options`, sanitizeOpts(data.options), token);
      if (data.yearRange !== undefined) results.yearRange = await dbPut(`${basePath}/settings/year_range`, sanitizeYear(data.yearRange), token);
      if (data.uiConstants !== undefined) results.uiConstants = await dbPut(`${basePath}/settings/ui_constants`, sanitizeUI(data.uiConstants), token);
      if (Object.values(results).some((v) => v === false)) return errorResponse('INTERNAL', '部分寫入失敗');
      return successResponse({ results });
    }

    if (action === 'put-status') {
      if (!data || !data.name) return errorResponse('MISSING_FIELDS', '缺少 data.name');
      const clean = { name: String(data.name).trim(), category: ['personal', 'fixed', 'insurance'].includes(data.category) ? data.category : 'personal', isDone: !!data.isDone, order: Number(data.order) || 0, createdAt: data.createdAt || Date.now() };
      let savedId = id;
      if (id) { const ok = await dbPut(`${basePath}/statuses/${id}`, clean, token); if (!ok) return errorResponse('INTERNAL', '寫入失敗'); }
      else { savedId = await dbPush(`${basePath}/statuses`, clean, token); if (!savedId) return errorResponse('INTERNAL', '寫入失敗'); }
      return successResponse({ id: savedId, data: clean });
    }

    if (action === 'delete-status') {
      if (!id) return errorResponse('MISSING_FIELDS', '缺少 id');
      const ok = await dbDelete(`${basePath}/statuses/${id}`, token);
      if (!ok) return errorResponse('INTERNAL', '刪除失敗');
      return successResponse({ deletedId: id });
    }
    return errorResponse('BAD_REQUEST', `未知 action`);
  } catch (err) { return handleError(err); }
}

async function handleFamilyAccountsGet(request) {
  try {
    const familyId = new URL(request.url).searchParams.get('familyId');
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    const token = extractToken(request);
    const superUser = await verifySuperAdmin(token);
    if (!superUser && !(await verifyFamilyAccess(token, familyId))) return errorResponse('FORBIDDEN', '無權存取');
    const snap = await dbGet(`platform/families/${familyId}/memberAccounts`, token);
    const accounts = objToList(snap, (a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    return successResponse({ familyId, accounts, count: accounts.length });
  } catch (err) { return handleError(err); }
}

async function handleFamilyAccountsPost(request) {
  try {
    const body = await request.json();
    const { familyId, action } = body || {};
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    if (action === 'create') {
      const missing = requireFields(body, ['account', 'password', 'displayName']);
      if (missing) return errorResponse('MISSING_FIELDS', '缺少 account / password / displayName');
      const familySnap = await dbGet(`platform/families/${familyId}`, token);
      if (!familySnap) return errorResponse('NOT_FOUND', `找不到家庭 ${familyId}`);
      const accountStr = String(body.account).trim().toLowerCase();
      if (!/^[a-z0-9._-]+$/.test(accountStr)) return errorResponse('BAD_REQUEST', '帳號格式錯誤');
      const pwdStr = String(body.password);
      if (pwdStr.length < 6) return errorResponse('BAD_REQUEST', '密碼至少 6 位');
      const email = `${accountStr}@familyfin.local`;
      const existing = await dbGet(`platform/email_index/${accountStr}`, token);
      if (existing) return errorResponse('CONFLICT', `帳號已存在`, 409);
      const signUpResult = await dbSignUp(email, pwdStr);
      if (!signUpResult.ok) {
        if (signUpResult.error === 'EMAIL_EXISTS') return errorResponse('EMAIL_EXISTS', `帳號已存在於 Firebase`, 409);
        return errorResponse('INTERNAL', `建立帳號失敗：${signUpResult.error}`);
      }
      const newUid = signUpResult.uid;
      const memberId = String(body.memberId || '').trim() || await _resolveMemberId(familyId, body.displayName, token);
      const accountData = { email, account: accountStr, displayName: String(body.displayName).trim(), role: body.role === 'owner' ? 'owner' : 'member', canInput: body.canInput !== false, memberId, createdAt: Date.now() };
      const ok1 = await dbPut(`platform/families/${familyId}/memberAccounts/${newUid}`, accountData, token);
      if (!ok1) return errorResponse('INTERNAL', `寫入平台記錄失敗`, 500);
      const ok2 = await dbPut(`platform/uid_index/${newUid}`, familyId, token);
      if (!ok2) { await dbDelete(`platform/families/${familyId}/memberAccounts/${newUid}`, token); return errorResponse('INTERNAL', `uid_index 寫入失敗`, 500); }
      await dbPut(`platform/email_index/${accountStr}`, { uid: newUid, familyId }, token);
      return successResponse({ uid: newUid, account: accountData });
    }

    if (action === 'update') {
      const { uid, displayName, role, canInput, memberId } = body;
      if (!uid) return errorResponse('MISSING_FIELDS', '缺少 uid');
      const existing = await dbGet(`platform/families/${familyId}/memberAccounts/${uid}`, token);
      if (!existing) return errorResponse('NOT_FOUND', '找不到帳號');
      const patch = {};
      if (displayName !== undefined) patch.displayName = String(displayName).trim();
      if (role !== undefined) patch.role = role;
      if (canInput !== undefined) patch.canInput = !!canInput;
      if (memberId !== undefined) patch.memberId = String(memberId || '').trim();
      patch.updatedAt = Date.now();
      const ok = await dbPut(`platform/families/${familyId}/memberAccounts/${uid}`, { ...existing, ...patch }, token);
      return ok ? successResponse({ uid, patch }) : errorResponse('INTERNAL', '更新失敗');
    }

    if (action === 'remove') {
      const { uid } = body;
      if (!uid) return errorResponse('MISSING_FIELDS', '缺少 uid');
      const existing = await dbGet(`platform/families/${familyId}/memberAccounts/${uid}`, token);
      if (!existing) return errorResponse('NOT_FOUND', '找不到帳號');
      if (existing.role === 'owner') return errorResponse('FORBIDDEN', '不可移除 owner');
      await dbDelete(`platform/families/${familyId}/memberAccounts/${uid}`, token);
      await dbDelete(`platform/uid_index/${uid}`, token);
      if (existing.account) await dbDelete(`platform/email_index/${existing.account}`, token);
      return successResponse({ removedUid: uid });
    }
    return errorResponse('BAD_REQUEST', '未知 action');
  } catch (err) { return handleError(err); }
}

/* ============================================
   Personal Handlers (GAP-03, GAP-04)
   ============================================ */
async function handlePersonalIncomeGet(request) {
  try {
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    const memberId = url.searchParams.get('memberId');
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    const auth = await authenticate(request, { needFamily: true });
    if (auth instanceof Response) return auth;
    const { token, user } = auth;
    const accessResult = await verifyFamilyAccess(token, familyId);
    if (!accessResult) return errorResponse('FORBIDDEN', '無權存取');
    const isOwner = accessResult.isOwner;
    const isSuper = accessResult.isSuper;

    if (memberId && !isOwner && !isSuper) {
      const ownMemberId = await _resolveOwnMemberId(familyId, user.localId, token);
      if (!ownMemberId || ownMemberId !== memberId) return errorResponse('FORBIDDEN', '無權讀取其他成員收入');
    }
    if (memberId) {
      const data = await dbGet(`families/${familyId}/personal_income/${memberId}`, token);
      return successResponse({ familyId, memberId, income: data || {} });
    }
    if (!isOwner && !isSuper) return errorResponse('FORBIDDEN', '需要 owner 權限');
    const all = await dbGet(`families/${familyId}/personal_income`, token);
    return successResponse({ familyId, personalIncome: all || {} });
  } catch (err) { return handleError(err); }
}

async function handlePersonalIncomePost(request) {
  try {
    const body = await request.json();
    const { familyId, memberId, year, month, amount, action } = body || {};
    if (!familyId || !memberId || !year || !month || !action) return errorResponse('MISSING_FIELDS');
    const auth = await authenticate(request, { needFamily: true, body });
    if (auth instanceof Response) return auth;
    const { token, user } = auth;
    const accessResult = await verifyFamilyAccess(token, familyId);
    if (!accessResult) return errorResponse('FORBIDDEN', '無權存取');
    const isOwner = accessResult.isOwner;
    const isSuper = accessResult.isSuper;

    if (!isOwner && !isSuper) {
      const ownMemberId = await _resolveOwnMemberId(familyId, user.localId, token);
      if (!ownMemberId || ownMemberId !== memberId) return errorResponse('FORBIDDEN', '無權修改其他成員收入');
    }
    const mm = String(month).padStart(2, '0');
    const yyyy = String(year);
    const path = `families/${familyId}/personal_income/${memberId}/${yyyy}/${mm}`;

    if (action === 'save') {
      const num = roundInt(amount);
      if (num <= 0) { await dbDelete(path, token); return successResponse({ deleted: true }); }
      const ok = await dbPut(path, num, token);
      return ok ? successResponse({ saved: true, amount: num }) : errorResponse('INTERNAL', '寫入失敗');
    }
    if (action === 'remove') {
      const ok = await dbDelete(path, token);
      return ok ? successResponse({ removed: true }) : errorResponse('INTERNAL', '刪除失敗');
    }
    return errorResponse('BAD_REQUEST', `未知 action`);
  } catch (err) { return handleError(err); }
}

async function handleMemberAdvancesGet(request) {
  try {
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    const memberId = url.searchParams.get('memberId');
    const action = url.searchParams.get('action') || 'list';
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    const auth = await authenticate(request, { needFamily: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    if (action === 'listAll') {
      const all = await dbGet(`families/${familyId}/member_advances`, token);
      const flat = [];
      Object.entries(all || {}).forEach(([mid, advances]) => {
        Object.entries(advances || {}).forEach(([advanceId, adv]) => flat.push({ id: advanceId, memberId: mid, ...adv }));
      });
      flat.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      return successResponse({ familyId, advances: flat, count: flat.length });
    }
    if (!memberId) return errorResponse('MISSING_FIELDS', '缺少 memberId');
    const data = await dbGet(`families/${familyId}/member_advances/${memberId}`, token);
    const list = objToList(data || {}, (a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    return successResponse({ familyId, memberId, advances: list, count: list.length });
  } catch (err) { return handleError(err); }
}

async function handleMemberAdvancesPost(request) {
  try {
    const body = await request.json();
    const { familyId, memberId, action, advanceId, data } = body || {};
    if (!familyId || !memberId || !action) return errorResponse('MISSING_FIELDS');
    const auth = await authenticate(request, { needFamily: true, body });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${familyId}/member_advances/${memberId}`;

    if (action === 'create') {
      if (!data || !data.policyId || !data.totalAmount) return errorResponse('MISSING_FIELDS', '缺少參數');
      const totalAmount = roundInt(data.totalAmount);
      if (totalAmount <= 0) return errorResponse('BAD_REQUEST', 'totalAmount 必須大於 0');
      const clean = { policyId: String(data.policyId), totalAmount, remainingAmount: totalAmount, startYear: String(data.startYear || ''), startMonth: String(data.startMonth || '').padStart(2, '0'), note: data.note || '', paidMonths: {}, createdAt: Date.now() };
      const newId = await dbPush(basePath, clean, token);
      return newId ? successResponse({ id: newId, data: clean }) : errorResponse('INTERNAL', '寫入失敗');
    }
    if (action === 'update') {
      if (!advanceId) return errorResponse('MISSING_FIELDS', '缺少 advanceId');
      const existing = await dbGet(`${basePath}/${advanceId}`, token);
      if (!existing) return errorResponse('NOT_FOUND', '找不到代墊記錄');
      if (data.remainingAmount !== undefined) return errorResponse('FORBIDDEN', 'remainingAmount 為系統自動計算，不可直接修改');
      const clean = { ...existing };
      if (data.policyId !== undefined) clean.policyId = String(data.policyId);
      if (data.totalAmount !== undefined) {
        const total = roundInt(data.totalAmount);
        if (total <= 0) return errorResponse('BAD_REQUEST', 'totalAmount 必須大於 0');
        clean.totalAmount = total;
        const oldTotal = roundInt(existing.totalAmount);
        const oldRemaining = roundInt(existing.remainingAmount);
        clean.remainingAmount = Math.max(0, total - (oldTotal - oldRemaining));
      }
      if (data.startYear !== undefined) clean.startYear = String(data.startYear);
      if (data.startMonth !== undefined) clean.startMonth = String(data.startMonth).padStart(2, '0');
      if (data.note !== undefined) clean.note = String(data.note);
      clean.updatedAt = Date.now();
      const ok = await dbPut(`${basePath}/${advanceId}`, clean, token);
      return ok ? successResponse({ advanceId, data: clean }) : errorResponse('INTERNAL', '更新失敗');
    }
    if (action === 'remove') {
      if (!advanceId) return errorResponse('MISSING_FIELDS', '缺少 advanceId');
      const ok = await dbDelete(`${basePath}/${advanceId}`, token);
      return ok ? successResponse({ removedId: advanceId }) : errorResponse('INTERNAL', '刪除失敗');
    }
    return errorResponse('BAD_REQUEST', '未知 action');
  } catch (err) { return handleError(err); }
}

/* ============================================
   Platform Handlers (GAP-06)
   ============================================ */
async function handlePlatformSettingsGet(request) {
  try {
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const data = await dbGet('platform/defaults/ui_constants', auth.token);
    return successResponse({ data: data || {} });
  } catch (err) { return handleError(err); }
}

async function handlePlatformSettingsPost(request) {
  try {
    const body = await request.json();
    const { action, data } = body || {};
    if (action !== 'update') return errorResponse('BAD_REQUEST', '未知 action');
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    if (!data) return errorResponse('MISSING_FIELDS', '缺少 data');
    const clean = { nameMaxLenDesktop: Number(data.nameMaxLenDesktop) || 12, nameMaxLenMobile: Number(data.nameMaxLenMobile) || 6, toastDuration: Number(data.toastDuration) || 2000 };
    const ok = await dbPut('platform/defaults/ui_constants', clean, auth.token);
    return ok ? successResponse({ data: clean }) : errorResponse('INTERNAL', '寫入失敗');
  } catch (err) { return handleError(err); }
}

async function handlePlatformDefaultsGet(request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'list';
    const resource = url.searchParams.get('resource');
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    if (action !== 'list') return errorResponse('BAD_REQUEST', 'GET 僅支援 list');
    const config = PLATFORM_RESOURCES[resource];
    if (!config) return errorResponse('BAD_REQUEST', `未知 resource`);
    const data = await dbGet(`platform/defaults/${config.path}`, auth.token);
    if (config.type === 'object') return successResponse({ resource, type: 'object', data: data || {} });
    const byOrder = (a, b) => (a.order ?? 9999) - (b.order ?? 9999) || (a.createdAt || 0) - (b.createdAt || 0);
    return successResponse({ resource, type: 'list', list: objToList(data || {}, byOrder) });
  } catch (err) { return handleError(err); }
}

async function handlePlatformDefaultsPost(request) {
  try {
    const body = await request.json();
    const { action, resource, id, data } = body || {};
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const config = PLATFORM_RESOURCES[resource];
    if (!config) return errorResponse('BAD_REQUEST', `未知 resource`);
    const basePath = `platform/defaults/${config.path}`;

    if (action === 'put') {
      if (config.type !== 'list' || !data) return errorResponse('BAD_REQUEST', '不支援或缺少 data');
      const whitelists = { members: ['name', 'role', 'order'], banks: ['name', 'order'], companies: ['name', 'order'], payments: ['name', 'order'], categories: ['name', 'order'], items: ['name', 'categoryKey', 'categoryId'], statuses: ['name', 'category', 'isDone', 'order'] };
      const allowed = whitelists[resource] || [];
      const clean = {};
      allowed.forEach((k) => { if (data[k] !== undefined) clean[k] = data[k]; });
      clean.createdAt = data.createdAt || Date.now();
      let savedId = id;
      if (id) { const ok = await dbPut(`${basePath}/${id}`, clean, auth.token); if (!ok) return errorResponse('INTERNAL', '寫入失敗'); }
      else { savedId = await dbPush(basePath, clean, auth.token); if (!savedId) return errorResponse('INTERNAL', '寫入失敗'); }
      return successResponse({ id: savedId, data: clean });
    }
    if (action === 'delete') {
      if (!id) return errorResponse('MISSING_FIELDS', '缺少 id');
      const ok = await dbDelete(`${basePath}/${id}`, auth.token);
      return ok ? successResponse({ deletedId: id }) : errorResponse('INTERNAL', '刪除失敗');
    }
    if (action === 'set') {
      if (config.type !== 'object' || data == null) return errorResponse('BAD_REQUEST', '不支援或缺少 data');
      let clean = data;
      if (resource === 'yearRange') clean = { startYear: data.startYear != null && data.startYear !== '' ? Number(data.startYear) : null, futureYears: Number(data.futureYears) || 5 };
      else if (resource === 'uiConstants') clean = { nameMaxLenDesktop: Number(data.nameMaxLenDesktop) || 12, nameMaxLenMobile: Number(data.nameMaxLenMobile) || 6, toastDuration: Number(data.toastDuration) || 2000 };
      else if (resource === 'options') {
        clean = { memberRoles: Array.isArray(data.memberRoles) ? data.memberRoles : [], cycles: Array.isArray(data.cycles) ? data.cycles : [], policyTypes: Array.isArray(data.policyTypes) ? data.policyTypes : [], insurancePaymentTypes: Array.isArray(data.insurancePaymentTypes) ? data.insurancePaymentTypes : [], categoryOrder: Array.isArray(data.categoryOrder) ? data.categoryOrder : [] };
      }
      const ok = await dbPut(basePath, clean, auth.token);
      return ok ? successResponse({ data: clean }) : errorResponse('INTERNAL', '寫入失敗');
    }
    return errorResponse('BAD_REQUEST', '未知 action');
  } catch (err) { return handleError(err); }
}

/* ============================================
   Summary Handlers (GAP-08)
   ============================================ */
async function handleSummary(request) {
  try {
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    const auth = await authenticate(request, { needFamily: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${familyId}`;

    const [members, policies, expenses, income, funds, categories, items, banks, paymentMethods, statuses, settingsOptions, bankAccounts, personalIncome, memberAdvances] = await Promise.all([
      dbGet(`${basePath}/members`, token), dbGet(`${basePath}/insurance_policies`, token), year && month ? dbGet(`${basePath}/expenses/${year}/${month}/member_expenses`, token) : null,
      year && month ? dbGet(`${basePath}/income/${year}/${month}`, token) : null, dbGet(`${basePath}/funds`, token), dbGet(`${basePath}/expense_categories`, token),
      dbGet(`${basePath}/expense_items`, token), dbGet(`${basePath}/banks`, token), dbGet(`${basePath}/payment_methods`, token), dbGet(`${basePath}/statuses`, token),
      dbGet(`${basePath}/settings/options`, token), dbGet(`${basePath}/bank_accounts`, token), dbGet(`${basePath}/personal_income`, token), dbGet(`${basePath}/member_advances`, token),
    ]);

    const membersObj = members || {};
    let totalExpense = 0; const perMember = {};
    Object.entries(expenses || {}).forEach(([mid, list]) => {
      const itemsArr = objToList(list).map((e) => ({ ...e, amount: roundInt(e.amount) }));
      const sum = itemsArr.reduce((s, e) => s + e.amount, 0);
      perMember[mid] = { memberName: membersObj[mid]?.name || '未知', itemCount: itemsArr.length, sum: roundInt(sum), items: itemsArr };
      totalExpense += sum;
    });

    let totalIncome = 0; const incomeBreakdown = {};
    Object.entries(income || {}).forEach(([key, val]) => {
      const num = roundInt(val);
      if (key === 'extra' || membersObj[key]) { incomeBreakdown[key] = num; totalIncome += num; }
    });

    let piTotal = 0;
    Object.values(personalIncome || {}).forEach((yd) => Object.values(yd?.[year] || {}).forEach((v) => { piTotal += roundInt(v); }));

    let yearlyIns = 0, monthlyIns = 0, activeCount = 0;
    const curY = Number(year), curM = Number(month);
    Object.values(policies || {}).forEach((p) => {
      const fY = Number(p.firstStartYear) || 0; const fM = Number(p.firstStartMonth) || 1;
      if (!fY) return;
      const tMonths = (curY - fY) * 12 + (curM - fM);
      if (tMonths < 0) return;
      const pIdx = Math.floor(tMonths / 12) + 1;
      if (Number(p.totalPolicyYears) > 0 && pIdx > Number(p.totalPolicyYears)) return;
      if (p.type === 'fund_insurance') {
        const mp = roundInt(p.monthlyPremium); if (mp <= 0) return;
        monthlyIns += mp; yearlyIns += mp * 12; activeCount++;
      } else {
        const pd = (p.periods || {})[String(pIdx)];
        if (pd) { monthlyIns += roundInt(pd.monthlyAverage); yearlyIns += roundInt(pd.annualPremium); activeCount++; }
      }
    });

    const bankList = Object.entries(bankAccounts || {}).map(([id, x]) => ({ id, ...x }));
    const bankBalance = 0;
    return jsonResponse({ ok: true, year, month, totalIncome: roundInt(totalIncome), totalExpense: roundInt(totalExpense), netBalance: roundInt(totalIncome - totalExpense), personalIncomeTotal: roundInt(piTotal), yearlyInsuranceTotal: roundInt(yearlyIns), monthlyInsuranceAverage: roundInt(monthlyIns), policyCount: activeCount, bankBalance, perMember });
  } catch (err) { return handleError(err); }
}

async function handleAnnualSummary(request) {
  try {
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    const startYear = Number(url.searchParams.get('startYear'));
    const endYear = Number(url.searchParams.get('endYear'));
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    if (!startYear || !endYear || startYear > endYear) return errorResponse('MISSING_FIELDS', '年份無效');
    if (endYear - startYear > 10) return errorResponse('BAD_REQUEST', '範圍不可超過 10 年');
    const auth = await authenticate(request, { needFamily: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${familyId}`;
    const [expensesSnap, incomeSnap, policiesSnap, bankAccountsSnap, fundsSnap] = await Promise.all([
      dbGet(`${basePath}/expenses`, token), dbGet(`${basePath}/income`, token), dbGet(`${basePath}/insurance_policies`, token),
      dbGet(`${basePath}/bank_accounts`, token), dbGet(`${basePath}/funds`, token),
    ]);
    const years = [];
    for (let y = startYear; y <= endYear; y++) years.push(_buildYearSummary(y, expensesSnap || {}, incomeSnap || {}, Object.values(policiesSnap || {}), Object.entries(bankAccountsSnap || {}).map(([id, x]) => ({ id, ...x })), _flattenTxns(bankAccountsSnap), fundsSnap || {}));
    return jsonResponse({ ok: true, startYear, endYear, years });
  } catch (err) { return handleError(err); }
}

async function handleSettlementsYear(request) {
  try {
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    const year = url.searchParams.get('year');
    if (!familyId || !year) return errorResponse('MISSING_FIELDS', '缺少參數');
    const auth = await authenticate(request, { needFamily: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${familyId}`;
    const [expensesSnap, policiesSnap, paymentsSnap] = await Promise.all([
      dbGet(`${basePath}/expenses/${year}`, token), dbGet(`${basePath}/insurance_policies`, token), dbGet(`${basePath}/insurance_payments`, token),
    ]);
    const memberExpensesByMonth = {};
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      const monthData = expensesSnap?.[mm]?.member_expenses || {};
      const rows = [];
      Object.entries(monthData).forEach(([memberId, items]) => {
        Object.entries(items || {}).forEach(([id, e]) => rows.push({ id, memberId, name: e.name || '', amount: roundInt(e.amount), status: e.status || '', date: e.date || '', categoryId: e.categoryId || '', itemId: e.itemId || '', paymentMethodId: e.paymentMethodId || '', isAutoLinked: !!e.isAutoLinked, policyId: e.policyId || '', bankId: e.bankId || '', txnId: e.txnId || '', repaidDate: e.repaidDate || '', createdAt: e.createdAt || 0 }));
      });
      memberExpensesByMonth[mm] = rows;
    }
    const policies = Object.entries(policiesSnap || {}).map(([id, p]) => ({ id, type: p.type || 'normal', name: p.name || '', company: p.company || '', memberId: p.memberId || '', policyHolderId: p.policyHolderId || '', paymentMode: p.paymentMode || 'direct', advanceHolderId: p.advanceHolderId || '', firstStartYear: Number(p.firstStartYear) || 0, firstStartMonth: String(p.firstStartMonth || '01').padStart(2, '0'), totalPolicyYears: Number(p.totalPolicyYears) || 0, currentPeriodIndex: Number(p.currentPeriodIndex) || 1, periods: p.periods || {}, monthlyPremium: roundInt(p.monthlyPremium), monthlyAverage: roundInt(p.monthlyAverage), annualPremium: roundInt(p.annualPremium), isCompleted: !!p.isCompleted }));
    const paymentsCache = {};
    policies.forEach((p) => { paymentsCache[p.id] = { [year]: paymentsCache[p.id]?.[year] || {} }; });
    Object.entries(paymentsSnap || {}).forEach(([pid, ys]) => { if (paymentsCache[pid]) paymentsCache[pid][year] = ys[year] || {}; });
    return jsonResponse({ ok: true, year, memberExpensesByMonth, policies, paymentsCache });
  } catch (err) { return handleError(err); }
}

function _flattenTxns(bankAccountsSnap) {
  const flat = [];
  Object.entries(bankAccountsSnap || {}).forEach(([bid, bankData]) => { Object.entries(bankData.transactions || {}).forEach(([txnId, txn]) => { flat.push({ id: txnId, bankId: bid, ...txn }); }); });
  return flat;
}

function _buildYearSummary(year, expensesObj, incomeObj, policyList, bankAccounts, allTransactions, fundsObj) {
  const yearStr = String(year);
  const yearExpenses = expensesObj[yearStr] || {};
  const yearIncome = incomeObj[yearStr] || {};
  const monthly = [];
  let yearTotalIncome = 0, yearTotalExpense = 0, monthsWithData = 0;
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    const monthIncomeObj = yearIncome[mm] || {};
    let totalIncome = 0; Object.values(monthIncomeObj).forEach((v) => { totalIncome += roundInt(v); });
    const monthExpenses = yearExpenses[mm]?.member_expenses || {};
    let totalExpense = 0; Object.values(monthExpenses).forEach((md) => { Object.values(md || {}).forEach((e) => { totalExpense += roundInt(e.amount); }); });
    let monthlyIns = 0;
    policyList.forEach((p) => {
      const fY = Number(p.firstStartYear) || 0; const fM = Number(p.firstStartMonth) || 1;
      if (!fY) return;
      const tMonths = (year - fY) * 12 + (m - fM);
      if (tMonths < 0) return;
      const pIdx = Math.floor(tMonths / 12) + 1;
      if (Number(p.totalPolicyYears) > 0 && pIdx > Number(p.totalPolicyYears)) return;
      if (p.type === 'fund_insurance') monthlyIns += roundInt(p.monthlyPremium);
      else { const pd = (p.periods || {})[String(pIdx)]; if (pd) monthlyIns += roundInt(pd.monthlyAverage); }
    });
    if (totalExpense > 0) monthsWithData++;
    monthly.push({ monthNum: m, month: mm, totalIncome: roundInt(totalIncome), totalExpense: roundInt(totalExpense), netBalance: roundInt(totalIncome - totalExpense), monthlyInsuranceAverage: roundInt(monthlyIns) });
    yearTotalIncome += totalIncome;
    yearTotalExpense += totalExpense;
  }
  let yearlyInsTotal = 0, monthlyInsAvg = 0, policyCount = 0;
  policyList.forEach((p) => {
    const fY = Number(p.firstStartYear) || 0; const totalYears = Number(p.totalPolicyYears) || 0;
    if (!fY || year < fY) return;
    const pIdx = year - fY + 1;
    if (totalYears > 0 && pIdx > totalYears) return;
    if (p.type === 'fund_insurance') { const mp = roundInt(p.monthlyPremium); if (mp > 0) { yearlyInsTotal += mp * 12; monthlyInsAvg += mp; policyCount++; } }
    else { const pd = (p.periods || {})[String(pIdx)]; if (pd) { yearlyInsTotal += roundInt(pd.annualPremium); monthlyInsAvg += roundInt(pd.monthlyAverage); policyCount++; } }
  });
  const bankBalance = _calcBankTotal(bankAccounts, allTransactions, year, '12');
  const fundValue = Object.values(fundsObj).reduce((s, f) => s + roundInt(f.currentValue), 0);
  return { year, totalIncome: roundInt(yearTotalIncome), totalExpense: roundInt(yearTotalExpense), netBalance: roundInt(yearTotalIncome - yearTotalExpense), yearlyInsuranceTotal: roundInt(yearlyInsTotal), monthlyInsuranceAverage: roundInt(monthlyInsAvg), policyCount, bankBalance: roundInt(bankBalance), fundValue: roundInt(fundValue), totalAssets: roundInt(bankBalance + fundValue), avg: monthsWithData > 0 ? Math.round(yearTotalExpense / monthsWithData) : 0, monthly };
}

function _calcBankTotal(bankAccounts, transactions, targetYear, targetMonth) {
  if (!targetYear || !targetMonth) return 0;
  const tY = Number(targetYear); const tM = Number(targetMonth); let total = 0;
  bankAccounts.forEach((acc) => {
    const init = Number(acc.initialBalance) || 0; const initY = Number(acc.initialYear) || 0; const initM = Number(acc.initialMonth) || 0;
    if (!initY || !initM) { total += init; return; }
    if (tY < initY || (tY === initY && tM < initM)) { total += init; return; }
    let balance = init;
    transactions.filter((t) => t.bankId === acc.id).forEach((txn) => {
      const date = txn.date || ''; if (!date || date.length < 7) return;
      const [y, m] = date.split('-').map(Number);
      const afterInit = y > initY || (y === initY && m > initM); const beforeTarget = y < tY || (y === tY && m <= tM);
      if (!afterInit || !beforeTarget) return;
      const amount = Number(txn.amount) || 0;
      if (txn.type === 'in') balance += amount; else if (txn.type === 'out' || txn.type === 'transfer') balance -= amount;
    });
    total += balance;
  });
  return total;
}

/* ============================================
   Entity (統一 CRUD) Handlers
   ============================================ */
const ENTITY_PATH = { member: 'members', bank: 'banks', bankAccount: 'bank_accounts', category: 'expense_categories', item: 'expense_items', payment: 'payment_methods', company: 'insurance_companies', policy: 'insurance_policies', fund: 'funds' };
const REQUIRED_EXTRA = { member: [], bank: [], bankAccount: ['bankId', 'type', 'ownerType'], category: ['shortCode'], item: ['categoryId'], payment: [], company: [], policy: ['type', 'memberId', 'firstStartYear', 'firstStartMonth', 'totalPolicyYears'], fund: ['type'] };

async function handleEntityPost(request) {
  try {
    const body = await request.json();
    const { familyId, action, entityType, id, code, name, extra } = body;
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    const token = extractToken(request);
    const access = await verifyFamilyAccess(token, familyId);
    if (!access) return errorResponse('FORBIDDEN', '無權存取');
    if (!entityType || !ENTITY_PATH[entityType]) return errorResponse('INVALID_BODY', `未知 entityType`);
    const path = ENTITY_PATH[entityType];
    const listPath = `families/${familyId}/${path}`;

    if (action === 'create') {
      const missing = (REQUIRED_EXTRA[entityType] || []).filter((k) => extra[k] === undefined || extra[k] === '');
      if (missing.length) return errorResponse('MISSING_FIELDS', `缺少欄位：${missing.join(', ')}`);
      if (!name || !code) return errorResponse('MISSING_FIELDS', '缺少 name 或 code');
      const list = (await dbGet(listPath, token)) || {};
      if (Object.values(list).some((v) => v.code === code)) return errorResponse('CODE_DUPLICATE', `編號已存在：${code}`, 409);
      if (Object.values(list).some((v) => v.name === name)) return errorResponse('NAME_DUPLICATE', `名稱重複：${name}`, 409);
      const payload = { code, name, ..._normalizeExtra(entityType, extra), createdAt: Date.now() };
      const newId = await dbPush(listPath, payload, token);
      return newId ? successResponse({ id: newId, code }) : errorResponse('INTERNAL', '寫入失敗');
    }

    if (action === 'update') {
      if (!id) return errorResponse('MISSING_FIELDS', '缺少 id');
      const itemPath = `${listPath}/${id}`;
      const existing = await dbGet(itemPath, token);
      if (!existing) return errorResponse('NOT_FOUND', `找不到 ${id}`);
      if (name) {
        const list = (await dbGet(listPath, token)) || {};
        if (Object.entries(list).some(([k, v]) => k !== id && v.name === name)) return errorResponse('NAME_DUPLICATE', `名稱重複：${name}`, 409);
      }
      const payload = { ...(name !== undefined ? { name } : {}), ...(Object.keys(extra).length ? _normalizeExtra(entityType, extra) : {}), updatedAt: Date.now() };
      return await dbPatch(itemPath, payload, token) ? successResponse({ id }) : errorResponse('INTERNAL', '更新失敗');
    }

    if (action === 'delete') {
      if (!id) return errorResponse('MISSING_FIELDS', '缺少 id');
      const itemPath = `${listPath}/${id}`;
      if (!(await dbGet(itemPath, token))) return errorResponse('NOT_FOUND', `找不到 ${id}`);
      return await dbDelete(itemPath, token) ? successResponse({ id }) : errorResponse('INTERNAL', '刪除失敗');
    }
    return errorResponse('INVALID_BODY', '未知 action');
  } catch (err) { return handleError(err); }
}

function _normalizeExtra(entityType, extra) {
  const round = (v) => Math.round(Number(v) || 0);
  switch (entityType) {
    case 'member': return { role: extra.role || 'other', order: Number(extra.order) || 0 };
    case 'bank': return { order: Number(extra.order) || 0 };
    case 'bankAccount': return { type: extra.type, ownerType: extra.ownerType, ownerId: extra.ownerId || 'family', initialBalance: round(extra.initialBalance), initialYear: String(extra.initialYear || ''), initialMonth: String(extra.initialMonth || '01').padStart(2, '0'), order: Number(extra.order) || 0 };
    case 'category': return { shortCode: extra.shortCode, order: Number(extra.order) || 0 };
    case 'item': return { categoryId: extra.categoryId };
    case 'payment': return { order: Number(extra.order) || 0 };
    case 'company': return {};
    case 'policy': return { type: extra.type, memberId: extra.memberId, policyHolderId: extra.policyHolderId || extra.memberId, firstStartYear: Number(extra.firstStartYear), firstStartMonth: String(extra.firstStartMonth).padStart(2, '0'), totalPolicyYears: Number(extra.totalPolicyYears), totalPolicyPeriods: Number(extra.totalPolicyYears) * 12, monthlyPremium: round(extra.monthlyPremium), annualPremium: round(extra.annualPremium), fundsAllocation: Array.isArray(extra.fundsAllocation) ? extra.fundsAllocation : [] };
    case 'fund': return { type: extra.type, policyId: extra.policyId || '', cost: round(extra.cost), initialYear: String(extra.initialYear || ''), initialMonth: String(extra.initialMonth || '').padStart(2, '0') };
    default: return {};
  }
}

/* ============================================
   Insurance Sync
   ============================================ */
async function handleInsuranceSync(request) {
  try {
    const body = await request.json();
    const { action, familyId, policyId, memberId, policyName, monthlyAverage, year, month, bankId, txnId, paymentMode, advanceHolderId } = body || {};
    if (!familyId || !policyId || !memberId || !year || !month) return errorResponse('MISSING_FIELDS');
    const auth = await authenticate(request, { needFamily: true, body });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${familyId}`;
    const linkedKey = buildLinkedKey(policyId);
    const expensePath = `${basePath}/expenses/${year}/${month}/member_expenses/${memberId}/${linkedKey}`;
    const paymentPath = `${basePath}/insurance_payments/${policyId}/${year}/${month}`;
    const amount = roundInt(monthlyAverage);

    if (action === 'delete') {
      await dbDelete(expensePath, token);
      await dbDelete(paymentPath, token);
      await _reverseFundAccumulation({ basePath, policyId, year, month, token });
      return successResponse({ deleted: true });
    }

    const statuses = await dbGet(`${basePath}/statuses`, token) || {};
    const categories = await dbGet(`${basePath}/expense_categories`, token) || {};
    const firstCategoryId = Object.values(categories).sort((a, b) => (a.order || 0) - (b.order || 0))[0]?.id || '';
    const expense = { name: `${policyName} (平攤)`, amount, status: 'done', date: '', categoryId: firstCategoryId, itemId: '', paymentMethodId: '', bankId: bankId || '', txnId: txnId || '', isAutoLinked: true, policyId, createdAt: Date.now() };
    const paymentRecord = { status: 'done', amount, date: new Date().toISOString().slice(0, 10), bankId: bankId || '', txnId: txnId || '', paymentMode: paymentMode || 'direct' };
    await Promise.all([ dbPut(expensePath, expense, token), dbPut(paymentPath, paymentRecord, token) ]);
    await _accumulateFunds({ basePath, policyId, year, month, token });
    return successResponse({ path: expensePath });
  } catch (err) { return handleError(err); }
}

async function _accumulateFunds({ basePath, policyId, year, month, token }) {
  const policy = await dbGet(`${basePath}/insurance_policies/${policyId}`, token);
  if (!policy || policy.type !== 'fund_insurance') return;
  const alloc = policy.fundsAllocation || [];
  if (!alloc.length) return;
  const monthlyPremium = roundInt(policy.monthlyPremium);
  for (const a of alloc) {
    if (!a.fundId) continue;
    const addCost = Math.round(monthlyPremium * (Number(a.pct) || 0) / 100);
    const fundPath = `${basePath}/funds/${a.fundId}`;
    const snapPath = `${fundPath}/snapshots/${year}/${String(month).padStart(2, '0')}`;
    const snap = (await dbGet(snapPath, token)) || {};
    await dbPut(snapPath, { ...snap, cumulativeCost: roundInt(snap.cumulativeCost) + addCost, contribution: addCost, createdAt: snap.createdAt || Date.now(), updatedAt: Date.now() }, token);
    const fund = (await dbGet(fundPath, token)) || {};
    if (fund.type !== 'insurance') await dbPut(fundPath, { ...fund, type: 'insurance', policyId }, token);
  }
}

async function _reverseFundAccumulation({ basePath, policyId, year, month, token }) {
  const policy = await dbGet(`${basePath}/insurance_policies/${policyId}`, token);
  if (!policy || policy.type !== 'fund_insurance') return;
  const alloc = policy.fundsAllocation || [];
  const monthlyPremium = roundInt(policy.monthlyPremium);
  for (const a of alloc) {
    if (!a.fundId) continue;
    const subCost = Math.round(monthlyPremium * (Number(a.pct) || 0) / 100);
    const snapPath = `${basePath}/funds/${a.fundId}/snapshots/${year}/${String(month).padStart(2, '0')}`;
    const snap = await dbGet(snapPath, token);
    if (!snap) continue;
    await dbPut(snapPath, { ...snap, cumulativeCost: Math.max(0, roundInt(snap.cumulativeCost) - subCost), contribution: 0, updatedAt: Date.now() }, token);
  }
}

/* ============================================
   主路由分派
   ============================================ */
export async function handleRequest(request, method) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (method === 'GET') {
    if (path === '/api/family-settings') return handleFamilySettingsGet(request);
    if (path === '/api/family-accounts') return handleFamilyAccountsGet(request);
    if (path === '/api/admin-families') return handleAdminFamiliesGet(request);
    if (path === '/api/summary') return handleSummary(request);
    if (path === '/api/annual-summary') return handleAnnualSummary(request);
    if (path === '/api/settlements-year') return handleSettlementsYear(request);
    if (path === '/api/platform-settings') return handlePlatformSettingsGet(request);
    if (path === '/api/platform-defaults') return handlePlatformDefaultsGet(request);
    if (path === '/api/bank-accounts') return handleBankAccountsGet(request);
    if (path === '/api/bank-transactions') return handleBankTransactionsGet(request);
    if (path === '/api/personal-income') return handlePersonalIncomeGet(request);
    if (path === '/api/member-advances') return handleMemberAdvancesGet(request);
  }

  if (method === 'POST') {
    if (path === '/api/lookup-family') return handleLookupFamily(request);
    if (path === '/api/family-settings') return handleFamilySettingsPost(request);
    if (path === '/api/family-accounts') return handleFamilyAccountsPost(request);
    if (path === '/api/admin-families') return handleAdminFamiliesPost(request);
    if (path === '/api/admin-init-family') return handleAdminInitFamily(request);
    if (path === '/api/admin-migrate') return handleAdminMigrate(request);
    if (path === '/api/platform-settings') return handlePlatformSettingsPost(request);
    if (path === '/api/platform-defaults') return handlePlatformDefaultsPost(request);
    if (path === '/api/bank-accounts') return handleBankAccountsPost(request);
    if (path === '/api/bank-transactions') return handleBankTransactionsPost(request);
    if (path === '/api/clear-bank-balances') return handleClearBankBalances(request);
    if (path === '/api/personal-income') return handlePersonalIncomePost(request);
    if (path === '/api/member-advances') return handleMemberAdvancesPost(request);
    if (path === '/api/insurance-sync') return handleInsuranceSync(request);
    if (path === '/api/entity-create') return handleEntityPost(request);
  }

  return errorResponse('NOT_FOUND', `未知的 API：${path}`);
}

/* ═══ EOF ═══
F: functions/api/_api-core.js
V: 1792720000
W: webapp-20261023-001#5
═══ */