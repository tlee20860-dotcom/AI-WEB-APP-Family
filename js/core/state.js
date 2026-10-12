// ============================================
// state.js — 全域狀態中心（v103.0.42）
// 位置：js/core/state.js
// ============================================
// v103.0.42（B30-3b）：
//   ✅ 加 theme 狀態 + setTheme / getTheme
//   ✅ init() 讀取 localStorage 主題
// ============================================

import { STORAGE_KEYS, ROLES } from '../config/constants.js';
import { L } from '../config/label-registry.js';

const THEME_KEY = 'fin_ui_theme';

export const AppState = {
  currentUser: null,
  isSuperAdmin: false,
  currentFamilyId: '',
  currentFamilyName: '',
  familyOwnerUid: '',
  role: '',
  canInput: false,
  displayName: '',
  memberAccount: null,
  currentMemberId: '',
  year: '',
  month: '',
  currentView: 'table',
  theme: 'light',
  _listeners: {},
  _initialized: false,

  init() {
    if (this._initialized) return;
    this._initialized = true;

    const savedYear = localStorage.getItem(STORAGE_KEYS.YEAR);
    const savedMonth = localStorage.getItem(STORAGE_KEYS.MONTH);
    const savedFamilyId = localStorage.getItem(STORAGE_KEYS.FAMILY_ID);
    const savedFamilyName = localStorage.getItem(STORAGE_KEYS.FAMILY_NAME);
    const savedTheme = localStorage.getItem(THEME_KEY);

    this.year = savedYear || String(new Date().getFullYear());
    this.month = savedMonth || 'all';
    this.theme = (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';

    if (savedFamilyId) {
      this.currentFamilyId = savedFamilyId;
      this.currentFamilyName = savedFamilyName || '';
    }

    this._applyTheme(this.theme);
  },

  destroy() {
    this._listeners = {};
    this.currentUser = null;
    this.isSuperAdmin = false;
    this.currentFamilyId = '';
    this.currentFamilyName = '';
    this.familyOwnerUid = '';
    this.role = '';
    this.canInput = false;
    this.displayName = '';
    this.memberAccount = null;
    this.currentMemberId = '';
    this.currentView = 'table';
    this._initialized = false;
  },

  /* ---------- 主題 ---------- */
  _applyTheme(theme) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  },

  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    if (this.theme === theme) return;
    this.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    this._applyTheme(theme);
    this.emit('theme-change', theme);
  },

  getTheme() { return this.theme; },

  toggleTheme() {
    this.setTheme(this.theme === 'light' ? 'dark' : 'light');
  },

  /* ---------- 使用者 ---------- */
  setUser(user) {
    this.currentUser = user;
    this.emit('user-change', user);
  },

  setSuperAdmin(isSuper) {
    this.isSuperAdmin = !!isSuper;
    if (this.isSuperAdmin) {
      this.role = ROLES.SUPERADMIN;
      this.canInput = true;
    }
    this.emit('superadmin-change', this.isSuperAdmin);
  },

  /* ---------- 家庭 ---------- */
  setFamily(familyId, familyName, ownerUid) {
    this.currentFamilyId = familyId || '';
    this.currentFamilyName = familyName || '';
    if (ownerUid !== undefined) this.familyOwnerUid = ownerUid || '';

    if (this.currentFamilyId) {
      localStorage.setItem(STORAGE_KEYS.FAMILY_ID, this.currentFamilyId);
      localStorage.setItem(STORAGE_KEYS.FAMILY_NAME, this.currentFamilyName);
    } else {
      localStorage.removeItem(STORAGE_KEYS.FAMILY_ID);
      localStorage.removeItem(STORAGE_KEYS.FAMILY_NAME);
    }

    this.emit('family-change', {
      familyId: this.currentFamilyId,
      familyName: this.currentFamilyName,
    });
  },

  getFamilyId() { return this.currentFamilyId; },
  getFamilyName() { return this.currentFamilyName; },
  getFamilyOwnerUid() { return this.familyOwnerUid || this.currentFamilyId; },
  hasFamily() { return !!this.currentFamilyId; },

  clearFamily() {
    this.currentFamilyId = '';
    this.currentFamilyName = '';
    this.familyOwnerUid = '';
    localStorage.removeItem(STORAGE_KEYS.FAMILY_ID);
    localStorage.removeItem(STORAGE_KEYS.FAMILY_NAME);
    this.emit('family-change', { familyId: '', familyName: '' });
  },

  /* ---------- 帳號 ---------- */
  setRole(role) {
    this.role = role || '';
    this.emit('role-change', this.role);
  },

  getRole() { return this.role; },

  setCanInput(canInput) {
    this.canInput = !!canInput;
    this.emit('permission-change', { canInput: this.canInput });
  },

  getCanInput() { return this.canInput; },

  setDisplayName(displayName) {
    this.displayName = displayName || '';
    this.emit('displayname-change', this.displayName);
  },

  getDisplayName() { return this.displayName; },

  setMemberAccount(account) {
    this.memberAccount = account || null;

    if (account) {
      this.role = account.role || this.role;
      this.canInput = account.canInput !== false;
      this.displayName = account.displayName || this.displayName;
      if (account.memberId) {
        this.currentMemberId = account.memberId;
      }
    } else {
      this.role = '';
      this.canInput = false;
      this.displayName = '';
      this.currentMemberId = '';
    }

    this.emit('member-account-change', this.memberAccount);
  },

  getMemberAccount() { return this.memberAccount; },

  getCurrentMemberId() {
    if (this.currentMemberId) return this.currentMemberId;
    if (this.memberAccount?.memberId) return this.memberAccount.memberId;
    return '';
  },

  setCurrentMemberId(memberId) {
    this.currentMemberId = memberId || '';
    this.emit('current-member-change', this.currentMemberId);
  },

  setAccountContext({ familyId, familyName, memberAccount, ownerUid }) {
    this.setFamily(familyId, familyName, ownerUid);
    this.setMemberAccount(memberAccount);
  },

  getRoleLabel() {
    switch (this.role) {
      case ROLES.SUPERADMIN: return L('roles.superadmin');
      case ROLES.OWNER:      return L('roles.owner');
      case ROLES.MEMBER:     return L('roles.member');
      default:               return '成員';
    }
  },

  getCanInputLabel() {
    return this.canInput ? '可輸入' : '唯讀';
  },

  /* ---------- 年月 ---------- */
  setYearMonth(year, month) {
    this.year = String(year);
    this.month = String(month);
    localStorage.setItem(STORAGE_KEYS.YEAR, this.year);
    localStorage.setItem(STORAGE_KEYS.MONTH, this.month);
    this.emit('ym-change', { year: this.year, month: this.month });
  },

  getYearMonth() { return { year: this.year, month: this.month }; },
  isAnnualMode() { return this.month === 'all'; },

  getYearMonthLabel(sep = ' ') {
    if (this.month === 'all') return `${this.year} 年 全年`;
    return `${this.year} 年${sep}${this.month} 月`;
  },

  /* ---------- 檢視 ---------- */
  setCurrentView(view) {
    if (view !== 'table' && view !== 'card') return;
    if (this.currentView === view) return;
    this.currentView = view;
    this.emit('view-change', view);
  },

  getCurrentView() { return this.currentView; },

  /* ---------- 事件總線 ---------- */
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return () => {
      this._listeners[event] = (this._listeners[event] || []).filter((cb) => cb !== callback);
    };
  },

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((cb) => cb !== callback);
  },

  emit(event, data) {
    (this._listeners[event] || []).forEach((cb) => {
      try { cb(data); } catch (err) {
        console.error(`[AppState] 事件 ${event} 回呼失敗：`, err);
      }
    });
  },
};

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/core/state.js
   Version: v103.0.42
   Batch: B30-3b
   ═══════════════════════════════════════════ */