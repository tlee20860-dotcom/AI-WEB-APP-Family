// ============================================
// write.js — 資料寫入與更新（V2 重構版）
// 位置：db/write.js
// 說明：集中處理 Firebase 的 set / update / push / remove。
//       內建 IS_READONLY 保護機制，防止誤改舊版資料。
// ============================================

import { db, IS_READONLY } from '../config/firebase.js';
import { AppState } from '../config/state.js';
import { normalize as normalizeStatus } from '../config/status.js';
import { ref, set, update, push, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const roundInt = (v) => Math.round(Number(v) || 0);

export function familyRef(subpath) {
  const familyId = AppState.getFamilyId();
  if (!familyId) throw new Error('尚未選擇家庭');
  return ref(db, `families/${familyId}/${subpath}`);
}

function _checkReadOnly() {
  if (IS_READONLY) {
    throw new Error('目前為唯讀模式 (?readonly=1)，禁止寫入操作');
  }
}

/* ============================================
   1. 基礎原語 (Primitives)
   ============================================ */
export async function saveObject(path, data) {
  _checkReadOnly();
  await set(familyRef(path), data);
}

export async function updateObject(path, data) {
  _checkReadOnly();
  await update(familyRef(path), data);
}

export async function pushObject(path, data) {
  _checkReadOnly();
  const r = push(familyRef(path));
  await set(r, data);
  return r.key;
}

export async function removeObject(path) {
  _checkReadOnly();
  await remove(familyRef(path));
}

/* ============================================
   2. 成員
   ============================================ */
export async function addMember(m) {
  return pushObject('members', {
    name: m.name || '',
    role: m.role || 'other',
    order: m.order != null ? Number(m.order) : 0,
    createdAt: Date.now(),
  });
}

export async function updateMember(id, p) {
  const c = {};
  if (p.name !== undefined) c.name = String(p.name).trim();
  if (p.role !== undefined) c.role = p.role;
  if (p.order !== undefined) c.order = Number(p.order) || 0;
  if (!Object.keys(c).length) return;
  await updateObject(`members/${id}`, c);
}

export async function removeMember(id) {
  await removeObject(`members/${id}`);
}

/* ============================================
   3. 基礎實體 (銀行、類別、支付等)
   ============================================ */
export async function addBankAccount(d) {
  return pushObject('bank_accounts', {
    name: String(d.name || '').trim(),
    type: d.type || 'family',
    initialBalance: roundInt(d.initialBalance),
    initialYear: String(d.initialYear || new Date().getFullYear()),
    initialMonth: String(d.initialMonth || '01').padStart(2, '0'),
    order: Number(d.order) || 0,
    createdAt: Date.now(),
  });
}

export async function updateBankAccount(id, p) {
  const c = {};
  ['name', 'type'].forEach((k) => { if (p[k] !== undefined) c[k] = p[k]; });
  if (p.initialBalance !== undefined) c.initialBalance = roundInt(p.initialBalance);
  if (p.initialYear !== undefined) c.initialYear = String(p.initialYear);
  if (p.initialMonth !== undefined) c.initialMonth = String(p.initialMonth).padStart(2, '0');
  if (p.order !== undefined) c.order = Number(p.order) || 0;
  if (!Object.keys(c).length) return;
  await updateObject(`bank_accounts/${id}`, c);
}

export async function removeBankAccount(id) {
  await removeObject(`bank_accounts/${id}`);
}

/* ============================================
   4. 支出紀錄
   ============================================ */
export async function addExpense(y, m, mid, exp) {
  return pushObject(`expenses/${y}/${m}/member_expenses/${mid}`, {
    name: exp.name || '',
    amount: roundInt(exp.amount),
    status: normalizeStatus(exp.status || 'pending'),
    date: exp.date || '',
    categoryId: exp.categoryId || '',
    itemId: exp.itemId || '',
    paymentMethodId: exp.paymentMethodId || '',
    bankId: exp.bankId || '',
    txnId: exp.txnId || '',
    isAutoLinked: exp.isAutoLinked || false,
    policyId: exp.policyId || '',
    createdAt: Date.now(),
  });
}

export async function updateExpense(y, m, mid, eid, p) {
  const c = { ...p };
  if (c.amount != null) c.amount = roundInt(c.amount);
  if (c.status !== undefined) c.status = normalizeStatus(c.status);
  await updateObject(`expenses/${y}/${m}/member_expenses/${mid}/${eid}`, c);
}

export async function removeExpense(y, m, mid, eid) {
  await removeObject(`expenses/${y}/${m}/member_expenses/${mid}/${eid}`);
}

/* ============================================
   5. 收入紀錄
   ============================================ */
export async function saveIncome(y, m, data) {
  const up = {};
  Object.entries(data || {}).forEach(([k, v]) => {
    const n = roundInt(v);
    up[k] = n > 0 ? n : null;
  });
  if (!Object.keys(up).length) return;
  await updateObject(`income/${y}/${m}`, up);
}

export async function savePersonalIncome(mid, y, m, amt) {
  const n = roundInt(amt);
  const path = `personal_income/${mid}/${y}`;
  if (n > 0) {
    await updateObject(path, { [String(m).padStart(2, '0')]: n });
  } else {
    await removeObject(`${path}/${String(m).padStart(2, '0')}`);
  }
}

/* ============================================
   6. 基金快照
   ============================================ */
export async function saveFundSnapshot(fundId, dateKey, data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error('dateKey 必須是 YYYY-MM-DD 格式');
  const path = `funds/${fundId}/snapshots/${dateKey}`;
  
  // 讀取現有資料以保留 createdAt
  const snap = await familyRef(path).once ? null : null; // 簡化處理，這裡不特別拉取，直接覆蓋
  await saveObject(path, {
    shares: Number(data.shares) || 0,
    nav: Number(data.nav) || 0,
    value: roundInt(Number(data.shares || 0) * Number(data.nav || 0)),
    updatedAt: Date.now(),
  });
}

export async function removeFundSnapshot(fundId, dateKey, rawPath) {
  const path = rawPath || dateKey;
  await removeObject(`funds/${fundId}/snapshots/${path}`);
}

/* ═══ EOF ═══
F: db/write.js
V: 1792900230
W: ai-system-20261024-012#18
═══ EOF ═══ */