// ============================================
// portfolio.js — 基金投資表
// ============================================

import { AppState } from '../app-core.js';
import { render, esc, toast, openModal, getFormData, buildFormHtml } from '../app-ui.js';
import { renderStats } from '../components/stats-cards.js';
import { renderControls } from '../components/page-controls.js';
import { getDatabase, ref, onValue, push, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { formatHKD } from '../app-data.js';
import { getFundCostMap, findPolicyByFund } from '../app-domain.js';
import { openEntityModal } from '../entity/entity-modal.js';

export function mount(container) {
  const db = getDatabase();
  const fid = AppState.currentFamilyId;
  const unsubs = [];
  let state = { funds: {}, policies: {} };

  const paint = () => {
    const { year, month } = AppState.getYearMonth();
    const m = month === 'all' ? '12' : month;
    
    const funds = Object.entries(state.funds).map(([id, f]) => ({ id, ...f }));
    const policies = Object.entries(state.policies).map(([id, p]) => ({ id, ...p }));

    const costMaps = {};
    policies.forEach(p => { costMaps[p.id] = getFundCostMap(p, funds, year, m); });

    let totalCost = 0;
    let totalValue = 0;
    funds.forEach(f => {
      if (f.type === 'insurance') {
        const p = findPolicyByFund(f, policies);
        totalCost += (p && costMaps[p.id]) ? (costMaps[p.id][f.id] || 0) : (Number(f.cost) || 0);
      } else {
        totalCost += Number(f.cost) || 0;
      }
      totalValue += Number(f.currentValue) || 0;
    });
    const pnl = totalValue - totalCost;
    const pnlPct = totalCost > 0 ? ((pnl / totalCost) * 100).toFixed(2) : '0.00';

    const html = `
      <div class="page-header" style="margin-bottom:20px;">
        <h1 class="page-title" style="color:var(--primary); font-family:var(--font-mono);">[ 基金投資表 ]</h1>
      </div>
      <div id="stats-root"></div>
      <div id="controls-root"></div>
      
      <div id="insurance-funds" style="margin-bottom:24px;"></div>
      <div id="standalone-funds"></div>
    `;
    render(container, html);

    renderStats('stats-root', [
      { title: '總投入成本', value: formatHKD(totalCost), hint: `共 ${funds.length} 筆` },
      { title: '總現時價值', value: formatHKD(totalValue), color: 'text-emerald' },
      { title: '總帳面盈虧', value: `${pnl >= 0 ? '+' : ''}${formatHKD(pnl)} (${pnlPct}%)`, color: pnl >= 0 ? 'text-emerald' : 'text-red' }
    ]);
    renderControls('controls-root', { showViewToggle: false });

    const insList = funds.filter(f => f.type === 'insurance');
    const stdList = funds.filter(f => f.type !== 'insurance');

    const cardHtml = (f) => {
      const p = f.type === 'insurance' ? findPolicyByFund(f, policies) : null;
      const cost = (p && costMaps[p.id]) ? (costMaps[p.id][f.id] || 0) : (Number(f.cost) || 0);
      const val = Number(f.currentValue) || 0;
      const pf = val - cost;
      const pfPct = cost > 0 ? ((pf / cost) * 100).toFixed(2) : '0.00';
      
      return `
        <div class="mecha-panel">
          <div class="mecha-content">
            <div style="font-size:16px; font-weight:700; color:var(--primary); margin-bottom:4px;">${esc(f.name)}</div>
            ${p ? `<div style="font-size:11px; color:var(--text-muted); margin-bottom:12px;">關聯保單：${esc(p.name)}</div>` : '<div style="margin-bottom:12px;"></div>'}
            
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
              <span style="color:var(--text-muted);">投入成本</span>
              <span class="mono">${formatHKD(cost)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
              <span style="color:var(--text-muted);">現時價值</span>
              <span class="mono text-emerald">${formatHKD(val)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:12px;">
              <span style="color:var(--text-muted);">盈虧</span>
              <span class="mono ${pf >= 0 ? 'text-emerald' : 'text-red'}">${pf >= 0 ? '+' : ''}${formatHKD(pf)} (${pfPct}%)</span>
            </div>
            
            <div style="margin-top:16px; display:flex; gap:8px; justify-content:flex-end; border-top:1px dashed var(--border); padding-top:12px;">
              <button class="btn btn-ghost" onclick="window.__fundSnap('${f.id}', '${esc(f.name)}')" style="padding:4px 10px; font-size:11px;">快照</button>
              <button class="btn btn-ghost" onclick="window.__fundEdit('${f.id}')" style="padding:4px 10px; font-size:11px;">編輯</button>
            </div>
          </div>
        </div>
      `;
    };

    if (insList.length > 0) {
      render('insurance-funds', `
        <div class="mecha-title">保險基金</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
          ${insList.map(cardHtml).join('')}
        </div>
      `);
    } else {
      render('insurance-funds', `<div class="mecha-title">保險基金</div><div class="mecha-panel"><div class="mecha-content text-muted">尚無保險基金</div></div>`);
    }

    if (stdList.length > 0) {
      render('standalone-funds', `
        <div class="mecha-title">獨立基金</div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
          ${stdList.map(cardHtml).join('')}
        </div>
      `);
    } else {
      render('standalone-funds', `<div class="mecha-title">獨立基金</div><div class="mecha-panel"><div class="mecha-content text-muted">尚無獨立基金</div></div>`);
    }

    window.__fundEdit = (id) => openEntityModal('fund', 'edit', id, funds, paint);
    window.__fundSnap = async (fundId, name) => {
      const fields = [
        { id: 'date', label: '估值日', type: 'text', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        { id: 'shares', label: '單位數目', type: 'number', required: true },
        { id: 'nav', label: '基金價格 (USD)', type: 'number', required: true }
      ];
      const ok = await openModal(`輸入快照 - ${name}`, buildFormHtml(fields));
      if (!ok) return;
      const data = getFormData(fields);
      await set(ref(db, `families/${fid}/funds/${fundId}/snapshots/${data.date}`), {
        shares: Number(data.shares), nav: Number(data.nav), createdAt: Date.now()
      });
      toast('✅ 已儲存快照');
    };
  };

  const paths = [['funds', 'funds'], ['policies', 'insurance_policies']];
  paths.forEach(([key, p]) => {
    unsubs.push(onValue(ref(db, `families/${fid}/${p}`), (snap) => {
      state[key] = snap.val() || {};
      paint();
    }));
  });

  unsubs.push(AppState.on('ym-change', paint));
  paint();

  return () => unsubs.forEach(u => u && u());
}