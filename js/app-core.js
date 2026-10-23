// ============================================
// app-core.js — 狀態路由與核心啟動
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { render } from './app-ui.js';

export const FIREBASE_CONFIGS = {
  old: { apiKey: "AIzaSyCQlrNdorKJI9xsqr4m4ME046lrubo9Y7I", authDomain: "family-fin-a6dd1.firebaseapp.com", databaseURL: "https://family-fin-a6dd1-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "family-fin-a6dd1", storageBucket: "family-fin-a6dd1.firebasestorage.app", messagingSenderId: "382147296734", appId: "1:382147296734:web:42bdbd7401001e75e1f14f" },
  new: { apiKey: "AIzaSyBJCK83RQyHbol4yJ4UDo3pOUXpUgcW9hU", authDomain: "family-3d0a5.firebaseapp.com", databaseURL: "https://family-3d0a5-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "family-3d0a5", storageBucket: "family-3d0a5.firebasestorage.app", messagingSenderId: "109775445681", appId: "1:109775445681:web:84e974db35951d0a6ecc90" },
};

const DB_TARGET = localStorage.getItem('fin_db_target') || 'new';
export const firebaseApp = initializeApp(FIREBASE_CONFIGS[DB_TARGET]);
export const auth = getAuth(firebaseApp);
export const SUPERADMIN_EMAIL = 'superadmin@familyfin.local';

export const AppState = {
  currentUser: null, isSuperAdmin: false, currentFamilyId: '', currentFamilyName: '',
  role: '', canInput: false, displayName: '', memberAccount: null, currentMemberId: '',
  year: new Date().getFullYear().toString(), month: 'all', currentView: 'table',
  _listeners: {},
  init() {
    this.year = localStorage.getItem('fin_year') || this.year;
    this.month = localStorage.getItem('fin_month') || this.month;
    this.currentFamilyId = localStorage.getItem('fin_family_id') || '';
    this.currentFamilyName = localStorage.getItem('fin_family_name') || '';
  },
  setUser(u) { this.currentUser = u; this.emit('user-change'); },
  setFamily(id, name) { this.currentFamilyId = id; this.currentFamilyName = name; localStorage.setItem('fin_family_id', id); localStorage.setItem('fin_family_name', name); this.emit('family-change'); },
  setRole(r) { this.role = r; this.emit('role-change'); },
  setCanInput(v) { this.canInput = v; this.emit('permission-change'); },
  setMemberAccount(a) { this.memberAccount = a; if (a) { this.role = a.role || this.role; this.canInput = a.canInput !== false; this.displayName = a.displayName || ''; this.currentMemberId = a.memberId || ''; } this.emit('account-change'); },
  setYearMonth(y, m) { this.year = String(y); this.month = String(m); localStorage.setItem('fin_year', y); localStorage.setItem('fin_month', m); this.emit('ym-change'); },
  getYearMonth() { return { year: this.year, month: this.month }; },
  on(evt, cb) { if (!this._listeners[evt]) this._listeners[evt] = []; this._listeners[evt].push(cb); return () => { this._listeners[evt] = this._listeners[evt].filter(f => f !== cb); }; },
  emit(evt) { (this._listeners[evt] || []).forEach(cb => cb()); },
};

export const ROUTES = {
  '/dashboard': '總覽儀表板', '/input-center': '綜合輸入中心', '/code-list': '編號對照清單',
  '/insurance': '保險清單表', '/portfolio': '基金投資表', '/settlements': '結算清單',
  '/finance': '銀行交易', '/annual-report': '年度報表', '/member-report': '成員收支明細',
  '/settings': '系統設定', '/admin': '平台管理'
};

const _pageLoaders = {};
let _currentPageUnsub = null;

export function registerPage(route, mountFn) { _pageLoaders[route] = mountFn; }

export function navigate(route) {
  if (!route) route = '#/dashboard';
  const path = route.replace('#', '');
  
  // 清理舊頁面
  if (_currentPageUnsub) { _currentPageUnsub(); _currentPageUnsub = null; }
  
  // 更新側邊欄 active
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('href') === '#' + path);
  });
  
  // 更新標題
  const titleEl = document.getElementById('navbar-title');
  if (titleEl) titleEl.textContent = ROUTES[path] || '';

  // 權限檢查
  if (path === '/admin' && !AppState.isSuperAdmin) {
    render('page-content', '<div class="mecha-panel"><div class="mecha-content text-red">無權限存取</div></div>');
    return;
  }

  const mount = _pageLoaders[path];
  if (typeof mount === 'function') {
    _currentPageUnsub = mount(document.getElementById('page-content'));
  } else {
    render('page-content', `<div class="mecha-panel"><div class="mecha-content">載入失敗：${path}</div></div>`);
  }
}

export async function login(account, password) {
  const email = account.includes('@') ? account : `${account}@familyfin.local`;
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
  localStorage.removeItem('fin_family_id');
  localStorage.removeItem('fin_family_name');
  location.reload();
}

export function isSuperAdmin(user) { return user && user.email === SUPERADMIN_EMAIL; }

// 渲染側邊欄
function renderSidebar() {
  const navEl = document.getElementById('sidebar-nav');
  if (!navEl) return;
  const isSuper = AppState.isSuperAdmin;
  
  const groups = isSuper ? [
    { label: '平台', items: [ { path: '/admin', label: '家庭管理' }, { path: '/settings', label: '系統設定' } ] }
  ] : [
    { label: '記錄', items: [ { path: '/dashboard', label: '儀表板' }, { path: '/input-center', label: '輸入中心' }, { path: '/code-list', label: '編號清單' } ] },
    { label: '保險', items: [ { path: '/insurance', label: '保險清單' }, { path: '/portfolio', label: '基金投資' } ] },
    { label: '對帳', items: [ { path: '/settlements', label: '結算清單' }, { path: '/finance', label: '銀行交易' } ] },
    { label: '報表', items: [ { path: '/annual-report', label: '年度報表' }, { path: '/member-report', label: '成員明細' } ] },
    { label: '系統', items: [ { path: '/settings', label: '系統設定' } ] }
  ];

  let html = `<div class="sidebar-logo">[ FAMILY.FIN ]</div>`;
  groups.forEach(g => {
    html += `<div class="nav-group-title">${g.label}</div>`;
    g.items.forEach(it => {
      html += `<a class="nav-item" href="#${it.path}">${it.label}</a>`;
    });
  });
  render(navEl, html);
}

// 渲染導覽列
function renderNavbar() {
  const navEl = document.getElementById('navbar-root');
  if (!navEl) return;
  const user = AppState.currentUser;
  const role = AppState.role === 'superadmin' ? '管理員' : AppState.role;
  const html = `
    <button class="btn btn-ghost" id="hamburger-btn" style="display:none; padding:4px 8px;">≡</button>
    <div id="navbar-title" style="flex:1; font-family:var(--font-mono); font-size:16px; color:var(--primary);"></div>
    <div style="font-family:var(--font-mono); font-size:12px; color:var(--text-muted);">
      [ USER: ${user?.email?.split('@')[0] || '---'} | ROLE: ${role} ]
    </div>
    <button class="btn btn-ghost" onclick="import('./app-core.js').then(m=>m.logout())" style="margin-left:16px;">登出</button>
  `;
  render(navEl, html);
  
  // 手機版選單邏輯
  const ham = document.getElementById('hamburger-btn');
  if (window.innerWidth < 768) ham.style.display = 'block';
  ham?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('mobile-open');
  });
}

// 啟動
function init() {
  AppState.init();
  
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.textContent = '登入中...';
    try {
      await login(document.getElementById('account').value, document.getElementById('password').value);
    } catch (err) {
      const errEl = document.getElementById('login-error');
      errEl.textContent = '登入失敗：帳號或密碼錯誤';
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = '登入';
    }
  });

  onAuthStateChanged(auth, async (user) => {
    const views = ['auth-view', 'loading-view', 'app-view'];
    if (user) {
      views.forEach(v => document.getElementById(v).style.display = 'none');
      document.getElementById('loading-view').style.display = 'flex';
      
      AppState.setUser(user);
      const isSuper = isSuperAdmin(user);
      
      if (isSuper) {
        AppState.setFamily('', '系統平台');
        AppState.setRole('superadmin');
        AppState.setCanInput(true);
        AppState.isSuperAdmin = true;
        bootApp();
      } else {
        // 呼叫後端取得家庭資訊
        try {
          const token = await user.getIdToken();
          const res = await fetch('/api/lookup-family', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
          const data = await res.json();
          if (data.ok && data.familyId) {
            AppState.setFamily(data.familyId, data.familyName);
            AppState.setMemberAccount(data.memberAccount);
            AppState.isSuperAdmin = false;
            bootApp();
          } else {
            alert('無法取得家庭資訊，請聯繫管理員');
            await logout();
          }
        } catch (err) {
          alert('網路錯誤，請重試');
          await logout();
        }
      }
    } else {
      AppState.currentUser = null;
      views.forEach(v => document.getElementById(v).style.display = 'none');
      document.getElementById('auth-view').style.display = 'flex';
    }
  });
}

async function bootApp() {
  document.getElementById('loading-view').style.display = 'none';
  document.getElementById('app-view').style.display = 'flex';
  
  renderSidebar();
  renderNavbar();
  
  // 初始化路由與載入器
  await import('./app-pages-loader.js');
  
  window.addEventListener('hashchange', () => navigate(location.hash));
  navigate(location.hash || '#/dashboard');
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

/* ═══ EOF ═══
F: js/app-core.js
V: 1792800001
W: webapp-20261023-001#21
═══ */