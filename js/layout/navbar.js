// ============================================
// navbar.js — 頂部導覽列（v103.0.42）
// 位置：js/layout/navbar.js
// ============================================
// v103.0.42（B30-3b）：
//   ✅ 加 DB 標籤（顯示當前連哪個 DB）
//   ✅ 加主題切換按鈕
// ============================================

import { AppState } from '../core/state.js';
import { getDisplayName } from '../core/auth.js';
import { ROUTES, ROLES, DB_TARGET, getDbLabel } from '../config/constants.js';
import { esc } from '../lib/dom.js';
import { toggleSidebar } from './sidebar.js';

let _eventBound = false;
let _unsubscribeUserChange = null;
let _unsubscribeFamilyChange = null;
let _unsubscribeMemberAccountChange = null;
let _unsubscribeThemeChange = null;
let _currentActiveHref = '';
let _hamburgerHandler = null;
let _themeHandler = null;

export function renderNavbar(containerId = 'navbar-root', title = '', activeHref = '') {
  const root = document.getElementById(containerId);
  if (!root) return;

  _currentActiveHref = activeHref;
  root.classList.add('navbar');
  const isSuper = AppState.isSuperAdmin;

  const adminBtn = isSuper
    ? `<a href="${ROUTES.ADMIN}" class="btn btn-sm btn-ghost" title="平台管理" style="padding:6px 10px;">
         <i data-lucide="settings" style="width:16px;height:16px;"></i>
       </a>`
    : '';

  /* DB 標籤 */
  const dbClass = DB_TARGET === 'new' ? 'navbar-db-tag navbar-db-tag-new' : 'navbar-db-tag';
  const dbHtml = `<span class="${dbClass}" title="當前連線資料庫">DB: ${esc(getDbLabel())}</span>`;

  /* 主題按鈕 */
  const theme = AppState.getTheme();
  const themeIcon = theme === 'dark' ? 'sun' : 'moon';
  const themeHtml = `<button type="button" class="navbar-theme-btn" id="navbar-theme-btn" aria-label="切換主題" title="切換主題">
    <i data-lucide="${themeIcon}" style="width:16px;height:16px;"></i>
  </button>`;

  root.innerHTML = `
    <button type="button" class="hamburger" id="hamburger-btn" aria-label="切換選單">
      <i data-lucide="menu"></i>
    </button>
    <div class="navbar-title">${esc(title)}</div>
    ${adminBtn}
    <div class="navbar-right">
      ${dbHtml}
      ${themeHtml}
      <div class="navbar-user" id="navbar-user"></div>
    </div>
  `;

  _renderUserInfo();
  _renderThemeIcon();

  if (!_eventBound) {
    _eventBound = true;
    _bindGlobalEvents(root);
  }

  if (window.lucide) window.lucide.createIcons();
}

function _renderUserInfo() {
  const box = document.getElementById('navbar-user');
  if (!box) return;

  const user = AppState.currentUser;
  if (!user) { box.innerHTML = ''; return; }

  const displayName = AppState.getDisplayName() || getDisplayName(user);
  const familyName = AppState.getFamilyName();
  const role = AppState.getRole();
  const canInput = AppState.getCanInput();
  const familyTag = familyName ? ` · ${familyName}` : '';

  let roleBadge = '';
  if (role === ROLES.SUPERADMIN) {
    roleBadge = ' <span class="badge badge-magenta" style="font-size:10px;">超級管理員</span>';
  } else if (role === ROLES.OWNER) {
    roleBadge = ' <span class="badge badge-info" style="font-size:10px;">👑</span>';
  } else if (role === ROLES.MEMBER) {
    roleBadge = ' <span class="badge badge-muted" style="font-size:10px;">成員</span>';
  }

  const readonlyBadge = (!canInput && role !== ROLES.SUPERADMIN)
    ? ' <span class="badge badge-pending" style="font-size:10px;">唯讀</span>'
    : '';

  box.innerHTML = `
    <span class="mono navbar-user-text" style="font-size:12px; color:var(--text-muted);">
      👤 ${esc(displayName)}${esc(familyTag)}${roleBadge}${readonlyBadge}
    </span>
  `;
}

function _renderThemeIcon() {
  const btn = document.getElementById('navbar-theme-btn');
  if (!btn) return;
  const theme = AppState.getTheme();
  const icon = theme === 'dark' ? 'sun' : 'moon';
  btn.innerHTML = `<i data-lucide="${icon}" style="width:16px;height:16px;"></i>`;
  if (window.lucide) window.lucide.createIcons();
}

function _bindGlobalEvents(root) {
  _hamburgerHandler = (e) => {
    if (!e.target.closest('#hamburger-btn')) return;
    e.preventDefault();
    e.stopPropagation();
    toggleSidebar();
  };
  root.addEventListener('click', _hamburgerHandler);

  _themeHandler = (e) => {
    if (!e.target.closest('#navbar-theme-btn')) return;
    e.preventDefault();
    AppState.toggleTheme();
    _renderThemeIcon();
  };
  root.addEventListener('click', _themeHandler);

  if (_unsubscribeUserChange) { try { _unsubscribeUserChange(); } catch (err) { /* noop */ } }
  _unsubscribeUserChange = AppState.on('user-change', () => _renderUserInfo());

  if (_unsubscribeFamilyChange) { try { _unsubscribeFamilyChange(); } catch (err) { /* noop */ } }
  _unsubscribeFamilyChange = AppState.on('family-change', () => _renderUserInfo());

  if (_unsubscribeMemberAccountChange) { try { _unsubscribeMemberAccountChange(); } catch (err) { /* noop */ } }
  _unsubscribeMemberAccountChange = AppState.on('member-account-change', () => _renderUserInfo());

  if (_unsubscribeThemeChange) { try { _unsubscribeThemeChange(); } catch (err) { /* noop */ } }
  _unsubscribeThemeChange = AppState.on('theme-change', () => _renderThemeIcon());
}

export function setNavbarTitle(title) {
  const el = document.querySelector('.navbar-title');
  if (el) el.textContent = title || '';
}

export function refreshNavbarUser() { _renderUserInfo(); }

export function destroyNavbar() {
  if (_unsubscribeUserChange) { try { _unsubscribeUserChange(); } catch (err) { /* noop */ } _unsubscribeUserChange = null; }
  if (_unsubscribeFamilyChange) { try { _unsubscribeFamilyChange(); } catch (err) { /* noop */ } _unsubscribeFamilyChange = null; }
  if (_unsubscribeMemberAccountChange) { try { _unsubscribeMemberAccountChange(); } catch (err) { /* noop */ } _unsubscribeMemberAccountChange = null; }
  if (_unsubscribeThemeChange) { try { _unsubscribeThemeChange(); } catch (err) { /* noop */ } _unsubscribeThemeChange = null; }

  const root = document.getElementById('navbar-root');
  if (root) {
    if (_hamburgerHandler) { try { root.removeEventListener('click', _hamburgerHandler); } catch (e) { /* noop */ } }
    if (_themeHandler) { try { root.removeEventListener('click', _themeHandler); } catch (e) { /* noop */ } }
  }
  _hamburgerHandler = null;
  _themeHandler = null;
  _eventBound = false;
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/layout/navbar.js
   Version: v103.0.42
   Batch: B30-3b
   ═══════════════════════════════════════════ */