// ============================================
// entity-helpers.js — 通用實體 CRUD 輔助（v103.0.25）
// 位置：js/entity/entity-helpers.js
// ============================================
// v103.0.25（B34-4）：
//   ✅ [修正] 補回遺漏的 import：getMembersOnce / getBanksOnce
// v103.0.24（B34-4）：
//   ✅ createEntity 回傳 { id, code }
// ============================================

import {
  listenMembers, getMembersOnce,
  listenBanks, getBanksOnce,
  listenFunds,
  listenInsurancePolicies, getInsurancePoliciesOnce,
  listenInsuranceCompanies, getInsuranceCompaniesOnce,
  listenPaymentMethods, getPaymentMethodsOnce,
  listenCategories, getCategoriesOnce,
  listenItems, getItemsOnce,
  listenStatuses,
  listenBankAccounts, getBankAccountsOnce,
  addMemberAdvance,
  updateInsurancePolicy,
  updateEntityStatus as dbUpdateEntityStatus,
} from '../core/db.js';

import { api } from '../core/api.js';
import { getEntityDef, resolveFieldDefault } from './entity-definitions.js';
import { generateCodeFor } from '../lib/code-registry.js';
import { getOptions, getStatusesByCategory } from '../config/app-config.js';
import { sortMembers } from '../core/utils.js';
import { esc } from '../lib/dom.js';
import {
  getStatusBadgeClass,
  RESERVED_IDS,
} from '../config/constants.js';

/* ============================================
   1. CRUD（全走 API）
   ============================================ */

export async function createEntity(entityKey, data, allRows = []) {
  const def = getEntityDef(entityKey);
  if (!def) throw new Error(`未知的實體：${entityKey}`);

  let payload = def.fromForm ? def.fromForm(data) : { ...data };

  if (def.validate) {
    const err = def.validate(payload, allRows, null);
    if (err) throw new Error(err.message);
  }

  if (def.beforeCreate) {
    payload = def.beforeCreate(payload, allRows);
  }

  let code = null;
  if (def.codePrefix) {
    const r = await generateCodeFor(entityKey, payload);
    code = r.code;
  }

  const needsAdvance = entityKey === 'policy'
    && payload.paymentMode === 'advance'
    && payload.advanceHolderId
    && Number(payload.totalPremium) > 0;

  const result = await api.entityCreate({
    entityType: entityKey,
    action: 'create',
    code,
    name: payload.name,
    extra: _extractExtra(entityKey, payload),
  });

  if (!result?.id) throw new Error('新增失敗');

  if (needsAdvance) {
    try {
      const advanceId = await addMemberAdvance(payload.advanceHolderId, {
        policyId: result.id,
        totalAmount: Number(payload.totalPremium) || 0,
        remainingAmount: Number(payload.totalPremium) || 0,
        startYear: String(payload.firstStartYear || ''),
        startMonth: String(payload.firstStartMonth || '01').padStart(2, '0'),
        note: `代墊：${payload.name || ''}`,
      });
      if (advanceId) await updateInsurancePolicy(result.id, { advanceId });
    } catch (err) {
      console.warn('[entity-helpers] 建立代墊記錄失敗：', err);
    }
  }

  return { id: result.id, code: result.code || code };
}

export async function updateEntity(entityKey, id, data, allRows = []) {
  const def = getEntityDef(entityKey);
  if (!def) throw new Error(`未知的實體：${entityKey}`);
  if (!id) throw new Error('缺少 id');

  let payload = def.fromForm ? def.fromForm(data) : { ...data };

  if (def.validate) {
    const err = def.validate(payload, allRows, id);
    if (err) throw new Error(err.message);
  }

  await api.entityCreate({
    entityType: entityKey,
    action: 'update',
    id,
    name: payload.name,
    extra: _extractExtra(entityKey, payload),
  });

  const existingRow = (allRows || []).find((r) => r.id === id);
  return { id, code: existingRow?.code || null };
}

export async function removeEntity(entityKey, id) {
  if (!id) throw new Error('缺少 id');
  await api.entityCreate({
    entityType: entityKey,
    action: 'delete',
    id,
  });
}

export async function deleteEntity(entityKey, id, ...args) {
  const def = getEntityDef(entityKey);
  if (def?.db?.delete) {
    return def.db.delete(id, ...args);
  }
  return removeEntity(entityKey, id);
}

function _extractExtra(entityKey, payload) {
  const extra = {};
  const commonFields = ['name', 'code', 'createdAt', 'updatedAt'];
  Object.entries(payload || {}).forEach(([k, v]) => {
    if (!commonFields.includes(k)) extra[k] = v;
  });
  return extra;
}

/* ============================================
   2. 動態選項
   ============================================ */

export async function getDynamicOptions(source, context = {}) {
  if (!source) return [];

  try {
    switch (source) {
      case 'members':
      case 'membersWithShared': {
        const list = await getMembersOnce();
        return sortMembers(list).map((m) => ({ value: m.id, label: m.name }));
      }

      case 'categories': {
        const list = await getCategoriesOnce();
        return list.map((c) => ({ value: c.id, label: c.name }));
      }

      case 'items': {
        const list = await getItemsOnce();
        const filtered = context.categoryId
          ? list.filter((i) => i.categoryId === context.categoryId)
          : list;
        return filtered.map((i) => ({ value: i.id, label: i.name }));
      }

      case 'payments': {
        const list = await getPaymentMethodsOnce();
        return list.map((p) => ({ value: p.id, label: p.name }));
      }

      case 'companies': {
        const list = await getInsuranceCompaniesOnce();
        return list.map((c) => ({ value: c.name, label: c.name }));
      }

      case 'banks': {
        const list = await getBanksOnce();
        return list.map((b) => ({ value: b.id, label: b.name }));
      }

      case 'bankAccounts': {
        const list = await getBankAccountsOnce();
        return list.map((b) => ({ value: b.id, label: b.name }));
      }

      case 'statuses:personal':
        return _statusOptions('personal');
      case 'statuses:fixed':
        return _statusOptions('fixed');
      case 'statuses:insurance':
        return _statusOptions('insurance');

      case 'memberRoles':
        return getOptions('memberRoles');
      case 'policyTypes':
        return getOptions('policyTypes');
      case 'insurancePaymentTypes':
        return getOptions('insurancePaymentTypes');
      case 'paymentModes':
        return getOptions('paymentModes');
      case 'categoryOrder':
        return getOptions('categoryOrder');

      case 'statusCategories':
        return [
          { value: 'personal',  label: '個人支出' },
          { value: 'fixed',     label: '固定支出' },
          { value: 'insurance', label: '保險' },
        ];

      case 'booleanOptions':
        return [
          { value: 'false', label: '否（未處理類）' },
          { value: 'true',  label: '是（已完成類）' },
        ];

      case 'months': {
        const opts = [];
        for (let m = 1; m <= 12; m++) {
          opts.push({ value: String(m).padStart(2, '0'), label: `${m} 月` });
        }
        return opts;
      }

      default:
        console.warn(`[entity-helpers] 未知的 optionsSource：${source}`);
        return [];
    }
  } catch (err) {
    console.error(`[entity-helpers] 載入動態選項失敗 (${source})：`, err);
    return [];
  }
}

function _statusOptions(category) {
  const list = getStatusesByCategory(category);
  return list.map((s) => ({ value: s.name, label: s.name }));
}

/* ============================================
   3. 跨來源改狀態
   ============================================ */

export async function updateEntityStatus(source, row, newStatus) {
  const isDone = _isDoneStatus(newStatus, source);
  return dbUpdateEntityStatus(source, row, newStatus, isDone);
}

export function isDoneStatus(statusName, category) {
  return _isDoneStatus(statusName, category);
}

function _isDoneStatus(statusName, category) {
  if (!statusName) return false;
  try {
    const statuses = getStatusesByCategory(category);
    const found = statuses.find((s) => s.name === statusName);
    if (found) return !!found.isDone;
  } catch (e) {}
  return statusName.startsWith('已');
}

/* ============================================
   4. 狀態 badge 渲染
   ============================================ */

export function renderStatusBadge(statusName, category) {
  const isDone = _isDoneStatus(statusName, category);
  const isSkipped = statusName === '不適用';
  const cls = getStatusBadgeClass(isDone, isSkipped);
  const fallback = _getStatusFallback(category);
  return `<span class="badge ${cls}">${esc(statusName || fallback)}</span>`;
}

function _getStatusFallback(category) {
  switch (category) {
    case 'fixed':     return '未付款';
    case 'insurance': return '未扣款';
    case 'personal':
    default:          return '未處理';
  }
}

/* ============================================
   5. 資料轉換輔助
   ============================================ */

export function buildPayload(entityKey, formData) {
  const def = getEntityDef(entityKey);
  if (!def) throw new Error(`未知的實體：${entityKey}`);
  return def.fromForm ? def.fromForm(formData) : { ...formData };
}

export function buildInitialData(entityKey, row) {
  const def = getEntityDef(entityKey);
  if (!def) throw new Error(`未知的實體：${entityKey}`);
  return def.toForm ? def.toForm(row) : { ...row };
}

export function getFieldDefaults(entityKey) {
  const def = getEntityDef(entityKey);
  if (!def) return {};
  const result = {};
  def.fields.forEach((f) => {
    if (f.defaultValue != null) {
      result[f.id] = resolveFieldDefault(f);
    }
  });
  return result;
}

/* ============================================
   6. 監聽輔助
   ============================================ */

export function listenEntity(entityKey, cb, err) {
  switch (entityKey) {
    case 'member':      return listenMembers(cb, err);
    case 'bank':        return listenBanks(cb, err);
    case 'category':    return listenCategories(cb, err);
    case 'item':        return listenItems(cb, err);
    case 'payment':     return listenPaymentMethods(cb, err);
    case 'status':      return listenStatuses(cb, err);
    case 'company':     return listenInsuranceCompanies(cb, err);
    case 'policy':      return listenInsurancePolicies(cb, err);
    case 'fund':        return listenFunds(cb, err);
    case 'bankAccount': return listenBankAccounts(cb, err);
    default:
      console.warn(`[entity-helpers] listenEntity 不支援：${entityKey}`);
      return () => {};
  }
}

/* ============================================
   7. 便利函式
   ============================================ */

export async function getPoliciesOnce() {
  return getInsurancePoliciesOnce();
}

export function isReservedId(id) {
  return id === RESERVED_IDS.EXTRA_INCOME || id === RESERVED_IDS.SHARED_MEMBER;
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/entity/entity-helpers.js
   Version: 1791902740
   Batch: B34-4
   Writer: A20261013-004#131
   ═══════════════════════════════════════════ */