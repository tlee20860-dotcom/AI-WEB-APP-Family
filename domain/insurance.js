// ============================================
// insurance.js — 保險計算核心（V2 重構版）
// 位置：domain/insurance.js
// 說明：保單期間、成本、進度等純計算邏輯。
//       不涉及 UI 渲染與資料庫讀寫，方便單獨測試。
// ============================================

import { isDone as isDoneStatus } from '../config/status.js';

/* ============================================
   1. 基礎屬性與期間計算
   ============================================ */

/**
 * 取得保單實質持有人（優先 policyHolderId，其次 memberId）
 */
export function getPolicyHolderId(policy) {
  if (!policy) return '';
  return policy.policyHolderId || policy.memberId || '';
}

/**
 * 取得特定「保單年度」的起訖年月
 * @param {object} policy 
 * @param {number} periodIndex - 第幾期（從 1 開始）
 */
export function getPeriodRange(policy, periodIndex) {
  const firstY = Number(policy.firstStartYear) || 0;
  const firstM = Number(policy.firstStartMonth) || 1;

  const startDate = new Date(firstY, firstM - 1, 1);
  startDate.setMonth(startDate.getMonth() + (periodIndex - 1) * 12);

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 11);

  return {
    startY: startDate.getFullYear(),
    startM: String(startDate.getMonth() + 1).padStart(2, '0'),
    endY: endDate.getFullYear(),
    endM: String(endDate.getMonth() + 1).padStart(2, '0'),
    rangeText: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')} ~ ${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`,
  };
}

/**
 * 取得指定年月落在哪一個保單年度
 * @param {object} policy 
 * @param {string|number} year 
 * @param {string|number} month 
 */
export function getPeriodInfo(policy, year, month) {
  const firstY = Number(policy.firstStartYear) || 0;
  const firstM = Number(policy.firstStartMonth) || 1;

  if (!firstY || firstY < 2000 || firstY > 2100) return null;
  if (!firstM || firstM < 1 || firstM > 12) return null;

  const startDate = new Date(firstY, firstM - 1, 1);
  const currentDate = new Date(Number(year), Number(month) - 1, 1);

  const diffMonths =
    (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
    (currentDate.getMonth() - startDate.getMonth());

  if (diffMonths < 0) return null;

  const periodIndex = Math.floor(diffMonths / 12) + 1;
  const totalYears = Number(policy.totalPolicyYears) || 0;
  
  if (totalYears > 0 && periodIndex > totalYears) return null;

  return { periodIndex, ...getPeriodRange(policy, periodIndex) };
}

/* ============================================
   2. 金額計算
   ============================================ */

/**
 * 取得指定年度的年繳保費
 */
export function getPolicyAnnualPremium(policy, targetYear) {
  if (!policy) return 0;

  const year = Number(targetYear);
  const firstY = Number(policy.firstStartYear) || 0;

  if (!firstY || year < firstY) return 0;

  const periodIndex = year - firstY + 1;
  const totalYears = Number(policy.totalPolicyYears) || 0;

  if (totalYears > 0 && periodIndex > totalYears) return 0;

  if (policy.type === 'fund_insurance') {
    const mp = Number(policy.monthlyPremium) || 0;
    return Math.round(mp * 12);
  }

  const periods = policy.periods || {};
  const p = periods[String(periodIndex)];

  if (p && p.annualPremium) {
    return Math.round(Number(p.annualPremium));
  }

  // Fallback: 找最接近的設定，或回退到保單主檔的年繳金額
  const periodKeys = Object.keys(periods)
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0)
    .sort((a, b) => a - b);

  if (periodKeys.length > 0) {
    const below = periodKeys.filter((k) => k <= periodIndex);
    const target = below.length > 0 ? below[below.length - 1] : periodKeys[0];
    const tp = periods[String(target)];
    if (tp && tp.annualPremium) return Math.round(Number(tp.annualPremium));
  }

  return Math.round(Number(policy.annualPremium) || 0);
}

/**
 * 解析每月應繳金額（考量實際紀錄優先，其次推算）
 */
export function resolveMonthlyAmount(policy, year, month, paymentData) {
  if (!policy) return 0;

  if (paymentData && paymentData.amount && Number(paymentData.amount) > 0) {
    return Math.round(Number(paymentData.amount));
  }

  if (policy.type === 'fund_insurance') {
    return Math.round(Number(policy.monthlyPremium) || 0);
  }

  const info = getPeriodInfo(policy, year, month);
  if (info) {
    const periodData = (policy.periods || {})[String(info.periodIndex)];
    if (periodData && periodData.monthlyAverage) {
      return Math.round(Number(periodData.monthlyAverage));
    }
  }

  return Math.round(Number(policy.monthlyAverage) || 0);
}

/**
 * 取得保單總供款額（合約上的總額）
 */
export function getPolicyTotalPremium(policy) {
  if (!policy) return 0;

  if (policy.type === 'fund_insurance') {
    const monthly = Number(policy.monthlyPremium) || 0;
    const years = Number(policy.totalPolicyYears) || 0;
    return Math.round(monthly * 12 * years);
  }

  const totalYears = Number(policy.totalPolicyYears) || 0;
  if (totalYears === 0) return Math.round(Number(policy.annualPremium) || 0);

  const periods = policy.periods || {};
  const periodKeys = Object.keys(periods).map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);

  let fallback = Math.round(Number(policy.annualPremium) || 0);
  if (!fallback && periodKeys.length > 0) {
    const last = periods[String(periodKeys[periodKeys.length - 1])];
    if (last && last.annualPremium) fallback = Math.round(Number(last.annualPremium));
  }

  let total = 0;
  for (let i = 1; i <= totalYears; i++) {
    const p = periods[String(i)];
    total += (p && p.annualPremium) ? Math.round(Number(p.annualPremium)) : fallback;
  }

  return total;
}

/* ============================================
   3. 狀態與進度
   ============================================ */

/**
 * 計算已繳總額（依 payments 紀錄）
 */
export function getPolicyPaidTotal(payments) {
  let total = 0;
  Object.values(payments || {}).forEach((yearData) => {
    Object.values(yearData || {}).forEach((mData) => {
      if (mData && isDoneStatus(mData.status)) {
        total += Math.round(Number(mData.amount) || 0);
      }
    });
  });
  return total;
}

/**
 * 計算已供款期數（月）
 */
export function countCompletedPeriods(payments) {
  let count = 0;
  Object.values(payments || {}).forEach((yearData) => {
    Object.values(yearData || {}).forEach((mData) => {
      if (mData && isDoneStatus(mData.status)) count++;
    });
  });
  return count;
}

/**
 * 判斷保單是否已供滿
 */
export function isPolicyCompleted(policy) {
  if (!policy) return false;
  if (policy.isCompleted) return true;
  if (policy.type === 'fund_insurance') return false; // 基金保險通常無固定供滿期

  const total = Number(policy.totalPolicyPeriods) || 0;
  if (total <= 0) return false;

  const done = Number(policy.completedPeriods) || 0;
  return done >= total;
}

/**
 * 計算供款進度百分比
 */
export function calcProgress(policy) {
  const total = Number(policy.totalPolicyPeriods) || 0;
  const done = Number(policy.completedPeriods) || 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

/* ============================================
   4. 綜合封裝 (Enriched Policies)
   ============================================ */

/**
 * 將保單與其繳費紀錄合併，回傳包含計算結果的物件陣列
 */
export function computeEnrichedPolicies(policies, paymentsCache, targetYear) {
  const year = Number(targetYear) || new Date().getFullYear();

  return (policies || []).map((p) => {
    const payments = paymentsCache[p.id] || {};
    const completedPeriods = p.type === 'fund_insurance' ? 0 : countCompletedPeriods(payments);

    const currentAnnualPremium = getPolicyAnnualPremium(p, year);
    const totalPremium = getPolicyTotalPremium(p);
    const paidTotal = getPolicyPaidTotal(payments);

    const enriched = {
      ...p,
      completedPeriods,
      _payments: payments,
      _currentAnnualPremium: currentAnnualPremium,
      _totalPremium: totalPremium,
      _paidTotal: paidTotal,
      _targetYear: year,
    };

    enriched._isCompleted = isPolicyCompleted(enriched);
    return enriched;
  });
}

/* ============================================
   5. 基金成本估算（供 Portfolio 使用）
   ============================================ */

/**
 * 依保單起始年月推算基金成本
 */
export function calcFundCostEstimate(policy, year, month) {
  if (!policy || policy.type !== 'fund_insurance') return 0;

  const monthly = Number(policy.monthlyPremium) || 0;
  if (monthly <= 0) return 0;

  const fy = Number(policy.firstStartYear) || 0;
  const fm = Number(policy.firstStartMonth) || 1;
  if (!fy) return 0;

  const startDate = new Date(fy, fm - 1, 1);
  const curDate = new Date(Number(year), Number(month) - 1, 1);

  const diffMonths =
    (curDate.getFullYear() - startDate.getFullYear()) * 12 +
    (curDate.getMonth() - startDate.getMonth());

  if (diffMonths < 0) return 0;

  const paidMonths = diffMonths + 1;
  return Math.round(monthly * paidMonths);
}

/* ═══ EOF ═══
F: domain/insurance.js
V: 1792900250
W: ai-system-20261024-012#20
═══ EOF ═══ */