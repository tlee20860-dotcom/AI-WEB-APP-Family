// ============================================
// entity-registry.js — 名稱解析 SSOT（v103.0.22）
// 位置：js/config/entity-registry.js
// ============================================
// v103.0.22（B25-4）：
//   ✅ R6 修正：ENTITY_TYPE_MAP 移除未訂閱的 STATUS（無效對映）
// ============================================

import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from './firebase-config.js';
import { AppState } from '../core/state.js';
import { ENTITY_KEYS } from './constants.js';

const PATHS = {
  members:       'members',
  banks:         'banks',
  bank_accounts: 'bank_accounts',
  categories:    'expense_categories',
  items:         'expense_items',
  companies:     'insurance_companies',
  payments:      'payment_methods',
};

function byOrderThenCreated(a, b) {
  const oa = a.order != null ? a.order : Number.MAX_SAFE_INTEGER;
  const ob = b.order != null ? b.order : Number.MAX_SAFE_INTEGER;
  if (oa !== ob) return oa - ob;
  return (a.createdAt || 0) - (b.createdAt || 0);
}

function byCreatedAt(a, b) {
  return (a.createdAt || 0) - (b.createdAt || 0);
}

const _lists = {};
const _nameMaps = {};
const _unsubscribers = [];
let _initialized = false;

export function init() {
  if (_initialized) return true;

  const familyId = AppState.getFamilyId();
  if (!familyId) {
    console.warn('[entity-registry] 尚未選擇家庭，略過初始化');
    return false;
  }

  Object.entries(PATHS).forEach(([key, path]) => {
    const r = ref(db, `families/${familyId}/${path}`);
    const sortFn = (key === 'members' || key === 'banks' || key === 'bank_accounts')
      ? byOrderThenCreated
      : byCreatedAt;

    const unsub = onValue(
      r,
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val).map(([id, x]) => ({ id, ...x }));
        list.sort(sortFn);

        _lists[key] = list;

        const map = {};
        list.forEach((x) => { map[x.id] = x.name || ''; });
        _nameMaps[key] = map;
      },
      (err) => {
        console.warn(`[entity-registry] 讀取 ${key} 失敗：`, err);
        _lists[key] = _lists[key] || [];
        _nameMaps[key] = _nameMaps[key] || {};
      }
    );

    _unsubscribers.push(unsub);
  });

  _initialized = true;
  return true;
}

export function destroy() {
  _unsubscribers.forEach((unsub) => {
    try { unsub(); } catch (e) { /* noop */ }
  });
  _unsubscribers.length = 0;

  Object.keys(_lists).forEach((k) => { delete _lists[k]; });
  Object.keys(_nameMaps).forEach((k) => { delete _nameMaps[k]; });

  _initialized = false;
}

export function isInitialized() {
  return _initialized;
}

export function resolveName(type, id, fallback = '') {
  if (!id) return fallback;
  const map = _nameMaps[type];
  if (!map) return fallback;
  return map[id] || fallback;
}

export function getList(type) {
  return [...(_lists[type] || [])];
}

export function getNameMap(type) {
  return { ...(_nameMaps[type] || {}) };
}

export function resolveNames(type, ids = []) {
  const result = {};
  ids.forEach((id) => { result[id] = resolveName(type, id, ''); });
  return result;
}

/* 🆕 v103.0.22：
   - STATUS / FUND 不在此 registry 訂閱 → 移除映射
   - POLICY 語意上指向 members（保單持有人 fallback）→ 保留 */
export const ENTITY_TYPE_MAP = {
  [ENTITY_KEYS.MEMBER]:   'members',
  [ENTITY_KEYS.BANK]:     'banks',
  [ENTITY_KEYS.CATEGORY]: 'categories',
  [ENTITY_KEYS.ITEM]:     'items',
  [ENTITY_KEYS.PAYMENT]:  'payments',
  [ENTITY_KEYS.POLICY]:   'members',
};

export function resolveEntityName(entityKey, id, fallback = '') {
  const type = ENTITY_TYPE_MAP[entityKey];
  if (!type) return fallback;
  return resolveName(type, id, fallback);
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/config/entity-registry.js
   Version: v103.0.22
   Batch: B25-4
   ═══════════════════════════════════════════ */