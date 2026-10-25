// ============================================
// config.js — 後端 Firebase 設定與 REST 封裝（V2 重構版）
// 位置：api/config.js
// 說明：集中處理環境變數與 Firebase REST API 請求。
//       支援 DB_TARGET 切換 (old / new)。
// ============================================

/* ============================================
   1. 環境設定
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

// 使用 export let 以便在 initConfig 時動態更新
export let FIREBASE_DB_URL  = _DB_CONFIGS.new.url;
export let FIREBASE_API_KEY = _DB_CONFIGS.new.apiKey;

export const SUPERADMIN_EMAIL = 'superadmin@familyfin.local';
export const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1';

/**
 * 初始化設定（由 handler 在每個請求開頭呼叫）
 */
export function initConfig(env) {
  const target = (env && env.DB_TARGET) || 'new';
  const cfg = _DB_CONFIGS[target] || _DB_CONFIGS.new;
  FIREBASE_DB_URL  = cfg.url;
  FIREBASE_API_KEY = cfg.apiKey;
}

export function getApiKey() { return FIREBASE_API_KEY; }
export function getDbUrl()  { return FIREBASE_DB_URL; }

/* ============================================
   2. Firebase REST API 封裝
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
   3. 回應工具
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

/* ═══ EOF ═══
F: api/config.js
V: 1792900330
W: ai-system-20261024-012#28
═══ EOF ═══ */