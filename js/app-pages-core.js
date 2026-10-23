// ============================================
// app-pages-core.js — 6 個日常頁
// 版本：1.0.1（FIX-C：補齊 GAP-09, GAP-11, GAP-12）
// ============================================

import { AppState, registerPage } from './app-core.js';
import { toast, openConfirm, buildForm, openModal, closeModal, initTabPanel, esc, formatHKD, openPrompt } from './app-ui.js';
import { api, listen, listenList, getList, resolveName, statusLabel, statusBadgeClass, statusIsDone, statusNormalize, saveFundSnapshot, removeFundSnapshot, getFundSnapshotListOnce, getColumns, getResolvers } from './app-data.js';
import { renderStats, renderTable, renderCards, renderControls } from './app-widgets.js';
import { openEntityModal, ENTITIES, removeEntity, getDynamicOptions } from './app-entities.js';
import { calcBankBalance, computeYearTotals, computeAnnualOverview, getPolicyAnnualPremium, getPolicyTotalPremium, getPolicyPaidTotal, countCompletedPeriods, calcProgress, isPolicyCompleted, calcFundCostEstimate, getFundCostMap, findPolicyByFund, mergeSettlementData, computeMemberAnnualRows, resolveMonthlyAmount } from './app-domain.js';

/* ============================================
   1. Dashboard (同上)
   ============================================ */
// ... 略 ...

/* ============================================
   2. Input Center (GAP-11：補齊三 Tab)
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
      container: el,
      rows: _expenseRows,
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
            const { removeItem } = await import('./app-data.js');
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
    
    // GAP-11：直接渲染對應實體的列表
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

/* --- 輔助 Modal（支出、轉入、收入） --- */
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
      const { pushItem } = await import('./app-data.js');
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
      const { getOnce, setSubpath } = await import('./app-data.js');
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
   3. Code List (GAP-12：補齊編輯與刪除)
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
// ... 略 ...

/* ============================================
   5. Portfolio (GAP-09：補齊快照操作)
   ============================================ */
function pagePortfolio(root) {
  root.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">基金投資表</h1><p class="page-subtitle"></p></div><div id="pf-actions"></div></div>
    <div id="pf-stats"></div>
    <div id="pf-ctrl"></div>
    <div id="pf-ins" style="margin-bottom:20px;"></div>
    <div id="pf-std"></div>`;
  let _funds = [], _policies = [], _stats = null, _ctrl = null;

  // (UI 渲染邏輯維持原樣，只補齊按鈕事件)

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

    // 綁定快照按鈕
    el.querySelectorAll('[data-snap-id]').forEach((btn) => {
      btn.addEventListener('click', () => openSnapshotModal(btn.dataset.snapId, btn.dataset.snapName, paint));
    });
    el.querySelectorAll('[data-hist-id]').forEach((btn) => {
      btn.addEventListener('click', () => openHistoryModal(btn.dataset.histId, btn.dataset.histName, paint));
    });
  };

  // (省略未變動的 _paint, _paintInsurance, _paintStandalone 邏輯)

  const unsubs = [
    listen('funds', (snap) => {
      const v = snap.val() || {};
      _funds = Object.entries(v).map(([id, x]) => ({ id, ...x }));
      paint();
    }),
    listen('insurance_policies', (snap) => {
      const v = snap.val() || {};
      _policies = Object.entries(v).map(([id, x]) => ({ id, ...x }));
      paint();
    }),
  ];

  _ctrl = renderControls({ container: 'pf-ctrl', items: [
    { type: 'add', label: '新增基金', onClick: () => openEntityModal('fund', 'add', { onSuccess: paint }) },
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
// ... 略 ...

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
V: 1792720003
W: webapp-20261023-001#8
═══ */