// ============================================
// input-center.js — 綜合輸入中心
// ============================================

import { AppState } from '../app-core.js';
import { render, esc, toast, openModal, getFormData, buildFormHtml } from '../app-ui.js';
import { renderTable } from '../components/data-table.js';
import { getDatabase, ref, onValue, push, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { api, formatHKD, statusLabel, statusBadgeClass } from '../app-data.js';

export function mount(container) {
  const db = getDatabase();
  const fid = AppState.currentFamilyId;
  const unsubs = [];
  let activeTab = 'expense';
  let state = { expenses: {}, members: {}, categories: {}, payments: {} };

  const paint = () => {
    const html = `
      <div class="page-header" style="margin-bottom:20px;">
        <h1 class="page-title" style="color:var(--primary); font-family:var(--font-mono);">[ 綜合輸入中心 ]</h1>
      </div>
      <div style="display:flex; gap:8px; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:10px;">
        ${['expense', 'insurance', 'fund', 'bank'].map(tab => `
          <button class="btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}" data-tab="${tab}">
            ${tab === 'expense' ? '支出' : tab === 'insurance' ? '保險' : tab === 'fund' ? '基金' : '銀行'}
          </button>
        `).join('')}
      </div>
      <div id="tab-content"></div>
    `;
    render(container, html);
    
    // 綁定 Tab
    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => { activeTab = btn.dataset.tab; paint(); });
    });

    if (activeTab === 'expense') paintExpense();
    else render('tab-content', `<div class="mecha-panel"><div class="mecha-content">功能開發中，請至對應專頁操作</div></div>`);
  };

  const paintExpense = () => {
    const { year } = AppState.getYearMonth();
    const rows = [];
    Object.entries(state.expenses[year] || {}).forEach(([m, md]) => {
      Object.entries(md.member_expenses || {}).forEach(([mid, items]) => {
        Object.entries(items || {}).forEach(([id, e]) => {
          rows.push({ id, memberId: mid, month: m, ...e });
        });
      });
    });
    rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const cols = [
      { id: 'date', label: '日期', width: 100 },
      { id: 'memberId', label: '成員', width: 100 },
      { id: 'name', label: '項目' },
      { id: 'amount', label: '金額', type: 'number', width: 110 },
      { id: 'status', label: '狀態', width: 100 }
    ];
    const resolvers = {
      memberId: v => state.members[v]?.name || v,
      amount: v => formatHKD(v),
      status: v => `<span class="badge ${statusBadgeClass(v)}">${statusLabel(v)}</span>`
    };

    const tabEl = document.getElementById('tab-content');
    tabEl.innerHTML = `<button class="btn btn-primary" id="btn-add-expense" style="margin-bottom:16px;">+ 新增支出</button><div id="exp-table"></div>`;
    
    renderTable('exp-table', rows, cols, resolvers, () => true);

    document.getElementById('btn-add-expense').addEventListener('click', async () => {
      const fields = [
        { id: 'memberId', label: '成員', type: 'select', required: true, options: Object.entries(state.members).map(([id, m]) => ({ value: id, label: m.name })) },
        { id: 'name', label: '項目名稱', type: 'text', required: true },
        { id: 'amount', label: '金額', type: 'number', required: true },
        { id: 'date', label: '日期', type: 'text', defaultValue: new Date().toISOString().slice(0, 10) }
      ];
      const ok = await openModal('新增支出', buildFormHtml(fields));
      if (!ok) return;
      const data = getFormData(fields);
      const { year, month } = AppState.getYearMonth();
      const m = month === 'all' ? '01' : month;
      await push(ref(db, `families/${fid}/expenses/${year}/${m}/member_expenses/${data.memberId}`), {
        name: data.name, amount: Number(data.amount), status: 'pending', date: data.date, createdAt: Date.now()
      });
      toast('✅ 已新增');
    });
  };

  const paths = [['expenses', 'expenses'], ['members', 'members'], ['categories', 'expense_categories'], ['payments', 'payment_methods']];
  paths.forEach(([key, p]) => {
    unsubs.push(onValue(ref(db, `families/${fid}/${p}`), (snap) => {
      state[key] = snap.val() || {};
      if (key === 'expenses' || key === 'members') paint();
    }));
  });

  unsubs.push(AppState.on('ym-change', paint));
  paint();

  return () => unsubs.forEach(u => u && u());
}