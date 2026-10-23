// ============================================
// app-domain.js — 業務邏輯計算層（純函數）
// ============================================

export function calcBankBalance(bankAccounts, transactions, targetYear, targetMonth) {
  if (!targetYear || !targetMonth) return 0;
  const tY = Number(targetYear), tM = Number(targetMonth);
  let total = 0;

  (bankAccounts || []).forEach((acc) => {
    const init = Number(acc.initialBalance) || 0;
    const initY = Number(acc.initialYear) || 0;
    const initM = Number(acc.initialMonth) || 0;
    if (!initY || !initM) { total += init; return; }
    if (tY < initY || (tY === initY && tM < initM)) { total += init; return; }

    let balance = init;
    (transactions || []).filter((t) => t.bankId === acc.id).forEach((txn) => {
      const date = txn.date || '';
      if (!date || date.length < 7) return;
      const [y, m] = date.split('-').map(Number);
      const afterInit = y > initY || (y === initY && m > initM);
      const beforeTarget = y < tY || (y === tY && m <= tM);
      if (!afterInit || !beforeTarget) return;
      
      const amount = Number(txn.amount) || 0;
      if (txn.type === 'in') balance += amount;
      else balance -= amount;
    });
    total += balance;
  });
  return total;
}

export function getPeriodInfo(policy, year, month) {
  const firstY = Number(policy.firstStartYear) || 0;
  const firstM = Number(policy.firstStartMonth) || 1;
  if (!firstY || firstY < 2000 || firstY > 2100) return null;
  
  const startDate = new Date(firstY, firstM - 1, 1);
  const currentDate = new Date(Number(year), Number(month) - 1, 1);
  const diffMonths = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + (currentDate.getMonth() - startDate.getMonth());
  if (diffMonths < 0) return null;

  const periodIndex = Math.floor(diffMonths / 12) + 1;
  const totalYears = Number(policy.totalPolicyYears) || 0;
  if (totalYears > 0 && periodIndex > totalYears) return null;
  return { periodIndex };
}

export function getPolicyAnnualPremium(policy, targetYear) {
  if (!policy) return 0;
  const year = Number(targetYear);
  const firstY = Number(policy.firstStartYear) || 0;
  if (!firstY || year < firstY) return 0;

  const periodIndex = year - firstY + 1;
  const totalYears = Number(policy.totalPolicyYears) || 0;
  if (totalYears > 0 && periodIndex > totalYears) return 0;

  if (policy.type === 'fund_insurance') return Math.round((Number(policy.monthlyPremium) || 0) * 12);
  
  const p = (policy.periods || {})[String(periodIndex)];
  if (p && p.annualPremium) return Math.round(Number(p.annualPremium));
  
  return Math.round(Number(policy.annualPremium) || 0);
}

export function getPolicyTotalPremium(policy) {
  if (!policy) return 0;
  if (policy.type === 'fund_insurance') {
    return Math.round((Number(policy.monthlyPremium) || 0) * 12 * (Number(policy.totalPolicyYears) || 0));
  }
  const totalYears = Number(policy.totalPolicyYears) || 0;
  if (totalYears === 0) return Math.round(Number(policy.annualPremium) || 0);

  let total = 0;
  for (let i = 1; i <= totalYears; i++) {
    const p = (policy.periods || {})[String(i)];
    total += (p && p.annualPremium) ? Math.round(Number(p.annualPremium)) : Math.round(Number(policy.annualPremium) || 0);
  }
  return total;
}

export function getPolicyPaidTotal(payments) {
  let total = 0;
  Object.values(payments || {}).forEach((yd) => {
    Object.values(yd || {}).forEach((m) => {
      if (m && m.status === 'done') total += Math.round(Number(m.amount) || 0);
    });
  });
  return total;
}

export function countCompletedPeriods(payments) {
  let c = 0;
  Object.values(payments || {}).forEach((yd) => {
    Object.values(yd || {}).forEach((m) => { if (m && m.status === 'done') c++; });
  });
  return c;
}

export function calcProgress(policy) {
  const t = Number(policy.totalPolicyPeriods) || 0;
  const d = Number(policy.completedPeriods) || 0;
  if (t <= 0) return 0;
  return Math.min(100, Math.round((d / t) * 100));
}

export function isPolicyCompleted(policy) {
  if (!policy) return false;
  if (policy.isCompleted) return true;
  if (policy.type === 'fund_insurance') return false;
  const t = Number(policy.totalPolicyPeriods) || 0;
  return t > 0 && Number(policy.completedPeriods) >= t;
}

export function calcFundCostEstimate(policy, year, month) {
  if (!policy || policy.type !== 'fund_insurance') return 0;
  const monthly = Number(policy.monthlyPremium) || 0;
  if (monthly <= 0) return 0;
  
  const fy = Number(policy.firstStartYear) || 0;
  const fm = Number(policy.firstStartMonth) || 1;
  if (!fy) return 0;

  const diffMonths = (Number(year) - fy) * 12 + (Number(month) - fm);
  if (diffMonths < 0) return 0;
  return Math.round(monthly * (diffMonths + 1));
}

export function getFundCostMap(policy, allFunds, targetYear, targetMonth) {
  const costMap = {};
  if (!policy) return costMap;
  const policyFunds = (allFunds || []).filter((f) => f.type === 'insurance' && (f.policyId === policy.id || (policy.fundsAllocation || []).some((a) => a.fundId === f.id)));
  if (policyFunds.length === 0) return costMap;

  const totalPolicyCost = calcFundCostEstimate(policy, targetYear, targetMonth);
  const manualFunds = policyFunds.filter((f) => Number(f.cost) > 0);
  const manualTotal = manualFunds.reduce((s, f) => s + Number(f.cost), 0);
  manualFunds.forEach((f) => { costMap[f.id] = Number(f.cost); });

  const remainingCost = Math.max(0, totalPolicyCost - manualTotal);
  const dynamicFunds = policyFunds.filter((f) => Number(f.cost) <= 0);
  const dynamicTotalPct = dynamicFunds.reduce((s, f) => {
    const alloc = (policy.fundsAllocation || []).find((a) => a.fundId === f.id);
    return s + (alloc ? Number(alloc.pct) : 0);
  }, 0);

  dynamicFunds.forEach((f) => {
    const alloc = (policy.fundsAllocation || []).find((a) => a.fundId === f.id);
    const pct = alloc ? Number(alloc.pct) : 0;
    costMap[f.id] = dynamicTotalPct > 0 ? Math.round(remainingCost * (pct / dynamicTotalPct)) : 0;
  });

  return costMap;
}

export function findPolicyByFund(fund, policies) {
  if (fund.policyId) {
    const p = (policies || []).find((x) => x.id === fund.policyId);
    if (p) return p;
  }
  return (policies || []).find((p) => (p.fundsAllocation || []).some((a) => a.fundId === fund.id)) || null;
}

export function mergeSettlementData({ memberExpenses = [], insuranceRows = [], year, month }) {
  const rows = [];
  (memberExpenses || []).filter((e) => !e.isAutoLinked).forEach((e) => {
    rows.push({
      key: `personal-${e.id}`, source: 'personal', sourceLabel: '個人',
      year, month, memberId: e.memberId, memberName: e.memberId === 'shared' ? '家庭' : e.memberId,
      name: e.name, amount: Number(e.amount) || 0, status: e.status || 'pending',
      statusLabel: e.status === 'done' ? '已付款' : '未付款',
      _ref: { memberId: e.memberId, expenseId: e.id }
    });
  });

  const linkedMap = {};
  (memberExpenses || []).filter((e) => e.isAutoLinked).forEach((e) => {
    const pid = e.policyId || (e.id.startsWith('linked_') ? e.id.slice(7) : '');
    if (pid) linkedMap[pid] = e;
  });

  const allPolicyIds = new Set([...Object.keys(linkedMap), ...(insuranceRows || []).map((p) => p.policyId)]);
  allPolicyIds.forEach((pid) => {
    const linked = linkedMap[pid];
    const insRow = (insuranceRows || []).find((p) => p.policyId === pid);
    const effMid = insRow?.policyHolderId || insRow?.memberId || linked?.memberId || '';
    const status = insRow?.status === 'done' || linked?.status === 'done' ? 'done' : 'pending';
    
    rows.push({
      key: `insurance-${pid}`, source: 'insurance', sourceLabel: '保險',
      year, month, memberId: effMid, memberName: effMid,
      name: insRow?.policyName || linked?.name || '未知保單',
      amount: Number(linked?.amount || insRow?.amount) || 0, status,
      statusLabel: status === 'done' ? '已扣款' : '未扣款',
      _ref: { policyId: pid, memberId: effMid, linkedId: linked?.id }
    });
  });
  return rows;
}

export function computeYearTotals(allIncome, allExpenses, year) {
  const yk = String(year || '');
  const yi = (allIncome || {})[yk] || {};
  let totalIncome = 0;
  Object.values(yi).forEach((md) => Object.values(md || {}).forEach((v) => { totalIncome += Number(v) || 0; }));

  const ye = (allExpenses || {})[yk] || {};
  let totalExpense = 0, monthCount = 0;
  Object.values(ye).forEach((md) => {
    const me = (md && md.member_expenses) || {};
    let s = 0;
    Object.values(me).forEach((items) => Object.values(items || {}).forEach((e) => { s += Number(e && e.amount) || 0; }));
    if (s > 0) monthCount++;
    totalExpense += s;
  });
  return { totalIncome: Math.round(totalIncome), totalExpense: Math.round(totalExpense), net: Math.round(totalIncome - totalExpense), monthCount };
}

/* ═══ EOF ═══
F: js/app-domain.js
V: 1792800003
W: webapp-20261023-001#23
═══ */