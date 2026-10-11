// ============================================
// navbar.js — 頂部導覽列（v103.0.27）
// 位置：js/layout/navbar.js
// ============================================
// v103.0.27（B26-3）：
//   ✅ 移除年月選擇器（改由各頁 page-controls 統一）
//   ✅ 移除 SHOW_YEAR_MONTH_PAGES 依賴
//   ✅ 移除 ym-change 訂閱
// ============================================

import { AppState } from '../core/state.js';
import { getDisplayName } from '../core/auth.js';
import { ROUTES, ROLES } from '../config/constants.js';
import { esc } from '../lib/dom.js';
import { toggleSidebar } from './sidebar.js';

let _eventBound = false;
let _unsubscribeUserChange = null;
let _unsubscribeFamilyChange = null;
let _unsubscribeMemberAccountChange = null;
let _currentActiveHref = '';
let _hamburgerHandler = null;

/* ============================================
   渲染頂部導覽列
   ============================================ */
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

  root.innerHTML = `
    <button type="button" class="hamburger" id="hamburger-btn" aria-label="切換選單">
      <i data-lucide="menu"></i>
    </button>
    <div class="navbar-title">${esc(title)}</div>
    ${adminBtn}
    <div class="navbar-user" id="navbar-user"></div>
  `;

  _renderUserInfo();

  if (!_eventBound) {
    _eventBound = true;
    _bindGlobalEvents(root);
  }

  if (window.lucide) window.lucide.createIcons();
}

/* ============================================
   使用者資訊
   ============================================ */
function _renderUserInfo() {
  const box = document.getElementById('navbar-user');
  if (!box) return;

  const user = AppState.currentUser;
  if (!user) {
    box.innerHTML = '';
    return;
  }

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
    <span class="mono navbar-user-text" style="font-size:12px; color:var(--text-muted); margin-right:10px;">
      👤 ${esc(displayName)}${esc(familyTag)}${roleBadge}${readonlyBadge}
    </span>
  `;
}

/* ============================================
   全域事件
   ============================================ */
function _bindGlobalEvents(root) {
  _hamburgerHandler = (e) => {
    if (!e.target.closest('#hamburger-btn')) return;
    e.preventDefault();
    e.stopPropagation();
    toggleSidebar();
  };
  root.addEventListener('click', _hamburgerHandler);

  if (_unsubscribeUserChange) { try { _unsubscribeUserChange(); } catch (err) { /* noop */ } }
  _unsubscribeUserChange = AppState.on('user-change', () => _renderUserInfo());

  if (_unsubscribeFamilyChange) { try { _unsubscribeFamilyChange(); } catch (err) { /* noop */ } }
  _unsubscribeFamilyChange = AppState.on('family-change', () => _renderUserInfo());

  if (_unsubscribeMemberAccountChange) { try { _unsubscribeMemberAccountChange(); } catch (err) { /* noop */ } }
  _unsubscribeMemberAccountChange = AppState.on('member-account-change', () => _renderUserInfo());
}

/* ============================================
   對外 API
   ============================================ */
export function setNavbarTitle(title) {
  const el = document.querySelector('.navbar-title');
  if (el) el.textContent = title || '';
}

export function refreshNavbarUser() {
  _renderUserInfo();
}

export function destroyNavbar() {
  if (_unsubscribeUserChange) { try { _unsubscribeUserChange(); } catch (err) { /* noop */ } _unsubscribeUserChange = null; }
  if (_unsubscribeFamilyChange) { try { _unsubscribeFamilyChange(); } catch (err) { /* noop */ } _unsubscribeFamilyChange = null; }
  if (_unsubscribeMemberAccountChange) { try { _unsubscribeMemberAccountChange(); } catch (err) { /* noop */ } _unsubscribeMemberAccountChange = null; }

  if (_hamburgerHandler) {
    const root = document.getElementById('navbar-root');
    if (root) {
      try { root.removeEventListener('click', _hamburgerHandler); } catch (e) { /* noop */ }
    }
    _hamburgerHandler = null;
  }

  _eventBound = false;
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/layout/navbar.js
   Version: v103.0.27
   Batch: B26-3
   ═══════════════════════════════════════════ */