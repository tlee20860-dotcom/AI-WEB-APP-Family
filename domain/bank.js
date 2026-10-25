// ============================================
// bank.js — 銀行業務輔助（V2 重構版）
// 位置：domain/bank.js
// 說明：集中銀行餘額計算與交易生成。不包含 UI 渲染。
// ============================================

import { addBankTransaction } from '../db/write.js';
import { roundHKD } from '../ui/format.js'; // 假設未來的 format.js 有 roundHKD
import { todayISO } from '../ui/format.js';

export const BANK_TXN_TYPES = {
  IN: 'in',
  OUT: 'out',
  TRANSFER: 'transfer',
};

export const BANK_TXN_CATEGORIES = {
  CONTRIBUTION: 'contribution',
  EXPENSE: 'expense',
  INSURANCE: 'insurance',
  REIMBURSEMENT: 'reimbursement',
  MANUAL: 'manual',
};

/* ============================================
   1. 餘額計算
   ============================================ */

/**
 * 計算單一銀行帳號在特定年月的餘額
 * @param {object} bankAccount - 銀行帳號物件
 * @param {Array} transactions - 該帳號的所有交易紀錄
 * @param {string|number} targetYear 
 * @param {string|number} targetMonth 
 */
export function calcBankBalance(bankAccount, transactions, targetYear, targetMonth) {
  if (!bankAccount) return 0;

  const initial = Number(bankAccount.initialBalance) || 0;
  const initY = Number(bankAccount.initialYear) || 0;
  const initM = Number(bankAccount.initialMonth) || 0;

  // 若無初始年月，直接回傳初始餘額
  if (!initY || !initM) return initial;

  const tY = Number(targetYear);
  const tM = Number(targetMonth);

  // 若目標年月早於初始年月，直接回傳初始餘額
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
      balance -= amount; // 內部轉帳視為出帳（若需精確處理轉入帳號，需額外邏輯）
    }
  });

  return balance;
}

/**
 * 計算所有銀行帳號的總餘額
 */
export function calcTotalBankBalance(bankAccounts, allTransactions, targetYear, targetMonth) {
  let total = 0;
  (bankAccounts || []).forEach((acc) => {
    const txns = (allTransactions || []).filter((t) => t.bankId === acc.id);
    total += calcBankBalance(acc, txns, targetYear, targetMonth);
  });
  return total;
}

/* ============================================
   2. 交易生成輔助
   ============================================ */

/**
 * 為支出建立出帳交易
 */
export async function createTransactionForExpense({ bankId, memberId, amount, date, expenseId, note = '' }) {
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

/**
 * 為保險扣款建立出帳交易
 */
export async function createTransactionForInsurance({ bankId, memberId, amount, date, policyId, note = '' }) {
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

/**
 * 為家用轉入建立入帳交易
 */
export async function createTransactionForContribution({ bankId, memberId, amount, date, note = '' }) {
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

/* ═══ EOF ═══
F: domain/bank.js
V: 1792900260
W: ai-system-20261024-012#21
═══ EOF ═══ */