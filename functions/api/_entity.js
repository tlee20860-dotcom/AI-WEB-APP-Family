// ============================================
// _entity.js — 統一實體 CRUD 端點（v1.0.2）
// 位置：functions/api/_entity.js
// ============================================
// v1.0.2（B34-4）：
//   ✅ 改用 REST 函式（dbGet / dbPush / dbPut / dbPatch / dbDelete）
//   ✅ 修正前一版誤用 db.ref(...) 的問題
// v1.0.1（B34-4）：
//   ✅ 修正 verifyFamilyAccess 呼叫方式
// v1.0.0（B34-4）：初版
// ============================================

import {
  dbGet,
  dbPut,
  dbPatch,
  dbPush,
  dbDelete,
} from './_config.js';

import {
  verifyFamilyAccess,
  extractToken,
  errorResponse,
  successResponse,
  handleError,
} from './_helpers.js';

/* ============================================
   entityType → Firebase 路徑
   ============================================ */
const ENTITY_PATH = {
  member:      'members',
  bank:        'banks',
  bankAccount: 'bank_accounts',
  category:    'expense_categories',
  item:        'expense_items',
  payment:     'payment_methods',
  company:     'insurance_companies',
  policy:      'insurance_policies',
  fund:        'funds',
};

/* ============================================
   entityType → 必填 extra 欄位
   ============================================ */
const REQUIRED_EXTRA = {
  member:      [],
  bank:        [],
  bankAccount: ['bankId', 'type', 'ownerType'],
  category:    ['shortCode'],
  item:        ['categoryId'],
  payment:     [],
  company:     [],
  policy:      ['type', 'memberId', 'firstStartYear', 'firstStartMonth', 'totalPolicyYears'],
  fund:        ['type'],
};

/* ============================================
   主入口
   ============================================ */
export async function handleEntityPost(request) {
  try {
    const body = await request.json();
    const { familyId, action, entityType, id, code, name, extra } = body;

    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');

    /* 驗證登入 + 權限 */
    const token = extractToken(request);
    const access = await verifyFamilyAccess(token, familyId);
    if (!access) return errorResponse('FORBIDDEN', '無權存取此家庭');

    if (!entityType || !ENTITY_PATH[entityType]) {
      return errorResponse('INVALID_BODY', `未知的 entityType：${entityType}`);
    }

    switch (action) {
      case 'create': return await _create(familyId, entityType, { code, name, extra }, token);
      case 'update': return await _update(familyId, entityType, id, { name, extra }, token);
      case 'delete': return await _delete(familyId, entityType, id, token);
      default:
        return errorResponse('INVALID_BODY', `未知的 action：${action}`);
    }
  } catch (err) {
    return handleError(err);
  }
}

/* ============================================
   Create
   ============================================ */
async function _create(familyId, entityType, { code, name, extra = {} }, token) {
  const required = REQUIRED_EXTRA[entityType] || [];
  const missing = required.filter((k) => extra[k] === undefined || extra[k] === '');
  if (missing.length > 0) {
    return errorResponse('MISSING_FIELDS', `缺少欄位：${missing.join(', ')}`);
  }
  if (!name) return errorResponse('MISSING_FIELDS', '缺少 name');
  if (!code) return errorResponse('MISSING_FIELDS', '缺少 code');

  const path = ENTITY_PATH[entityType];
  const listPath = `families/${familyId}/${path}`;

  /* 讀取現有列表（REST） */
  const list = (await dbGet(listPath, token)) || {};

  /* 重複檢查 */
  const codeDup = Object.entries(list).find(([_, v]) => v.code === code);
  if (codeDup) return errorResponse('CODE_DUPLICATE', `編號已存在：${code}`, 409);

  const nameDup = Object.entries(list).find(([_, v]) => v.name === name);
  if (nameDup) return errorResponse('NAME_DUPLICATE', `名稱重複：${name}`, 409);

  /* 建立（REST push） */
  const payload = {
    code,
    name,
    ..._normalizeExtra(entityType, extra),
    createdAt: Date.now(),
  };
  const newId = await dbPush(listPath, payload, token);
  if (!newId) return errorResponse('INTERNAL', '寫入失敗');

  return successResponse({ id: newId, code });
}

/* ============================================
   Update
   ============================================ */
async function _update(familyId, entityType, id, { name, extra = {} }, token) {
  if (!id) return errorResponse('MISSING_FIELDS', '缺少 id');

  const path = ENTITY_PATH[entityType];
  const itemPath = `families/${familyId}/${path}/${id}`;

  /* 檢查存在（REST） */
  const existing = await dbGet(itemPath, token);
  if (!existing) return errorResponse('NOT_FOUND', `找不到：${id}`);

  /* 名稱重複檢查 */
  if (name) {
    const list = (await dbGet(`families/${familyId}/${path}`, token)) || {};
    const nameDup = Object.entries(list).find(([k, v]) => k !== id && v.name === name);
    if (nameDup) return errorResponse('NAME_DUPLICATE', `名稱重複：${name}`, 409);
  }

  /* 更新（REST patch） */
  const payload = {
    ...(name !== undefined ? { name } : {}),
    ...(Object.keys(extra).length > 0 ? _normalizeExtra(entityType, extra) : {}),
    updatedAt: Date.now(),
  };
  const ok = await dbPatch(itemPath, payload, token);
  if (!ok) return errorResponse('INTERNAL', '更新失敗');

  return successResponse({ id });
}

/* ============================================
   Delete
   ============================================ */
async function _delete(familyId, entityType, id, token) {
  if (!id) return errorResponse('MISSING_FIELDS', '缺少 id');

  const path = ENTITY_PATH[entityType];
  const itemPath = `families/${familyId}/${path}/${id}`;

  const existing = await dbGet(itemPath, token);
  if (!existing) return errorResponse('NOT_FOUND', `找不到：${id}`);

  const ok = await dbDelete(itemPath, token);
  if (!ok) return errorResponse('INTERNAL', '刪除失敗');

  return successResponse({ id });
}

/* ============================================
   標準化 extra
   ============================================ */
function _normalizeExtra(entityType, extra) {
  const round = (v) => Math.round(Number(v) || 0);
  switch (entityType) {
    case 'member':
      return { role: extra.role || 'other', order: Number(extra.order) || 0 };
    case 'bank':
      return { order: Number(extra.order) || 0 };
    case 'bankAccount':
      return {
        type: extra.type,
        ownerType: extra.ownerType,
        ownerId: extra.ownerId || 'family',
        initialBalance: round(extra.initialBalance),
        initialYear: String(extra.initialYear || ''),
        initialMonth: String(extra.initialMonth || '01').padStart(2, '0'),
        order: Number(extra.order) || 0,
      };
    case 'category':
      return { shortCode: extra.shortCode, order: Number(extra.order) || 0 };
    case 'item':
      return { categoryId: extra.categoryId };
    case 'payment':
      return { order: Number(extra.order) || 0 };
    case 'company':
      return {};
    case 'policy':
      return {
        type: extra.type,
        memberId: extra.memberId,
        policyHolderId: extra.policyHolderId || extra.memberId,
        firstStartYear: Number(extra.firstStartYear),
        firstStartMonth: String(extra.firstStartMonth).padStart(2, '0'),
        totalPolicyYears: Number(extra.totalPolicyYears),
        totalPolicyPeriods: Number(extra.totalPolicyYears) * 12,
        monthlyPremium: round(extra.monthlyPremium),
        annualPremium: round(extra.annualPremium),
        fundsAllocation: Array.isArray(extra.fundsAllocation) ? extra.fundsAllocation : [],
      };
    case 'fund':
      return {
        type: extra.type,
        policyId: extra.policyId || '',
        cost: round(extra.cost),
        initialYear: String(extra.initialYear || ''),
        initialMonth: String(extra.initialMonth || '').padStart(2, '0'),
      };
    default:
      return {};
  }
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: functions/api/_entity.js
   Version: 1791901060
   Batch: B34-4
   Writer: A20261013-004#087
   ═══════════════════════════════════════════ */