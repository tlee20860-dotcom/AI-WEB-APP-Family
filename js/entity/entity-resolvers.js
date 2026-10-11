// ============================================
// entity-resolvers.js — Entity 欄位顯示 SSOT（v103.0.22）
// 位置：js/entity/entity-resolvers.js
// ============================================
// v103.0.22（B25-4）：
//   ✅ M2：抽出重複的 name / memberName resolver
// ============================================

import { esc } from '../lib/dom.js';
import { formatHKD, formatNumber } from '../lib/format.js';
import { resolveName } from '../config/entity-registry.js';

/* 🆕 v103.0.22：抽出重複的模式 */
const _name = (v) => esc(v || '—');
const _nameOrDash = (v) => v ? esc(resolveName('members', v) || v) : '—';
const _num = (v) => formatNumber(v);

export const RESOLVERS = {
  member: {
    name: _name,
    role: _name,
    order: _num,
  },

  bank: {
    name: _name,
    order: _num,
  },

  policy: {
    name: (v) => esc(v || '（未命名）'),
    company: _name,
    policyHolderId: _nameOrDash,
    memberId: _nameOrDash,
    firstStartYear: (v, r) => esc(`${v || ''}-${r.firstStartMonth || ''}`),
    annualPremium: (v) => `<span class="mono text-cyan">${formatHKD(v)}</span>`,
    totalPremium: (v) => `<span class="mono text-magenta">${formatHKD(v)}</span>`,
    monthlyPremium: (v) => `<span class="mono">${formatHKD(v)}</span>`,
    type: (v) => v === 'fund_insurance' ? '基金保險' : '普通保險',
    paymentMode: (v) => v === 'advance' ? '代墊' : '直接',
    paymentType: _name,
    currentPeriodIndex: (v) => `<span class="mono">${v || 1}</span>`,
    totalPolicyYears: (v) => `<span class="mono">${v || 0}</span>`,
  },

  fund: {
    name: (v) => esc(v || '（未命名）'),
    cost: (v) => `<span class="mono">${formatHKD(v)}</span>`,
    currentValue: (v) => `<span class="mono text-emerald">${formatHKD(v)}</span>`,
    units: (v) => `<span class="mono">${v || '—'}</span>`,
    note: _name,
  },

  category: {
    name: _name,
    order: _num,
  },

  item: {
    name: _name,
    categoryId: (v) => v ? `<span class="badge badge-info">${esc(resolveName('categories', v) || v)}</span>` : '—',
  },

  payment: {
    name: _name,
    order: _num,
  },

  status: {
    name: _name,
    category: (v) => {
      const map = { personal: '個人支出', fixed: '固定支出', insurance: '保險' };
      return esc(map[v] || v || '—');
    },
    isDone: (v) => v ? '<span class="badge badge-success">是</span>' : '<span class="badge badge-muted">否</span>',
    order: _num,
  },
};

export function getEntityResolvers(entityKey) {
  const map = {
    member: 'member',
    bank: 'bank',
    policy: 'policy',
    fund: 'fund',
    category: 'category',
    item: 'item',
    payment: 'payment',
    status: 'status',
  };
  const key = map[entityKey];
  return key ? (RESOLVERS[key] || {}) : {};
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/entity/entity-resolvers.js
   Version: v103.0.22
   Batch: B25-4
   ═══════════════════════════════════════════ */