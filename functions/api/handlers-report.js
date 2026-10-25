// ============================================
// handlers-report.js — 報表與統計處理（V2 重構版）
// 位置：api/handlers-report.js
// 說明：包含總覽儀表板、年度報表、與結算清單的資料聚合。
// ============================================

import { dbGet } from './config.js';
import {
  authenticate, errorResponse, successResponse, handleError, roundInt
} from './helpers.js';

/* ============================================
   1. 單月總覽 (summary)
   ============================================ */
export async function handleSummary(context) {
  try {
    const { request } = context;
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');

    const auth = await authenticate(request, { needFamily: true, body: { familyId } });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    const basePath = `families/${familyId}`;
    
    // 平行讀取所需資料
    const [
      members, policies, expenses, income, funds, 
      categories, items, banks, paymentMethods, statuses, 
      bankAccounts, personalIncome, memberAdvances
    ] = await Promise.all([
      dbGet(`${basePath}/members`, token),
      dbGet(`${basePath}/insurance_policies`, token),
      dbGet(`${basePath}/expenses/${year}/${month}/member_expenses`, token),
      dbGet(`${basePath}/income/${year}/${month}`, token),
      dbGet(`${basePath}/funds`, token),
      dbGet(`${basePath}/expense_categories`, token),
      dbGet(`${basePath}/expense_items`, token),
      dbGet(`${basePath}/banks`, token),
      dbGet(`${basePath}/payment_methods`, token),
      dbGet(`${basePath}/statuses`, token),
      dbGet(`${basePath}/bank_accounts`, token),
      dbGet(`${basePath}/personal_income`, token),
      dbGet(`${basePath}/member_advances`, token),
    ]);

    const membersObj = members || {};
    const statusesObj = statuses || {};
    const statusMap = {};
    Object.entries(statusesObj).forEach(([id, s]) => { if (s && s.name) statusMap[s.name] = { id, ...s }; });

    const perMember = {};
    let totalExpense = 0;
    
    Object.entries(expenses || {}).forEach(([memberId, list]) => {
      const itemsArr = Object.entries(list || {}).map(([id, e]) => {
        const statusInfo = statusMap[e.status];
        return {
          id, name: e.name || '', amount: roundInt(e.amount),
          status: e.status || '未處理',
          statusIsDone: statusInfo ? !!statusInfo.isDone : false,
          date: e.date || '',
          categoryName: (categories || {})[e.categoryId]?.name || '',
          paymentMethodName: (paymentMethods || {})[e.paymentMethodId]?.name || '',
        };
      }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      
      const sum = itemsArr.reduce((s, e) => s + e.amount, 0);
      perMember[memberId] = {
        memberName: (membersObj[memberId]?.name) || '（未知成員）',
        itemCount: itemsArr.length, sum: roundInt(sum), items: itemsArr,
      };
      totalExpense += sum;
    });

    // 收入統計
    let totalIncome = 0;
    Object.entries(income || {}).forEach(([key, val]) => {
      const num = roundInt(val);
      if (key === 'extra' || membersObj[key]) totalIncome += num;
    });

    // 個人收入統計
    let personalIncomeTotal = 0;
    Object.entries(personalIncome || {}).forEach(([memberId, yearData]) => {
      const monthData = yearData?.[year] || {};
      personalIncomeTotal += Object.values(monthData).reduce((s, v) => s + roundInt(v), 0);
    });

    // 保單概況
    let yearlyInsuranceTotal = 0, monthlyInsuranceAverage = 0, activePolicyCount = 0;
    const curY = Number(year), curM = Number(month);

    Object.values(policies || {}).forEach((p) => {
      const firstY = Number(p.firstStartYear) || 0;
      const firstM = Number(p.firstStartMonth) || 1;
      const totalYears = Number(p.totalPolicyYears) || 0;
      if (!firstY) return;
      
      const totalMonths = (curY - firstY) * 12 + (curM - firstM);
      if (totalMonths < 0) return;
      
      const periodIndex = Math.floor(totalMonths / 12) + 1;
      if (totalYears > 0 && periodIndex > totalYears) return;

      if (p.type === 'fund_insurance') {
        const mp = roundInt(p.monthlyPremium);
        if (mp <= 0) return;
        monthlyInsuranceAverage += mp;
        yearlyInsuranceTotal += mp * 12;
        activePolicyCount++;
        return;
      }
      const periodData = (p.periods || {})[String(periodIndex)];
      if (periodData) {
        monthlyInsuranceAverage += roundInt(periodData.monthlyAverage);
        yearlyInsuranceTotal += roundInt(periodData.annualPremium);
        activePolicyCount++;
      }
    });

    // 銀行總額
    const allTransactions = [];
    Object.entries(bankAccounts || {}).forEach(([bid, bankData]) => {
      Object.entries(bankData.transactions || {}).forEach(([txnId, txn]) => {
        allTransactions.push({ id: txnId, bankId: bid, ...txn });
      });
    });
    
    const currentBankTotal = _calcBankTotal(bankAccounts || {}, allTransactions, year, month);
    const fundValue = Object.values(funds || {}).reduce((s, f) => s + roundInt(f.currentValue), 0);
    const totalAssets = currentBankTotal + fundValue;

    // 代墊總額
    let totalAdvanceRemaining = 0;
    const advancesList = [];
    Object.entries(memberAdvances || {}).forEach(([memberId, advances]) => {
      Object.entries(advances || {}).forEach(([advanceId, adv]) => {
        const remaining = roundInt(adv.remainingAmount);
        totalAdvanceRemaining += remaining;
        advancesList.push({ id: advanceId, memberId, ...adv, remainingAmount: remaining });
      });
    });

    return successResponse({
      year, month,
      totalIncome: roundInt(totalIncome),
      totalExpense: roundInt(totalExpense),
      netBalance: roundInt(totalIncome - totalExpense),
      personalIncomeTotal: roundInt(personalIncomeTotal),
      yearlyInsuranceTotal: roundInt(yearlyInsuranceTotal),
      monthlyInsuranceAverage: roundInt(monthlyInsuranceAverage),
      policyCount: activePolicyCount,
      totalAssets: roundInt(totalAssets),
      bankBalance: roundInt(currentBankTotal),
      fundValue: roundInt(fundValue),
      memberAdvances: advancesList,
      totalAdvanceRemaining: roundInt(totalAdvanceRemaining),
      perMember,
      statusMap,
    });
  } catch (err) { return handleError(err); }
}

/* ============================================
   2. 年度報表 (annual-summary)
   ============================================ */
export async function handleAnnualSummary(context) {
  try {
    const { request } = context;
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    const startYear = Number(url.searchParams.get('startYear'));
    const endYear = Number(url.searchParams.get('endYear'));

    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    if (!startYear || !endYear || startYear > endYear) return errorResponse('MISSING_FIELDS', 'startYear / endYear 無效');
    if (endYear - startYear > 10) return errorResponse('BAD_REQUEST', '年度範圍不可超過 10 年');

    const auth = await authenticate(request, { needFamily: true, body: { familyId } });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    const basePath = `families/${familyId}`;
    const [expensesSnap, incomeSnap, policiesSnap, bankAccountsSnap, fundsSnap] = await Promise.all([
      dbGet(`${basePath}/expenses`, token),
      dbGet(`${basePath}/income`, token),
      dbGet(`${basePath}/insurance_policies`, token),
      dbGet(`${basePath}/bank_accounts`, token),
      dbGet(`${basePath}/funds`, token),
    ]);

    const years = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(_buildYearSummary(y, expensesSnap || {}, incomeSnap || {}, policiesSnap || {}, bankAccountsSnap || {}, fundsSnap || {}));
    }

    return successResponse({ startYear, endYear, years });
  } catch (err) { return handleError(err); }
}

/* ============================================
   3. 結算年度 (settlements-year)
   ============================================ */
export async function handleSettlementsYear(context) {
  try {
    const { request } = context;
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    const year = url.searchParams.get('year');
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    if (!year || !/^\d{4}$/.test(year)) return errorResponse('MISSING_FIELDS', 'year 格式錯誤（yyyy）');

    const auth = await authenticate(request, { needFamily: true, body: { familyId } });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    const basePath = `families/${familyId}`;
    const [expensesSnap, policiesSnap, paymentsSnap] = await Promise.all([
      dbGet(`${basePath}/expenses/${year}`, token),
      dbGet(`${basePath}/insurance_policies`, token),
      dbGet(`${basePath}/insurance_payments`, token),
    ]);

    const memberExpensesByMonth = {};
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      const monthData = (expensesSnap || {})[mm]?.member_expenses || {};
      const rows = [];
      Object.entries(monthData).forEach(([memberId, items]) => {
        Object.entries(items || {}).forEach(([id, e]) => {
          rows.push({ id, memberId, name: e.name || '', amount: roundInt(e.amount), status: e.status || '', date: e.date || '', isAutoLinked: !!e.isAutoLinked, policyId: e.policyId || '' });
        });
      });
      memberExpensesByMonth[mm] = rows;
    }

    const policies = Object.entries(policiesSnap || {}).map(([id, p]) => ({
      id, type: p.type || 'normal', name: p.name || '', company: p.company || '',
      memberId: p.memberId || '', policyHolderId: p.policyHolderId || '', paymentMode: p.paymentMode || 'direct',
      firstStartYear: Number(p.firstStartYear) || 0, firstStartMonth: String(p.firstStartMonth || '01').padStart(2, '0'),
      totalPolicyYears: Number(p.totalPolicyYears) || 0, periods: p.periods || {},
      monthlyPremium: roundInt(p.monthlyPremium), monthlyAverage: roundInt(p.monthlyAverage), annualPremium: roundInt(p.annualPremium),
    }));

    const paymentsCache = {};
    policies.forEach((p) => {
      const pYearPayments = (paymentsSnap || {})[p.id]?.[year] || {};
      paymentsCache[p.id] = { [year]: pYearPayments };
    });

    return successResponse({ year, memberExpensesByMonth, policies, paymentsCache });
  } catch (err) { return handleError(err); }
}

/* ============================================
   輔助函式
   ============================================ */
function _buildYearSummary(year, expensesObj, incomeObj, policiesObj, bankAccountsObj, fundsObj) {
  const yearStr = String(year);
  const yearExpenses = expensesObj[yearStr] || {};
  const yearIncome = incomeObj[yearStr] || {};
  const monthly = [];
  let yearTotalIncome = 0, yearTotalExpense = 0, monthsWithData = 0;

  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    const monthIncomeObj = yearIncome[mm] || {};
    let totalIncome = 0;
    Object.values(monthIncomeObj).forEach((v) => { totalIncome += roundInt(v); });

    const monthExpenses = yearExpenses[mm]?.member_expenses || {};
    let totalExpense = 0;
    Object.values(monthExpenses).forEach((memberData) => {
      Object.values(memberData || {}).forEach((e) => { totalExpense += roundInt(e.amount); });
    });

    if (totalExpense > 0) monthsWithData++;
    monthly.push({ monthNum: m, month: mm, totalIncome: roundInt(totalIncome), totalExpense: roundInt(totalExpense), netBalance: roundInt(totalIncome - totalExpense) });
    yearTotalIncome += totalIncome;
    yearTotalExpense += totalExpense;
  }

  const allTransactions = [];
  Object.entries(bankAccountsObj).forEach(([bid, bankData]) => {
    Object.entries(bankData.transactions || {}).forEach(([txnId, txn]) => {
      allTransactions.push({ id: txnId, bankId: bid, ...txn });
    });
  });
  const bankBalance = _calcBankTotal(bankAccountsObj, allTransactions, year, '12');
  const fundValue = Object.values(fundsObj).reduce((s, f) => s + roundInt(f.currentValue), 0);

  return {
    year, totalIncome: roundInt(yearTotalIncome), totalExpense: roundInt(yearTotalExpense),
    netBalance: roundInt(yearTotalIncome - yearTotalExpense),
    bankBalance: roundInt(bankBalance), fundValue: roundInt(fundValue), totalAssets: roundInt(bankBalance + fundValue),
    avg: monthsWithData > 0 ? Math.round(yearTotalExpense / monthsWithData) : 0,
    monthly,
  };
}

function _calcBankTotal(bankAccounts, transactions, targetYear, targetMonth) {
  if (!targetYear || !targetMonth) return 0;
  const tY = Number(targetYear), tM = Number(targetMonth);
  let total = 0;

  Object.values(bankAccounts || {}).forEach((acc) => {
    const init = Number(acc.initialBalance) || 0;
    const initY = Number(acc.initialYear) || 0, initM = Number(acc.initialMonth) || 0;
    if (!initY || !initM) { total += init; return; }
    if (tY < initY || (tY === initY && tM < initM)) { total += init; return; }

    let balance = init;
    transactions.filter((t) => t.bankId === acc.id).forEach((txn) => {
      const date = txn.date || '';
      if (!date || date.length < 7) return;
      const [y, m] = date.split('-').map(Number);
      const afterInit = y > initY || (y === initY && m > initM);
      const beforeTarget = y < tY || (y === tY && m <= tM);
      if (!afterInit || !beforeTarget) return;
      
      const amount = Number(txn.amount) || 0;
      if (txn.type === 'in') balance += amount;
      else if (txn.type === 'out' || txn.type === 'transfer') balance -= amount;
    });
    total += balance;
  });
  return total;
}

/* ═══ EOF ═══
F: api/handlers-report.js
V: 1792900380
W: ai-system-20261024-012#33
═══ EOF ═══ */