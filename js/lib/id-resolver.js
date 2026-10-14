// ============================================
// id-resolver.js — 編號查詢 SSOT（v1.0.0）
// 位置：js/lib/id-resolver.js
// ============================================
// 依 D-011：
//   ✅ 從編號查實體（遍歷）
//   ✅ 從編號展開關聯（遍歷）
//   ✅ 不做「從名稱查編號」
// ============================================

import {
  getMembersOnce,
  getBanksOnce,
  getBankAccountsOnce,
  getCategoriesOnce,
  getItemsOnce,
  getPaymentMethodsOnce,
  getInsuranceCompaniesOnce,
  getInsurancePoliciesOnce,
  getFundsOnce,
  getAllMemberExpensesOnce,
} from '../core/db.js';

/* ============================================
   1. entityPath 對照
   ============================================ */
const ENTITY_PATH_FETCHER = {
  member:      getMembersOnce,
  bank:        getBanksOnce,
  bankAccount: getBankAccountsOnce,
  category:    getCategoriesOnce,
  item:        getItemsOnce,
  payment:     getPaymentMethodsOnce,
  company:     getInsuranceCompaniesOnce,
  policy:      getInsurancePoliciesOnce,
  fund:        getFundsOnce,
};

/* ============================================
   2. 從編號查實體（D-011 §3.1）
   ============================================
   決策：遍歷實體列表，比對 code
   原因：對齊議題 2「無索引」；實體數量少，成本低
   ============================================ */
export async function getEntityByCode(entityType, code) {
  if (!entityType || !code) return null;
  const fetcher = ENTITY_PATH_FETCHER[entityType];
  if (!fetcher) {
    console.warn(`[id-resolver] 未知 entityType：${entityType}`);
    return null;
  }
  const list = await fetcher();
  return list.find((item) => item.code === code) || null;
}

/* ============================================
   3. 從編號展開關聯（D-011 §3.3）
   ============================================
   決策：即時遍歷所有實體，找出引用此編號的
   使用場景：保單詳情顯示關聯基金、支付方法樹狀展開
   ============================================ */
export async function getRelatedEntities(code) {
  if (!code) return {};

  const [
    policies,
    funds,
    expenses,
    bankAccounts,
  ] = await Promise.all([
    getInsurancePoliciesOnce(),
    getFundsOnce(),
    _getAllExpensesSafe(),
    getBankAccountsOnce(),
  ]);

  const target = await _findEntityByCode(code, [
    ...policies,
    ...funds,
    ...bankAccounts,
  ]);

  if (!target) return {};

  const related = {
    target,
    policies: [],
    funds: [],
    expenses: [],
    bankAccounts: [],
  };

  /* 若 target 是保單 → 找關聯基金 */
  if (target.type !== undefined || target.firstStartYear !== undefined) {
    related.funds = funds.filter((f) => f.policyId === target.id);
  }

  /* 若 target 是基金 → 找所屬保單 */
  if (target.policyId) {
    related.policies = policies.filter((p) => p.id === target.policyId);
  }

  /* 找引用此編號的支出 */
  related.expenses = expenses.filter((e) =>
    e.policyId === target.id || e.categoryId === target.id || e.itemId === target.id
  );

  return related;
}

/* ============================================
   4. 內部：找實體（不分類型）
   ============================================ */
async function _findEntityByCode(code, lists) {
  for (const list of lists) {
    const found = list.find((item) => item.code === code);
    if (found) return found;
  }
  return null;
}

/* ============================================
   5. 內部：安全取得全年支出（不拋錯）
   ============================================ */
async function _getAllExpensesSafe() {
  try {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return await getAllMemberExpensesOnce(y, m);
  } catch (err) {
    console.warn('[id-resolver] 取得支出失敗：', err);
    return [];
  }
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/lib/id-resolver.js
   Version: 1791900460
   Batch: B34-4
   Writer: A20261013-004#076
   ═══════════════════════════════════════════ */