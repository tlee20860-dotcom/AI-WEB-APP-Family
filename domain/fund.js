// ============================================
// fund.js — 基金業務輔助（V2 重構版）
// 位置：domain/fund.js
// 說明：基金成本估算、盈虧計算與關聯保單反查。
//       將舊版散落在 Portfolio 頁面的業務邏輯抽離至此。
// ============================================

import { calcFundCostEstimate } from './insurance.js';

/**
 * 反查基金關聯的保單
 * 優先使用 fund.policyId，若無則比對保單的 fundsAllocation
 */
export function findPolicyByFund(fund, policies) {
  if (fund.policyId) {
    const p = (policies || []).find((x) => x.id === fund.policyId);
    if (p) return p;
  }
  return (policies || []).find((p) =>
    (p.fundsAllocation || []).some((a) => a.fundId === fund.id)
  ) || null;
}

/**
 * 為單一保單計算其關聯基金的「預估投入成本」
 * 回傳格式：{ [fundId]: cost }
 */
export function getCostMapForPolicy(policy, allFunds, targetYear, targetMonth) {
  const costMap = {};
  if (!policy) return costMap;

  // 找出屬於這張保單的所有保險基金
  const policyFunds = (allFunds || []).filter(
    (f) => f.type === 'insurance' && findPolicyByFund(f, [policy]) !== null
  );
  if (policyFunds.length === 0) return costMap;

  // 計算此保單的總累積成本
  const totalPolicyCost = calcFundCostEstimate(policy, targetYear, targetMonth);
  
  // 區分手動輸入成本與動態分配成本的基金
  const manualFunds = policyFunds.filter((f) => Number(f.cost) > 0);
  const manualTotal = manualFunds.reduce((s, f) => s + Number(f.cost), 0);
  manualFunds.forEach((f) => { costMap[f.id] = Number(f.cost); });

  const remainingCost = Math.max(0, totalPolicyCost - manualTotal);
  const dynamicFunds = policyFunds.filter((f) => Number(f.cost) <= 0);
  
  const dynamicTotalPct = dynamicFunds.reduce((s, f) => {
    const alloc = (policy.fundsAllocation || []).find((a) => a.fundId === f.id);
    return s + (alloc ? Number(alloc.pct) : 0);
  }, 0);

  // 依比例分配剩餘成本給動態基金
  dynamicFunds.forEach((f) => {
    const alloc = (policy.fundsAllocation || []).find((a) => a.fundId === f.id);
    const pct = alloc ? Number(alloc.pct) : 0;
    costMap[f.id] = dynamicTotalPct > 0 ? Math.round(remainingCost * (pct / dynamicTotalPct)) : 0;
  });

  return costMap;
}

/**
 * 計算單一基金的盈虧狀況
 * @param {object} fund 
 * @param {number} estimatedCost 
 */
export function calcFundPnl(fund, estimatedCost) {
  const cost = Number(estimatedCost) || 0;
  const value = Number(fund.currentValue) || 0;
  const pnl = value - cost;
  const pnlPct = cost > 0 ? ((pnl / cost) * 100).toFixed(2) : '0.00';

  return {
    cost,
    value,
    pnl,
    pnlPct: Number(pnlPct),
    isProfit: pnl >= 0,
  };
}

/* ═══ EOF ═══
F: domain/fund.js
V: 1792900300
W: ai-system-20261024-012#25
═══ EOF ═══ */