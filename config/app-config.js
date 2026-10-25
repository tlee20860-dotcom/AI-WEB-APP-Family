// ============================================
// app-config.js — 平台與家庭設定合併（V2 重構版）
// 位置：config/app-config.js
// 說明：讀取平台預設與家庭覆寫，合併為最終設定。
//       依賴 config/firebase.js 與 config/state.js。
// ============================================

import { db } from './firebase.js';
import { AppState } from './state.js';
import { LIMITS } from './constants.js';
import { ref, get, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================
   1. 預設值（當資料庫完全沒有資料時使用）
   ============================================ */
const FALLBACK_OPTIONS = {
  memberRoles: [
    { value: 'husband', label: '老公 / 丈夫' },
    { value: 'wife',    label: '老婆 / 妻子' },
    { value: 'child',   label: '子女' },
    { value: 'other',   label: '其他' },
  ],
  cycles: [
    { value: '每月',    label: '每月' },
    { value: '每2個月', label: '每2個月' },
    { value: '每季',    label: '每季' },
    { value: '每年',    label: '每年' },
    { value: '一次性',  label: '一次性' },
  ],
  policyTypes: [
    { value: 'normal',         label: '普通類保險（住院 / 人壽 / 意外）' },
    { value: 'fund_insurance', label: '基金類保險（投資型，月供）' },
    { value: 'savings',        label: '儲蓄類保險' },
  ],
  insurancePaymentTypes: [
    { value: '年繳',     label: '年繳' },
    { value: '月繳',     label: '月繳' },
    { value: '一次付款', label: '一次付款' },
  ],
  paymentModes: [
    { value: 'direct',  label: '直接付款（家庭帳號扣款）' },
    { value: 'advance', label: '代墊模式（成員墊付，家庭月攤）' },
  ],
  categoryOrder: ['銀行類', '醫療類', '學校類', '保險類', '固定費用類', '交通類', '其他'],
};

const FALLBACK_YEAR_RANGE = {
  startYear: null,
  futureYears: LIMITS.YEAR_FUTURE_DEFAULT,
};

const FALLBACK_UI = {
  nameMaxLenDesktop: LIMITS.NAME_MAX_LEN_DESKTOP,
  nameMaxLenMobile:  LIMITS.NAME_MAX_LEN_MOBILE,
  toastDuration:     LIMITS.TOAST_DURATION,
};

/* ============================================
   2. 模組狀態
   ============================================ */
let _platformDefaults = { options: null, yearRange: null, uiConstants: null };
let _familyOverrides  = { options: null, yearRange: null, uiConstants: null };
let _merged = null;
let _listeners = [];
let _unsubscribers = [];

/* ============================================
   3. 初始化與監聽
   ============================================ */
export async function initAppConfig() {
  const familyId = AppState.getFamilyId();

  // 取得平台預設
  const [pOpts, pYearRange, pUI] = await Promise.all([
    _get('platform/defaults/options'),
    _get('platform/defaults/year_range'),
    _get('platform/defaults/ui_constants'),
  ]);
  _platformDefaults = { options: pOpts, yearRange: pYearRange, uiConstants: pUI };

  // 取得家庭覆寫
  if (familyId) {
    const [fOpts, fYearRange, fUI] = await Promise.all([
      _get(`families/${familyId}/settings/options`),
      _get(`families/${familyId}/settings/year_range`),
      _get(`families/${familyId}/settings/ui_constants`),
    ]);
    _familyOverrides = { options: fOpts, yearRange: fYearRange, uiConstants: fUI };
  } else {
    _familyOverrides = { options: null, yearRange: null, uiConstants: null };
  }

  _merged = _mergeAll();
  _notifyAll();
  return _merged;
}

export function watchConfigChanges() {
  _unsubscribers.forEach((unsub) => { try { unsub(); } catch (e) {} });
  _unsubscribers = [];
  const familyId = AppState.getFamilyId();

  const _watch = (path, targetKey, targetObj) => {
    const unsub = onValue(ref(db, path), (snap) => {
      targetObj[targetKey] = snap.val();
      _merged = _mergeAll();
      _notifyAll();
    });
    _unsubscribers.push(unsub);
  };

  // 監聽平台
  _watch('platform/defaults/options', 'options', _platformDefaults);
  _watch('platform/defaults/year_range', 'yearRange', _platformDefaults);
  _watch('platform/defaults/ui_constants', 'uiConstants', _platformDefaults);

  // 監聽家庭
  if (familyId) {
    _watch(`families/${familyId}/settings/options`, 'options', _familyOverrides);
    _watch(`families/${familyId}/settings/year_range`, 'yearRange', _familyOverrides);
    _watch(`families/${familyId}/settings/ui_constants`, 'uiConstants', _familyOverrides);
  }
}

export function disposeAppConfig() {
  _unsubscribers.forEach((unsub) => { try { unsub(); } catch (e) {} });
  _unsubscribers = [];
  _listeners = [];
  _merged = null;
}

/* ============================================
   4. 對外查詢 API
   ============================================ */
export function getOptions(key) {
  const opts = _merged?.options;
  if (!opts || Object.keys(opts).length === 0) {
    return FALLBACK_OPTIONS[key] || [];
  }
  return opts[key] || FALLBACK_OPTIONS[key] || [];
}

export function getYearRange() {
  const cfg = _merged?.yearRange || FALLBACK_YEAR_RANGE;
  const curY = new Date().getFullYear();

  let startYear;
  if (cfg.startYear != null && cfg.startYear !== '') {
    startYear = Math.min(Number(cfg.startYear), curY - LIMITS.YEAR_PAST_DEFAULT);
  } else {
    startYear = curY - LIMITS.YEAR_PAST_DEFAULT;
  }
  const futureYears = Number(cfg.futureYears) || LIMITS.YEAR_FUTURE_DEFAULT;

  return { startYear, endYear: curY + futureYears };
}

export function getYearList() {
  const { startYear, endYear } = getYearRange();
  const list = [];
  for (let y = startYear; y <= endYear; y++) list.push(y);
  return list;
}

export function getUIConstants() {
  const cfg = _merged?.uiConstants || FALLBACK_UI;
  return {
    nameMaxLenDesktop: Number(cfg.nameMaxLenDesktop) || LIMITS.NAME_MAX_LEN_DESKTOP,
    nameMaxLenMobile: Number(cfg.nameMaxLenMobile) || LIMITS.NAME_MAX_LEN_MOBILE,
    toastDuration: Number(cfg.toastDuration) || LIMITS.TOAST_DURATION,
  };
}

export function onConfigChange(callback) {
  _listeners.push(callback);
  try { callback(_merged); } catch (e) { console.error('[app-config] listener error:', e); }
  return () => {
    _listeners = _listeners.filter((cb) => cb !== callback);
  };
}

/* ============================================
   5. 內部工具
   ============================================ */
async function _get(path) {
  try {
    const snap = await get(ref(db, path));
    return snap.val();
  } catch (err) {
    console.warn(`[app-config] 讀取失敗 ${path}：`, err);
    return null;
  }
}

function _mergeAll() {
  return {
    options: _mergeOptions(_familyOverrides.options, _platformDefaults.options),
    yearRange: _mergeObject(_familyOverrides.yearRange, _platformDefaults.yearRange, FALLBACK_YEAR_RANGE),
    uiConstants: _mergeObject(_familyOverrides.uiConstants, _platformDefaults.uiConstants, FALLBACK_UI),
  };
}

function _mergeOptions(familyOpts, platformOpts) {
  const hasFamily = familyOpts && typeof familyOpts === 'object' && Object.keys(familyOpts).length > 0;
  const hasPlatform = platformOpts && typeof platformOpts === 'object' && Object.keys(platformOpts).length > 0;

  const base = hasPlatform ? platformOpts : FALLBACK_OPTIONS;
  if (!hasFamily) return base;

  const merged = { ...base };
  Object.entries(familyOpts).forEach(([key, val]) => {
    if (val != null) merged[key] = val;
  });
  return merged;
}

function _mergeObject(familyObj, platformObj, fallback) {
  const hasFamily = familyObj && typeof familyObj === 'object' && Object.keys(familyObj).length > 0;
  const hasPlatform = platformObj && typeof platformObj === 'object' && Object.keys(platformObj).length > 0;

  const base = hasPlatform ? platformObj : fallback;
  if (!hasFamily) return base;
  return { ...base, ...familyObj };
}

function _notifyAll() {
  _listeners.forEach((cb) => {
    try { cb(_merged); } catch (e) { console.error('[app-config] listener error:', e); }
  });
}

/* ═══ EOF ═══
F: config/app-config.js
V: 1792900210
W: ai-system-20261024-012#16
═══ EOF ═══ */