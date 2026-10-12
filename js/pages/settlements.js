// settlements.js — 結算清單（v103.0.35）
// v103.0.35（B29-7a）：
//   ✅ 刪除 syncSubtitle（動態副標題）
// ============================================
import { formatHKD } from '../lib/format.js';
import { esc } from '../lib/dom.js';
import { mergeSettlementData } from '../lib/merge.js';
import { applyFilters } from '../lib/filter-sort.js';
import {
  listenAllMemberExpenses,
  removeExpense,
  getInsurancePoliciesOnce,
  getInsurancePaymentsOnce,
  getBankAccountsOnce,
} from '../core/db.js';
import { api } from '../core/api.js';
import { estimateMonthlyAmount, getPeriodInfo } from '../lib/insurance.js';
import { resolveName } from '../config/entity-registry.js';
import { getColumns, getResolvers } from '../config/column-registry.js';
import { AppState } from '../core/state.js';
import { showToast } from '../ui/toast.js';
import { openConfirm, openModal, closeModal } from '../ui/modal.js';
import { openExpenseModal } from '../lib/expense-modal.js';
import { renderStatsCards } from '../shared/stats-cards.js';
import { renderDataTable } from '../shared/data-table.js';
import { renderDataCard } from '../shared/data-card.js';
import { renderPageControls } from '../lib/page-controls.js';
import { RESERVED_IDS, STORAGE_PREFIXES } from '../config/constants.js';

const INS_MODAL_ID = 'settle-insurance-modal';
const HIDE_COMPLETED_KEY = 'fin_ui_settle_hide_completed';

export default {
  title: '結算清單',
  data: {},
  state: {
    filters: { year: '', month: '', source: '' },
    hideCompleted: true,
    view: 'table',
  },
  derived: {},
  blocks: [],

  customMount: (ctx) => {
    let _rows = [], _filtered = [];
    let _memberExpenses = [], _insuranceRows = [];
    let _statsApi = null, _tableApi = null, _cardApi = null;
    let _monthlyUnsub = null, _controls = null;
    let _view = 'table';

    try {
      const saved = localStorage.getItem(HIDE_COMPLETED_KEY);
      ctx.state.hideCompleted = saved === null ? true : saved === 'true';
    } catch (e) { /* noop */ }

    try {
      const v = localStorage.getItem(`${STORAGE_PREFIXES.VIEW}settlement-view`);
      if (v === 'card' || v === 'table') _view = v;
    } catch (e) { /* noop */ }

    const _recompute = () => {
      const { year, month } = AppState.getYearMonth();
      _rows = mergeSettlementData({
        memberExpenses: _memberExpenses,
        insuranceRows: _insuranceRows,
        year: String(year),
        month,
      });
      render();
    };

    const _isInPolicyPeriod = (p, y, m) => {
      const info = getPeriodInfo(p, y, m);
      if (!info) return false;
      if (p.type === 'fund_insurance' && Number(p.monthlyPremium) <= 0) return false;
      return true;
    };

    const _loadInsuranceRows = async () => {
      const { year, month } = AppState.getYearMonth();
      const y = String(year);
      const m = month === 'all' ? null : String(month);
      const hideCompleted = ctx.state.hideCompleted === true;

      try {
        const policies = await getInsurancePoliciesOnce();
        const list = [];

        for (const p of policies) {
          if (hideCompleted && p.isCompleted) continue;

          let payments = {};
          try { payments = await getInsurancePaymentsOnce(p.id); } catch (e) {}

          const holder = p.policyHolderId || p.memberId || '';

          if (!m) {
            const yearPayments = payments?.[y] || {};
            for (const mm of Object.keys(yearPayments)) {
              const payment = yearPayments[mm];
              list.push({
                policyId: p.id,
                policyName: p.name || '（未命名保單）',
                policyHolderId: holder,
                memberId: p.memberId || '',
                status: payment?.status || '',
                amount: payment?.amount || 0,
                date: payment?.date || '',
                bankId: payment?.bankId || '',
                txnId: payment?.txnId || '',
                paymentMode: p.paymentMode || 'direct',
                advanceHolderId: p.advanceHolderId || '',
                month: mm,
              });
            }
            continue;
          }

          const payment = payments?.[y]?.[m];
          if (payment) {
            list.push({
              policyId: p.id,
              policyName: p.name || '（未命名保單）',
              policyHolderId: holder,
              memberId: p.memberId || '',
              status: payment?.status || '',
              amount: payment?.amount || 0,
              date: payment?.date || '',
              bankId: payment?.bankId || '',
              txnId: payment?.txnId || '',
              paymentMode: p.paymentMode || 'direct',
              advanceHolderId: p.advanceHolderId || '',
            });
            continue;
          }

          if (!_isInPolicyPeriod(p, y, m)) continue;

          const amount = estimateMonthlyAmount(p, y, m) || 0;
          list.push({
            policyId: p.id,
            policyName: p.name || '（未命名保單）',
            policyHolderId: holder,
            memberId: p.memberId || '',
            status: '',
            amount,
            date: '',
            bankId: '',
            txnId: '',
            paymentMode: p.paymentMode || 'direct',
            advanceHolderId: p.advanceHolderId || '',
          });
        }
        _insuranceRows = list;
      } catch (e) {
        console.error('[settlements] 載入保險資料失敗：', e);
        _insuranceRows = [];
      }
    };

    const reload = async () => {
      const { year, month } = AppState.getYearMonth();
      ctx.state.filters.year = String(year);
      ctx.state.filters.month = month === 'all' ? '' : String(month);

      if (_monthlyUnsub) { try { _monthlyUnsub(); } catch (e) {} }
      _monthlyUnsub = listenAllMemberExpenses(String(year), month, (memberExpenses) => {
        _memberExpenses = memberExpenses;
        _recompute();
      });
      await _loadInsuranceRows();
      _recompute();
    };

    const render = () => {
      _filtered = applyFilters(_rows, ctx.state.filters);
      _paintStats();
      _paintList();
    };

    const _paintStats = () => {
      const pending = _filtered.filter((r) => !r.isDone);
      const done = _filtered.filter((r) => r.isDone);
      const pt = pending.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const dt = done.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      if (_statsApi) { try { _statsApi.destroy(); } catch (e) {} }
      _statsApi = renderStatsCards({
        container: 'settlement-stats-root',
        cards: [
          { title: '待處理', value: formatHKD(pt), valueClass: 'magenta', hint: `${pending.length} 筆`, icon: 'clock' },
          { title: '已處理', value: formatHKD(dt), valueClass: 'emerald', hint: `${done.length} 筆`, icon: 'check-circle' },
          { title: '總計', value: formatHKD(pt + dt), valueClass: 'cyan', hint: `${_filtered.length} 筆`, icon: 'calculator' },
        ],
        columns: 3,
      });
    };

    const _hooks = (canInput) => ({
      customActions: canInput ? (row) => {
        if (row.source === 'insurance') {
          return row.isDone
            ? [{ label: '取消扣款', icon: 'rotate-ccw', className: 'btn-ghost', action: 'ins-unsync', onClick: () => _onInsuranceUnsync(row, reload) }]
            : [{ label: '確認扣款', icon: 'check', className: 'btn-primary', action: 'ins-sync', onClick: () => _onInsuranceSync(row, reload) }];
        }
        return [
          { label: '結算', icon: 'check-circle', className: 'btn-ghost', action: 'settle', onClick: () => {
            openExpenseModal({
              row: { id: row._ref?.expenseId, year: row.year, month: row.month, memberId: row.memberId, status: row.isDone ? 'done' : 'pending', paymentMethodId: row.paymentMethodId || '', bankId: row.bankId || '' },
              mode: 'settle',
              onSuccess: reload,
            });
          }},
          { label: '刪除', icon: 'trash-2', className: 'btn-danger', action: 'del', onClick: async () => {
            const ok = await openConfirm(`確定要刪除「${row.name}」嗎？`, { okText: '刪除', okClass: 'btn-danger' });
            if (!ok) return;
            try {
              if (row._ref) await removeExpense(row.year, row.month, row._ref.memberId, row._ref.expenseId);
              showToast('✅ 已刪除', 'success'); reload();
            } catch (e) { showToast('刪除失敗：' + e.message, 'error'); }
          }},
        ];
      } : () => [],
    });

    const _paintList = () => {
      const root = document.getElementById('settlement-table-root');
      if (!root) return;
      if (_tableApi) { try { _tableApi.destroy(); } catch (e) {} _tableApi = null; }
      if (_cardApi) { try { _cardApi.destroy(); } catch (e) {} _cardApi = null; }

      if (_filtered.length === 0) {
        root.innerHTML = '<div class="glass-card"><div class="empty-state">此條件下無資料</div></div>';
        return;
      }

      const canInput = AppState.getCanInput();
      const columns = getColumns('settlements');
      const resolvers = getResolvers('settlements');

      if (_view === 'card') {
        _cardApi = renderDataCard({
          container: root,
          entityKey: '__settlement__',
          rows: _filtered,
          options: { gridClass: 'grid grid-3', columns, resolvers },
          hooks: _hooks(canInput),
        });
      } else {
        _tableApi = renderDataTable({
          container: root,
          entityKey: '__settlement__',
          rows: _filtered,
          tableId: 'settlement-table',
          options: { columns, resolvers, storageKey: 'settlement-table' },
          hooks: _hooks(canInput),
        });
      }
    };

    const { year, month } = AppState.getYearMonth();
    ctx.state.filters.year = String(year);
    ctx.state.filters.month = month === 'all' ? '' : String(month);

    _controls = renderPageControls({
      containerId: 'page-controls-root',
      headerContainerId: 'page-header-actions',
      items: [
        {
          type: 'viewToggle',
          storageKey: 'settlement-view',
          defaultView: 'table',
          onChange: (v) => { _view = v; _paintList(); },
        },
        { type: 'year' },
        { type: 'month', includeAll: true },
        {
          type: 'filter',
          render: () => `
            <div class="page-filter-bar">
              <div class="filter-group" style="flex-direction:row;align-items:center;gap:8px;min-width:auto;">
                <input type="checkbox" id="settle-hide-completed" style="width:auto;cursor:pointer;" ${ctx.state.hideCompleted ? 'checked' : ''}>
                <label for="settle-hide-completed" class="field-label" style="margin:0;cursor:pointer;">隱藏已供滿</label>
              </div>
            </div>
          `,
        },
      ],
    });

    const onFilterChange = (e) => {
      const cb = e.target.closest('#settle-hide-completed');
      if (cb) {
        ctx.state.hideCompleted = cb.checked;
        try { localStorage.setItem(HIDE_COMPLETED_KEY, String(cb.checked)); } catch (err) {}
        reload();
      }
    };
    const controlsRoot = document.getElementById('page-controls-root');
    controlsRoot?.addEventListener('change', onFilterChange);

    const unsub = ctx.onDataChange((key) => {
      if (key === '__APP__') {
        reload();
        if (_controls) { try { _controls.refresh(); } catch (e) {} }
      }
    });

    reload();

    return {
      destroy: () => {
        unsub();
        if (_monthlyUnsub) { try { _monthlyUnsub(); } catch (e) {} }
        if (_statsApi) { try { _statsApi.destroy(); } catch (e) {} }
        if (_tableApi) { try { _tableApi.destroy(); } catch (e) {} }
        if (_cardApi) { try { _cardApi.destroy(); } catch (e) {} }
        if (_controls) { try { _controls.destroy(); } catch (e) {} }
        if (controlsRoot && onFilterChange) controlsRoot.removeEventListener('change', onFilterChange);
      },
    };
  },
};

/* ============================================
   保險扣款：確認 / 取消
   ============================================ */
async function _onInsuranceSync(row, onSuccess) {
  const ok = await _openBankPickerModal(row);
  if (!ok) return;

  try {
    await api.insuranceSync({
      policyId: row._ref?.policyId,
      memberId: row._ref?.memberId || row.memberId,
      policyName: row.name,
      monthlyAverage: row.amount,
      year: row.year,
      month: row.month,
      bankId: ok.bankId || '',
      txnId: '',
      paymentMode: row.paymentMode || 'direct',
      advanceHolderId: row.advanceHolderId || '',
    });
    showToast('✅ 已確認扣款（連動支出 / 基金 / 代墊）', 'success');
    if (typeof onSuccess === 'function') onSuccess();
  } catch (err) {
    showToast('確認扣款失敗：' + err.message, 'error');
  }
}

async function _onInsuranceUnsync(row, onSuccess) {
  const ok = await openConfirm(
    `⚠️ 確定要取消「${row.name}」本月的扣款嗎？\n\n將同步撤銷：\n• 支出紀錄\n• 基金累積供款\n• 代墊扣減`,
    { title: '取消扣款', okText: '取消扣款', okClass: 'btn-danger' }
  );
  if (!ok) return;

  try {
    await api.insuranceUnsync({
      policyId: row._ref?.policyId,
      memberId: row._ref?.memberId || row.memberId,
      year: row.year,
      month: row.month,
      amount: row.amount,
      paymentMode: row.paymentMode || 'direct',
      advanceHolderId: row.advanceHolderId || '',
    });
    showToast('✅ 已取消扣款', 'success');
    if (typeof onSuccess === 'function') onSuccess();
  } catch (err) {
    showToast('取消扣款失敗：' + err.message, 'error');
  }
}

async function _openBankPickerModal(row) {
  document.getElementById(INS_MODAL_ID)?.remove();

  let banks = [];
  try { banks = await getBankAccountsOnce(); } catch (e) { banks = []; }

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = INS_MODAL_ID;
    overlay.innerHTML = `
      <div class="modal" style="max-width:440px;">
        <h2 class="modal-title">確認扣款 — ${esc(row.name)}</h2>
        <div class="glass-card" style="padding:12px;background:rgba(8,11,17,0.4);margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;">
            <span class="text-muted">金額</span>
            <span class="mono text-cyan" style="font-weight:700;">${formatHKD(row.amount)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px;">
            <span class="text-muted">所屬年月</span>
            <span class="mono">${esc(row.year)}-${esc(row.month)}</span>
          </div>
        </div>
        <div class="field">
          <label class="field-label">出帳銀行（可選）</label>
          <select class="select" id="${INS_MODAL_ID}-bank">
            <option value="">— 不指定 —</option>
            ${banks.map((b) => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}
          </select>
        </div>
        <div class="modal-actions" style="margin-top:16px;">
          <button type="button" class="btn btn-ghost" data-action="cancel">取消</button>
          <button type="button" class="btn btn-primary" data-action="ok"><i data-lucide="check" style="width:14px;height:14px;"></i> 確認扣款</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = (result) => {
      closeModal(INS_MODAL_ID);
      overlay.remove();
      resolve(result);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { close(null); return; }
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'cancel') { close(null); return; }
      if (btn.dataset.action === 'ok') {
        const sel = document.getElementById(`${INS_MODAL_ID}-bank`);
        close({ bankId: sel?.value || '' });
      }
    });

    openModal(INS_MODAL_ID);
    if (window.lucide) window.lucide.createIcons();
  });
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/pages/settlements.js
   Version: v103.0.35
   Batch: B29-7a
   ═══════════════════════════════════════════ */