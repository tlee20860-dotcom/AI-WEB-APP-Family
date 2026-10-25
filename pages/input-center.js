// ============================================
// input-center.js — 綜合輸入中心
// 位置：pages/input-center.js
// 說明：整合新增操作與各類別清單預覽。
// ============================================

import { AppState } from '../config/state.js';
import { 
  listenAllExpenses, 
  getInsurancePoliciesOnce, 
  getFundsOnce, 
  getBankAccountsOnce 
} from '../db/index.js';
import { saveIncome, savePersonalIncome, removeExpense } from '../db/write.js';
import { getList as getMembersList } from '../config/entity-registry.js';
import { renderTable, renderCards } from '../ui/table.js';
import { renderViewToggle, renderYearMonth } from '../ui/controls.js';
import { renderPageLayout } from '../ui/layout.js';
import { openModal, closeModal, openConfirm } from '../ui/modal.js';
import { createForm } from '../ui/form.js';
import { showToast } from '../ui/toast.js';
import { todayISO, formatHKD, esc } from '../ui/format.js';
import { RESERVED_IDS } from '../config/constants.js';
import { openExpenseModal } from '../lib/expense-modal.js';

export default {
  _unsubExpenses: null,
  _expenses: [],
  _activeTab: 'expense', // expense | insurance | fund | bank
  _otherData: { insurance: [], fund: [], bank: [] },

  async render() {
    // 1. 準備 Header Actions (新增按鈕)
    const headerActions = `
      <div style="display:flex; flex-wrap:wrap; gap:12px;">
        <button type="button" class="btn btn-primary" id="btn-add-expense">
          <i data-lucide="plus" style="width:16px;height:16px;"></i> 新增支出
        </button>
        <button type="button" class="btn btn-ghost" id="btn-add-contribution">
          <i data-lucide="trending-up" style="width:16px;height:16px;"></i> 家用轉入
        </button>
        <button type="button" class="btn btn-ghost" id="btn-add-income">
          <i data-lucide="wallet" style="width:16px;height:16px;"></i> 個人收入
        </button>
      </div>
    `;

    // 2. 準備控制列 (Tab + 年月 + 檢視切換)
    const controlsHtml = `
      <div id="ic-tabs" style="display:flex; align-items:center; gap:8px; overflow-x:auto; padding-bottom:4px; width:100%;">
        <button type="button" class="btn" data-tab="expense">支出</button>
        <button type="button" class="btn" data-tab="insurance">保險</button>
        <button type="button" class="btn" data-tab="fund">基金</button>
        <button type="button" class="btn" data-tab="bank">銀行</button>
      </div>
      <div style="display:flex; align-items:center; gap:12px; margin-top:12px; flex-wrap:wrap;">
        <div id="ic-view-toggle"></div>
        <div id="ic-controls-period"></div>
      </div>
    `;

    // 3. 呼叫統一引擎繪製骨架
    renderPageLayout({
      title: '綜合輸入中心',
      headerActions,
      stats: [],
      controls: controlsHtml,
      listTitle: '資料清單',
      listContainerId: 'ic-content-container'
    });

    // 4. 初始化 Tab 與按鈕狀態
    this._updateTabStyles();
    
    // 綁定 Tab 事件
    document.getElementById('ic-tabs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tab]');
      if (!btn) return;
      this._activeTab = btn.dataset.tab;
      this._updateTabStyles();
      this._renderCurrentTab();
    });

    // 5. 渲染年月與切換器
    renderYearMonth('ic-controls-period', { includeAllMonth: true }, () => {
      this._renderCurrentTab();
    });

    renderViewToggle('ic-view-toggle', () => {
      this._renderCurrentTab();
    });

    // 6. 綁定操作按鈕（加入 try-catch 以捕捉報錯）
    const btnExpense = document.getElementById('btn-add-expense');
    if (btnExpense) {
      btnExpense.onclick = async () => {
        try {
          await openExpenseModal({ onSuccess: () => this._renderExpenseTab() });
        } catch (err) {
          console.error(err);
          alert('開啟新增支出失敗，錯誤訊息：\n' + err.message + '\n\n請將此訊息截圖回報。');
        }
      };
    }

    const btnContrib = document.getElementById('btn-add-contribution');
    if (btnContrib) {
      btnContrib.onclick = () => this._openIncomeModal('contribution');
    }

    const btnIncome = document.getElementById('btn-add-income');
    if (btnIncome) {
      btnIncome.onclick = () => this._openIncomeModal('personal');
    }

    // 7. 載入資料
    const { year } = AppState.getYearMonth();
    this._unsubExpenses = listenAllExpenses((list) => {
      this._expenses = list.filter(e => e.year === String(year));
      if (this._activeTab === 'expense') this._renderExpenseTab();
    });

    // 背景載入其他 Tab 的資料
    this._loadOtherTabsData();
  },

  _updateTabStyles() {
    const tabsRoot = document.getElementById('ic-tabs');
    if (!tabsRoot) return;
    
    tabsRoot.querySelectorAll('button[data-tab]').forEach(btn => {
      const isActive = btn.dataset.tab === this._activeTab;
      btn.className = isActive ? 'btn btn-primary' : 'btn btn-ghost';
    });
  },

  async _loadOtherTabsData() {
    try {
      this._otherData.insurance = await getInsurancePoliciesOnce();
      this._otherData.fund = await getFundsOnce();
      this._otherData.bank = await getBankAccountsOnce();
      if (this._activeTab !== 'expense') this._renderCurrentTab();
    } catch (e) {
      console.error('[input-center] 載入其他資料失敗：', e);
    }
  },

  _renderCurrentTab() {
    if (this._activeTab === 'expense') this._renderExpenseTab();
    else if (this._activeTab === 'insurance') this._renderInsuranceTab();
    else if (this._activeTab === 'fund') this._renderFundTab();
    else if (this._activeTab === 'bank') this._renderBankTab();
  },

  _renderExpenseTab() {
    const listRoot = document.getElementById('ic-content-container');
    if (!listRoot) return;
    const titleEl = document.getElementById('page-list-title') || document.querySelector('h2');
    if (titleEl) titleEl.textContent = '最近支出紀錄';

    const { year, month } = AppState.getYearMonth();
    let displayData = this._expenses.filter(e => e.year === String(year));
    if (month !== 'all') {
      const mm = String(month).padStart(2, '0');
      displayData = displayData.filter(e => e.month === mm);
    }
    displayData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (displayData.length === 0) {
      listRoot.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">此期間尚無支出紀錄</div>';
      return;
    }

    const renderActions = (row) => `
      <button type="button" class="btn btn-sm btn-ghost" data-action="edit" data-id="${row.id}" data-member="${row.memberId}">編輯</button>
      <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${row.id}" data-member="${row.memberId}">刪除</button>
    `;

    const currentView = AppState.getCurrentView() || 'table';
    if (currentView === 'card') {
      renderCards({ container: listRoot, rows: displayData, columnsKey: 'recentExpense', renderActions });
    } else {
      renderTable({ container: listRoot, rows: displayData, columnsKey: 'recentExpense', renderActions });
    }

    // 改用 onclick 屬性賦值，覆蓋舊監聽，避免多次切換 Tab 時累積事件
    listRoot.onclick = async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const memberId = btn.dataset.member;
      const expense = displayData.find(x => x.id === id);
      if (!expense) return;

      if (btn.dataset.action === 'delete') {
        const ok = await openConfirm(`確定要刪除「${expense.name}」嗎？`, { title: '刪除支出', okClass: 'btn-danger' });
        if (!ok) return;
        try {
          await removeExpense(expense.year, expense.month, memberId, id);
          showToast('✅ 已刪除支出', 'success');
        } catch (err) { showToast('刪除失敗：' + err.message, 'error'); }
      } else if (btn.dataset.action === 'edit') {
        try {
          await openExpenseModal({ row: expense, onSuccess: () => this._renderExpenseTab() });
        } catch (err) {
          console.error(err);
          alert('開啟編輯支出失敗，錯誤訊息：\n' + err.message);
        }
      }
    };
  },

  _renderInsuranceTab() {
    const listRoot = document.getElementById('ic-content-container');
    if (!listRoot) return;
    const titleEl = document.getElementById('page-list-title') || document.querySelector('h2');
    if (titleEl) titleEl.textContent = '保險清單 (唯讀預覽)';

    const data = this._otherData.insurance;
    if (data.length === 0) {
      listRoot.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">尚無保險資料</div>';
      return;
    }

    const currentView = AppState.getCurrentView() || 'table';
    if (currentView === 'card') {
      renderCards({ container: listRoot, rows: data, columnsKey: 'insurancePolicies' });
    } else {
      renderTable({ container: listRoot, rows: data, columnsKey: 'insurancePolicies' });
    }
  },

  _renderFundTab() {
    const listRoot = document.getElementById('ic-content-container');
    if (!listRoot) return;
    const titleEl = document.getElementById('page-list-title') || document.querySelector('h2');
    if (titleEl) titleEl.textContent = '基金清單 (唯讀預覽)';

    const data = this._otherData.fund;
    if (data.length === 0) {
      listRoot.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">尚無基金資料</div>';
      return;
    }

    const currentView = AppState.getCurrentView() || 'table';
    if (currentView === 'card') {
      renderCards({ container: listRoot, rows: data, columnsKey: 'funds' });
    } else {
      renderTable({ container: listRoot, rows: data, columnsKey: 'funds' });
    }
  },

  _renderBankTab() {
    const listRoot = document.getElementById('ic-content-container');
    if (!listRoot) return;
    const titleEl = document.getElementById('page-list-title') || document.querySelector('h2');
    if (titleEl) titleEl.textContent = '銀行帳號 (唯讀預覽)';

    const data = this._otherData.bank;
    if (data.length === 0) {
      listRoot.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">尚無銀行帳號</div>';
      return;
    }

    const currentView = AppState.getCurrentView() || 'table';
    if (currentView === 'card') {
      renderCards({ container: listRoot, rows: data, columnsKey: 'bankAccounts' });
    } else {
      renderTable({ container: listRoot, rows: data, columnsKey: 'bankAccounts' });
    }
  },

  _openIncomeModal(type) {
    const modalId = 'add-income-modal';
    document.getElementById(modalId)?.remove();

    const isContrib = type === 'contribution';
    const members = getMembersList('members');
    const memberOpts = members.map(m => ({ value: m.id, label: m.name }));
    if (isContrib) memberOpts.push({ value: RESERVED_IDS.EXTRA_INCOME, label: '額外收入' });

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px; background:var(--bg-surface);">
        <h2 style="font-size:18px; font-weight:700; margin-bottom:16px; color:var(--text-primary);">${isContrib ? '家用轉入' : '個人收入'}</h2>
        <div id="income-form-root"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    openModal(modalId);

    createForm({
      container: 'income-form-root',
      fields: [
        { id: 'memberId', label: '成員', type: 'select', required: true, options: memberOpts },
        { id: 'amount', label: '金額', type: 'number', required: true }
      ],
      submitText: '儲存',
      onCancel: () => { closeModal(modalId); overlay.remove(); },
      onSubmit: async (data) => {
        try {
          const { year, month } = AppState.getYearMonth();
          const y = year;
          const m = month === 'all' ? String(new Date().getMonth() + 1).padStart(2, '0') : month;
          if (isContrib) await saveIncome(y, m, { [data.memberId]: Number(data.amount) });
          else await savePersonalIncome(data.memberId, y, m, Number(data.amount));
          showToast(`✅ 已新增${isContrib ? '家用轉入' : '個人收入'}`, 'success');
          closeModal(modalId);
          overlay.remove();
        } catch (err) { showToast('新增失敗：' + err.message, 'error'); }
      }
    });
  },

  destroy() {
    if (this._unsubExpenses) { try { this._unsubExpenses(); } catch (e) {} this._unsubExpenses = null; }
  }
};

/* ═══ EOF ═══
F: pages/input-center.js
V: 1792901740
W: webapp-20261025-001#24
═══ */