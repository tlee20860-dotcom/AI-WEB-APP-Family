// ============================================
// app-pages-core.js — 6 個日常頁
// 職責：dashboard / input-center / code-list / insurance / portfolio / settlements
// 版本：1.0.2（補齊 Dashboard / Insurance / Settlements 完整實作）
// ============================================

import { AppState, registerPage } from './app-core.js';
import { toast, openConfirm, buildForm, openModal, closeModal, initTabPanel, esc, formatHKD, openPrompt } from './app-ui.js';
import {
  api, listen, listenList, getList, resolveName, statusLabel, statusBadgeClass,
  statusIsDone, statusNormalize, saveFundSnapshot, removeFundSnapshot,
  getFundSnapshotListOnce, getColumns, getResolvers, getOnce, setSubpath, pushItem, removeItem
} from './app-data.js';
import { renderStats, renderTable, renderControls } from './app-widgets.js';
import { openEntityModal, ENTITIES, removeEntity, getDynamicOptions } from './app-entities.js';
import {
  calcBankBalance, computeYearTotals, computeAnnualOverview, getPolicyAnnualPremium,
  getPolicyTotalPremium, getPolicyPaidTotal, countCompletedPeriods, calcProgress,
  isPolicyCompleted, calcFundCostEstimate, getFundCostMap, findPolicyByFund,
  mergeSettlementData, computeMemberAnnualRows, resolveMonthlyAmount
} from './app-domain.js';

/* ============================================
   1. Dashboard
   ============================================ */
function pageDashboard(root) {
  root.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">總覽儀表板</h1><p class="page-subtitle"></p></div></div>
    <div id="dash-stats"></div>
    <div id="dash-ctrl"></div>
    <div id="dash-annual"></div>`;
  let _stats = null, _ctrl = null;
  let _allIncome = {}, _allExpenses = {}, _accounts = [], _policies = [];

  const flattenTxns = () => {
    const list = [];
    _accounts.forEach((acc) => {
      Object.entries(acc.transactions || {}).forEach(([id, t]) => list.push({ id, bankId: acc.id, ...t }));
    });
    return list;
  };

  const render = () => {
    const year = AppState.year;
    const month = AppState.month === 'all' ? '12' : AppState.month;
    const bankTotal = calcBankBalance(_accounts, flattenTxns(), year, month);
    const yt = computeYearTotals(_allIncome, _allExpenses, year);

    _stats?.destroy?.();
    _stats = renderStats({ container: 'dash-stats', columns: 4, cards: [
      { title: '家庭總餘額', value: formatHKD(bankTotal), valueClass: bankTotal >= 0 ? 'text-emerald' : 'text-red', hint: `共 ${_accounts.length} 個帳號`, icon: 'landmark' },
      { title: `${year} 家庭收入`, value: formatHKD(yt.totalIncome), valueClass: 'text-emerald', icon: 'trending-up' },
      { title: `${year} 年度總支出`, value: formatHKD(yt.totalExpense), valueClass: 'text-red', hint: `${yt.monthCount} 個月有紀錄`, icon: 'trending-down' },
      { title: `${year} 年度淨餘額`, value: formatHKD(yt.net), valueClass: yt.net >= 0 ? 'text-emerald' : 'text-red', icon: 'wallet' },
    ] });
    paintAnnual();
  };

  const paintAnnual = () => {
    const el = document.getElementById('dash-annual');
    if (!el) return;
    const rows = computeAnnualOverview(_allIncome, _allExpenses, _policies, AppState.year);
    if (!rows.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="glass-card" style="padding:0;margin-bottom:20px;">
      <div style="padding:14px 20px;font-weight:600;font-size:14px;">年度總覽（前後 2 年）</div>
      <div style="overflow-x:auto;"><table class="data-table"><thead><tr>
        <th>年度</th><th class="num">家庭收入</th><th class="num">總支出</th><th class="num">保險平攤</th><th class="num">淨餘額</th><th class="num">每月平均</th>
      </tr></thead><tbody>${rows.map((r) => `<tr>
        <td>${r.year} 年${r.isCurrent ? ' <span class="badge badge-info" style="font-size:10px;">今年</span>' : ''}</td>
        <td class="num text-emerald">${formatHKD(r.totalIncome)}</td>
        <td class="num text-red">${formatHKD(r.totalExpense)}</td>
        <td class="num text-magenta">${formatHKD(r.insurance)}</td>
        <td class="num ${r.net >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(r.net)}</td>
        <td class="num">${formatHKD(r.avg)}</td>
      </tr>`).join('')}</tbody></table></div></div>`;
  };

  const unsubs = [
    listen('income', (snap) => { _allIncome = snap.val() || {}; render(); }),
    listen('expenses', (snap) => { _allExpenses = snap.val() || {}; render(); }),
    listen('bank_accounts', (snap) => { _accounts = Object.entries(snap.val() || {}).map(([id, x]) => ({ id, ...x })); render(); }),
    listen('insurance_policies', (snap) => { _policies = Object.entries(snap.val() || {}).map(([id, x]) => ({ id, ...x })); render(); }),
    AppState.on('ym-change', render)
  ];

  _ctrl = renderControls({ container: 'dash-ctrl', items: [
    { type: 'custom', render: () => `<a class="btn btn-primary" href="#/annual-report"><i data-lucide="bar-chart-3"></i> 查看年度報表</a>` },
    { type: 'year' },
  ] });
  render();
  return { destroy: () => { unsubs.forEach((u) => u && u()); _stats?.destroy?.(); _ctrl?.destroy?.(); } };
}

/* ============================================
   2. Input Center
   ============================================ */
function pageInputCenter(root) {
  root.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">綜合輸入中心</h1><p class="page-subtitle"></p></div></div>
    <div id="ic-buttons" class="flex flex-wrap gap-8 mb-16">
      <button type="button" class="btn btn-primary" data-action="add-expense"><i data-lucide="plus"></i> 新增支出</button>
      <button type="button" class="btn btn-ghost" data-action="add-contribution"><i data-lucide="trending-up"></i> 家用轉入</button>
      <button type="button" class="btn btn-ghost" data-action="add-personal-income"><i data-lucide="wallet"></i> 個人收入</button>
    </div>
    <div id="ic-tabs"></div>
    <div id="ic-panel-expense" class="tab-panel"></div>
    <div id="ic-panel-insurance" class="tab-panel"></div>
    <div id="ic-panel-fund" class="tab-panel"></div>
    <div id="ic-panel-bank" class="tab-panel"></div>`;
  const unsubs = [];
  let _tab, _expenseRows = [], _expUnsub = null;

  _tab = initTabPanel({
    containerId: 'ic-tabs',
    tabs: [
      { key: 'expense', label: '支出', icon: 'receipt', panelId: 'ic-panel-expense' },
      { key: 'insurance', label: '保險', icon: 'shield', panelId: 'ic-panel-insurance' },
      { key: 'fund', label: '基金', icon: 'line-chart', panelId: 'ic-panel-fund' },
      { key: 'bank', label: '銀行', icon: 'landmark', panelId: 'ic-panel-bank' },
    ],
    defaultKey: 'expense',
    storageKey: 'input-center-tab',
    onChange: (key) => loadTab(key),
  });

  const loadExpense = () => {
    if (_expUnsub) { try { _expUnsub(); } catch (e) {} }
    _expUnsub = listen('expenses', (snap) => {
      const flat = [];
      const year = AppState.year;
      Object.entries(snap.val() || {}).forEach(([y, ms]) => {
        if (String(y) !== String(year)) return;
        Object.entries(ms || {}).forEach(([m, md]) => {
          Object.entries(md.member_expenses || {}).forEach(([mid, items]) => {
            Object.entries(items || {}).forEach(([id, e]) => flat.push({ id, memberId: mid, year: y, month: m, ...e }));
          });
        });
      });
      _expenseRows = flat.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 50);
      paintExpense();
    });
  };

  const paintExpense = () => {
    const el = document.getElementById('ic-panel-expense');
    if (!el) return;
    el.innerHTML = '';
    renderTable({
      container: el, rows: _expenseRows,
      columns: [
        { id: 'date', label: '日期', type: 'date', width: 100 },
        { id: 'memberId', label: '成員', width: 100 },
        { id: 'name', label: '項目', type: 'text' },
        { id: 'amount', label: '金額', type: 'number', width: 110 },
        { id: 'status', label: '狀態', width: 120 },
      ],
      resolvers: {
        memberId: (v) => v === 'shared' ? '🏠 家庭' : esc(resolveName('members', v) || v || '—'),
        amount: (v) => formatHKD(v),
        status: (v) => `<span class="badge ${statusBadgeClass(v)}">${esc(statusLabel(v, { source: 'personal' }))}</span>`,
      },
      actions: AppState.getCanInput() ? (row) => [
        { label: '刪除', icon: 'trash-2', className: 'btn-danger', action: 'del', onClick: async () => {
          const ok = await openConfirm(`確定刪除「${row.name}」？`, { okText: '刪除', okClass: 'btn-danger' });
          if (!ok) return;
          try {
            await removeItem(`expenses/${row.year}/${row.month}/member_expenses/${row.memberId}`, row.id);
            toast('✅ 已刪除', 'success');
          } catch (e) { toast('刪除失敗：' + e.message, 'error'); }
        } },
      ] : () => [],
    });
  };

  const loadTab = (key) => {
    const el = document.getElementById(`ic-panel-${key}`);
    if (!el) return;
    if (key === 'expense') { loadExpense(); return; }
    
    el.innerHTML = `
      <div class="flex flex-between mb-16">
        <div class="text-muted" style="font-size:13px;">${key === 'insurance' ? '保單管理' : key === 'fund' ? '基金管理' : '銀行管理'}</div>
        <button type="button" class="btn btn-primary" id="ic-${key}-add-btn"><i data-lucide="plus"></i> 新增</button>
      </div>
      <div id="ic-${key}-list"></div>
    `;
    const entityType = key === 'insurance' ? 'policy' : key === 'fund' ? 'fund' : 'bank';
    document.getElementById(`ic-${key}-add-btn`)?.addEventListener('click', () => openEntityModal(entityType, 'add', { onSuccess: () => loadTab(key) }));

    const listPath = entityType === 'policy' ? 'insurance_policies' : entityType === 'fund' ? 'funds' : 'banks';
    const unSub = listen(listPath, (snap) => {
      const rows = Object.entries(snap.val() || {}).map(([id, x]) => ({ id, ...x }));
      const cols = entityType === 'policy' ? [
        { id: 'name', label: '保單名稱' }, { id: 'memberId', label: '受保人', width: 100 }, { id: 'company', label: '保險公司', width: 100 }
      ] : entityType === 'fund' ? [
        { id: 'name', label: '基金名稱' }, { id: 'cost', label: '投入成本', type: 'number' }, { id: 'currentValue', label: '現值', type: 'number' }
      ] : [
        { id: 'name', label: '銀行名稱' }
      ];
      renderTable({
        container: `ic-${key}-list`, rows, columns: cols,
        resolvers: {
          memberId: (v) => resolveName('members', v) || v || '—',
          cost: (v) => formatHKD(v), currentValue: (v) => formatHKD(v)
        },
        actions: (row) => [
          { label: '編輯', icon: 'pencil', className: 'btn-ghost', action: 'edit', onClick: () => openEntityModal(entityType, 'edit', { id: row.id, allRows: rows, onSuccess: () => loadTab(key) }) },
          { label: '刪除', icon: 'trash-2', className: 'btn-danger', action: 'del', onClick: async () => {
            const ok = await openConfirm(`確定刪除「${row.name}」？`, { okText: '刪除', okClass: 'btn-danger' });
            if (!ok) return;
            try { await removeEntity(entityType, row.id); toast('✅ 已刪除', 'success'); } catch (e) { toast(e.message, 'error'); }
          } },
        ]
      });
    });
    unsubs.push(unSub);
  };

  const btnRoot = document.getElementById('ic-buttons');
  btnRoot?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'add-expense') await openExpenseModal();
    else if (btn.dataset.action === 'add-contribution') await openContribModal();
    else if (btn.dataset.action === 'add-personal-income') await openPersonalIncomeModal();
  });

  loadTab(_tab?.getCurrent() || 'expense');
  return { destroy: () => { unsubs.forEach((u) => u && u()); _expUnsub?.(); _tab?.destroy?.(); } };
}

/* --- 輔助 Modal --- */
async function openExpenseModal() {
  const members = await getDynamicOptions('members');
  const cats = await getDynamicOptions('categories');
  const pays = await getDynamicOptions('payments');
  members.push({ value: 'shared', label: '🏠 家庭共用' });
  
  const o = document.createElement('div');
  o.className = 'modal-overlay active';
  o.innerHTML = `<div class="modal" style="max-width:520px;"><h2 class="modal-title">新增支出</h2><div id="__exp_form"></div></div>`;
  document.body.appendChild(o);
  
  buildForm({
    containerId: '__exp_form',
    fields: [
      { type: 'select', id: 'memberId', label: '成員', required: true, includeEmpty: false, options: members },
      { type: 'text', id: 'name', label: '項目名稱', required: true, maxlength: 60 },
      { type: 'number', id: 'amount', label: '金額（HK$）', required: true, min: 0, defaultValue: 0 },
      { type: 'text', id: 'date', label: '日期（YYYY-MM-DD）', defaultValue: new Date().toISOString().slice(0, 10) },
      { type: 'select', id: 'categoryId', label: '類別', options: cats, includeEmpty: true },
      { type: 'select', id: 'paymentMethodId', label: '支付方式', options: pays, includeEmpty: true },
    ],
    submitText: '新增', showCancel: true, cancelText: '取消',
    onSubmit: async (d) => {
      const { year, month } = AppState.getYearMonth();
      const y = year || String(new Date().getFullYear());
      const m = month === 'all' ? '01' : month;
      await pushItem(`expenses/${y}/${m}/member_expenses/${d.memberId}`, {
        name: d.name, amount: Number(d.amount) || 0, status: 'pending',
        date: d.date || '', categoryId: d.categoryId || '', itemId: '',
        paymentMethodId: d.paymentMethodId || '', bankId: '', txnId: '',
        isAutoLinked: false, createdAt: Date.now(),
      });
      toast('✅ 已新增支出', 'success');
      closeModal(o); o.remove();
    },
    onCancel: () => { closeModal(o); o.remove(); },
  });
  openModal(o);
}

async function openContribModal() {
  const members = await getDynamicOptions('members');
  const o = document.createElement('div');
  o.className = 'modal-overlay active';
  o.innerHTML = `<div class="modal" style="max-width:480px;"><h2 class="modal-title">家用轉入</h2><div id="__con_form"></div></div>`;
  document.body.appendChild(o);
  
  buildForm({
    containerId: '__con_form',
    fields: [
      { type: 'select', id: 'memberId', label: '成員', required: true, includeEmpty: false, options: members },
      { type: 'number', id: 'amount', label: '金額（HK$）', required: true, min: 0, defaultValue: 0 },
    ],
    submitText: '儲存', showCancel: true, cancelText: '取消',
    onSubmit: async (d) => {
      const { year, month } = AppState.getYearMonth();
      const y = year || String(new Date().getFullYear());
      const m = month === 'all' ? '01' : month;
      const snap = await getOnce(`income/${y}/${m}`) || {};
      snap[d.memberId] = Number(d.amount) || 0;
      await setSubpath(`income/${y}/${m}`, snap);
      toast('✅ 已新增家用轉入', 'success');
      closeModal(o); o.remove();
    },
    onCancel: () => { closeModal(o); o.remove(); },
  });
  openModal(o);
}

async function openPersonalIncomeModal() {
  const members = await getDynamicOptions('members');
  const o = document.createElement('div');
  o.className = 'modal-overlay active';
  o.innerHTML = `<div class="modal" style="max-width:480px;"><h2 class="modal-title">個人收入</h2><div id="__pi_form"></div></div>`;
  document.body.appendChild(o);
  
  buildForm({
    containerId: '__pi_form',
    fields: [
      { type: 'select', id: 'memberId', label: '成員', required: true, includeEmpty: false, options: members },
      { type: 'number', id: 'amount', label: '金額（HK$）', required: true, min: 0, defaultValue: 0 },
    ],
    submitText: '儲存', showCancel: true, cancelText: '取消',
    onSubmit: async (d) => {
      await api.personalIncome.save(d.memberId, AppState.year, AppState.month === 'all' ? '01' : AppState.month, Number(d.amount) || 0);
      toast('✅ 已新增個人收入', 'success');
      closeModal(o); o.remove();
    },
    onCancel: () => { closeModal(o); o.remove(); },
  });
  openModal(o);
}

/* ============================================
   3. Code List
   ============================================ */
function pageCodeList(root) {
  root.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">編號對照清單</h1><p class="page-subtitle"></p></div></div>
    <div id="cl-filter" class="glass-card" style="padding:12px;margin-bottom:16px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="display:grid;grid-template-columns:72px 1fr;gap:8px;align-items:center;">
          <label style="font-size:12px;color:var(--text-muted);text-align:right;">類型：</label>
          <select class="select" id="cl-type">
            <option value="all">全部</option>
            <option value="member">成員</option><option value="bank">銀行</option>
            <option value="category">支出類別</option><option value="item">支出項目</option>
            <option value="payment">支付方式</option><option value="company">保險公司</option>
            <option value="policy">保單</option><option value="fund">基金</option>
            <option value="bankAccount">銀行帳號</option>
          </select>
        </div>
        <div style="display:grid;grid-template-columns:72px 1fr;gap:8px;align-items:center;">
          <label style="font-size:12px;color:var(--text-muted);text-align:right;">編號狀態：</label>
          <select class="select" id="cl-code">
            <option value="all">全部</option>
            <option value="with">有編號</option>
            <option value="without">無編號</option>
          </select>
        </div>
      </div>
    </div>
    <div id="cl-list"></div>`;
  let _type = 'all', _code = 'all';
  let _dataMap = {};

  const render = () => {
    const rows = [];
    const types = [
      { key: 'member', label: '成員' }, { key: 'bank', label: '銀行' },
      { key: 'category', label: '支出類別' }, { key: 'item', label: '支出項目' },
      { key: 'payment', label: '支付方式' }, { key: 'company', label: '保險公司' },
      { key: 'policy', label: '保單' }, { key: 'fund', label: '基金' },
      { key: 'bankAccount', label: '銀行帳號' },
    ];
    types.forEach((t) => {
      if (_type !== 'all' && _type !== t.key) return;
      const list = getList(t.key);
      _dataMap[t.key] = list;
      list.forEach((r) => {
        const has = !!r.code;
        if (_code === 'with' && !has) return;
        if (_code === 'without' && has) return;
        rows.push({ entity: t.key, entityLabel: t.label, id: r.id, code: r.code || '', name: r.name || '（未命名）' });
      });
    });
    rows.sort((a, b) => (a.code || 'zzz').localeCompare(b.code || 'zzz'));

    renderTable({
      container: 'cl-list', rows,
      columns: getColumns('codeList'),
      resolvers: getResolvers('codeList'),
      actions: AppState.getCanInput() ? (row) => [
        { label: '編輯', icon: 'pencil', className: 'btn-ghost', action: 'edit', onClick: () => {
          openEntityModal(row.entity, 'edit', { id: row.id, allRows: _dataMap[row.entity] });
        }},
        { label: '刪除', icon: 'trash-2', className: 'btn-danger', action: 'del', onClick: async () => {
          const ok = await openConfirm(`確定要刪除「${row.name}」嗎？`, { okText: '刪除', okClass: 'btn-danger' });
          if (!ok) return;
          try { await removeEntity(row.entity, row.id); toast('✅ 已刪除', 'success'); } catch (e) { toast(e.message, 'error'); }
        }},
      ] : () => [],
    });
  };

  document.getElementById('cl-type')?.addEventListener('change', (e) => { _type = e.target.value; render(); });
  document.getElementById('cl-code')?.addEventListener('change', (e) => { _code = e.target.value; render(); });
  const keys = ['member','bank','category','item','payment','company','policy','fund','bankAccount'];
  const unsubs = keys.map((k) => listen(k === 'bankAccount' ? 'bank_accounts' : k === 'category' ? 'expense_categories' : k === 'item' ? 'expense_items' : k === 'payment' ? 'payment_methods' : k === 'company' ? 'insurance_companies' : k === 'policy' ? 'insurance_policies' : k === 'fund' ? 'funds' : k + 's', render));
  render();
  return { destroy: () => { unsubs.forEach((u) => u && u()); } };
}

/* ============================================
   4. Insurance
   ============================================ */
function pageInsurance(root) {
  root.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">保險清單表</h1><p class="page-subtitle"></p></div></div>
    <div id="ins-stats"></div>
    <div id="ins-ctrl"></div>
    <div class="banner">ℹ️ 每張保單依「保單年度」自動產生每月分攤。扣款狀態請至「結算清單」編輯。</div>
    <div class="glass-card completed-section" id="completed-section" style="margin-bottom:20px; display:none;">
      <div class="completed-header" id="completed-header">
        <div class="flex items-center gap-10">
          <i data-lucide="check-circle" style="width:18px;height:18px;color:var(--neon-emerald);"></i>
          <span style="font-weight:700; color:var(--neon-emerald);">已供滿保單</span>
          <span class="badge badge-success" id="completed-count">0</span>
        </div>
        <i data-lucide="chevron-down" class="completed-arrow"></i>
      </div>
      <div class="completed-body" id="completed-body" style="display:none;">
        <div class="grid grid-3" id="completed-grid"></div>
      </div>
    </div>
    <div id="ins-content"></div>`;
  
  let _policies = [], _payments = {}, _stats = null, _ctrl = null;
  let _view = 'card';

  const paint = () => {
    const targetYear = Number(AppState.year) || new Date().getFullYear();
    const enriched = _policies.map((p) => {
      const pays = _payments[p.id] || {};
      const completedPeriods = p.type === 'fund_insurance' ? 0 : countCompletedPeriods(pays);
      const paidTotal = getPolicyPaidTotal(pays);
      const curAnnual = getPolicyAnnualPremium(p, targetYear);
      const totalPremium = getPolicyTotalPremium(p);
      const e = { ...p, completedPeriods, _paidTotal: paidTotal, _curAnnual: curAnnual, _totalPremium: totalPremium };
      e._isCompleted = isPolicyCompleted(e);
      return e;
    });

    const totalPaid = enriched.reduce((s, p) => s + (p._paidTotal || 0), 0);
    
    _stats?.destroy?.();
    _stats = renderStats({ container: 'ins-stats', columns: 4, cards: [
      { title: `${targetYear} 年度總供款`, value: formatHKD(enriched.reduce((s, p) => s + (p._curAnnual || 0), 0)), valueClass: 'text-cyan', hint: `共 ${enriched.length} 張`, icon: 'wallet' },
      { title: '累計已供款', value: formatHKD(totalPaid), valueClass: 'text-emerald', icon: 'check-circle' },
      { title: '供款中', value: `${enriched.filter((p) => !p._isCompleted).length} 張`, icon: 'shield' },
      { title: '已供滿', value: `${enriched.filter((p) => p._isCompleted).length} 張`, valueClass: 'text-emerald', icon: 'check-circle' },
    ] });

    _paintSection(enriched.filter((p) => p._isCompleted));
    _paintActive(enriched.filter((p) => !p._isCompleted), enriched.length);
  };

  const _paintSection = (list) => {
    const s = document.getElementById('completed-section');
    const g = document.getElementById('completed-grid');
    const c = document.getElementById('completed-count');
    if (!s || !g) return;
    if (list.length === 0) { s.style.display = 'none'; return; }
    s.style.display = 'block';
    if (c) c.textContent = String(list.length);
    const html = list.map(_cardHtml).join('');
    if (g.__lastHtml === html) return;
    g.__lastHtml = html;
    g.innerHTML = html;
  };

  const _paintActive = (active, total) => {
    const el = document.getElementById('ins-content');
    if (!el) return;
    if (total === 0) {
      el.innerHTML = '<div class="glass-card"><div class="empty-state">尚無保單資料</div></div>';
      return;
    }

    if (active.length === 0) {
      el.innerHTML = '<div class="glass-card" style="text-align:center;padding:40px 20px;"><p style="color:var(--neon-emerald);">🎉 所有保單均已供滿</p></div>';
      return;
    }

    if (_view === 'table') {
      const cols = [
        { id: 'name', label: '保單名稱', type: 'text' },
        { id: 'company', label: '保險公司', type: 'text', width: 110 },
        { id: 'memberId', label: '受保人', width: 100 },
        { id: 'firstStartYear', label: '開始年', type: 'number', width: 80 },
        { id: 'annualPremium', label: '本期年繳', type: 'number', width: 110 },
        { id: 'totalPremium', label: '保單總供款', type: 'number', width: 120 },
        { id: 'paidTotal', label: '已供款', type: 'number', width: 110 },
        { id: 'progress', label: '進度', width: 120 },
      ];
      const resolvers = {
        memberId: (v) => esc(resolveName('members', v) || v || '—'),
        annualPremium: (v, r) => `<span class="mono text-cyan">${formatHKD(r._curAnnual)}</span>`,
        totalPremium: (v, r) => `<span class="mono text-magenta">${formatHKD(r._totalPremium)}</span>`,
        paidTotal: (v, r) => `<span class="mono text-emerald">${formatHKD(r._paidTotal)}</span>`,
        firstStartYear: (v, r) => `${v}-${r.firstStartMonth || '01'}`,
        progress: (v, r) => {
          if (r.type === 'fund_insurance') return '<span class="text-muted">基金保險</span>';
          const p = calcProgress(r);
          return `<div style="font-size:11px;color:var(--text-muted);">${r.completedPeriods || 0} / ${r.totalPolicyPeriods || 0} 期 (${p}%)</div><div style="height:5px;background:var(--divider);border-radius:3px;"><div style="height:100%;width:${p}%;background:var(--primary);border-radius:3px;"></div></div>`;
        },
      };
      
      const elList = document.createElement('div');
      elList.id = 'ins-list-table';
      el.innerHTML = '';
      el.appendChild(elList);

      renderTable({ container: elList, rows: active, columns: cols, resolvers,
        actions: AppState.getCanInput() ? (row) => [
          { label: '編輯', icon: 'pencil', className: 'btn-ghost', action: 'edit', onClick: () => openEntityModal('policy', 'edit', { id: row.id, allRows: _policies }) },
          { label: '刪除', icon: 'trash-2', className: 'btn-danger', action: 'del', onClick: async () => {
            const ok = await openConfirm(`確定刪除保單「${row.name}」？`, { okText: '刪除', okClass: 'btn-danger' });
            if (!ok) return;
            try { await removeEntity('policy', row.id); toast('✅ 已刪除', 'success'); } catch (e) { toast(e.message, 'error'); }
          } },
        ] : () => [],
      });
    } else {
      el.innerHTML = `<div class="grid grid-3">${active.map((p) => `<div class="glass-card policy-card">${_cardHtml(p)}</div>`).join('')}</div>`;
    }
  };

  const _cardHtml = (p) => {
    const holderId = p.policyHolderId || p.memberId || '';
    const holder = resolveName('members', holderId) || holderId || '—';
    const insured = resolveName('members', p.memberId) || p.memberId || '—';
    const isFund = p.type === 'fund_insurance';
    const total = p.totalPolicyPeriods || 0;
    const done = p.completedPeriods || 0;
    const pct = calcProgress(p);
    const canInput = AppState.getCanInput();

    const paidTotal = p._paidTotal || 0;
    const totalPremium = p._totalPremium || 0;
    const remaining = Math.max(0, totalPremium - paidTotal);

    const actions = canInput ? `<div class="policy-actions"><button type="button" class="btn btn-sm btn-ghost" data-action="edit-policy" data-id="${p.id}"><i data-lucide="pencil" style="width:14px;height:14px;"></i> 編輯</button><button type="button" class="btn btn-sm btn-danger" data-action="delete-policy" data-id="${p.id}"><i data-lucide="trash-2" style="width:14px;height:14px;"></i> 刪除</button></div>` : '';
    const progressHtml = isFund ? '' : `<div class="policy-progress" style="margin-top:12px;"><div class="policy-progress-text"><span>整體供款進度</span><span>${done} / ${total} 期 (${pct}%)</span></div><div class="progress"><div class="progress-bar" style="width:${pct}%;"></div></div></div>`;

    return `<div class="policy-header"><div><div class="policy-name">${esc(p.name || '')}</div><div class="policy-company">${esc(p.company || '')} · ${isFund ? '基金保險' : '普通保險'}</div></div></div>
      <div class="policy-info-grid">
        <div class="policy-info-item"><span class="policy-info-label">保單持有人</span><span class="policy-info-value">${esc(holder)}</span></div>
        <div class="policy-info-item"><span class="policy-info-label">受保人</span><span class="policy-info-value">${esc(insured)}</span></div>
      </div>
      <div class="policy-info-grid" style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,0.08);">
        <div class="policy-info-item"><span class="policy-info-label">本期年繳</span><span class="policy-info-value text-cyan">${formatHKD(p._curAnnual)}</span></div>
        <div class="policy-info-item"><span class="policy-info-label">保單總供款</span><span class="policy-info-value text-magenta">${formatHKD(totalPremium)}</span></div>
      </div>
      <div class="policy-info-grid" style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,0.08);">
        <div class="policy-info-item"><span class="policy-info-label">已供款總額</span><span class="policy-info-value text-emerald" style="font-weight:700;">${formatHKD(paidTotal)}</span></div>
        <div class="policy-info-item"><span class="policy-info-label">剩餘供款</span><span class="policy-info-value">${formatHKD(remaining)}</span></div>
      </div>${progressHtml}${actions}`;
  };

  const _clickHandler = async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn || !AppState.getCanInput()) return;
    const policy = _policies.find((p) => p.id === btn.dataset.id);
    if (!policy) return;
    if (btn.dataset.action === 'edit-policy') openEntityModal('policy', 'edit', { id: policy.id, allRows: _policies });
    else if (btn.dataset.action === 'delete-policy') {
      const ok = await openConfirm(`確定刪除保單「${policy.name}」？`, { okText: '刪除', okClass: 'btn-danger' });
      if (!ok) return;
      try { await removeEntity('policy', policy.id); toast('✅ 已刪除', 'success'); } catch (e) { toast(e.message, 'error'); }
    }
  };
  document.getElementById('ins-content')?.addEventListener('click', _clickHandler);
  document.getElementById('completed-grid')?.addEventListener('click', _clickHandler);

  const headerEl = document.getElementById('completed-header');
  const bodyEl = document.getElementById('completed-body');
  const sectionEl = document.getElementById('completed-section');
  const _toggleHandler = () => {
    if (!bodyEl || !sectionEl) return;
    const open = bodyEl.style.display === 'block';
    bodyEl.style.display = open ? 'none' : 'block';
    sectionEl.classList.toggle('open', !open);
  };
  if (headerEl) headerEl.addEventListener('click', _toggleHandler);

  _ctrl = renderControls({ container: 'ins-ctrl', items: [
    { type: 'add', label: '新增保單', onClick: () => openEntityModal('policy', 'add') },
    { type: 'viewToggle', storageKey: 'insurance-view', defaultView: 'card', onChange: (v) => { _view = v; paint(); } },
    { type: 'year' }, { type: 'month' },
  ] });

  const unsubs = [
    listen('insurance_policies', (snap) => {
      _policies = Object.entries(snap.val() || {}).map(([id, x]) => ({ id, ...x }));
      paint();
    }),
    listen('insurance_payments', (snap) => {
      _payments = snap.val() || {};
      paint();
    }),
  ];

  return { destroy: () => {
    unsubs.forEach((u) => u && u());
    if (_stats) _stats.destroy?.();
    if (_ctrl) _ctrl.destroy?.();
    document.getElementById('ins-content')?.removeEventListener('click', _clickHandler);
    if (headerEl) headerEl.removeEventListener('click', _toggleHandler);
  } };
}

/* ============================================
   5. Portfolio
   ============================================ */
function pagePortfolio(root) {
  root.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">基金投資表</h1><p class="page-subtitle"></p></div><div id="pf-actions"></div></div>
    <div id="pf-stats"></div>
    <div id="pf-ctrl"></div>
    <div id="pf-ins" style="margin-bottom:20px;"></div>
    <div id="pf-std"></div>`;
  let _funds = [], _policies = [], _stats = null, _ctrl = null;

  const paint = () => {
    const ym = AppState.getYearMonth();
    const y = ym.year || String(new Date().getFullYear());
    const m = ym.month === 'all' ? String(new Date().getMonth() + 1).padStart(2, '0') : ym.month;
    const costMaps = {};
    _policies.forEach((p) => { costMaps[p.id] = getFundCostMap(p, _funds, y, m); });
    let cost = 0, value = 0;
    _funds.forEach((f) => {
      if (f.type === 'insurance') {
        const p = findPolicyByFund(f, _policies);
        cost += (p && costMaps[p.id]) ? (costMaps[p.id][f.id] || 0) : Number(f.cost) || 0;
      } else cost += Number(f.cost) || 0;
      value += Number(f.currentValue) || 0;
    });
    const pnl = value - cost;
    const pct = cost > 0 ? ((pnl / cost) * 100).toFixed(2) : '0.00';
    _stats?.destroy?.();
    _stats = renderStats({ container: 'pf-stats', columns: 3, cards: [
      { title: '總投入成本', value: formatHKD(cost), hint: `共 ${_funds.length} 筆`, icon: 'wallet' },
      { title: '總現時價值', value: formatHKD(value), valueClass: 'text-emerald', icon: 'line-chart' },
      { title: '總帳面盈虧', value: `${pnl >= 0 ? '+' : ''}${formatHKD(pnl)} (${pct}%)`, valueClass: pnl >= 0 ? 'text-emerald' : 'text-red', icon: pnl >= 0 ? 'trending-up' : 'trending-down' },
    ] });
    paintList('pf-ins', _funds.filter((f) => f.type === 'insurance'), costMaps);
    paintList('pf-std', _funds.filter((f) => f.type !== 'insurance'), costMaps);
  };

  const paintList = (containerId, list, costMaps) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!list.length) { el.innerHTML = `<div class="glass-card"><div class="empty-state">${containerId === 'pf-ins' ? '尚無保險基金' : '尚無獨立基金'}</div></div>`; return; }
    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
      ${list.map((f) => {
        const p = f.type === 'insurance' ? findPolicyByFund(f, _policies) : null;
        const c = (p && costMaps[p.id]) ? (costMaps[p.id][f.id] || 0) : (Number(f.cost) || 0);
        const v = Number(f.currentValue) || 0;
        const pnl = v - c;
        const pnlPct = c > 0 ? ((pnl / c) * 100).toFixed(2) : '0.00';
        return `<div class="glass-card" style="padding:16px;">
          <div style="font-size:15px;font-weight:700;margin-bottom:6px;">${esc(f.name || '')}</div>
          ${p ? `<div style="font-size:11px;color:var(--accent-warm);margin-bottom:10px;">${esc(p.name || '')}</div>` : ''}
          <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-muted);font-size:11px;">投入成本</span><span class="mono">${formatHKD(c)}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-muted);font-size:11px;">現時價值</span><span class="mono text-emerald">${formatHKD(v)}</span></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-muted);font-size:11px;">盈虧</span><span class="mono ${pnl >= 0 ? 'text-emerald' : 'text-red'}">${pnl >= 0 ? '+' : ''}${formatHKD(pnl)} (${pnlPct}%)</span></div>
          </div>
          <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
            <button type="button" class="btn btn-sm btn-primary" data-snap-id="${f.id}" data-snap-name="${esc(f.name)}">快照</button>
            <button type="button" class="btn btn-sm btn-ghost" data-hist-id="${f.id}" data-hist-name="${esc(f.name)}">歷史</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;

    el.querySelectorAll('[data-snap-id]').forEach((btn) => {
      btn.addEventListener('click', () => openSnapshotModal(btn.dataset.snapId, btn.dataset.snapName, paint));
    });
    el.querySelectorAll('[data-hist-id]').forEach((btn) => {
      btn.addEventListener('click', () => openHistoryModal(btn.dataset.histId, btn.dataset.histName, paint));
    });
  };

  const unsubs = [
    listen('funds', (snap) => { _funds = Object.entries(snap.val() || {}).map(([id, x]) => ({ id, ...x })); paint(); }),
    listen('insurance_policies', (snap) => { _policies = Object.entries(snap.val() || {}).map(([id, x]) => ({ id, ...x })); paint(); }),
  ];

  _ctrl = renderControls({ container: 'pf-ctrl', items: [
    { type: 'add', label: '新增基金', onClick: () => openEntityModal('fund', 'add') },
    { type: 'year' }, { type: 'month' },
  ] });
  return { destroy: () => { unsubs.forEach((u) => u && u()); _stats?.destroy?.(); _ctrl?.destroy?.(); } };
}

async function openSnapshotModal(fundId, fundName, onDone) {
  const MODAL_ID = 'snap-modal';
  document.getElementById(MODAL_ID)?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = MODAL_ID;
  overlay.innerHTML = `<div class="modal" style="max-width:480px;"><h2 class="modal-title">輸入快照 - ${esc(fundName)}</h2><div id="${MODAL_ID}-form"></div></div>`;
  document.body.appendChild(overlay);

  buildForm({
    containerId: `${MODAL_ID}-form`,
    fields: [
      { type: 'text', id: 'dateKey', label: '估值日（YYYY-MM-DD）', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
      { type: 'number', id: 'shares', label: '單位數目', required: true, min: 0, defaultValue: 0 },
      { type: 'number', id: 'nav', label: '基金價格 (USD)', required: true, min: 0, defaultValue: 0 },
    ],
    submitText: '儲存', showCancel: true, cancelText: '取消',
    onSubmit: async (data) => {
      try {
        await saveFundSnapshot(fundId, data.dateKey, { shares: data.shares, nav: data.nav });
        toast('✅ 已儲存快照', 'success');
        closeModal(overlay); overlay.remove();
        if (onDone) onDone();
      } catch (e) { toast('儲存失敗：' + e.message, 'error'); }
    },
    onCancel: () => { closeModal(overlay); overlay.remove(); },
  });
  openModal(overlay);
}

async function openHistoryModal(fundId, fundName, onDone) {
  const snaps = await getFundSnapshotListOnce(fundId);
  const MODAL_ID = 'hist-modal';
  document.getElementById(MODAL_ID)?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = MODAL_ID;
  overlay.innerHTML = `<div class="modal" style="max-width:600px;"><h2 class="modal-title">歷史快照 - ${esc(fundName)}</h2>
    <div style="max-height:50vh;overflow-y:auto;margin-bottom:16px;">
      <table class="data-table"><thead><tr><th>日期</th><th>單位數</th><th>價格</th><th>操作</th></tr></thead>
      <tbody>
        ${snaps.map((s) => `<tr>
          <td>${esc(s.dateKey)}</td><td>${s.shares}</td><td>${s.nav}</td>
          <td><button type="button" class="btn btn-sm btn-danger" data-del-date="${s.dateKey}" data-del-raw="${s._rawPath}">刪除</button></td>
        </tr>`).join('')}
      </tbody></table>
    </div>
    <div style="text-align:right;"><button type="button" class="btn btn-ghost" id="hist-close">關閉</button></div>
  </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('#hist-close')?.addEventListener('click', () => { closeModal(overlay); overlay.remove(); });
  overlay.querySelectorAll('[data-del-date]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ok = await openConfirm(`確定刪除 ${btn.dataset.delDate} 快照？`, { okText: '刪除', okClass: 'btn-danger' });
      if (!ok) return;
      try {
        await removeFundSnapshot(fundId, btn.dataset.delDate, btn.dataset.delRaw);
        toast('✅ 已刪除', 'success');
        closeModal(overlay); overlay.remove();
        if (onDone) onDone();
      } catch (e) { toast('刪除失敗：' + e.message, 'error'); }
    });
  });

  openModal(overlay);
}

/* ============================================
   6. Settlements
   ============================================ */
function pageSettlements(root) {
  root.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">結算清單</h1><p class="page-subtitle"></p></div></div>
    <div id="st-stats"></div>
    <div id="st-ctrl"></div>
    <div id="st-content"></div>`;
  let _stats = null, _ctrl = null, _expUnsub = null;
  let _memberExpenses = [], _insuranceRows = [];

  const reload = async () => {
    const { year, month } = AppState.getYearMonth();
    const y = String(year);
    const m = month === 'all' ? null : month;

    if (_expUnsub) { try { _expUnsub(); } catch (e) {} }
    _expUnsub = listen(`expenses/${y}/${m || '01'}/member_expenses`, (snap) => {
      _memberExpenses = [];
      Object.entries(snap.val() || {}).forEach(([mid, items]) => {
        Object.entries(items || {}).forEach(([id, e]) => _memberExpenses.push({ id, memberId: mid, ...e }));
      });
      _recompute();
    });

    try {
      const policies = getList('insurance_policies');
      const rows = [];
      for (const p of policies) {
        const pays = await getOnce(`insurance_payments/${p.id}/${y}/${m || '01'}`) || {};
        const holder = p.policyHolderId || p.memberId || '';
        if (pays && Object.keys(pays).length) {
          rows.push({ policyId: p.id, policyName: p.name, policyHolderId: holder, memberId: p.memberId, status: pays.status || '', amount: Number(pays.amount) || 0, paymentMode: p.paymentMode || 'direct', advanceHolderId: p.advanceHolderId || '' });
        } else {
          const est = resolveMonthlyAmount(p, y, m || '01') || 0;
          rows.push({ policyId: p.id, policyName: p.name, policyHolderId: holder, memberId: p.memberId, status: '', amount: est, paymentMode: p.paymentMode || 'direct', advanceHolderId: p.advanceHolderId || '' });
        }
      }
      _insuranceRows = rows;
    } catch (e) { console.warn('[settlements] 載入保險失敗', e); }
    _recompute();
  };

  const _recompute = () => {
    const { year, month } = AppState.getYearMonth();
    const merged = mergeSettlementData({ memberExpenses: _memberExpenses, insuranceRows: _insuranceRows, year, month });
    const pending = merged.filter((r) => !r.isDone);
    const done = merged.filter((r) => r.isDone);
    
    _stats?.destroy?.();
    _stats = renderStats({ container: 'st-stats', columns: 3, cards: [
      { title: '待處理', value: formatHKD(pending.reduce((s, r) => s + r.amount, 0)), valueClass: 'text-magenta', hint: `${pending.length} 筆`, icon: 'clock' },
      { title: '已處理', value: formatHKD(done.reduce((s, r) => s + r.amount, 0)), valueClass: 'text-emerald', hint: `${done.length} 筆`, icon: 'check-circle' },
      { title: '總計', value: formatHKD(merged.reduce((s, r) => s + r.amount, 0)), valueClass: 'text-cyan', hint: `${merged.length} 筆`, icon: 'calculator' },
    ] });

    const el = document.getElementById('st-content');
    if (!el) return;
    renderTable({ container: el, rows: merged,
      columns: [
        { id: 'source', label: '來源', width: 90 },
        { id: 'name', label: '項目名稱', type: 'text' },
        { id: 'memberId', label: '成員', width: 90 },
        { id: 'amount', label: '金額', type: 'number', width: 110 },
        { id: 'status', label: '狀態', width: 120 },
      ],
      resolvers: {
        source: (_, r) => `<span class="badge ${r.source === 'insurance' ? 'badge-success' : 'badge-info'}">${esc(r.sourceLabel)}</span>`,
        memberId: (v) => v === 'shared' ? '🏠 家庭' : esc(resolveName('members', v) || v || '—'),
        amount: (v) => formatHKD(v),
        status: (v, r) => `<span class="badge ${statusBadgeClass(v)}">${esc(statusLabel(v, { source: r.source }))}</span>`,
      },
      actions: AppState.getCanInput() ? (row) => {
        if (row.source === 'insurance') {
          return row.isDone
            ? [{ label: '取消扣款', icon: 'rotate-ccw', className: 'btn-ghost', action: 'unsync', onClick: () => _onUnsync(row) }]
            : [{ label: '確認扣款', icon: 'check', className: 'btn-primary', action: 'sync', onClick: () => _onSync(row) }];
        }
        return [{ label: '刪除', icon: 'trash-2', className: 'btn-danger', action: 'del', onClick: async () => {
          const ok = await openConfirm(`確定刪除「${row.name}」？`, { okText: '刪除', okClass: 'btn-danger' });
          if (!ok) return;
          try {
            await removeItem(`expenses/${row.year}/${row.month}/member_expenses/${row._ref.memberId}`, row._ref.expenseId);
            toast('✅ 已刪除', 'success');
          } catch (e) { toast(e.message, 'error'); }
        } }];
      } : () => [],
    });
  };

  const _onSync = async (row) => {
    try {
      await api.insuranceSync({
        policyId: row._ref.policyId, memberId: row._ref.memberId || row.memberId,
        policyName: row.name, monthlyAverage: row.amount, year: row.year, month: row.month,
        bankId: '', txnId: '', paymentMode: row.paymentMode || 'direct', advanceHolderId: row.advanceHolderId || '',
      });
      toast('✅ 已確認扣款', 'success');
      reload();
    } catch (e) { toast('確認失敗：' + e.message, 'error'); }
  };
  
  const _onUnsync = async (row) => {
    const ok = await openConfirm(`確定取消「${row.name}」本月扣款？`, { okText: '取消扣款', okClass: 'btn-danger' });
    if (!ok) return;
    try {
      await api.insuranceUnsync({ policyId: row._ref.policyId, memberId: row._ref.memberId || row.memberId, year: row.year, month: row.month, amount: row.amount, paymentMode: row.paymentMode || 'direct', advanceHolderId: row.advanceHolderId || '' });
      toast('✅ 已取消扣款', 'success');
      reload();
    } catch (e) { toast('取消失敗：' + e.message, 'error'); }
  };

  _ctrl = renderControls({ container: 'st-ctrl', items: [{ type: 'year' }, { type: 'month', includeAll: true }] });
  reload();
  return { destroy: () => { _expUnsub?.(); _stats?.destroy?.(); _ctrl?.destroy?.(); } };
}

/* ============================================
   7. 註冊
   ============================================ */
import './app-pages-reports.js';

registerPage('/dashboard', pageDashboard);
registerPage('/input-center', pageInputCenter);
registerPage('/code-list', pageCodeList);
registerPage('/insurance', pageInsurance);
registerPage('/portfolio', pagePortfolio);
registerPage('/settlements', pageSettlements);

export { pageDashboard, pageInputCenter, pageCodeList, pageInsurance, pagePortfolio, pageSettlements };

/* ═══ EOF ═══
F: js/app-pages-core.js
V: 1792720005
W: webapp-20261023-001#11
═══ */
