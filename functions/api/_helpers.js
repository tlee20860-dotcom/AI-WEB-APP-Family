// ============================================
// _helpers.js — API 共用輔助（v103.0.44）
// 位置：functions/api/_helpers.js
// ============================================
// v103.0.44（B30-5）：
//   ✅ 改從 getApiKey() 讀（支援 DB 切換）
// v103.0.22（B25-4）：
//   ✅ H3：移除重複定義，改從 _config.js 導入
// ============================================

import { SUPERADMIN_EMAIL, getApiKey, IDENTITY_TOOLKIT_URL as IDENTITY_TOOLKIT_BASE, jsonResponse, dbGet } from './_config.js';

const IDENTITY_TOOLKIT_LOOKUP_URL = `${IDENTITY_TOOLKIT_BASE}/accounts:lookup`;

export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export const PLATFORM_RESOURCES = {
  members:     { path: 'members',             type: 'list' },
  banks:       { path: 'banks',               type: 'list' },
  companies:   { path: 'insurance_companies', type: 'list' },
  payments:    { path: 'payment_methods',     type: 'list' },
  categories:  { path: 'expense_categories',  type: 'list' },
  items:       { path: 'expense_items',       type: 'list' },
  statuses:    { path: 'statuses',            type: 'list' },
  options:     { path: 'options',             type: 'object' },
  yearRange:   { path: 'year_range',          type: 'object' },
  uiConstants: { path: 'ui_constants',        type: 'object' },
};

const _tokenCache = new Map();
const _TOKEN_CACHE_MS = 60 * 1000;

export function extractToken(request) {
  const authHeader = request.headers.get('Authorization') || '';
  return authHeader.replace('Bearer ', '').trim();
}

export async function verifyToken(token) {
  if (!token) return null;

  const cached = _tokenCache.get(token);
  if (cached && cached.expireAt > Date.now()) return cached.user;

  try {
    const res = await fetch(`${IDENTITY_TOOLKIT_LOOKUP_URL}?key=${getApiKey()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const user = data?.users?.[0] || null;
    if (user) {
      _tokenCache.set(token, { user, expireAt: Date.now() + _TOKEN_CACHE_MS });
    }
    return user;
  } catch (err) {
    console.warn('[_helpers] verifyToken 失敗：', err);
    return null;
  }
}

export async function verifySuperAdmin(token) {
  const user = await verifyToken(token);
  if (!user) return null;
  if (user.email !== SUPERADMIN_EMAIL) return null;
  return user;
}

export async function verifyFamilyAccess(token, familyId) {
  if (!familyId) return null;

  const user = await verifyToken(token);
  if (!user) return null;

  const isSuper = user.email === SUPERADMIN_EMAIL;
  if (isSuper) return { user, isSuper: true, isOwner: true, canInput: true };

  if (user.localId === familyId) {
    const memberAccount = await _getMemberAccount(familyId, user.localId, token);
    if (!memberAccount) {
      return { user, isSuper: false, isOwner: false, canInput: false, isLegacy: true };
    }
    return {
      user,
      isSuper: false,
      isOwner: memberAccount.role === 'owner',
      canInput: memberAccount.canInput !== false,
      isLegacy: true,
    };
  }

  const memberAccount = await _getMemberAccount(familyId, user.localId, token);
  if (memberAccount) {
    return {
      user,
      isSuper: false,
      isOwner: memberAccount.role === 'owner',
      canInput: memberAccount.canInput !== false,
    };
  }

  return null;
}

export async function verifyFamilyAccessByUid(uid, token = '') {
  if (!uid) return null;

  const familyId = await dbGet(`platform/uid_index/${uid}`, token);
  if (familyId && typeof familyId === 'string') {
    const memberAccount = await _getMemberAccount(familyId, uid, token);
    return { familyId, memberAccount: memberAccount || null, isLegacy: false };
  }

  const familySnap = await dbGet(`platform/families/${uid}`, token);
  if (familySnap) {
    return {
      familyId: uid,
      memberAccount: {
        email: '',
        displayName: familySnap.name || '我的家庭',
        role: 'owner',
        canInput: true,
      },
      isLegacy: true,
    };
  }

  return null;
}

async function _getMemberAccount(familyId, uid, token = '') {
  try {
    return (await dbGet(`platform/families/${familyId}/memberAccounts/${uid}`, token)) || null;
  } catch (err) {
    return null;
  }
}

export function requireFields(body, fields) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'INVALID_BODY', fields };
  }
  const missing = fields.filter((f) => {
    const v = body[f];
    return v === '' || v == null;
  });
  if (missing.length > 0) return { ok: false, error: 'MISSING_FIELDS', fields: missing };
  return null;
}

export function errorResponse(code, message = '', status) {
  const statusMap = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    MISSING_FIELDS: 400,
    INVALID_BODY: 400,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL: 500,
  };
  const httpStatus = status || statusMap[code] || 500;
  const body = { ok: false, error: code };
  if (message) body.message = message;
  return jsonResponse(body, httpStatus);
}

export function handleError(err) {
  console.error('[_helpers] API error:', err);
  return errorResponse('INTERNAL', String(err?.message || err));
}

export function successResponse(data = {}) {
  return jsonResponse({ ok: true, ...data });
}

export async function authenticate(request, options = {}) {
  const { body, requiredFields, needSuperAdmin, needFamily } = options;
  const token = extractToken(request);

  if (requiredFields && body) {
    const missingResult = requireFields(body, requiredFields);
    if (missingResult) return errorResponse('MISSING_FIELDS', '', 400);
  }

  if (needSuperAdmin) {
    const user = await verifySuperAdmin(token);
    if (!user) return errorResponse('FORBIDDEN', '需要超級管理員權限');
    return { token, user, isSuper: true };
  }

  if (needFamily) {
    let familyId = body?.familyId;
    if (!familyId) {
      try {
        const url = new URL(request.url);
        familyId = url.searchParams.get('familyId');
      } catch (e) { /* noop */ }
    }

    if (!familyId) return errorResponse('MISSING_FIELDS', 'familyId 為必填');
    const result = await verifyFamilyAccess(token, familyId);
    if (!result) return errorResponse('FORBIDDEN', '無權存取此家庭');
    return {
      token,
      user: result.user,
      isSuper: result.isSuper,
      isOwner: result.isOwner,
      canInput: result.canInput,
      familyId,
    };
  }

  const user = await verifyToken(token);
  if (!user) return errorResponse('UNAUTHORIZED', '請重新登入');
  return { token, user, isSuper: user.email === SUPERADMIN_EMAIL };
}

export function filterEmpty(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  Object.entries(obj).forEach(([k, v]) => { if (v != null) out[k] = v; });
  return out;
}

export function objToList(obj, sortFn) {
  const list = Object.entries(obj || {}).map(([id, x]) => ({ id, ...x }));
  if (typeof sortFn === 'function') list.sort(sortFn);
  return list;
}

export function roundInt(v) {
  return Math.round(Number(v) || 0);
}

export const LINKED_PREFIX = 'linked_';

export function buildLinkedKey(policyId) {
  return `${LINKED_PREFIX}${policyId}`;
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: functions/api/_helpers.js
   Version: v103.0.44
   Batch: B30-5
   ═══════════════════════════════════════════ */