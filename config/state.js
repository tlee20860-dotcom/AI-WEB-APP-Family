// ============================================
// state.js — 全域狀態中心（V2 重構版）
// 位置：config/state.js
// 說明：集中管理使用者、家庭、年月、主題與檢視模式。
//       內建輕量事件總線 (Pub/Sub)，供頁面監聽狀態變化。
// ============================================

import { STORAGE_KEYS, ROLES } from './constants.js';

export const AppState = {
  currentUser: null,
  isSuperAdmin: false,
  
  currentFamilyId: '',
  currentFamilyName: '',
  memberAccount: null,
  
  role: '',
  canInput: false,
  displayName: '',
  
  year: String(new Date().getFullYear()),
  month: 'all',
  theme: 'dark',
  currentView: 'table',

  _listeners: {},
  _initialized: false,

  /* ============================================
     初始化與銷毀
     ============================================ */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    const savedYear = localStorage.getItem(STORAGE_KEYS.YEAR);
    const savedMonth = localStorage.getItem(STORAGE_KEYS.MONTH);
    const savedFamilyId = localStorage.getItem(STORAGE_KEYS.FAMILY_ID);
    const savedFamilyName = localStorage.getItem(STORAGE_KEYS.FAMILY_NAME);
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);

    this.year = savedYear || String(new Date().getFullYear());
    this.month = savedMonth || 'all';
    this.theme = savedTheme === 'light' ? 'light' : 'dark';

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
    this.memberAccount = null;
    this.role = '';
    this.canInput = false;
    this.displayName = '';
    this.currentView = 'table';
    this._initialized = false;
  },

  /* ============================================
     主題
     ============================================ */
  _applyTheme(theme) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  },

  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    if (this.theme === theme) return;
    this.theme = theme;
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    this._applyTheme(theme);
    this.emit('theme-change', theme);
  },

  getTheme() { return this.theme; },

  toggleTheme() {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  },

  /* ============================================
     使用者與權限
     ============================================ */
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
    } else {
      this.role = '';
      this.canInput = false;
      this.displayName = '';
    }
    this.emit('member-account-change', this.memberAccount);
  },

  getMemberAccount() { return this.memberAccount; },

  /* ============================================
     家庭資訊
     ============================================ */
  setFamily(familyId, familyName) {
    this.currentFamilyId = familyId || '';
    this.currentFamilyName = familyName || '';

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
  hasFamily() { return !!this.currentFamilyId; },

  /* ============================================
     年月與檢視
     ============================================ */
  setYearMonth(year, month) {
    this.year = String(year);
    this.month = String(month);
    localStorage.setItem(STORAGE_KEYS.YEAR, this.year);
    localStorage.setItem(STORAGE_KEYS.MONTH, this.month);
    this.emit('ym-change', { year: this.year, month: this.month });
  },

  getYearMonth() { return { year: this.year, month: this.month }; },
  
  isAnnualMode() { return this.month === 'all'; },

  setCurrentView(view) {
    if (view !== 'table' && view !== 'card') return;
    if (this.currentView === view) return;
    this.currentView = view;
    this.emit('view-change', view);
  },

  getCurrentView() { return this.currentView; },

  /* ============================================
     事件總線 (Pub/Sub)
     ============================================ */
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

/* ═══ EOF ═══
F: config/state.js
V: 1792900180
W: ai-system-20261024-012#13
═══ EOF ═══ */