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
import { renderPageLayout } from '../ui/layout.js'; 
import { openModal, closeModal, openConfirm } from '../ui/modal.js';
import { createForm } from '../ui/form.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc } from '../ui/format.js';
import { getMembersOnce } from '../db/index.js';

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

    // 2. 呼叫統一引擎繪製骨架
    renderPageLayout({
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

    // 更新統計卡 (透過 layout.js 繪製的結構，尋找 grid 容器)
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

  async _openPolicyModal(policy = null) {
    const isEdit = !!policy;
    const modalId = 'policy-modal';
    document.getElementById(modalId)?.remove();

    // 取得成員列表
    const members = await getMembersOnce();
    const memberOpts = members.map(m => ({ value: m.id, label: m.name }));

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `
      <div class="modal" style="max-width:600px; background:var(--bg-surface); max-height:90vh; overflow-y:auto;">
        <h2 style="font-size:18px; font-weight:700; margin-bottom:16px; color:var(--text-primary);">${isEdit ? '編輯' : '新增'}保單</h2>
        <div id="policy-form-root"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    openModal(modalId);

    const fields = [
      { id: 'name', label: '保單名稱', type: 'text', required: true },
      { id: 'company', label: '保險公司', type: 'text' },
      { id: 'type', label: '保單類型', type: 'select', required: true, options: [
        { value: 'normal', label: '普通保險' },
        { value: 'fund_insurance', label: '基金保險' }
      ]},
      { id: 'memberId', label: '受保人', type: 'select', required: true, options: memberOpts },
      { id: 'policyHolderId', label: '持有人 (留空同受保人)', type: 'select', options: memberOpts, includeEmpty: true },
      { id: 'firstStartYear', label: '開始年份', type: 'number', required: true },
      { id: 'firstStartMonth', label: '開始月份', type: 'number', required: true, min: 1, max: 12 },
      { id: 'totalPolicyYears', label: '總供款年期', type: 'number', required: true },
      { id: 'annualPremium', label: '年繳保費 (普通保險)', type: 'number' },
      { id: 'monthlyPremium', label: '月繳金額 (基金保險)', type: 'number' },
      { id: 'paymentMode', label: '付款模式', type: 'select', required: true, options: [
        { value: 'direct', label: '直接付款' },
        { value: 'advance', label: '代墊模式' }
      ]}
    ];

    createForm({
      container: 'policy-form-root',
      fields,
      initialData: isEdit ? { ...policy } : { type: 'normal', firstStartYear: new Date().getFullYear(), firstStartMonth: 1, paymentMode: 'direct' },
      submitText: isEdit ? '儲存' : '新增',
      onCancel: () => {
        closeModal(modalId);
        overlay.remove();
      },
      onSubmit: async (data) => {
        try {
          const payload = {
            ...data,
            firstStartYear: Number(data.firstStartYear),
            firstStartMonth: String(data.firstStartMonth).padStart(2, '0'),
            totalPolicyYears: Number(data.totalPolicyYears),
            annualPremium: Number(data.annualPremium) || 0,
            monthlyPremium: Number(data.monthlyPremium) || 0,
            totalPolicyPeriods: Number(data.totalPolicyYears) * 12,
            policyHolderId: data.policyHolderId || data.memberId
          };

          if (isEdit) {
            await api.entityCreate({ action: 'update', entityType: 'policy', id: policy.id, name: data.name, extra: payload });
            showToast('✅ 保單已更新', 'success');
          } else {
            await api.entityCreate({ action: 'create', entityType: 'policy', code: 'POL-TEMP', name: data.name, extra: payload });
            showToast('✅ 保單已新增', 'success');
          }
          closeModal(modalId);
          overlay.remove();
        } catch (err) {
          showToast('操作失敗：' + err.message, 'error');
        }
      }
    });
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
    if (this._unsubPolicies) { try { this._unsubPolicies(); } catch (e) {} this._unsubPolicies = null; }
  }
};

/* ═══ EOF ═══
F: pages/insurance.js
V: 1792900930
W: ai-system-20261024-012#84
═══ EOF ═══ */