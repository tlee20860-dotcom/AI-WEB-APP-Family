// ============================================
// funds-allocation.js — 保單關聯基金 UI
// ============================================

import { render, esc, toast } from '../app-ui.js';
import { getList } from '../app-data.js';

let _currentAlloc = [];

export function renderFundsAllocation(containerId, initial = [], onUpdate = null) {
  _currentAlloc = initial.map(x => ({ ...x }));
  const funds = getList('funds').filter(f => f.type === 'insurance' || f.type === 'standalone');

  const paint = () => {
    let totalPct = _currentAlloc.reduce((s, a) => s + Number(a.pct), 0);
    let html = `
      <div class="mecha-panel" style="margin-top:16px;">
        <div class="mecha-content">
          <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
            <div class="field-label" style="margin:0;">關聯基金分配</div>
            <div class="mono ${totalPct === 100 ? 'text-emerald' : 'text-red'}">總和: ${totalPct}%</div>
          </div>
          <div id="alloc-list">
            ${_currentAlloc.map((a, i) => {
              const fund = funds.find(f => f.id === a.fundId);
              return `
                <div style="display:flex; gap:8px; margin-bottom:8px; align-items:center;">
                  <span style="flex:1; font-size:13px;">${esc(fund?.name || a.fundId)}</span>
                  <input type="number" class="input" style="width:80px;" value="${a.pct}" onchange="window.__updateFundPct(${i}, this.value)">
                  <span style="font-size:12px;">%</span>
                  <button class="btn btn-ghost" style="color:#EF4444;" onclick="window.__removeFundAlloc(${i})">移除</button>
                </div>
              `;
            }).join('')}
          </div>
          <button class="btn btn-ghost" onclick="window.__addFundAlloc()">+ 新增基金</button>
        </div>
      </div>
    `;
    render(containerId, html);
    if (onUpdate) onUpdate(_currentAlloc);
  };

  window.__addFundAlloc = () => {
    const used = _currentAlloc.map(a => a.fundId);
    const avail = funds.filter(f => !used.includes(f.id));
    if (!avail.length) return toast('無可用基金', 'error');
    _currentAlloc.push({ fundId: avail[0].id, pct: 0 });
    paint();
  };

  window.__updateFundPct = (idx, val) => {
    _currentAlloc[idx].pct = Number(val) || 0;
    paint();
  };

  window.__removeFundAlloc = (idx) => {
    _currentAlloc.splice(idx, 1);
    paint();
  };

  paint();
}

export function getFundsAllocationValue() {
  return _currentAlloc;
}