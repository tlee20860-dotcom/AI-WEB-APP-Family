// ============================================
// layout.js — SPA 骨架與導覽（V2 重構版）
// 位置：ui/layout.js
// 說明：負責渲染 Sidebar、Navbar 與 Content 容器。
//       整合了舊版的 app-shell, sidebar, navbar。
// ============================================

import { AppState } from '../config/state.js';
import { SIDEBAR_GROUPS, getSidebarGroupsByRole, ROLES, STORAGE_KEYS } from '../config/constants.js';
import { logout } from '../domain/auth.js';
import { esc } from './format.js';

let _containerId = '';
let _isMobileOpen = false;

/* ============================================
   1. 主入口
   ============================================ */
export function initLayout(containerId = 'app-root') {
  _containerId = containerId;
  const root = document.getElementById(_containerId);
  if (!root) {
    console.error(`[layout] 找不到容器 #${_containerId}`);
    return;
  }

  _renderShell(root);
  _bindGlobalEvents();
  updateNavbar();
  updateSidebarActive(window.location.hash.replace('#', '') || '/dashboard');

  // 隱藏載入畫面
  const loading = document.getElementById('app-loading');
  if (loading) loading.style.display = 'none';
  root.style.display = 'block';
}

/* ============================================
   2. 渲染骨架
   ============================================ */
function _renderShell(root) {
  root.innerHTML = `
    <div class="app-shell">
      <!-- 手機版遮罩 -->
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      
      <!-- 側邊欄 -->
      <aside class="sidebar" id="app-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">◈ FAMILY.FIN V2</div>
        </div>
        <nav class="sidebar-nav" id="app-sidebar-nav">
          <!-- 由 updateSidebar 動態生成 -->
        </nav>
      </aside>

      <!-- 主要區域 -->
      <div class="main-area">
        <header class="navbar">
          <button type="button" class="hamburger" id="app-hamburger">
            <i data-lucide="menu"></i>
          </button>
          
          <div class="navbar-title" id="app-navbar-title"></div>
          
          <div class="navbar-right" style="display:flex; align-items:center; gap:12px; margin-left:auto;">
            <span id="app-navbar-db" style="font-size:11px; padding:4px 8px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:12px; color:var(--text-muted); font-family:var(--font-mono);"></span>
            <button type="button" class="btn" id="app-theme-toggle" style="padding:6px; background:transparent; border:none; color:var(--text-secondary);">
              <i data-lucide="moon" style="width:18px;height:18px;"></i>
            </button>
            <div id="app-user-info" style="font-size:13px; color:var(--text-secondary); display:flex; align-items:center; gap:6px;"></div>
          </div>
        </header>

        <main class="content" id="app-content">
          <!-- 頁面動態注入 -->
        </main>
      </div>
    </div>
  `;

  _updateSidebarNav();
  if (window.lucide) window.lucide.createIcons();
}

/* ============================================
   3. 更新 Navbar (使用者、主題、標題)
   ============================================ */
export function updateNavbar() {
  const titleEl = document.getElementById('app-navbar-title');
  const userEl = document.getElementById('app-user-info');
  const dbEl = document.getElementById('app-navbar-db');
  const themeBtn = document.getElementById('app-theme-toggle');

  if (titleEl && AppState.currentFamilyName) {
    titleEl.textContent = AppState.currentFamilyName;
  }

  if (userEl) {
    const name = AppState.getDisplayName() || '訪客';
    const role = AppState.getRole();
    let badge = '';
    if (role === ROLES.SUPERADMIN) badge = '<span class="badge badge-magenta">管理員</span>';
    else if (role === ROLES.OWNER) badge = '<span class="badge badge-info">👑 擁有者</span>';
    
    userEl.innerHTML = `
      <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px;">${esc(name)}</span>
      ${badge}
      <button type="button" id="app-logout-btn" style="background:none; border:none; color:var(--accent-danger); cursor:pointer; padding:4px; margin-left:4px;" title="登出">
        <i data-lucide="log-out" style="width:16px;height:16px;"></i>
      </button>
    `;
    
    document.getElementById('app-logout-btn')?.addEventListener('click', async () => {
      const { openConfirm } = await import('./modal.js');
      const ok = await openConfirm('確定要登出嗎？', { title: '登出' });
      if (ok) logout();
    });
  }

  if (dbEl) {
    // 僅在開發模式顯示 DB 目標
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === '1') {
      dbEl.textContent = `DB: ${params.get('db') === 'old' ? 'OLD' : 'NEW'}`;
      dbEl.style.display = 'inline-block';
    } else {
      dbEl.style.display = 'none';
    }
  }

  if (themeBtn) {
    const isDark = AppState.getTheme() === 'dark';
    themeBtn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}" style="width:18px;height:18px;"></i>`;
    // 確保事件不重複綁定
    themeBtn.onclick = () => {
      AppState.toggleTheme();
      updateNavbar(); // 更新圖示
    };
  }

  if (window.lucide) window.lucide.createIcons();
}

/* ============================================
   4. 更新 Sidebar (動態選單)
   ============================================ */
function _updateSidebarNav() {
  const navEl = document.getElementById('app-sidebar-nav');
  if (!navEl) return;

  const role = AppState.getRole();
  const groups = getSidebarGroupsByRole(role);

  navEl.innerHTML = groups.map((g) => {
    // 如果只有一個項目，就不顯示大分類標題，直接顯示連結
    if (g.items.length === 1) {
      const item = g.items[0];
      return `
        <a class="nav-item" href="#${item.path}" data-path="${item.path}">
          <i data-lucide="${item.icon}" class="nav-icon"></i>
          <span class="nav-label">${esc(item.label)}</span>
        </a>
      `;
    }

    // 多個項目：顯示摺疊標題
    return `
      <div class="nav-group">
        <div class="nav-group-title">
          <span class="nav-group-label">
            <i data-lucide="${g.icon}" class="nav-group-icon"></i>
            <span>${esc(g.label)}</span>
          </span>
        </div>
        <div class="nav-group-body">
          ${g.items.map((item) => `
            <a class="nav-item" href="#${item.path}" data-path="${item.path}" style="padding-left: 40px;">
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

/* ============================================
   5. 高亮當前選單
   ============================================ */
export function updateSidebarActive(currentPath) {
  const items = document.querySelectorAll('.sidebar-nav .nav-item');
  items.forEach((el) => {
    const path = el.getAttribute('data-path');
    if (currentPath === path || (currentPath === '/' && path === '/dashboard')) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

/* ============================================
   6. 替換主內容 (供 Router 呼叫)
   ============================================ */
export function setContent(html) {
  const contentEl = document.getElementById('app-content');
  if (contentEl) {
    contentEl.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }
}

export function setPageTitle(title) {
  document.title = `${title} | FAMILY.FIN V2`;
}

/* ============================================
   7. 事件綁定 (漢堡選單、路由切換)
   ============================================ */
function _bindGlobalEvents() {
  // 漢堡選單
  document.getElementById('app-hamburger')?.addEventListener('click', () => {
    _isMobileOpen = !_isMobileOpen;
    _toggleSidebar(_isMobileOpen);
  });

  // 遮罩點擊關閉
  document.getElementById('sidebar-backdrop')?.addEventListener('click', () => {
    _isMobileOpen = false;
    _toggleSidebar(false);
  });

  // Sidebar 連結點擊 (手機版點擊後自動關閉)
  document.getElementById('app-sidebar')?.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item') && window.innerWidth < 768) {
      _isMobileOpen = false;
      _toggleSidebar(false);
    }
  });

  // 監聽主題切換事件 (同步其他地方的變更)
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
V: 1792900420
W: ai-system-20261024-012#37
═══ EOF ═══ */