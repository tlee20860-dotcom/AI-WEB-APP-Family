// ============================================
// table.js — 通用資料表格（V2 重構版 - 支援手機卡片化）
// 位置：ui/table.js
// ============================================

import { getColumns, getResolvers } from '../config/columns.js';
import { esc } from './format.js';

/**
 * 渲染資料表格（自動偵測手機版轉卡片）
 */
export function renderTable(options) {
  const root = _resolveEl(options.container);
  if (!root) return;

  const { rows = [], columnsKey, renderActions, onRowClick, emptyText = '尚無資料' } = options;

  if (rows.length === 0) {
    root.innerHTML = `<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">${esc(emptyText)}</div>`;
    return;
  }

  const columns = getColumns(columnsKey);
  const resolvers = getResolvers(columnsKey);
  const hasActions = typeof renderActions === 'function';

  // 判斷是否為手機版 (寬度小於 768px 且欄位數大於 3)
  const isMobile = window.innerWidth < 768 && columns.length > 3;

  if (isMobile) {
    _renderMobileCards(root, rows, columns, resolvers, renderActions, onRowClick);
  } else {
    _renderDesktopTable(root, rows, columns, resolvers, renderActions, onRowClick);
  }
}

/* ============================================
   桌面版：傳統表格
   ============================================ */
function _renderDesktopTable(root, rows, columns, resolvers, renderActions, onRowClick) {
  const hasActions = typeof renderActions === 'function';

  const theadHtml = `
    <thead>
      <tr>
        ${columns.map((c) => `<th class="${c.type === 'number' ? 'num' : ''}">${esc(c.label)}</th>`).join('')}
        ${hasActions ? '<th style="width:150px; text-align:right;">操作</th>' : ''}
      </tr>
    </thead>
  `;

  const tbodyHtml = `
    <tbody>
      ${rows.map((row, index) => {
        const tds = columns.map((col) => {
          const val = row[col.id];
          const resolver = resolvers[col.id];
          const content = resolver ? resolver(val, row) : esc(val);
          return `<td class="${col.type === 'number' ? 'num' : ''}">${content}</td>`;
        }).join('');

        const actionsHtml = hasActions ? `<td style="text-align:right; white-space:nowrap;">${renderActions(row)}</td>` : '';

        return `<tr data-index="${index}" ${onRowClick ? 'style="cursor:pointer;"' : ''}>${tds}${actionsHtml}</tr>`;
      }).join('')}
    </tbody>
  `;

  root.innerHTML = `
    <div class="glass-card" style="padding:0; overflow:hidden;">
      <div class="data-table-scroll-wrapper" style="overflow-x:auto;">
        <table class="data-table" style="width:100%; border-collapse:collapse;">
          ${theadHtml}
          ${tbodyHtml}
        </table>
      </div>
    </div>
  `;

  _bindRowClick(root, onRowClick, rows);
}

/* ============================================
   手機版：卡片列表
   ============================================ */
function _renderMobileCards(root, rows, columns, resolvers, renderActions, onRowClick) {
  const hasActions = typeof renderActions === 'function';
  const primaryCol = columns[0]; // 第一欄作為卡片標題
  const restCols = columns.slice(1); // 其餘欄位

  const cardsHtml = rows.map((row, index) => {
    const primaryVal = row[primaryCol.id];
    const primaryResolver = resolvers[primaryCol.id];
    const primaryContent = primaryResolver ? primaryResolver(primaryVal, row) : esc(primaryVal);

    const fieldsHtml = restCols.map((col) => {
      const val = row[col.id];
      const resolver = resolvers[col.id];
      const content = resolver ? resolver(val, row) : esc(val);
      return `
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;">
          <span style="color:var(--text-muted);">${esc(col.label)}</span>
          <span style="font-weight:500; text-align:right;">${content}</span>
        </div>
      `;
    }).join('');

    const actionsHtml = hasActions 
      ? `<div style="margin-top:12px; padding-top:12px; border-top:1px dashed var(--border-color); display:flex; justify-content:flex-end; gap:8px;">${renderActions(row)}</div>` 
      : '';

    return `
      <div class="glass-card" data-index="${index}" style="padding:16px; margin-bottom:12px; ${onRowClick ? 'cursor:pointer;' : ''}">
        <div style="font-size:16px; font-weight:700; color:var(--primary); margin-bottom:12px; word-break:break-word;">${primaryContent}</div>
        <div>${fieldsHtml}</div>
        ${actionsHtml}
      </div>
    `;
  }).join('');

  root.innerHTML = `<div class="mobile-card-list">${cardsHtml}</div>`;

  _bindRowClick(root, onRowClick, rows);
}

/* ============================================
   內部工具
   ============================================ */
function _resolveEl(target) {
  if (typeof target === 'string') return document.getElementById(target);
  if (target instanceof HTMLElement) return target;
  return null;
}

function _bindRowClick(root, onRowClick, rows) {
  if (onRowClick) {
    root.addEventListener('click', (e) => {
      // 如果點擊的是按鈕，就不觸發 rowClick
      if (e.target.closest('button')) return;
      const trOrCard = e.target.closest('[data-index]');
      if (trOrCard) {
        onRowClick(rows[Number(trOrCard.dataset.index)]);
      }
    });
  }
}

// 保留舊的 renderCards (如果有地方直接呼叫)
export function renderCards(options) {
  const root = _resolveEl(options.container);
  if (!root) return;
  const { rows = [], columnsKey, renderActions, emptyText = '尚無資料' } = options;
  if (rows.length === 0) {
    root.innerHTML = `<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">${esc(emptyText)}</div>`;
    return;
  }
  const columns = getColumns(columnsKey);
  const resolvers = getResolvers(columnsKey);
  // ... (舊版 renderCards 邏輯保持不變，直接複用上面 _renderMobileCards 即可)
  _renderMobileCards(root, rows, columns, resolvers, renderActions, options.onRowClick);
}

/* ═══ EOF ═══
F: ui/table.js
V: 1792900690
W: ai-system-20261024-012#60
═══ EOF ═══ */