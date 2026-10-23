// ============================================
// annual-report.js — 年度報表
// ============================================

import { AppState } from '../app-core.js';
import { render, esc, toast } from '../app-ui.js';
import { renderStats } from '../components/stats-cards.js';
import { renderControls } from '../components/page-controls.js';
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { formatHKD } from '../app-data.js';
import { computeYearTotals } from '../app-domain.js';

export function mount(container) {
  const db = getDatabase();
  const fid = AppState.currentFamilyId;
  const unsubs = [];
  let state = { income: {}, expenses: {}, personalIncome: {}, members: {} };
  let view = 'summary';

  const paint = () => {
    const { year } = AppState.getYearMonth();
    const yt = computeYearTotals(state.income, state.expenses, year);
    
    let piTotal = 0;
    Object.values(state.personalIncome).forEach(md => {
      Object.values(md[year] || {}).forEach(v => { piTotal += Number(v) || 0; });
    });

    const html = `
      <div class="page-header" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
        <h1 class="page-title" style="color:var(--primary); font-family:var(--font-mono);">[ 年度報表 ]</h1>
        <button class="btn btn-ghost" id="btn-export">匯出 CSV</button>
      </div>
      <div id="stats-root"></div>
      <div id="controls-root"></div>
      <div style="display:flex; gap:8px; margin-bottom:20px;">
        <button class="btn ${view==='summary'?'btn-primary':'btn-ghost'}" data-view="summary">全年總合</button>
        <button class="btn ${view==='monthly'?'btn-primary':'btn-ghost'}" data-view="monthly">月度明細</button>
      </div>
      <div id="report-content"></div>
    `;
    render(container, html);

    renderStats('stats-root', [
      { title: '家用轉入', value: formatHKD(yt.totalIncome), color: 'text-emerald' },
      { title: '個人收入', value: formatHKD(piTotal), color: 'text-cyan' },
      { title: '總支出', value: formatHKD(yt.totalExpense), color: 'text-red' },
      { title: '淨餘額', value: formatHKD(yt.totalIncome + piTotal - yt.totalExpense), color: (yt.totalIncome + piTotal - yt.totalExpense) >= 0 ? 'text-emerald' : 'text-red' }
    ]);
    renderControls('controls-root', { showViewToggle: false, showMonth: false });

    container.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => { view = btn.dataset.view; paint(); });
    });

    if (view === 'summary') {
      const rows = Object.entries(state.members).map(([mid, m]) => {
        let inc = 0, pi = 0, exp = 0;
        Object.values(state.income[year] || {}).forEach(md => { inc += Number(md[mid]) || 0; });
        Object.values(state.personalIncome[mid]?.[year] || {}).forEach(v => { pi += Number(v) || 0; });
        Object.values(state.expenses[year] || {}).forEach(md => {
          Object.values(md.member_expenses?.[mid] || {}).forEach(e => { exp += Number(e.amount) || 0; });
        });
        return { name: m.name, inc, pi, exp, net: inc + pi - exp };
      });
      const total = rows.reduce((s, r) => ({ inc: s.inc + r.inc, pi: s.pi + r.pi, exp: s.exp + r.exp, net: s.net + r.net }), { inc: 0, pi: 0, exp: 0, net: 0 });
      rows.push({ name: '總計', ...total, isTotal: true });

      const htmlStr = `
        <div class="mecha-panel">
          <div class="mecha-content" style="padding:0; overflow-x:auto;">
            <table class="data-table">
              <thead><tr><th>成員</th><th class="num">家用轉入</th><th class="num">個人收入</th><th class="num">總支出</th><th class="num">淨結餘</th></tr></thead>
              <tbody>
                ${rows.map(r => `
                  <tr style="${r.isTotal ? 'font-weight:bold; color:var(--primary);' : ''}">
                    <td>${esc(r.name)}</td>
                    <td class="num text-emerald">${formatHKD(r.inc)}</td>
                    <td class="num text-cyan">${formatHKD(r.pi)}</td>
                    <td class="num text-red">${formatHKD(r.exp)}</td>
                    <td class="num ${r.net >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(r.net)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
      render('report-content', htmlStr);
    } else {
      const m = AppState.month === 'all' ? '01' : AppState.month;
      const incM = state.income[year]?.[m] || {};
      const expM = state.expenses[year]?.[m]?.member_expenses || {};
      const rows = [];
      Object.entries(incM).forEach(([mid, amt]) => rows.push({ name: `收入 - ${state.members[mid]?.name || mid}`, amt: Number(amt) }));
      Object.entries(expM).forEach(([mid, items]) => {
        Object.values(items || {}).forEach(e => rows.push({ name: `支出 - ${e.name}`, amt: -Number(e.amount) }));
      });

      const htmlStr = `
        <div class="mecha-panel">
          <div class="mecha-content" style="padding:0;">
            <table class="data-table">
              <thead><tr><th>項目</th><th class="num">金額</th></tr></thead>
              <tbody>
                ${rows.length ? rows.map(r => `<tr><td>${esc(r.name)}</td><td class="num ${r.amt >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(r.amt)}</td></tr>`).join('') : '<tr><td colspan="2" class="text-muted" style="text-align:center;">此月無紀錄</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
      render('report-content', htmlStr);
    }

    document.getElementById('btn-export')?.addEventListener('click', () => {
      const rows = [];
      Object.entries(state.members).forEach(([mid, m]) => {
        let inc = 0, pi = 0, exp = 0;
        Object.values(state.income[year] || {}).forEach(md => { inc += Number(md[mid]) || 0; });
        Object.values(state.personalIncome[mid]?.[year] || {}).forEach(v => { pi += Number(v) || 0; });
        Object.values(state.expenses[year] || {}).forEach(md => {
          Object.values(md.member_expenses?.[mid] || {}).forEach(e => { exp += Number(e.amount) || 0; });
        });
        rows.push([m.name, inc, pi, exp, inc+pi-exp].join(','));
      });
      const csv = '\uFEFF' + '成員,轉入,個人收入,支出,淨額\n' + rows.join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a'); a.href = url; a.download = `annual-${year}.csv`; a.click();
    });
  };

  const paths = [['income', 'income'], ['expenses', 'expenses'], ['personalIncome', 'personal_income'], ['members', 'members']];
  paths.forEach(([key, p]) => {
    unsubs.push(onValue(ref(db, `families/${fid}/${p}`), (snap) => {
      state[key] = snap.val() || {};
      paint();
    }));
  });

  unsubs.push(AppState.on('ym-change', paint));
  paint();

  return () => unsubs.forEach(u => u && u());
}