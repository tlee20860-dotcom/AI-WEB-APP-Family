// insurance.js — 保險清單表（v103.0.37）
// v103.0.37（B31-1）：
//   ✅ 修正：payments 快取失效 — 改為訂閱 insurance_payments 節點
//      - 移除 _lastIds id 快取邏輯（按扣款後不刷新）
// v103.0.36（B30-8）：
//   ✅ 保單卡片加「已供款總額」與「剩餘供款」兩欄
// ============================================
import { formatHKD } from '../lib/format.js';
import { esc } from '../lib/dom.js';
import { computeEnrichedPolicies, calcProgress, getPolicyHolderId } from '../lib/insurance.js';
import { familyRef } from '../core/db.js';
import { onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { resolveName } from '../config/entity-registry.js';
import { getColumns, getResolvers } from '../config/column-registry.js';
import { AppState } from '../core/state.js';
import { openEntityModal } from '../entity/entity-modal.js';
import { deleteEntity } from '../entity/entity-helpers.js';
import { openConfirm } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { renderStatsCards } from '../shared/stats-cards.js';
import { renderDataTable } from '../shared/data-table.js';
import { renderDataCard } from '../shared/data-card.js';
import { renderPageControls } from '../lib/page-controls.js';
import { ENTITY_KEYS, STORAGE_PREFIXES } from '../config/constants.js';

export default {
  title: '保險清單表',
  data: { policies: { type: 'list', path: 'insurance_policies' } },
  state: { view: 'card' },
  derived: {},
  blocks: [],

  customMount: (ctx) => {
    let _payments = {};
    let _statsApi = null;
    let _tableApi = null;
    let _cardApi = null;
    let _clickHandler = null;
    let _toggleHandler = null;
    let _controls = null;
    let _payUnsub = null;
    let _view = 'card';

    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIXES.VIEW}insurance-view`);
      if (saved === 'card' || saved === 'table') _view = saved;
    } catch (e) { /* noop */ }

    const render = () => {
      const policies = ctx.data.policies || [];
      const { year } = AppState.getYearMonth();
      const targetYear = Number(year) || new Date().getFullYear();
      const enriched = computeEnrichedPolicies(policies, _payments, targetYear);

      const statsRoot = document.getElementById('insurance-stats-root');
      if (statsRoot) {
        if (_statsApi) { try { _statsApi.destroy(); } catch (e) {} }
        statsRoot.innerHTML = '';
        const totalPaid = enriched.reduce((s, p) => s + (p._paidTotal || 0), 0);
        _statsApi = renderStatsCards({
          container: 'insurance-stats-root',
          cards: [
            { title: `${targetYear} 年度保單總供款`, value: formatHKD(enriched.reduce((s, p) => s + (p._currentAnnualPremium || 0), 0)), valueClass: 'cyan', hint: `共 ${enriched.length} 張保單`, icon: 'wallet' },
            { title: '累計已供款總額', value: formatHKD(totalPaid), valueClass: 'emerald', hint: '所有保單的已扣款總和', icon: 'check-circle' },
            { title: '供款中保單', value: `${enriched.filter((p) => !p._isCompleted).length} 張`, valueClass: 'emerald', hint: '未供滿的保單數量', icon: 'shield' },
            { title: '已供滿保單', value: `${enriched.filter((p) => p._isCompleted).length} 張`, valueClass: 'emerald', hint: '已完成供款年期', icon: 'check-circle' },
          ],
          columns: 4,
        });
      }

      _paintSection(enriched.filter((p) => p._isCompleted));
      _paintActive(enriched.filter((p) => !p._isCompleted), policies.length);
      if (window.lucide) window.lucide.createIcons();
    };

    const _hooks = (canInput) => ({
      customActions: canInput ? (row) => [
        { label: '編輯', icon: 'pencil', className: 'btn-ghost', action: 'edit', onClick: () => _onEdit(row) },
        { label: '刪除', icon: 'trash-2', className: 'btn-danger', action: 'del', onClick: () => _onDelete(row) },
      ] : () => [],
    });

    const _paintSection = (list) => {
      const s = document.getElementById('completed-section');
      const g = document.getElementById('completed-grid');
      const c = document.getElementById('completed-count');
      if (!s || !g) return;
      if (list.length === 0) { s.style.display = 'none'; return; }
      s.style.display = 'block';
      if (c) c.textContent = String(list.length);
      const html = list.map(_cardHtml).join('');
      if (g.__lastHtml === html) return;
      g.__lastHtml = html;
      g.innerHTML = html;
    };

    const _paintActive = (active, total) => {
      const cardEl = document.getElementById('insurance-card-view');
      const tableEl = document.getElementById('insurance-table-view');
      const emptyEl = document.getElementById('insurance-empty-state');
      if (!cardEl || !tableEl) return;
      if (total === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        cardEl.style.display = 'none';
        tableEl.style.display = 'none';
        return;
      }
      if (emptyEl) emptyEl.style.display = 'none';

      if (_tableApi) { try { _tableApi.destroy(); } catch (e) {} _tableApi = null; }
      if (_cardApi) { try { _cardApi.destroy(); } catch (e) {} _cardApi = null; }

      if (_view === 'table') {
        cardEl.style.display = 'none';
        tableEl.style.display = 'block';
        if (active.length === 0) {
          tableEl.innerHTML = '<div class="glass-card"><div class="empty-state">所有保單均已供滿</div></div>';
          return;
        }
        const canInput = AppState.getCanInput();
        const columns = getColumns('insurancePolicies');
        const resolvers = getResolvers('insurancePolicies');
        _tableApi = renderDataTable({
          container: tableEl,
          entityKey: ENTITY_KEYS.POLICY,
          rows: active,
          tableId: 'insurance-table',
          options: { columns, resolvers, storageKey: 'insurance-table' },
          hooks: _hooks(canInput),
        });
      } else {
        cardEl.style.display = 'block';
        tableEl.style.display = 'none';
        const html = active.length === 0
          ? '<div class="glass-card" style="text-align:center;padding:40px 20px;"><p style="color:var(--neon-emerald);">🎉 所有保單均已供滿</p></div>'
          : `<div class="grid grid-3">${active.map((p) => `<div class="glass-card policy-card">${_cardHtml(p)}</div>`).join('')}</div>`;
        if (cardEl.__lastHtml !== html) {
          cardEl.__lastHtml = html;
          cardEl.innerHTML = html;
        }
      }
    };

    const _cardHtml = (p) => {
      const holderId = getPolicyHolderId(p);
      const holder = resolveName('members', holderId) || holderId || '—';
      const insured = resolveName('members', p.memberId) || p.memberId || '—';
      const isFund = p.type === 'fund_insurance';
      const total = p.totalPolicyPeriods || 0;
      const done = p.completedPeriods || 0;
      const pct = calcProgress(p);
      const canInput = AppState.getCanInput();

      const paidTotal = p._paidTotal || 0;
      const totalPremium = p._totalPremium || 0;
      const remaining = Math.max(0, totalPremium - paidTotal);

      const actions = canInput ? `<div class="policy-actions"><button type="button" class="btn btn-sm btn-ghost" data-action="edit-policy" data-id="${p.id}"><i data-lucide="pencil" style="width:14px;height:14px;"></i> 編輯</button><button type="button" class="btn btn-sm btn-danger" data-action="delete-policy" data-id="${p.id}"><i data-lucide="trash-2" style="width:14px;height:14px;"></i> 刪除</button></div>` : '';
      const progressHtml = isFund ? '' : `<div class="policy-progress" style="margin-top:12px;"><div class="policy-progress-text"><span>整體供款進度</span><span>${done} / ${total} 期 (${pct}%)</span></div><div class="progress"><div class="progress-bar" style="width:${pct}%;"></div></div></div>`;

      return `<div class="policy-header"><div><div class="policy-name">${esc(p.name || '')}</div><div class="policy-company">${esc(p.company || '')} · ${isFund ? '基金保險' : '普通保險'}</div></div></div>
        <div class="policy-info-grid">
          <div class="policy-info-item"><span class="policy-info-label">保單持有人</span><span class="policy-info-value">${esc(holder)}</span></div>
          <div class="policy-info-item"><span class="policy-info-label">受保人</span><span class="policy-info-value">${esc(insured)}</span></div>
        </div>
        <div class="policy-info-grid" style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,0.08);">
          <div class="policy-info-item"><span class="policy-info-label">本期年繳</span><span class="policy-info-value text-cyan">${formatHKD(p._currentAnnualPremium)}</span></div>
          <div class="policy-info-item"><span class="policy-info-label">保單總供款</span><span class="policy-info-value text-magenta">${formatHKD(totalPremium)}</span></div>
        </div>
        <div class="policy-info-grid" style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,0.08);">
          <div class="policy-info-item"><span class="policy-info-label">已供款總額</span><span class="policy-info-value text-emerald" style="font-weight:700;">${formatHKD(paidTotal)}</span></div>
          <div class="policy-info-item"><span class="policy-info-label">剩餘供款</span><span class="policy-info-value">${formatHKD(remaining)}</span></div>
        </div>${progressHtml}${actions}`;
    };

    const _onEdit = (row) => {
      openEntityModal({ entity: ENTITY_KEYS.POLICY, mode: 'edit', id: row.id, allRows: ctx.data.policies || [] });
    };

    const _onDelete = async (row) => {
      const ok = await openConfirm(`⚠️ 確定要刪除保單「${row.name}」嗎？`, { title: '刪除保單', okText: '刪除', okClass: 'btn-danger' });
      if (!ok) return;
      try { await deleteEntity(ENTITY_KEYS.POLICY, row.id, getPolicyHolderId(row)); showToast('✅ 已刪除保單', 'success'); }
      catch (err) { showToast('刪除失敗：' + err.message, 'error'); }
    };

    _clickHandler = async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn || !AppState.getCanInput()) return;
      const policies = ctx.data.policies || [];
      const policy = policies.find((p) => p.id === btn.dataset.id);
      if (!policy) return;
      if (btn.dataset.action === 'edit-policy') _onEdit(policy);
      else if (btn.dataset.action === 'delete-policy') _onDelete(policy);
    };
    document.getElementById('insurance-card-view')?.addEventListener('click', _clickHandler);
    document.getElementById('completed-grid')?.addEventListener('click', _clickHandler);

    const headerEl = document.getElementById('completed-header');
    const bodyEl = document.getElementById('completed-body');
    const sectionEl = document.getElementById('completed-section');
    _toggleHandler = () => {
      if (!bodyEl || !sectionEl) return;
      const open = bodyEl.style.display === 'block';
      bodyEl.style.display = open ? 'none' : 'block';
      sectionEl.classList.toggle('open', !open);
    };
    if (headerEl) headerEl.addEventListener('click', _toggleHandler);

    _controls = renderPageControls({
      containerId: 'page-controls-root',
      headerContainerId: 'page-header-actions',
      items: [
        {
          type: 'add',
          label: '新增保單',
          onClick: () => openEntityModal({ entity: ENTITY_KEYS.POLICY, mode: 'add' }),
        },
        {
          type: 'viewToggle',
          storageKey: 'insurance-view',
          defaultView: 'card',
          onChange: (v) => { _view = v; render(); },
        },
        { type: 'year' },
        { type: 'month' },
      ],
    });

    const addFirstBtn = document.getElementById('add-first-policy-btn');
    const onAddFirst = () => openEntityModal({ entity: ENTITY_KEYS.POLICY, mode: 'add' });
    if (addFirstBtn) addFirstBtn.addEventListener('click', onAddFirst);

    /* ============================================
       🆕 v103.0.37（B31-1）：訂閱 insurance_payments
       -------------------------------------------------
       原因：原本用 _lastIds 快取 policy id 列表，
            但 insurance_payments 更新時 id 未變，
            導致「已供款總額 / 剩餘供款」不刷新。
       解：改為直接訂閱 insurance_payments 節點，
          任何變更（含 settlements 頁扣款）都觸發。
       ============================================ */
    try {
      _payUnsub = onValue(familyRef('insurance_payments'), (snap) => {
        _payments = snap.val() || {};
        render();
      }, (err) => {
        console.warn('[insurance] 訂閱 payments 失敗：', err);
      });
    } catch (e) {
      console.warn('[insurance] 無法訂閱 payments：', e);
    }

    const unsub = ctx.onDataChange((key) => {
      if (key === '__APP__' && _controls) {
        try { _controls.refresh(); } catch (e) {}
      }
      render();
    });

    render();

    return {
      destroy: () => {
        unsub();
        if (_payUnsub) { try { _payUnsub(); } catch (e) {} _payUnsub = null; }
        if (_statsApi) { try { _statsApi.destroy(); } catch (e) {} }
        if (_tableApi) { try { _tableApi.destroy(); } catch (e) {} }
        if (_cardApi) { try { _cardApi.destroy(); } catch (e) {} }
        if (_controls) { try { _controls.destroy(); } catch (e) {} }
        if (_clickHandler) {
          document.getElementById('insurance-card-view')?.removeEventListener('click', _clickHandler);
          document.getElementById('completed-grid')?.removeEventListener('click', _clickHandler);
        }
        if (_toggleHandler && headerEl) headerEl.removeEventListener('click', _toggleHandler);
        if (addFirstBtn) addFirstBtn.removeEventListener('click', onAddFirst);
      },
    };
  },
};

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/pages/insurance.js
   Version: v103.0.37
   Batch: B31-1
   ═══════════════════════════════════════════ */
