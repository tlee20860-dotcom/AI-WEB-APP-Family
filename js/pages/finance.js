// ============================================
// finance.js — 銀行交易
// ============================================

import { AppState } from '../app-core.js';
import { render, esc, toast } from '../app-ui.js';
import { renderStats } from '../components/stats-cards.js';
import { renderControls } from '../components/page-controls.js';
import { renderTable } from '../components/data-table.js';
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { formatHKD, BANK_TXN_TYPE_LABELS, BANK_TXN_CATEGORY_LABELS } from '../app-data.js';
import { calcBankBalance } from '../app-domain.js';

export function mount(container) {
  const db = getDatabase();
  const fid = AppState.currentFamilyId;
  const unsubs = [];
  let state = { bankAccounts: {}, members: {} };
  let activeTab = 'banks';

  const paint = () => {
    const { year, month } = AppState.getYearMonth();
    const m = month === 'all' ? '12' : month;
    
    const accounts = Object.entries(state.bankAccounts).map(([id, a]) => ({ id, ...a }));
    const txns = [];
    accounts.forEach(a => Object.entries(a.transactions || {}).forEach(([tid, t]) => txns.push({ id: tid, bankId: a.id, bankName: a.name, ...t })));
    const totalBalance = calcBankBalance(accounts, txns, year, m);

    const html = `
      <div class="page-header" style="margin-bottom:20px;">
        <h1 class="page-title" style="color:var(--primary); font-family:var(--font-mono);">[ 銀行交易 ]</h1>
      </div>
      <div id="stats-root"></div>
      <div id="controls-root"></div>
      
      <div style="display:flex; gap:8px; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:10px;">
        <button class="btn ${activeTab === 'banks' ? 'btn-primary' : 'btn-ghost'}" data-tab="banks">銀行清單</button>
        <button class="btn ${activeTab === 'txns' ? 'btn-primary' : 'btn-ghost'}" data-tab="txns">交易記錄</button>
      </div>
      <div id="tab-content"></div>
    `;
    render(container, html);

    renderStats('stats-root', [
      { title: '家庭總餘額', value: formatHKD(totalBalance), color: totalBalance >= 0 ? 'text-emerald' : 'text-red', hint: `共 ${accounts.length} 個帳號` },
      { title: '本月入帳', value: formatHKD(txns.filter(t => t.type === 'in' && t.date?.startsWith(`${year}-${m}`)).reduce((s, t) => s + t.amount, 0)), color: 'text-emerald' },
      { title: '本月出帳', value: formatHKD(txns.filter(t => t.type !== 'in' && t.date?.startsWith(`${year}-${m}`)).reduce((s, t) => s + t.amount, 0)), color: 'text-red' }
    ]);
    renderControls('controls-root', { showViewToggle: false });

    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => { activeTab = btn.dataset.tab; paint(); });
    });

    if (activeTab === 'banks') {
      const cols = [
        { id: 'name', label: '名稱' },
        { id: 'type', label: '類型', width: 100 },
        { id: 'initialBalance', label: '初始餘額', type: 'number', width: 130 },
        { id: 'balance', label: '當前餘額', type: 'number', width: 130 }
      ];
      const resolvers = {
        type: v => v === 'personal' ? '個人' : '家庭',
        initialBalance: v => `<span class="mono">${formatHKD(v)}</span>`,
        balance: (v, r) => {
          const bal = calcBankBalance([r], txns.filter(t => t.bankId === r.id), year, m);
          return `<span class="mono ${bal >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(bal)}</span>`;
        }
      };
      const tabEl = document.createElement('div');
      tabEl.id = 'tab-content';
      tabEl.innerHTML = '<div id="bank-table"></div>';
      document.getElementById('tab-content').replaceWith(tabEl);
      renderTable('bank-table', accounts, cols, resolvers, () => false);
    } else {
      const monthPrefix = `${year}-${m}`;
      const filteredTxns = txns.filter(t => t.date?.startsWith(monthPrefix)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const cols = [
        { id: 'date', label: '日期', width: 110 },
        { id: 'bankName', label: '銀行', width: 100 },
        { id: 'typeLabel', label: '類型', width: 90 },
        { id: 'amount', label: '金額', type: 'number', width: 120 },
        { id: 'note', label: '備註' }
      ];
      const resolvers = {
        typeLabel: (v, r) => `<span class="badge ${r.type === 'in' ? 'badge-success' : 'badge-pending'}">${BANK_TXN_TYPE_LABELS[r.type] || r.type}</span>`,
        amount: (v, r) => `<span class="mono ${r.type === 'in' ? 'text-emerald' : 'text-red'}">${r.type === 'in' ? '+' : '-'}${formatHKD(v)}</span>`
      };
      const tabEl = document.createElement('div');
      tabEl.id = 'tab-content';
      tabEl.innerHTML = '<div id="txn-table"></div>';
      document.getElementById('tab-content').replaceWith(tabEl);
      renderTable('txn-table', filteredTxns, cols, resolvers, () => false);
    }
  };

  const paths = [['bankAccounts', 'bank_accounts'], ['members', 'members']];
  paths.forEach(([key, p]) => {
    unsubs.push(onValue(ref(db, `families/${fid}/${p}`), (snap) => {
      state[key] = snap.val() || {};
      paint();
    }));
  });

  unsubs.push(AppState.on('ym-change', paint));
  paint();

  return () => unsubs.forEach(u => u && u());
}