// ============================================
// merge.js — 結算資料合併邏輯（v103.0.23）
// 位置：js/lib/merge.js
// ============================================
// v103.0.23（B31-1）：
//   ✅ 加 AppState.on('family-change') 重置狀態名稱快取
//      - 避免切換家庭後使用舊家庭的狀態名稱
// v103.0.22（B25-4）：
//   ✅ H8：fallback 改走 status-registry.toLegacyName
// ============================================

import { getStatusesByCategory } from '../config/app-config.js';
import { RESERVED_IDS } from '../config/constants.js';
import { toLegacyName } from '../config/status-registry.js';
import { AppState } from '../core/state.js';

let _insuranceStatusNames = null;

/* 🆕 v103.0.23：切換家庭時重置快取 */
try {
  AppState.on('family-change', () => {
    _insuranceStatusNames = null;
  });
} catch (e) { /* noop */ }

function _getInsuranceStatusNames() {
  if (_insuranceStatusNames) return _insuranceStatusNames;
  try {
    const list = getStatusesByCategory('insurance');
    _insuranceStatusNames = new Set(list.map((s) => s.name));
  } catch (e) {
    _insuranceStatusNames = new Set(['未扣款', '已扣款']);
  }
  return _insuranceStatusNames;
}

export function resetInsuranceStatusCache() {
  _insuranceStatusNames = null;
}

export function mergeSettlementData({
  memberExpenses = [],
  insuranceRows = [],
  year,
  month,
}) {
  const rows = [];

  memberExpenses
    .filter((e) => !e.isAutoLinked)
    .forEach((e) => {
      rows.push(_buildPersonalRow(e, year, month));
    });

  const linkedMap = {};
  memberExpenses
    .filter((e) => e.isAutoLinked)
    .forEach((e) => {
      const policyId = e.policyId || _extractPolicyId(e.id);
      if (!policyId) return;
      linkedMap[policyId] = e;
    });

  const allPolicyIds = new Set([
    ...Object.keys(linkedMap),
    ...insuranceRows.map((p) => p.policyId),
  ]);

  allPolicyIds.forEach((policyId) => {
    const linked = linkedMap[policyId];
    const insuranceRow = insuranceRows.find((p) => p.policyId === policyId);

    if (linked) {
      rows.push(_buildLinkedInsuranceRow(linked, insuranceRow, year, month, policyId));
    } else if (insuranceRow) {
      rows.push(_buildInsuranceRow(insuranceRow, year, month));
    }
  });

  return rows;
}

function _buildPersonalRow(e, year, month) {
  const isShared = e.memberId === RESERVED_IDS.SHARED_MEMBER;

  return {
    key: `personal-${year}-${month}-${e.memberId}-${e.id}`,
    source: 'personal',
    sourceLabel: isShared ? '🏠 家庭' : '🏷 個人',
    year,
    month,
    memberId: e.memberId || '',
    name: e.name || '（未命名）',
    amount: Number(e.amount) || 0,
    status: e.status || '未處理',
    isDone: _isDoneStatus(e.status, 'personal'),
    date: e.date || '',
    categoryId: e.categoryId || '',
    itemId: e.itemId || '',
    paymentMethodId: e.paymentMethodId || '',
    bankId: e.bankId || '',
    txnId: e.txnId || '',
    isAutoLinked: false,
    _ref: {
      memberId: e.memberId,
      expenseId: e.id,
    },
  };
}

function _buildLinkedInsuranceRow(linked, insuranceRow, year, month, policyId) {
  const effectiveMemberId = insuranceRow?.policyHolderId
    || insuranceRow?.memberId
    || linked.memberId
    || '';

  const status = _resolveInsuranceStatus(insuranceRow?.status, linked.status);

  return {
    key: `insurance-${year}-${month}-${policyId}`,
    source: 'insurance',
    sourceLabel: '🛡 保險',
    year,
    month,
    memberId: effectiveMemberId,
    name: insuranceRow?.policyName || linked.name || '（未命名保單）',
    amount: Number(linked.amount) || 0,
    status,
    isDone: _isDoneStatus(status, 'insurance'),
    date: linked.date || insuranceRow?.date || '',
    categoryId: linked.categoryId || '',
    bankId: linked.bankId || insuranceRow?.bankId || '',
    txnId: linked.txnId || insuranceRow?.txnId || '',
    paymentMode: insuranceRow?.paymentMode || 'direct',
    advanceHolderId: insuranceRow?.advanceHolderId || '',
    isAutoLinked: true,
    _ref: {
      policyId,
      memberId: effectiveMemberId,
      linkedId: linked.id,
    },
  };
}

function _buildInsuranceRow(p, year, month) {
  const effectiveMemberId = p.policyHolderId || p.memberId || '';
  const displayName = p.policyName || '（未命名保單）';

  const status = _resolveInsuranceStatus(p.status);

  return {
    key: `insurance-${year}-${month}-${p.policyId}`,
    source: 'insurance',
    sourceLabel: '🛡 保險',
    year,
    month,
    memberId: effectiveMemberId,
    name: displayName,
    amount: Number(p.amount) || 0,
    status,
    isDone: _isDoneStatus(status, 'insurance'),
    date: p.date || '',
    categoryId: '',
    bankId: p.bankId || '',
    txnId: p.txnId || '',
    paymentMode: p.paymentMode || 'direct',
    advanceHolderId: p.advanceHolderId || '',
    isAutoLinked: false,
    _ref: {
      policyId: p.policyId,
      memberId: effectiveMemberId,
    },
  };
}

/**
 * v103.0.22：fallback 走 status-registry.toLegacyName（SSOT）
 */
function _resolveInsuranceStatus(...candidates) {
  const validNames = _getInsuranceStatusNames();
  for (const c of candidates) {
    if (!c) continue;
    if (validNames.has(c)) return c;
  }
  return toLegacyName('pending', 'insurance');
}

function _extractPolicyId(id) {
  if (!id || typeof id !== 'string') return '';
  if (id.startsWith('linked_')) return id.slice(7);
  return '';
}

function _isDoneStatus(statusName, category) {
  if (!statusName) return false;

  try {
    const statuses = getStatusesByCategory(category);
    const found = statuses.find((s) => s.name === statusName);
    if (found) return !!found.isDone;
  } catch (e) {
    // fallback
  }

  return statusName.startsWith('已');
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/lib/merge.js
   Version: v103.0.23
   Batch: B31-1
   ═══════════════════════════════════════════ */
