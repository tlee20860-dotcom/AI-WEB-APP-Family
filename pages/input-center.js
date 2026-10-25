// ============================================
// input-center.js — 綜合輸入中心（V2 重構版）
// 位置：pages/input-center.js
// 說明：提供快速新增支出、家用轉入、個人收入，並顯示最近支出。
// ============================================

import { AppState } from '../config/state.js';
import { listenAllExpenses } from '../db/index.js';
import { saveIncome, savePersonalIncome, addExpense, removeExpense } from '../db/write.js';
import { getList as getMembersList } from '../config/entity-registry.js';
import { renderTable } from '../ui/table.js';
import { renderYearMonth } from '../ui/controls.js';
import { openModal, closeModal, openConfirm } from '../ui/modal.js';
import { createForm } from '../ui/form.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc, todayISO } from '../ui/format.js';
import { RESERVED_IDS } from '../config/constants.js';

export default {
  _unsubExpenses: null,
  _expenses: [],

  async render() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h1 style="font-size:24px; font-weight:700; color:var(--primary);">綜合輸入中心</h1>
      </div>

      <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:24px;">
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

      <div style="margin-bottom:16px;">
        <div id="ic-controls-period"></div>
      </div>

      <div>
        <h2 style="font-size:16px; margin-bottom:12px; color:var(--text-secondary);">最近支出紀錄</h2>
        <div id="ic-expense-list"></div>
      </div>
    `;

    // 渲染年月控制列
    renderYearMonth('ic-controls-period', { includeAllMonth: true }, () => {
      this._renderList();
    });

    // 綁定按鈕
    document.getElementById('btn-add-expense')?.addEventListener('click', () => this._openExpenseModal());
    document.getElementById('btn-add-contribution')?.addEventListener('click', () => this._openIncomeModal('contribution'));
    document.getElementById('btn-add-income')?.addEventListener('click', () => this._openIncomeModal('personal'));

    // 監聽支出資料 (只抓今年的，避免資料過大)
    const { year } = AppState.getYearMonth();
    this._unsubExpenses = listenAllExpenses((list) => {
      // 過濾出當前年份的資料
      this._expenses = list.filter(e => e.year === String(year));
      this._renderList();
    });
  },

  _renderList() {
    const listRoot = document.getElementById('ic-expense-list');
    if (!listRoot) return;

    const { year, month } = AppState.getYearMonth();
    let displayData = this._expenses.filter(e => e.year === String(year));
    
    if (month !== 'all') {
      const mm = String(month).padStart(2, '0');
      displayData = displayData.filter(e => e.month === mm);
    }

    // 依據時間倒序
    displayData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    if (displayData.length === 0) {
      listRoot.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">此期間尚無支出紀錄</div>';
      return;
    }

    const renderActions = (row) => `
      <button type="button" class="btn btn-sm btn-ghost" data-action="edit" data-id="${row.id}" data-member="${row.memberId}">
        編輯
      </button>
      <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${row.id}" data-member="${row.memberId}">
        刪除
      </button>
    `;

    renderTable({
      container: listRoot,
      rows: displayData,
      columnsKey: 'recentExpense',
      renderActions
    });

    listRoot.addEventListener('click', async (e) => {
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
        } catch (err) {
          showToast('刪除失敗：' + err.message, 'error');
        }
      } else if (btn.dataset.action === 'edit') {
        showToast('編輯功能開發中', 'info');
      }
    });
  },

  _openExpenseModal() {
    const modalId = 'add-expense-modal';
    document.getElementById(modalId)?.remove();

    const members = getMembersList('members');
    const memberOpts = members.map(m => ({ value: m.id, label: m.name }));
    memberOpts.push({ value: RESERVED_IDS.SHARED_MEMBER, label: '🏠 家庭共用' });

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `
      <div class="modal" style="max-width:450px; background:var(--bg-surface);">
        <h2 style="font-size:18px; font-weight:700; margin-bottom:16px; color:var(--text-primary);">新增支出</h2>
        <div id="expense-form-root"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    openModal(modalId);

    createForm({
      container: 'expense-form-root',
      fields: [
        { id: 'memberId', label: '成員', type: 'select', required: true, options: memberOpts },
        { id: 'name', label: '項目名稱', type: 'text', required: true },
        { id: 'amount', label: '金額', type: 'number', required: true },
        { id: 'date', label: '日期', type: 'date', required: true }
      ],
      initialData: { date: todayISO() },
      submitText: '儲存',
      onCancel: () => { closeModal(modalId); overlay.remove(); },
      onSubmit: async (data) => {
        try {
          const { year, month } = AppState.getYearMonth();
          const y = year;
          const m = month === 'all' ? String(new Date().getMonth() + 1).padStart(2, '0') : month;
          
          await addExpense(y, m, data.memberId, {
            name: data.name,
            amount: Number(data.amount),
            date: data.date,
            status: 'pending'
          });
          showToast('✅ 已新增支出', 'success');
          closeModal(modalId);
          overlay.remove();
        } catch (err) {
          showToast('新增失敗：' + err.message, 'error');
        }
      }
    });
  },

  _openIncomeModal(type) {
    const modalId = 'add-income-modal';
    document.getElementById(modalId)?.remove();

    const isContrib = type === 'contribution';
    const members = getMembersList('members');
    const memberOpts = members.map(m => ({ value: m.id, label: m.name }));
    if (isContrib) {
      memberOpts.push({ value: RESERVED_IDS.EXTRA_INCOME, label: '額外收入' });
    }

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

          if (isContrib) {
            await saveIncome(y, m, { [data.memberId]: Number(data.amount) });
          } else {
            await savePersonalIncome(data.memberId, y, m, Number(data.amount));
          }
          showToast(`✅ 已新增${isContrib ? '家用轉入' : '個人收入'}`, 'success');
          closeModal(modalId);
          overlay.remove();
        } catch (err) {
          showToast('新增失敗：' + err.message, 'error');
        }
      }
    });
  },

  destroy() {
    if (this._unsubExpenses) {
      try { this._unsubExpenses(); } catch (e) {}
      this._unsubExpenses = null;
    }
  }
};

/* ═══ EOF ═══
F: pages/input-center.js
V: 1792900640
W: ai-system-20261024-012#59
═══ EOF ═══ */