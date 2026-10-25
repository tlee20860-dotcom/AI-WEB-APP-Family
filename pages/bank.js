// ============================================
// bank.js — 銀行交易頁面（V2 重構版）
// 位置：pages/bank.js
// 說明：顯示銀行帳號清單、交易明細，並計算即時餘額。
// ============================================

import { AppState } from '../config/state.js';
import { listenBankAccounts, listenAllBankTransactions } from '../db/index.js';
import { api } from '../domain/api-client.js';
import { calcBankBalance, calcTotalBankBalance } from '../domain/bank.js';
import { renderTable, renderCards } from '../ui/table.js';
import { renderViewToggle, renderYearMonth } from '../ui/controls.js';
import { openModal, closeModal } from '../ui/modal.js';
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
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h1 style="font-size:24px; font-weight:700; color:var(--primary);">銀行交易</h1>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-ghost" id="btn-add-txn">
            <i data-lucide="plus" style="width:14px;height:14px;"></i> 新增交易
          </button>
          <button type="button" class="btn btn-primary" id="btn-add-account">
            <i data-lucide="plus" style="width:14px;height:14px;"></i> 新增帳號
          </button>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
        <div id="bank-controls-period"></div>
        <div id="bank-view-toggle"></div>
      </div>
      
      <div id="bank-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;"></div>
      
      <div style="margin-bottom:24px;">
        <h2 style="font-size:16px; margin-bottom:12px; color:var(--text-secondary);">銀行帳號清單</h2>
        <div id="bank-accounts-list"></div>
      </div>

      <div>
        <h2 style="font-size:16px; margin-bottom:12px; color:var(--text-secondary);">交易記錄</h2>
        <div id="bank-txns-list"></div>
      </div>
    `;

    // 渲染年月控制列
    renderYearMonth('bank-controls-period', { includeAllMonth: true }, () => {
      this._renderData();
    });

    // 渲染檢視切換
    renderViewToggle('bank-view-toggle', () => {
      this._renderData();
    });

    document.getElementById('btn-add-account')?.addEventListener('click', () => this._openAccountModal());
    document.getElementById('btn-add-txn')?.addEventListener('click', () => this._openTxnModal());

    // 監聽資料
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
    const statsRoot = document.getElementById('bank-stats');
    const accRoot = document.getElementById('bank-accounts-list');
    const txnRoot = document.getElementById('bank-txns-list');
    if (!statsRoot || !accRoot || !txnRoot) return;

    const { year, month } = AppState.getYearMonth();
    const y = year || String(new Date().getFullYear());
    const tM = month === 'all' ? '12' : (month || '12');
    const currentView = AppState.getCurrentView() || 'table';

    // 1. 計算統計
    const totalBalance = calcTotalBankBalance(this._accounts, this._txns, y, tM);
    
    // 過濾當月交易
    const prefix = `${y}-${String(tM).padStart(2, '0')}`;
    const monthTxns = month === 'all' 
      ? this._txns.filter(t => (t.date || '').startsWith(y))
      : this._txns.filter(t => (t.date || '').startsWith(prefix));

    const inTotal = monthTxns.filter(t => t.type === 'in').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const outTotal = monthTxns.filter(t => t.type !== 'in').reduce((s, t) => s + (Number(t.amount) || 0), 0);

    statsRoot.innerHTML = `
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">家庭總餘額</div>
        <div class="mono" style="font-size:20px; font-weight:700; color:${totalBalance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'};">${formatHKD(totalBalance)}</div>
      </div>
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">本月入帳</div>
        <div class="mono" style="font-size:20px; font-weight:700; color:var(--accent-success);">${formatHKD(inTotal)}</div>
      </div>
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">本月出帳</div>
        <div class="mono" style="font-size:20px; font-weight:700; color:var(--accent-danger);">${formatHKD(outTotal)}</div>
      </div>
    `;

    // 2. 渲染帳號清單
    const accCols = getColumns('bankAccounts');
    accCols.push({ id: 'dynamicBalance', label: '當前餘額', type: 'number' });
    
    const accResolvers = getResolvers('bankAccounts');
    accResolvers.dynamicBalance = (_, row) => {
      const bal = calcBankBalance(row, this._txns.filter(t => t.bankId === row.id), y, tM);
      return `<span class="mono" style="font-weight:700; color:${bal >= 0 ? 'var(--text-primary)' : 'var(--accent-danger)'};">${formatHKD(bal)}</span>`;
    };

    // 手動渲染帳號表格 (因為有動態欄位)
    if (currentView === 'card') {
      // 帳號清單用卡片模式
      accRoot.innerHTML = `
        <div class="data-cards-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
          ${this._accounts.map(row => {
            const bal = calcBankBalance(row, this._txns.filter(t => t.bankId === row.id), y, tM);
            return `
              <div class="glass-card" style="padding:16px;">
                <div style="font-size:16px; font-weight:700; color:var(--primary); margin-bottom:8px;">${esc(row.name)}</div>
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                  <span style="color:var(--text-muted);">類型</span>
                  <span>${row.type === 'personal' ? '個人' : '家庭'}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                  <span style="color:var(--text-muted);">初始餘額</span>
                  <span class="mono">${formatHKD(row.initialBalance)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:14px; margin-top:12px; padding-top:12px; border-top:1px dashed var(--border-color);">
                  <span style="color:var(--text-muted);">當前餘額</span>
                  <span class="mono" style="font-weight:700; color:${bal >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'};">${formatHKD(bal)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      // 帳號清單用表格模式
      accRoot.innerHTML = `
        <div class="glass-card" style="padding:0; overflow:hidden;">
          <div class="data-table-scroll-wrapper" style="overflow-x:auto;">
            <table class="data-table" style="width:100%; border-collapse:collapse;">
              <thead>
                <tr>${accCols.map(c => `<th class="${c.type === 'number' ? 'num' : ''}">${esc(c.label)}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${this._accounts.map(row => `
                  <tr>
                    ${accCols.map(col => {
                      const val = row[col.id];
                      const resolver = accResolvers[col.id];
                      const content = resolver ? resolver(val, row) : esc(val);
                      return `<td class="${col.type === 'number' ? 'num' : ''}">${content}</td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // 3. 渲染交易明細
    if (currentView === 'card') {
      renderCards({
        container: txnRoot,
        rows: monthTxns.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
        columnsKey: 'bankTransactions',
        emptyText: '本月尚無交易紀錄'
      });
    } else {
      renderTable({
        container: txnRoot,
        rows: monthTxns.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
        columnsKey: 'bankTransactions',
        emptyText: '本月尚無交易紀錄'
      });
    }

    if (window.lucide) window.lucide.createIcons();
  },

  _openAccountModal() {
    const modalId = 'account-modal';
    document.getElementById(modalId)?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px; background:var(--bg-surface);">
        <h2 style="font-size:18px; font-weight:700; margin-bottom:16px; color:var(--text-primary);">新增銀行帳號</h2>
        <div id="account-form-root"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    openModal(modalId);

    createForm({
      container: 'account-form-root',
      fields: [
        { id: 'name', label: '帳號名稱', type: 'text', required: true },
        { id: 'type', label: '類型', type: 'select', required: true, options: [
          { value: 'family', label: '家庭帳號' },
          { value: 'personal', label: '個人帳號' }
        ]},
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
        } catch (err) {
          showToast('新增失敗：' + err.message, 'error');
        }
      }
    });
  },

  _openTxnModal() {
    const modalId = 'txn-modal';
    document.getElementById(modalId)?.remove();

    if (this._accounts.length === 0) {
      showToast('請先新增銀行帳號', 'warning');
      return;
    }

    const accOptions = this._accounts.map(a => ({ value: a.id, label: a.name }));

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `
      <div class="modal" style="max-width:450px; background:var(--bg-surface);">
        <h2 style="font-size:18px; font-weight:700; margin-bottom:16px; color:var(--text-primary);">新增交易</h2>
        <div id="txn-form-root"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    openModal(modalId);

    createForm({
      container: 'txn-form-root',
      fields: [
        { id: 'bankId', label: '銀行帳號', type: 'select', required: true, options: accOptions },
        { id: 'type', label: '類型', type: 'select', required: true, options: [
          { value: 'in', label: '入帳' },
          { value: 'out', label: '出帳' },
          { value: 'transfer', label: '內部轉帳' }
        ]},
        { id: 'category', label: '分類', type: 'select', required: true, options: [
          { value: 'contribution', label: '家用轉入' },
          { value: 'expense', label: '支出' },
          { value: 'insurance', label: '保險' },
          { value: 'reimbursement', label: '代墊報銷' },
          { value: 'manual', label: '手動' }
        ]},
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
        } catch (err) {
          showToast('新增失敗：' + err.message, 'error');
        }
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
V: 1792900710
W: ai-system-20261024-012#62
═══ EOF ═══ */