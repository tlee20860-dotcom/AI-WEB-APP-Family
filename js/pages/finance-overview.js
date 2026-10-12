// finance-overview.js — 銀行交易（v103.0.35）
// v103.0.35（B29-7a）：
//   ✅ 刪除 syncSubtitle（動態副標題）
// ============================================
import { formatHKD } from '../lib/format.js';
import { calcTotalBankBalance, calcBankBalance } from '../lib/bank.js';
import { getColumns, getResolvers } from '../config/column-registry.js';
import { renderDataTable } from '../shared/data-table.js';
import { renderDataCard } from '../shared/data-card.js';
import { renderStatsCards } from '../shared/stats-cards.js';
import { renderPageControls } from '../lib/page-controls.js';
import { AppState } from '../core/state.js';
import { STORAGE_PREFIXES } from '../config/constants.js';

export default {
  title: '銀行交易',
  data: {
    bankAccounts:     { type: 'list', path: 'bank_accounts' },
    bankTransactions: { type: 'raw', path: 'bank_accounts', transform: _flatten },
  },
  state: {
    activeTab: 'banks',
    currentYear: String(AppState.year || new Date().getFullYear()),
    currentMonth: String(AppState.month || '12'),
    txFilters: { type: '', category: '', member: '' },
    view: 'table',
  },
  derived: {
    statsCards: {
      deps: ['data.bankAccounts', 'data.bankTransactions', 'state.currentYear', 'state.currentMonth'],
      compute: _buildStats,
    },
    filteredTxns: {
      deps: ['data.bankTransactions', 'state.txFilters', 'state.currentYear', 'state.currentMonth'],
      compute: _filterTxns,
    },
  },
  blocks: [],

  customMount: (ctx) => {
    let _statsApi = null, _tabH = null, _filterH = null;
    let _controls = null;
    let _view = 'table';

    try {
      const v = localStorage.getItem(`${STORAGE_PREFIXES.VIEW}finance-overview-view`);
      if (v === 'card' || v === 'table') _view = v;
    } catch (e) { /* noop */ }

    const syncState = () => {
      const y = String(AppState.year || new Date().getFullYear());
      const m = String(AppState.month || '12');
      if (ctx.state.currentYear !== y) ctx.state.currentYear = y;
      if (ctx.state.currentMonth !== m) ctx.state.currentMonth = m;
    };

    const render = () => {
      const statsRoot = document.getElementById('finance-stats-root');
      if (statsRoot) {
        if (_statsApi) { try { _statsApi.destroy(); } catch (e) {} }
        statsRoot.innerHTML = '';
        _statsApi = renderStatsCards({ container: 'finance-stats-root', cards: ctx.derived.statsCards || [], columns: 4 });
      }

      document.querySelectorAll('#finance-tabs .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === ctx.state.activeTab));
      const bp = document.getElementById('finance-panel-banks');
      const tp = document.getElementById('finance-panel-transactions');
      if (bp) bp.style.display = ctx.state.activeTab === 'banks' ? 'block' : 'none';
      if (tp) tp.style.display = ctx.state.activeTab === 'transactions' ? 'block' : 'none';

      if (ctx.state.activeTab === 'banks') _paintBanks(ctx);
      else _paintTxns(ctx);
    };

    const _paintBanks = (ctx) => {
      const root = document.getElementById('finance-banks-root');
      if (!root) return;
      const accounts = ctx.data.bankAccounts || [];
      const txns = ctx.data.bankTransactions || [];
      const { year, month } = AppState.getYearMonth();
      const rows = accounts.map((acc) => {
        const accTxns = txns.filter((t) => t.bankId === acc.id);
        return { ...acc, _balance: calcBankBalance(acc, accTxns, year, month === 'all' ? '12' : month), _txnCount: accTxns.length };
      });
      if (rows.length === 0) {
        if (root.__lastHtml === '<empty>') return;
        root.__lastHtml = '<empty>';
        root.innerHTML = '<div class="glass-card"><div class="empty-state">尚無銀行帳號</div></div>';
        return;
      }
      root.__lastHtml = '';
      const columns = getColumns('bankAccounts');
      const resolvers = getResolvers('bankAccounts');
      if (_view === 'card') {
        renderDataCard({
          container: root,
          entityKey: '__bank_account__',
          rows,
          options: { gridClass: 'grid grid-3', columns, resolvers },
        });
      } else {
        renderDataTable({
          container: root,
          entityKey: '__bank_account__',
          rows,
          tableId: 'finance-banks-table',
          options: { columns, resolvers, storageKey: 'finance-banks-table' },
        });
      }
    };

    const _paintTxns = (ctx) => {
      const root = document.getElementById('finance-txn-root');
      if (!root) return;
      const rows = ctx.derived.filteredTxns || [];
      if (rows.length === 0) {
        if (root.__lastHtml === '<empty>') return;
        root.__lastHtml = '<empty>';
        root.innerHTML = '<div class="glass-card"><div class="empty-state">此條件下尚無交易記錄</div></div>';
        return;
      }
      root.__lastHtml = '';
      const columns = getColumns('bankTransactions');
      const resolvers = getResolvers('bankTransactions');
      if (_view === 'card') {
        renderDataCard({
          container: root,
          entityKey: '__bank_txn__',
          rows,
          options: { gridClass: 'grid grid-3', columns, resolvers },
        });
      } else {
        renderDataTable({
          container: root,
          entityKey: '__bank_txn__',
          rows,
          tableId: 'finance-txn-table',
          options: { columns, resolvers, storageKey: 'finance-txn-table' },
        });
      }
    };

    const tabsRoot = document.getElementById('finance-tabs');
    _tabH = (e) => {
      const btn = e.target.closest('button[data-tab]');
      if (!btn) return;
      ctx.state.activeTab = btn.dataset.tab;
      render();
    };
    tabsRoot?.addEventListener('click', _tabH);

    const filterRoot = document.getElementById('finance-txn-filter-root');
    if (filterRoot) {
      filterRoot.innerHTML = `<div class="page-filter-bar"><div class="filter-group"><label class="field-label">類型</label><select class="select" data-filter="type"><option value="">全部</option><option value="in">入帳</option><option value="out">出帳</option><option value="transfer">內部轉帳</option></select></div><div class="filter-group"><label class="field-label">分類</label><select class="select" data-filter="category"><option value="">全部</option><option value="contribution">家用轉入</option><option value="expense">支出</option><option value="insurance">保險</option><option value="reimbursement">代墊報銷</option><option value="manual">手動</option></select></div></div>`;
      _filterH = (e) => {
        const sel = e.target.closest('select[data-filter]');
        if (!sel) return;
        ctx.state.txFilters[sel.dataset.filter] = sel.value;
        render();
      };
      filterRoot.addEventListener('change', _filterH);
    }

    _controls = renderPageControls({
      containerId: 'page-controls-root',
      headerContainerId: 'page-header-actions',
      items: [
        {
          type: 'viewToggle',
          storageKey: 'finance-overview-view',
          defaultView: 'table',
          onChange: (v) => { _view = v; render(); },
        },
        { type: 'year' },
        { type: 'month' },
      ],
    });

    syncState();
    render();

    const unsub = ctx.onDataChange((key) => {
      if (key === '__APP__') {
        syncState();
        if (_controls) { try { _controls.refresh(); } catch (e) {} }
      }
      render();
    });

    return {
      destroy: () => {
        unsub();
        if (_statsApi) { try { _statsApi.destroy(); } catch (e) {} }
        if (_controls) { try { _controls.destroy(); } catch (e) {} }
        if (_tabH) tabsRoot?.removeEventListener('click', _tabH);
        if (_filterH) filterRoot?.removeEventListener('change', _filterH);
      },
    };
  },
};

function _flatten(raw) {
  const flat = [];
  Object.entries(raw || {}).forEach(([bankId, bank]) => {
    Object.entries(bank?.transactions || {}).forEach(([txnId, txn]) => {
      flat.push({ id: txnId, bankId, bankName: bank?.name || '', ...txn });
    });
  });
  return flat;
}

function _buildStats(accounts, txns, year, month) {
  const list = accounts || [], txnList = txns || [];
  const tM = month === 'all' ? '12' : (month || '12');
  const y = year || String(new Date().getFullYear());
  const total = calcTotalBankBalance(list, txnList, y, tM);
  const prefix = `${y}-${String(tM).padStart(2, '0')}`;
  const monthTxns = txnList.filter((t) => (t.date || '').startsWith(prefix));
  const inTotal = monthTxns.filter((t) => t.type === 'in').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const outTotal = monthTxns.filter((t) => t.type !== 'in').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  return [
    { title: '家庭總餘額', value: formatHKD(total), valueClass: total >= 0 ? 'emerald' : 'red', hint: `共 ${list.length} 個銀行帳號`, icon: 'landmark' },
    { title: '本月入帳', value: formatHKD(inTotal), valueClass: 'emerald', hint: `${monthTxns.filter((t) => t.type === 'in').length} 筆`, icon: 'arrow-down-circle' },
    { title: '本月出帳', value: formatHKD(outTotal), valueClass: 'red', hint: `${monthTxns.filter((t) => t.type !== 'in').length} 筆`, icon: 'arrow-up-circle' },
    { title: '本月淨變動', value: formatHKD(inTotal - outTotal), valueClass: (inTotal - outTotal) >= 0 ? 'emerald' : 'red', hint: '入帳 − 出帳', icon: 'trending-up' },
  ];
}

function _filterTxns(txns, filters, year, month) {
  const list = txns || [];
  const y = year || String(new Date().getFullYear());
  const tM = month === 'all' ? null : (month || null);
  let out = list;
  if (tM) {
    const prefix = `${y}-${String(tM).padStart(2, '0')}`;
    out = out.filter((t) => (t.date || '').startsWith(prefix));
  } else {
    out = out.filter((t) => (t.date || '').startsWith(y));
  }
  if (filters.type) out = out.filter((t) => t.type === filters.type);
  if (filters.category) out = out.filter((t) => t.category === filters.category);
  if (filters.member) out = out.filter((t) => t.memberId === filters.member);
  return [...out].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/pages/finance-overview.js
   Version: v103.0.35
   Batch: B29-7a
   ═══════════════════════════════════════════ */