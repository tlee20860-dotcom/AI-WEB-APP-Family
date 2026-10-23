// ============================================
// data-table.js — 表格渲染組件
// ============================================

import { esc, render } from '../app-ui.js';

export function renderTable(containerId, rows, columns, resolvers = {}, actions = null) {
  const html = `
    <div class="mecha-panel">
      <div class="mecha-content" style="padding:0; overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              ${columns.map(c => `<th style="${c.width ? `width:${c.width}px` : ''}">${esc(c.label)}</th>`).join('')}
              ${actions ? `<th style="width:120px;">操作</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, i) => `
              <tr>
                ${columns.map(c => {
                  const val = row[c.id];
                  const res = resolvers[c.id];
                  const content = res ? res(val, row) : esc(val);
                  return `<td class="${c.type === 'number' ? 'num' : ''}">${content}</td>`;
                }).join('')}
                ${actions ? `
                  <td>
                    <button class="btn btn-ghost" data-action="edit" data-idx="${i}" style="padding:2px 8px; font-size:11px;">編輯</button>
                    <button class="btn btn-ghost" data-action="delete" data-idx="${i}" style="padding:2px 8px; font-size:11px; color:#EF4444; border-color:#EF4444;">刪除</button>
                  </td>
                ` : ''}
              </tr>
            `).join('')}
            ${rows.length === 0 ? `<tr><td colspan="${columns.length + (actions?1:0)}" style="text-align:center; color:var(--text-muted); padding:20px;">無資料</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
  render(containerId, html);
}