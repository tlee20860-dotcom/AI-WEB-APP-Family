// ============================================
// member-report.js — 成員收支明細
// ============================================

import { AppState } from '../app-core.js';
import { render, esc } from '../app-ui.js';
import { renderStats } from '../components/stats-cards.js';
import { renderControls } from '../components/page-controls.js';
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { formatHKD } from '../app-data.js';

export function mount(container) {
  const db = getDatabase();
  const fid = AppState.currentFamilyId;
  const unsubs = [];
  let state = { members: {}, income: {}, expenses: {}, personalIncome: {} };

  const paint = () => {
    const { year } = AppState.getYearMonth();
    const rows = Object.entries(state.members).map(([mid, m]) => {
      let inc = 0, pi = 0, exp = 0, ins = 0;
      Object.values(state.income[year] || {}).forEach(md => { inc += Number(md[mid]) || 0; });
      Object.values(state.personalIncome[mid]?.[year] || {}).forEach(v => { pi += Number(v) || 0; });
      Object.values(state.expenses[year] || {}).forEach(md => {
        Object.values(md.member_expenses?.[mid] || {}).forEach(e => {
          if (e.isAutoLinked) ins += Number(e.amount) || 0;
          else exp += Number(e.amount) || 0;
        });
      });
      return { id: mid, name: m.name, inc, pi, exp, ins, net: inc + pi - exp - ins };
    });

    const total = rows.reduce((s, r) => ({ inc: s.inc+r.inc, pi: s.pi+r.pi, exp: s.exp+r.exp, ins: s.ins+r.ins }), { inc:0, pi:0, exp:0, ins:0 });
    
    const html = `
      <div class="page-header" style="margin-bottom:20px;">
        <h1 class="page-title" style="color:var(--primary); font-family:var(--font-mono);">[ 成員收支明細 ]</h1>
      </div>
      <div id="stats-root"></div>
      <div id="controls-root"></div>
      <div class="mecha-panel" style="margin-top:20px;">
        <div class="mecha-content" style="padding:0; overflow-x:auto;">
          <table class="data-table">
            <thead><tr><th>成員</th><th class="num">家用轉入</th><th class="num">個人收入</th><th class="num">支出</th><th class="num">保險</th><th class="num">淨額</th></tr></thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td>${esc(r.name)}</td>
                  <td class="num text-emerald">${formatHKD(r.inc)}</td>
                  <td class="num text-cyan">${formatHKD(r.pi)}</td>
                  <td class="num text-red">${formatHKD(r.exp)}</td>
                  <td class="num text-orange">${formatHKD(r.ins)}</td>
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
      { title: '家庭總收入', value: formatHKD(total.inc), color: 'text-emerald' },
      { title: '個人總收入', value: formatHKD(total.pi), color: 'text-cyan' },
      { title: '家庭總支出', value: formatHKD(total.exp), color: 'text-red' },
      { title: '保險總平攤', value: formatHKD(total.ins), color: 'text-orange' }
    ]);
    renderControls('controls-root', { showViewToggle: false, showMonth: false });
  };

  const paths = [['members', 'members'], ['income', 'income'], ['expenses', 'expenses'], ['personalIncome', 'personal_income']];
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