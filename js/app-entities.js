// ============================================
// app-entities.js — 9 種實體定義 SSOT
// 職責：fields / ui / validate / fromForm / toForm / codePrefix / openEntityModal
// ============================================

import { api, generateCodeFor, resolveName } from './app-data.js';
import { esc, formatHKD, formatNumber, buildForm, openModal, closeModal, toast } from './app-ui.js';

const LIMITS = { NAME_MAX: 60, ORDER_MIN: 0 };
const PAYMENT_TYPES = { ANNUAL: '年繳', MONTHLY: '月繳', ONCE: '一次付款' };
const POLICY_SUBTYPES = { normal: 'NORM', fund_insurance: 'FUND', savings: 'SAVE' };

function _stripCommon(payload) {
  const extra = {};
  ['name', 'code', 'createdAt', 'updatedAt'].forEach(() => {});
  Object.entries(payload || {}).forEach(([k, v]) => {
    if (!['name', 'code', 'createdAt', 'updatedAt'].includes(k)) extra[k] = v;
  });
  return extra;
}

export const ENTITIES = {
  member: {
    key: 'member', label: '成員', icon: 'users', codePrefix: 'MEM',
    fields: [
      { id: 'name', label: '名稱', type: 'text', required: true, maxlength: 20, placeholder: '例如：老公、梓舜' },
      { id: 'role', label: '角色', type: 'select', required: true, optionsSource: 'memberRoles' },
      { id: 'order', label: '排序', type: 'number-plain', min: 0, defaultValue: 0 },
    ],
    listColumns: ['name', 'role', 'order'], cardFields: ['role', 'order'], primaryColumn: 'name',
  },

  bank: {
    key: 'bank', label: '銀行', icon: 'landmark', codePrefix: 'PAY-BANK',
    fields: [{ id: 'name', label: '銀行名稱', type: 'text', required: true, maxlength: 20 }],
    listColumns: ['name'], cardFields: ['name'], primaryColumn: 'name',
  },

  bankAccount: {
    key: 'bankAccount', label: '銀行帳號', icon: 'landmark', codePrefix: 'PAY-BANK',
    fields: [
      { id: 'name', label: '帳號名稱', type: 'text', required: true, maxlength: 20 },
      { id: 'type', label: '類型', type: 'select', required: true, includeEmpty: false,
        options: [{ value: 'family', label: '家庭帳號' }, { value: 'personal', label: '個人帳號' }], defaultValue: 'family' },
      { id: 'initialBalance', label: '初始餘額（HK$）', type: 'number', required: true, min: 0, defaultValue: 0 },
      { id: 'initialYear', label: '初始年份', type: 'number-plain', required: true, min: 2000, max: 2100, defaultValue: () => new Date().getFullYear() },
      { id: 'initialMonth', label: '初始月份', type: 'select', required: true, optionsSource: 'months', defaultValue: '01' },
      { id: 'order', label: '排序', type: 'number-plain', min: 0, defaultValue: 0 },
    ],
    listColumns: ['name', 'type', 'initialBalance'], cardFields: ['type', 'initialBalance'], primaryColumn: 'name',
  },

  category: {
    key: 'category', label: '支出類別', icon: 'tags', codePrefix: 'CAT',
    fields: [
      { id: 'name', label: '類別名稱', type: 'text', required: true, maxlength: 20 },
      { id: 'shortCode', label: '子類短碼', type: 'text', required: false, maxlength: 5 },
      { id: 'order', label: '排序', type: 'number-plain', min: 0, defaultValue: 0 },
    ],
    listColumns: ['name', 'order'], cardFields: ['order'], primaryColumn: 'name',
  },

  item: {
    key: 'item', label: '支出項目', icon: 'list', codePrefix: 'ITEM',
    fields: [
      { id: 'categoryId', label: '所屬類別', type: 'select', required: true, optionsSource: 'categories' },
      { id: 'name', label: '項目名稱', type: 'text', required: true, maxlength: 30 },
    ],
    listColumns: ['name', 'categoryId'], cardFields: ['categoryId'], primaryColumn: 'name',
  },

  payment: {
    key: 'payment', label: '支付方式', icon: 'credit-card', codePrefix: 'PAY',
    fields: [
      { id: 'name', label: '支付方式名稱', type: 'text', required: true, maxlength: 20 },
      { id: 'order', label: '排序', type: 'number-plain', min: 0, defaultValue: 0 },
    ],
    listColumns: ['name', 'order'], cardFields: ['order'], primaryColumn: 'name',
  },

  company: {
    key: 'company', label: '保險公司', icon: 'shield', codePrefix: 'COMP',
    fields: [{ id: 'name', label: '公司名稱', type: 'text', required: true, maxlength: 30 }],
    listColumns: ['name'], cardFields: ['name'], primaryColumn: 'name',
  },

  policy: {
    key: 'policy', label: '保單', icon: 'shield', codePrefix: 'POL',
    fields: [
      { id: 'type', label: '保單類型', type: 'select', required: true, optionsSource: 'policyTypes' },
      { id: 'memberId', label: '受保人', type: 'select', required: true, optionsSource: 'members' },
      { id: 'policyHolderId', label: '保單持有人', type: 'select', required: false, optionsSource: 'members', emptyText: '— 同受保人 —' },
      { id: 'name', label: '保單名稱', type: 'text', required: true, maxlength: 60 },
      { id: 'company', label: '保險公司', type: 'select', required: false, optionsSource: 'companies' },
      { id: 'paymentMode', label: '付款模式', type: 'select', required: true, optionsSource: 'paymentModes', defaultValue: 'direct' },
      { id: 'advanceHolderId', label: '代墊成員', type: 'select', required: false, optionsSource: 'members', emptyText: '— 請選擇 —' },
      { id: 'firstStartYear', label: '保單開始年份', type: 'number-plain', required: true, min: 2000, max: 2100, defaultValue: () => new Date().getFullYear() },
      { id: 'firstStartMonth', label: '保單開始月份', type: 'select', required: true, optionsSource: 'months', defaultValue: '01' },
      { id: 'totalPolicyYears', label: '總供款年期', type: 'number-plain', required: true, min: 1, max: 50, defaultValue: 5 },
      { id: 'currentPeriodIndex', label: '當前第幾年度', type: 'number-plain', required: true, min: 1, max: 50, defaultValue: 1 },
      { id: 'paymentType', label: '付款類型', type: 'select', required: true, optionsSource: 'insurancePaymentTypes' },
      { id: 'account', label: '扣款帳戶（可選）', type: 'text', required: false, maxlength: 60 },
      { id: 'monthlyPremium', label: '月繳 / 月供（HK$）', type: 'number', required: false, min: 0, defaultValue: 0 },
      { id: 'annualPremium', label: '年繳保費（HK$）', type: 'number', required: false, min: 0, defaultValue: 0 },
      { id: 'oncePremium', label: '一次性付款（HK$）', type: 'number', required: false, min: 0, defaultValue: 0 },
    ],
    listColumns: ['name', 'memberId', 'company', 'firstStartYear', 'currentPeriodIndex'],
    cardFields: ['memberId', 'company', 'annualPremium'], primaryColumn: 'name',
    validate: (d) => {
      const t = d.type || 'normal';
      const pt = d.paymentType || PAYMENT_TYPES.ANNUAL;
      const mp = Number(d.monthlyPremium) || 0, ap = Number(d.annualPremium) || 0, op = Number(d.oncePremium) || 0;
      if (t === 'fund_insurance' && mp <= 0) return { field: 'monthlyPremium', message: '基金保險請填寫月供金額' };
      if (t !== 'fund_insurance') {
        if (pt === PAYMENT_TYPES.ANNUAL && ap <= 0) return { field: 'annualPremium', message: '年繳保費需大於 0' };
        if (pt === PAYMENT_TYPES.MONTHLY && mp <= 0) return { field: 'monthlyPremium', message: '月繳金額需大於 0' };
        if (pt === PAYMENT_TYPES.ONCE && op <= 0) return { field: 'oncePremium', message: '一次性付款需大於 0' };
      }
      if ((d.paymentMode || 'direct') === 'advance' && !d.advanceHolderId) {
        return { field: 'advanceHolderId', message: '代墊模式需指定代墊成員' };
      }
      return null;
    },
    fromForm: (d) => {
      const t = d.type || 'normal';
      const pt = d.paymentType || PAYMENT_TYPES.ANNUAL;
      const ty = Number(d.totalPolicyYears) || 1;
      const mp = Math.round(Number(d.monthlyPremium) || 0);
      const ap = Math.round(Number(d.annualPremium) || 0);
      const op = Math.round(Number(d.oncePremium) || 0);
      let annualPremium = 0;
      if (t === 'fund_insurance' || pt === PAYMENT_TYPES.ANNUAL) annualPremium = ap;
      else if (pt === PAYMENT_TYPES.MONTHLY) annualPremium = mp * 12;
      else if (pt === PAYMENT_TYPES.ONCE) annualPremium = Math.round(op / ty);
      let totalPremium = 0;
      if (t === 'fund_insurance' || pt === PAYMENT_TYPES.MONTHLY) totalPremium = mp * 12 * ty;
      else if (pt === PAYMENT_TYPES.ANNUAL) totalPremium = ap * ty;
      else if (pt === PAYMENT_TYPES.ONCE) totalPremium = op;
      return {
        ...d,
        memberId: d.memberId,
        policyHolderId: d.policyHolderId || d.memberId,
        type: t, paymentType: pt,
        firstStartYear: Number(d.firstStartYear),
        firstStartMonth: String(d.firstStartMonth || '01').padStart(2, '0'),
        totalPolicyYears: ty, totalPolicyPeriods: ty * 12,
        totalPremium, currentPeriodIndex: Number(d.currentPeriodIndex) || 1,
        monthlyPremium: (t === 'fund_insurance' || pt === PAYMENT_TYPES.MONTHLY) ? mp : 0,
        annualPremium,
        oncePremium: pt === PAYMENT_TYPES.ONCE ? op : 0,
        fundsAllocation: t === 'fund_insurance' ? (d.fundsAllocation || []) : [],
        periods: {},
      };
    },
    toForm: (row) => ({
      ...row,
      annualPremium: row.annualPremium || 0,
      monthlyPremium: row.monthlyPremium || 0,
      oncePremium: row.oncePremium || 0,
      paymentMode: row.paymentMode || 'direct',
      advanceHolderId: row.advanceHolderId || '',
    }),
  },

  fund: {
    key: 'fund', label: '基金', icon: 'line-chart', codePrefix: 'FUND',
    fields: [
      { id: 'name', label: '基金名稱', type: 'text', required: true, maxlength: 60 },
      { id: 'type', label: '基金類型', type: 'select', required: true, includeEmpty: false,
        options: [{ value: 'standalone', label: '獨立基金' }, { value: 'insurance', label: '保險基金' }], defaultValue: 'standalone' },
      { id: 'cost', label: '投入成本（HK$）', type: 'number', required: false, min: 0, defaultValue: 0 },
      { id: 'currentValue', label: '現時價值（HK$）', type: 'number', required: false, min: 0, defaultValue: 0 },
      { id: 'units', label: '持有單位數', type: 'number-plain', required: false, min: 0, defaultValue: 0 },
      { id: 'initialYear', label: '開始年份', type: 'number-plain', required: false, min: 2000, max: 2100 },
      { id: 'initialMonth', label: '開始月份', type: 'select', required: false, optionsSource: 'months' },
      { id: 'note', label: '備註（可選）', type: 'text', required: false, maxlength: 60 },
    ],
    listColumns: ['name', 'cost', 'currentValue'], cardFields: ['cost', 'currentValue'], primaryColumn: 'name',
  },
};

export async function createEntity(entityKey, data, allRows = []) {
  const def = ENTITIES[entityKey];
  if (!def) throw new Error(`未知實體：${entityKey}`);
  let payload = def.fromForm ? def.fromForm(data) : { ...data };
  if (def.validate) {
    const err = def.validate(payload, allRows, null);
    if (err) throw new Error(err.message);
  }
  let code = null;
  if (def.codePrefix) { const r = await generateCodeFor(entityKey, payload); code = r.code; }
  const result = await api.entityCreate({
    entityType: entityKey, action: 'create', code, name: payload.name,
    extra: _stripCommon(payload),
  });
  if (!result?.id) throw new Error('新增失敗');
  return { id: result.id, code: result.code || code };
}

export async function updateEntity(entityKey, id, data, allRows = []) {
  const def = ENTITIES[entityKey];
  if (!def) throw new Error(`未知實體：${entityKey}`);
  if (!id) throw new Error('缺少 id');
  let payload = def.fromForm ? def.fromForm(data) : { ...data };
  if (def.validate) {
    const err = def.validate(payload, allRows, id);
    if (err) throw new Error(err.message);
  }
  await api.entityCreate({
    entityType: entityKey, action: 'update', id, name: payload.name,
    extra: _stripCommon(payload),
  });
  return { id };
}

export async function removeEntity(entityKey, id) {
  if (!id) throw new Error('缺少 id');
  await api.entityCreate({ entityType: entityKey, action: 'delete', id });
}

export async function getDynamicOptions(source, ctx = {}) {
  if (!source) return [];
  switch (source) {
    case 'members':
      return (await import('./app-data.js')).getList('members').map((m) => ({ value: m.id, label: m.name }));
    case 'categories':
      return (await import('./app-data.js')).getList('categories').map((c) => ({ value: c.id, label: c.name }));
    case 'items': {
      const all = (await import('./app-data.js')).getList('items');
      const f = ctx.categoryId ? all.filter((i) => i.categoryId === ctx.categoryId) : all;
      return f.map((i) => ({ value: i.id, label: i.name }));
    }
    case 'payments':
      return (await import('./app-data.js')).getList('payments').map((p) => ({ value: p.id, label: p.name }));
    case 'companies':
      return (await import('./app-data.js')).getList('companies').map((c) => ({ value: c.name, label: c.name }));
    case 'memberRoles':
      return [
        { value: 'husband', label: '老公 / 丈夫' }, { value: 'wife', label: '老婆 / 妻子' },
        { value: 'child', label: '子女' }, { value: 'other', label: '其他' },
      ];
    case 'policyTypes':
      return [
        { value: 'normal', label: '普通類保險' }, { value: 'fund_insurance', label: '基金類保險' },
        { value: 'savings', label: '儲蓄類保險' },
      ];
    case 'insurancePaymentTypes':
      return [{ value: '年繳', label: '年繳' }, { value: '月繳', label: '月繳' }, { value: '一次付款', label: '一次付款' }];
    case 'paymentModes':
      return [{ value: 'direct', label: '直接付款' }, { value: 'advance', label: '代墊模式' }];
    case 'months': {
      const arr = [];
      for (let m = 1; m <= 12; m++) arr.push({ value: String(m).padStart(2, '0'), label: `${m} 月` });
      return arr;
    }
    default:
      return [];
  }
}

export function getEntityDef(key) { return ENTITIES[key] || null; }
export function getAllEntityKeys() { return Object.keys(ENTITIES); }
export function getEntityUi(key) {
  const d = ENTITIES[key];
  if (!d) return null;
  return { primaryColumn: d.primaryColumn, listColumns: d.listColumns, cardFields: d.cardFields };
}

/* ============================================
   🆕 補齊缺失的 openEntityModal
   ============================================ */
export async function openEntityModal(entityKey, mode = 'add', options = {}) {
  const { id, allRows = [], onSuccess, onCancel } = options;
  const def = ENTITIES[entityKey];
  if (!def) {
    toast(`未知的實體：${entityKey}`, 'error');
    return;
  }

  const MODAL_ID = `entity-modal-${entityKey}-${Date.now()}`;
  const o = document.createElement('div');
  o.className = 'modal-overlay active';
  o.id = MODAL_ID;
  o.innerHTML = `<div class="modal" style="max-width:560px;max-height:90vh;overflow-y:auto;">
    <h2 class="modal-title">${mode === 'edit' ? '編輯' : '新增'}${def.label}</h2>
    <div id="${MODAL_ID}-form"></div>
  </div>`;
  document.body.appendChild(o);
  document.body.style.overflow = 'hidden';

  let initialData = {};
  if (mode === 'edit' && id) {
    const row = allRows.find((r) => r.id === id);
    if (row) {
      initialData = def.toForm ? def.toForm(row) : { ...row };
    }
  }

  // 動態解析 optionsSource 為真正的 options
  const formFields = [];
  for (const f of def.fields) {
    const field = { ...f };
    if (field.optionsSource && !field.options) {
      field.options = await getDynamicOptions(field.optionsSource);
    }
    formFields.push(field);
  }

  buildForm({
    containerId: `${MODAL_ID}-form`,
    fields: formFields,
    submitText: mode === 'edit' ? '儲存' : `新增${def.label}`,
    showCancel: true,
    cancelText: '取消',
    initialData: initialData,
    beforeSubmit: (data) => {
      if (def.validate) {
        const err = def.validate(data, allRows, id);
        if (err) return err;
      }
      return true;
    },
    onSubmit: async (data) => {
      try {
        if (mode === 'edit' && id) {
          await updateEntity(entityKey, id, data, allRows);
          toast(`✅ 已更新${def.label}`, 'success');
        } else {
          await createEntity(entityKey, data, allRows);
          toast(`✅ 已新增${def.label}`, 'success');
        }
        closeModal(o);
        o.remove();
        document.body.style.overflow = '';
        if (typeof onSuccess === 'function') onSuccess();
      } catch (err) {
        toast(err.message || '操作失敗', 'error');
      }
    },
    onCancel: () => {
      closeModal(o);
      o.remove();
      document.body.style.overflow = '';
      if (typeof onCancel === 'function') onCancel();
    },
  });

  openModal(o);
}

/* ═══ EOF ═══
F: js/app-entities.js
V: 1792670006
W: webapp-20261022-028#1
═══ */
