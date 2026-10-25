// ============================================
// read.js — 資料讀取與監聽（V2 重構版）
// 位置：db/read.js
// 說明：集中處理 Firebase 的 onValue 監聽與 get 單次讀取。
//       大幅精簡了舊版 db.js 的樣板代碼。
// ============================================

import { db } from '../config/firebase.js';
import { AppState } from '../config/state.js';
import { ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================
   1. 通用工具
   ============================================ */
const _byCreatedAt = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);
const _byOrder = (a, b) => (a.order || 0) - (b.order || 0);
const _byOrderThenCreated = (a, b) => {
  const oa = a.order != null ? a.order : Number.MAX_SAFE_INTEGER;
  const ob = b.order != null ? b.order : Number.MAX_SAFE_INTEGER;
  return oa !== ob ? oa - ob : (a.createdAt || 0) - (b.createdAt || 0);
};

export function getFamilyPath(subpath) {
  const familyId = AppState.getFamilyId();
  if (!familyId) throw new Error('尚未選擇家庭');
  return `families/${familyId}/${subpath}`;
}

/**
 * 監聽單一物件
 */
export function listen(subpath, callback, onError) {
  const familyId = AppState.getFamilyId();
  if (!familyId) { if (onError) onError(new Error('尚未選擇家庭')); return () => {}; }
  return onValue(ref(db, `families/${familyId}/${subpath}`), callback, (err) => {
    console.error(`[db/read] 讀取失敗 [${subpath}]：`, err);
    if (onError) onError(err);
  });
}

/**
 * 監聽列表（自動轉為 Array 並排序）
 */
export function listenList(subpath, sortFn, callback, onError) {
  return listen(subpath, (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val).map(([id, x]) => ({ id, ...x }));
    list.sort(sortFn);
    callback(list);
  }, onError);
}

/**
 * 單次讀取單一物件
 */
export async function getOnce(subpath) {
  const snap = await get(ref(db, getFamilyPath(subpath)));
  return snap.val() || null;
}

/**
 * 單次讀取列表
 */
export async function getListOnce(subpath, sortFn = _byCreatedAt) {
  const val = await getOnce(subpath) || {};
  const list = Object.entries(val).map(([id, x]) => ({ id, ...x }));
  list.sort(sortFn);
  return list;
}

/* ============================================
   2. 基礎實體讀取 (Members, Banks, Categories...)
   ============================================ */
export const listenMembers = (cb, err) => listenList('members', _byOrderThenCreated, cb, err);
export const getMembersOnce = () => getListOnce('members', _byOrderThenCreated);

export const listenBanks = (cb, err) => listenList('banks', _byOrderThenCreated, cb, err);
export const getBanksOnce = () => getListOnce('banks', _byOrderThenCreated);

export const listenBankAccounts = (cb, err) => listenList('bank_accounts', _byOrderThenCreated, cb, err);
export const getBankAccountsOnce = () => getListOnce('bank_accounts', _byOrderThenCreated);

export const listenCategories = (cb, err) => listenList('expense_categories', _byOrder, cb, err);
export const getCategoriesOnce = () => getListOnce('expense_categories', _byOrder);

export const listenItems = (cb, err) => listenList('expense_items', _byCreatedAt, cb, err);
export const getItemsOnce = () => getListOnce('expense_items', _byCreatedAt);

export const listenPaymentMethods = (cb, err) => listenList('payment_methods', _byOrder, cb, err);
export const getPaymentMethodsOnce = () => getListOnce('payment_methods', _byOrder);

export const listenInsuranceCompanies = (cb, err) => listenList('insurance_companies', _byCreatedAt, cb, err);
export const getInsuranceCompaniesOnce = () => getListOnce('insurance_companies', _byCreatedAt);

export const listenStatuses = (cb, err) => listenList('statuses', _byOrder, cb, err);
export const getStatusesOnce = () => getListOnce('statuses', _byOrder);

/* ============================================
   3. 核心業務資料讀取 (Policies, Funds, Expenses...)
   ============================================ */
export const listenInsurancePolicies = (cb, err) => listenList('insurance_policies', _byCreatedAt, cb, err);
export const getInsurancePoliciesOnce = () => getListOnce('insurance_policies', _byCreatedAt);

export const listenFunds = (cb, err) => listenList('funds', _byCreatedAt, cb, err);
export const getFundsOnce = () => getListOnce('funds', _byCreatedAt);

export const listenIncome = (y, m, cb, err) => listen(`income/${y}/${m}`, (s) => cb(s.val() || {}), err);
export const getIncomeOnce = async (y, m) => await getOnce(`income/${y}/${m}`) || {};

export const listenPersonalIncome = (mid, cb, err) => listen(`personal_income/${mid}`, (s) => cb(s.val() || {}), err);
export const getPersonalIncomeOnce = async (mid) => await getOnce(`personal_income/${mid}`) || {};

export const getInsurancePaymentsOnce = async (pid) => await getOnce(`insurance_payments/${pid}`) || {};

/* ============================================
   4. 全域展開讀取 (All Expenses, All Transactions)
   ============================================ */
export function listenAllExpenses(cb, err) {
  return listen('expenses', (snap) => {
    const flat = [];
    Object.entries(snap.val() || {}).forEach(([y, ms]) => {
      Object.entries(ms || {}).forEach(([m, md]) => {
        Object.entries(md.member_expenses || {}).forEach(([mid, items]) => {
          Object.entries(items || {}).forEach(([id, exp]) => flat.push({ id, memberId: mid, year: y, month: m, ...exp }));
        });
      });
    });
    cb(flat);
  }, err);
}

export function listenAllBankTransactions(cb, err) {
  return listen('bank_accounts', (snap) => {
    const flat = [];
    Object.entries(snap.val() || {}).forEach(([bid, bd]) => {
      Object.entries(bd.transactions || {}).forEach(([tid, txn]) => {
        flat.push({ id: tid, bankId: bid, bankName: bd.name || '', ...txn });
      });
    });
    flat.sort(_byCreatedAt);
    cb(flat);
  }, err);
}

export function listenAllMemberAdvances(cb, err) {
  return listen('member_advances', (snap) => {
    const flat = [];
    Object.entries(snap.val() || {}).forEach(([mid, ad]) => {
      Object.entries(ad || {}).forEach(([aid, adv]) => flat.push({ id: aid, memberId: mid, ...adv }));
    });
    flat.sort(_byCreatedAt);
    cb(flat);
  }, err);
}

/* ============================================
   5. 基金快照（相容新舊格式）
   ============================================ */
export async function getFundSnapshotListOnce(fundId) {
  const val = await getOnce(`funds/${fundId}/snapshots`) || {};
  const list = [];
  Object.entries(val).forEach(([key, v]) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      // 新格式：YYYY-MM-DD
      list.push({ dateKey: key, _rawPath: key, ...v });
    } else if (/^\d{4}$/.test(key) && v && typeof v === 'object') {
      // 舊格式：{year: {month: {...}}}
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

/* ═══ EOF ═══
F: db/read.js
V: 1792900220
W: ai-system-20261024-012#17
═══ EOF ═══ */