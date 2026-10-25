// ============================================
// status.js — 狀態系統 SSOT（V2 重構版）
// 位置：config/status.js
// 說明：集中管理狀態代碼（pending/done/skipped）與舊資料相容映射。
// ============================================

/* ============================================
   1. 標準狀態代碼
   ============================================ */
export const STATUS = {
  PENDING: 'pending',
  DONE:    'done',
  SKIPPED: 'skipped',
};

/* ============================================
   2. 舊名稱 → 新代碼（相容層）
   ============================================ */
export const LEGACY_MAP = {
  // pending 類
  '未處理': STATUS.PENDING,
  '未還款': STATUS.PENDING,
  '未付款': STATUS.PENDING,
  '未扣款': STATUS.PENDING,
  '未轉入': STATUS.PENDING,
  // done 類
  '已處理': STATUS.DONE,
  '已還款': STATUS.DONE,
  '已付款': STATUS.DONE,
  '已扣款': STATUS.DONE,
  '已轉入': STATUS.DONE,
  // skipped 類
  '不適用': STATUS.SKIPPED,
};

/* ============================================
   3. 顯示文字（依來源）
   ============================================ */
const LABELS_DEFAULT = {
  [STATUS.PENDING]: '未處理',
  [STATUS.DONE]:    '已處理',
  [STATUS.SKIPPED]: '不適用',
};

const LABELS_BY_SOURCE = {
  personal:  { [STATUS.PENDING]: '未處理', [STATUS.DONE]: '已處理', [STATUS.SKIPPED]: '不適用' },
  fixed:     { [STATUS.PENDING]: '未付款', [STATUS.DONE]: '已付款', [STATUS.SKIPPED]: '不適用' },
  insurance: { [STATUS.PENDING]: '未扣款', [STATUS.DONE]: '已扣款', [STATUS.SKIPPED]: '不適用' },
  income:    { [STATUS.PENDING]: '未轉入', [STATUS.DONE]: '已轉入', [STATUS.SKIPPED]: '不適用' },
};

/* ============================================
   4. 核心 API
   ============================================ */

/**
 * 正規化任意輸入為標準代碼
 * @param {string} raw 
 * @returns {'pending'|'done'|'skipped'}
 */
export function normalize(raw) {
  if (raw == null || raw === '') return STATUS.PENDING;
  if (raw === STATUS.PENDING || raw === STATUS.DONE || raw === STATUS.SKIPPED) {
    return raw;
  }
  return LEGACY_MAP[raw] || STATUS.PENDING;
}

/**
 * 是否為「完成」狀態
 * @param {string} raw 
 * @returns {boolean}
 */
export function isDone(raw) {
  const code = normalize(raw);
  return code === STATUS.DONE || code === STATUS.SKIPPED;
}

/**
 * 取得顯示文字
 * @param {string} raw 
 * @param {Object} [opts]
 * @param {'personal'|'fixed'|'insurance'|'income'} [opts.source] 
 * @returns {string}
 */
export function label(raw, opts = {}) {
  const code = normalize(raw);
  const source = opts.source;

  if (source && LABELS_BY_SOURCE[source] && LABELS_BY_SOURCE[source][code]) {
    return LABELS_BY_SOURCE[source][code];
  }
  return LABELS_DEFAULT[code];
}

/**
 * 取得下拉選項
 * @param {Object} [opts]
 * @param {'personal'|'fixed'|'insurance'|'income'} [opts.source]
 * @param {boolean} [opts.includeSkipped=false]
 * @returns {Array<{value: string, label: string}>}
 */
export function options(opts = {}) {
  const codes = [STATUS.PENDING, STATUS.DONE];
  if (opts.includeSkipped) codes.push(STATUS.SKIPPED);
  return codes.map((code) => ({
    value: code,
    label: label(code, { source: opts.source }),
  }));
}

/**
 * 取得 badge class
 * @param {string} raw 
 * @returns {string}
 */
export function badgeClass(raw) {
  const code = normalize(raw);
  if (code === STATUS.DONE) return 'badge-success';
  if (code === STATUS.SKIPPED) return 'badge-muted';
  return 'badge-pending';
}

/* ═══ EOF ═══
F: config/status.js
V: 1792900170
W: ai-system-20261024-012#12
═══ EOF ═══ */