// ============================================
// _config.js — Firebase REST 設定（v103.0.45）
// 位置：functions/api/_config.js
// ============================================
// v103.0.45（B30-5）：
//   ✅ 保留 FIREBASE_DB_URL / FIREBASE_API_KEY 的 let 匯出（相容舊引用）
//   ✅ initConfig(env) 動態更新
// ============================================

/* ============================================
   DB 目標（由 initConfig 設定）
   ============================================ */
const _DB_CONFIGS = {
  old: {
    url:    'https://family-fin-a6dd1-default-rtdb.asia-southeast1.firebasedatabase.app',
    apiKey: 'AIzaSyCQlrNdorKJI9xsqr4m4ME046lrubo9Y7I',
  },
  new: {
    url:    'https://family-3d0a5-default-rtdb.asia-southeast1.firebasedatabase.app',
    apiKey: 'AIzaSyBJCK83RQyHbol4yJ4UDo3pOUXpUgcW9hU',
  },
};

/* ⚠️ 用 export let（live binding），讓舊引用自動更新 */
export let FIREBASE_DB_URL  = _DB_CONFIGS.old.url;
export let FIREBASE_API_KEY = _DB_CONFIGS.old.apiKey;

export const SUPERADMIN_EMAIL = 'superadmin@familyfin.local';
export const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1';

/* ============================================
   initConfig（每個 request 開頭呼叫）
   ============================================ */
export function initConfig(env) {
  const target = (env && env.DB_TARGET) || 'old';
  const cfg = _DB_CONFIGS[target] || _DB_CONFIGS.old;
  FIREBASE_DB_URL  = cfg.url;
  FIREBASE_API_KEY = cfg.apiKey;
}

/* 輔助取值（給 _helpers.js 用） */
export function getApiKey() { return FIREBASE_API_KEY; }
export function getDbUrl()  { return FIREBASE_DB_URL; }

/* ============================================
   REST 基本操作
   ============================================ */

export async function dbGet(path, token = '') {
  const url = `${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

export async function dbPut(path, data, token = '') {
  const url = `${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.ok;
}

export async function dbPatch(path, data, token = '') {
  const url = `${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.ok;
}

export async function dbPush(path, data, token = '') {
  const url = `${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  const result = await res.json();
  return result?.name || null;
}

export async function dbDelete(path, token = '') {
  const url = `${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`;
  const res = await fetch(url, { method: 'DELETE' });
  return res.ok;
}

/* ============================================
   Firebase Auth 操作
   ============================================ */

export async function dbSignUp(email, password) {
  try {
    const url = `${IDENTITY_TOOLKIT_URL}/accounts:signUp?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || 'UNKNOWN_ERROR' };
    }
    return { ok: true, uid: data.localId, email: data.email };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}

export async function dbEmailExists(email) {
  return false;
}

/* ============================================
   回應工具
   ============================================ */

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: functions/api/_config.js
   Version: v103.0.45
   Batch: B30-5
   ═══════════════════════════════════════════ */