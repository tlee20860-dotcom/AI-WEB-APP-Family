// ============================================
// app-domain.js — SPA 業務計算層
// 職責：保險 / 基金 / 銀行 / 年度統計 / 結算合併
// 凍結：FZ-001~005 逐字搬入，禁止修改公式
// ============================================

import { AppState } from './app-core.js';
import { statusIsDone, statusLabel, statusNormalize, statusToLegacyName } from './app-data.js';

/* ============================================
   1. 通用
   ============================================ */
const _round = (v) => Math.round(Number(v) || 0);

/* ============================================
   2. 銀行餘額（FZ-001 逐字搬入）
   來源：_summary.js _calcBankTotal
   ============================================ */
export function calcBankBalance(bankAccounts, transactions, targetYear, targetMonth) {
  if (!targetYear || !targetMonth) return 0;
  const tY = Number(targetYear);
  const tM = Number(targetMonth);
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
      else if (txn.type === 'out') balance -= amount;
      else if (txn.type === 'transfer') balance -= amount;
    });
    total += balance;
  });

  return total;
}

/* ============================================
   3. 保險（FZ-002 / FZ-003 逐字搬入）
   ============================================ */

// FZ-002 月平攤
export function calcMonthlyExpense(data) {
  const policyType = data.type || 'normal';
  const paymentType = data.paymentType || '年繳';
  const ty = Number(data.totalPolicyYears) || 1;
  if (policyType === 'fund_insurance') return Math.round(Number(data.monthlyPremium) || 0);
  switch (paymentType) {
    case '年繳':     return Math.round((Number(data.annualPremium) || 0) / 12);
    case '月繳':     return Math.round(Number(data.monthlyPremium) || 0);
    case '一次付款': return Math.round((Number(data.oncePremium) || 0) / ty / 12);
    default:         return 0;
  }
}

// FZ-003 已供滿
export function isPolicyCompleted(policy) {
  if (!policy) return false;
  if (policy.isCompleted) return true;
  if (policy.type === 'fund_insurance') return false;
  const total = Number(policy.totalPolicyPeriods) || 0;
  if (total <= 0) return false;
  const done = Number(policy.completedPeriods) || 0;
  return done >= total;
}

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
  };
}

export function getPeriodInfo(policy, year, month) {
  const firstY = Number(policy.firstStartYear) || 0;
  const firstM = Number(policy.firstStartMonth) || 1;
  if (!firstY || firstY < 2000 || firstY > 2100) return null;
  if (!firstM || firstM < 1 || firstM > 12) return null;
  const startDate = new Date(firstY, firstM - 1, 1);
  const curDate = new Date(Number(year), Number(month) - 1, 1);
  const diff = (curDate.getFullYear() - startDate.getFullYear()) * 12 + (curDate.getMonth() - startDate.getMonth());
  if (diff < 0) return null;
  const periodIndex = Math.floor(diff / 12) + 1;
  const totalYears = Number(policy.totalPolicyYears) || 0;
  if (totalYears > 0 && periodIndex > totalYears) return null;
  return { periodIndex, ...getPeriodRange(policy, periodIndex) };
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
  const periods = policy.periods || {};
  const p = periods[String(periodIndex)];
  if (p && p.annualPremium) return Math.round(Number(p.annualPremium));
  const keys = Object.keys(periods).map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);
  if (keys.length) {
    const below = keys.filter((k) => k <= periodIndex);
    const target = below.length ? below[below.length - 1] : keys[0];
    const tp = periods[String(target)];
    if (tp && tp.annualPremium) return Math.round(Number(tp.annualPremium));
  }
  return Math.round(Number(policy.annualPremium) || 0);
}

export function getPolicyTotalPremium(policy) {
  if (!policy) return 0;
  if (policy.type === 'fund_insurance') {
    return Math.round((Number(policy.monthlyPremium) || 0) * 12 * (Number(policy.totalPolicyYears) || 0));
  }
  const totalYears = Number(policy.totalPolicyYears) || 0;
  if (totalYears === 0) return Math.round(Number(policy.annualPremium) || 0);
  const periods = policy.periods || {};
  const keys = Object.keys(periods).map(Number).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);
  let fb = Math.round(Number(policy.annualPremium) || 0);
  if (!fb && keys.length) {
    const last = periods[String(keys[keys.length - 1])];
    if (last?.annualPremium) fb = Math.round(Number(last.annualPremium));
  }
  let total = 0;
  for (let i = 1; i <= totalYears; i++) {
    const p = periods[String(i)];
    total += (p && p.annualPremium) ? Math.round(Number(p.annualPremium)) : fb;
  }
  return total;
}

export function getPolicyPaidTotal(payments) {
  let total = 0;
  Object.values(payments || {}).forEach((yData) => {
    Object.values(yData || {}).forEach((m) => {
      if (m && statusIsDone(m.status)) total += Math.round(Number(m.amount) || 0);
    });
  });
  return total;
}

export function countCompletedPeriods(payments) {
  let c = 0;
  Object.values(payments || {}).forEach((yData) => {
    Object.values(yData || {}).forEach((m) => { if (m && statusIsDone(m.status)) c++; });
  });
  return c;
}

export function calcProgress(policy) {
  const t = Number(policy.totalPolicyPeriods) || 0;
  const d = Number(policy.completedPeriods) || 0;
  if (t <= 0) return 0;
  return Math.min(100, Math.round((d / t) * 100));
}

export function resolveMonthlyAmount(policy, year, month, paymentData) {
  if (!policy) return 0;
  if (paymentData?.amount && Number(paymentData.amount) > 0) return Math.round(Number(paymentData.amount));
  if (policy.type === 'fund_insurance') return Math.round(Number(policy.monthlyPremium) || 0);
  const info = getPeriodInfo(policy, year, month);
  if (info) {
    const pd = (policy.periods || {})[String(info.periodIndex)];
    if (pd && pd.monthlyAverage) return Math.round(Number(pd.monthlyAverage));
  }
  return Math.round(Number(policy.monthlyAverage) || 0);
}

/* ============================================
   4. 基金（FZ-004 / FZ-005 逐字搬入）
   ============================================ */

// FZ-004 基金成本估算
export function calcFundCostEstimate(policy, year, month) {
  if (!policy || policy.type !== 'fund_insurance') return 0;
  const monthly = Number(policy.monthlyPremium) || 0;
  if (monthly <= 0) return 0;
  const fy = Number(policy.firstStartYear) || 0;
  const fm = Number(policy.firstStartMonth) || 1;
  if (!fy) return 0;
  const startDate = new Date(fy, fm - 1, 1);
  const curDate = new Date(Number(year), Number(month) - 1, 1);
  const diffMonths = (curDate.getFullYear() - startDate.getFullYear()) * 12 + (curDate.getMonth() - startDate.getMonth());
  if (diffMonths < 0) return 0;
  const paidMonths = diffMonths + 1;
  return Math.round(monthly * paidMonths);
}

export function calcFundCostFromPayments(payments) { return getPolicyPaidTotal(payments); }

// FZ-005 手動優先＋比例分配
export function getFundCostMap(policy, allFunds, targetYear, targetMonth) {
  const costMap = {};
  if (!policy) return costMap;
  const policyFunds = (allFunds || []).filter((f) => {
    if (f.type !== 'insurance') return false;
    if (f.policyId === policy.id) return true;
    return (policy.fundsAllocation || []).some((a) => a.fundId === f.id);
  });
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

/* ============================================
   5. 年度統計（合 4 處為一，SSOT 化）
   ============================================ */
export function computeYearTotals(allIncome, allExpenses, year) {
  const yk = String(year || '');
  if (!yk) return { totalIncome: 0, totalExpense: 0, net: 0, monthCount: 0 };
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
  return {
    totalIncome: Math.round(totalIncome),
    totalExpense: Math.round(totalExpense),
    net: Math.round(totalIncome - totalExpense),
    monthCount,
  };
}

export function computeAnnualOverview(allIncome, allExpenses, policies, currentYear) {
  const curY = Number(currentYear) || new Date().getFullYear();
  const startY = curY - 2, endY = curY + 2;
  const rows = [];
  for (let y = startY; y <= endY; y++) {
    const yk = String(y);
    const yi = (allIncome || {})[yk] || {};
    const ye = (allExpenses || {})[yk] || {};
    let totalIncome = 0;
    Object.values(yi).forEach((md) => Object.values(md || {}).forEach((v) => { totalIncome += Number(v) || 0; }));
    let totalExpense = 0, monthsWithData = 0;
    Object.values(ye).forEach((md) => {
      const me = (md && md.member_expenses) || {};
      let s = 0;
      Object.values(me).forEach((items) => Object.values(items || {}).forEach((e) => { s += Number(e && e.amount) || 0; }));
      if (s > 0) monthsWithData++;
      totalExpense += s;
    });
    let insurance = 0;
    (policies || []).forEach((p) => { try { insurance += getPolicyAnnualPremium(p, y) || 0; } catch (e) {} });
    const net = totalIncome - totalExpense - insurance;
    rows.push({
      year: y,
      totalIncome: Math.round(totalIncome),
      totalExpense: Math.round(totalExpense),
      insurance: Math.round(insurance),
      net: Math.round(net),
      avg: monthsWithData > 0 ? Math.round(totalExpense / monthsWithData) : 0,
      isCurrent: y === curY,
    });
  }
  return rows;
}

export function computeMemberAnnualRows(members, allIncome, allExpenses, allPersonalIncome, year) {
  const yk = String(year || '');
  const yi = (allIncome || {})[yk] || {};
  const ye = (allExpenses || {})[yk] || {};
  const rows = (members || []).map((m) => {
    let income = 0, pi = 0, exp = 0;
    Object.values(yi).forEach((md) => { income += Number(md && md[m.id]) || 0; });
    const mp = ((allPersonalIncome || {})[m.id] || {})[yk] || {};
    Object.values(mp).forEach((v) => { pi += Number(v) || 0; });
    Object.values(ye).forEach((md) => {
      const me = (md && md.member_expenses && md.member_expenses[m.id]) || {};
      Object.values(me).forEach((e) => { exp += Number(e && e.amount) || 0; });
    });
    return { id: m.id, name: m.name, income: Math.round(income), personalIncome: Math.round(pi), expense: Math.round(exp), net: Math.round(income + pi - exp) };
  });
  const SHARED = 'shared';
  let se = 0;
  Object.values(ye).forEach((md) => {
    const s = (md && md.member_expenses && md.member_expenses[SHARED]) || {};
    Object.values(s).forEach((e) => { se += Number(e && e.amount) || 0; });
  });
  if (se > 0) rows.push({ id: SHARED, name: '家庭共用', income: 0, personalIncome: 0, expense: Math.round(se), net: -Math.round(se), __isShared: true });
  const tot = rows.reduce((s, r) => ({ income: s.income + r.income, personalIncome: s.personalIncome + r.personalIncome, expense: s.expense + r.expense, net: s.net + r.net }), { income: 0, personalIncome: 0, expense: 0, net: 0 });
  rows.push({ id: '__total__', name: '總計', ...tot, __isTotal: true });
  return rows;
}

export function computeMemberReportRows(members, allIncome, allExpenses, allPersonalIncome, year) {
  const yk = String(year || '');
  const yi = (allIncome || {})[yk] || {};
  const ye = (allExpenses || {})[yk] || {};
  const SHARED = 'shared';
  const list = (members || []).map((m) => ({ id: m.id, name: m.name, isShared: false }));
  list.push({ id: SHARED, name: '家庭共用', isShared: true });

  return list.map((m) => {
    let income = 0, personalIncome = 0, expense = 0, insurance = 0;
    if (!m.isShared) {
      Object.values(yi).forEach((md) => { income += Number(md && md[m.id]) || 0; });
      const mp = ((allPersonalIncome || {})[m.id] || {})[yk] || {};
      Object.values(mp).forEach((v) => { personalIncome += Number(v) || 0; });
    }
    Object.values(ye).forEach((md) => {
      const me = (md && md.member_expenses && md.member_expenses[m.id]) || {};
      Object.values(me).forEach((e) => {
        const amt = Number(e && e.amount) || 0;
        if (e && e.isAutoLinked) insurance += amt; else expense += amt;
      });
    });
    return { ...m, income: Math.round(income), expense: Math.round(expense), insurance: Math.round(insurance), personalIncome: Math.round(personalIncome), net: Math.round(income + personalIncome - expense - insurance) };
  });
}

/* ============================================
   6. 結算合併（沿用舊版 merge.js）
   ============================================ */
let _insuranceStatusNames = null;
try {
  AppState.on('family-change', () => { _insuranceStatusNames = null; });
} catch (e) {}

function _getInsStatusNames() {
  if (_insuranceStatusNames) return _insuranceStatusNames;
  _insuranceStatusNames = new Set(['未扣款', '已扣款']);
  return _insuranceStatusNames;
}

function _resolveInsStatus(...cands) {
  const valid = _getInsStatusNames();
  for (const c of cands) { if (c && valid.has(c)) return c; }
  return statusToLegacyName('pending', 'insurance');
}

export function mergeSettlementData({ memberExpenses = [], insuranceRows = [], year, month }) {
  const rows = [];
  const SHARED = 'shared';

  (memberExpenses || []).filter((e) => !e.isAutoLinked).forEach((e) => {
    rows.push({
      key: `personal-${year}-${month}-${e.memberId}-${e.id}`,
      source: 'personal',
      sourceLabel: e.memberId === SHARED ? '🏠 家庭' : '🏷 個人',
      year, month, memberId: e.memberId || '',
      name: e.name || '（未命名）',
      amount: Number(e.amount) || 0,
      status: e.status || '未處理',
      isDone: statusIsDone(e.status),
      date: e.date || '',
      paymentMethodId: e.paymentMethodId || '',
      bankId: e.bankId || '', txnId: e.txnId || '',
      _ref: { memberId: e.memberId, expenseId: e.id },
    });
  });

  const linkedMap = {};
  (memberExpenses || []).filter((e) => e.isAutoLinked).forEach((e) => {
    const pid = e.policyId || (typeof e.id === 'string' && e.id.startsWith('linked_') ? e.id.slice(7) : '');
    if (pid) linkedMap[pid] = e;
  });
  const allPolicyIds = new Set([...Object.keys(linkedMap), ...(insuranceRows || []).map((p) => p.policyId)]);

  allPolicyIds.forEach((pid) => {
    const linked = linkedMap[pid];
    const insRow = (insuranceRows || []).find((p) => p.policyId === pid);
    const effMid = insRow?.policyHolderId || insRow?.memberId || linked?.memberId || '';
    const status = _resolveInsStatus(insRow?.status, linked?.status);
    rows.push({
      key: `insurance-${year}-${month}-${pid}`,
      source: 'insurance',
      sourceLabel: '🛡 保險',
      year, month, memberId: effMid,
      name: insRow?.policyName || linked?.name || '（未命名保單）',
      amount: Number(linked?.amount ?? insRow?.amount) || 0,
      status, isDone: statusIsDone(status),
      date: linked?.date || insRow?.date || '',
      bankId: linked?.bankId || insRow?.bankId || '',
      txnId: linked?.txnId || insRow?.txnId || '',
      paymentMode: insRow?.paymentMode || 'direct',
      advanceHolderId: insRow?.advanceHolderId || '',
      _ref: { policyId: pid, memberId: effMid, linkedId: linked?.id },
    });
  });

  return rows;
}