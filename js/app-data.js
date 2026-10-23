// ============================================
// app-data.js — 資料層（API、常數、狀態、欄位定義）
// ============================================

import { AppState, auth } from './app-core.js';

/* ============================================
   1. 常數與狀態註冊
   ============================================ */
export const RESERVED_IDS = { EXTRA_INCOME: 'extra', SHARED_MEMBER: 'shared' };
export const BANK_TXN_TYPE_LABELS = { in: '入帳', out: '出帳', transfer: '內部轉帳' };
export const BANK_TXN_CATEGORY_LABELS = { contribution: '家用轉入', expense: '支出', insurance: '保險', reimbursement: '代墊報銷', manual: '手動' };

export const STATUS = { PENDING: 'pending', DONE: 'done', SKIPPED: 'skipped' };
const _IS_DONE = { pending: false, done: true, skipped: true };
const _LABELS = {
  default: { pending: '未處理', done: '已處理', skipped: '不適用' },
  personal:  { pending: '未付款', done: '已付款', skipped: '不適用' },
  insurance: { pending: '未扣款', done: '已扣款', skipped: '不適用' },
};

export function statusNormalize(raw) {
  if (!raw) return STATUS.PENDING;
  if (['pending', 'done', 'skipped'].includes(raw)) return raw;
  const map = { '未處理': 'pending', '未付款': 'pending', '未扣款': 'pending', '未還款': 'pending', '未轉入': 'pending', '已處理': 'done', '已付款': 'done', '已扣款': 'done', '已還款': 'done', '已轉入': 'done', '不適用': 'skipped' };
  return map[raw] || STATUS.PENDING;
}
export function statusIsDone(raw) { return !!_IS_DONE[statusNormalize(raw)]; }
export function statusLabel(raw, source = 'personal') {
  const code = statusNormalize(raw);
  return (_LABELS[source] || _LABELS.default)[code] || _LABELS.default[code];
}
export function statusBadgeClass(raw) {
  const code = statusNormalize(raw);
  return code === 'done' ? 'badge-success' : code === 'skipped' ? 'badge-muted' : 'badge-pending';
}

/* ============================================
   2. API Client
   ============================================ */
async function callApi(path, options = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}), 'Authorization': `Bearer ${token}` };

  let res;
  try {
    res = await fetch(path, { ...options, headers });
  } catch (err) {
    throw new Error(`網路錯誤：${err.message}`);
  }

  if (res.status === 401) { window.location.reload(); throw new Error('登入過期'); }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let parsed = null; try { parsed = JSON.parse(text); } catch (e) {}
    throw new Error(parsed?.message || text || 'API 錯誤');
  }
  return res.json();
}

function _fid() { return AppState.currentFamilyId; }

export const api = {
  lookupFamily: () => callApi('/api/lookup-family', { method: 'POST' }),
  summary: (year, month) => callApi(`/api/summary?familyId=${_fid()}&year=${year}&month=${month}`),
  annualSummary: (s, e) => callApi(`/api/annual-summary?familyId=${_fid()}&startYear=${s}&endYear=${e}`),
  settlementsYear: (year) => callApi(`/api/settlements-year?familyId=${_fid()}&year=${year}`),
  
  insuranceSync: (p) => callApi('/api/insurance-sync', { method: 'POST', body: JSON.stringify({ ...p, familyId: _fid(), action: 'upsert' }) }),
  insuranceUnsync: (p) => callApi('/api/insurance-sync', { method: 'POST', body: JSON.stringify({ ...p, familyId: _fid(), action: 'delete' }) }),
  entityCreate: (p) => callApi('/api/entity-create', { method: 'POST', body: JSON.stringify({ ...p, familyId: _fid() }) }),

  // Admin
  adminListFamilies: () => callApi('/api/admin-families?action=list'),
  adminAddFamily: (uid, name, email) => callApi('/api/admin-families', { method: 'POST', body: JSON.stringify({ action: 'add', uid, name, email }) }),
  adminRemoveFamily: (uid) => callApi('/api/admin-families', { method: 'POST', body: JSON.stringify({ action: 'remove', uid }) }),
  
  // Settings
  platformDefaults: {
    list: (r) => callApi(`/api/platform-defaults?action=list&resource=${r}`),
    put: (r, id, d) => callApi('/api/platform-defaults', { method: 'POST', body: JSON.stringify({ action: 'put', resource: r, id, data: d }) }),
    remove: (r, id) => callApi('/api/platform-defaults', { method: 'POST', body: JSON.stringify({ action: 'delete', resource: r, id }) }),
  },
  familySettings: {
    get: () => callApi(`/api/family-settings?familyId=${_fid()}`),
    update: (d) => callApi('/api/family-settings', { method: 'POST', body: JSON.stringify({ familyId: _fid(), action: 'update', data: d }) }),
  },
  bankAccounts: {
    list: () => callApi(`/api/bank-accounts?familyId=${_fid()}&action=list`),
    create: (d) => callApi('/api/bank-accounts', { method: 'POST', body: JSON.stringify({ familyId: _fid(), action: 'create', data: d }) }),
    update: (id, d) => callApi('/api/bank-accounts', { method: 'POST', body: JSON.stringify({ familyId: _fid(), action: 'update', id, data: d }) }),
    remove: (id) => callApi('/api/bank-accounts', { method: 'POST', body: JSON.stringify({ familyId: _fid(), action: 'remove', id }) }),
  },
  bankTransactions: {
    listAll: () => callApi(`/api/bank-transactions?familyId=${_fid()}&action=listAll`),
    create: (bid, d) => callApi('/api/bank-transactions', { method: 'POST', body: JSON.stringify({ familyId: _fid(), bankId: bid, action: 'create', data: d }) }),
  },
  personalIncome: {
    save: (mid, y, m, a) => callApi('/api/personal-income', { method: 'POST', body: JSON.stringify({ familyId: _fid(), memberId: mid, year: y, month: m, amount: a, action: 'save' }) }),
  }
};

/* ============================================
   3. 欄位與解析定義 (DataTable/DataCard 使用)
   ============================================ */
export const COLUMNS = {
  codeList: [
    { id: 'code', label: '編號', width: 160 },
    { id: 'entityLabel', label: '類型', width: 120 },
    { id: 'name', label: '名稱' },
  ],
  settlements: [
    { id: 'sourceLabel', label: '來源', width: 100 },
    { id: 'yearMonth', label: '年月', width: 90 },
    { id: 'memberName', label: '成員', width: 100 },
    { id: 'name', label: '項目名稱' },
    { id: 'amount', label: '金額', type: 'number', width: 120 },
    { id: 'statusLabel', label: '狀態', width: 100 },
  ],
  bankTransactions: [
    { id: 'date', label: '日期', width: 110 },
    { id: 'bankName', label: '銀行', width: 100 },
    { id: 'typeLabel', label: '類型', width: 90 },
    { id: 'amount', label: '金額', type: 'number', width: 120 },
    { id: 'note', label: '備註' },
  ],
  memberReport: [
    { id: 'name', label: '成員', width: 140 },
    { id: 'income', label: '家用轉入', type: 'number' },
    { id: 'personalIncome', label: '個人收入', type: 'number' },
    { id: 'expense', label: '支出', type: 'number' },
    { id: 'insurance', label: '保險', type: 'number' },
    { id: 'net', label: '淨額', type: 'number' },
  ]
};

export function formatHKD(amount) {
  if (amount == null || isNaN(amount)) return 'HK$ 0';
  return 'HK$ ' + Math.round(Number(amount)).toLocaleString('zh-HK');
}

export const RESOLVERS = {
  codeList: {
    code: (v) => `<span class="mono text-cyan">${v || '—'}</span>`,
    entityLabel: (v) => `<span class="badge badge-info">${v}</span>`,
  },
  settlements: {
    amount: (v) => formatHKD(v),
    statusLabel: (v, r) => `<span class="badge ${statusBadgeClass(r.status)}">${v}</span>`,
    memberName: (v) => v === 'shared' ? '家庭' : v,
  },
  bankTransactions: {
    typeLabel: (v, r) => `<span class="badge ${r.type === 'in' ? 'badge-success' : 'badge-pending'}">${v}</span>`,
    amount: (v, r) => `<span class="mono ${r.type === 'in' ? 'text-emerald' : 'text-red'}">${r.type === 'in' ? '+' : '-'}${formatHKD(v)}</span>`,
  },
  memberReport: {
    income: (v) => `<span class="text-emerald">${formatHKD(v)}</span>`,
    expense: (v) => `<span class="text-red">${formatHKD(v)}</span>`,
    net: (v) => `<span class="${v >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(v)}</span>`,
  }
};

export function getColumns(key) { return COLUMNS[key] || []; }
export function getResolvers(key) { return RESOLVERS[key] || {}; }

/* ═══ EOF ═══
F: js/app-data.js
V: 1792800002
W: webapp-20261023-001#22
═══ */