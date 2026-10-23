// ============================================
// data-card.js — 卡片渲染組件
// ============================================

import { esc, render } from '../app-ui.js';

export function renderCards(containerId, rows, primaryKey, fields, resolvers = {}, actions = null) {
  const html = `
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
      ${rows.map((row, i) => `
        <div class="mecha-panel">
          <div class="mecha-content">
            <div style="font-size:16px; font-weight:700; color:var(--primary); margin-bottom:12px; font-family:var(--font-mono);">
              ${esc(row[primaryKey])}
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
              ${fields.map(f => {
                const val = row[f.id];
                const res = resolvers[f.id];
                return `
                  <div style="display:flex; justify-content:space-between; font-size:13px;">
                    <span style="color:var(--text-muted);">${esc(f.label)}</span>
                    <span>${res ? res(val, row) : esc(val)}</span>
                  </div>
                `;
              }).join('')}
            </div>
            ${actions ? `
              <div style="display:flex; gap:8px; justify-content:flex-end; border-top:1px dashed var(--border); padding-top:12px;">
                <button class="btn btn-ghost" data-action="edit" data-idx="${i}" style="padding:4px 10px; font-size:11px;">編輯</button>
                <button class="btn btn-danger" data-action="delete" data-idx="${i}" style="padding:4px 10px; font-size:11px;">刪除</button>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  render(containerId, html);
}