// ============================================
// api.js — Cloudflare Functions 呼叫封裝（v103.0.23）
// 位置：js/core/api.js
// ============================================
// v103.0.23（B34-4）：
//   ✅ 新增 api.entityCreate（統一 CRUD 端點，D-063）
//   ✅ 加 entityCreate 封裝
// v103.0.22（B25-6）：
//   ✅ 加 adminMigrate 封裝
// ============================================

import { AppState } from './state.js';
import { auth } from '../config/firebase-config.js';
import { STORAGE_KEYS, ROUTES } from '../config/constants.js';

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

  if (res.status === 401) {
    localStorage.removeItem(STORAGE_KEYS.FAMILY_ID);
    localStorage.removeItem(STORAGE_KEYS.FAMILY_NAME);
    window.location.href = ROUTES.LOGIN;
    throw new Error('登入已過期，請重新登入');
  }

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

function getFamilyId() {
  const id = AppState.getFamilyId();
  if (!id) throw new Error('尚未選擇家庭');
  return id;
}

export const api = {
  lookupFamily: () =>
    callApi('/api/lookup-family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),

  summary: (year, month) =>
    callApi(`/api/summary?familyId=${getFamilyId()}&year=${year}&month=${month}`),

  fetchAnnualSummary: async (year) => {
    const familyId = getFamilyId();
    const result = await callApi(
      `/api/annual-summary?familyId=${familyId}&startYear=${year}&endYear=${year}`
    );

    const yearData = result.years?.[0];
    if (!yearData) {
      return {
        year, monthly: [],
        totalIncome: 0, totalExpense: 0, netBalance: 0,
        yearlyInsuranceTotal: 0, totalAssets: 0, bankBalance: 0, fundValue: 0,
      };
    }

    const monthly = yearData.monthly || [];

    return {
      year,
      monthly,
      totalIncome: yearData.totalIncome || 0,
      totalExpense: yearData.totalExpense || 0,
      netBalance: yearData.netBalance || 0,
      yearlyInsuranceTotal: yearData.yearlyInsuranceTotal || 0,
      totalAssets: yearData.totalAssets || 0,
      bankBalance: yearData.bankBalance || 0,
      fundValue: yearData.fundValue || 0,
    };
  },

  fetchAnnualSummaryRange: async (startYear, endYear) => {
    const familyId = getFamilyId();
    return callApi(`/api/annual-summary?familyId=${familyId}&startYear=${startYear}&endYear=${endYear}`);
  },

  fetchSettlementsYear: async (year) => {
    const familyId = getFamilyId();
    return callApi(`/api/settlements-year?familyId=${familyId}&year=${year}`);
  },

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

  /* 🆕 v103.0.23（B34-4）：統一實體 CRUD（D-063） */
  entityCreate: (payload) =>
    callApi('/api/entity-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, familyId: getFamilyId() }),
    }),

  adminListFamilies: () =>
    callApi('/api/admin-families?action=list'),

  adminAddFamily: (uid, name, email) =>
    callApi('/api/admin-families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', uid, name, email }),
    }),

  adminRemoveFamily: (uid) =>
    callApi('/api/admin-families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', uid }),
    }),

  adminInitFamily: (uid) =>
    callApi('/api/admin-init-family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    }),

  /* 一次性遷移 */
  adminMigrate: (familyId) =>
    callApi('/api/admin-migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ familyId, confirm: 'MIGRATE_ALL' }),
    }),

  familyAccounts: {
    list: (familyId) =>
      callApi(`/api/family-accounts?familyId=${familyId}&action=list`),

    create: (familyId, data) =>
      callApi('/api/family-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', familyId, ...data }),
      }),

    restore: (familyId, data) =>
      callApi('/api/family-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', familyId, ...data }),
      }),

    update: (familyId, uid, data) =>
      callApi('/api/family-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', familyId, uid, ...data }),
      }),

    remove: (familyId, uid) =>
      callApi('/api/family-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', familyId, uid }),
      }),
  },

  platformSettings: {
    get: () => callApi('/api/platform-settings'),

    update: (data) =>
      callApi('/api/platform-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', data }),
      }),
  },

  platformDefaults: {
    list: (resource) =>
      callApi(`/api/platform-defaults?action=list&resource=${resource}`),

    put: (resource, id, data) =>
      callApi('/api/platform-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'put', resource, id, data }),
      }),

    remove: (resource, id) =>
      callApi('/api/platform-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', resource, id }),
      }),

    set: (resource, data) =>
      callApi('/api/platform-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', resource, data }),
      }),
  },

  familySettings: {
    get: () =>
      callApi(`/api/family-settings?familyId=${getFamilyId()}`),

    update: (data) =>
      callApi('/api/family-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), action: 'update', data }),
      }),

    putStatus: (id, data) =>
      callApi('/api/family-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), action: 'put-status', id, data }),
      }),

    removeStatus: (id) =>
      callApi('/api/family-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), action: 'delete-status', id }),
      }),
  },

  bankAccounts: {
    list: () =>
      callApi(`/api/bank-accounts?familyId=${getFamilyId()}&action=list`),

    create: (data) =>
      callApi('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), action: 'create', data }),
      }),

    update: (id, data) =>
      callApi('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), action: 'update', id, data }),
      }),

    remove: (id) =>
      callApi('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), action: 'remove', id }),
      }),
  },

  bankTransactions: {
    list: (bankId) =>
      callApi(`/api/bank-transactions?familyId=${getFamilyId()}&bankId=${bankId}&action=list`),

    listAll: () =>
      callApi(`/api/bank-transactions?familyId=${getFamilyId()}&action=listAll`),

    create: (bankId, data) =>
      callApi('/api/bank-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), bankId, action: 'create', data }),
      }),

    update: (bankId, txnId, data) =>
      callApi('/api/bank-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), bankId, txnId, action: 'update', data }),
      }),

    remove: (bankId, txnId) =>
      callApi('/api/bank-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), bankId, txnId, action: 'remove' }),
      }),
  },

  personalIncome: {
    list: (memberId) =>
      callApi(`/api/personal-income?familyId=${getFamilyId()}&memberId=${memberId}&action=list`),

    save: (memberId, year, month, amount) =>
      callApi('/api/personal-income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), memberId, year, month, amount, action: 'save' }),
      }),

    remove: (memberId, year, month) =>
      callApi('/api/personal-income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), memberId, year, month, action: 'remove' }),
      }),
  },

  memberAdvances: {
    list: (memberId) =>
      callApi(`/api/member-advances?familyId=${getFamilyId()}&memberId=${memberId}&action=list`),

    listAll: () =>
      callApi(`/api/member-advances?familyId=${getFamilyId()}&action=listAll`),

    create: (memberId, data) =>
      callApi('/api/member-advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), memberId, action: 'create', data }),
      }),

    update: (memberId, advanceId, data) =>
      callApi('/api/member-advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), memberId, advanceId, action: 'update', data }),
      }),

    remove: (memberId, advanceId) =>
      callApi('/api/member-advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: getFamilyId(), memberId, advanceId, action: 'remove' }),
      }),
  },

  clearBankBalances: () =>
    callApi('/api/clear-bank-balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        familyId: getFamilyId(),
        confirm: 'CONFIRM_DELETE',
      }),
    }),
};

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/core/api.js
   Version: 1791900880
   Batch: B34-4
   Writer: A20261013-004#082
   ═══════════════════════════════════════════ */