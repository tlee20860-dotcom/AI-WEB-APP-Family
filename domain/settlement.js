// ============================================
// settlement.js — 結算資料合併（V2 重構版）
// 位置：domain/settlement.js
// 說明：將「個人/家庭支出」與「保險自動扣款」合併為單一結算清單。
//       確保兩邊的資料格式一致，供結算頁面渲染。
// ============================================

import { RESERVED_IDS } from '../config/constants.js';
import { isDone as isDoneStatus, normalize as normalizeStatus } from '../config/status.js';

/* ============================================
   主入口：合併資料
   ============================================ */
export function mergeSettlementData({
  memberExpenses = [],
  insuranceRows = [],
  year,
  month,
}) {
  const rows = [];

  // 1. 處理一般支出（排除自動連結的保險支出）
  memberExpenses
    .filter((e) => !e.isAutoLinked)
    .forEach((e) => {
      rows.push(_buildPersonalRow(e, year, month));
    });

  // 2. 處理保險（包含手動建立的紀錄與連動的支出）
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
      // 有連動支出，優先使用支出紀錄的狀態
      rows.push(_buildLinkedInsuranceRow(linked, insuranceRow, year, month, policyId));
    } else if (insuranceRow) {
      // 只有保險扣款紀錄
      rows.push(_buildInsuranceRow(insuranceRow, year, month));
    }
  });

  return rows;
}

/* ============================================
   1. 一般支出
   ============================================ */
function _buildPersonalRow(e, year, month) {
  const isShared = e.memberId === RESERVED_IDS.SHARED_MEMBER;
  const statusCode = normalizeStatus(e.status);

  return {
    key: `personal-${year}-${month}-${e.memberId}-${e.id}`,
    source: 'personal',
    sourceLabel: isShared ? '🏠 家庭' : '🏷 個人',
    year,
    month,
    memberId: e.memberId || '',
    name: e.name || '（未命名）',
    amount: Number(e.amount) || 0,
    status: statusCode,
    isDone: isDoneStatus(statusCode),
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

/* ============================================
   2. 保險（有連動支出）
   ============================================ */
function _buildLinkedInsuranceRow(linked, insuranceRow, year, month, policyId) {
  const effectiveMemberId = insuranceRow?.policyHolderId
    || insuranceRow?.memberId
    || linked.memberId
    || '';

  // 優先使用保險扣款紀錄的狀態，若無則用連動支出的狀態
  const rawStatus = insuranceRow?.status || linked.status;
  const statusCode = normalizeStatus(rawStatus);

  return {
    key: `insurance-${year}-${month}-${policyId}`,
    source: 'insurance',
    sourceLabel: '🛡 保險',
    year,
    month,
    memberId: effectiveMemberId,
    name: insuranceRow?.policyName || linked.name || '（未命名保單）',
    amount: Number(linked.amount) || 0,
    status: statusCode,
    isDone: isDoneStatus(statusCode),
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

/* ============================================
   3. 保險（僅有扣款紀錄，尚未產生連動支出）
   ============================================ */
function _buildInsuranceRow(p, year, month) {
  const effectiveMemberId = p.policyHolderId || p.memberId || '';
  const statusCode = normalizeStatus(p.status);

  return {
    key: `insurance-${year}-${month}-${p.policyId}`,
    source: 'insurance',
    sourceLabel: '🛡 保險',
    year,
    month,
    memberId: effectiveMemberId,
    name: p.policyName || '（未命名保單）',
    amount: Number(p.amount) || 0,
    status: statusCode,
    isDone: isDoneStatus(statusCode),
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

/* ============================================
   輔助工具
   ============================================ */
function _extractPolicyId(id) {
  if (!id || typeof id !== 'string') return '';
  if (id.startsWith('linked_')) return id.slice(7);
  return '';
}

/* ═══ EOF ═══
F: domain/settlement.js
V: 1792900290
W: ai-system-20261024-012#24
═══ EOF ═══ */