// ============================================
// columns.js — 表格欄位與解析器 SSOT（V2 重構版）
// 位置：config/columns.js
// 說明：集中管理表格欄位結構與專屬的顯示解析（如金額、Badge）。
//       通用格式化依賴 ui/format.js。
// ============================================

import { esc, formatHKD, formatNumber } from '../ui/format.js';
import { resolveName } from './entity-registry.js';
import { RESERVED_IDS } from './constants.js';
import { badgeClass as statusBadgeClass, label as statusLabel } from './status.js';

/* ============================================
   1. 欄位定義 (結構)
   ============================================ */
export const COLUMNS = {
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
    { id: 'member', label: '成員', defaultVisible: true, defaultWidth: 90, sortable: true },
    { id: 'name', label: '項目名稱', defaultVisible: true, defaultWidth: 200, sortable: true },
    { id: 'amount', label: '金額', defaultVisible: true, defaultWidth: 110, type: 'number', sortable: true },
    { id: 'date', label: '日期', defaultVisible: true, defaultWidth: 100, sortable: true },
    { id: 'status', label: '狀態', defaultVisible: true, defaultWidth: 140, sortable: true, filterable: true },
  ],

  bankTransactions: [
    { id: 'date', label: '日期', defaultVisible: true, defaultWidth: 110, sortable: true },
    { id: 'bankName', label: '銀行', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true },
    { id: 'typeLabel', label: '類型', defaultVisible: true, defaultWidth: 90, sortable: true, filterable: true },
    { id: 'catLabel', label: '分類', defaultVisible: true, defaultWidth: 100, sortable: true },
    { id: 'memberName', label: '成員', defaultVisible: true, defaultWidth: 100, sortable: true },
    { id: 'amount', label: '金額', defaultVisible: true, defaultWidth: 120, type: 'number', sortable: true },
    { id: 'note', label: '備註', defaultVisible: true, defaultWidth: 180 },
  ],

  codeList: [
    { id: 'code', label: '編號', defaultVisible: true, defaultWidth: 180, sortable: true },
    { id: 'entityLabel', label: '類型', defaultVisible: true, defaultWidth: 120, sortable: true, filterable: true },
    { id: 'name', label: '名稱', defaultVisible: true, defaultWidth: 240, sortable: true },
  ],

  dashboardAnnual: [
    { id: 'year', label: '年度', defaultVisible: true, defaultWidth: 100, sortable: true },
    { id: 'totalIncome', label: '家庭收入', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'totalExpense', label: '總支出', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'insurance', label: '保險平攤', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
    { id: 'net', label: '淨餘額', defaultVisible: true, defaultWidth: 130, type: 'number', sortable: true },
  ],

  /* 🆕 最近支出 (Input Center) */
  recentExpense: [
    { id: 'date', label: '日期', defaultVisible: true, defaultWidth: 100, sortable: true },
    { id: 'memberName', label: '成員', defaultVisible: true, defaultWidth: 100, sortable: true, filterable: true },
    { id: 'name', label: '項目名稱', defaultVisible: true, defaultWidth: 200, sortable: true },
    { id: 'amount', label: '金額', defaultVisible: true, defaultWidth: 110, type: 'number', sortable: true },
    { id: 'status', label: '狀態', defaultVisible: true, defaultWidth: 120, sortable: true, filterable: true },
  ],
};

/* ============================================
   2. 顯示解析器 (Renderers)
   ============================================ */
export const RESOLVERS = {
  bankAccounts: {
    name: (v) => esc(v || '—'),
    type: (v) => {
      const l = v === 'personal' ? '個人' : '家庭';
      const c = v === 'personal' ? 'badge-muted' : 'badge-info';
      return `<span class="badge ${c}">${esc(l)}</span>`;
    },
    initialBalance: (v) => `<span class="mono">${formatHKD(v)}</span>`,
    initialYM: (_, r) => `<span class="mono" style="font-size:12px;color:var(--text-muted);">${esc(r.initialYear || '—')}-${esc(r.initialMonth || '—')}</span>`,
  },

  funds: {
    name: (v) => esc(v || '（未命名）'),
    typeLabel: (v) => v === 'insurance' ? '<span class="badge badge-magenta">保險</span>' : '<span class="badge badge-info">獨立</span>',
    cost: (v) => `<span class="mono">${formatHKD(v)}</span>`,
    currentValue: (v) => `<span class="mono text-emerald">${formatHKD(v)}</span>`,
    pnl: (v, r) => {
      const p = (Number(r.currentValue) || 0) - (Number(r.cost) || 0);
      return `<span class="mono ${p >= 0 ? 'text-emerald' : 'text-red'}">${p >= 0 ? '+' : ''}${formatHKD(p)}</span>`;
    },
    units: (v) => `<span class="mono">${v || '—'}</span>`,
  },

  insurancePolicies: {
    name: (v) => esc(v || '（未命名）'),
    company: (v) => esc(v || '—'),
    holderName: (_, r) => esc(resolveName('members', r.policyHolderId || r.memberId) || '—'),
    insuredName: (_, r) => esc(resolveName('members', r.memberId) || '—'),
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
      if (r.source === 'insurance') return '<span class="badge badge-success">🛡 保險</span>';
      return r.memberId === RESERVED_IDS.SHARED_MEMBER 
        ? '<span class="badge badge-warning">🏠 家庭</span>' 
        : '<span class="badge badge-info">🏷 個人</span>';
    },
    yearMonth: (_, r) => `${esc(r.year)}-${esc(r.month)}`,
    member: (_, r) => r.memberId === RESERVED_IDS.SHARED_MEMBER 
      ? '🏠 家庭共用' 
      : (r.memberId ? esc(resolveName('members', r.memberId) || r.memberId) : '—'),
    name: (v) => esc(v || '—'),
    amount: (v) => formatHKD(v),
    date: (v) => esc(v || '—'),
    status: (v, r) => `<span class="badge ${statusBadgeClass(v)}">${esc(statusLabel(v, { source: r.source }))}</span>`,
  },

  bankTransactions: {
    date: (v) => `<span class="mono" style="font-size:12px;">${esc(v || '—')}</span>`,
    bankName: (v) => esc(v || '—'),
    typeLabel: (_, r) => {
      const map = { in: '入帳', out: '出帳', transfer: '轉帳' };
      const cls = r.type === 'in' ? 'badge-success' : (r.type === 'transfer' ? 'badge-info' : 'badge-pending');
      return `<span class="badge ${cls}">${esc(map[r.type] || r.type)}</span>`;
    },
    catLabel: (_, r) => {
      const map = { contribution: '家用轉入', expense: '支出', insurance: '保險', reimbursement: '代墊', manual: '手動' };
      return `<span class="badge badge-muted">${esc(map[r.category] || r.category)}</span>`;
    },
    memberName: (v) => v ? esc(resolveName('members', v) || v) : '—',
    amount: (v, r) => `<span class="mono ${r.type === 'in' ? 'text-emerald' : 'text-red'}">${r.type === 'in' ? '+' : '-'}${formatHKD(v)}</span>`,
    note: (v) => esc(v || '—'),
  },

  codeList: {
    code: (v) => v ? `<span class="mono" style="font-size:12px; color:var(--primary);">${esc(v)}</span>` : '<span class="mono" style="color:var(--text-muted);">—</span>',
    entityLabel: (v) => `<span class="badge badge-info">${esc(v || '—')}</span>`,
    name: (v) => esc(v || '（未命名）'),
  },

  dashboardAnnual: {
    year: (v, r) => `${v} 年${r.isCurrent ? ' <span class="badge badge-info" style="font-size:10px;">今年</span>' : ''}`,
    totalIncome: (v) => `<span class="text-emerald mono">${formatHKD(v)}</span>`,
    totalExpense: (v) => `<span class="text-red mono">${formatHKD(v)}</span>`,
    insurance: (v) => `<span class="text-magenta mono">${formatHKD(v)}</span>`,
    net: (v) => `<span class="${v >= 0 ? 'text-emerald' : 'text-red'} mono">${formatHKD(v)}</span>`,
  },

  recentExpense: {
    date: (v) => esc(v || '—'),
    memberName: (_, r) => r.memberId === RESERVED_IDS.SHARED_MEMBER ? '🏠 家庭共用' : esc(resolveName('members', r.memberId) || r.memberId || '—'),
    name: (v) => esc(v || '（未命名）'),
    amount: (v) => formatHKD(v),
    status: (v) => `<span class="badge ${statusBadgeClass(v)}">${esc(statusLabel(v))}</span>`,
  },
};

/* ============================================
   3. 對外 API
   ============================================ */
export function getColumns(key) {
  const c = COLUMNS[key];
  if (!c) { console.warn(`[columns] 未知 key：${key}`); return []; }
  return c.map((x) => ({ ...x }));
}

export function getResolvers(key) {
  const r = RESOLVERS[key];
  return r ? { ...r } : {};
}

/* ═══ EOF ═══
F: config/columns.js
V: 1792900550
W: ai-system-20261024-012#50
═══ EOF ═══ */