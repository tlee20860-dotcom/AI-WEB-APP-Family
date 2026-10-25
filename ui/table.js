// ============================================
// table.js — 通用資料表格（V2 重構版）
// 位置：ui/table.js
// ============================================

import { getColumns, getResolvers } from '../config/columns.js';
import { esc } from './format.js';

/**
 * 渲染資料表格
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

  const theadHtml = `
    <thead>
      <tr>
        ${columns.map((c) => `<th class="${c.type === 'number' ? 'num' : ''}" style="white-space:nowrap;">${esc(c.label)}</th>`).join('')}
        ${hasActions ? '<th style="width:150px; text-align:right; white-space:nowrap;">操作</th>' : ''}
      </tr>
    </thead>
  `;

  const tbodyHtml = `
    <tbody>
      ${rows.map((row, index) => {
        const tds = columns.map((col) => {
          const val = row[col.id];
          const resolver = resolvers[col.id];
          // 如果沒有 resolver，就防呆轉字串
          let content = resolver ? resolver(val, row) : esc(val);
          
          // 如果是空值，給個破折號
          if (content === undefined || content === null || content === '') content = '<span class="text-muted">—</span>';

          // 針對數字欄位，避免「今年」這種標籤導致換行
          const isNum = col.type === 'number';
          return `<td class="${isNum ? 'num' : ''}" style="white-space:nowrap;">${content}</td>`;
        }).join('');

        const actionsHtml = hasActions ? `<td style="text-align:right; white-space:nowrap;">${renderActions(row)}</td>` : '';

        return `<tr data-index="${index}" ${onRowClick ? 'style="cursor:pointer;"' : ''}>${tds}${actionsHtml}</tr>`;
      }).join('')}
    </tbody>
  `;

  // 加上 min-width 確保表格不會被過度擠壓，並限制外層寬度防撐破
  root.innerHTML = `
    <div class="glass-card" style="padding:0; overflow:hidden; width:100%; max-width:100%;">
      <div class="data-table-scroll-wrapper" style="overflow-x:auto; -webkit-overflow-scrolling:touch;">
        <table class="data-table" style="width:100%; border-collapse:collapse; min-width:600px;">
          ${theadHtml}
          ${tbodyHtml}
        </table>
      </div>
    </div>
  `;

  _bindRowClick(root, onRowClick, rows);
}

/**
 * 渲染卡片列表
 */
export function renderCards(options) {
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
  
  const primaryCol = columns[0];
  const restCols = columns.slice(1);

  const cardsHtml = rows.map((row, index) => {
    const primaryVal = row[primaryCol.id];
    const primaryResolver = resolvers[primaryCol.id];
    const primaryContent = primaryResolver ? primaryResolver(primaryVal, row) : esc(primaryVal);

    const fieldsHtml = restCols.map((col) => {
      const val = row[col.id];
      const resolver = resolvers[col.id];
      let content = resolver ? resolver(val, row) : esc(val);
      if (content === undefined || content === null || content === '') content = '<span class="text-muted">—</span>';
      
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
      <div class="glass-card" data-index="${index}" style="padding:16px; margin-bottom:12px; width:100%; max-width:100%; ${onRowClick ? 'cursor:pointer;' : ''}">
        <div style="font-size:16px; font-weight:700; color:var(--primary); margin-bottom:12px; word-break:break-word;">${primaryContent}</div>
        <div>${fieldsHtml}</div>
        ${actionsHtml}
      </div>
    `;
  }).join('');

  root.innerHTML = `<div class="mobile-card-list" style="width:100%; max-width:100%;">${cardsHtml}</div>`;

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
      if (e.target.closest('button')) return;
      const trOrCard = e.target.closest('[data-index]');
      if (trOrCard) {
        onRowClick(rows[Number(trOrCard.dataset.index)]);
      }
    });
  }
}

/* ═══ EOF ═══
F: ui/table.js
V: 1792901280
W: webapp-20261025-001#9
═══ */