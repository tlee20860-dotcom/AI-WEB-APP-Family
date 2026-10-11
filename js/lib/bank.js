// ============================================
// bank.js — 銀行業務輔助（v103.0.22）
// 位置：js/lib/bank.js
// ============================================
// v103.0.22（B25-4）：
//   ✅ M7：移除未使用的 checkBankSufficiency 佔位（無呼叫點）
// ============================================

import {
  addBankTransaction,
  updateBankTransaction,
  removeBankTransaction,
} from '../core/db.js';
import {
  BANK_TXN_TYPES,
  BANK_TXN_CATEGORIES,
  PAYMENT_MODES,
} from '../config/constants.js';
import { roundHKD, todayISO } from '../core/utils.js';

/* ============================================
   1. 銀行餘額計算（純函式）
   ============================================ */
export function calcBankBalance(bankAccount, transactions, targetYear, targetMonth) {
  if (!bankAccount) return 0;

  const initial = Number(bankAccount.initialBalance) || 0;
  const initY = Number(bankAccount.initialYear) || 0;
  const initM = Number(bankAccount.initialMonth) || 0;

  if (!initY || !initM) return initial;

  const tY = Number(targetYear);
  const tM = Number(targetMonth);

  if (tY < initY || (tY === initY && tM < initM)) {
    return initial;
  }

  let balance = initial;
  (transactions || []).forEach((txn) => {
    const date = txn.date || '';
    if (!date || date.length < 7) return;

    const [y, m] = date.split('-').map(Number);
    const afterInit = y > initY || (y === initY && m > initM);
    const beforeTarget = y < tY || (y === tY && m <= tM);

    if (!afterInit || !beforeTarget) return;

    const amount = Number(txn.amount) || 0;
    if (txn.type === BANK_TXN_TYPES.IN) {
      balance += amount;
    } else if (txn.type === BANK_TXN_TYPES.OUT) {
      balance -= amount;
    } else if (txn.type === BANK_TXN_TYPES.TRANSFER) {
      balance -= amount;
    }
  });

  return balance;
}

export function calcTotalBankBalance(bankAccounts, allTransactions, targetYear, targetMonth) {
  let total = 0;
  (bankAccounts || []).forEach((acc) => {
    const txns = (allTransactions || []).filter((t) => t.bankId === acc.id);
    total += calcBankBalance(acc, txns, targetYear, targetMonth);
  });
  return total;
}

export function getBankTransactions(allTransactions, bankId) {
  return (allTransactions || []).filter((t) => t.bankId === bankId);
}

/* ============================================
   2. 銀行交易建立
   ============================================ */
export async function createTransactionForExpense({
  bankId,
  memberId,
  amount,
  date,
  expenseId,
  note = '',
}) {
  if (!bankId || !amount) throw new Error('缺少必要參數');

  return addBankTransaction(bankId, {
    type: BANK_TXN_TYPES.OUT,
    category: BANK_TXN_CATEGORIES.EXPENSE,
    amount: roundHKD(amount),
    date: date || todayISO(),
    memberId: memberId || '',
    refId: expenseId || '',
    note: note || '',
  });
}

export async function createTransactionForInsurance({
  bankId,
  memberId,
  amount,
  date,
  policyId,
  note = '',
}) {
  if (!bankId || !amount) throw new Error('缺少必要參數');

  return addBankTransaction(bankId, {
    type: BANK_TXN_TYPES.OUT,
    category: BANK_TXN_CATEGORIES.INSURANCE,
    amount: roundHKD(amount),
    date: date || todayISO(),
    memberId: memberId || '',
    refId: policyId || '',
    note: note || '',
  });
}

export async function createTransactionForReimbursement({
  bankId,
  memberId,
  amount,
  date,
  policyId,
  note = '',
}) {
  if (!bankId || !amount) throw new Error('缺少必要參數');

  return addBankTransaction(bankId, {
    type: BANK_TXN_TYPES.TRANSFER,
    category: BANK_TXN_CATEGORIES.REIMBURSEMENT,
    amount: roundHKD(amount),
    date: date || todayISO(),
    memberId: memberId || '',
    refId: policyId || '',
    note: note || '',
  });
}

export async function createTransactionForContribution({
  bankId,
  memberId,
  amount,
  date,
  note = '',
}) {
  if (!bankId || !amount) throw new Error('缺少必要參數');

  return addBankTransaction(bankId, {
    type: BANK_TXN_TYPES.IN,
    category: BANK_TXN_CATEGORIES.CONTRIBUTION,
    amount: roundHKD(amount),
    date: date || todayISO(),
    memberId: memberId || '',
    refId: '',
    note: note || '',
  });
}

/* ============================================
   3. 支出編輯同步
   ============================================ */
export async function syncExpenseToBank({
  oldBankId,
  oldTxnId,
  newBankId,
  expenseData,
  expenseId,
}) {
  const hasOld = !!(oldBankId && oldTxnId);
  const hasNew = !!newBankId;

  if (hasOld && !hasNew) {
    try {
      await removeBankTransaction(oldBankId, oldTxnId);
    } catch (e) {
      console.warn('[bank] 刪除舊交易失敗：', e);
    }
    return '';
  }

  if (!hasOld && hasNew) {
    return await createTransactionForExpense({
      bankId: newBankId,
      memberId: expenseData.memberId,
      amount: expenseData.amount,
      date: expenseData.date,
      expenseId,
      note: expenseData.name || '',
    });
  }

  if (hasOld && hasNew && oldBankId === newBankId) {
    try {
      await updateBankTransaction(oldBankId, oldTxnId, {
        amount: roundHKD(expenseData.amount),
        date: expenseData.date,
        memberId: expenseData.memberId,
        note: expenseData.name || '',
      });
    } catch (e) {
      console.warn('[bank] 更新交易失敗：', e);
    }
    return oldTxnId;
  }

  if (hasOld && hasNew && oldBankId !== newBankId) {
    try {
      await removeBankTransaction(oldBankId, oldTxnId);
    } catch (e) {
      console.warn('[bank] 刪除舊交易失敗：', e);
    }
    return await createTransactionForExpense({
      bankId: newBankId,
      memberId: expenseData.memberId,
      amount: expenseData.amount,
      date: expenseData.date,
      expenseId,
      note: expenseData.name || '',
    });
  }

  return oldTxnId || '';
}

export async function cleanupExpenseBankTransaction(bankId, txnId) {
  if (!bankId || !txnId) return;
  try {
    await removeBankTransaction(bankId, txnId);
  } catch (e) {
    console.warn('[bank] 清理交易失敗：', e);
  }
}

/* ============================================
   4. 保險編輯同步
   ============================================ */
export async function createTransactionForInsurancePayment({
  paymentMode,
  bankId,
  memberId,
  amount,
  date,
  policyId,
  policyName = '',
}) {
  if (!bankId || !amount) {
    throw new Error('缺少 bankId 或 amount');
  }

  if (paymentMode === PAYMENT_MODES.ADVANCE) {
    return await createTransactionForReimbursement({
      bankId,
      memberId,
      amount,
      date,
      policyId,
      note: policyName ? `${policyName} (代墊還款)` : '',
    });
  }

  return await createTransactionForInsurance({
    bankId,
    memberId,
    amount,
    date,
    policyId,
    note: policyName || '',
  });
}

/* ============================================
   5. 交易分析
   ============================================ */
export function groupTransactionsByCategory(transactions) {
  const groups = {
    [BANK_TXN_CATEGORIES.CONTRIBUTION]:  { count: 0, amount: 0 },
    [BANK_TXN_CATEGORIES.EXPENSE]:       { count: 0, amount: 0 },
    [BANK_TXN_CATEGORIES.INSURANCE]:     { count: 0, amount: 0 },
    [BANK_TXN_CATEGORIES.REIMBURSEMENT]: { count: 0, amount: 0 },
    [BANK_TXN_CATEGORIES.MANUAL]:        { count: 0, amount: 0 },
  };

  (transactions || []).forEach((t) => {
    const cat = t.category || BANK_TXN_CATEGORIES.MANUAL;
    if (!groups[cat]) {
      groups[cat] = { count: 0, amount: 0 };
    }
    groups[cat].count++;
    groups[cat].amount += roundHKD(t.amount);
  });

  return groups;
}

export function filterTransactionsByMonth(transactions, year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return (transactions || []).filter((t) => (t.date || '').startsWith(prefix));
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/lib/bank.js
   Version: v103.0.22
   Batch: B25-4
   ═══════════════════════════════════════════ */