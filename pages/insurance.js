// ============================================
// insurance.js — 保險清單表（V2 重構版）
// 位置：pages/insurance.js
// ============================================

import { AppState } from '../config/state.js';
import { listenInsurancePolicies, getInsurancePaymentsOnce } from '../db/index.js';
import { api } from '../domain/api-client.js';
import { computeEnrichedPolicies, getPolicyHolderId } from '../domain/insurance.js';
import { renderTable, renderCards } from '../ui/table.js';
import { renderViewToggle, renderYearMonth } from '../ui/controls.js';
import { openModal, closeModal, openConfirm } from '../ui/modal.js';
import { createForm } from '../ui/form.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc } from '../ui/format.js';

export default {
  _unsubPolicies: null,
  _policies: [],
  _payments: {},

  async render() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h1 style="font-size:24px; font-weight:700; color:var(--primary);">保險清單表</h1>
      </div>

      <!-- 統計卡 (移到上方) -->
      <div id="insurance-stats" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:16px; margin-bottom:24px;"></div>

      <!-- 控制列 -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          <button type="button" class="btn btn-primary" id="btn-add-policy">
            <i data-lucide="plus" style="width:16px;height:16px;"></i> 新增保單
          </button>
          <div id="insurance-controls-view"></div>
        </div>
        <div id="insurance-controls-period"></div>
      </div>

      <!-- 提示 Banner -->
      <div class="glass-card" style="padding:12px 16px; margin-bottom:24px; border-left:4px solid var(--primary); background:rgba(0,240,255,0.05);">
        <div style="font-size:13px; color:var(--text-secondary); display:flex; align-items:center; gap:8px;">
          <i data-lucide="info" style="width:16px;height:16px;color:var(--primary);"></i>
          每張保單依「保單年度」自動產生每月分攤。此頁顯示保單清單與明細；扣款狀態請至「結算清單」編輯。
        </div>
      </div>
      
      <!-- 已供滿區塊 (暫不實作，先用變數保留) -->
      <div id="insurance-completed-section"></div>

      <div id="insurance-list-container"></div>
    `;

    // 渲染控制列
    renderYearMonth('insurance-controls-period', { includeAllMonth: false }, () => {
      this._renderListAndStats();
    });
    
    renderViewToggle('insurance-controls-view', () => {
      this._renderListAndStats();
    });

    // 綁定新增按鈕
    document.getElementById('btn-add-policy')?.addEventListener('click', () => {
      this._openPolicyModal();
    });

    // 綁定資料監聽
    this._unsubPolicies = listenInsurancePolicies(async (policies) => {
      this._policies = policies;
      await this._loadPaymentsAndRender();
    });
  },

  async _loadPaymentsAndRender() {
    const paymentsCache = {};
    for (const p of this._policies) {
      try {
        paymentsCache[p.id] = await getInsurancePaymentsOnce(p.id);
      } catch (e) {
        paymentsCache[p.id] = {};
      }
    }
    this._payments = paymentsCache;
    this._renderListAndStats();
  },

  _renderListAndStats() {
    const statsRoot = document.getElementById('insurance-stats');
    const listRoot = document.getElementById('insurance-list-container');
    if (!statsRoot || !listRoot) return;

    const { year } = AppState.getYearMonth();
    const targetYear = Number(year) || new Date().getFullYear();
    const currentView = AppState.getCurrentView() || 'table';

    // 計算
    const enriched = computeEnrichedPolicies(this._policies, this._payments, targetYear);
    const active = enriched.filter(p => !p._isCompleted);
    const completed = enriched.filter(p => p._isCompleted);

    // 統計卡 (2x2 排列)
    const totalAnnual = enriched.reduce((s, p) => s + (p._currentAnnualPremium || 0), 0);
    const totalPaid = enriched.reduce((s, p) => s + (p._paidTotal || 0), 0);
    
    statsRoot.innerHTML = `
      <div class="glass-card" style="padding:20px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="calendar" style="width:14px;height:14px;"></i> ${targetYear} 年度保單總供款
        </div>
        <div class="mono" style="font-size:24px; font-weight:700; color:var(--primary);">${formatHKD(totalAnnual)}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">共 ${enriched.length} 張保單</div>
      </div>
      <div class="glass-card" style="padding:20px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="check-circle" style="width:14px;height:14px;"></i> 累計已供款總額
        </div>
        <div class="mono" style="font-size:24px; font-weight:700; color:var(--accent-success);">${formatHKD(totalPaid)}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">所有保單的已扣款總和</div>
      </div>
      <div class="glass-card" style="padding:20px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="shield" style="width:14px;height:14px;"></i> 供款中保單
        </div>
        <div class="mono" style="font-size:24px; font-weight:700; color:var(--text-primary);">${active.length} 張</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">未供滿的保單數量</div>
      </div>
      <div class="glass-card" style="padding:20px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="check-circle" style="width:14px;height:14px;"></i> 已供滿保單
        </div>
        <div class="mono" style="font-size:24px; font-weight:700; color:var(--accent-success);">${completed.length} 張</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">已完成供款年期</div>
      </div>
    `;

    // 列表渲染
    if (enriched.length === 0) {
      listRoot.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">尚無保單資料</div>';
      return;
    }

    const renderActions = (row) => `
      <button type="button" class="btn btn-sm btn-ghost" data-action="edit" data-id="${row.id}">
        <i data-lucide="pencil" style="width:14px;height:14px;"></i> 編輯
      </button>
      <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${row.id}">
        <i data-lucide="trash-2" style="width:14px;height:14px;"></i> 刪除
      </button>
    `;

    if (currentView === 'card') {
      renderCards({
        container: listRoot,
        rows: enriched,
        columnsKey: 'insurancePolicies',
        renderActions
      });
    } else {
      renderTable({
        container: listRoot,
        rows: enriched,
        columnsKey: 'insurancePolicies',
        renderActions
      });
    }

    listRoot.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const policy = this._policies.find(p => p.id === id);
      if (!policy) return;

      if (btn.dataset.action === 'edit') {
        this._openPolicyModal(policy);
      } else if (btn.dataset.action === 'delete') {
        this._deletePolicy(policy);
      }
    });

    if (window.lucide) window.lucide.createIcons();
  },

  _openPolicyModal(policy = null) {
    // 略：與上一版相同
  },

  async _deletePolicy(policy) {
    const ok = await openConfirm(`⚠️ 確定要刪除保單「${policy.name}」嗎？`, { title: '刪除保單', okText: '刪除', okClass: 'btn-danger' });
    if (!ok) return;
    try {
      await api.entityCreate({ action: 'delete', entityType: 'policy', id: policy.id });
      showToast('✅ 已刪除保單', 'success');
    } catch (err) {
      showToast('刪除失敗：' + err.message, 'error');
    }
  },

  destroy() {
    if (this._unsubPolicies) {
      try { this._unsubPolicies(); } catch (e) {}
      this._unsubPolicies = null;
    }
  }
};

/* ═══ EOF ═══
F: pages/insurance.js
V: 1792900760
W: ai-system-20261024-012#67
═══ EOF ═══ */