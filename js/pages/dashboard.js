// ============================================
// dashboard.js — 總覽儀表板（v103.0.35 Page Schema）
// 位置：js/pages/dashboard.js
// ============================================
// v103.0.35（B29-7b）：
//   ✅ 刪除副標題動態（subtitle derived + update 邏輯）
// ============================================

import { calcTotalBankBalance } from '../lib/bank.js';
import { formatHKD } from '../lib/format.js';
import { AppState } from '../core/state.js';
import { renderPageControls } from '../lib/page-controls.js';
import { getPolicyAnnualPremium } from '../lib/insurance.js';
import { getColumns, getResolvers } from '../config/column-registry.js';

export default {
  title: '總覽儀表板',
  data: {
    bankAccounts: { type: 'list', path: 'bank_accounts' },
    bankTransactions: { type: 'object', path: 'bank_accounts', transform: _flatten },
    members: { type: 'list', path: 'members' },
    allIncome: { type: 'raw', path: 'income' },
    allExpenses: { type: 'raw', path: 'expenses' },
    allPolicies: { type: 'list', path: 'insurance_policies' },
  },
  state: {
    currentYear: String(AppState.year || new Date().getFullYear()),
    currentMonth: String(AppState.month || '12'),
  },
  derived: {
    totalBankBalance: {
      deps: ['data.bankAccounts', 'data.bankTransactions', 'state.currentYear', 'state.currentMonth'],
      compute: (a, t, y, m) => calcTotalBankBalance(a || [], t || [], y, m === 'all' ? '12' : (m || '12')),
    },
    yearTotals: {
      deps: ['data.allIncome', 'data.allExpenses', 'state.currentYear'],
      compute: _computeYearTotals,
    },
    statsCards: {
      deps: ['totalBankBalance', 'data.bankAccounts', 'state.currentYear', 'yearTotals'],
      compute: _buildCards,
    },
    annualOverview: {
      deps: ['data.allIncome', 'data.allExpenses', 'data.allPolicies', 'state.currentYear'],
      compute: _computeAnnualOverview,
    },
  },
  blocks: [
    { type: 'stats', container: 'stats-cards-root', cards: '$.statsCards' },
  ],

  customMount: (ctx) => {
    let _controls = null;

    const syncYear = () => {
      const y = String(AppState.year || new Date().getFullYear());
      if (ctx.state.currentYear !== y) ctx.state.currentYear = y;
      const m = String(AppState.month || '12');
      if (ctx.state.currentMonth !== m) ctx.state.currentMonth = m;
    };

    const _paintAnnualOverview = () => {
      const root = document.getElementById('annual-overview-root');
      if (!root) return;

      const rows = ctx.derived.annualOverview || [];
      if (rows.length === 0) {
        if (root.__lastHtml !== '') {
          root.__lastHtml = '';
          root.innerHTML = '';
        }
        return;
      }

      const columns = getColumns('dashboardAnnual');
      const resolvers = getResolvers('dashboardAnnual');

      const html = `
        <div class="glass-card" style="padding:0; margin-bottom:20px;">
          <div class="collapsible-header" style="padding:14px 20px; cursor:default;">
            <div class="collapsible-header-title">
              <i data-lucide="calendar" style="width:16px;height:16px;"></i>
              <span>年度總覽（前後 2 年）</span>
            </div>
          </div>
          <div class="data-table-scroll-wrapper" style="border-top:1px solid rgba(255,255,255,0.05);">
            <table class="data-table">
              <thead>
                <tr>
                  ${columns.map((c) => `<th class="${c.type === 'number' ? 'num' : ''}">${c.label}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rows.map((r) => `
                  <tr>
                    ${columns.map((c) => {
                      const val = r[c.id];
                      const resolver = resolvers[c.id];
                      const content = resolver ? resolver(val, r) : (val == null ? '—' : String(val));
                      return `<td class="${c.type === 'number' ? 'num' : ''}">${content}</td>`;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      if (root.__lastHtml !== html) {
        root.__lastHtml = html;
        root.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
      }
    };

    _paintAnnualOverview();

    _controls = renderPageControls({
      containerId: 'page-controls-root',
      headerContainerId: 'page-header-actions',
      items: [
        {
          type: 'custom',
          position: 'header',
          render: () => `<a class="btn btn-primary" href="annual-report.html"><i data-lucide="bar-chart-3"></i> 查看年度報表</a>`,
        },
      ],
    });

    const unsub = ctx.onDataChange((key) => {
      if (key === '__APP__') syncYear();
      _paintAnnualOverview();
    });

    return {
      destroy: () => {
        unsub();
        if (_controls) { try { _controls.destroy(); } catch (e) {} _controls = null; }
        const root = document.getElementById('annual-overview-root');
        if (root) { root.innerHTML = ''; root.__lastHtml = ''; }
      },
    };
  },
};

/* ============================================
   Helpers
   ============================================ */
function _flatten(raw) {
  const flat = [];
  Object.entries(raw || {}).forEach(([bankId, bank]) => {
    Object.entries(bank?.transactions || {}).forEach(([txnId, txn]) => {
      flat.push({ id: txnId, bankId, bankName: bank?.name || '', ...txn });
    });
  });
  return flat;
}

function _computeYearTotals(allIncome, allExpenses, year) {
  const yk = String(year || '');
  if (!yk) return { totalIncome: 0, totalExpense: 0, net: 0, monthCount: 0 };
  const yi = (allIncome || {})[yk] || {};
  let totalIncome = 0;
  Object.values(yi).forEach((md) => Object.values(md || {}).forEach((v) => { totalIncome += Number(v) || 0; }));
  const ye = (allExpenses || {})[yk] || {};
  let totalExpense = 0, monthCount = 0;
  Object.values(ye).forEach((md) => {
    const me = (md && md.member_expenses) || {};
    let s = 0;
    Object.values(me).forEach((items) => Object.values(items || {}).forEach((e) => { s += Number(e && e.amount) || 0; }));
    if (s > 0) monthCount++;
    totalExpense += s;
  });
  return {
    totalIncome: Math.round(totalIncome),
    totalExpense: Math.round(totalExpense),
    net: Math.round(totalIncome - totalExpense),
    monthCount,
  };
}

function _buildCards(totalBankBalance, accounts, year, yearTotals) {
  const list = Array.isArray(accounts) ? accounts : [];
  const bal = Number(totalBankBalance) || 0;
  const t = yearTotals || { totalIncome: 0, totalExpense: 0, net: 0, monthCount: 0 };
  return [
    { title: '家庭總餘額', value: formatHKD(bal), valueClass: bal >= 0 ? 'emerald' : 'red', hint: `共 ${list.length} 個銀行帳號`, icon: 'landmark' },
    { title: `${year} 家庭收入`, value: formatHKD(t.totalIncome), valueClass: 'emerald', hint: '家用轉入 + 額外收入', icon: 'trending-up' },
    { title: `${year} 年度總支出`, value: formatHKD(t.totalExpense), valueClass: 'red', hint: `${t.monthCount} 個月有紀錄`, icon: 'trending-down' },
    { title: `${year} 年度淨餘額`, value: formatHKD(t.net), valueClass: t.net >= 0 ? 'emerald' : 'red', hint: t.net >= 0 ? '收支平衡' : '支出大於收入', icon: 'wallet' },
  ];
}

function _computeAnnualOverview(allIncome, allExpenses, policies, currentYear) {
  const curY = Number(currentYear) || new Date().getFullYear();
  const startY = curY - 2;
  const endY = curY + 2;
  const rows = [];

  for (let y = startY; y <= endY; y++) {
    const yk = String(y);
    const yi = (allIncome || {})[yk] || {};
    const ye = (allExpenses || {})[yk] || {};

    let totalIncome = 0;
    Object.values(yi).forEach((md) => {
      Object.values(md || {}).forEach((v) => { totalIncome += Number(v) || 0; });
    });

    let totalExpense = 0;
    let monthsWithData = 0;
    Object.values(ye).forEach((md) => {
      const me = (md && md.member_expenses) || {};
      let monthSum = 0;
      Object.values(me).forEach((items) => {
        Object.values(items || {}).forEach((e) => { monthSum += Number(e && e.amount) || 0; });
      });
      if (monthSum > 0) monthsWithData++;
      totalExpense += monthSum;
    });

    let insurance = 0;
    (policies || []).forEach((p) => {
      try { insurance += getPolicyAnnualPremium(p, y) || 0; } catch (e) { /* noop */ }
    });

    const net = totalIncome - totalExpense - insurance;
    const avg = monthsWithData > 0 ? Math.round(totalExpense / monthsWithData) : 0;

    rows.push({
      year: y,
      totalIncome: Math.round(totalIncome),
      totalExpense: Math.round(totalExpense),
      insurance: Math.round(insurance),
      net: Math.round(net),
      avg,
      isCurrent: y === curY,
    });
  }

  return rows;
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/pages/dashboard.js
   Version: v103.0.35
   Batch: B29-7b
   ═══════════════════════════════════════════ */