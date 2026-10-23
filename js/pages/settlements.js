// ============================================
// settlements.js — 結算清單
// ============================================

import { AppState } from '../app-core.js';
import { render, esc, toast } from '../app-ui.js';
import { renderStats } from '../components/stats-cards.js';
import { renderControls } from '../components/page-controls.js';
import { renderTable } from '../components/data-table.js';
import { getDatabase, ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { formatHKD, statusBadgeClass, statusLabel, api } from '../app-data.js';
import { mergeSettlementData } from '../app-domain.js';

export function mount(container) {
  const db = getDatabase();
  const fid = AppState.currentFamilyId;
  const unsubs = [];
  let state = { expenses: {}, members: {} };
  let insuranceRows = [];

  const paint = () => {
    const { year, month } = AppState.getYearMonth();
    const m = month === 'all' ? '12' : month;

    // 處理 member expenses
    const memberExpenses = [];
    const mData = state.expenses[year]?.[m]?.member_expenses || {};
    Object.entries(mData).forEach(([mid, items]) => {
      Object.entries(items || {}).forEach(([id, e]) => memberExpenses.push({ id, memberId: mid, ...e }));
    });

    const merged = mergeSettlementData({ memberExpenses, insuranceRows, year, month: m });
    const pending = merged.filter(r => r.status === 'pending');
    const done = merged.filter(r => r.status === 'done');

    const html = `
      <div class="page-header" style="margin-bottom:20px;">
        <h1 class="page-title" style="color:var(--primary); font-family:var(--font-mono);">[ 結算清單 ]</h1>
      </div>
      <div id="stats-root"></div>
      <div id="controls-root"></div>
      <div id="st-table"></div>
    `;
    render(container, html);

    renderStats('stats-root', [
      { title: '待處理', value: formatHKD(pending.reduce((s, r) => s + r.amount, 0)), color: 'text-orange', hint: `${pending.length} 筆` },
      { title: '已處理', value: formatHKD(done.reduce((s, r) => s + r.amount, 0)), color: 'text-emerald', hint: `${done.length} 筆` },
      { title: '總計', value: formatHKD(merged.reduce((s, r) => s + r.amount, 0)), color: 'text-cyan', hint: `${merged.length} 筆` },
    ]);
    renderControls('controls-root', { showViewToggle: false });

    const cols = [
      { id: 'sourceLabel', label: '來源', width: 80 },
      { id: 'memberName', label: '成員', width: 90 },
      { id: 'name', label: '項目名稱' },
      { id: 'amount', label: '金額', type: 'number', width: 110 },
      { id: 'statusLabel', label: '狀態', width: 100 }
    ];
    const resolvers = {
      sourceLabel: v => `<span class="badge ${v === '保險' ? 'badge-magenta' : 'badge-info'}">${v}</span>`,
      memberName: v => state.members[v]?.name || (v === 'shared' ? '家庭' : v),
      amount: v => formatHKD(v),
      statusLabel: (v, r) => `<span class="badge ${statusBadgeClass(r.status)}">${v}</span>`
    };

    renderTable('st-table', merged, cols, resolvers, () => true);

    document.getElementById('st-table').addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const row = merged[Number(btn.dataset.idx)];
      if (!row) return;

      if (btn.dataset.action === 'delete') {
        if (!confirm(`確定刪除 ${row.name}？`)) return;
        if (row.source === 'personal') {
          const { remove } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
          await remove(ref(db, `families/${fid}/expenses/${row.year}/${row.month}/member_expenses/${row.memberId}/${row._ref.expenseId}`));
          toast('✅ 已刪除');
        }
      } else if (btn.dataset.action === 'edit' && row.source === 'insurance') {
        // 確認保險扣款
        try {
          if (row.status === 'pending') {
            await api.insuranceSync({ policyId: row._ref.policyId, memberId: row.memberId, policyName: row.name, monthlyAverage: row.amount, year: row.year, month: row.month });
            toast('✅ 已確認扣款');
            loadInsurance();
          } else {
            await api.insuranceUnsync({ policyId: row._ref.policyId, memberId: row.memberId, year: row.year, month: row.month, amount: row.amount });
            toast('✅ 已取消扣款');
            loadInsurance();
          }
        } catch (err) {
          toast(err.message, 'error');
        }
      }
    });
  };

  const loadInsurance = async () => {
    const { year, month } = AppState.getYearMonth();
    const m = month === 'all' ? '12' : month;
    const snap = await get(ref(db, `families/${fid}/insurance_policies`));
    const policies = snap.val() || {};
    const list = [];
    for (const [pid, p] of Object.entries(policies)) {
      const paySnap = await get(ref(db, `families/${fid}/insurance_payments/${pid}/${year}/${m}`));
      const pay = paySnap.val() || {};
      if (pay.amount || pay.status) {
        list.push({ policyId: pid, policyName: p.name, policyHolderId: p.policyHolderId || p.memberId, status: pay.status, amount: pay.amount || 0 });
      } else {
        list.push({ policyId: pid, policyName: p.name, policyHolderId: p.policyHolderId || p.memberId, status: 'pending', amount: p.monthlyPremium || 0 });
      }
    }
    insuranceRows = list;
    paint();
  };

  unsubs.push(onValue(ref(db, `families/${fid}/expenses`), (snap) => { state.expenses = snap.val() || {}; paint(); }));
  unsubs.push(onValue(ref(db, `families/${fid}/members`), (snap) => { state.members = snap.val() || {}; paint(); }));
  unsubs.push(AppState.on('ym-change', () => { paint(); loadInsurance(); }));

  paint();
  loadInsurance();

  return () => unsubs.forEach(u => u && u());
}