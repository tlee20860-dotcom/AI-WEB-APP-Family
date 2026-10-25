// ============================================
// entity-registry.js — 實體名稱解析 SSOT（V2 重構版）
// 位置：config/entity-registry.js
// 說明：集中訂閱基礎實體（成員、銀行、類別等），
//       將 ID 轉為名稱，避免各頁面重複查詢。
// ============================================

import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from './firebase.js';
import { AppState } from './state.js';

// 定義需要快取名稱的實體路徑
const PATHS = {
  members:       'members',
  banks:         'banks',
  bank_accounts: 'bank_accounts',
  categories:    'expense_categories',
  items:         'expense_items',
  companies:     'insurance_companies',
  payments:      'payment_methods',
};

const _lists = {};
const _nameMaps = {};
const _unsubscribers = [];
let _initialized = false;

/* ============================================
   1. 初始化與銷毀
   ============================================ */
export function initEntityRegistry() {
  if (_initialized) return true;

  const familyId = AppState.getFamilyId();
  if (!familyId) {
    console.warn('[entity-registry] 尚未選擇家庭，略過初始化');
    return false;
  }

  Object.entries(PATHS).forEach(([key, path]) => {
    const r = ref(db, `families/${familyId}/${path}`);
    
    // 排序邏輯：成員與銀行按 order，其餘按 createdAt
    const sortFn = (key === 'members' || key === 'banks' || key === 'bank_accounts')
      ? (a, b) => {
          const oa = a.order != null ? a.order : Number.MAX_SAFE_INTEGER;
          const ob = b.order != null ? b.order : Number.MAX_SAFE_INTEGER;
          return oa !== ob ? oa - ob : (a.createdAt || 0) - (b.createdAt || 0);
        }
      : (a, b) => (a.createdAt || 0) - (b.createdAt || 0);

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
  console.log('✅ Entity Registry 已初始化');
  return true;
}

export function destroyEntityRegistry() {
  _unsubscribers.forEach((unsub) => {
    try { unsub(); } catch (e) { /* noop */ }
  });
  _unsubscribers.length = 0;

  Object.keys(_lists).forEach((k) => { delete _lists[k]; });
  Object.keys(_nameMaps).forEach((k) => { delete _nameMaps[k]; });

  _initialized = false;
}

/* ============================================
   2. 查詢 API
   ============================================ */

/**
 * 取得實體名稱
 * @param {string} type - members / banks / categories 等
 * @param {string} id 
 * @param {string} [fallback='']
 * @returns {string}
 */
export function resolveName(type, id, fallback = '') {
  if (!id) return fallback;
  const map = _nameMaps[type];
  if (!map) return fallback;
  return map[id] || fallback;
}

/**
 * 取得完整實體列表（深拷貝）
 * @param {string} type 
 * @returns {Array}
 */
export function getList(type) {
  return [...(_lists[type] || [])];
}

/**
 * 取得名稱映射表（深拷貝）
 * @param {string} type 
 * @returns {Object}
 */
export function getNameMap(type) {
  return { ...(_nameMaps[type] || {}) };
}

/* ═══ EOF ═══
F: config/entity-registry.js
V: 1792900190
W: ai-system-20261024-012#14
═══ EOF ═══ */