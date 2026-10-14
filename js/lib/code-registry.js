// ============================================
// code-registry.js — 編號生成 SSOT（v1.0.0）
// 位置：js/lib/code-registry.js
// ============================================
// 依 D-008 / D-059 / D-060：
//   ✅ 編號存實體節點；查最大 + 1
//   ✅ 無計數器；無 transaction
//   ✅ 保單子類短碼 3 種：NORM / FUND / SAVE
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
} from '../core/db.js';

/* ============================================
   1. 大類前綴對照（D-008）
   ============================================ */
export const PREFIX_MAP = {
  member:      'MEM',
  bank:        'PAY-BANK',
  bankAccount: 'PAY-BANK',   /* 子類由 extra 決定：{code}-{type} */
  category:    'CAT',
  item:        'ITEM',
  payment:     'PAY',
  company:     'COMP',
  policy:      'POL',
  fund:        'FUND',       /* 保險基金 → FUND-INS；獨立基金 → FUND */
  income:      'INC',
  bankTxn:     'TXN',
};

/* ============================================
   2. 保單子類短碼（D-060：3 種）
   ============================================ */
export const POLICY_SUBTYPE_MAP = {
  normal:         'NORM',   /* 普通類保險 */
  fund_insurance: 'FUND',   /* 基金類保險 */
  savings:        'SAVE',   /* 儲蓄類保險 */
};

/* ============================================
   3. 支出類別子類短碼（依 C-09 §1.4）
   ============================================ */
export const CATEGORY_SHORTCODES = {
  '學校類':    'SCH',
  '交通類':    'TRA',
  '醫療類':    'MED',
  '銀行類':    'BNK',
  '其他':      'OTH',
};

/* ============================================
   4. 核心生成演算法（D-008）
   ============================================
   步驟：
   1. 過濾出所有 code 以 {prefix}- 開頭的實體
   2. 提取序號部分（001, 002, ...）
   3. 取最大值 N
   4. 回傳 {prefix}-{N+1 補零到 3 位}
   5. 檢查是否重複 → 若重複，拋錯
   ============================================ */
export function generateCode(prefix, existingList) {
  if (!prefix) throw new Error('generateCode 缺少 prefix');
  if (!Array.isArray(existingList)) existingList = [];

  const prefixDash = prefix + '-';
  const seqs = [];

  existingList.forEach((item) => {
    const code = item?.code;
    if (!code || typeof code !== 'string') return;
    if (!code.startsWith(prefixDash)) return;

    /* 取 prefix- 之後的序號部分（可能為 001 或 SUB-001，依子類） */
    const rest = code.slice(prefixDash.length);
    const parts = rest.split('-');
    const seqPart = parts[parts.length - 1];
    const n = parseInt(seqPart, 10);
    if (!isNaN(n) && n > 0) seqs.push(n);
  });

  const maxN = seqs.length > 0 ? Math.max(...seqs) : 0;
  const nextN = maxN + 1;
  return prefixDash + String(nextN).padStart(3, '0');
}

/* ============================================
   5. 子類短碼生成（依 entityType + extra）
   ============================================ */
export function generateWithSubtype(prefix, subtype, existingList) {
  if (!subtype) return generateCode(prefix, existingList);
  return generateCode(`${prefix}-${subtype}`, existingList);
}

/* ============================================
   6. 依上下文自動決定子類短碼（D-010）
   ============================================ */
export function getSubtypeFromContext(entityType, extra = {}) {
  switch (entityType) {
    case 'policy': {
      const t = extra.type || 'normal';
      return POLICY_SUBTYPE_MAP[t] || 'NORM';
    }
    case 'category': {
      const name = (extra.name || '').trim();
      return CATEGORY_SHORTCODES[name] || null;
    }
    case 'fund': {
      return extra.type === 'insurance' ? 'INS' : null;
    }
    case 'bankAccount': {
      const parts = [];
      if (extra.bankCode) parts.push(extra.bankCode);
      if (extra.type) parts.push(extra.type === 'family' ? 'FAM' : 'PER');
      return parts.length > 0 ? parts.join('-') : null;
    }
    default:
      return null;
  }
}

/* ============================================
   7. 主入口：依 entityType 生成完整編號
   ============================================
   回傳：{ code, prefix, subtype }
   ============================================ */
export async function generateCodeFor(entityType, extra = {}) {
  const prefix = PREFIX_MAP[entityType];
  if (!prefix) throw new Error(`未知的 entityType：${entityType}`);

  const list = await _fetchExistingList(entityType);
  const subtype = getSubtypeFromContext(entityType, extra);

  let code;
  if (subtype) {
    code = generateWithSubtype(prefix, subtype, list);
  } else {
    code = generateCode(prefix, list);
  }

  /* 重複檢測（保險，正常情況不會重複） */
  if (checkDuplicate(code, list)) {
    throw new Error(`編號重複：${code}，請重試`);
  }

  return { code, prefix, subtype };
}

/* ============================================
   8. 重複檢測（D-009）
   ============================================ */
export function checkDuplicate(code, existingList) {
  if (!Array.isArray(existingList)) return false;
  return existingList.some((item) => item?.code === code);
}

/* ============================================
   9. 抓現有實體列表（Q127 A）
   ============================================ */
async function _fetchExistingList(entityType) {
  switch (entityType) {
    case 'member':      return await getMembersOnce();
    case 'bank':        return await getBanksOnce();
    case 'bankAccount': return await getBankAccountsOnce();
    case 'category':    return await getCategoriesOnce();
    case 'item':        return await getItemsOnce();
    case 'payment':     return await getPaymentMethodsOnce();
    case 'company':     return await getInsuranceCompaniesOnce();
    case 'policy':      return await getInsurancePoliciesOnce();
    case 'fund':        return await getFundsOnce();
    default:
      console.warn(`[code-registry] 未知 entityType：${entityType}`);
      return [];
  }
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/lib/code-registry.js
   Version: 1791900400
   Batch: B34-4
   Writer: A20261013-004#076
   ═══════════════════════════════════════════ */