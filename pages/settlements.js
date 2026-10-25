// ============================================
// settlements.js — 結算清單（V2 重構版）
// 位置：pages/settlements.js
// 說明：整合一般支出與保險扣款，提供確認與取消功能。
// ============================================

import { AppState } from '../config/state.js';
import { api } from '../domain/api-client.js';
import { mergeSettlementData } from '../domain/settlement.js';
import { renderTable } from '../ui/table.js';
import { renderYearMonth } from '../ui/controls.js';
import { openConfirm, openModal, closeModal } from '../ui/modal.js';
import { createForm } from '../ui/form.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc } from '../ui/format.js';

export default {
  _currentYear: '',
  _currentMonth: '',
  _data: [],

  async render() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h1 style="font-size:24px; font-weight:700; color:var(--primary);">結算清單</h1>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
        <div id="settle-controls-period"></div>
        <div class="flex items-center gap-8">
          <input type="checkbox" id="settle-hide-done" style="cursor:pointer;">
          <label for="settle-hide-done" style="font-size:13px; color:var(--text-secondary); cursor:pointer;">隱藏已處理</label>
        </div>
      </div>

      <div id="settle-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;"></div>
      
      <div id="settle-list-container"></div>
    `;

    // 狀態監聽
    AppState.on('ym-change', () => this._loadData());

    // 渲染控制列
    renderYearMonth('settle-controls-period', { includeAllMonth: true }, () => {
      this._loadData();
    });

    document.getElementById('settle-hide-done')?.addEventListener('change', () => {
      this._renderListAndStats();
    });

    await this._loadData();
  },

  async _loadData() {
    const listRoot = document.getElementById('settle-list-container');
    if (!listRoot) return;

    listRoot.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">載入資料中…</div>';

    const { year, month } = AppState.getYearMonth();
    this._currentYear = String(year);
    this._currentMonth = month;

    try {
      // 1. 向後端取得該年度的所有資料
      const res = await api.fetchSettlementsYear(year);
      
      // 2. 攤平 memberExpenses
      const memberExpenses = [];
      if (month !== 'all') {
        const mm = String(month).padStart(2, '0');
        (res.memberExpensesByMonth[mm] || []).forEach(e => memberExpenses.push({ ...e, year, month: mm }));
      } else {
        Object.entries(res.memberExpensesByMonth).forEach(([mm, list]) => {
          list.forEach(e => memberExpenses.push({ ...e, year, month: mm }));
        });
      }

      // 3. 組裝保險列
      const insuranceRows = [];
      (res.policies || []).forEach(p => {
        const payments = res.paymentsCache[p.id]?.[year] || {};
        
        if (month !== 'all') {
          const mm = String(month).padStart(2, '0');
          const pay = payments[mm];
          if (pay) {
            insuranceRows.push({ policyId: p.id, policyName: p.name, policyHolderId: p.policyHolderId, memberId: p.memberId, status: pay.status, amount: pay.amount, date: pay.date, paymentMode: p.paymentMode, advanceHolderId: p.advanceHolderId });
          }
        } else {
          Object.entries(payments).forEach(([mm, pay]) => {
            insuranceRows.push({ policyId: p.id, policyName: p.name, policyHolderId: p.policyHolderId, memberId: p.memberId, status: pay.status, amount: pay.amount, date: pay.date, paymentMode: p.paymentMode, advanceHolderId: p.advanceHolderId, month: mm });
          });
        }
      });

      // 4. 呼叫 Domain 進行合併
      this._data = mergeSettlementData({
        memberExpenses,
        insuranceRows,
        year: this._currentYear,
        month: this._currentMonth
      });

      this._renderListAndStats();

    } catch (err) {
      console.error('[settlements] 載入失敗：', err);
      showToast('載入結算資料失敗', 'error');
      listRoot.innerHTML = '<div style="color:var(--accent-danger); padding:20px;">載入失敗</div>';
    }
  },

  _renderListAndStats() {
    const statsRoot = document.getElementById('settle-stats');
    const listRoot = document.getElementById('settle-list-container');
    if (!statsRoot || !listRoot || !this._data) return;

    const hideDone = document.getElementById('settle-hide-done')?.checked;

    // 過濾資料
    let displayData = this._data;
    if (hideDone) {
      displayData = displayData.filter(r => !r.isDone);
    }

    // 統計
    const pending = displayData.filter(r => !r.isDone);
    const done = displayData.filter(r => r.isDone);
    const pt = pending.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const dt = done.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    statsRoot.innerHTML = `
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">待處理金額</div>
        <div class="mono" style="font-size:20px; font-weight:700; color:var(--accent-danger);">${formatHKD(pt)}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${pending.length} 筆</div>
      </div>
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">已處理金額</div>
        <div class="mono" style="font-size:20px; font-weight:700; color:var(--accent-success);">${formatHKD(dt)}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${done.length} 筆</div>
      </div>
      <div class="glass-card" style="padding:16px;">
        <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">總計</div>
        <div class="mono" style="font-size:20px; font-weight:700; color:var(--primary);">${formatHKD(pt + dt)}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${displayData.length} 筆</div>
      </div>
    `;

    if (displayData.length === 0) {
      listRoot.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">此條件下無資料</div>';
      return;
    }

    // 操作按鈕
    const renderActions = (row) => {
      if (row.source === 'insurance') {
        return row.isDone
          ? `<button type="button" class="btn btn-sm btn-ghost" data-action="ins-unsync" data-id="${row._ref.policyId}">取消扣款</button>`
          : `<button type="button" class="btn btn-sm btn-primary" data-action="ins-sync" data-id="${row._ref.policyId}">確認扣款</button>`;
      }
      return `
        <button type="button" class="btn btn-sm btn-ghost" data-action="settle" data-id="${row._ref.expenseId}" data-member="${row.memberId}">結算</button>
      `;
    };

    renderTable({
      container: listRoot,
      rows: displayData,
      columnsKey: 'settlements',
      renderActions
    });

    // 事件綁定
    listRoot.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const row = displayData.find(r => r._ref.policyId === id || r._ref.expenseId === id);
      if (!row) return;

      if (action === 'ins-sync') this._handleInsuranceSync(row);
      else if (action === 'ins-unsync') this._handleInsuranceUnsync(row);
      else if (action === 'settle') this._handleSettle(row);
    });
  },

  async _handleInsuranceSync(row) {
    // 簡化版：直接確認，不選銀行
    try {
      await api.insuranceSync({
        policyId: row._ref.policyId,
        memberId: row.memberId,
        policyName: row.name,
        monthlyAverage: row.amount,
        year: row.year,
        month: row.month,
        paymentMode: row.paymentMode || 'direct',
        advanceHolderId: row.advanceHolderId || '',
      });
      showToast('✅ 已確認扣款', 'success');
      this._loadData();
    } catch (err) {
      showToast('失敗：' + err.message, 'error');
    }
  },

  async _handleInsuranceUnsync(row) {
    const ok = await openConfirm(`確定要取消「${row.name}」的扣款嗎？`, { title: '取消扣款', okClass: 'btn-danger' });
    if (!ok) return;
    try {
      await api.insuranceUnsync({
        policyId: row._ref.policyId,
        memberId: row.memberId,
        year: row.year,
        month: row.month,
        amount: row.amount,
        paymentMode: row.paymentMode || 'direct',
        advanceHolderId: row.advanceHolderId || '',
      });
      showToast('✅ 已取消扣款', 'success');
      this._loadData();
    } catch (err) {
      showToast('失敗：' + err.message, 'error');
    }
  },

  _handleSettle(row) {
    const modalId = 'settle-expense-modal';
    document.getElementById(modalId)?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px; background:var(--bg-surface);">
        <h2 style="font-size:18px; font-weight:700; margin-bottom:16px; color:var(--text-primary);">結算支出 — ${esc(row.name)}</h2>
        <div id="settle-form-root"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    openModal(modalId);

    createForm({
      container: 'settle-form-root',
      fields: [
        { id: 'status', label: '狀態', type: 'select', required: true, options: [
          { value: 'done', label: '已處理' },
          { value: 'pending', label: '未處理' }
        ]}
      ],
      initialData: { status: row.isDone ? 'done' : 'pending' },
      submitText: '儲存',
      onCancel: () => { closeModal(modalId); overlay.remove(); },
      onSubmit: async (data) => {
        try {
          // 呼叫更新 API (這裡假設 entity-create 可以更新任意狀態，或透過 updateExpense)
          // 為了正規化，我們透過 entity-create 端點處理
          await api.entityCreate({
            action: 'update',
            entityType: 'expense',
            id: row._ref.expenseId,
            extra: { status: data.status }
          });
          showToast('✅ 結算狀態已更新', 'success');
          closeModal(modalId);
          overlay.remove();
          this._loadData();
        } catch (err) {
          showToast('更新失敗：' + err.message, 'error');
        }
      }
    });
  },

  destroy() {}
};

/* ═══ EOF ═══
F: pages/settlements.js
V: 1792900530
W: ai-system-20261024-012#48
═══ EOF ═══ */