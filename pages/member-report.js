// ============================================
// member-report.js — 成員收支明細
// 位置：pages/member-report.js
// ============================================

import { AppState } from '../config/state.js';
import { api } from '../domain/api-client.js';
import { getMembersOnce } from '../db/index.js';
import { renderTable, renderCards } from '../ui/table.js';
import { renderViewToggle, renderYearMonth } from '../ui/controls.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc } from '../ui/format.js';
import { RESERVED_IDS } from '../config/constants.js';

export default {
  _data: [],

  async render() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h1 style="font-size:24px; font-weight:700; color:var(--primary); margin:0;">成員收支明細</h1>
      </div>

      <div id="mr-stats" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; margin-bottom:24px;"></div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
        <div id="mr-view-toggle"></div>
        <div id="mr-controls-period"></div>
      </div>
      
      <div id="mr-list-container"></div>
    `;

    renderYearMonth('mr-controls-period', { includeAllMonth: true }, () => {
      this._loadData();
    });

    renderViewToggle('mr-view-toggle', () => {
      this._renderList();
    });

    await this._loadData();
  },

  async _loadData() {
    const statsRoot = document.getElementById('mr-stats');
    if (!statsRoot) return;

    const { year, month } = AppState.getYearMonth();
    statsRoot.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); grid-column:span 4;">載入資料中…</div>';

    try {
      const s = await api.summary(year, month);
      const members = await getMembersOnce();

      const rows = members.map(m => {
        const mData = s.perMember[m.id] || { sum: 0, items: [] };
        let insurance = 0;
        let expense = 0;
        mData.items.forEach(item => {
          if (item.isAutoLinked) insurance += item.amount;
          else expense += item.amount;
        });

        const income = Number(s.incomeBreakdown?.[m.id]) || 0;
        const personalIncome = Number(s.personalIncomeBreakdown?.[m.id]) || 0;
        const net = income + personalIncome - expense - insurance;

        return { id: m.id, name: m.name, income, personalIncome, expense, insurance, net };
      });

      const sharedData = s.perMember[RESERVED_IDS.SHARED_MEMBER] || { sum: 0, items: [] };
      let sharedIns = 0, sharedExp = 0;
      sharedData.items.forEach(item => {
        if (item.isAutoLinked) sharedIns += item.amount;
        else sharedExp += item.amount;
      });
      
      if (sharedExp > 0 || sharedIns > 0) {
        rows.push({ id: RESERVED_IDS.SHARED_MEMBER, name: '🏠 家庭共用', income: 0, personalIncome: 0, expense: sharedExp, insurance: sharedIns, net: -(sharedExp + sharedIns) });
      }

      this._data = rows;

      const tIncome = rows.reduce((sum, r) => sum + r.income, 0);
      const tPersonal = rows.reduce((sum, r) => sum + r.personalIncome, 0);
      const tExpense = rows.reduce((sum, r) => sum + r.expense, 0);
      const tIns = rows.reduce((sum, r) => sum + r.insurance, 0);

      statsRoot.innerHTML = `
        <div class="glass-card" style="padding:16px;">
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">家用轉入</div>
          <div class="mono" style="font-size:20px; font-weight:700; color:var(--accent-success); white-space:nowrap;">${formatHKD(tIncome)}</div>
        </div>
        <div class="glass-card" style="padding:16px;">
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">個人收入</div>
          <div class="mono" style="font-size:20px; font-weight:700; color:var(--primary); white-space:nowrap;">${formatHKD(tPersonal)}</div>
        </div>
        <div class="glass-card" style="padding:16px;">
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">總支出</div>
          <div class="mono" style="font-size:20px; font-weight:700; color:var(--accent-danger); white-space:nowrap;">${formatHKD(tExpense)}</div>
        </div>
        <div class="glass-card" style="padding:16px;">
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">保險平攤</div>
          <div class="mono" style="font-size:20px; font-weight:700; color:var(--accent-warm); white-space:nowrap;">${formatHKD(tIns)}</div>
        </div>
      `;

      this._renderList();

    } catch (err) {
      console.error('[member-report] 載入失敗：', err);
      showToast('載入成員報表失敗', 'error');
      statsRoot.innerHTML = '<div style="color:var(--accent-danger); padding:20px; grid-column:span 4;">載入失敗</div>';
    }
  },

  _renderList() {
    const listRoot = document.getElementById('mr-list-container');
    if (!listRoot || !this._data) return;

    if (this._data.length === 0) {
      listRoot.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">尚無資料</div>';
      return;
    }

    const currentView = AppState.getCurrentView() || 'table';

    if (currentView === 'card') {
      renderCards({ container: listRoot, rows: this._data, columnsKey: 'memberReport', emptyText: '尚無資料' });
    } else {
      renderTable({ container: listRoot, rows: this._data, columnsKey: 'memberReport', emptyText: '尚無資料' });
    }
  },

  destroy() {}
};

/* ═══ EOF ═══
F: pages/member-report.js
V: 1792900870
W: ai-system-20261024-012#78
═══ EOF ═══ */