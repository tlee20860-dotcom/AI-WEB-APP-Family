// ============================================
// page-controls.js — 年月與檢視切換控制列
// ============================================

import { render } from '../app-ui.js';
import { AppState } from '../app-core.js';

export function renderControls(containerId, options = {}) {
  const { showYear = true, showMonth = true, showViewToggle = false } = options;
  const cur = AppState.getYearMonth();
  const years = [];
  const now = new Date().getFullYear();
  for (let y = now - 3; y <= now + 5; y++) years.push(y);

  const html = `
    <div style="display:flex; gap:12px; align-items:center; margin-bottom:20px; flex-wrap:wrap; justify-content:space-between;">
      <div style="display:flex; gap:12px; align-items:center;">
        ${showYear ? `
          <select class="select" data-ctrl="year" style="width:auto;">
            ${years.map(y => `<option value="${y}" ${y==cur.year?'selected':''}>${y} 年</option>`).join('')}
          </select>
        ` : ''}
        ${showMonth ? `
          <select class="select" data-ctrl="month" style="width:auto;">
            <option value="all" ${cur.month==='all'?'selected':''}>全部月份</option>
            ${Array.from({length:12},(_,i)=>i+1).map(m => {
              const val = String(m).padStart(2,'0');
              return `<option value="${val}" ${val===cur.month?'selected':''}>${m} 月</option>`;
            }).join('')}
          </select>
        ` : ''}
      </div>
      ${showViewToggle ? `
        <div style="display:flex; gap:4px; background:var(--bg-panel); padding:4px; border:1px solid var(--border);">
          <button class="btn ${AppState.currentView==='table'?'btn-primary':'btn-ghost'}" data-ctrl="view" data-val="table" style="padding:4px 12px; font-size:12px;">表格</button>
          <button class="btn ${AppState.currentView==='card'?'btn-primary':'btn-ghost'}" data-ctrl="view" data-val="card" style="padding:4px 12px; font-size:12px;">卡片</button>
        </div>
      ` : ''}
    </div>
  `;
  render(containerId, html);
}

export function bindControls(containerId, onChange) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.addEventListener('change', (e) => {
    const ctrl = e.target.closest('[data-ctrl]');
    if (!ctrl) return;
    if (ctrl.dataset.ctrl === 'year') {
      AppState.setYearMonth(ctrl.value, AppState.month);
      onChange();
    } else if (ctrl.dataset.ctrl === 'month') {
      AppState.setYearMonth(AppState.year, ctrl.value);
      onChange();
    }
  });
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ctrl="view"]');
    if (!btn) return;
    AppState.currentView = btn.dataset.val;
    onChange();
  });
}