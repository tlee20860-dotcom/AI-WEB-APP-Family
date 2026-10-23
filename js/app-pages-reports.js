// ============================================
// app-pages-reports.js — 5 個報表／設定頁
// 職責：finance / annual-report / member-report / settings / admin
// 版本：1.0.1（FIX-C：補齊 GAP-10, GAP-18, GAP-23, GAP-24）
// ============================================

import { AppState, registerPage, logout } from './app-core.js';
import { toast, openConfirm, buildForm, openModal, closeModal, initTabPanel, esc, formatHKD, openPrompt } from './app-ui.js';
import {
  api, listen, listenList, getList, resolveName, statusLabel, statusBadgeClass, statusIsDone,
  listenYearRange, saveYearRange, listenPageMetadata, savePageMetadata, getYearRange, getColumns, getResolvers
} from './app-data.js';
import { renderStats, renderTable, renderControls } from './app-widgets.js';
import { openEntityModal, removeEntity, getDynamicOptions } from './app-entities.js';
import {
  calcBankBalance, computeYearTotals, computeMemberReportRows,
  computeMemberAnnualRows, computeAnnualOverview,
  getPolicyAnnualPremium, getPolicyTotalPremium, getPolicyPaidTotal,
  countCompletedPeriods, calcProgress, isPolicyCompleted,
  calcFundCostEstimate, getFundCostMap, findPolicyByFund,
} from './app-domain.js';
import { getEntityDef } from './app-entities.js';

/* ============================================
   1. Finance（銀行交易）
   ============================================ */
function pageFinance(root) {
  root.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">銀行交易</h1><p class="page-subtitle"></p></div></div>
    <div id="fin-stats"></div>
    <div id="fin-ctrl"></div>
    <div id="fin-tabs"></div>
    <div id="fin-panel-banks" class="tab-panel"></div>
    <div id="fin-panel-txns" class="tab-panel"></div>`;
  let _accounts = [], _stats = null, _ctrl = null, _tab = null;

  const flatten = () => {
    const arr = [];
    _accounts.forEach((acc) => Object.entries(acc.transactions || {}).forEach(([id, t]) => arr.push({ id, bankId: acc.id, bankName: acc.name || '', ...t })));
    return arr;
  };

  const paint = () => {
    const { year, month } = AppState.getYearMonth();
    const tM = month === 'all' ? '12' : month;
    const y = year || String(new Date().getFullYear());
    const all = flatten();
    const total = calcBankBalance(_accounts, all, y, tM);
    const prefix = `${y}-${String(tM).padStart(2, '0')}`;
    const monthTxns = all.filter((t) => (t.date || '').startsWith(prefix));
    const inTotal = monthTxns.filter((t) => t.type === 'in').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const outTotal = monthTxns.filter((t) => t.type !== 'in').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    
    _stats?.destroy?.();
    _stats = renderStats({ container: 'fin-stats', columns: 4, cards: [
      { title: '家庭總餘額', value: formatHKD(total), valueClass: total >= 0 ? 'text-emerald' : 'text-red', hint: `${_accounts.length} 個帳號`, icon: 'landmark' },
      { title: '本月入帳', value: formatHKD(inTotal), valueClass: 'text-emerald', icon: 'arrow-down-circle' },
      { title: '本月出帳', value: formatHKD(outTotal), valueClass: 'text-red', icon: 'arrow-up-circle' },
      { title: '本月淨變動', value: formatHKD(inTotal - outTotal), valueClass: (inTotal - outTotal) >= 0 ? 'text-emerald' : 'text-red', icon: 'trending-up' },
    ] });
    
    paintBanks();
    paintTxns(all);
  };

  const paintBanks = () => {
    const el = document.getElementById('fin-panel-banks');
    if (!el) return;
    const { year, month } = AppState.getYearMonth();
    const tM = month === 'all' ? '12' : month;
    const y = year || String(new Date().getFullYear());
    const all = flatten();
    const rows = _accounts.map((a) => ({ ...a, _balance: calcBankBalance([a], all, y, tM) }));
    
    renderTable({ container: el, rows,
      columns: [
        { id: 'name', label: '名稱', type: 'text' },
        { id: 'type', label: '類型', width: 100 },
        { id: 'initialBalance', label: '初始餘額', type: 'number', width: 130 },
        { id: '_balance', label: '當前餘額', type: 'number', width: 130 },
      ],
      resolvers: {
        type: (v) => v === 'personal' ? '👤 個人' : '🏠 家庭',
        initialBalance: (v) => `<span class="mono">${formatHKD(v)}</span>`,
        _balance: (v) => `<span class="mono ${v >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(v)}</span>`,
      },
    });
  };

  const paintTxns = (all) => {
    const el = document.getElementById('fin-panel-txns');
    if (!el) return;
    const { year, month } = AppState.getYearMonth();
    const y = year || String(new Date().getFullYear());
    const tM = month === 'all' ? null : month;
    let rows = all;
    if (tM) rows = rows.filter((t) => (t.date || '').startsWith(`${y}-${String(tM).padStart(2, '0')}`));
    else rows = rows.filter((t) => (t.date || '').startsWith(y));
    rows = rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    
    renderTable({ container: el, rows,
      columns: [
        { id: 'date', label: '日期', type: 'date', width: 110 },
        { id: 'bankName', label: '銀行', width: 100 },
        { id: 'type', label: '類型', width: 90 },
        { id: 'category', label: '分類', width: 100 },
        { id: 'amount', label: '金額', type: 'number', width: 120 },
        { id: 'note', label: '備註' },
      ],
      resolvers: {
        type: (v) => `<span class="badge ${v === 'in' ? 'badge-success' : v === 'transfer' ? 'badge-info' : 'badge-pending'}">${v === 'in' ? '入帳' : v === 'out' ? '出帳' : '轉帳'}</span>`,
        category: (v) => esc({ contribution: '家用轉入', expense: '支出', insurance: '保險', reimbursement: '代墊報銷', manual: '手動' }[v] || v || '—'),
        amount: (v, r) => `<span class="mono ${r.type === 'in' ? 'text-emerald' : 'text-red'}">${r.type === 'in' ? '+' : '-'}${formatHKD(v)}</span>`,
      },
    });
  };

  _tab = initTabPanel({
    containerId: 'fin-tabs', defaultKey: 'banks',
    tabs: [{ key: 'banks', label: '銀行清單', icon: 'landmark', panelId: 'fin-panel-banks' }, { key: 'txns', label: '交易記錄', icon: 'list', panelId: 'fin-panel-txns' }],
    onChange: (k) => {
      document.getElementById('fin-panel-banks').style.display = k === 'banks' ? 'block' : 'none';
      document.getElementById('fin-panel-txns').style.display = k === 'txns' ? 'block' : 'none';
    },
  });
  document.getElementById('fin-panel-banks').style.display = 'block';
  document.getElementById('fin-panel-txns').style.display = 'none';

  const unsubs = [listen('bank_accounts', (snap) => {
    const v = snap.val() || {};
    _accounts = Object.entries(v).map(([id, x]) => ({ id, ...x }));
    paint();
  })];
  
  _ctrl = renderControls({ container: 'fin-ctrl', items: [{ type: 'year' }, { type: 'month', includeAll: true }] });
  
  return { destroy: () => { unsubs.forEach((u) => u && u()); _stats?.destroy?.(); _ctrl?.destroy?.(); _tab?.destroy?.(); } };
}

/* ============================================
   2. Annual Report
   ============================================ */
function pageAnnualReport(root) {
  root.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">年度報表</h1><p class="page-subtitle"></p></div><div id="ar-actions"></div></div>
    <div id="ar-stats"></div>
    <div id="ar-ctrl"></div>
    <div id="ar-summary"></div>
    <div id="ar-monthly" style="display:none;"></div>`;
  let _stats = null, _ctrl = null, _view = 'summary';
  let _allIncome = {}, _allExpenses = {}, _allPersonalIncome = {};

  const paint = () => {
    const year = AppState.year;
    const yt = computeYearTotals(_allIncome, _allExpenses, year);
    let pi = 0;
    Object.values(_allPersonalIncome || {}).forEach((md) => Object.values((md || {})[year] || {}).forEach((v) => { pi += Number(v) || 0; }));
    
    _stats?.destroy?.();
    _stats = renderStats({ container: 'ar-stats', columns: 4, cards: [
      { title: `${year} 家用轉入`, value: formatHKD(yt.totalIncome), valueClass: 'text-emerald', icon: 'trending-up' },
      { title: `${year} 個人收入`, value: formatHKD(pi), valueClass: 'text-cyan', icon: 'wallet' },
      { title: `${year} 總支出`, value: formatHKD(yt.totalExpense), valueClass: 'text-red', icon: 'trending-down' },
      { title: `${year} 淨餘額`, value: formatHKD(yt.totalIncome + pi - yt.totalExpense), valueClass: (yt.totalIncome + pi - yt.totalExpense) >= 0 ? 'text-emerald' : 'text-red', icon: 'calculator' },
    ] });
    paintSummary();
    paintMonthly();
  };

  const paintSummary = () => {
    const el = document.getElementById('ar-summary');
    if (!el) return;
    const members = getList('members');
    const rows = computeMemberAnnualRows(members, _allIncome, _allExpenses, _allPersonalIncome, AppState.year);
    
    el.innerHTML = `<div style="overflow-x:auto;"><div class="glass-card" style="padding:0;"><table class="data-table">
      <thead><tr><th>成員</th><th class="num">家用轉入</th><th class="num">個人收入</th><th class="num">總支出</th><th class="num">淨結餘</th></tr></thead>
      <tbody>${rows.map((r) => `<tr style="${r.__isTotal ? 'font-weight:700;background:var(--hover-bg-strong);' : r.__isShared ? 'background:rgba(220,38,38,0.05);' : ''}">
        <td>${esc(r.name)}</td>
        <td class="num">${formatHKD(r.income)}</td>
        <td class="num">${formatHKD(r.personalIncome)}</td>
        <td class="num">${formatHKD(r.expense)}</td>
        <td class="num ${r.net >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(r.net)}</td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
  };

  const paintMonthly = () => {
    const el = document.getElementById('ar-monthly');
    if (!el) return;
    const year = AppState.year;
    const m = AppState.month === 'all' ? '01' : AppState.month;
    const monthData = (_allExpenses[year] || {})[m]?.member_expenses || {};
    const incomeM = (_allIncome[year] || {})[m] || {};
    const rows = [];
    Object.entries(incomeM).forEach(([mid, amt]) => rows.push({ name: `收入：${resolveName('members', mid) || mid}`, amount: Number(amt) || 0 }));
    Object.entries(monthData).forEach(([mid, items]) => Object.values(items || {}).forEach((e) => rows.push({ name: `支出：${e.name || ''}`, amount: -(Number(e.amount) || 0) })));
    
    el.innerHTML = `<div class="glass-card" style="padding:0;"><table class="data-table"><thead><tr><th>項目</th><th class="num">金額</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(r.name)}</td><td class="num ${r.amount >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(r.amount)}</td></tr>`).join('')}
    </tbody></table></div>`;
  };

  const unsubs = [
    listen('income', (snap) => { _allIncome = snap.val() || {}; paint(); }),
    listen('expenses', (snap) => { _allExpenses = snap.val() || {}; paint(); }),
    listen('personal_income', (snap) => { _allPersonalIncome = snap.val() || {}; paint(); }),
  ];

  _ctrl = renderControls({ container: 'ar-ctrl', items: [
    { type: 'year' },
    { type: 'month', includeAll: true },
    { type: 'custom', render: () => `<div class="view-toggle-group">
        <button type="button" class="btn btn-sm btn-primary" data-arv="summary">全年總合</button>
        <button type="button" class="btn btn-sm btn-ghost" data-arv="monthly">月度明細</button>
      </div>` },
  ] });
  
  document.getElementById('ar-ctrl')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-arv]');
    if (!b) return;
    _view = b.dataset.arv;
    document.querySelectorAll('[data-arv]').forEach((x) => { x.classList.toggle('btn-primary', x === b); x.classList.toggle('btn-ghost', x !== b); });
    document.getElementById('ar-summary').style.display = _view === 'summary' ? '' : 'none';
    document.getElementById('ar-monthly').style.display = _view === 'monthly' ? '' : 'none';
  });
  
  return { destroy: () => { unsubs.forEach((u) => u && u()); _stats?.destroy?.(); _ctrl?.destroy?.(); } };
}

/* ============================================
   3. Member Report
   ============================================ */
function pageMemberReport(root) {
  root.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">成員收支明細</h1><p class="page-subtitle"></p></div></div>
    <div id="mr-stats"></div>
    <div id="mr-ctrl"></div>
    <div id="mr-list"></div>`;
  let _stats = null, _ctrl = null;
  let _allIncome = {}, _allExpenses = {}, _allPersonalIncome = {};

  const paint = () => {
    const members = getList('members');
    const rows = computeMemberReportRows(members, _allIncome, _allExpenses, _allPersonalIncome, AppState.year);
    const tI = rows.reduce((s, r) => s + r.income, 0);
    const tPI = rows.reduce((s, r) => s + r.personalIncome, 0);
    const tE = rows.reduce((s, r) => s + r.expense, 0);
    const tIns = rows.reduce((s, r) => s + r.insurance, 0);
    
    _stats?.destroy?.();
    _stats = renderStats({ container: 'mr-stats', columns: 4, cards: [
      { title: `${AppState.year} 家庭收入`, value: formatHKD(tI), valueClass: 'text-emerald', icon: 'trending-up' },
      { title: `${AppState.year} 個人收入`, value: formatHKD(tPI), valueClass: 'text-cyan', icon: 'wallet' },
      { title: `${AppState.year} 總支出`, value: formatHKD(tE), valueClass: 'text-red', icon: 'trending-down' },
      { title: `${AppState.year} 保險平攤`, value: formatHKD(tIns), valueClass: 'text-magenta', icon: 'shield' },
    ] });
    
    renderTable({ container: 'mr-list', rows,
      columns: [
        { id: 'name', label: '成員', type: 'text', width: 140 },
        { id: 'income', label: '家用轉入', type: 'number', width: 130 },
        { id: 'personalIncome', label: '個人收入', type: 'number', width: 130 },
        { id: 'expense', label: '支出', type: 'number', width: 130 },
        { id: 'insurance', label: '保險', type: 'number', width: 130 },
        { id: 'net', label: '淨額', type: 'number', width: 130 },
      ],
      resolvers: {
        income: (v) => `<span class="text-emerald">${formatHKD(v)}</span>`,
        personalIncome: (v) => `<span class="text-cyan">${formatHKD(v)}</span>`,
        expense: (v) => `<span class="text-red">${formatHKD(v)}</span>`,
        insurance: (v) => `<span class="text-magenta">${formatHKD(v)}</span>`,
        net: (v) => `<span class="${v >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(v)}</span>`,
      },
    });
  };

  const unsubs = [
    listen('members', () => paint()),
    listen('income', (s) => { _allIncome = s.val() || {}; paint(); }),
    listen('expenses', (s) => { _allExpenses = s.val() || {}; paint(); }),
    listen('personal_income', (s) => { _allPersonalIncome = s.val() || {}; paint(); }),
  ];
  
  _ctrl = renderControls({ container: 'mr-ctrl', items: [{ type: 'year' }] });
  
  return { destroy: () => { unsubs.forEach((u) => u && u()); _stats?.destroy?.(); _ctrl?.destroy?.(); } };
}

/* ============================================
   4. Settings（GAP-10, 18, 23）
   ============================================ */
function pageSettings(root) {
  root.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">系統設定</h1><p class="page-subtitle"></p></div></div>
    <div id="st-tabs"></div>
    <div id="st-panel-platform" class="tab-panel"></div>
    <div id="st-panel-banks" class="tab-panel"></div>
    <div id="st-panel-personal" class="tab-panel"></div>`;
  
  const isSuper = AppState.isSuperAdmin;
  const tabs = [
    ...(isSuper ? [{ key: 'platform', label: '平台設定', icon: 'settings', panelId: 'st-panel-platform' }] : []),
    { key: 'banks', label: '銀行帳號', icon: 'landmark', panelId: 'st-panel-banks' },
    { key: 'personal', label: '個人化', icon: 'user', panelId: 'st-panel-personal' },
  ];
  let _tab = null, _bankUnsub = null, _memberUnsub = null, _yrUnsub = null, _metaUnsub = null;
  let _personalRendered = false;

  const loadBanks = () => {
    const el = document.getElementById('st-panel-banks');
    if (!el) return;
    el.innerHTML = `
      <div class="flex flex-between mb-16">
        <div class="text-muted" style="font-size:13px;">共 ${getList('bank_accounts').length} 個帳號</div>
        <button type="button" class="btn btn-primary" id="st-bank-add"><i data-lucide="plus"></i> 新增銀行帳號</button>
      </div>
      <div id="st-bank-list"></div>`;
      
    document.getElementById('st-bank-add')?.addEventListener('click', () => openEntityModal('bankAccount', 'add', { onSuccess: loadBanks }));
    
    renderTable({
      container: 'st-bank-list', rows: getList('bank_accounts'),
      columns: [
        { id: 'name', label: '名稱', type: 'text' },
        { id: 'type', label: '類型', width: 100 },
        { id: 'initialBalance', label: '初始餘額', type: 'number', width: 130 },
      ],
      resolvers: {
        type: (v) => v === 'personal' ? '👤 個人' : '🏠 家庭',
        initialBalance: (v) => `<span class="mono">${formatHKD(v)}</span>`,
      },
      actions: (row) => [
        { label: '編輯', icon: 'pencil', className: 'btn-ghost', action: 'edit', onClick: () => openEntityModal('bankAccount', 'edit', { id: row.id, allRows: getList('bank_accounts'), onSuccess: loadBanks }) },
        { label: '刪除', icon: 'trash-2', className: 'btn-danger', action: 'del', onClick: async () => {
          const ok = await openConfirm(`確定刪除「${row.name}」？`, { okText: '刪除', okClass: 'btn-danger' });
          if (!ok) return;
          try { await removeEntity('bankAccount', row.id); toast('✅ 已刪除', 'success'); } catch (e) { toast(e.message, 'error'); }
        }},
      ],
    });
  };

  const loadPersonal = () => {
    const el = document.getElementById('st-panel-personal');
    if (!el) return;
    if (_personalRendered) return;
    _personalRendered = true;

    const acc = AppState.getMemberAccount() || {};
    const savedMode = localStorage.getItem(`fin_${AppState.getFamilyId()}_ui_stats_mode`) || 'auto';

    el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:16px;align-items:start;">
      <div class="glass-card">
        <div class="glass-card-title" style="margin-bottom:12px;">帳號資訊</div>
        <div class="form-stack">
          <div class="field"><label class="field-label">登入帳號</label><input class="input mono" disabled value="${esc(acc.account || AppState.currentUser?.email?.split('@')[0] || '')}"></div>
          <div class="field"><label class="field-label">角色</label><input class="input mono" disabled value="${esc(AppState.getRole() || '')}"></div>
          <div class="field"><label class="field-label">家庭名稱</label><input class="input" disabled value="${esc(AppState.getFamilyName() || '')}"></div>
        </div>
        <div style="margin-top:16px;text-align:right;"><button type="button" class="btn btn-danger" id="st-logout"><i data-lucide="log-out"></i> 登出</button></div>
      </div>

      <div class="glass-card">
        <div class="glass-card-title" style="margin-bottom:12px;">統計卡顯示模式</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px;border-radius:6px;background:rgba(255,255,255,0.03);">
            <input type="radio" name="stats-mode" value="auto" ${savedMode === 'auto' ? 'checked' : ''} style="width:auto;cursor:pointer;">
            <span style="font-size:13px;">自動（依裝置 / 檢視模式）</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px;border-radius:6px;background:rgba(255,255,255,0.03);">
            <input type="radio" name="stats-mode" value="integrated" ${savedMode === 'integrated' ? 'checked' : ''} style="width:auto;cursor:pointer;">
            <span style="font-size:13px;">整合卡（單一大卡）</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px;border-radius:6px;background:rgba(255,255,255,0.03);">
            <input type="radio" name="stats-mode" value="compact" ${savedMode === 'compact' ? 'checked' : ''} style="width:auto;cursor:pointer;">
            <span style="font-size:13px;">緊湊卡（多個小卡）</span>
          </label>
        </div>
        <div style="margin-top:16px;text-align:right;">
          <button type="button" class="btn btn-primary" id="save-stats-mode"><i data-lucide="check" style="width:14px;height:14px;"></i> 儲存顯示模式</button>
        </div>
      </div>

      <div class="glass-card" style="grid-column:1/-1;">
        <div class="glass-card-title" style="margin-bottom:12px;">家庭成員</div>
        <div id="st-members"></div>
      </div>

      <div class="glass-card" style="grid-column:1/-1;">
        <div class="glass-card-title" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <i data-lucide="calendar" style="width:16px;height:16px;color:var(--neon-cyan);"></i>
          <span>年份範圍</span>
        </div>
        <div id="st-yr-root"></div>
      </div>

      <div class="glass-card" style="grid-column:1/-1;">
        <div class="glass-card-title" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <i data-lucide="type" style="width:16px;height:16px;color:var(--neon-cyan);"></i>
          <span>頁面標題</span>
        </div>
        <div class="field" style="margin-bottom:12px;">
          <label class="field-label">選擇頁面</label>
          <select class="select" id="meta-page" style="max-width:400px;">
            <option value="dashboard">總覽儀表板</option>
            <option value="portfolio">基金投資表</option>
            <option value="settings">系統設定</option>
          </select>
        </div>
        <div class="field" style="margin-bottom:12px;">
          <label class="field-label">標題</label>
          <input class="input" type="text" id="meta-title" maxlength="40" style="max-width:400px;">
        </div>
        <button type="button" class="btn btn-primary" id="meta-save">儲存</button>
      </div>
    </div>`;

    document.getElementById('st-logout')?.addEventListener('click', async () => {
      const ok = await openConfirm('確定要登出嗎？', { title: '登出', okText: '登出', okClass: 'btn-danger' });
      if (ok) logout();
    });

    document.getElementById('save-stats-mode')?.addEventListener('click', () => {
      const selected = document.querySelector('input[name="stats-mode"]:checked');
      if (selected) {
        localStorage.setItem(`fin_${AppState.getFamilyId()}_ui_stats_mode`, selected.value);
        toast('✅ 已儲存顯示模式', 'success');
      }
    });

    renderTable({ container: 'st-members', rows: getList('members'),
      columns: [{ id: 'name', label: '名稱', type: 'text' }, { id: 'role', label: '角色', width: 120 }],
      resolvers: { role: (v) => esc(v || '—') },
    });

    // 年份範圍
    const yrRoot = document.getElementById('st-yr-root');
    _yrUnsub = listenYearRange((d) => {
      const curRange = d || { startYear: null, futureYears: 5 };
      yrRoot.innerHTML = `
        <div class="grid grid-2">
          <div class="field"><label class="field-label">起始年份</label><input class="input" type="number" id="yr-start" value="${curRange.startYear || ''}" placeholder="留空預設"></div>
          <div class="field"><label class="field-label">往後顯示年數</label><input class="input" type="number" id="yr-future" value="${curRange.futureYears}"></div>
        </div>
        <div style="text-align:right; margin-top:8px;"><button type="button" class="btn btn-primary" id="yr-save">儲存年份</button></div>
      `;
      document.getElementById('yr-save')?.addEventListener('click', async () => {
        const s = document.getElementById('yr-start').value;
        const f = document.getElementById('yr-future').value;
        try {
          await saveYearRange({ startYear: s ? Number(s) : null, futureYears: Number(f) });
          toast('✅ 年份範圍已儲存', 'success');
        } catch (e) { toast('儲存失敗：' + e.message, 'error'); }
      });
    });

    // 頁面標題
    const metaPage = document.getElementById('meta-page');
    const metaTitle = document.getElementById('meta-title');
    let allMeta = {};
    _metaUnsub = listenPageMetadata((all) => {
      allMeta = all || {};
      metaTitle.value = allMeta[metaPage.value]?.title || '';
    });
    metaPage?.addEventListener('change', () => { metaTitle.value = allMeta[metaPage.value]?.title || ''; });
    document.getElementById('meta-save')?.addEventListener('click', async () => {
      const page = metaPage.value;
      const title = metaTitle.value.trim();
      if (!title) return toast('標題不可為空', 'warning');
      try {
        await savePageMetadata({ ...allMeta, [page]: { title } });
        toast('✅ 標題已儲存', 'success');
      } catch (e) { toast('儲存失敗：' + e.message, 'error'); }
    });
  };

  const loadTab = (key) => {
    if (key === 'banks') { loadBanks(); if (!_bankUnsub) _bankUnsub = listen('bank_accounts', loadBanks); }
    else if (key === 'personal') { loadPersonal(); if (!_memberUnsub) _memberUnsub = listen('members', loadPersonal); }
    else if (key === 'platform') {
      const el = document.getElementById('st-panel-platform');
      if (el) el.innerHTML = `<div class="banner">平台設定請至管理員頁面</div>`;
    }
  };

  _tab = initTabPanel({
    containerId: 'st-tabs', tabs, defaultKey: isSuper ? 'platform' : 'banks',
    onChange: (k) => loadTab(k),
  });
  loadTab(isSuper ? 'platform' : 'banks');

  return { destroy: () => { 
    _tab?.destroy?.(); 
    if (_bankUnsub) _bankUnsub(); 
    if (_memberUnsub) _memberUnsub(); 
    if (_yrUnsub) _yrUnsub();
    if (_metaUnsub) _metaUnsub();
    _personalRendered = false;
  } };
}

/* ============================================
   5. Admin（GAP-24）
   ============================================ */
function pageAdmin(root) {
  root.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">平台管理</h1><p class="page-subtitle"></p></div>
      <div><button type="button" class="btn btn-danger" id="ad-logout"><i data-lucide="log-out"></i> 登出</button></div></div>
    <div class="banner">ℹ️ 管理所有家庭與平台預設資料庫</div>
    <div id="ad-tabs"></div>
    <div id="ad-panel-families" class="tab-panel"></div>
    <div id="ad-panel-defaults" class="tab-panel"></div>`;

  let _tab = null;

  const loadFamilies = async () => {
    const el = document.getElementById('ad-panel-families');
    if (!el) return;
    try {
      const r = await api.adminListFamilies();
      const families = r.families || [];
      renderTable({
        container: el, rows: families,
        columns: [
          { id: 'uid', label: 'UID', width: 220 },
          { id: 'name', label: '名稱' },
          { id: 'ownerEmail', label: '擁有者 Email', width: 200 },
          { id: 'createdAt', label: '建立時間', width: 160 },
        ],
        resolvers: {
          uid: (v) => `<span class="mono" style="font-size:12px;">${esc(v)}</span>`,
          ownerEmail: (v) => `<span class="mono" style="font-size:12px;color:var(--text-muted);">${esc(v || '—')}</span>`,
          createdAt: (v) => `<span class="mono" style="font-size:12px;">${v ? new Date(v).toLocaleString('zh-HK') : '—'}</span>`,
        },
        actions: () => [
          { label: '刪除', icon: 'trash-2', className: 'btn-danger', action: 'del', onClick: async (row) => {
            const ok = await openConfirm(`確定刪除家庭「${row.name || row.uid}」？`, { okText: '刪除', okClass: 'btn-danger' });
            if (!ok) return;
            try { await api.adminRemoveFamily(row.uid); toast('✅ 已刪除', 'success'); loadFamilies(); } catch (e) { toast(e.message, 'error'); }
          }},
        ],
      });
    } catch (e) { toast('載入失敗：' + e.message, 'error'); }
  };

  const loadDefaults = () => {
    const el = document.getElementById('ad-panel-defaults');
    if (!el) return;
    
    // 簡易預設資料庫編輯（成員、銀行、公司、支付、類別、狀態）
    el.innerHTML = `
      <div class="banner">ℹ️ 此處的預設資料將套用於「新家庭初始化時」，修改後不影響已存在的家庭。</div>
      <div id="ad-defaults-tabs"></div>
      <div id="ad-defaults-list"></div>
    `;
    
    const dTab = initTabPanel({
      containerId: 'ad-defaults-tabs',
      tabs: [
        { key: 'members', label: '成員', icon: 'users' },
        { key: 'companies', label: '保險公司', icon: 'shield' },
        { key: 'categories', label: '支出類別', icon: 'tags' },
      ],
      defaultKey: 'members',
      onChange: async (k) => {
        const listEl = document.getElementById('ad-defaults-list');
        listEl.innerHTML = '<div class="empty-state">載入中…</div>';
        try {
          const res = await api.platformDefaults.list(k);
          renderTable({
            container: listEl,
            rows: res.list || [],
            columns: [
              { id: 'name', label: '名稱' },
              { id: 'order', label: '排序', width: 80 },
            ],
            actions: (row) => [
              { label: '刪除', icon: 'trash-2', className: 'btn-danger', action: 'del', onClick: async () => {
                const ok = await openConfirm(`確定刪除「${row.name}」？`, { okText: '刪除', okClass: 'btn-danger' });
                if (!ok) return;
                try { await api.platformDefaults.remove(k, row.id); toast('✅ 已刪除', 'success'); dTab.switchTo(k); } catch (e) { toast(e.message, 'error'); }
              }},
            ],
          });
        } catch (e) { listEl.innerHTML = `<div class="text-red">載入失敗：${e.message}</div>`; }
      }
    });
  };

  _tab = initTabPanel({
    containerId: 'ad-tabs',
    tabs: [
      { key: 'families', label: '家庭列表', icon: 'home', panelId: 'ad-panel-families' },
      { key: 'defaults', label: '預設資料庫', icon: 'database', panelId: 'ad-panel-defaults' },
    ],
    defaultKey: 'families',
    onChange: (k) => { if (k === 'families') loadFamilies(); else loadDefaults(); },
  });
  loadFamilies();

  document.getElementById('ad-logout')?.addEventListener('click', async () => {
    const ok = await openConfirm('確定要登出嗎？', { title: '登出', okText: '登出', okClass: 'btn-danger' });
    if (ok) logout();
  });

  return { destroy: () => { _tab?.destroy?.(); root.innerHTML = ''; } };
}

/* ============================================
   6. 註冊
   ============================================ */
registerPage('/finance', pageFinance);
registerPage('/annual-report', pageAnnualReport);
registerPage('/member-report', pageMemberReport);
registerPage('/settings', pageSettings);
registerPage('/admin', pageAdmin);

export { pageFinance, pageAnnualReport, pageMemberReport, pageSettings, pageAdmin };

/* ═══ EOF ═══
F: js/app-pages-reports.js
V: 1792720500
W: webapp-20261023-001#10
═══ */
