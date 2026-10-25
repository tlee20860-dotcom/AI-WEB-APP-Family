// ============================================
// insurance.js — 保險清單表（V2 重構版）
// 位置：pages/insurance.js
// 說明：顯示保單清單與統計，支援切換表格/卡片與編輯功能。
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
  _currentView: 'table',

  async render() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h1 style="font-size:24px; font-weight:700; color:var(--primary);">保險清單表</h1>
        <button type="button" class="btn btn-primary" id="btn-add-policy" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="plus" style="width:16px;height:16px;"></i> 新增保單
        </button>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
        <div id="insurance-controls-period"></div>
        <div id="insurance-controls-view"></div>
      </div>

      <div id="insurance-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;"></div>
      
      <div id="insurance-list-container"></div>
    `;

    // 渲染控制列
    renderYearMonth('insurance-controls-period', { includeAllMonth: false }, () => {
      this._renderListAndStats();
    });
    
    renderViewToggle('insurance-controls-view', (view) => {
      this._currentView = view;
      this._renderListAndStats();
    });
    this._currentView = AppState.getCurrentView();

    // 綁定新增按鈕
    document.getElementById('btn-add-policy')?.addEventListener('click', () => {
      this._openPolicyModal();
    });

    // 綁定資料監聽
    this._unsubPolicies = listenInsurancePolicies(async (policies) => {
      this._policies = policies;
      // 由於 payments 較多，實務上可只抓當前需要的，這裡為求精簡，全部重抓
      await this._loadPaymentsAndRender();
    });
  },

  async _loadPaymentsAndRender() {
    // 抓取所有保單的繳費紀錄 (簡化版，實務可優化為只抓當前年的)
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

    // 計算
    const enriched = computeEnrichedPolicies(this._policies, this._payments, targetYear);
    const active = enriched.filter(p => !p._isCompleted);
    const completed = enriched.filter(p => p._isCompleted);

    // 統計卡
    const totalAnnual = enriched.reduce((s, p) => s + (p._currentAnnualPremium || 0), 0);
    const totalPaid = enriched.reduce((s, p) => s + (p._paidTotal || 0), 0);
    
    statsRoot.innerHTML = `
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">${targetYear} 年度總供款</div>
        <div class="mono" style="font-size:20px; font-weight:700; color:var(--primary);">${formatHKD(totalAnnual)}</div>
      </div>
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">累計已供款總額</div>
        <div class="mono" style="font-size:20px; font-weight:700; color:var(--accent-success);">${formatHKD(totalPaid)}</div>
      </div>
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">供款中保單</div>
        <div class="mono" style="font-size:20px; font-weight:700; color:var(--text-primary);">${active.length} 張</div>
      </div>
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">已供滿保單</div>
        <div class="mono" style="font-size:20px; font-weight:700; color:var(--accent-warm);">${completed.length} 張</div>
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

    if (this._currentView === 'card') {
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

    // 綁定列表按鈕事件
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
    const isEdit = !!policy;
    const modalId = 'policy-modal';
    let overlay = document.getElementById(modalId);
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
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
      { id: 'memberId', label: '受保人 ID', type: 'text', required: true }, // 簡化版：直接輸入 ID，未來可改為下拉
      { id: 'policyHolderId', label: '持有人 ID', type: 'text', hint: '留空則同受保人' },
      { id: 'firstStartYear', label: '開始年份', type: 'number', required: true },
      { id: 'firstStartMonth', label: '開始月份', type: 'number', required: true, min: 1, max: 12 },
      { id: 'totalPolicyYears', label: '總供款年期', type: 'number', required: true },
      { id: 'annualPremium', label: '年繳保費', type: 'number' },
      { id: 'monthlyPremium', label: '月繳金額 (基金保險填此)', type: 'number' },
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
          // 處理資料格式
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
            // 需要生成 code (簡化版：由後端或前端生成，這裡先假設後端處理)
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
    if (this._unsubPolicies) {
      try { this._unsubPolicies(); } catch (e) {}
      this._unsubPolicies = null;
    }
  }
};

/* ═══ EOF ═══
F: pages/insurance.js
V: 1792900500
W: ai-system-20261024-012#45
═══ EOF ═══ */