// ============================================
// stats-cards.js — 統計卡渲染組件
// ============================================

import { esc, render } from '../app-ui.js';

export function renderStats(containerId, cards) {
  const html = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
      ${cards.map(c => `
        <div class="mecha-panel">
          <div class="mecha-content" style="padding:16px;">
            <div style="font-size:11px; color:var(--text-muted); font-family:var(--font-mono); text-transform:uppercase; margin-bottom:8px;">
              ${esc(c.title)}
            </div>
            <div class="mono ${c.color || ''}" style="font-size:20px; font-weight:700;">
              ${esc(c.value)}
            </div>
            ${c.hint ? `<div style="font-size:10px; color:var(--text-muted); margin-top:4px;">${esc(c.hint)}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  render(containerId, html);
}