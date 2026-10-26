// ============================================
// portfolio.js — 基金投資表（V2 引擎版）
// 位置：pages/portfolio.js
// 說明：整合保險基金與獨立基金，支援歷史快照與對比。
//       已移除 entity-modal 幽靈依賴，並將動態 import 改為靜態引入。
// ============================================

import { AppState } from '../config/state.js';
import { 
  listenFunds, 
  listenInsurancePolicies, 
  getFundSnapshotListOnce, 
  saveFundSnapshot, 
  removeFundSnapshot,
  saveObject,
  pushObject,
  removeObject
} from '../db/index.js';
import { openModal, closeModal, openConfirm } from '../ui/modal.js';
import { createForm } from '../ui/form.js';
import { showToast } from '../ui/toast.js';
import { renderPageLayout } from '../ui/layout.js';
import { formatHKD, esc } from '../ui/format.js';
import { calcFundCostEstimate } from '../domain/insurance.js';

const DEFAULT_FX = 7.8;

export default {
  _unsubFunds: null,
  _unsubPolicies: null,
  _funds: [],
  _policies: [],
  _snapshots: {},

  async render() {
    // 1. 準備 Header Actions
    const headerActions = `
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" id="btn-add-fund">
          <i data-lucide="plus" style="width:16px;height:16px;"></i> 新增基金
        </button>
        <button type="button" class="btn btn-magenta" id="btn-import-snap">
          <i data-lucide="upload" style="width:16px;height:16px;"></i> 導入快照
        </button>
      </div>
    `;

    // 2. 準備控制列（年月）
    const controlsHtml = `<div id="portfolio-controls-period"></div>`;

    // 3. 呼叫統一引擎繪製骨架
    renderPageLayout({
      title: '基金投資表',
      headerActions,
      stats: [],
      controls: controlsHtml,
      listContainerId: 'portfolio-content-container'
    });

    // 4. 綁定按鈕
    document.getElementById('btn-add-fund').onclick = () => this._openFundModal();
    document.getElementById('btn-import-snap').onclick = () => this._openImportSnapshotModal();

    // 5. 初始化年月（僅作顯示用）
    const periodRoot = document.getElementById('portfolio-controls-period');
    if (periodRoot) {
      const ym = AppState.getYearMonth();
      periodRoot.innerHTML = `<span class="badge badge-info">估值基準：${ym.year} 年 ${ym.month === 'all' ? '12' : ym.month} 月</span>`;
    }

    // 6. 訂閱資料
    this._unsubFunds = listenFunds((funds) => {
      this._funds = funds;
      this._loadSnapshotsAndRender();
    });

    this._unsubPolicies = listenInsurancePolicies((policies) => {
      this._policies = policies;
      this._renderContent();
    });
  },

  async _loadSnapshotsAndRender() {
    const snapMap = {};
    for (const f of this._funds) {
      try {
        const snaps = await getFundSnapshotListOnce(f.id);
        snapMap[f.id] = snaps.length > 0 ? snaps[snaps.length - 1] : null;
      } catch (e) { snapMap[f.id] = null; }
    }
    this._snapshots = snapMap;
    this._renderContent();
  },

  _renderContent() {
    const container = document.getElementById('portfolio-content-container');
    if (!container) return;

    const { year, month } = AppState.getYearMonth();
    const y = year || String(new Date().getFullYear());
    const m = month === 'all' ? String(new Date().getMonth() + 1).padStart(2, '0') : month;

    const costMaps = {};
    this._policies.forEach(p => { costMaps[p.id] = _getCostMapForPolicy(p, this._funds, y, m); });

    let totalCost = 0;
    let totalValue = 0;

    const displayFunds = this._funds.map(f => {
      const snap = this._snapshots[f.id];
      const currentValue = snap ? (Number(snap.shares) * Number(snap.nav) * DEFAULT_FX) : (Number(f.currentValue) || 0);
      let estimatedCost = 0;
      
      if (f.type === 'insurance') {
        const policy = _findPolicyByFund(f, this._policies);
        if (policy && costMaps[policy.id]) estimatedCost = costMaps[policy.id][f.id] || 0;
        else estimatedCost = Number(f.cost) || 0;
      } else {
        estimatedCost = Number(f.cost) || 0;
      }
      
      totalCost += estimatedCost;
      totalValue += currentValue;
      
      return { ...f, currentValue: Math.round(currentValue), cost: estimatedCost };
    });

    const totalPnl = totalValue - totalCost;

    // 更新統計卡
    this._updateStats(totalCost, totalValue, totalPnl);

    const insFunds = displayFunds.filter(f => f.type === 'insurance');
    const standaloneFunds = displayFunds.filter(f => f.type !== 'insurance');

    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <i data-lucide="shield" style="width:16px;height:16px;color:var(--accent-danger);"></i>
          <span style="font-weight:700;color:var(--accent-danger);font-size:14px;">保險基金</span>
          <span class="text-muted" style="font-size:12px;">（掛於基金保險保單，每月自動累積供款）</span>
        </div>
        <div id="ins-funds-list" class="data-cards-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
          ${insFunds.length ? insFunds.map(f => this._cardHtml(f, _findPolicyByFund(f, this._policies))).join('') : '<div class="text-muted" style="padding:20px;">尚無保險基金</div>'}
        </div>
      </div>

      <div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <i data-lucide="line-chart" style="width:16px;height:16px;color:var(--primary);"></i>
          <span style="font-weight:700;color:var(--primary);font-size:14px;">獨立基金</span>
        </div>
        <div id="std-funds-list" class="data-cards-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
          ${standaloneFunds.length ? standaloneFunds.map(f => this._cardHtml(f, null)).join('') : '<div class="text-muted" style="padding:20px;">尚無獨立基金</div>'}
        </div>
      </div>
    `;

    this._bindCardEvents(container);
    if (window.lucide) window.lucide.createIcons();
  },

  _updateStats(cost, value, pnl) {
    const statsRoot = document.getElementById('page-stats-container');
    if (!statsRoot) return;
    statsRoot.style.display = 'grid';
    
    statsRoot.innerHTML = `
      <div class="glass-card" style="padding:16px; display:flex; flex-direction:column; gap:6px; min-width:0; overflow:hidden;">
        <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
          <i data-lucide="wallet" style="width:14px;height:14px; flex-shrink:0;"></i> 
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">總投入成本</span>
        </div>
        <div class="mono" style="font-size:20px; font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${formatHKD(cost)}
        </div>
      </div>
      <div class="glass-card" style="padding:16px; display:flex; flex-direction:column; gap:6px; min-width:0; overflow:hidden;">
        <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
          <i data-lucide="line-chart" style="width:14px;height:14px; flex-shrink:0;"></i> 
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">總現時價值</span>
        </div>
        <div class="mono" style="font-size:20px; font-weight:700; color:var(--primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${formatHKD(value)}
        </div>
      </div>
      <div class="glass-card" style="padding:16px; display:flex; flex-direction:column; gap:6px; min-width:0; overflow:hidden;">
        <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
          <i data-lucide="trending-up" style="width:14px;height:14px; flex-shrink:0;"></i> 
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">總帳面盈虧</span>
        </div>
        <div class="mono" style="font-size:20px; font-weight:700; color:${pnl >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${pnl >= 0 ? '+' : ''}${formatHKD(pnl)}
        </div>
      </div>
    `;
  },

  _cardHtml(f, policy) {
    const pnl = f.currentValue - f.cost;
    const pnlCls = pnl >= 0 ? 'text-emerald' : 'text-red';
    const pnlSign = pnl >= 0 ? '+' : '';
    const pnlPct = f.cost > 0 ? ((pnl / f.cost) * 100).toFixed(2) : '0.00';
    
    const meta = policy ? `<div style="font-size:11px; color:var(--text-muted); margin-top:4px;">關聯保單：${esc(policy.name)}</div>` : '';

    return `
      <div class="glass-card" style="padding:16px; display:flex; flex-direction:column; gap:12px;">
        <div>
          <div style="font-size:15px; font-weight:700; color:var(--primary); line-height:1.3;">${esc(f.name)}</div>
          ${meta}
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; font-size:13px;">
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">投入成本</span><span class="mono">${formatHKD(f.cost)}</span></div>
          <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">現時價值</span><span class="mono text-emerald">${formatHKD(f.currentValue)}</span></div>
          <div style="display:flex; justify-content:space-between; border-top:1px dashed var(--border-color); padding-top:6px;"><span style="color:var(--text-muted);">盈虧</span><span class="mono ${pnlCls}">${pnlSign}${formatHKD(pnl)} (${pnlPct}%)</span></div>
        </div>
        <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px;">
          <button type="button" class="btn btn-sm btn-primary" data-action="snap" data-id="${f.id}" data-name="${esc(f.name)}">記錄快照</button>
          <button type="button" class="btn btn-sm btn-ghost" data-action="history" data-id="${f.id}" data-name="${esc(f.name)}">歷史</button>
          <button type="button" class="btn btn-sm btn-ghost" data-action="edit" data-id="${f.id}">編輯</button>
          <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${f.id}">刪除</button>
        </div>
      </div>
    `;
  },

  _bindCardEvents(container) {
    container.onclick = async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const name = btn.dataset.name || '';
      const action = btn.dataset.action;

      if (action === 'snap') await this._openSnapshotModal(id, name);
      else if (action === 'history') await this._openHistoryModal(id, name);
      else if (action === 'edit') this._openFundModal(this._funds.find(f => f.id === id));
      else if (action === 'delete') {
        const ok = await openConfirm(`確定要刪除基金「${name}」嗎？`, { okClass: 'btn-danger' });
        if (ok) {
          await removeObject(`funds/${id}`);
          showToast('✅ 已刪除基金', 'success');
        }
      }
    };
  },

  _openFundModal(fund = null) {
    const isEdit = !!fund;
    const modalId = 'fund-modal';
    document.getElementById(modalId)?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `<div class="modal" style="max-width:500px; background:var(--bg-surface);"><h2 class="modal-title">${isEdit ? '編輯' : '新增'}基金</h2><div id="${modalId}-root"></div></div>`;
    document.body.appendChild(overlay);
    openModal(modalId);

    createForm({
      container: `${modalId}-root`,
      fields: [
        { id: 'name', label: '基金名稱', type: 'text', required: true },
        { id: 'type', label: '類型', type: 'select', required: true, options: [{ value: 'standalone', label: '獨立基金' }, { value: 'insurance', label: '保險基金' }] },
        { id: 'cost', label: '手動投入成本 (保險基金填0)', type: 'number', required: true },
        { id: 'currentValue', label: '目前現值 (若無快照則用此)', type: 'number' }
      ],
      initialData: isEdit ? fund : { type: 'standalone', cost: 0, currentValue: 0 },
      submitText: isEdit ? '儲存' : '新增',
      onCancel: () => { closeModal(modalId); overlay.remove(); },
      onSubmit: async (data) => {
        if (isEdit) {
          await saveObject(`funds/${fund.id}`, { ...fund, ...data, cost: Number(data.cost) || 0, currentValue: Number(data.currentValue) || 0 });
        } else {
          await pushObject('funds', { ...data, cost: Number(data.cost) || 0, currentValue: Number(data.currentValue) || 0, createdAt: Date.now() });
        }
        showToast('✅ 基金已儲存', 'success');
        closeModal(modalId); overlay.remove();
      }
    });
  },

  async _openSnapshotModal(fundId, fundName) {
    const modalId = 'snap-modal';
    document.getElementById(modalId)?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `<div class="modal" style="max-width:500px; background:var(--bg-surface);"><h2 class="modal-title">輸入快照 — ${esc(fundName)}</h2><div id="${modalId}-root"></div></div>`;
    document.body.appendChild(overlay);
    openModal(modalId);

    createForm({
      container: `${modalId}-root`,
      fields: [
        { id: 'dateKey', label: '估值日 (YYYY-MM-DD)', type: 'date', required: true },
        { id: 'shares', label: '單位數目', type: 'number', required: true, step: 0.0001 },
        { id: 'nav', label: '基金價格 (USD)', type: 'number', required: true, step: 0.0001 },
        { id: 'totalUsd', label: '總價值 (USD，自動計算)', type: 'number', disabled: true },
        { id: 'totalHkd', label: '保單價值 (HKD，自動計算)', type: 'number', disabled: true }
      ],
      initialData: { dateKey: new Date().toISOString().slice(0,10), shares: 0, nav: 0 },
      submitText: '儲存快照',
      onCancel: () => { closeModal(modalId); overlay.remove(); },
      onSubmit: async (data) => {
        await saveFundSnapshot(fundId, data.dateKey, { shares: Number(data.shares), nav: Number(data.nav) });
        showToast(`✅ 已儲存 ${data.dateKey} 快照`, 'success');
        closeModal(modalId); overlay.remove();
        this._loadSnapshotsAndRender();
      }
    });

    const formEl = document.querySelector(`#${modalId}-root form`);
    const sEl = formEl.querySelector('#field-shares');
    const nEl = formEl.querySelector('#field-nav');
    const calc = () => {
      const usd = (Number(sEl.value)||0) * (Number(nEl.value)||0);
      formEl.querySelector('#field-totalUsd').value = usd.toFixed(2);
      formEl.querySelector('#field-totalHkd').value = (usd * DEFAULT_FX).toFixed(2);
    };
    sEl.addEventListener('input', calc);
    nEl.addEventListener('input', calc);
  },

  async _openHistoryModal(fundId, fundName) {
    const snaps = await getFundSnapshotListOnce(fundId);
    const modalId = 'history-modal';
    document.getElementById(modalId)?.remove();

    const rows = snaps.length === 0 ? '<tr><td colspan="6" style="text-align:center;">尚無快照</td></tr>' : snaps.map(s => {
      const usd = s.shares * s.nav;
      const hkd = usd * DEFAULT_FX;
      return `<tr>
        <td><input type="checkbox" class="hist-cb" data-date="${s.dateKey}"></td>
        <td>${s.dateKey}</td>
        <td>${s.shares}</td>
        <td>USD ${s.nav}</td>
        <td>HKD ${hkd.toFixed(2)}</td>
        <td><button type="button" class="btn btn-sm btn-danger" data-del="${s.dateKey}" data-raw="${s._rawPath}">刪除</button></td>
      </tr>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `
      <div class="modal" style="max-width:700px; background:var(--bg-surface);">
        <h2 class="modal-title">歷史快照 — ${esc(fundName)}</h2>
        <div style="margin-bottom:12px;"><button type="button" class="btn btn-sm btn-primary" id="btn-compare" disabled>對比勾選的兩筆</button></div>
        <table class="data-table" style="width:100%; font-size:12px;">
          <thead><tr><th></th><th>日期</th><th>單位數</th><th>價格</th><th>總值(HKD)</th><th>操作</th></tr></thead>
          <tbody id="hist-body">${rows}</tbody>
        </table>
        <div id="compare-result" style="margin-top:16px;"></div>
        <div style="text-align:right; margin-top:16px;"><button type="button" class="btn btn-ghost" id="btn-close-hist">關閉</button></div>
      </div>
    `;
    document.body.appendChild(overlay);
    openModal(modalId);

    const body = document.getElementById('hist-body');
    const btnCompare = document.getElementById('btn-compare');
    const resultEl = document.getElementById('compare-result');

    body.addEventListener('change', () => {
      const checked = body.querySelectorAll('.hist-cb:checked');
      if (checked.length > 2) { event.target.checked = false; return; }
      btnCompare.disabled = checked.length !== 2;
    });

    body.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-del]');
      if (!btn) return;
      if (await openConfirm(`確定刪除 ${btn.dataset.del} 的快照？`, { okClass: 'btn-danger' })) {
        await removeFundSnapshot(fundId, btn.dataset.del, btn.dataset.raw);
        showToast('✅ 已刪除', 'success');
        closeModal(modalId); overlay.remove();
        this._loadSnapshotsAndRender();
      }
    });

    btnCompare.onclick = () => {
      const dates = Array.from(body.querySelectorAll('.hist-cb:checked')).map(cb => cb.dataset.date).sort();
      const a = snaps.find(s => s.dateKey === dates[0]);
      const b = snaps.find(s => s.dateKey === dates[1]);
      if (!a || !b) return;
      
      const aHkd = a.shares * a.nav * DEFAULT_FX;
      const bHkd = b.shares * b.nav * DEFAULT_FX;
      const diffHkd = bHkd - aHkd;
      const pct = aHkd > 0 ? (diffHkd / aHkd * 100).toFixed(2) : 0;
      
      resultEl.innerHTML = `
        <div class="glass-card" style="padding:12px; background:var(--bg-deep);">
          <div style="font-weight:700; margin-bottom:8px;">對比：${a.dateKey} ➜ ${b.dateKey}</div>
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
            <span>單位數</span><span>${a.shares} ➜ ${b.shares}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
            <span>價格</span><span>USD ${a.nav} ➜ USD ${b.nav}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:13px; border-top:1px dashed var(--border-color); padding-top:4px;">
            <span>總值 (HKD)</span>
            <span class="${diffHkd >= 0 ? 'text-emerald' : 'text-red'}">
              ${aHkd.toFixed(2)} ➜ ${bHkd.toFixed(2)} (${diffHkd >= 0 ? '+' : ''}${diffHkd.toFixed(2)}, ${pct}%)
            </span>
          </div>
        </div>
      `;
    };

    document.getElementById('btn-close-hist').onclick = () => { closeModal(modalId); overlay.remove(); };
  },

  _openImportSnapshotModal() {
    const modalId = 'import-snap-modal';
    document.getElementById(modalId)?.remove();
    const funds = this._funds;
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `
      <div class="modal" style="max-width:600px; background:var(--bg-surface);">
        <h2 class="modal-title">導入基金快照</h2>
        <div class="form-stack">
          <div class="field">
            <label class="field-label">目標基金</label>
            <select class="input" id="imp-fund">
              <option value="">— 請選擇 —</option>
              ${funds.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label class="field-label">上傳 JSON (格式：[{"dateKey":"2024-01-01","shares":100,"nav":12.5}])</label>
            <input type="file" id="imp-file" accept=".json" class="input">
          </div>
          <div class="field">
            <label class="field-label">或直接貼上 JSON</label>
            <textarea class="input" id="imp-text" rows="6" style="font-family:monospace; font-size:12px;"></textarea>
          </div>
          <div id="imp-status" style="font-size:12px; color:var(--text-muted);"></div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
            <button type="button" class="btn btn-ghost" id="imp-cancel">取消</button>
            <button type="button" class="btn btn-primary" id="imp-submit">開始導入</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    openModal(modalId);

    const fileInput = document.getElementById('imp-file');
    const textArea = document.getElementById('imp-text');

    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (file) textArea.value = await file.text();
    };

    document.getElementById('imp-cancel').onclick = () => { closeModal(modalId); overlay.remove(); };

    document.getElementById('imp-submit').onclick = async () => {
      const fundId = document.getElementById('imp-fund').value;
      if (!fundId) { showToast('請選擇基金', 'warning'); return; }
      const text = textArea.value.trim();
      if (!text) { showToast('請貼上 JSON', 'warning'); return; }

      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error('JSON 必須是陣列');
        
        let ok = 0, fail = 0;
        const statusEl = document.getElementById('imp-status');
        statusEl.textContent = '導入中…';
        
        for (const item of data) {
          if (!item.dateKey || item.shares === undefined || item.nav === undefined) { fail++; continue; }
          try {
            await saveFundSnapshot(fundId, item.dateKey, { shares: Number(item.shares), nav: Number(item.nav) });
            ok++;
          } catch (e) { fail++; }
        }
        
        statusEl.innerHTML = `<span class="text-emerald">✅ 成功 ${ok} 筆</span>${fail > 0 ? `, <span class="text-red">失敗 ${fail} 筆</span>` : ''}`;
        showToast('✅ 導入完成', 'success');
        this._loadSnapshotsAndRender();
      } catch (err) {
        showToast('JSON 解析失敗：' + err.message, 'error');
      }
    };
  },

  destroy() {
    if (this._unsubFunds) { try { this._unsubFunds(); } catch (e) {} this._unsubFunds = null; }
    if (this._unsubPolicies) { try { this._unsubPolicies(); } catch (e) {} this._unsubPolicies = null; }
  }
};

/* ============================================
   輔助邏輯
   ============================================ */
function _findPolicyByFund(fund, policies) {
  if (fund.policyId) {
    const p = (policies || []).find((x) => x.id === fund.policyId);
    if (p) return p;
  }
  return (policies || []).find((p) => (p.fundsAllocation || []).some((a) => a.fundId === fund.id)) || null;
}

function _getCostMapForPolicy(policy, allFunds, targetYear, targetMonth) {
  const costMap = {};
  if (!policy) return costMap;
  const policyFunds = (allFunds || []).filter((f) => f.type === 'insurance' && _findPolicyByFund(f, [policy]) !== null);
  if (policyFunds.length === 0) return costMap;

  const totalPolicyCost = calcFundCostEstimate(policy, targetYear, targetMonth);
  
  const manualFunds = policyFunds.filter((f) => Number(f.cost) > 0);
  const manualTotal = manualFunds.reduce((s, f) => s + Number(f.cost), 0);
  manualFunds.forEach((f) => { costMap[f.id] = Number(f.cost); });

  const remainingCost = Math.max(0, totalPolicyCost - manualTotal);
  const dynamicFunds = policyFunds.filter((f) => Number(f.cost) <= 0);
  
  const dynamicTotalPct = dynamicFunds.reduce((s, f) => {
    const alloc = (policy.fundsAllocation || []).find((a) => a.fundId === f.id);
    return s + (alloc ? Number(alloc.pct) : 0);
  }, 0);

  dynamicFunds.forEach((f) => {
    const alloc = (policy.fundsAllocation || []).find((a) => a.fundId === f.id);
    const pct = alloc ? Number(alloc.pct) : 0;
    costMap[f.id] = dynamicTotalPct > 0 ? Math.round(remainingCost * (pct / dynamicTotalPct)) : 0;
  });

  return costMap;
}

/* ═══ EOF ═══
F: pages/portfolio.js
V: 1792901980
W: webapp-20261025-001#46
═══ */