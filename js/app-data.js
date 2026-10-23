// ============================================
// app-data.js — SPA 資料層
// 職責：Firebase 封裝 / API client / registry / 常數 / 欄位定義
// 版本：1.0.1（FIX-E：補齊 GAP-14~19）
// ============================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getDatabase, ref, get, onValue, push, set, update, remove,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { AppState, DB_TARGET } from './app-core.js';

/* ============================================
   1. Firebase 取得（app-core 已 init，這裡取實例）
   ============================================ */
const _app = getApps().length ? getApp() : null;
export const db = _app ? getDatabase(_app) : null;
export const auth = _app ? getAuth(_app) : null;

/* ============================================
   2. 常數（GAP-16）
   ============================================ */
export const RESERVED_IDS = {
  EXTRA_INCOME: 'extra',
  SHARED_MEMBER: 'shared',
};

export const ROLES = {
  SUPERADMIN: 'superadmin',
  OWNER: 'owner',
  MEMBER: 'member',
};

export const BANK_TXN_TYPES = {
  IN: 'in',
  OUT: 'out',
  TRANSFER: 'transfer',
};

export const BANK_TXN_TYPE_LABELS = {
  in: '入帳',
  out: '出帳',
  transfer: '內部轉帳',
};

export const BANK_TXN_CATEGORIES = {
  CONTRIBUTION: 'contribution',
  EXPENSE: 'expense',
  INSURANCE: 'insurance',
  REIMBURSEMENT: 'reimbursement',
  MANUAL: 'manual',
};

export const BANK_TXN_CATEGORY_LABELS = {
  contribution: '家用轉入',
  expense: '支出',
  insurance: '保險',
  reimbursement: '代墊報銷',
  manual: '手動',
};

export const BANK_TXN_CATEGORY_BADGES = {
  contribution: 'badge-success',
  expense: 'badge-pending',
  insurance: 'badge-magenta',
  reimbursement: 'badge-info',
  manual: 'badge-muted',
};

export const BANK_ACCOUNT_TYPES = { FAMILY: 'family', PERSONAL: 'personal' };
export const BANK_ACCOUNT_TYPE_LABELS = { family: '家庭帳號', personal: '個人帳號' };

export const PAYMENT_MODES = { DIRECT: 'direct', ADVANCE: 'advance' };
export const PAYMENT_MODE_LABELS = { direct: '直接付款', advance: '代墊模式' };

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

/* ============================================
   3. Firebase RTDB 封裝
   ============================================ */
export function familyPath(subpath) {
  const fid = AppState.getFamilyId();
  if (!fid) throw new Error('尚未選擇家庭');
  return `families/${fid}/${subpath}`;
}

export function familyRef(subpath) { return ref(db, familyPath(subpath)); }

export function listen(subpath, callback, onError) {
  const fid = AppState.getFamilyId();
  if (!fid) { if (onError) onError(new Error('尚未選擇家庭')); return () => {}; }
  return onValue(ref(db, `families/${fid}/${subpath}`), callback, (err) => {
    console.error(`[app-data] 讀取失敗 [${subpath}]：`, err);
    if (onError) onError(err);
  });
}

export function listenList(subpath, sortFn, callback, onError) {
  return listen(subpath, (snap) => {
    const v = snap.val() || {};
    const list = Object.entries(v).map(([id, x]) => ({ id, ...x }));
    if (typeof sortFn === 'function') list.sort(sortFn);
    callback(list);
  }, onError);
}

export async function getOnce(subpath) {
  const snap = await get(familyRef(subpath));
  return snap.val();
}

export async function getListOnce(subpath, sortFn) {
  const v = (await getOnce(subpath)) || {};
  const list = Object.entries(v).map(([id, x]) => ({ id, ...x }));
  if (typeof sortFn === 'function') list.sort(sortFn);
  return list;
}

export async function pushItem(subpath, data) {
  const r = push(familyRef(subpath));
  await set(r, data);
  return r.key;
}

export async function updateItem(subpath, id, patch) {
  if (!id) throw new Error('缺少 id');
  await update(familyRef(`${subpath}/${id}`), patch);
}

export async function putItem(subpath, id, data) {
  if (!id) throw new Error('缺少 id');
  await set(familyRef(`${subpath}/${id}`), data);
}

export async function removeItem(subpath, id) {
  if (!id) throw new Error('缺少 id');
  await remove(familyRef(`${subpath}/${id}`));
}

export async function setSubpath(subpath, data) {
  await set(familyRef(subpath), data);
}

export async function removeSubpath(subpath) {
  await remove(familyRef(subpath));
}

/* ============================================
   4. 設定讀取（GAP-19）
   ============================================ */
let _appConfig = { yearRange: null, options: null, statuses: null, uiConstants: null };

export function listenAppConfig() {
  const paths = [
    ['yearRange', 'settings/year_range'],
    ['options', 'settings/options'],
    ['statuses', 'statuses'],
    ['uiConstants', 'settings/ui_constants'],
  ];
  const unsubs = [];
  paths.forEach(([key, path]) => {
    const unsub = listen(path, (snap) => {
      _appConfig[key] = snap.val();
    });
    unsubs.push(unsub);
  });
  return () => unsubs.forEach((u) => u && u());
}

export function getYearRange() {
  const cfg = _appConfig.yearRange || { startYear: null, futureYears: 5 };
  const curY = new Date().getFullYear();
  let startYear = cfg.startYear ? Math.min(Number(cfg.startYear), curY - 3) : curY - 3;
  const futureYears = Number(cfg.futureYears) || 5;
  return { startYear, endYear: curY + futureYears };
}

export function getYearList() {
  const { startYear, endYear } = getYearRange();
  const list = [];
  for (let y = startYear; y <= endYear; y++) list.push(y);
  return list;
}

export function getOptions(key) {
  const defaults = {
    memberRoles: [{ value: 'husband', label: '老公 / 丈夫' }, { value: 'wife', label: '老婆 / 妻子' }, { value: 'child', label: '子女' }, { value: 'other', label: '其他' }],
    policyTypes: [{ value: 'normal', label: '普通保險' }, { value: 'fund_insurance', label: '基金保險' }],
    insurancePaymentTypes: [{ value: '年繳', label: '年繳' }, { value: '月繳', label: '月繳' }, { value: '一次付款', label: '一次付款' }],
    paymentModes: [{ value: 'direct', label: '直接付款' }, { value: 'advance', label: '代墊模式' }],
  };
  return (_appConfig.options && _appConfig.options[key]) || defaults[key] || [];
}

export function getStatusesByCategory(category) {
  const raw = _appConfig.statuses || {};
  return Object.entries(raw)
    .map(([id, s]) => ({ id, ...s }))
    .filter((s) => s.category === category)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function getUIConstants() {
  return _appConfig.uiConstants || { nameMaxLenDesktop: 12, nameMaxLenMobile: 6, toastDuration: 2000 };
}

export async function saveYearRange(data) {
  await setSubpath('settings/year_range', data);
  _appConfig.yearRange = data;
}

export function listenYearRange(cb) {
  return listen('settings/year_range', (snap) => cb(snap.val()));
}

/* ============================================
   5. API Client（路徑、格式 100% 沿用舊版）
   ============================================ */
async function callApi(path, opts = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';
  const headers = { ...(opts.headers || {}), 'Authorization': `Bearer ${token}` };

  let res;
  try { res = await fetch(path, { ...opts, headers }); }
  catch (err) { throw new Error(`網路錯誤（${path}）：${err.message}`); }

  if (res.status === 401) {
    localStorage.removeItem('fin_family_id');
    location.hash = '#/';
    throw new Error('登入已過期，請重新登入');
  }
  if (res.status === 403) {
    const t = await res.text().catch(() => '');
    let p = null; try { p = JSON.parse(t); } catch (e) {}
    throw new Error(p?.message || t || '無權限存取');
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    let p = null; try { p = JSON.parse(t); } catch (e) {}
    const msg = p?.message || p?.error || t || '未知錯誤';
    const err = new Error(msg); err.code = p?.error || 'UNKNOWN'; err.status = res.status;
    throw err;
  }
  return res.json();
}

function _fid() {
  const id = AppState.getFamilyId();
  if (!id) throw new Error('尚未選擇家庭');
  return id;
}

export const api = {
  lookupFamily: () => callApi('/api/lookup-family', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
  summary: (year, month) => callApi(`/api/summary?familyId=${_fid()}&year=${year}&month=${month}`),
  fetchAnnualSummary: async (year) => {
    const r = await callApi(`/api/annual-summary?familyId=${_fid()}&startYear=${year}&endYear=${year}`);
    const d = r.years?.[0] || { monthly: [], totalIncome: 0, totalExpense: 0, netBalance: 0, yearlyInsuranceTotal: 0, totalAssets: 0, bankBalance: 0, fundValue: 0 };
    return { year, monthly: d.monthly || [], totalIncome: d.totalIncome || 0, totalExpense: d.totalExpense || 0, netBalance: d.netBalance || 0, yearlyInsuranceTotal: d.yearlyInsuranceTotal || 0, totalAssets: d.totalAssets || 0, bankBalance: d.bankBalance || 0, fundValue: d.fundValue || 0 };
  },
  fetchAnnualSummaryRange: (s, e) => callApi(`/api/annual-summary?familyId=${_fid()}&startYear=${s}&endYear=${e}`),
  fetchSettlementsYear: (year) => callApi(`/api/settlements-year?familyId=${_fid()}&year=${year}`),
  insuranceSync: (p) => callApi('/api/insurance-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, familyId: _fid(), action: 'upsert' }) }),
  insuranceUnsync: (p) => callApi('/api/insurance-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, familyId: _fid(), action: 'delete' }) }),
  entityCreate: (p) => callApi('/api/entity-create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, familyId: _fid() }) }),

  adminListFamilies: () => callApi('/api/admin-families?action=list'),
  adminAddFamily: (uid, name, email) => callApi('/api/admin-families', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', uid, name, email }) }),
  adminRemoveFamily: (uid) => callApi('/api/admin-families', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', uid }) }),
  adminInitFamily: (uid) => callApi('/api/admin-init-family', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid }) }),
  adminMigrate: (fid) => callApi('/api/admin-migrate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: fid, confirm: 'MIGRATE_ALL' }) }),

  familyAccounts: {
    list: (fid) => callApi(`/api/family-accounts?familyId=${fid}&action=list`),
    create: (fid, d) => callApi('/api/family-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', familyId: fid, ...d }) }),
    restore: (fid, d) => callApi('/api/family-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restore', familyId: fid, ...d }) }),
    update: (fid, uid, d) => callApi('/api/family-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', familyId: fid, uid, ...d }) }),
    remove: (fid, uid) => callApi('/api/family-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', familyId: fid, uid }) }),
  },

  platformSettings: {
    get: () => callApi('/api/platform-settings'),
    update: (d) => callApi('/api/platform-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', data: d }) }),
  },
  platformDefaults: {
    list: (r) => callApi(`/api/platform-defaults?action=list&resource=${r}`),
    put: (r, id, d) => callApi('/api/platform-defaults', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'put', resource: r, id, data: d }) }),
    remove: (r, id) => callApi('/api/platform-defaults', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', resource: r, id }) }),
    set: (r, d) => callApi('/api/platform-defaults', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', resource: r, data: d }) }),
  },
  familySettings: {
    get: () => callApi(`/api/family-settings?familyId=${_fid()}`),
    update: (d) => callApi('/api/family-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), action: 'update', data: d }) }),
    putStatus: (id, d) => callApi('/api/family-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), action: 'put-status', id, data: d }) }),
    removeStatus: (id) => callApi('/api/family-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), action: 'delete-status', id }) }),
  },
  bankAccounts: {
    list: () => callApi(`/api/bank-accounts?familyId=${_fid()}&action=list`),
    create: (d) => callApi('/api/bank-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), action: 'create', data: d }) }),
    update: (id, d) => callApi('/api/bank-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), action: 'update', id, data: d }) }),
    remove: (id) => callApi('/api/bank-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), action: 'remove', id }) }),
  },
  bankTransactions: {
    list: (bankId) => callApi(`/api/bank-transactions?familyId=${_fid()}&bankId=${bankId}&action=list`),
    listAll: () => callApi(`/api/bank-transactions?familyId=${_fid()}&action=listAll`),
    create: (bid, d) => callApi('/api/bank-transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), bankId: bid, action: 'create', data: d }) }),
    update: (bid, tid, d) => callApi('/api/bank-transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), bankId: bid, txnId: tid, action: 'update', data: d }) }),
    remove: (bid, tid) => callApi('/api/bank-transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), bankId: bid, txnId: tid, action: 'remove' }) }),
  },
  personalIncome: {
    list: (mid) => callApi(`/api/personal-income?familyId=${_fid()}&memberId=${mid}&action=list`),
    save: (mid, y, m, a) => callApi('/api/personal-income', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), memberId: mid, year: y, month: m, amount: a, action: 'save' }) }),
    remove: (mid, y, m) => callApi('/api/personal-income', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), memberId: mid, year: y, month: m, action: 'remove' }) }),
  },
  memberAdvances: {
    list: (mid) => callApi(`/api/member-advances?familyId=${_fid()}&memberId=${mid}&action=list`),
    listAll: () => callApi(`/api/member-advances?familyId=${_fid()}&action=listAll`),
    create: (mid, d) => callApi('/api/member-advances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), memberId: mid, action: 'create', data: d }) }),
    update: (mid, aid, d) => callApi('/api/member-advances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), memberId: mid, advanceId: aid, action: 'update', data: d }) }),
    remove: (mid, aid) => callApi('/api/member-advances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), memberId: mid, advanceId: aid, action: 'remove' }) }),
  },
  clearBankBalances: () => callApi('/api/clear-bank-balances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ familyId: _fid(), confirm: 'CONFIRM_DELETE' }) }),
};

/* ============================================
   6. Status Registry（沿用舊版 status-registry.js）
   ============================================ */
export const STATUS = { PENDING: 'pending', DONE: 'done', SKIPPED: 'skipped' };
const _IS_DONE = { pending: false, done: true, skipped: true };
const _LABELS = {
  default: { pending: '未處理', done: '已處理', skipped: '不適用' },
  personal:  { pending: '未付款', done: '已付款', skipped: '不適用' },
  fixed:     { pending: '未付款', done: '已付款', skipped: '不適用' },
  insurance: { pending: '未扣款', done: '已扣款', skipped: '不適用' },
  income:    { pending: '未轉入', done: '已轉入', skipped: '不適用' },
};
const _LEGACY_MAP = {
  '未處理': 'pending', '未還款': 'pending', '未付款': 'pending', '未扣款': 'pending', '未轉入': 'pending',
  '已處理': 'done', '已還款': 'done', '已付款': 'done', '已扣款': 'done', '已轉入': 'done',
  '不適用': 'skipped',
};
const _BADGE = { pending: 'badge-pending', done: 'badge-success', skipped: 'badge-muted' };

export function statusNormalize(raw) {
  if (raw == null || raw === '') return STATUS.PENDING;
  if (raw === 'pending' || raw === 'done' || raw === 'skipped') return raw;
  return _LEGACY_MAP[raw] || STATUS.PENDING;
}
export function statusIsDone(raw) { return !!_IS_DONE[statusNormalize(raw)]; }
export function statusLabel(raw, opts = {}) {
  const c = statusNormalize(raw);
  const src = opts.source;
  if (src && _LABELS[src] && _LABELS[src][c]) return _LABELS[src][c];
  return _LABELS.default[c] || _LABELS.default.pending;
}
export function statusOptions(opts = {}) {
  const codes = ['pending', 'done'];
  if (opts.includeSkipped) codes.push('skipped');
  return codes.map((c) => ({ value: c, label: statusLabel(c, { source: opts.source }) }));
}
export function statusBadgeClass(raw) { return _BADGE[statusNormalize(raw)] || _BADGE.pending; }
export function statusToLegacyName(code, source = 'personal') {
  const c = statusNormalize(code);
  const m = _LABELS[source] || _LABELS.personal;
  return m[c] || m.pending;
}

/* ============================================
   7. Entity Name Registry（沿用舊版 entity-registry.js）
   ============================================ */
const _PATHS = {
  members: 'members', banks: 'banks', bank_accounts: 'bank_accounts',
  categories: 'expense_categories', items: 'expense_items',
  companies: 'insurance_companies', payments: 'payment_methods',
};
const _lists = {};
const _nameMaps = {};
const _unsubs = [];
let _initialized = false;

function _byOrderThenCreated(a, b) {
  const oa = a.order != null ? a.order : Number.MAX_SAFE_INTEGER;
  const ob = b.order != null ? b.order : Number.MAX_SAFE_INTEGER;
  if (oa !== ob) return oa - ob;
  return (a.createdAt || 0) - (b.createdAt || 0);
}
function _byCreatedAt(a, b) { return (a.createdAt || 0) - (b.createdAt || 0); }

export function initEntityRegistry() {
  if (_initialized) return true;
  const fid = AppState.getFamilyId();
  if (!fid) return false;

  Object.entries(_PATHS).forEach(([k, p]) => {
    const sortFn = ['members', 'banks', 'bank_accounts'].includes(k) ? _byOrderThenCreated : _byCreatedAt;
    const unsub = onValue(ref(db, `families/${fid}/${p}`), (snap) => {
      const v = snap.val() || {};
      const list = Object.entries(v).map(([id, x]) => ({ id, ...x }));
      list.sort(sortFn);
      _lists[k] = list;
      const map = {};
      list.forEach((x) => { map[x.id] = x.name || ''; });
      _nameMaps[k] = map;
    }, (err) => { console.warn(`[entityRegistry] ${k} 讀取失敗：`, err); });
    _unsubs.push(unsub);
  });

  _initialized = true;
  return true;
}

export function destroyEntityRegistry() {
  _unsubs.forEach((u) => { try { u(); } catch (e) {} });
  _unsubs.length = 0;
  Object.keys(_lists).forEach((k) => delete _lists[k]);
  Object.keys(_nameMaps).forEach((k) => delete _nameMaps[k]);
  _initialized = false;
}

export function resolveName(type, id, fallback = '') {
  if (!id) return fallback;
  return (_nameMaps[type] || {})[id] || fallback;
}
export function getList(type) { return [...(_lists[type] || [])]; }

/* ============================================
   8. Code Registry（沿用舊版 code-registry.js）
   ============================================ */
export const PREFIX_MAP = {
  member: 'MEM', bank: 'PAY-BANK', bankAccount: 'PAY-BANK',
  category: 'CAT', item: 'ITEM', payment: 'PAY', company: 'COMP',
  policy: 'POL', fund: 'FUND', income: 'INC', bankTxn: 'TXN',
};
export const POLICY_SUBTYPE_MAP = {
  normal: 'NORM', fund_insurance: 'FUND', savings: 'SAVE',
};
export const CATEGORY_SHORTCODES = {
  '學校類': 'SCH', '交通類': 'TRA', '醫療類': 'MED', '銀行類': 'BNK', '其他': 'OTH',
};

export function generateCode(prefix, existingList) {
  if (!prefix) throw new Error('generateCode 缺少 prefix');
  if (!Array.isArray(existingList)) existingList = [];
  const pd = prefix + '-';
  const seqs = [];
  existingList.forEach((item) => {
    const code = item?.code;
    if (!code || typeof code !== 'string' || !code.startsWith(pd)) return;
    const rest = code.slice(pd.length);
    const parts = rest.split('-');
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n) && n > 0) seqs.push(n);
  });
  const max = seqs.length ? Math.max(...seqs) : 0;
  return pd + String(max + 1).padStart(3, '0');
}

export function generateWithSubtype(prefix, subtype, list) {
  if (!subtype) return generateCode(prefix, list);
  return generateCode(`${prefix}-${subtype}`, list);
}

export function getSubtypeFromContext(entityType, extra = {}) {
  switch (entityType) {
    case 'policy': return POLICY_SUBTYPE_MAP[extra.type || 'normal'] || 'NORM';
    case 'category': return CATEGORY_SHORTCODES[(extra.name || '').trim()] || null;
    case 'fund': return extra.type === 'insurance' ? 'INS' : null;
    default: return null;
  }
}

export function checkDuplicateCode(code, list) {
  if (!Array.isArray(list)) return false;
  return list.some((x) => x?.code === code);
}

const _CODE_FETCHERS = {
  member: () => getList('members'),
  bank: () => getList('banks'),
  bankAccount: () => getList('bank_accounts'),
  category: () => getList('categories'),
  item: () => getList('items'),
  payment: () => getList('payments'),
  company: () => getList('companies'),
  policy: async () => await getListOnce('insurance_policies'),
  fund: async () => await getListOnce('funds'),
};

export async function generateCodeFor(entityType, extra = {}) {
  const prefix = PREFIX_MAP[entityType];
  if (!prefix) throw new Error(`未知 entityType：${entityType}`);
  const fetcher = _CODE_FETCHERS[entityType];
  const list = fetcher ? await fetcher() : [];
  const subtype = getSubtypeFromContext(entityType, extra);
  const code = subtype ? generateWithSubtype(prefix, subtype, list) : generateCode(prefix, list);
  if (checkDuplicateCode(code, list)) throw new Error(`編號重複：${code}，請重試`);
  return { code, prefix, subtype };
}

/* ============================================
   9. Column Registry（GAP-17）
   ============================================ */
export const COLUMNS = {
  codeList: [
    { id: 'code', label: '編號', defaultVisible: true, defaultWidth: 180, sortable: true },
    { id: 'entityLabel', label: '類型', defaultVisible: true, defaultWidth: 120, sortable: true, filterable: true },
    { id: 'name', label: '名稱', defaultVisible: true, defaultWidth: 240, sortable: true },
  ],
  settlements: [
    { id: 'source', label: '來源', defaultVisible: true, defaultWidth: 90, sortable: true, filterable: true },
    { id: 'yearMonth', label: '年月', defaultVisible: true, defaultWidth: 90, sortable: true },
    { id: 'member', label: '成員', defaultVisible: true, defaultWidth: 90, sortable: true },
    { id: 'name', label: '項目名稱', defaultVisible: true, defaultWidth: 200, sortable: true },
    { id: 'amount', label: '金額', defaultVisible: true, defaultWidth: 110, type: 'number', sortable: true },
    { id: 'status', label: '狀態', defaultVisible: true, defaultWidth: 140, sortable: true, filterable: true },
  ],
  bankTransactions: [
    { id: 'date', label: '日期', defaultVisible: true, defaultWidth: 110, sortable: true },
    { id: 'bankName', label: '銀行', defaultVisible: true, defaultWidth: 100, sortable: true },
    { id: 'typeLabel', label: '類型', defaultVisible: true, defaultWidth: 90, sortable: true },
    { id: 'catLabel', label: '分類', defaultVisible: true, defaultWidth: 100, sortable: true },
    { id: 'amount', label: '金額', defaultVisible: true, defaultWidth: 120, type: 'number', sortable: true },
    { id: 'note', label: '備註', defaultVisible: true, defaultWidth: 180 },
  ],
  memberReport: [
    { id: 'name', label: '成員', defaultVisible: true, defaultWidth: 140, sortable: true },
    { id: 'income', label: '家用轉入', defaultVisible: true, defaultWidth: 140, type: 'number', sortable: true },
    { id: 'personalIncome', label: '個人收入', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'expense', label: '支出', defaultVisible: true, defaultWidth: 140, type: 'number', sortable: true },
    { id: 'insurance', label: '保險', defaultVisible: true, defaultWidth: 140, type: 'number', sortable: true },
    { id: 'net', label: '淨額', defaultVisible: true, defaultWidth: 140, type: 'number', sortable: true },
  ],
};

export const RESOLVERS = {
  codeList: {
    code: (v) => v ? `<span class="mono" style="font-size:12px; color:var(--neon-cyan);">${v}</span>` : '<span class="mono" style="color:var(--text-muted);">—</span>',
    entityLabel: (v) => `<span class="badge badge-info">${v}</span>`,
  },
  settlements: {
    source: (_, r) => `<span class="badge ${r.source === 'insurance' ? 'badge-success' : 'badge-info'}">${r.sourceLabel || r.source}</span>`,
    member: (v) => v === 'shared' ? '🏠 家庭共用' : (resolveName('members', v) || v || '—'),
    amount: (v) => `HK$ ${Number(v).toLocaleString()}`,
    status: (v, r) => `<span class="badge ${statusBadgeClass(v)}">${statusLabel(v, { source: r.source })}</span>`,
  },
  bankTransactions: {
    typeLabel: (_, r) => `<span class="badge ${r.type === 'in' ? 'badge-success' : r.type === 'transfer' ? 'badge-info' : 'badge-pending'}">${BANK_TXN_TYPE_LABELS[r.type] || r.type}</span>`,
    catLabel: (_, r) => `<span class="badge ${BANK_TXN_CATEGORY_BADGES[r.category] || 'badge-muted'}">${BANK_TXN_CATEGORY_LABELS[r.category] || r.category}</span>`,
    amount: (v, r) => `<span class="mono ${r.type === 'in' ? 'text-emerald' : 'text-red'}">${r.type === 'in' ? '+' : '-'}HK$ ${Number(v).toLocaleString()}</span>`,
  },
  memberReport: {
    income: (v) => v > 0 ? `<span class="text-emerald">HK$ ${Number(v).toLocaleString()}</span>` : '—',
    personalIncome: (v) => v > 0 ? `<span class="text-cyan">HK$ ${Number(v).toLocaleString()}</span>` : '—',
    expense: (v) => v > 0 ? `<span class="text-red">HK$ ${Number(v).toLocaleString()}</span>` : '—',
    insurance: (v) => v > 0 ? `<span class="text-magenta">HK$ ${Number(v).toLocaleString()}</span>` : '—',
    net: (v) => `<span class="${v >= 0 ? 'text-emerald' : 'text-red'}">HK$ ${Number(v).toLocaleString()}</span>`,
  },
};

export function getColumns(key) { return COLUMNS[key] ? [...COLUMNS[key]] : []; }
export function getResolvers(key) { return RESOLVERS[key] ? { ...RESOLVERS[key] } : {}; }

/* ============================================
   10. 基金快照與 Metadata（GAP-14）
   ============================================ */
export function listenFundSnapshots(fundId, cb, err) {
  return listen(`funds/${fundId}/snapshots`, (snap) => cb(snap.val() || {}), err);
}

export async function getFundSnapshotListOnce(fundId) {
  const snap = await get(familyRef(`funds/${fundId}/snapshots`));
  const val = snap.val() || {};
  const list = [];
  Object.entries(val).forEach(([key, v]) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      list.push({ dateKey: key, _rawPath: key, ...v });
    } else if (/^\d{4}$/.test(key) && v && typeof v === 'object') {
      Object.entries(v).forEach(([month, snap2]) => {
        if (snap2 && typeof snap2 === 'object' && snap2.shares === undefined) {
          Object.entries(snap2).forEach(([day, snap3]) => {
            if (snap3 && typeof snap3 === 'object') {
              list.push({ dateKey: `${key}-${month}-${String(day).padStart(2, '0')}`, _rawPath: `${key}/${month}/${day}`, ...snap3 });
            }
          });
        } else if (snap2 && typeof snap2 === 'object') {
          list.push({ dateKey: `${key}-${month}-01`, _rawPath: `${key}/${month}`, ...snap2 });
        }
      });
    }
  });
  list.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return list;
}

export async function saveFundSnapshot(fundId, dateKey, data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error('dateKey 必須是 YYYY-MM-DD 格式');
  const path = `funds/${fundId}/snapshots/${dateKey}`;
  const existing = await get(familyRef(path));
  const ex = existing.val() || {};
  await set(familyRef(path), {
    shares: Number(data.shares) || 0,
    nav: Number(data.nav) || 0,
    value: Math.round((Number(data.shares) || 0) * (Number(data.nav) || 0)),
    createdAt: ex.createdAt || Date.now(),
    updatedAt: Date.now(),
  });
}

export async function removeFundSnapshot(fundId, dateKey, rawPath) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error('dateKey 必須是 YYYY-MM-DD 格式');
  const path = rawPath || dateKey;
  await remove(familyRef(`funds/${fundId}/snapshots/${path}`));
  return true;
}

export function listenPageMetadata(cb) {
  return listen('settings/page_metadata', (snap) => cb(snap.val() || {}));
}
export async function savePageMetadata(data) {
  await setSubpath('settings/page_metadata', data || {});
}

/* ═══ EOF ═══
F: js/app-data.js
V: 1792720000
W: webapp-20261023-001#4
═══ */