// ============================================
// bank.js — 銀行交易頁面
// 位置：pages/bank.js
// 說明：顯示銀行帳號清單、交易明細，並計算即時餘額。
//       已完全套用 renderPageLayout 解決排版問題。
// ============================================

import { AppState } from '../config/state.js';
import { listenBankAccounts, listenAllBankTransactions } from '../db/index.js';
import { api } from '../domain/api-client.js';
import { calcBankBalance, calcTotalBankBalance } from '../domain/bank.js';
import { renderTable, renderCards } from '../ui/table.js';
import { renderViewToggle, renderYearMonth } from '../ui/controls.js';
import { renderPageLayout } from '../ui/layout.js';
import { openModal, closeModal, openConfirm } from '../ui/modal.js';
import { createForm } from '../ui/form.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc } from '../ui/format.js';
import { getColumns, getResolvers } from '../config/columns.js';

export default {
  _unsubAccounts: null,
  _unsubTxns: null,
  _accounts: [],
  _txns: [],

  async render() {
    // 1. 準備控制列 HTML
    const controlsHtml = `
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" id="btn-add-txn">
          <i data-lucide="plus" style="width:14px;height:14px;"></i> 新增交易
        </button>
        <button type="button" class="btn btn-ghost" id="btn-add-account">
          <i data-lucide="plus" style="width:14px;height:14px;"></i> 新增帳號
        </button>
        <div id="bank-view-toggle"></div>
      </div>
      <div id="bank-controls-period"></div>
    `;

    // 2. 繪製骨架
    renderPageLayout({
      title: '銀行交易',
      stats: [],
      controls: controlsHtml,
      listContainerId: 'bank-content-container'
    });

    // 3. 綁定控制列事件
    renderYearMonth('bank-controls-period', { includeAllMonth: true }, () => {
      this._renderData();
    });

    renderViewToggle('bank-view-toggle', () => {
      this._renderData();
    });

    document.getElementById('btn-add-account').onclick = () => this._openAccountModal();
    document.getElementById('btn-add-txn').onclick = () => this._openTxnModal();

    // 4. 監聽資料
    this._unsubAccounts = listenBankAccounts((accounts) => {
      this._accounts = accounts;
      this._renderData();
    });

    this._unsubTxns = listenAllBankTransactions((txns) => {
      this._txns = txns;
      this._renderData();
    });
  },

  _renderData() {
    const contentRoot = document.getElementById('bank-content-container');
    const statsRoot = document.getElementById('page-stats-container');
    if (!contentRoot || !statsRoot) return;

    const { year, month } = AppState.getYearMonth();
    const y = year || String(new Date().getFullYear());
    const tM = month === 'all' ? '12' : (month || '12');
    const currentView = AppState.getCurrentView() || 'table';

    const totalBalance = calcTotalBankBalance(this._accounts, this._txns, y, tM);
    
    const prefix = `${y}-${String(tM).padStart(2, '0')}`;
    const monthTxns = month === 'all' 
      ? this._txns.filter(t => (t.date || '').startsWith(y))
      : this._txns.filter(t => (t.date || '').startsWith(prefix));

    const inTotal = monthTxns.filter(t => t.type === 'in').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const outTotal = monthTxns.filter(t => t.type !== 'in').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const netChange = inTotal - outTotal;

    // 更新統計卡
    statsRoot.style.display = 'grid';
    statsRoot.innerHTML = [
      { title: '家庭總餘額', val: formatHKD(totalBalance), color: totalBalance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', icon: 'landmark', hint: '所有帳號加總' },
      { title: '本月入帳', val: formatHKD(inTotal), color: 'var(--accent-success)', icon: 'arrow-down-circle', hint: `${monthTxns.filter(t => t.type === 'in').length} 筆` },
      { title: '本月出帳', val: formatHKD(outTotal), color: 'var(--accent-danger)', icon: 'arrow-up-circle', hint: `${monthTxns.filter(t => t.type !== 'in').length} 筆` },
      { title: '本月淨變動', val: formatHKD(netChange), color: netChange >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', icon: 'trending-up', hint: '入帳 - 出帳' }
    ].map(card => `
      <div class="glass-card" style="padding:16px; display:flex; flex-direction:column; gap:6px; min-width:0; overflow:hidden;">
        <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
          <i data-lucide="${card.icon}" style="width:14px;height:14px; flex-shrink:0;"></i> 
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${card.title}</span>
        </div>
        <div class="mono" style="font-size:20px; font-weight:700; color:${card.color}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${card.val}
        </div>
        <div style="font-size:11px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(card.hint)}</div>
      </div>
    `).join('');

    // 渲染清單內容
    contentRoot.innerHTML = `
      <div style="margin-bottom:24px;">
        <h3 style="font-size:15px; margin-bottom:12px; color:var(--text-primary);">銀行帳號清單</h3>
        <div id="bank-accounts-list"></div>
      </div>
      <div>
        <h3 style="font-size:15px; margin-bottom:12px; color:var(--text-primary);">交易記錄</h3>
        <div id="bank-txns-list"></div>
      </div>
    `;

    const accRoot = document.getElementById('bank-accounts-list');
    const txnRoot = document.getElementById('bank-txns-list');

    // 渲染帳號 (使用動態餘額)
    const accCols = getColumns('bankAccounts');
    accCols.push({ id: 'dynamicBalance', label: '當前餘額', type: 'number', sortable: true });
    const accResolvers = getResolvers('bankAccounts');
    accResolvers.dynamicBalance = (_, row) => {
      const bal = calcBankBalance(row, this._txns.filter(t => t.bankId === row.id), y, tM);
      return `<span class="mono" style="font-weight:700; color:${bal >= 0 ? 'var(--text-primary)' : 'var(--accent-danger)'};">${formatHKD(bal)}</span>`;
    };

    if (currentView === 'card') {
      renderCards({ container: accRoot, rows: this._accounts, columnsKey: 'bankAccounts', customResolvers: accResolvers, customColumns: accCols });
    } else {
      renderTable({ container: accRoot, rows: this._accounts, columnsKey: 'bankAccounts', customResolvers: accResolvers, customColumns: accCols });
    }

    // 渲染交易明細
    const sortedTxns = [...monthTxns].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (currentView === 'card') {
      renderCards({ container: txnRoot, rows: sortedTxns, columnsKey: 'bankTransactions', emptyText: '本月尚無交易紀錄' });
    } else {
      renderTable({ container: txnRoot, rows: sortedTxns, columnsKey: 'bankTransactions', emptyText: '本月尚無交易紀錄' });
    }

    if (window.lucide) window.lucide.createIcons();
  },

  _openAccountModal() {
    const modalId = 'account-modal';
    document.getElementById(modalId)?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `<div class="modal" style="max-width:400px; background:var(--bg-surface);"><h2 class="modal-title">新增銀行帳號</h2><div id="account-form-root"></div></div>`;
    document.body.appendChild(overlay);
    openModal(modalId);

    createForm({
      container: 'account-form-root',
      fields: [
        { id: 'name', label: '帳號名稱', type: 'text', required: true },
        { id: 'type', label: '類型', type: 'select', required: true, options: [{ value: 'family', label: '家庭帳號' }, { value: 'personal', label: '個人帳號' }] },
        { id: 'initialBalance', label: '初始餘額', type: 'number', required: true },
        { id: 'initialYear', label: '初始年份', type: 'number', required: true },
        { id: 'initialMonth', label: '初始月份', type: 'number', required: true, min: 1, max: 12 }
      ],
      initialData: { type: 'family', initialBalance: 0, initialYear: new Date().getFullYear(), initialMonth: 1 },
      submitText: '新增',
      onCancel: () => { closeModal(modalId); overlay.remove(); },
      onSubmit: async (data) => {
        try {
          await api.bankAccounts.create(data);
          showToast('✅ 已新增銀行帳號', 'success');
          closeModal(modalId);
          overlay.remove();
        } catch (err) { showToast('新增失敗：' + err.message, 'error'); }
      }
    });
  },

  _openTxnModal() {
    const modalId = 'txn-modal';
    document.getElementById(modalId)?.remove();
    if (this._accounts.length === 0) { showToast('請先新增銀行帳號', 'warning'); return; }
    const accOptions = this._accounts.map(a => ({ value: a.id, label: a.name }));

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `<div class="modal" style="max-width:450px; background:var(--bg-surface);"><h2 class="modal-title">新增交易</h2><div id="txn-form-root"></div></div>`;
    document.body.appendChild(overlay);
    openModal(modalId);

    createForm({
      container: 'txn-form-root',
      fields: [
        { id: 'bankId', label: '銀行帳號', type: 'select', required: true, options: accOptions },
        { id: 'type', label: '類型', type: 'select', required: true, options: [{ value: 'in', label: '入帳' }, { value: 'out', label: '出帳' }, { value: 'transfer', label: '內部轉帳' }] },
        { id: 'category', label: '分類', type: 'select', required: true, options: [{ value: 'contribution', label: '家用轉入' }, { value: 'expense', label: '支出' }, { value: 'insurance', label: '保險' }, { value: 'reimbursement', label: '代墊報銷' }, { value: 'manual', label: '手動' }] },
        { id: 'amount', label: '金額', type: 'number', required: true },
        { id: 'date', label: '日期', type: 'date', required: true },
        { id: 'note', label: '備註', type: 'text' }
      ],
      initialData: { type: 'out', category: 'manual', date: new Date().toISOString().slice(0, 10) },
      submitText: '新增',
      onCancel: () => { closeModal(modalId); overlay.remove(); },
      onSubmit: async (data) => {
        try {
          const { bankId, ...txnData } = data;
          await api.bankTransactions.create(bankId, txnData);
          showToast('✅ 已新增交易', 'success');
          closeModal(modalId);
          overlay.remove();
        } catch (err) { showToast('新增失敗：' + err.message, 'error'); }
      }
    });
  },

  destroy() {
    if (this._unsubAccounts) { try { this._unsubAccounts(); } catch (e) {} this._unsubAccounts = null; }
    if (this._unsubTxns) { try { this._unsubTxns(); } catch (e) {} this._unsubTxns = null; }
  }
};

/* ═══ EOF ═══
F: pages/bank.js
V: 1792901920
W: webapp-20261025-001#40
═══ */