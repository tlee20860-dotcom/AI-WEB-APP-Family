// ============================================
// layout.js — SPA 骨架與導覽（V2 重構版）
// 位置：ui/layout.js
// ============================================

import { AppState } from '../config/state.js';
import { getSidebarGroupsByRole, ROLES, STORAGE_KEYS } from '../config/constants.js';
import { logout } from '../domain/auth.js';
import { esc } from './format.js';

let _containerId = '';
let _isMobileOpen = false;

export function initLayout(containerId = 'app-root') {
  _containerId = containerId;
  const root = document.getElementById(_containerId);
  if (!root) return;

  _renderShell(root);
  _bindGlobalEvents();
  updateNavbar();
  updateSidebarActive(window.location.hash.replace('#', '') || '/dashboard');

  const loading = document.getElementById('app-loading');
  if (loading) loading.style.display = 'none';
  root.style.display = 'block';
}

function _renderShell(root) {
  root.innerHTML = `
    <div class="app-shell">
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      
      <aside class="sidebar" id="app-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">◈ FAMILY.FIN</div>
        </div>
        <nav class="sidebar-nav" id="app-sidebar-nav"></nav>
      </aside>

      <div class="main-area">
        <header class="navbar">
          <button type="button" class="hamburger" id="app-hamburger">
            <i data-lucide="menu"></i>
          </button>
          
          <div class="navbar-title" id="app-navbar-title"></div>
          
          <div class="navbar-right">
            <span class="navbar-db-tag" id="app-navbar-db">DB: 2026-10-12-fam</span>
            <button type="button" class="navbar-theme-btn" id="app-theme-toggle">
              <i data-lucide="moon" style="width:18px;height:18px;"></i>
            </button>
            <div class="navbar-user" id="app-user-info"></div>
          </div>
        </header>

        <main class="content" id="app-content"></main>
      </div>
    </div>
  `;

  _updateSidebarNav();
  if (window.lucide) window.lucide.createIcons();
}

export function updateNavbar() {
  const titleEl = document.getElementById('app-navbar-title');
  const userEl = document.getElementById('app-user-info');
  const themeBtn = document.getElementById('app-theme-toggle');

  if (titleEl && AppState.currentFamilyName) {
    titleEl.textContent = AppState.currentFamilyName;
  }

  if (userEl) {
    const name = AppState.getDisplayName() || '訪客';
    const role = AppState.getRole();
    let badge = '';
    if (role === ROLES.SUPERADMIN) badge = '<span class="badge badge-danger" style="font-size:10px; padding:2px 6px;">管理員</span>';
    else if (role === ROLES.OWNER) badge = '<span class="badge badge-info" style="font-size:10px; padding:2px 6px;">👑 擁有者</span>';
    
    userEl.innerHTML = `
      <i data-lucide="user" style="width:16px;height:16px;"></i>
      <span style="white-space:nowrap;">${esc(name)}</span>
      ${badge}
      <button type="button" id="app-logout-btn" class="navbar-logout" title="登出">
        <i data-lucide="log-out" style="width:18px;height:18px;"></i>
      </button>
    `;
    
    document.getElementById('app-logout-btn')?.addEventListener('click', async () => {
      const { openConfirm } = await import('./modal.js');
      const ok = await openConfirm('確定要登出嗎？', { title: '登出' });
      if (ok) logout();
    });
  }

  if (themeBtn) {
    const isDark = AppState.getTheme() === 'dark';
    themeBtn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" style="width:18px;height:18px;"></i>`;
    themeBtn.onclick = () => {
      AppState.toggleTheme();
      updateNavbar();
    };
  }

  if (window.lucide) window.lucide.createIcons();
}

function _updateSidebarNav() {
  const navEl = document.getElementById('app-sidebar-nav');
  if (!navEl) return;

  const role = AppState.getRole();
  const groups = getSidebarGroupsByRole(role);

  navEl.innerHTML = groups.map((g) => {
    if (g.items.length === 1) {
      const item = g.items[0];
      return `
        <a class="nav-item root-item" href="#${item.path}" data-path="${item.path}">
          <i data-lucide="${item.icon}" class="nav-icon"></i>
          <span class="nav-label">${esc(item.label)}</span>
        </a>
      `;
    }

    return `
      <div class="nav-group">
        <div class="nav-group-title">
          <span class="nav-group-label">
            <i data-lucide="${g.icon}" class="nav-group-icon" style="width:16px;height:16px;"></i>
            <span>${esc(g.label)}</span>
          </span>
        </div>
        <div class="nav-group-body">
          ${g.items.map((item) => `
            <a class="nav-item" href="#${item.path}" data-path="${item.path}">
              <i data-lucide="${item.icon}" class="nav-icon"></i>
              <span class="nav-label">${esc(item.label)}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

export function updateSidebarActive(currentPath) {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach((el) => {
    const path = el.getAttribute('data-path');
    if (currentPath === path || (currentPath === '/' && path === '/dashboard')) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

export function setContent(html) {
  const contentEl = document.getElementById('app-content');
  if (contentEl) {
    contentEl.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }
}

export function setPageTitle(title) {
  document.title = `${title} | FAMILY.FIN`;
}

function _bindGlobalEvents() {
  document.getElementById('app-hamburger')?.addEventListener('click', () => {
    _isMobileOpen = !_isMobileOpen;
    _toggleSidebar(_isMobileOpen);
  });

  document.getElementById('sidebar-backdrop')?.addEventListener('click', () => {
    _isMobileOpen = false;
    _toggleSidebar(false);
  });

  document.getElementById('app-sidebar')?.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item') && window.innerWidth < 768) {
      _isMobileOpen = false;
      _toggleSidebar(false);
    }
  });

  AppState.on('theme-change', () => {
    updateNavbar();
  });
}

function _toggleSidebar(open) {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  
  if (open) {
    sidebar?.classList.add('mobile-open');
    backdrop?.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    sidebar?.classList.remove('mobile-open');
    backdrop?.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/* ═══ EOF ═══
F: ui/layout.js
V: 1792900750
W: ai-system-20261024-012#66
═══ EOF ═══ */