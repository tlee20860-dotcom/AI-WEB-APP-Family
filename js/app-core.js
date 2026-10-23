// ============================================
// app-core.js — SPA 核心（狀態 + 路由 + 啟動）
// 版本：1.0.0（第 1 回骨架，第 2/3 回接入 ui/data/pages）
// ============================================
// 職責：
//   1. Firebase 初始化（沿用舊 DB 設定）
//   2. 登入 / 登出
//   3. AppState（沿用舊 state.js 的 API 介面）
//   4. Hash 路由（#/dashboard、#/insurance…）
//   5. 渲染 sidebar / navbar / 頁面外殼
//   6. 提供 registerPage(route, loader) 供 app-pages.js 註冊
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/* ============================================
   1. Firebase 設定（沿用舊版兩套環境）
   ============================================ */
const FIREBASE_CONFIGS = {
  old: {
    apiKey: "AIzaSyCQlrNdorKJI9xsqr4m4ME046lrubo9Y7I",
    authDomain: "family-fin-a6dd1.firebaseapp.com",
    databaseURL: "https://family-fin-a6dd1-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "family-fin-a6dd1",
    storageBucket: "family-fin-a6dd1.firebasestorage.app",
    messagingSenderId: "382147296734",
    appId: "1:382147296734:web:42bdbd7401001e75e1f14f",
  },
  new: {
    apiKey: "AIzaSyBJCK83RQyHbol4yJ4UDo3pOUXpUgcW9hU",
    authDomain: "family-3d0a5.firebaseapp.com",
    databaseURL: "https://family-3d0a5-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "family-3d0a5",
    storageBucket: "family-3d0a5.firebasestorage.app",
    messagingSenderId: "109775445681",
    appId: "1:109775445681:web:84e974db35951d0a6ecc90",
  },
};

const DB_TARGET_KEY = 'fin_db_target';

function resolveDbTarget() {
  try {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get('db');
    if (fromUrl === 'old' || fromUrl === 'new') {
      localStorage.setItem(DB_TARGET_KEY, fromUrl);
      return fromUrl;
    }
    const saved = localStorage.getItem(DB_TARGET_KEY);
    if (saved === 'old' || saved === 'new') return saved;
  } catch (e) { /* noop */ }
  return 'new';
}

export const DB_TARGET = resolveDbTarget();
const firebaseConfig = FIREBASE_CONFIGS[DB_TARGET];
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const DB_LABELS = { old: 'family-fin', new: '2026-10-12-family' };
export const SUPERADMIN_DOMAIN = '@familyfin.local';
export const SUPERADMIN_EMAIL = `superadmin${SUPERADMIN_DOMAIN}`;

/* ============================================
   2. localStorage Keys（沿用舊 constants.js）
   ============================================ */
const _P = `fin_${DB_TARGET}_`;
const STORAGE_KEYS = {
  YEAR: `${_P}year`,
  MONTH: `${_P}month`,
  FAMILY_ID: `${_P}family_id`,
  FAMILY_NAME: `${_P}family_name`,
  SIDEBAR_GROUPS: `${_P}ui_sidebar_groups`,
  SIDEBAR_COLLAPSED: `${_P}ui_sidebar_collapsed`,
  STATS_MODE: `${_P}ui_stats_mode`,
  THEME: 'fin_ui_theme',
};

/* ============================================
   3. AppState（沿用舊 state.js API，介面 100% 一致）
   ============================================ */
export const AppState = {
  currentUser: null,
  isSuperAdmin: false,
  currentFamilyId: '',
  currentFamilyName: '',
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
    this.year = localStorage.getItem(STORAGE_KEYS.YEAR) || String(new Date().getFullYear());
    this.month = localStorage.getItem(STORAGE_KEYS.MONTH) || 'all';
    this.currentFamilyId = localStorage.getItem(STORAGE_KEYS.FAMILY_ID) || '';
    this.currentFamilyName = localStorage.getItem(STORAGE_KEYS.FAMILY_NAME) || '';
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    this.theme = (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
    this._applyTheme(this.theme);
  },

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
  toggleTheme() { this.setTheme(this.theme === 'light' ? 'dark' : 'light'); },

  setUser(user) { this.currentUser = user; this.emit('user-change', user); },

  setSuperAdmin(isSuper) {
    this.isSuperAdmin = !!isSuper;
    if (this.isSuperAdmin) { this.role = 'superadmin'; this.canInput = true; }
    this.emit('superadmin-change', this.isSuperAdmin);
  },

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
    this.emit('family-change', { familyId: this.currentFamilyId, familyName: this.currentFamilyName });
  },

  getFamilyId() { return this.currentFamilyId; },
  getFamilyName() { return this.currentFamilyName; },

  setRole(role) { this.role = role || ''; this.emit('role-change', this.role); },
  getRole() { return this.role; },

  setCanInput(canInput) { this.canInput = !!canInput; this.emit('permission-change', { canInput: this.canInput }); },
  getCanInput() { return this.canInput; },

  setDisplayName(displayName) { this.displayName = displayName || ''; this.emit('displayname-change', this.displayName); },
  getDisplayName() { return this.displayName; },

  setMemberAccount(account) {
    this.memberAccount = account || null;
    if (account) {
      this.role = account.role || this.role;
      this.canInput = account.canInput !== false;
      this.displayName = account.displayName || this.displayName;
      if (account.memberId) this.currentMemberId = account.memberId;
    }
    this.emit('member-account-change', this.memberAccount);
  },

  getMemberAccount() { return this.memberAccount; },
  getCurrentMemberId() { return this.currentMemberId || (this.memberAccount?.memberId) || ''; },

  setYearMonth(year, month) {
    this.year = String(year);
    this.month = String(month);
    localStorage.setItem(STORAGE_KEYS.YEAR, this.year);
    localStorage.setItem(STORAGE_KEYS.MONTH, this.month);
    this.emit('ym-change', { year: this.year, month: this.month });
  },

  getYearMonth() { return { year: this.year, month: this.month }; },

  setCurrentView(view) {
    if (view !== 'table' && view !== 'card') return;
    if (this.currentView === view) return;
    this.currentView = view;
    this.emit('view-change', view);
  },
  getCurrentView() { return this.currentView; },

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return () => {
      this._listeners[event] = (this._listeners[event] || []).filter((cb) => cb !== callback);
    };
  },

  emit(event, data) {
    (this._listeners[event] || []).forEach((cb) => {
      try { cb(data); } catch (err) { console.error(`[AppState] ${event} 回呼失敗：`, err); }
    });
  },
};

/* ============================================
   4. 認證
   ============================================ */
function toEmail(account) {
  if (!account) return '';
  return account.includes('@') ? account : `${account}${SUPERADMIN_DOMAIN}`;
}

export function isSuperAdmin(user) {
  return !!user && user.email === SUPERADMIN_EMAIL;
}

async function loginWithCustomAccount(account, password) {
  const cred = await signInWithEmailAndPassword(auth, toEmail(account), password);
  return cred.user;
}

export async function logout() {
  try { await signOut(auth); } catch (err) { console.warn('[auth] signOut 失敗：', err); }
  localStorage.removeItem(STORAGE_KEYS.FAMILY_ID);
  localStorage.removeItem(STORAGE_KEYS.FAMILY_NAME);
  location.hash = '#/';
  location.reload();
}

/* ============================================
   5. 路由表 + 頁面註冊介面
   ============================================ */
const ROUTES = {
  '/dashboard':   { title: '總覽儀表板',    icon: 'home' },
  '/input-center':{ title: '綜合輸入中心',  icon: 'pencil' },
  '/code-list':   { title: '編號對照清單',  icon: 'database' },
  '/insurance':   { title: '保險清單表',    icon: 'shield' },
  '/portfolio':   { title: '基金投資表',    icon: 'line-chart' },
  '/settlements': { title: '結算清單',      icon: 'clipboard-check' },
  '/finance':     { title: '銀行交易',      icon: 'landmark' },
  '/annual-report':{ title: '年度報表',     icon: 'bar-chart-3' },
  '/member-report':{ title: '成員收支明細',  icon: 'users' },
  '/settings':    { title: '系統設定',      icon: 'settings' },
  '/admin':       { title: '平台管理',      icon: 'server' },
};

const _pageLoaders = {};
let _currentPage = null;

export function registerPage(route, loader) {
  _pageLoaders[route] = loader;
}

/* ============================================
   6. 側邊欄群組（依角色過濾，沿用舊版結構）
   ============================================ */
const _ROLES_FAMILY = ['owner', 'member'];
const _ROLES_ALL    = ['owner', 'member', 'superadmin'];
const _ROLES_ADMIN  = ['superadmin'];

const SIDEBAR_GROUPS = [
  { key: 'overview',       label: '總覽',       icon: 'home',            defaultOpen: true,  roles: _ROLES_FAMILY,
    items: [{ icon: 'home', label: '總覽儀表板', route: '/dashboard' }] },
  { key: 'record',         label: '記錄中心',   icon: 'pencil',          defaultOpen: true,  roles: _ROLES_FAMILY,
    items: [
      { icon: 'pencil',   label: '綜合輸入中心', route: '/input-center' },
      { icon: 'database', label: '編號對照清單', route: '/code-list' },
    ] },
  { key: 'insurance-fund', label: '保險與基金', icon: 'shield',          defaultOpen: false, roles: _ROLES_FAMILY,
    items: [
      { icon: 'shield',     label: '保險清單表', route: '/insurance' },
      { icon: 'line-chart', label: '基金投資表', route: '/portfolio' },
    ] },
  { key: 'settle',         label: '對帳',       icon: 'clipboard-check', defaultOpen: false, roles: _ROLES_FAMILY,
    items: [{ icon: 'clipboard-check', label: '結算清單', route: '/settlements' }] },
  { key: 'assets',         label: '資產',       icon: 'landmark',        defaultOpen: false, roles: _ROLES_FAMILY,
    items: [{ icon: 'landmark', label: '銀行交易', route: '/finance' }] },
  { key: 'reports',        label: '報表',       icon: 'bar-chart-3',     defaultOpen: false, roles: _ROLES_FAMILY,
    items: [
      { icon: 'bar-chart-3', label: '年度報表', route: '/annual-report' },
      { icon: 'users',       label: '成員收支明細', route: '/member-report' },
    ] },
  { key: 'platform',       label: '平台管理',   icon: 'server',          defaultOpen: true,  roles: _ROLES_ADMIN,
    items: [{ icon: 'home', label: '家庭管理', route: '/admin' }] },
  { key: 'system',         label: '系統',       icon: 'settings',        defaultOpen: false, roles: _ROLES_ALL,
    items: [{ icon: 'settings', label: '系統設定', route: '/settings' }] },
];

function getSidebarGroupsByRole(role) {
  if (!role) return SIDEBAR_GROUPS.filter((g) => (g.roles || []).includes('owner'));
  return SIDEBAR_GROUPS.filter((g) => (g.roles || []).includes(role));
}

/* ============================================
   7. 視圖切換
   ============================================ */
function showView(viewId) {
  ['auth-view', 'loading-view', 'app-view', 'error-view'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === viewId ? '' : 'none';
  });
}

function showError(msg) {
  const el = document.getElementById('error-message');
  if (el) el.textContent = msg;
  showView('error-view');
}

/* ============================================
   8. 登入畫面
   ============================================ */
function bindLoginForm() {
  const form = document.getElementById('login-form');
  const errBox = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  if (!form || form.__bound) return;
  form.__bound = true;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.style.display = 'none';
    btn.disabled = true;
    btn.textContent = '登入中…';
    const account = document.getElementById('account').value.trim();
    const password = document.getElementById('password').value;
    try {
      const user = await loginWithCustomAccount(account, password);
      AppState.setUser(user);
      AppState.setSuperAdmin(isSuperAdmin(user));
      /* 後續由 onAuthStateChanged 接手 */
    } catch (err) {
      console.error(err);
      errBox.textContent = '登入失敗：帳號或密碼錯誤';
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.textContent = '登入';
    }
  });
}

/* ============================================
   9. 渲染 sidebar / navbar
   ============================================ */
function renderSidebar() {
  const navEl = document.getElementById('sidebar-nav');
  if (!navEl) return;

  const role = AppState.getRole();
  const groups = getSidebarGroupsByRole(role);

  let openSet;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SIDEBAR_GROUPS);
    openSet = raw ? new Set(JSON.parse(raw)) : new Set(groups.filter((g) => g.defaultOpen).map((g) => g.key));
  } catch (e) {
    openSet = new Set(groups.filter((g) => g.defaultOpen).map((g) => g.key));
  }

  const currentHash = location.hash.replace(/^#/, '') || '/dashboard';
  const groupsHtml = groups.map((g) => {
    const isOpen = openSet.has(g.key);
    const arrow = isOpen ? 'chevron-down' : 'chevron-right';
    const itemsHtml = g.items.map((it) => {
      const active = it.route === currentHash ? 'active' : '';
      return `<a class="nav-item ${active}" href="#${it.route}" data-route="${it.route}">
        <i data-lucide="${it.icon}" class="nav-icon"></i>
        <span class="nav-label">${it.label}</span>
      </a>`;
    }).join('');
    return `<div class="nav-group" data-group="${g.key}">
      <div class="nav-group-title collapsible ${isOpen ? 'open' : ''}" data-group-toggle="${g.key}">
        <span class="nav-group-label">
          <i data-lucide="${g.icon}" class="nav-group-icon"></i>
          <span>${g.label}</span>
        </span>
        <i data-lucide="${arrow}" class="nav-group-arrow"></i>
      </div>
      <div class="nav-group-body" style="display:${isOpen ? 'block' : 'none'};">${itemsHtml}</div>
    </div>`;
  }).join('');

  navEl.innerHTML = groupsHtml;

  navEl.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-group-toggle]');
    if (toggle) {
      e.preventDefault();
      const key = toggle.dataset.groupToggle;
      const groupEl = navEl.querySelector(`[data-group="${key}"]`);
      if (!groupEl) return;
      const body = groupEl.querySelector('.nav-group-body');
      const title = groupEl.querySelector('.nav-group-title');
      const arrow = title.querySelector('.nav-group-arrow');
      const isOpen = body.style.display === 'block';
      body.style.display = isOpen ? 'none' : 'block';
      title.classList.toggle('open', !isOpen);
      if (arrow) arrow.setAttribute('data-lucide', isOpen ? 'chevron-right' : 'chevron-down');
      if (isOpen) openSet.delete(key); else openSet.add(key);
      try { localStorage.setItem(STORAGE_KEYS.SIDEBAR_GROUPS, JSON.stringify([...openSet])); } catch (err) {}
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    const link = e.target.closest('.nav-item');
    if (link && window.innerWidth < 640) {
      document.querySelector('.sidebar')?.classList.remove('mobile-open');
      document.getElementById('sidebar-backdrop')?.classList.remove('active');
    }
  });

  if (window.lucide) window.lucide.createIcons();
}

function renderNavbar() {
  const titleEl = document.getElementById('navbar-title');
  const userEl = document.getElementById('navbar-user');
  const dbTag = document.getElementById('navbar-db-tag');
  const themeBtn = document.getElementById('navbar-theme-btn');

  const currentHash = location.hash.replace(/^#/, '') || '/dashboard';
  const route = ROUTES[currentHash];
  if (titleEl) titleEl.textContent = route ? route.title : '';

  if (dbTag) {
    const label = DB_LABELS[DB_TARGET] || DB_TARGET;
    dbTag.textContent = `DB: ${label}`;
    dbTag.classList.toggle('new', DB_TARGET === 'new');
  }

  if (userEl) {
    const user = AppState.currentUser;
    const dn = AppState.getDisplayName() || (user?.email?.split('@')[0] || '');
    const role = AppState.getRole();
    const roleBadge = role === 'superadmin'
      ? ' <span class="badge badge-magenta" style="font-size:10px;">超級管理員</span>'
      : (role === 'owner' ? ' <span class="badge badge-info" style="font-size:10px;">👑</span>' : '');
    userEl.innerHTML = user ? `<span class="navbar-user-text">👤 ${dn}${roleBadge}</span>` : '';
  }

  if (themeBtn && !themeBtn.__bound) {
    themeBtn.__bound = true;
    themeBtn.addEventListener('click', () => {
      AppState.toggleTheme();
      const icon = AppState.getTheme() === 'dark' ? 'sun' : 'moon';
      themeBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
      if (window.lucide) window.lucide.createIcons();
    });
  }
  const themeIcon = AppState.getTheme() === 'dark' ? 'sun' : 'moon';
  if (themeBtn) themeBtn.innerHTML = `<i data-lucide="${themeIcon}"></i>`;

  if (window.lucide) window.lucide.createIcons();
}

function bindShellEvents() {
  const hamburger = document.getElementById('hamburger-btn');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (hamburger && !hamburger.__bound) {
    hamburger.__bound = true;
    hamburger.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;
      if (window.innerWidth < 640) {
        sidebar.classList.toggle('mobile-open');
        backdrop?.classList.toggle('active');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });
  }
}

/* ============================================
   10. 路由分派
   ============================================ */
async function renderPage(route) {
  const content = document.getElementById('page-content');
  if (!content) return;

  /* 清理上一頁 */
  if (_currentPage && typeof _currentPage.destroy === 'function') {
    try { _currentPage.destroy(); } catch (e) { console.warn('[router] destroy 失敗：', e); }
  }
  _currentPage = null;
  content.innerHTML = '';

  const routeDef = ROUTES[route];
  if (!routeDef) {
    content.innerHTML = `<div class="glass-card"><div class="empty-state">未知的路由：${route}</div></div>`;
    return;
  }

  /* 權限檢查 */
  if (route === '/admin' && !AppState.isSuperAdmin) {
    content.innerHTML = `<div class="glass-card"><div class="empty-state">無權限存取</div></div>`;
    return;
  }

  const loader = _pageLoaders[route];
  if (typeof loader !== 'function') {
    content.innerHTML = `<div class="glass-card"><div class="empty-state">
      <p style="font-size:16px; margin-bottom:8px;">${routeDef.title}</p>
      <p style="font-size:13px;">載入中…（第 2、3 回交付後可用）</p>
    </div></div>`;
    return;
  }

  try {
    _currentPage = await loader(content, { AppState });
  } catch (err) {
    console.error(`[router] 頁面載入失敗 ${route}：`, err);
    content.innerHTML = `<div class="glass-card"><div class="empty-state text-red">
      頁面載入失敗：${err.message || err}
    </div></div>`;
  }
}

function handleRouteChange() {
  const route = location.hash.replace(/^#/, '') || '/dashboard';
  if (!location.hash) {
    location.replace('#/dashboard');
    return;
  }
  renderNavbar();
  renderPage(route);
  /* 更新側邊欄 active 狀態 */
  document.querySelectorAll('.nav-item').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === route);
  });
}

/* ============================================
   11. 啟動序列
   ============================================ */
async function boot(user) {
  showView('loading-view');
  const loadingMsg = document.getElementById('loading-message');

  try {
    AppState.init();
    AppState.setUser(user);
    AppState.setSuperAdmin(isSuperAdmin(user));

    if (isSuperAdmin(user)) {
      AppState.setRole('superadmin');
      AppState.setCanInput(true);
      AppState.setDisplayName('超級管理員');
    } else {
      /* 第 2 回接入 app-data.js 的 lookupFamily；先以最小資訊渲染 */
      AppState.setRole('member');
      AppState.setCanInput(true);
      AppState.setDisplayName(user.email?.split('@')[0] || '成員');
      AppState.setMemberAccount({
        email: user.email || '',
        displayName: AppState.getDisplayName(),
        role: 'member',
        canInput: true,
      });
    }

    if (loadingMsg) loadingMsg.textContent = '渲染中…';

    showView('app-view');
    renderSidebar();
    renderNavbar();
    bindShellEvents();

    if (!location.hash) location.replace('#/dashboard');
    handleRouteChange();

    window.addEventListener('hashchange', handleRouteChange);
  } catch (err) {
    console.error('[boot] 失敗：', err);
    showError(String(err.message || err));
  }
}

/* ============================================
   12. 入口
   ============================================ */
function init() {
  showView('loading-view');
  bindLoginForm();

  document.getElementById('error-retry-btn')?.addEventListener('click', () => location.reload());

  onAuthStateChanged(auth, (user) => {
    if (user) {
      boot(user);
    } else {
      AppState.currentUser = null;
      showView('auth-view');
      bindLoginForm();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* 對外匯出（第 2/3 回使用） */
export { ROUTES, STORAGE_KEYS, DB_LABELS, auth, firebaseApp };