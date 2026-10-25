// ============================================
// table.js — 通用資料表格（V2 重構版）
// 位置：ui/table.js
// 說明：根據 columns 定義與 rows 資料，自動渲染表格。
//       支援自訂渲染器 (Resolvers) 與操作按鈕。
// ============================================

import { getColumns, getResolvers } from '../config/columns.js';
import { esc } from './format.js';

/**
 * 渲染資料表格
 * @param {Object} options
 * @param {string|HTMLElement} options.container - 容器 ID 或 DOM
 * @param {Array} options.rows - 資料陣列
 * @param {string} options.columnsKey - 關聯到 config/columns.js 的 Key
 * @param {Function} [options.renderActions] - (row) => HTML 字串 (操作按鈕)
 * @param {Function} [options.onRowClick] - (row) => void (點擊整行的事件)
 * @param {string} [options.emptyText] - 無資料時的顯示文字
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

  // 生成表頭
  const theadHtml = `
    <thead>
      <tr>
        ${columns.map((c) => `<th class="${c.type === 'number' ? 'num' : ''}">${esc(c.label)}</th>`).join('')}
        ${hasActions ? '<th style="width:150px; text-align:right;">操作</th>' : ''}
      </tr>
    </thead>
  `;

  // 生成表身
  const tbodyHtml = `
    <tbody>
      ${rows.map((row, index) => {
        const tds = columns.map((col) => {
          const val = row[col.id];
          const resolver = resolvers[col.id];
          const content = resolver ? resolver(val, row) : esc(val);
          return `<td class="${col.type === 'number' ? 'num' : ''}">${content}</td>`;
        }).join('');

        const actionsHtml = hasActions ? `<td style="text-align:right;">${renderActions(row)}</td>` : '';

        return `<tr data-index="${index}" ${onRowClick ? 'style="cursor:pointer;"' : ''}>${tds}${actionsHtml}</tr>`;
      }).join('')}
    </tbody>
  `;

  // 組合並插入
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

  // 綁定行點擊事件
  if (onRowClick) {
    root.querySelector('tbody').addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-index]');
      // 如果點擊的是按鈕，就不觸發 rowClick
      if (tr && !e.target.closest('button')) {
        onRowClick(rows[Number(tr.dataset.index)]);
      }
    });
  }

  if (window.lucide) window.lucide.createIcons();
}

/**
 * 渲染卡片網格 (手機版或特定頁面用)
 * @param {Object} options 同上
 */
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
  const hasActions = typeof renderActions === 'function';

  // 假設第一欄是標題，第二欄是副標題，其餘是欄位內容
  const primaryCol = columns[0];
  const restCols = columns.slice(1);

  root.innerHTML = `
    <div class="data-cards-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
      ${rows.map((row, index) => {
        const primaryVal = row[primaryCol.id];
        const primaryResolver = resolvers[primaryCol.id];
        const primaryContent = primaryResolver ? primaryResolver(primaryVal, row) : esc(primaryVal);

        const fieldsHtml = restCols.map((col) => {
          const val = row[col.id];
          const resolver = resolvers[col.id];
          const content = resolver ? resolver(val, row) : esc(val);
          return `
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
              <span style="color:var(--text-muted);">${esc(col.label)}</span>
              <span style="font-weight:500;">${content}</span>
            </div>
          `;
        }).join('');

        const actionsHtml = hasActions 
          ? `<div style="margin-top:12px; padding-top:12px; border-top:1px dashed var(--border-color); display:flex; justify-content:flex-end; gap:8px;">${renderActions(row)}</div>` 
          : '';

        return `
          <div class="glass-card" style="padding:16px; display:flex; flex-direction:column;">
            <div style="font-size:16px; font-weight:700; color:var(--primary); margin-bottom:12px;">${primaryContent}</div>
            <div style="flex:1;">${fieldsHtml}</div>
            ${actionsHtml}
          </div>
        `;
      }).join('')}
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

/* ============================================
   內部工具
   ============================================ */
function _resolveEl(target) {
  if (typeof target === 'string') return document.getElementById(target);
  if (target instanceof HTMLElement) return target;
  return null;
}

/* ═══ EOF ═══
F: ui/table.js
V: 1792900450
W: ai-system-20261024-012#40
═══ EOF ═══ */