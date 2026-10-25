// ============================================
// format.js — 格式化與工具函式（V2 重構版）
// 位置：ui/format.js
// 說明：集中管理全站的金額、數字、日期格式化，以及 HTML 轉義。
//       防止 XSS 與確保顯示一致。
// ============================================

/* ============================================
   1. HTML 轉義 (防止 XSS)
   ============================================ */
const _ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function esc(v, fallback = '') {
  if (v == null) return fallback;
  return String(v).replace(/[&<>"']/g, (c) => _ESCAPE_MAP[c]);
}

/* ============================================
   2. 金額與數字格式化
   ============================================ */

/**
 * 格式化為 HK$ 顯示
 */
export function formatHKD(amount) {
  if (amount == null || isNaN(amount)) return 'HK$ 0';
  const rounded = Math.round(Number(amount));
  return 'HK$ ' + rounded.toLocaleString('zh-HK');
}

/**
 * 格式化為純數字（千分位）
 */
export function formatNumber(amount) {
  if (amount == null || isNaN(amount)) return '0';
  const rounded = Math.round(Number(amount));
  return rounded.toLocaleString('zh-HK');
}

/**
 * 四捨五入至整數
 */
export function roundHKD(value) {
  const n = Number(value);
  return isNaN(n) ? 0 : Math.round(n);
}

/**
 * 格式化百分比
 */
export function formatPercent(value, digits = 2) {
  const n = Number(value);
  if (isNaN(n)) return '0%';
  return `${n.toFixed(digits)}%`;
}

/* ============================================
   3. 日期工具
   ============================================ */

/**
 * 取得今天的 YYYY-MM-DD
 */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 格式化日期字串
 */
export function formatDate(val) {
  if (!val) return '—';
  return esc(String(val));
}

/* ============================================
   4. 通用 Cell 格式化（供表格使用）
   ============================================ */
export function formatCellValue(val, type) {
  if (val == null || val === '') return '<span class="text-muted">—</span>';

  switch (type) {
    case 'number':
      return formatHKD(val);
    case 'number-plain':
      return formatNumber(val);
    case 'date':
      return formatDate(val);
    case 'select':
    case 'text':
    default:
      return esc(String(val));
  }
}

/* ============================================
   5. 其他輔助
   ============================================ */
export function debounce(fn, wait = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/* ═══ EOF ═══
F: ui/format.js
V: 1792900280
W: ai-system-20261024-012#23
═══ EOF ═══ */