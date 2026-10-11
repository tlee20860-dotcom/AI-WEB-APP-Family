// annual-report.js — 年度報表（v103.0.29）
// v103.0.29（B26-3.2）：
//   ✅ export 移到 page-header 右側
//   ✅ year + month + viewSwitcher 保留在 body
// v103.0.27（B26-3）：
//   ✅ 改用 page-controls
// ============================================
import { formatHKD } from '../lib/format.js';
import { esc } from '../lib/dom.js';
import { AppState } from '../core/state.js';
import { RESERVED_IDS } from '../config/constants.js';
import { resolveName } from '../config/entity-registry.js';
import { renderPageControls } from '../lib/page-controls.js';

export default {
  title: '年度報表',
  data: {
    members:           { type: 'list', path: 'members' },
    allIncome:         { type: 'raw', path: 'income' },
    allExpenses:       { type: 'raw', path: 'expenses' },
    allPersonalIncome: { type: 'raw', path: 'personal_income' },
  },
  state: {
    year: String(AppState.year || new Date().getFullYear()),
    displayMonth: String(AppState.month === 'all' ? '01' : (AppState.month || '01')).padStart(2, '0'),
    view: 'summary',
  },
  derived: {
    membersRows: {
      deps: ['data.members', 'data.allIncome', 'data.allExpenses', 'data.allPersonalIncome', 'state.year'],
      compute: _annualRows,
    },
    monthlyGroups: {
      deps: ['data.allIncome', 'data.allExpenses', 'state.year', 'state.displayMonth'],
      compute: _monthlyGroups,
    },
    statsCards: {
      deps: ['data.allIncome', 'data.allExpenses', 'data.allPersonalIncome', 'state.year', 'state.view', 'state.displayMonth'],
      compute: _buildStats,
    },
  },
  blocks: [
    { type: 'stats', container: 'annual-stats-root', cards: '$.statsCards' },
  ],

  customMount: (ctx) => {
    let _controls = null;
    const _sumView = document.getElementById('annual-summary-view');
    const _monView = document.getElementById('annual-monthly-view');

    const paintSummary = () => {
      const rows = ctx.derived.membersRows;
      if (!rows || rows.length === 0) { _paint(_sumView, '<div class="glass-card"><div class="empty-state">載入中…</div></div>'); return; }
      const html = `<div class="summary-table-wrapper"><table class="annual-table"><thead><tr><th>成員</th><th class="num">家用轉入</th><th class="num">個人收入</th><th class="num">總支出</th><th class="num">淨結餘</th></tr></thead><tbody>${rows.map((r) => `<tr class="${r.__isTotal ? 'group-header' : (r.__isShared ? 'shared-row' : '')}"><td>${esc(r.name)}</td><td class="num">${formatHKD(r.income)}</td><td class="num">${formatHKD(r.personalIncome)}</td><td class="num">${formatHKD(r.expense)}</td><td class="num ${r.net >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(r.net)}</td></tr>`).join('')}</tbody></table></div>`;
      _paint(_sumView, html);
    };

    const paintMonthly = () => {
      const groups = ctx.derived.monthlyGroups || [];
      const { year, displayMonth } = ctx.state;
      if (groups.length === 0) { _paint(_monView, `<div class="glass-card"><div class="empty-state">${year}-${displayMonth} 尚無紀錄</div></div>`); return; }
      const body = groups.map((g) => `<div class="insurance-year-block" style="margin-bottom:10px;"><div class="insurance-year-header" style="cursor:default;"><span class="ins-year-title">${esc(g.title)}</span></div><div class="insurance-year-body">${g.rows.map((r) => `<div class="insurance-month-row" style="padding:6px 0;"><span style="flex:1;min-width:0;font-size:13px;">${esc(r.name)}</span><span class="mono" style="width:80px;text-align:right;font-size:12px;color:var(--text-secondary);">${r.month > 0 ? formatHKD(r.month) : '—'}</span><span class="mono" style="width:90px;text-align:right;font-size:12px;color:var(--neon-cyan);font-weight:600;">${formatHKD(r.year)}</span></div>`).join('')}<div class="insurance-month-row" style="padding:8px 0;border-top:1px solid rgba(0,240,255,0.15);margin-top:4px;"><span style="flex:1;font-weight:700;color:var(--neon-cyan);font-size:13px;">${esc(g.subtotal.label)}</span><span class="mono" style="width:80px;text-align:right;font-weight:700;color:var(--text-primary);">${formatHKD(g.subtotal.month)}</span><span class="mono" style="width:90px;text-align:right;font-weight:700;color:var(--neon-cyan);">${formatHKD(g.subtotal.year)}</span></div></div></div>`).join('');
      _paint(_monView, `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:8px 12px;background:rgba(0,240,255,0.04);border-radius:var(--radius-sm);"><span style="font-size:11px;color:var(--text-muted);letter-spacing:1px;">項目</span><span style="display:flex;gap:8px;"><span class="mono" style="width:80px;text-align:right;font-size:11px;color:var(--text-muted);">當月</span><span class="mono" style="width:90px;text-align:right;font-size:11px;color:var(--text-muted);">年度累計</span></span></div>${body}`);
    };

    const _paint = (el, html) => {
      if (!el || el.__lastHtml === html) return;
      el.__lastHtml = html;
      el.innerHTML = html;
    };

    const paint = () => { if (ctx.state.view === 'monthly') paintMonthly(); else paintSummary(); };

    /* 🆕 v103.0.29：export → header；year + month + viewSwitcher → body */
    _controls = renderPageControls({
      containerId: 'page-controls-root',
      headerContainerId: 'page-header-actions',
      items: [
        {
          type: 'export',
          position: 'header',
          label: '匯出 Excel',
          onClick: () => _exportCsv(ctx),
        },
        {
          type: 'year',
          year: ctx.state.year,
          onChange: (y) => {
            ctx.state.year = String(y);
            AppState.setYearMonth(String(y), AppState.month === 'all' ? ctx.state.displayMonth : AppState.month);
            paint();
          },
        },
        {
          type: 'month',
          month: ctx.state.displayMonth,
          onChange: (m) => {
            ctx.state.displayMonth = m;
            AppState.setYearMonth(ctx.state.year, m);
            paint();
          },
        },
        {
          type: 'viewSwitcher',
          value: ctx.state.view,
          options: [
            { value: 'summary', label: '全年總合' },
            { value: 'monthly', label: '月度明細' },
          ],
          onChange: (v) => {
            ctx.state.view = v;
            _sumView.style.display = v === 'summary' ? 'block' : 'none';
            _monView.style.display = v === 'monthly' ? 'block' : 'none';
            paint();
          },
        },
      ],
    });

    _sumView.style.display = ctx.state.view === 'summary' ? 'block' : 'none';
    _monView.style.display = ctx.state.view === 'monthly' ? 'block' : 'none';
    paint();

    const unsub = ctx.onDataChange((key) => {
      if (key === '__APP__') {
        const y = String(AppState.year || new Date().getFullYear());
        if (ctx.state.year !== y) ctx.state.year = y;
        const m = AppState.month === 'all' ? '01' : (AppState.month || '01');
        const mm = String(m).padStart(2, '0');
        if (ctx.state.displayMonth !== mm) ctx.state.displayMonth = mm;
        if (_controls) { try { _controls.refresh(); } catch (e) {} }
      }
      paint();
    });

    return {
      destroy: () => {
        unsub();
        if (_controls) { try { _controls.destroy(); } catch (e) {} }
      },
    };
  },
};

/* ============================================
   Stats 依 view 切換
   ============================================ */
function _buildStats(allIncome, allExpenses, allPersonalIncome, year, view, month) {
  if (view === 'monthly') return _monthlyStats(allIncome, allExpenses, allPersonalIncome, year, month);
  return _yearlyStats(allIncome, allExpenses, allPersonalIncome, year);
}

function _yearlyStats(allIncome, allExpenses, allPersonalIncome, year) {
  const yk = String(year || '');
  const yi = (allIncome || {})[yk] || {};
  let tI = 0;
  Object.values(yi).forEach((md) => { Object.values(md || {}).forEach((v) => { tI += Number(v) || 0; }); });

  let tPI = 0;
  Object.values(allPersonalIncome || {}).forEach((memberData) => {
    Object.values(((memberData || {})[yk] || {})).forEach((v) => { tPI += Number(v) || 0; });
  });

  const ye = (allExpenses || {})[yk] || {};
  let tE = 0;
  Object.values(ye).forEach((md) => {
    const me = (md && md.member_expenses) || {};
    Object.values(me).forEach((items) => {
      Object.values(items || {}).forEach((e) => { tE += Number(e?.amount) || 0; });
    });
  });

  const net = tI + tPI - tE;
  return [
    { title: `${year} 家用轉入`, value: formatHKD(tI), valueClass: 'emerald', hint: '家庭成員轉入加總', icon: 'trending-up' },
    { title: `${year} 個人收入`, value: formatHKD(tPI), valueClass: 'cyan', hint: '成員個人收入加總', icon: 'wallet' },
    { title: `${year} 年度總支出`, value: formatHKD(tE), valueClass: 'red', hint: '含家庭共用支出', icon: 'trending-down' },
    { title: `${year} 年度淨結餘`, value: formatHKD(net), valueClass: net >= 0 ? 'emerald' : 'red', hint: '轉入 + 個人收入 − 支出', icon: 'calculator' },
  ];
}

function _monthlyStats(allIncome, allExpenses, allPersonalIncome, year, month) {
  const yk = String(year || '');
  const mk = String(month || '').padStart(2, '0');
  const label = `${yk}-${mk}`;

  const yi = ((allIncome || {})[yk] || {})[mk] || {};
  let tI = 0;
  Object.values(yi).forEach((v) => { tI += Number(v) || 0; });

  let tPI = 0;
  Object.values(allPersonalIncome || {}).forEach((memberData) => {
    const yData = (memberData || {})[yk] || {};
    tPI += Number(yData[mk]) || 0;
  });

  const me = (((allExpenses || {})[yk] || {})[mk] || {}).member_expenses || {};
  let tE = 0;
  Object.values(me).forEach((items) => {
    Object.values(items || {}).forEach((e) => { tE += Number(e?.amount) || 0; });
  });

  const net = tI + tPI - tE;
  return [
    { title: `${label} 家用轉入`, value: formatHKD(tI), valueClass: 'emerald', hint: '該月轉入加總', icon: 'trending-up' },
    { title: `${label} 個人收入`, value: formatHKD(tPI), valueClass: 'cyan', hint: '該月個人收入加總', icon: 'wallet' },
    { title: `${label} 總支出`, value: formatHKD(tE), valueClass: 'red', hint: '該月支出加總', icon: 'trending-down' },
    { title: `${label} 淨結餘`, value: formatHKD(net), valueClass: net >= 0 ? 'emerald' : 'red', hint: '轉入 + 個人 − 支出', icon: 'calculator' },
  ];
}

/* ============================================
   Derived
   ============================================ */
function _annualRows(members, allIncome, allExpenses, allPersonalIncome, year) {
  const yk = String(year || '');
  const yi = (allIncome || {})[yk] || {};
  const ye = (allExpenses || {})[yk] || {};
  const rows = (members || []).map((m) => {
    let income = 0, pi = 0, exp = 0;
    Object.values(yi).forEach((md) => { income += Number(md && md[m.id]) || 0; });
    const mp = ((allPersonalIncome || {})[m.id] || {})[yk] || {};
    Object.values(mp).forEach((v) => { pi += Number(v) || 0; });
    Object.values(ye).forEach((md) => {
      const me = (md && md.member_expenses && md.member_expenses[m.id]) || {};
      Object.values(me).forEach((e) => { exp += Number(e && e.amount) || 0; });
    });
    return { id: m.id, name: m.name, income: Math.round(income), personalIncome: Math.round(pi), expense: Math.round(exp), net: Math.round(income + pi - exp) };
  });
  let se = 0;
  Object.values(ye).forEach((md) => {
    const s = (md && md.member_expenses && md.member_expenses[RESERVED_IDS.SHARED_MEMBER]) || {};
    Object.values(s).forEach((e) => { se += Number(e && e.amount) || 0; });
  });
  if (se > 0) rows.push({ id: RESERVED_IDS.SHARED_MEMBER, name: '家庭共用', income: 0, personalIncome: 0, expense: Math.round(se), net: -Math.round(se), __isShared: true });
  const total = rows.reduce((s, r) => ({ income: s.income + r.income, personalIncome: s.personalIncome + r.personalIncome, expense: s.expense + r.expense, net: s.net + r.net }), { income: 0, personalIncome: 0, expense: 0, net: 0 });
  rows.push({ id: '__total__', name: '總計', income: total.income, personalIncome: total.personalIncome, expense: total.expense, net: total.net, __isTotal: true });
  return rows;
}

function _monthlyGroups(allIncome, allExpenses, year, month) {
  const yk = String(year || ''), mk = String(month || '');
  const yi = (allIncome || {})[yk] || {};
  const ye = (allExpenses || {})[yk] || {};
  const groups = [];

  const incomeMonth = yi[mk] || {};
  const incomeYear = {};
  Object.values(yi).forEach((md) => Object.entries(md || {}).forEach(([mid, amt]) => { incomeYear[mid] = (incomeYear[mid] || 0) + (Number(amt) || 0); }));
  const incomeRows = Object.entries(incomeMonth).map(([mid, amt]) => ({ name: resolveName('members', mid) || mid, month: Number(amt) || 0, year: incomeYear[mid] || 0 }));
  if (incomeRows.length > 0) groups.push({ title: '【收入】', rows: incomeRows, subtotal: { label: '收入小計', month: incomeRows.reduce((s, r) => s + r.month, 0), year: incomeRows.reduce((s, r) => s + r.year, 0) } });

  const monthData = (ye[mk] && ye[mk].member_expenses) || {};
  Object.keys(monthData).forEach((mid) => {
    if (mid === RESERVED_IDS.SHARED_MEMBER) return;
    const memberName = resolveName('members', mid) || mid;
    const monthItems = monthData[mid] || {};
    const yearItems = {};
    Object.values(ye).forEach((md) => {
      const me = (md && md.member_expenses && md.member_expenses[mid]) || {};
      Object.entries(me).forEach(([id, e]) => {
        if (!yearItems[id]) yearItems[id] = { name: e.name || '', month: 0, year: 0 };
        yearItems[id].year += Number(e.amount) || 0;
      });
    });
    const rows = Object.entries(yearItems).map(([id, r]) => ({ name: r.name, month: monthItems[id] ? Number(monthItems[id].amount) || 0 : 0, year: r.year }));
    if (rows.length > 0) groups.push({ title: `【${memberName}】`, rows, subtotal: { label: `${memberName}小計`, month: rows.reduce((s, r) => s + r.month, 0), year: rows.reduce((s, r) => s + r.year, 0) } });
  });

  const sharedMonth = monthData[RESERVED_IDS.SHARED_MEMBER] || {};
  if (Object.keys(sharedMonth).length > 0) {
    const yearShared = {};
    Object.values(ye).forEach((md) => {
      const me = (md && md.member_expenses && md.member_expenses[RESERVED_IDS.SHARED_MEMBER]) || {};
      Object.entries(me).forEach(([id, e]) => {
        if (!yearShared[id]) yearShared[id] = { name: e.name || '', month: 0, year: 0 };
        yearShared[id].year += Number(e.amount) || 0;
      });
    });
    const rows = Object.entries(yearShared).map(([id, r]) => ({ name: r.name, month: sharedMonth[id] ? Number(sharedMonth[id].amount) || 0 : 0, year: r.year }));
    groups.push({ title: '【家庭共用】', rows, subtotal: { label: '家庭共用小計', month: rows.reduce((s, r) => s + r.month, 0), year: rows.reduce((s, r) => s + r.year, 0) } });
  }

  return groups;
}

function _exportCsv(ctx) {
  const rows = ctx.derived.membersRows || [];
  if (rows.length === 0) return;
  const year = ctx.state.year;
  const lines = [['成員', '家用轉入', '個人收入', '總支出', '淨結餘'].join(',')];
  rows.forEach((r) => lines.push([`"${String(r.name || '').replace(/"/g, '""')}"`, r.income, r.personalIncome, r.expense, r.net].join(',')));
  const csv = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `annual-report-${year}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/pages/annual-report.js
   Version: v103.0.29
   Batch: B26-3.2
   ═══════════════════════════════════════════ */