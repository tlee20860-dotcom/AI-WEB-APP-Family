// portfolio.js — 基金投資表（v103.0.33）
// v103.0.33（B33-1）：
//   ✅ 快照改為以估值日（YYYY-MM-DD）為 key
//   ✅ 卡片顯示最新一筆快照（單位數 / 價格 USD / 總值 USD / 保單價值 HKD）
//   ✅ 支援歷史快照展開、可刪除
//   ✅ 支援任選兩筆快照對比
//   ✅ 成本累積邏輯不動（由保險保單自動分配）
// ============================================
import { formatHKD } from '../lib/format.js';
import { esc } from '../lib/dom.js';
import { openEntityModal } from '../entity/entity-modal.js';
import { deleteEntity } from '../entity/entity-helpers.js';
import { openConfirm, openModal, closeModal } from '../ui/modal.js';
import { buildForm } from '../ui/form-builder.js';
import { showToast } from '../ui/toast.js';
import { saveFundSnapshot, removeFundSnapshot, getFundSnapshotListOnce } from '../core/db.js';
import { AppState } from '../core/state.js';
import { renderPageControls } from '../lib/page-controls.js';
import { ENTITY_KEYS } from '../config/constants.js';
import { calcFundCostEstimate } from '../lib/insurance.js';

const SNAP_MODAL_ID = 'fund-snapshot-modal';
const HISTORY_MODAL_ID = 'fund-history-modal';
const DEFAULT_FX = 7.8;

export default {
  title: '基金投資表',
  data: {
    funds: { type: 'list', path: 'funds' },
    policies: { type: 'list', path: 'insurance_policies' },
  },
  state: {},
  derived: {
    insuranceFunds: {
      deps: ['data.funds'],
      compute: (funds) => (funds || []).filter((f) => f.type === 'insurance'),
    },
    standaloneFunds: {
      deps: ['data.funds'],
      compute: (funds) => (funds || []).filter((f) => f.type !== 'insurance'),
    },
    statsCards: {
      deps: ['data.funds', 'data.policies'],
      compute: (funds, policies) => _buildStats(funds, policies),
    },
  },
  blocks: [
    { type: 'stats', container: 'portfolio-stats-root', cards: '$.statsCards' },
  ],

  customMount: (ctx) => {
    let _controls = null;

    const render = () => {
      _paintInsurance(ctx);
      _paintStandalone(ctx);
      if (window.lucide) window.lucide.createIcons();
    };

    const unsub = ctx.onDataChange((key) => {
      if (key.startsWith('data.funds') || key.startsWith('data.policies') || key === '__APP__') {
        if (key === '__APP__' && _controls) {
          try { _controls.refresh(); } catch (e) {}
        }
        render();
      }
    });

    render();

    _controls = renderPageControls({
      containerId: 'page-controls-root',
      items: [
        {
          type: 'add',
          label: '新增基金',
          onClick: () => openEntityModal({ entity: ENTITY_KEYS.FUND, mode: 'add', onSuccess: render }),
        },
        {
          type: 'year',
          year: AppState.year,
          onChange: (y) => AppState.setYearMonth(y, AppState.month === 'all' ? '01' : AppState.month),
        },
        {
          type: 'month',
          month: AppState.month === 'all' ? '01' : AppState.month,
          onChange: (m) => AppState.setYearMonth(AppState.year, m),
        },
      ],
    });

    const addFirstBtn = document.getElementById('add-first-fund-btn');
    const onAddFirst = () => openEntityModal({ entity: ENTITY_KEYS.FUND, mode: 'add', onSuccess: render });
    if (addFirstBtn) addFirstBtn.addEventListener('click', onAddFirst);

    const cardClickHandler = async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id) return;
      const funds = ctx.data.funds || [];
      const fund = funds.find((f) => f.id === id);
      if (!fund) return;

      if (btn.dataset.action === 'edit-fund') {
        openEntityModal({ entity: ENTITY_KEYS.FUND, mode: 'edit', id, allRows: funds, onSuccess: render });
      } else if (btn.dataset.action === 'delete-fund') {
        const ok = await openConfirm(`確定要刪除基金「${fund.name}」嗎？`, { title: '刪除基金', okText: '刪除', okClass: 'btn-danger' });
        if (!ok) return;
        try { await deleteEntity(ENTITY_KEYS.FUND, id); showToast('✅ 已刪除基金', 'success'); }
        catch (err) { showToast('刪除失敗：' + err.message, 'error'); }
      }
    };

    const snapshotHandler = async (e) => {
      const btn = e.target.closest('button[data-action="snapshot"]');
      if (btn) {
        const fundId = btn.dataset.id;
        const fundName = btn.dataset.name || '';
        if (fundId) await _openSnapshotModal(fundId, fundName, render);
        return;
      }
      const histBtn = e.target.closest('button[data-action="history"]');
      if (histBtn) {
        const fundId = histBtn.dataset.id;
        const fundName = histBtn.dataset.name || '';
        if (fundId) await _openHistoryModal(fundId, fundName, render);
      }
    };

    const insRoot = document.getElementById('insurance-funds-list');
    const stdRoot = document.getElementById('standalone-funds-list');

    insRoot?.addEventListener('click', cardClickHandler);
    stdRoot?.addEventListener('click', cardClickHandler);
    document.addEventListener('click', snapshotHandler);

    return {
      destroy: () => {
        unsub();
        if (_controls) { try { _controls.destroy(); } catch (e) {} }
        if (addFirstBtn) addFirstBtn.removeEventListener('click', onAddFirst);
        insRoot?.removeEventListener('click', cardClickHandler);
        stdRoot?.removeEventListener('click', cardClickHandler);
        document.removeEventListener('click', snapshotHandler);
      },
    };
  },
};

/* ============================================
   反查機制：找出基金對應的保單
   ============================================ */
function _findPolicyByFund(fund, policies) {
  if (fund.policyId) {
    const p = (policies || []).find((x) => x.id === fund.policyId);
    if (p) return p;
  }
  return (policies || []).find((p) =>
    (p.fundsAllocation || []).some((a) => a.fundId === fund.id)
  ) || null;
}

/* ============================================
   為單一保單計算所有基金的投入成本（邏輯不動）
   ============================================ */
function _getCostMapForPolicy(policy, allFunds, targetYear, targetMonth) {
  const costMap = {};
  const policyFunds = (allFunds || []).filter(
    (f) => f.type === 'insurance' && _findPolicyByFund(f, [policy]) !== null
  );
  if (policyFunds.length === 0) return costMap;

  const totalPolicyCost = calcFundCostEstimate(policy, targetYear, targetMonth);
  const manualFunds = policyFunds.filter((f) => Number(f.cost) > 0);
  const manualTotal = manualFunds.reduce((s, f) => s + Number(f.cost), 0);
  manualFunds.forEach((f) => { costMap[f.id] = Number(f.cost); });

  const remainingCost = Math.max(0, totalPolicyCost - manualTotal);
  const dynamicFunds = policyFunds.filter((f) => Number(f.cost) <= 0);
  const dynamicTotalPct = dynamicFunds.reduce((s, f) => {
    const alloc = (policy.fundsAllocation || []).find((a) => a.fundId === f.id);
    return s + (alloc ? Number(alloc.pct) : 0);
  }, 0);

  dynamicFunds.forEach((f) => {
    const alloc = (policy.fundsAllocation || []).find((a) => a.fundId === f.id);
    const pct = alloc ? Number(alloc.pct) : 0;
    costMap[f.id] = dynamicTotalPct > 0 ? Math.round(remainingCost * (pct / dynamicTotalPct)) : 0;
  });

  return costMap;
}

/* ============================================
   保險基金區
   ============================================ */
function _paintInsurance(ctx) {
  const root = document.getElementById('insurance-funds-list');
  if (!root) return;
  const list = ctx.derived.insuranceFunds || [];
  if (list.length === 0) {
    root.innerHTML = '<div class="glass-card"><div class="empty-state">尚無保險基金</div></div>';
    return;
  }
  const policies = ctx.data.policies || [];
  const ym = AppState.getYearMonth();
  const y = ym.year || String(new Date().getFullYear());
  const m = ym.month === 'all' ? String(new Date().getMonth() + 1).padStart(2, '0') : ym.month;

  const costMaps = {};
  policies.forEach((p) => { costMaps[p.id] = _getCostMapForPolicy(p, list, y, m); });

  const rows = list.map((f) => {
    const policy = _findPolicyByFund(f, policies);
    const alloc = (policy?.fundsAllocation || []).find((a) => a.fundId === f.id);
    const pct = alloc ? alloc.pct : 0;
    const dynamicCost = (policy && costMaps[policy.id]) ? (costMaps[policy.id][f.id] || 0) : (Number(f.cost) || 0);
    return { fund: f, policyName: policy?.name || '（未關聯）', pct, dynamicCost };
  });
  const html = rows.map((r) => _cardHtml(r, true)).join('');
  if (root.__lastHtml === html) return;
  root.__lastHtml = html;
  root.innerHTML = html;

  /* 非同步填充最新快照 */
  rows.forEach((r) => _fillLatestSnapshot(r.fund.id));
}

/* ============================================
   獨立基金區
   ============================================ */
function _paintStandalone(ctx) {
  const root = document.getElementById('standalone-funds-list');
  if (!root) return;
  const list = ctx.derived.standaloneFunds || [];
  const empty = document.getElementById('fund-empty-state');
  if (list.length === 0) {
    if (empty) empty.style.display = 'block';
    root.innerHTML = '';
    root.__lastHtml = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  const html = `<div class="data-cards-grid">${list.map((f) => _cardHtml({ fund: f }, false)).join('')}</div>`;
  if (root.__lastHtml === html) return;
  root.__lastHtml = html;
  root.innerHTML = html;

  list.forEach((f) => _fillLatestSnapshot(f.id));
}

/* ============================================
   非同步填充最新快照（單位數 / 價格 / 總值 / 保單價值）
   ============================================ */
async function _fillLatestSnapshot(fundId) {
  const placeholder = document.querySelector(`[data-snap-latest="${fundId}"]`);
  if (!placeholder) return;
  try {
    const snaps = await getFundSnapshotListOnce(fundId);
    const latest = snaps[snaps.length - 1];
    if (!latest) {
      placeholder.innerHTML = '<div class="snap-empty-hint">尚未輸入任何快照</div>';
      return;
    }
    const shares = Number(latest.shares) || 0;
    const nav = Number(latest.nav) || 0;
    const totalUsd = shares * nav;
    const totalHkd = totalUsd * DEFAULT_FX;
    placeholder.innerHTML = `
      <div class="policy-info-grid" style="margin-top:8px;">
        <div class="policy-info-item"><span class="policy-info-label">單位數目</span><span class="policy-info-value">${shares}</span></div>
        <div class="policy-info-item"><span class="policy-info-label">基金價格</span><span class="policy-info-value">USD ${nav} <span class="text-muted" style="font-size:11px;">(${esc(latest.dateKey)})</span></span></div>
        <div class="policy-info-item"><span class="policy-info-label">總價值</span><span class="policy-info-value">USD ${totalUsd.toFixed(2)}</span></div>
        <div class="policy-info-item"><span class="policy-info-label">保單貨幣價值</span><span class="policy-info-value text-emerald">HKD ${totalHkd.toFixed(2)}</span></div>
      </div>
    `;
  } catch (e) {
    placeholder.innerHTML = '<div class="snap-empty-hint">快照載入失敗</div>';
  }
}

/* ============================================
   卡片 HTML
   ============================================ */
function _cardHtml({ fund, policyName, pct, dynamicCost }, isInsurance) {
  const cost = isInsurance ? (dynamicCost != null ? dynamicCost : Number(fund.cost) || 0) : (Number(fund.cost) || 0);
  const value = Number(fund.currentValue) || 0;
  const pnl = value - cost;
  const pnlCls = pnl >= 0 ? 'text-emerald' : 'text-red';
  const pnlSign = pnl >= 0 ? '+' : '';
  const pnlPct = cost > 0 ? ((pnl / cost) * 100).toFixed(2) : '0.00';

  const meta = isInsurance
    ? `<div class="policy-company">${esc(policyName)} · 比例 ${pct}%</div>`
    : '';

  return `
    <div class="glass-card policy-card" data-fund-id="${esc(fund.id)}">
      <div class="policy-header">
        <div style="min-width:0;">
          <div class="policy-name">${esc(fund.name || '（未命名）')}</div>
          ${meta}
        </div>
      </div>
      <div data-snap-latest="${esc(fund.id)}">
        <div class="snap-empty-hint">載入中…</div>
      </div>
      <div class="policy-info-grid" style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,0.08);">
        <div class="policy-info-item"><span class="policy-info-label">投入成本</span><span class="policy-info-value">${formatHKD(cost)}</span></div>
        <div class="policy-info-item"><span class="policy-info-label">盈虧</span><span class="policy-info-value ${pnlCls}">${pnlSign}${formatHKD(pnl)} (${pnlPct}%)</span></div>
      </div>
      <div class="policy-actions">
        <button type="button" class="btn btn-sm btn-primary" data-action="snapshot" data-id="${esc(fund.id)}" data-name="${esc(fund.name || '')}">
          <i data-lucide="camera" style="width:14px;height:14px;"></i> 輸入快照
        </button>
        <button type="button" class="btn btn-sm btn-ghost" data-action="history" data-id="${esc(fund.id)}" data-name="${esc(fund.name || '')}">
          <i data-lucide="history" style="width:14px;height:14px;"></i> 查看歷史
        </button>
        <button type="button" class="btn btn-sm btn-ghost" data-action="edit-fund" data-id="${esc(fund.id)}">
          <i data-lucide="pencil" style="width:14px;height:14px;"></i> 編輯
        </button>
        <button type="button" class="btn btn-sm btn-danger" data-action="delete-fund" data-id="${esc(fund.id)}">
          <i data-lucide="trash-2" style="width:14px;height:14px;"></i> 刪除
        </button>
      </div>
    </div>
  `;
}

/* ============================================
   快照輸入 Modal（估值日 + USD 價格）
   ============================================ */
async function _openSnapshotModal(fundId, fundName, onDone) {
  document.getElementById(SNAP_MODAL_ID)?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = SNAP_MODAL_ID;
  overlay.innerHTML = `<div class="modal" style="max-width:560px;max-height:90vh;overflow-y:auto;"><h2 class="modal-title">輸入快照 — ${esc(fundName)}</h2><div id="${SNAP_MODAL_ID}-form-root"></div></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(SNAP_MODAL_ID); });

  const today = new Date().toISOString().slice(0, 10);

  buildForm({
    containerId: `${SNAP_MODAL_ID}-form-root`,
    fields: [
      { type: 'date', id: 'snap-date', label: '估值日（截圖上的價格日期）', required: true, defaultValue: today },
      { type: 'number', id: 'snap-shares', label: '單位數目', required: true, min: 0, step: 0.0001, defaultValue: 0 },
      { type: 'number', id: 'snap-nav', label: '基金價格 (USD)', required: true, min: 0, step: 0.0001, defaultValue: 0 },
      { type: 'number', id: 'snap-total-usd', label: '總價值 (USD，自動計算)', required: false, disabled: true, defaultValue: 0 },
      { type: 'number', id: 'snap-total-hkd', label: '保單貨幣價值 (HKD，自動計算)', required: false, disabled: true, defaultValue: 0 },
    ],
    submitText: '儲存快照',
    showCancel: true,
    cancelText: '取消',
    onSubmit: async (data) => {
      try {
        const dateKey = data['snap-date'];
        const shares = Number(data['snap-shares']) || 0;
        const nav = Number(data['snap-nav']) || 0;
        await saveFundSnapshot(fundId, dateKey, { shares, nav });
        showToast(`✅ 已儲存 ${dateKey} 快照`, 'success');
        closeModal(SNAP_MODAL_ID);
        overlay.remove();
        if (typeof onDone === 'function') onDone();
      } catch (err) { showToast('儲存失敗：' + err.message, 'error'); }
    },
    onCancel: () => { closeModal(SNAP_MODAL_ID); overlay.remove(); },
  });

  const sharesEl = document.getElementById('snap-shares');
  const navEl = document.getElementById('snap-nav');
  const totalUsdEl = document.getElementById('snap-total-usd');
  const totalHkdEl = document.getElementById('snap-total-hkd');

  const calcValue = () => {
    const s = Number(sharesEl?.value) || 0;
    const n = Number(navEl?.value) || 0;
    const usd = s * n;
    if (totalUsdEl) totalUsdEl.value = usd.toFixed(2);
    if (totalHkdEl) totalHkdEl.value = (usd * DEFAULT_FX).toFixed(2);
  };
  sharesEl?.addEventListener('input', calcValue);
  navEl?.addEventListener('input', calcValue);

  openModal(SNAP_MODAL_ID);
  if (window.lucide) window.lucide.createIcons();
}

/* ============================================
   歷史快照 Modal（列表 + 刪除 + 任選兩筆對比）
   ============================================ */
async function _openHistoryModal(fundId, fundName, onDone) {
  document.getElementById(HISTORY_MODAL_ID)?.remove();

  const snaps = await getFundSnapshotListOnce(fundId);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = HISTORY_MODAL_ID;

  const rowsHtml = snaps.length === 0
    ? '<div class="empty-state">尚無任何快照</div>'
    : snaps.map((s) => {
        const usd = (Number(s.shares) || 0) * (Number(s.nav) || 0);
        const hkd = usd * DEFAULT_FX;
        return `
          <tr>
            <td><input type="checkbox" class="hist-cb" data-date="${esc(s.dateKey)}"></td>
            <td>${esc(s.dateKey)}</td>
            <td>${s.shares}</td>
            <td>USD ${s.nav}</td>
            <td>USD ${usd.toFixed(2)}</td>
            <td>HKD ${hkd.toFixed(2)}</td>
            <td><button type="button" class="btn btn-xs btn-danger" data-del-date="${esc(s.dateKey)}">刪除</button></td>
          </tr>
        `;
      }).join('');

  overlay.innerHTML = `
    <div class="modal" style="max-width:760px;max-height:90vh;overflow-y:auto;">
      <h2 class="modal-title">歷史快照 — ${esc(fundName)}</h2>
      <div style="margin-bottom:12px;">
        <button type="button" class="btn btn-sm btn-primary" id="hist-compare-btn" disabled>對比已勾選的兩筆</button>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table" style="width:100%;">
          <thead>
            <tr>
              <th style="width:32px;"></th>
              <th>估值日</th>
              <th>單位數</th>
              <th>價格 (USD)</th>
              <th>總值 (USD)</th>
              <th>保單價值 (HKD)</th>
              <th style="width:64px;">操作</th>
            </tr>
          </thead>
          <tbody id="hist-tbody">${rowsHtml}</tbody>
        </table>
      </div>
      <div id="hist-compare-result" style="margin-top:16px;"></div>
      <div style="margin-top:16px;text-align:right;">
        <button type="button" class="btn btn-sm" id="hist-close-btn">關閉</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) _closeHistory(); });

  const tbody = document.getElementById('hist-tbody');
  const compareBtn = document.getElementById('hist-compare-btn');
  const compareResult = document.getElementById('hist-compare-result');

  const refreshCompareBtn = () => {
    const checked = tbody.querySelectorAll('.hist-cb:checked');
    compareBtn.disabled = checked.length !== 2;
  };

  tbody?.addEventListener('change', (e) => {
    if (e.target.classList.contains('hist-cb')) {
      const checked = tbody.querySelectorAll('.hist-cb:checked');
      if (checked.length > 2) {
        e.target.checked = false;
      }
      refreshCompareBtn();
    }
  });

  tbody?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-del-date]');
    if (!btn) return;
    const dateKey = btn.dataset.delDate;
    const ok = await openConfirm(`確定要刪除 ${dateKey} 的快照嗎？`, { title: '刪除快照', okText: '刪除', okClass: 'btn-danger' });
    if (!ok) return;
    try {
      await removeFundSnapshot(fundId, dateKey);
      showToast('✅ 已刪除快照', 'success');
      _closeHistory();
      if (typeof onDone === 'function') onDone();
    } catch (err) { showToast('刪除失敗：' + err.message, 'error'); }
  });

  compareBtn?.addEventListener('click', () => {
    const checked = Array.from(tbody.querySelectorAll('.hist-cb:checked')).map((cb) => cb.dataset.date);
    if (checked.length !== 2) return;
    checked.sort();
    const a = snaps.find((s) => s.dateKey === checked[0]);
    const b = snaps.find((s) => s.dateKey === checked[1]);
    if (!a || !b) return;
    const aUsd = (Number(a.shares) || 0) * (Number(a.nav) || 0);
    const bUsd = (Number(b.shares) || 0) * (Number(b.nav) || 0);
    const aHkd = aUsd * DEFAULT_FX;
    const bHkd = bUsd * DEFAULT_FX;
    const diff = (x, y) => {
      const d = y - x;
      const pct = x > 0 ? ((d / x) * 100).toFixed(2) : '—';
      const sign = d >= 0 ? '+' : '';
      return `${sign}${d.toFixed(4)} (${sign}${pct}%)`;
    };
    compareResult.innerHTML = `
      <div class="glass-card">
        <div class="policy-name" style="margin-bottom:8px;">對比：${esc(a.dateKey)} → ${esc(b.dateKey)}</div>
        <div class="policy-info-grid">
          <div class="policy-info-item"><span class="policy-info-label">單位數</span><span class="policy-info-value">${a.shares} → ${b.shares}</span><span class="policy-info-value text-emerald">${diff(Number(a.shares) || 0, Number(b.shares) || 0)}</span></div>
          <div class="policy-info-item"><span class="policy-info-label">價格 (USD)</span><span class="policy-info-value">${a.nav} → ${b.nav}</span><span class="policy-info-value text-emerald">${diff(Number(a.nav) || 0, Number(b.nav) || 0)}</span></div>
          <div class="policy-info-item"><span class="policy-info-label">總值 (USD)</span><span class="policy-info-value">${aUsd.toFixed(2)} → ${bUsd.toFixed(2)}</span><span class="policy-info-value text-emerald">${diff(aUsd, bUsd)}</span></div>
          <div class="policy-info-item"><span class="policy-info-label">保單價值 (HKD)</span><span class="policy-info-value">${aHkd.toFixed(2)} → ${bHkd.toFixed(2)}</span><span class="policy-info-value text-emerald">${diff(aHkd, bHkd)}</span></div>
        </div>
      </div>
    `;
  });

  document.getElementById('hist-close-btn')?.addEventListener('click', _closeHistory);

  openModal(HISTORY_MODAL_ID);
  if (window.lucide) window.lucide.createIcons();
}

function _closeHistory() {
  const el = document.getElementById(HISTORY_MODAL_ID);
  if (el) el.remove();
  closeModal(HISTORY_MODAL_ID);
}

/* ============================================
   Stats（邏輯不動）
   ============================================ */
function _buildStats(funds, policies) {
  const list = funds || [];
  const pols = policies || [];
  const ym = AppState.getYearMonth();
  const y = ym.year || String(new Date().getFullYear());
  const m = ym.month === 'all' ? String(new Date().getMonth() + 1).padStart(2, '0') : ym.month;

  const costMaps = {};
  pols.forEach((p) => { costMaps[p.id] = _getCostMapForPolicy(p, list, y, m); });

  let cost = 0;
  list.forEach((f) => {
    if (f.type === 'insurance') {
      const policy = _findPolicyByFund(f, pols);
      if (policy && costMaps[policy.id]) {
        cost += costMaps[policy.id][f.id] || 0;
      } else {
        cost += Number(f.cost) || 0;
      }
    } else {
      cost += Number(f.cost) || 0;
    }
  });
  const value = list.reduce((s, f) => s + (Number(f.currentValue) || 0), 0);
  const pnl = value - cost;
  const pct = cost > 0 ? ((pnl / cost) * 100).toFixed(2) : '0.00';
  const sign = pnl >= 0 ? '+' : '';
  const insCount = list.filter((f) => f.type === 'insurance').length;
  const standaloneCount = list.filter((f) => f.type !== 'insurance').length;
  return [
    { title: '總投入成本', value: formatHKD(cost), hint: `共 ${list.length} 筆（保險 ${insCount} / 獨立 ${standaloneCount}）`, icon: 'wallet' },
    { title: '總現時價值', value: formatHKD(value), valueClass: 'emerald', hint: '最新現值加總', icon: 'line-chart' },
    { title: '總帳面盈虧', value: `${sign}${formatHKD(pnl)} (${pct}%)`, valueClass: pnl >= 0 ? 'emerald' : 'red', hint: pnl >= 0 ? '獲利中' : '虧損中', icon: pnl >= 0 ? 'trending-up' : 'trending-down' },
  ];
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/pages/portfolio.js
   Version: v103.0.33
   Batch: B33-1
   Writer: A20261013-003#022
   ═══════════════════════════════════════════ */