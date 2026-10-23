// ============================================
// entity-defs.js — 實體定義 SSOT
// ============================================

export const ENTITIES = {
  member: {
    label: '成員', icon: 'users', prefix: 'MEM',
    fields: [
      { id: 'name', label: '名稱', type: 'text', required: true },
      { id: 'role', label: '角色', type: 'select', required: true, options: [
        { value: 'husband', label: '丈夫' }, { value: 'wife', label: '妻子' },
        { value: 'child', label: '子女' }, { value: 'other', label: '其他' }
      ]},
      { id: 'order', label: '排序', type: 'number', defaultValue: 0 }
    ]
  },
  bank: {
    label: '銀行', icon: 'landmark', prefix: 'PAY-BANK',
    fields: [{ id: 'name', label: '名稱', type: 'text', required: true }]
  },
  category: {
    label: '支出類別', icon: 'tags', prefix: 'CAT',
    fields: [
      { id: 'name', label: '名稱', type: 'text', required: true },
      { id: 'order', label: '排序', type: 'number', defaultValue: 0 }
    ]
  },
  item: {
    label: '支出項目', icon: 'list', prefix: 'ITEM',
    fields: [
      { id: 'name', label: '名稱', type: 'text', required: true },
      { id: 'categoryId', label: '所屬類別', type: 'select', required: true, optionsSource: 'categories' }
    ]
  },
  payment: {
    label: '支付方式', icon: 'credit-card', prefix: 'PAY',
    fields: [{ id: 'name', label: '名稱', type: 'text', required: true }]
  },
  company: {
    label: '保險公司', icon: 'shield', prefix: 'COMP',
    fields: [{ id: 'name', label: '名稱', type: 'text', required: true }]
  },
  policy: {
    label: '保單', icon: 'shield', prefix: 'POL',
    fields: [
      { id: 'name', label: '保單名稱', type: 'text', required: true },
      { id: 'type', label: '類型', type: 'select', required: true, options: [
        { value: 'normal', label: '普通保險' }, { value: 'fund_insurance', label: '基金保險' }
      ]},
      { id: 'memberId', label: '受保人', type: 'select', required: true, optionsSource: 'members' },
      { id: 'company', label: '保險公司', type: 'text' },
      { id: 'firstStartYear', label: '開始年份', type: 'number', required: true, defaultValue: new Date().getFullYear() },
      { id: 'totalPolicyYears', label: '供款年期', type: 'number', required: true, defaultValue: 5 },
      { id: 'annualPremium', label: '年繳保費', type: 'number', defaultValue: 0 },
      { id: 'monthlyPremium', label: '月供金額', type: 'number', defaultValue: 0 }
    ]
  },
  fund: {
    label: '基金', icon: 'line-chart', prefix: 'FUND',
    fields: [
      { id: 'name', label: '基金名稱', type: 'text', required: true },
      { id: 'type', label: '類型', type: 'select', required: true, options: [
        { value: 'standalone', label: '獨立基金' }, { value: 'insurance', label: '保險基金' }
      ]},
      { id: 'cost', label: '投入成本', type: 'number', defaultValue: 0 },
      { id: 'currentValue', label: '現時價值', type: 'number', defaultValue: 0 }
    ]
  },
  bankAccount: {
    label: '銀行帳號', icon: 'landmark', prefix: 'PAY-BANK',
    fields: [
      { id: 'name', label: '帳號名稱', type: 'text', required: true },
      { id: 'type', label: '類型', type: 'select', required: true, options: [
        { value: 'family', label: '家庭' }, { value: 'personal', label: '個人' }
      ]},
      { id: 'initialBalance', label: '初始餘額', type: 'number', defaultValue: 0 },
      { id: 'initialYear', label: '初始年份', type: 'number', defaultValue: new Date().getFullYear() }
    ]
  }
};

export function getEntityDef(key) { return ENTITIES[key]; }