// ============================================
// dashboard.js — 總覽儀表板
// ============================================

import { AppState, auth } from '../app-core.js';
import { render, esc, toast } from '../app-ui.js';
import { renderStats } from '../components/stats-cards.js';
import { renderControls } from '../components/page-controls.js';
import { calcBankBalance, computeYearTotals } from '../app-domain.js';
import { formatHKD } from '../app-data.js';
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export function mount(container) {
  const db = getDatabase();
  const fid = AppState.currentFamilyId;
  const unsubs = [];
  let state = { income: {}, expenses: {}, bankAccounts: {}, policies: {} };

  const paint = () => {
    const { year } = AppState.getYearMonth();
    const yt = computeYearTotals(state.income, state.expenses, year);
    
    // 計算銀行餘額
    const accounts = Object.entries(state.bankAccounts).map(([id, x]) => ({ id, ...x }));
    const txns = [];
    accounts.forEach(a => {
      Object.entries(a.transactions || {}).forEach(([tid, t]) => txns.push({ id: tid, bankId: a.id, ...t }));
    });
    const bankTotal = calcBankBalance(accounts, txns, year, '12');

    // 年度總覽
    const annualRows = [];
    const curY = Number(year);
    for (let y = curY - 2; y <= curY + 2; y++) {
      const t = computeYearTotals(state.income, state.expenses, y);
      // 簡化保險總額計算（此處省略複雜保單平攤，僅用基本收支）
      annualRows.push({ year: y, inc: t.totalIncome, exp: t.totalExpense, net: t.net });
    }

    const html = `
      <div class="page-header" style="margin-bottom:20px;">
        <h1 class="page-title" style="color:var(--primary); font-family:var(--font-mono);">[ 總覽儀表板 ]</h1>
      </div>
      <div id="stats-root"></div>
      <div id="controls-root"></div>
      
      <div class="mecha-panel" style="margin-top:20px;">
        <div class="mecha-content" style="padding:0;">
          <div class="mecha-title" style="padding:16px;">年度總覽 (前後2年)</div>
          <table class="data-table">
            <thead><tr><th>年度</th><th class="num">家庭收入</th><th class="num">總支出</th><th class="num">淨餘額</th></tr></thead>
            <tbody>
              ${annualRows.map(r => `
                <tr>
                  <td>${r.year} 年</td>
                  <td class="num text-emerald">${formatHKD(r.inc)}</td>
                  <td class="num text-red">${formatHKD(r.exp)}</td>
                  <td class="num ${r.net >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(r.net)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    render(container, html);

    renderStats('stats-root', [
      { title: '家庭總餘額', value: formatHKD(bankTotal), color: bankTotal >= 0 ? 'text-emerald' : 'text-red', hint: `共 ${accounts.length} 個帳號` },
      { title: `${year} 家庭收入`, value: formatHKD(yt.totalIncome), color: 'text-emerald' },
      { title: `${year} 總支出`, value: formatHKD(yt.totalExpense), color: 'text-red', hint: `${yt.monthCount} 個月有紀錄` },
      { title: `${year} 淨餘額`, value: formatHKD(yt.net), color: yt.net >= 0 ? 'text-emerald' : 'text-red' },
    ]);
    renderControls('controls-root', { showViewToggle: false });
  };

  // 訂閱資料
  const paths = [
    ['income', `families/${fid}/income`],
    ['expenses', `families/${fid}/expenses`],
    ['bankAccounts', `families/${fid}/bank_accounts`],
    ['policies', `families/${fid}/insurance_policies`],
  ];
  paths.forEach(([key, path]) => {
    unsubs.push(onValue(ref(db, path), (snap) => {
      state[key] = snap.val() || {};
      paint();
    }));
  });

  unsubs.push(AppState.on('ym-change', paint));
  paint();

  return () => {
    unsubs.forEach(u => u && u());
  };
}