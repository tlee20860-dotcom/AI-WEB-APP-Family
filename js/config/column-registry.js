// column-registry.js — 表格欄位 SSOT（v103.0.35）
// v103.0.35（B34-4）：
//   ✅ 加 codeList 欄位定義
// v103.0.34（B29-1b）：既有
// ============================================
import { formatHKD, formatNumber } from '../lib/format.js';
import { esc as escapeHtml } from '../lib/dom.js';
import { resolveName } from './entity-registry.js';
import { BANK_TXN_TYPE_LABELS, BANK_TXN_CATEGORY_LABELS, BANK_TXN_CATEGORY_BADGES, BANK_ACCOUNT_TYPE_LABELS, RESERVED_IDS } from './constants.js';
import { badgeClass as statusBadgeClass, label as statusLabel } from './status-registry.js';

/* ============================================
   COLUMNS 定義
   ============================================ */
export const COLUMNS = {
  members: [
    { id: 'name', label: '名稱', defaultVisible: true, defaultWidth: 160, sortable: true },
    { id: 'role', label: '角色', defaultVisible: true, defaultWidth: 120, sortable: true, filterable: true },
    { id: 'order', label: '排序', defaultVisible: true, defaultWidth: 80, type: 'number', sortable: true },
  ],
  banks: [
    { id: 'name', label: '名稱', defaultVisible: true, defaultWidth: 160, sortable: true },
    { id: 'order', label: '排序', defaultVisible: true, defaultWidth: 80, type: 'number', sortable: true },
  ],
  bankAccounts: [
    { id: 'order', label: '排序', defaultVisible: true, defaultWidth: 60, sortable: true },
    { id: 'name', label: '名稱', defaultVisible: true, defaultWidth: 160, sortable: true },
    { id: 'type', label: '類型', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true, filterOptions: [
      { value: 'family', label: '家庭帳號' },
      { value: 'personal', label: '個人帳號' },
    ]},
    { id: 'initialBalance', label: '初始餘額', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'initialYM', label: '初始年月', defaultVisible: true, defaultWidth: 110 },
  ],
  categories: [
    { id: 'name', label: '名稱', defaultVisible: true, defaultWidth: 200, sortable: true },
    { id: 'order', label: '排序', defaultVisible: true, defaultWidth: 80, type: 'number', sortable: true },
  ],
  items: [
    { id: 'name', label: '名稱', defaultVisible: true, defaultWidth: 200, sortable: true },
    { id: 'categoryId', label: '所屬類別', defaultVisible: true, defaultWidth: 140, sortable: true, filterable: true },
  ],
  payments: [
    { id: 'name', label: '名稱', defaultVisible: true, defaultWidth: 160, sortable: true },
    { id: 'order', label: '排序', defaultVisible: true, defaultWidth: 80, type: 'number', sortable: true },
  ],
  statuses: [
    { id: 'name', label: '名稱', defaultVisible: true, defaultWidth: 140, sortable: true },
    { id: 'category', label: '所屬類別', defaultVisible: true, defaultWidth: 110, sortable: true, filterable: true },
    { id: 'isDone', label: '已完成', defaultVisible: true, defaultWidth: 90, sortable: true },
    { id: 'order', label: '排序', defaultVisible: true, defaultWidth: 70, type: 'number', sortable: true },
  ],
  companies: [
    { id: 'name', label: '名稱', defaultVisible: true, defaultWidth: 160, sortable: true },
  ],
  funds: [
    { id: 'name', label: '基金名稱', defaultVisible: true, defaultWidth: 200, sortable: true },
    { id: 'typeLabel', label: '類型', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true, filterOptions: [
      { value: 'insurance', label: '保險' },
      { value: 'standalone', label: '獨立' },
    ]},
    { id: 'cost', label: '投入成本', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'currentValue', label: '現時價值', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'pnl', label: '盈虧', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'units', label: '單位數', defaultVisible: true, defaultWidth: 100, type: 'number', sortable: true },
    { id: 'note', label: '備註', defaultVisible: false, defaultWidth: 180 },
  ],
  fundSnapshots: [
    { id: 'yearMonth', label: '年月', defaultVisible: true, defaultWidth: 90, sortable: true },
    { id: 'shares', label: '股數', defaultVisible: true, defaultWidth: 100, type: 'number', sortable: true },
    { id: 'nav', label: '股價', defaultVisible: true, defaultWidth: 100, type: 'number', sortable: true },
    { id: 'value', label: '現值', defaultVisible: true, defaultWidth: 110, type: 'number', sortable: true },
    { id: 'cumulativeCost', label: '累積供款', defaultVisible: true, defaultWidth: 110, type: 'number', sortable: true },
    { id: 'pnl', label: '盈虧', defaultVisible: true, defaultWidth: 110, type: 'number', sortable: true },
  ],
  insurance: [
    { id: 'name', label: '保單名稱', defaultVisible: true, defaultWidth: 200, sortable: true },
    { id: 'company', label: '保險公司', defaultVisible: true, defaultWidth: 120, sortable: true, filterable: true },
    { id: 'policyHolder', label: '持有人', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true },
    { id: 'member', label: '受保人', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true },
    { id: 'startDate', label: '開始日期', defaultVisible: true, defaultWidth: 110, sortable: true },
    { id: 'annualPremium', label: '本期年繳', defaultVisible: true, defaultWidth: 120, type: 'number', sortable: true },
    { id: 'totalPremium', label: '保單總供款', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'paidTotal', label: '已供款總額', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'progress', label: '進度', defaultVisible: true, defaultWidth: 140, sortable: true },
  ],
  insurancePolicies: [
    { id: 'name', label: '保單名稱', defaultVisible: true, defaultWidth: 200, sortable: true },
    { id: 'company', label: '保險公司', defaultVisible: true, defaultWidth: 120, sortable: true, filterable: true },
    { id: 'holderName', label: '持有人', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true },
    { id: 'insuredName', label: '受保人', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true },
    { id: 'annualPremium', label: '本期年繳', defaultVisible: true, defaultWidth: 120, type: 'number', sortable: true },
    { id: 'totalPremium', label: '保單總供款', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'progressText', label: '進度', defaultVisible: true, defaultWidth: 160, sortable: true },
  ],
  settlements: [
    { id: 'source', label: '來源', defaultVisible: true, defaultWidth: 90, sortable: true, filterable: true, filterOptions: [
      { value: 'personal', label: '🏷 個人支出' },
      { value: 'insurance', label: '🛡 保險扣款' },
    ]},
    { id: 'yearMonth', label: '年月', defaultVisible: true, defaultWidth: 90, sortable: true },
    { id: 'member', label: '成員', defaultVisible: true, defaultWidth: 90, sortable: true, filterable: true },
    { id: 'name', label: '項目名稱', defaultVisible: true, defaultWidth: 200, sortable: true },
    { id: 'amount', label: '金額', defaultVisible: true, defaultWidth: 110, type: 'number', sortable: true },
    { id: 'date', label: '日期', defaultVisible: true, defaultWidth: 100, sortable: true },
    { id: 'status', label: '狀態', defaultVisible: true, defaultWidth: 140, sortable: true, filterable: true },
  ],
  bankTransactions: [
    { id: 'date', label: '日期', defaultVisible: true, defaultWidth: 110, sortable: true },
    { id: 'bankName', label: '銀行', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true },
    { id: 'typeLabel', label: '類型', defaultVisible: true, defaultWidth: 90, sortable: true, filterable: true, filterOptions: [
      { value: 'in', label: '入帳' },
      { value: 'out', label: '出帳' },
      { value: 'transfer', label: '內部轉帳' },
    ]},
    { id: 'catLabel', label: '分類', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true, filterOptions: [
      { value: 'contribution', label: '家用轉入' },
      { value: 'expense', label: '支出' },
      { value: 'insurance', label: '保險' },
      { value: 'reimbursement', label: '代墊報銷' },
      { value: 'manual', label: '手動' },
    ]},
    { id: 'memberName', label: '成員', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true },
    { id: 'amount', label: '金額', defaultVisible: true, defaultWidth: 120, type: 'number', sortable: true },
    { id: 'note', label: '備註', defaultVisible: true, defaultWidth: 180 },
  ],
  recentExpense: [
    { id: 'date', label: '日期', defaultVisible: true, defaultWidth: 100, sortable: true },
    { id: 'memberName', label: '成員', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true },
    { id: 'name', label: '項目名稱', defaultVisible: true, defaultWidth: 200, sortable: true },
    { id: 'amount', label: '金額', defaultVisible: true, defaultWidth: 110, type: 'number', sortable: true },
    { id: 'status', label: '狀態', defaultVisible: true, defaultWidth: 120, sortable: true, filterable: true },
  ],
  memberReport: [
    { id: 'name', label: '成員', defaultVisible: true, defaultWidth: 140, sortable: true },
    { id: 'income', label: '家用轉入', defaultVisible: true, defaultWidth: 140, type: 'number', sortable: true },
    { id: 'personalIncome', label: '個人收入', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'expense', label: '支出', defaultVisible: true, defaultWidth: 140, type: 'number', sortable: true },
    { id: 'insurance', label: '保險', defaultVisible: true, defaultWidth: 140, type: 'number', sortable: true },
    { id: 'net', label: '淨額', defaultVisible: true, defaultWidth: 140, type: 'number', sortable: true },
  ],
  dashboardAnnual: [
    { id: 'year', label: '年度', defaultVisible: true, defaultWidth: 100, sortable: true },
    { id: 'totalIncome', label: '家庭收入', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'totalExpense', label: '總支出', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'insurance', label: '保險平攤', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'net', label: '淨餘額', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'avg', label: '每月平均', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
  ],
  annualSummary: [
    { id: 'name', label: '成員', defaultVisible: true, defaultWidth: 100, sortable: true },
    { id: 'income', label: '家用轉入', defaultVisible: true, defaultWidth: 120, type: 'number', sortable: true },
    { id: 'personalIncome', label: '個人收入', defaultVisible: true, defaultWidth: 120, type: 'number', sortable: true },
    { id: 'expense', label: '總支出', defaultVisible: true, defaultWidth: 120, type: 'number', sortable: true },
    { id: 'net', label: '淨結餘', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
  ],
  annualMonthly: [
    { id: 'date', label: '日期', defaultVisible: true, defaultWidth: 110, sortable: true },
    { id: 'memberName', label: '成員', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true },
    { id: 'categoryName', label: '類別', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true },
    { id: 'itemName', label: '項目', defaultVisible: true, defaultWidth: 120, sortable: true },
    { id: 'name', label: '名稱', defaultVisible: true, defaultWidth: 180, sortable: true },
    { id: 'amount', label: '金額', defaultVisible: true, defaultWidth: 110, type: 'number', sortable: true },
    { id: 'status', label: '狀態', defaultVisible: true, defaultWidth: 120, sortable: true, filterable: true },
  ],

  /* 🆕 v103.0.35（B34-4）：編號對照清單（code-list.html） */
  codeList: [
    { id: 'code', label: '編號', defaultVisible: true, defaultWidth: 180, sortable: true },
    { id: 'entityLabel', label: '類型', defaultVisible: true, defaultWidth: 120, sortable: true, filterable: true, filterOptions: [
      { value: '成員',     label: '成員' },
      { value: '銀行',     label: '銀行' },
      { value: '支出類別', label: '支出類別' },
      { value: '支出項目', label: '支出項目' },
      { value: '支付方式', label: '支付方式' },
      { value: '保險公司', label: '保險公司' },
      { value: '保單',     label: '保單' },
      { value: '基金',     label: '基金' },
      { value: '銀行帳號', label: '銀行帳號' },
    ]},
    { id: 'name', label: '名稱', defaultVisible: true, defaultWidth: 240, sortable: true },
  ],
};

/* ============================================
   RESOLVERS
   ============================================ */
export const RESOLVERS = {
  members: {
    role: (v) => escapeHtml(String(v || '—')),
    order: (v) => formatNumber(v),
  },
  banks: { order: (v) => formatNumber(v) },
  bankAccounts: {
    name: (v) => escapeHtml(v || '—'),
    type: (v) => {
      const l = BANK_ACCOUNT_TYPE_LABELS[v] || v || '—';
      const c = v === 'personal' ? 'badge-muted' : 'badge-info';
      return `<span class="badge ${c}">${escapeHtml(l)}</span>`;
    },
    initialBalance: (v) => `<span class="mono">${formatHKD(v)}</span>`,
    initialYM: (_, r) => `<span class="mono" style="font-size:12px;color:var(--text-muted);">${escapeHtml(r.initialYear || '—')}-${escapeHtml(r.initialMonth || '—')}</span>`,
  },
  categories: { order: (v) => formatNumber(v) },
  items: {
    categoryId: (v) => {
      if (!v) return '<span class="badge badge-muted">—</span>';
      const n = resolveName('categories', v) || v;
      return `<span class="badge badge-info">${escapeHtml(n)}</span>`;
    },
  },
  payments: { order: (v) => formatNumber(v) },
  statuses: {
    category: (v) => { const m = { personal: '個人支出', fixed: '固定支出', insurance: '保險' }; return escapeHtml(m[v] || v || '—'); },
    isDone: (v) => v ? '<span class="badge badge-success">是</span>' : '<span class="badge badge-muted">否</span>',
    order: (v) => formatNumber(v),
  },
  companies: { name: (v) => escapeHtml(v || '—') },
  funds: {
    name: (v) => escapeHtml(v || '（未命名）'),
    typeLabel: (v) => v === 'insurance' ? '<span class="badge badge-magenta">保險</span>' : '<span class="badge badge-info">獨立</span>',
    cost: (v) => `<span class="mono">${formatHKD(v)}</span>`,
    currentValue: (v) => `<span class="mono text-emerald">${formatHKD(v)}</span>`,
    pnl: (v, r) => {
      const p = (Number(r.currentValue) || 0) - (Number(r.cost) || 0);
      return `<span class="mono ${p >= 0 ? 'text-emerald' : 'text-red'}">${p >= 0 ? '+' : ''}${formatHKD(p)}</span>`;
    },
    units: (v) => `<span class="mono">${v || '—'}</span>`,
    note: (v) => escapeHtml(v || '—'),
  },
  fundSnapshots: {
    yearMonth: (_, r) => `${escapeHtml(r.year)}-${escapeHtml(r.month)}`,
    shares: (v) => `<span class="mono">${v || 0}</span>`,
    nav: (v) => `<span class="mono">${v || 0}</span>`,
    value: (v) => `<span class="mono text-cyan">${formatHKD(v)}</span>`,
    cumulativeCost: (v) => `<span class="mono text-magenta">${formatHKD(v)}</span>`,
    pnl: (v, r) => {
      const p = (Number(r.value) || 0) - (Number(r.cumulativeCost) || 0);
      return `<span class="mono ${p >= 0 ? 'text-emerald' : 'text-red'}">${p >= 0 ? '+' : ''}${formatHKD(p)}</span>`;
    },
  },
  insurance: {
    name: (v) => escapeHtml(v || '（未命名）'),
    company: (v) => escapeHtml(v || '—'),
    policyHolder: (v) => v ? escapeHtml(resolveName('members', v) || v) : '—',
    member: (v) => v ? escapeHtml(resolveName('members', v) || v) : '—',
    startDate: (_, r) => `<span class="mono" style="font-size:12px;">${escapeHtml(r.firstStartYear || '')}-${escapeHtml(r.firstStartMonth || '')}</span>`,
    annualPremium: (v) => `<span class="mono text-cyan">${formatHKD(v)}</span>`,
    totalPremium: (v) => `<span class="mono text-magenta">${formatHKD(v)}</span>`,
    paidTotal: (v) => `<span class="mono text-emerald">${formatHKD(v)}</span>`,
    progress: (_, r) => {
      const d = r.completedPeriods || 0;
      const t = r.totalPolicyPeriods || 0;
      const p = t > 0 ? Math.min(100, Math.round((d / t) * 100)) : 0;
      return `<div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:3px;">${d} / ${t} 期 (${p}%)</div><div class="progress" style="height:5px;"><div class="progress-bar" style="width:${p}%;"></div></div>`;
    },
  },
  insurancePolicies: {
    name: (v) => escapeHtml(v || '（未命名）'),
    company: (v) => escapeHtml(v || '—'),
    holderName: (_, r) => escapeHtml(resolveName('members', r.policyHolderId || r.memberId) || '—'),
    insuredName: (_, r) => escapeHtml(resolveName('members', r.memberId) || '—'),
    annualPremium: (v) => `<span class="mono text-cyan">${formatHKD(v)}</span>`,
    totalPremium: (v) => `<span class="mono text-magenta">${formatHKD(v)}</span>`,
    progressText: (_, r) => {
      if (r.type === 'fund_insurance') return '<span class="text-muted">基金保險</span>';
      const d = r.completedPeriods || 0;
      const t = r.totalPolicyPeriods || 0;
      const p = t > 0 ? Math.min(100, Math.round((d / t) * 100)) : 0;
      return `<div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);">${d} / ${t} 期 (${p}%)</div><div class="progress" style="height:5px;"><div class="progress-bar" style="width:${p}%;"></div></div>`;
    },
  },
  settlements: {
    source: (_, r) => {
      const m = { personal: { cls: 'badge-info', label: r.memberId === 'shared' ? '🏠 家庭' : '🏷 個人' }, insurance: { cls: 'badge-success', label: '🛡 保險' } };
      const c = m[r.source] || m.personal;
      return `<span class="badge ${c.cls}">${c.label}</span>`;
    },
    yearMonth: (_, r) => `${escapeHtml(r.year)}-${escapeHtml(r.month)}`,
    member: (_, r) => r.memberId === RESERVED_IDS.SHARED_MEMBER ? '🏠 家庭共用' : (r.memberId ? escapeHtml(resolveName('members', r.memberId) || r.memberId) : '—'),
    name: (v) => escapeHtml(v || '—'),
    amount: (v) => formatHKD(v),
    date: (v) => escapeHtml(v || '—'),
    status: (v, r) => `<span class="badge ${statusBadgeClass(v)}">${escapeHtml(statusLabel(v, { source: r.source }))}</span>`,
  },
  bankTransactions: {
    date: (v) => `<span class="mono" style="font-size:12px;">${escapeHtml(v || '—')}</span>`,
    bankName: (v) => escapeHtml(v || '—'),
    typeLabel: (_, r) => `<span class="badge ${r.type === 'in' ? 'badge-success' : (r.type === 'transfer' ? 'badge-info' : 'badge-pending')}">${escapeHtml(BANK_TXN_TYPE_LABELS[r.type] || r.type)}</span>`,
    catLabel: (_, r) => `<span class="badge ${BANK_TXN_CATEGORY_BADGES[r.category] || 'badge-muted'}">${escapeHtml(BANK_TXN_CATEGORY_LABELS[r.category] || r.category)}</span>`,
    memberName: (v) => v ? escapeHtml(resolveName('members', v) || v) : '—',
    amount: (v, r) => `<span class="mono ${r.type === 'in' ? 'text-emerald' : 'text-red'}">${r.type === 'in' ? '+' : '-'}${formatHKD(v)}</span>`,
    note: (v) => escapeHtml(v || '—'),
  },
  recentExpense: {
    date: (v) => escapeHtml(v || '—'),
    memberName: (_, r) => r.memberId === RESERVED_IDS.SHARED_MEMBER ? '🏠 家庭共用' : escapeHtml(resolveName('members', r.memberId) || r.memberId || '—'),
    name: (v) => escapeHtml(v || '（未命名）'),
    amount: (v) => formatHKD(v),
    status: (v) => `<span class="badge ${v === 'done' ? 'badge-success' : 'badge-pending'}">${escapeHtml(v || '—')}</span>`,
  },
  memberReport: {
    name: (v, r) => escapeHtml(v) + (r.isShared ? ' <span class="badge badge-muted" style="font-size:10px;">🏠</span>' : ''),
    income: (_, r) => r.isShared ? '<span class="text-muted">—</span>' : `<span class="text-emerald">${formatHKD(r.income)}</span>`,
    personalIncome: (_, r) => (r.isShared || r.personalIncome === 0) ? '<span class="text-muted">—</span>' : `<span class="text-cyan">${formatHKD(r.personalIncome)}</span>`,
    expense: (_, r) => `<span class="text-red">${formatHKD(r.expense)}</span>`,
    insurance: (_, r) => r.insurance === 0 ? '<span class="text-muted">—</span>' : `<span class="text-magenta">${formatHKD(r.insurance)}</span>`,
    net: (_, r) => r.isShared ? '<span class="text-muted">—</span>' : `<span class="${r.net >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(r.net)}</span>`,
  },
  dashboardAnnual: {
    year: (v, r) => `${v} 年${r.isCurrent ? ' <span class="badge badge-info" style="font-size:10px;">今年</span>' : ''}`,
    totalIncome: (v) => `<span class="text-emerald">${formatHKD(v)}</span>`,
    totalExpense: (v) => `<span class="text-red">${formatHKD(v)}</span>`,
    insurance: (v) => `<span class="text-magenta">${formatHKD(v)}</span>`,
    net: (v) => `<span class="${v >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(v)}</span>`,
    avg: (v) => formatHKD(v),
  },
  annualSummary: {
    name: (v, r) => r.__isTotal ? `<b style="color:var(--neon-cyan);">${escapeHtml(v)}</b>` : (r.__isShared ? `<span class="text-magenta">${escapeHtml(v)}</span>` : escapeHtml(v)),
    income: (v) => v > 0 ? `<span class="text-emerald">${formatHKD(v)}</span>` : '<span class="text-muted">—</span>',
    personalIncome: (v) => v > 0 ? `<span class="text-cyan">${formatHKD(v)}</span>` : '<span class="text-muted">—</span>',
    expense: (v) => v > 0 ? `<span class="text-red">${formatHKD(v)}</span>` : '<span class="text-muted">—</span>',
    net: (v) => `<span class="${v >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(v)}</span>`,
  },
  annualMonthly: {
    date: (v) => `<span class="mono" style="font-size:12px;">${escapeHtml(v || '—')}</span>`,
    memberName: (v) => escapeHtml(v || '—'),
    categoryName: (v) => v ? `<span class="badge badge-info">${escapeHtml(v)}</span>` : '<span class="badge badge-muted">—</span>',
    itemName: (v) => escapeHtml(v || '—'),
    name: (v) => escapeHtml(v || '—'),
    amount: (v) => `<span class="mono text-red">${formatHKD(v)}</span>`,
    status: (v) => `<span class="badge ${v && v.startsWith('已') ? 'badge-success' : 'badge-pending'}">${escapeHtml(v || '—')}</span>`,
  },

  /* 🆕 v103.0.35（B34-4）：編號對照清單 */
  codeList: {
    code: (v) => v
      ? `<span class="mono" style="font-size:12px; color:var(--neon-cyan);">${escapeHtml(v)}</span>`
      : '<span class="mono" style="font-size:12px; color:var(--text-muted);">—</span>',
    entityLabel: (v) => `<span class="badge badge-info">${escapeHtml(v || '—')}</span>`,
    name: (v) => escapeHtml(v || '（未命名）'),
  },
};

/* ============================================
   對外 API
   ============================================ */
export function getColumns(key) {
  const c = COLUMNS[key];
  if (!c) { console.warn(`[column-registry] 未知 key：${key}`); return []; }
  return c.map((x) => ({ ...x }));
}

export function getResolvers(key) {
  const r = RESOLVERS[key];
  return r ? { ...r } : {};
}

export function getColumnsWith(key, ex = []) {
  return [...getColumns(key), ...ex];
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/config/column-registry.js
   Version: 1791901480
   Batch: B34-4
   Writer: A20261013-004#094
   ═══════════════════════════════════════════ */