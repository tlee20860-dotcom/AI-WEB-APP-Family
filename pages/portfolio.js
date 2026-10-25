// ============================================
// portfolio.js — 基金投資表（V2 重構版）
// 位置：pages/portfolio.js
// 說明：顯示基金持倉與盈虧。整合保險基金的成本估算。
// ============================================

import { AppState } from '../config/state.js';
import { listenFunds, listenInsurancePolicies, getFundSnapshotListOnce } from '../db/index.js';
import { api } from '../domain/api-client.js';
import { findPolicyByFund, getCostMapForPolicy, calcFundPnl } from '../domain/fund.js';
import { renderTable, renderCards } from '../ui/table.js';
import { renderViewToggle, renderYearMonth } from '../ui/controls.js';
import { openModal, closeModal, openConfirm } from '../ui/modal.js';
import { createForm } from '../ui/form.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc } from '../ui/format.js';

export default {
  _unsubFunds: null,
  _unsubPolicies: null,
  _funds: [],
  _policies: [],
  _snapshots: {},
  _currentView: 'table',

  async render() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h1 style="font-size:24px; font-weight:700; color:var(--primary);">基金投資表</h1>
        <button type="button" class="btn btn-primary" id="btn-add-fund" style="display:inline-flex; align-items:center; gap:6px;">
          <i data-lucide="plus" style="width:16px;height:16px;"></i> 新增基金
        </button>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
        <div id="portfolio-controls-period"></div>
        <div id="portfolio-controls-view"></div>
      </div>

      <div id="portfolio-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;"></div>
      
      <div id="portfolio-list-container"></div>
    `;

    // 渲染控制列
    renderYearMonth('portfolio-controls-period', { includeAllMonth: false }, () => {
      this._renderListAndStats();
    });
    
    renderViewToggle('portfolio-controls-view', (view) => {
      this._currentView = view;
      this._renderListAndStats();
    });
    this._currentView = AppState.getCurrentView();

    // 綁定新增按鈕
    document.getElementById('btn-add-fund')?.addEventListener('click', () => {
      this._openFundModal();
    });

    // 資料監聽：基金變動或保單變動都需要重算
    this._unsubFunds = listenFunds((funds) => {
      this._funds = funds;
      this._loadSnapshotsAndRender();
    });

    this._unsubPolicies = listenInsurancePolicies((policies) => {
      this._policies = policies;
      this._renderListAndStats();
    });
  },

  async _loadSnapshotsAndRender() {
    // 抓取每個基金的最新快照 (用於顯示 units 和 currentValue)
    const snapMap = {};
    for (const f of this._funds) {
      try {
        const snaps = await getFundSnapshotListOnce(f.id);
        snapMap[f.id] = snaps.length > 0 ? snaps[snaps.length - 1] : null;
      } catch (e) {
        snapMap[f.id] = null;
      }
    }
    this._snapshots = snapMap;
    this._renderListAndStats();
  },

  _renderListAndStats() {
    const statsRoot = document.getElementById('portfolio-stats');
    const listRoot = document.getElementById('portfolio-list-container');
    if (!statsRoot || !listRoot) return;

    const { year, month } = AppState.getYearMonth();
    const y = year || String(new Date().getFullYear());
    const m = month === 'all' ? String(new Date().getMonth() + 1).padStart(2, '0') : month;

    // 1. 為所有保單計算成本地圖
    const costMaps = {};
    this._policies.forEach(p => {
      costMaps[p.id] = getCostMapForPolicy(p, this._funds, y, m);
    });

    // 2. 處理每個基金的資料
    let totalCost = 0;
    let totalValue = 0;

    const displayFunds = this._funds.map(f => {
      // 取得最新快照的價值 (若快照有 USD 總值，需轉 HKD，這裡簡化直接用 currentValue)
      const snap = this._snapshots[f.id];
      const currentValue = snap ? (Number(snap.shares) * Number(snap.nav) * 7.8) : (Number(f.currentValue) || 0);

      let estimatedCost = 0;
      if (f.type === 'insurance') {
        const policy = findPolicyByFund(f, this._policies);
        if (policy && costMaps[policy.id]) {
          estimatedCost = costMaps[policy.id][f.id] || 0;
        } else {
          estimatedCost = Number(f.cost) || 0;
        }
      } else {
        estimatedCost = Number(f.cost) || 0;
      }

      const pnlInfo = calcFundPnl({ currentValue }, estimatedCost);
      totalCost += estimatedCost;
      totalValue += currentValue;

      return {
        ...f,
        currentValue: Math.round(currentValue), // 覆蓋為計算後的值
        cost: estimatedCost, // 覆蓋為動態成本
        pnl: Math.round(pnlInfo.pnl)
      };
    });

    // 3. 渲染統計卡
    const totalPnl = totalValue - totalCost;
    const pnlCls = totalPnl >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
    const pnlPct = totalCost > 0 ? ((totalPnl / totalCost) * 100).toFixed(2) : '0.00';

    statsRoot.innerHTML = `
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">總投入成本</div>
        <div class="mono" style="font-size:20px; font-weight:700; color:var(--text-primary);">${formatHKD(totalCost)}</div>
      </div>
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">總現時價值 (HKD)</div>
        <div class="mono" style="font-size:20px; font-weight:700; color:var(--primary);">${formatHKD(totalValue)}</div>
      </div>
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">總帳面盈虧</div>
        <div class="mono" style="font-size:20px; font-weight:700; color:${pnlCls};">${totalPnl >= 0 ? '+' : ''}${formatHKD(totalPnl)} (${pnlPct}%)</div>
      </div>
    `;

    // 4. 渲染列表
    if (displayFunds.length === 0) {
      listRoot.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">尚無基金資料</div>';
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
        rows: displayFunds,
        columnsKey: 'funds',
        renderActions
      });
    } else {
      renderTable({
        container: listRoot,
        rows: displayFunds,
        columnsKey: 'funds',
        renderActions
      });
    }

    // 綁定事件
    listRoot.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const fund = this._funds.find(f => f.id === id);
      if (!fund) return;

      if (btn.dataset.action === 'edit') {
        this._openFundModal(fund);
      } else if (btn.dataset.action === 'delete') {
        this._deleteFund(fund);
      }
    });

    if (window.lucide) window.lucide.createIcons();
  },

  _openFundModal(fund = null) {
    const isEdit = !!fund;
    const modalId = 'fund-modal';
    let overlay = document.getElementById(modalId);
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `
      <div class="modal" style="max-width:500px; background:var(--bg-surface);">
        <h2 style="font-size:18px; font-weight:700; margin-bottom:16px; color:var(--text-primary);">${isEdit ? '編輯' : '新增'}基金</h2>
        <div id="fund-form-root"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    openModal(modalId);

    const fields = [
      { id: 'name', label: '基金名稱', type: 'text', required: true },
      { id: 'type', label: '類型', type: 'select', required: true, options: [
        { value: 'standalone', label: '獨立基金' },
        { value: 'insurance', label: '保險基金' }
      ]},
      { id: 'cost', label: '手動投入成本 (若為保險基金，此處填 0)', type: 'number', required: true },
      { id: 'currentValue', label: '目前現值 (若無快照則用此)', type: 'number' },
      { id: 'units', label: '單位數', type: 'number' },
      { id: 'note', label: '備註', type: 'text' }
    ];

    createForm({
      container: 'fund-form-root',
      fields,
      initialData: isEdit ? { ...fund } : { type: 'standalone', cost: 0, currentValue: 0, units: 0 },
      submitText: isEdit ? '儲存' : '新增',
      onCancel: () => { closeModal(modalId); overlay.remove(); },
      onSubmit: async (data) => {
        try {
          const payload = {
            ...data,
            cost: Number(data.cost) || 0,
            currentValue: Number(data.currentValue) || 0,
            units: Number(data.units) || 0
          };

          if (isEdit) {
            await api.entityCreate({ action: 'update', entityType: 'fund', id: fund.id, name: data.name, extra: payload });
            showToast('✅ 基金已更新', 'success');
          } else {
            await api.entityCreate({ action: 'create', entityType: 'fund', code: 'FUND-TEMP', name: data.name, extra: payload });
            showToast('✅ 基金已新增', 'success');
          }
          closeModal(modalId);
          overlay.remove();
        } catch (err) {
          showToast('操作失敗：' + err.message, 'error');
        }
      }
    });
  },

  async _deleteFund(fund) {
    const ok = await openConfirm(`⚠️ 確定要刪除基金「${fund.name}」嗎？`, { title: '刪除基金', okText: '刪除', okClass: 'btn-danger' });
    if (!ok) return;
    try {
      await api.entityCreate({ action: 'delete', entityType: 'fund', id: fund.id });
      showToast('✅ 已刪除基金', 'success');
    } catch (err) {
      showToast('刪除失敗：' + err.message, 'error');
    }
  },

  destroy() {
    if (this._unsubFunds) { try { this._unsubFunds(); } catch (e) {} this._unsubFunds = null; }
    if (this._unsubPolicies) { try { this._unsubPolicies(); } catch (e) {} this._unsubPolicies = null; }
  }
};

/* ═══ EOF ═══
F: pages/portfolio.js
V: 1792900510
W: ai-system-20261024-012#46
═══ EOF ═══ */