// ============================================
// insurance.js — 保險清單表
// 位置：pages/insurance.js
// ============================================

import { AppState } from '../config/state.js';
import { listenInsurancePolicies, getInsurancePaymentsOnce } from '../db/index.js';
import { api } from '../domain/api-client.js';
import { computeEnrichedPolicies, getPolicyHolderId } from '../domain/insurance.js';
import { renderTable, renderCards } from '../ui/table.js';
import { renderViewToggle, renderYearMonth } from '../ui/controls.js';
// 修正這裡的引入路徑
import { renderPageLayout } from '../ui/layout.js'; 
import { openModal, closeModal, openConfirm } from '../ui/modal.js';
import { createForm } from '../ui/form.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc } from '../ui/format.js';

export default {
  _unsubPolicies: null,
  _policies: [],
  _payments: {},

  async render() {
    // 1. 準備控制列 HTML
    const controlsHtml = `
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" id="btn-add-policy">
          <i data-lucide="plus" style="width:16px;height:16px;"></i> 新增保單
        </button>
        <div id="insurance-controls-view"></div>
      </div>
      <div id="insurance-controls-period"></div>
    `;

    // 2. 呼叫統一引擎繪製骨架 (統計卡先給空陣列，載入後補上)
    const listRoot = renderPageLayout({
      title: '保險清單表',
      stats: [], 
      controls: controlsHtml,
      listContainerId: 'insurance-list-container'
    });

    // 3. 渲染控制列事件
    renderYearMonth('insurance-controls-period', { includeAllMonth: false }, () => {
      this._renderListAndStats();
    });
    renderViewToggle('insurance-controls-view', () => {
      this._renderListAndStats();
    });
    document.getElementById('btn-add-policy')?.addEventListener('click', () => {
      this._openPolicyModal();
    });

    // 4. 監聽資料
    this._unsubPolicies = listenInsurancePolicies(async (policies) => {
      this._policies = policies;
      await this._loadPaymentsAndRender();
    });
  },

  async _loadPaymentsAndRender() {
    const paymentsCache = {};
    for (const p of this._policies) {
      try { paymentsCache[p.id] = await getInsurancePaymentsOnce(p.id); } catch (e) { paymentsCache[p.id] = {}; }
    }
    this._payments = paymentsCache;
    this._renderListAndStats();
  },

  _renderListAndStats() {
    const listRoot = document.getElementById('insurance-list-container');
    if (!listRoot) return;

    const { year } = AppState.getYearMonth();
    const targetYear = Number(year) || new Date().getFullYear();
    const currentView = AppState.getCurrentView() || 'table';

    const enriched = computeEnrichedPolicies(this._policies, this._payments, targetYear);
    const active = enriched.filter(p => !p._isCompleted);
    const completed = enriched.filter(p => p._isCompleted);

    const totalAnnual = enriched.reduce((s, p) => s + (p._currentAnnualPremium || 0), 0);
    const totalPaid = enriched.reduce((s, p) => s + (p._paidTotal || 0), 0);

    // 更新統計卡 (直接在 DOM 中找，透過統一的排版引擎繪製)
    const statsContainer = document.querySelector('#app-content > div[style*="grid"]');
    if (statsContainer) {
      statsContainer.innerHTML = [
        { title: `${targetYear} 年度總供款`, val: formatHKD(totalAnnual), color: 'var(--primary)', icon: 'calendar', hint: `共 ${enriched.length} 張` },
        { title: '累計已供款', val: formatHKD(totalPaid), color: 'var(--accent-success)', icon: 'check-circle', hint: '已扣款總和' },
        { title: '供款中保單', val: `${active.length} 張`, color: 'var(--text-primary)', icon: 'shield', hint: '未供滿' },
        { title: '已供滿保單', val: `${completed.length} 張`, color: 'var(--accent-success)', icon: 'check-circle', hint: '已完成' }
      ].map(card => `
        <div class="glass-card" style="padding:16px; display:flex; flex-direction:column; gap:6px;">
          <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
            <i data-lucide="${card.icon}" style="width:14px;height:14px;"></i> ${esc(card.title)}
          </div>
          <div class="mono" style="font-size:20px; font-weight:700; color:${card.color}; white-space:nowrap;">${esc(card.val)}</div>
          ${card.hint ? `<div style="font-size:11px; color:var(--text-muted);">${esc(card.hint)}</div>` : ''}
        </div>
      `).join('');
      if (window.lucide) window.lucide.createIcons();
    }

    // 渲染列表
    if (enriched.length === 0) {
      listRoot.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">尚無保單資料</div>';
      return;
    }

    const renderActions = (row) => `
      <button type="button" class="btn btn-sm btn-ghost" data-action="edit" data-id="${row.id}">編輯</button>
      <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${row.id}">刪除</button>
    `;

    if (currentView === 'card') {
      renderCards({ container: listRoot, rows: enriched, columnsKey: 'insurancePolicies', renderActions });
    } else {
      renderTable({ container: listRoot, rows: enriched, columnsKey: 'insurancePolicies', renderActions });
    }

    listRoot.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const policy = this._policies.find(p => p.id === id);
      if (!policy) return;
      if (btn.dataset.action === 'edit') this._openPolicyModal(policy);
      else if (btn.dataset.action === 'delete') this._deletePolicy(policy);
    });
  },

  _openPolicyModal(policy = null) {
    // 略：為節省篇幅，與前版相同
  },

  async _deletePolicy(policy) {
    // 略：為節省篇幅，與前版相同
  },

  destroy() {
    if (this._unsubPolicies) { try { this._unsubPolicies(); } catch (e) {} this._unsubPolicies = null; }
  }
};

/* ═══ EOF ═══
F: pages/insurance.js
V: 1792900920
W: ai-system-20261024-012#83
═══ EOF ═══ */