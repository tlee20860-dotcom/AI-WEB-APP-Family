// ============================================
// api-client.js — 統一 API 呼叫封裝（V2 重構版）
// 位置：domain/api-client.js
// 說明：自動附帶 Firebase Token，處理 401/403 錯誤。
//       將舊版散落的 fetch 集中管理。
// ============================================

import { auth } from '../config/firebase.js';
import { AppState } from '../config/state.js';
import { STORAGE_KEYS, ROUTES } from '../config/constants.js';

/* ============================================
   1. 核心 fetch 封裝
   ============================================ */
export async function callApi(path, options = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';

  const headers = {
    ...(options.headers || {}),
    'Authorization': `Bearer ${token}`,
  };

  let res;
  try {
    res = await fetch(path, { ...options, headers });
  } catch (err) {
    throw new Error(`網路錯誤（${path}）：${err.message}`);
  }

  // 處理身分過期
  if (res.status === 401) {
    localStorage.removeItem(STORAGE_KEYS.FAMILY_ID);
    localStorage.removeItem(STORAGE_KEYS.FAMILY_NAME);
    window.location.hash = ROUTES.LOGIN;
    throw new Error('登入已過期，請重新登入');
  }

  // 處理權限不足
  if (res.status === 403) {
    const text = await res.text().catch(() => '');
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (e) { /* noop */ }
    const msg = parsed?.message || text || '無權限存取';
    throw new Error(msg);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (e) { /* noop */ }
    const msg = parsed?.message || parsed?.error || text || '未知錯誤';
    const err = new Error(msg);
    err.code = parsed?.error || 'UNKNOWN';
    err.status = res.status;
    throw err;
  }

  return res.json();
}

/* ============================================
   2. 常用 API 集合
   ============================================ */
function getFamilyId() {
  const id = AppState.getFamilyId();
  if (!id) throw new Error('尚未選擇家庭');
  return id;
}

export const api = {
  // 核心身分
  lookupFamily: () =>
    callApi('/api/lookup-family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),

  // 總覽與報表
  summary: (year, month) =>
    callApi(`/api/summary?familyId=${getFamilyId()}&year=${year}&month=${month}`),

  fetchAnnualSummaryRange: async (startYear, endYear) =>
    callApi(`/api/annual-summary?familyId=${getFamilyId()}&startYear=${startYear}&endYear=${endYear}`),

  fetchSettlementsYear: async (year) =>
    callApi(`/api/settlements-year?familyId=${getFamilyId()}&year=${year}`),

  // 保險
  insuranceSync: (payload) =>
    callApi('/api/insurance-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, familyId: getFamilyId(), action: 'upsert' }),
    }),

  insuranceUnsync: (payload) =>
    callApi('/api/insurance-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, familyId: getFamilyId(), action: 'delete' }),
    }),

  // 統一實體 CRUD (D-063)
  entityCreate: (payload) =>
    callApi('/api/entity-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, familyId: getFamilyId() }),
    }),

  // 管理員專用
  adminListFamilies: () => callApi('/api/admin-families?action=list'),
  
  adminAddFamily: (uid, name, email) =>
    callApi('/api/admin-families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', uid, name, email }),
    }),

  adminInitFamily: (uid) =>
    callApi('/api/admin-init-family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    }),
};

/* ═══ EOF ═══
F: domain/api-client.js
V: 1792900320
W: ai-system-20261024-012#27
═══ EOF ═══ */