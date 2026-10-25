// ============================================
// helpers.js — 後端共用輔助（V2 重構版）
// 位置：api/helpers.js
// 說明：集中處理 Token 驗證、權限檢查與標準化回應格式。
// ============================================

import { 
  FIREBASE_API_KEY, 
  SUPERADMIN_EMAIL, 
  IDENTITY_TOOLKIT_URL, 
  jsonResponse, 
  dbGet 
} from './config.js';

const IDENTITY_TOOLKIT_LOOKUP_URL = `${IDENTITY_TOOLKIT_URL}/accounts:lookup`;

// 輕量 Token 快取（避免同一請求重複驗證，生命週期 1 分鐘）
const _tokenCache = new Map();
const _TOKEN_CACHE_MS = 60 * 1000;

/* ============================================
   1. 權杖與身分驗證
   ============================================ */

export function extractToken(request) {
  const authHeader = request.headers.get('Authorization') || '';
  return authHeader.replace('Bearer ', '').trim();
}

export async function verifyToken(token) {
  if (!token) return null;

  const cached = _tokenCache.get(token);
  if (cached && cached.expireAt > Date.now()) return cached.user;

  try {
    const res = await fetch(`${IDENTITY_TOOLKIT_LOOKUP_URL}?key=${FIREBASE_API_KEY}`, {
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
    console.warn('[api/helpers] verifyToken 失敗：', err);
    return null;
  }
}

export async function verifySuperAdmin(token) {
  const user = await verifyToken(token);
  if (!user) return null;
  if (user.email !== SUPERADMIN_EMAIL) return null;
  return user;
}

/**
 * 檢查使用者是否有權存取特定家庭
 */
export async function verifyFamilyAccess(token, familyId) {
  if (!familyId) return null;

  const user = await verifyToken(token);
  if (!user) return null;

  const isSuper = user.email === SUPERADMIN_EMAIL;
  if (isSuper) return { user, isSuper: true, isOwner: true, canInput: true };

  // 查詢該使用者是否在此家庭的 memberAccounts 中
  const memberAccount = await dbGet(`platform/families/${familyId}/memberAccounts/${user.localId}`, token);
  
  if (memberAccount) {
    return {
      user,
      isSuper: false,
      isOwner: memberAccount.role === 'owner',
      canInput: memberAccount.canInput !== false,
      memberAccount
    };
  }

  return null;
}

/* ============================================
   2. 驗證封裝 (Middleware)
   ============================================ */

/**
 * 統一的身分驗證封裝
 */
export async function authenticate(request, options = {}) {
  const { needSuperAdmin, needFamily } = options;
  const token = extractToken(request);

  if (needSuperAdmin) {
    const user = await verifySuperAdmin(token);
    if (!user) return errorResponse('FORBIDDEN', '需要超級管理員權限');
    return { token, user, isSuper: true };
  }

  if (needFamily) {
    let familyId = '';
    try {
      const body = await request.clone().json();
      familyId = body.familyId;
    } catch (e) { /* 可能不是 JSON */ }
    
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

/* ============================================
   3. 回應與錯誤處理
   ============================================ */

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

export function successResponse(data = {}) {
  return jsonResponse({ ok: true, ...data });
}

export function handleError(err) {
  console.error('[api/helpers] API error:', err);
  return errorResponse('INTERNAL', String(err?.message || err));
}

/* ============================================
   4. 通用工具
   ============================================ */
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

export function roundInt(v) {
  return Math.round(Number(v) || 0);
}

/* ═══ EOF ═══
F: api/helpers.js
V: 1792900340
W: ai-system-20261024-012#29
═══ EOF ═══ */