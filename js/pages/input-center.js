// ============================================
// input-center.js — 綜合輸入中心（v103.0.35）
// ============================================
// v103.0.35（B35-0）：
//   ✅ 移除頂部「新增保單 / 新增基金」按鈕對應的 case（D-XXX）
//      - 入口改由「保險 / 基金 Tab」內的 entity-list-page 提供
//      - 移除已無用的 openEntityModal import
// v103.0.34（B29-4a）：
//   ✅ 刪除支出 Tab 內 banner
// v103.0.34（B29-3）：
//   ✅ columns / resolvers 改用 column-registry
// ============================================
import { initTabPanel } from '../ui/tab-panel.js';
import { initEntityListPage } from '../shared/entity-list-page.js';
import { renderDataTable } from '../shared/data-table.js';
import { renderDataCard } from '../shared/data-card.js';
import { openExpenseModal } from '../lib/expense-modal.js';
import { openContributionModal, openPersonalIncomeModal } from '../lib/income-modal.js';
import { openConfirm } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { initViewToggle } from '../ui/view-toggle.js';
import { listenAllExpenses, removeExpense } from '../core/db.js';
import { getColumns, getResolvers } from '../config/column-registry.js';
import { AppState } from '../core/state.js';
import { ENTITY_KEYS } from '../config/constants.js';

export default {
  title: '綜合輸入中心',
  data: {},
  state: { activeTab: 'expense', expenseView: 'table' },
  derived: {},
  blocks: [],

  customMount: (ctx) => {
    const TABS = [
      { key: 'expense', label: '支出', icon: 'receipt', panelId: 'ic-panel-expense' },
      { key: 'insurance', label: '保險', icon: 'shield', panelId: 'ic-panel-insurance' },
      { key: 'fund', label: '基金', icon: 'line-chart', panelId: 'ic-panel-fund' },
      { key: 'bank', label: '銀行', icon: 'landmark', panelId: 'ic-panel-bank' },
    ];
    const inst = {};
    let _btnH = null, _expUnsub = null, _expTableApi = null, _expCardApi = null;
    let _expToggle = null, _expRows = [];

    const loadTab = (key) => {
      if (inst[key]) { try { inst[key].refresh?.(); } catch (e) {} return; }
      const tabDef = TABS.find((t) => t.key === key);
      if (!tabDef) return;
      const panelEl = document.getElementById(tabDef.panelId);
      if (!panelEl) return;

      if (key === 'insurance') {
        inst[key] = initEntityListPage({ entity: ENTITY_KEYS.POLICY, containerId: tabDef.panelId, options: { defaultView: 'table', showViewToggle: true, storageKey: 'ic-insurance-view' } });
      } else if (key === 'fund') {
        inst[key] = initEntityListPage({ entity: ENTITY_KEYS.FUND, containerId: tabDef.panelId, options: { defaultView: 'table', showViewToggle: true, storageKey: 'ic-fund-view' } });
      } else if (key === 'bank') {
        inst[key] = initEntityListPage({ entity: ENTITY_KEYS.BANK, containerId: tabDef.panelId, options: { defaultView: 'table', showViewToggle: true, storageKey: 'ic-bank-view' } });
      } else if (key === 'expense') {
        /* 🆕 v103.0.34：移除 banner */
        panelEl.innerHTML = `
          <div class="flex flex-between items-center mb-16 flex-wrap gap-12">
            <div id="ic-expense-view-toggle"></div>
          </div>
          <div id="ic-expense-table-root"></div>
        `;
        _initExpenseViewToggle();
        _loadExpenses();
        inst[key] = {
          refresh: _loadExpenses,
          destroy: () => {
            if (_expUnsub) { try { _expUnsub(); } catch (e) {} _expUnsub = null; }
            _destroyExpenseLists();
            if (_expToggle) { try { _expToggle.destroy(); } catch (e) {} _expToggle = null; }
            panelEl.innerHTML = '';
          },
        };
      }
    };

    const _initExpenseViewToggle = () => {
      _expToggle = initViewToggle({
        containerId: 'ic-expense-view-toggle',
        storageKey: 'ic-expense-view',
        defaultView: 'table',
        onChange: (view) => { ctx.state.expenseView = view; _paintExpenses(); },
      });
      ctx.state.expenseView = _expToggle?.getView() || 'table';
    };

    const _destroyExpenseLists = () => {
      if (_expTableApi) { try { _expTableApi.destroy(); } catch (e) {} _expTableApi = null; }
      if (_expCardApi) { try { _expCardApi.destroy(); } catch (e) {} _expCardApi = null; }
    };

    const _loadExpenses = () => {
      if (_expUnsub) { try { _expUnsub(); } catch (e) {} _expUnsub = null; }
      _expUnsub = listenAllExpenses((rows) => {
        const { year } = AppState.getYearMonth();
        _expRows = (rows || []).filter((r) => String(r.year) === String(year)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 50);
        _paintExpenses();
      });
    };

    const _hooks = (canInput) => ({
      customActions: canInput ? (row) => [
        { label: '編輯', icon: 'pencil', className: 'btn-ghost', action: 'edit', onClick: () => openExpenseModal({ row, onSuccess: _loadExpenses }) },
        { label: '刪除', icon: 'trash-2', className: 'btn-danger', action: 'del', onClick: async () => {
          const ok = await openConfirm(`確定要刪除「${row.name}」嗎？`, { okText: '刪除', okClass: 'btn-danger' });
          if (!ok) return;
          try { await removeExpense(row.year, row.month, row.memberId, row.id); showToast('✅ 已刪除', 'success'); }
          catch (err) { showToast('刪除失敗：' + err.message, 'error'); }
        }},
      ] : () => [],
    });

    const _paintExpenses = () => {
      const root = document.getElementById('ic-expense-table-root');
      if (!root) return;
      _destroyExpenseLists();

      if (_expRows.length === 0) {
        root.innerHTML = '<div class="glass-card"><div class="empty-state">尚無支出紀錄</div></div>';
        return;
      }
      const canInput = AppState.getCanInput();
      const columns = getColumns('recentExpense');
      const resolvers = getResolvers('recentExpense');

      if (ctx.state.expenseView === 'card') {
        _expCardApi = renderDataCard({
          container: root,
          entityKey: '__recent_expense__',
          rows: _expRows,
          options: { gridClass: 'grid grid-3', columns, resolvers },
          hooks: _hooks(canInput),
        });
      } else {
        _expTableApi = renderDataTable({
          container: root,
          entityKey: '__recent_expense__',
          rows: _expRows,
          tableId: 'ic-recent-expense-table',
          options: { columns, resolvers, storageKey: 'ic-recent-expense-table' },
          hooks: _hooks(canInput),
        });
      }
    };

    const tabPanel = initTabPanel({
      containerId: 'ic-tab-bar-root',
      tabs: TABS,
      defaultKey: 'expense',
      storageKey: 'input-center-tab',
      onChange: (key) => { ctx.state.activeTab = key; loadTab(key); },
    });
    loadTab(tabPanel?.getCurrent() || 'expense');

    const btnRoot = document.getElementById('ic-buttons-root');
    if (btnRoot) {
      _btnH = (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        switch (btn.dataset.action) {
          case 'add-expense': openExpenseModal({ onSuccess: _loadExpenses }); break;
          case 'add-contribution': openContributionModal({ onSuccess: _loadExpenses }); break;
          case 'add-personal-income': openPersonalIncomeModal(); break;
        }
      };
      btnRoot.addEventListener('click', _btnH);
    }

    return {
      destroy: () => {
        Object.values(inst).forEach((i) => { try { i?.destroy?.(); } catch (e) {} });
        try { tabPanel?.destroy(); } catch (e) {}
        if (_btnH && btnRoot) { try { btnRoot.removeEventListener('click', _btnH); } catch (e) {} }
      },
    };
  },
};

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/pages/input-center.js
   Version: 1792200000
   Batch: B35-0
   Writer: A20261016-001#002
   ═══════════════════════════════════════════ */