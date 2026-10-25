// ============================================
// router.js — SPA 前端路由（V2 重構版）
// 位置：engine/router.js
// ============================================

import { ROUTES } from '../config/constants.js';
import { AppState } from '../config/state.js';
import { setContent, setPageTitle, updateSidebarActive } from '../ui/layout.js';

const ROUTES_MAP = {
  [ROUTES.DASHBOARD]:    { module: () => import('../pages/dashboard.js'),    title: '總覽儀表板', auth: true, family: true },
  [ROUTES.INPUT_CENTER]: { module: () => import('../pages/input-center.js'), title: '綜合輸入中心', auth: true, family: true },
  [ROUTES.CODE_LIST]:    { module: () => import('../pages/code-list.js'),    title: '編號對照清單', auth: true, family: true },
  [ROUTES.INSURANCE]:    { module: () => import('../pages/insurance.js'),    title: '保險清單表', auth: true, family: true },
  [ROUTES.PORTFOLIO]:    { module: () => import('../pages/portfolio.js'),    title: '基金投資表', auth: true, family: true },
  [ROUTES.BANK]:         { module: () => import('../pages/bank.js'),         title: '銀行交易', auth: true, family: true },
  [ROUTES.SETTLEMENTS]:  { module: () => import('../pages/settlements.js'),  title: '結算清單', auth: true, family: true },
  [ROUTES.ANNUAL_REPORT]:{ module: () => import('../pages/annual-report.js'),title: '年度報表', auth: true, family: true },
  [ROUTES.MEMBER_REPORT]:{ module: () => import('../pages/member-report.js'),title: '成員收支明細', auth: true, family: true },
  [ROUTES.SETTINGS]:     { module: () => import('../pages/settings.js'),     title: '系統設定', auth: true, family: false },
  [ROUTES.ADMIN]:        { module: () => import('../admin/admin.js'),        title: '平台管理', auth: true, family: false, role: 'superadmin' },
  [ROUTES.LOGIN]:        { module: () => import('../pages/login.js'),        title: '登入', auth: false, family: false },
};

let _currentPage = null;
let _isInitialized = false;

/**
 * 初始化路由
 * @param {string|boolean} initialPath - 若傳入字串，則強制執行該路徑；若傳 true，則依當前 hash 執行。
 */
export function initRouter(initialPath = null) {
  if (!_isInitialized) {
    window.addEventListener('hashchange', () => _handleRoute());
    _isInitialized = true;
  }
  
  if (typeof initialPath === 'string') {
    _handleRoute(initialPath);
  } else if (!window.location.hash) {
    window.location.hash = ROUTES.DASHBOARD;
  } else {
    _handleRoute();
  }
}

/**
 * 處理路由切換
 * @param {string|null} targetPath - 若為 null，則從 window.location.hash 取得。
 */
async function _handleRoute(targetPath = null) {
  // 確保 targetPath 是字串，防止 Event 物件傳入
  let path = typeof targetPath === 'string' ? targetPath : null;
  
  if (!path) {
    path = window.location.hash.replace('#', '') || ROUTES.DASHBOARD;
  }

  const routeConfig = ROUTES_MAP[path];
  
  if (!routeConfig) {
    _render404(path);
    return;
  }

  // 路由守衛
  if (routeConfig.auth && !AppState.currentUser) {
    window.location.hash = ROUTES.LOGIN;
    return;
  }
  
  if (routeConfig.family && !AppState.getFamilyId()) {
    window.location.hash = ROUTES.LOGIN;
    return;
  }
  
  if (routeConfig.role && AppState.getRole() !== routeConfig.role) {
    window.location.hash = ROUTES.DASHBOARD;
    return;
  }

  setPageTitle(routeConfig.title);
  updateSidebarActive(path);

  if (_currentPage && typeof _currentPage.destroy === 'function') {
    try { _currentPage.destroy(); } catch (e) { console.error('[router] 頁面銷毀失敗：', e); }
    _currentPage = null;
  }

  if (path !== ROUTES.LOGIN) {
    setContent('<div style="text-align:center; padding:40px; color:var(--text-muted);">載入中…</div>');
  }

  try {
    const module = await routeConfig.module();
    const page = module.default;

    if (!page || typeof page.render !== 'function') {
      throw new Error(`頁面模組 ${path} 未匯出 render 函數`);
    }

    _currentPage = page;
    await page.render();

  } catch (err) {
    console.error(`[router] 載入頁面 ${path} 失敗：`, err);
    setContent(`
      <div class="glass-card" style="text-align:center; padding:40px; margin:20px;">
        <h2 style="color:var(--accent-danger); margin-bottom:12px;">載入失敗</h2>
        <p class="text-muted">${err.message}</p>
        <p style="font-size:12px; margin-top:8px;">請檢查 Console 或重新整理頁面。</p>
      </div>
    `);
  }
}

function _render404(path) {
  setContent(`
    <div class="glass-card" style="text-align:center; padding:40px; margin:20px;">
      <h1 style="font-size:48px; color:var(--text-muted); margin-bottom:16px;">404</h1>
      <h2 style="color:var(--text-primary); margin-bottom:12px;">找不到頁面</h2>
      <p class="text-muted">路徑 ${path} 不存在。</p>
      <a href="#${ROUTES.DASHBOARD}" class="btn btn-primary" style="margin-top:20px; display:inline-flex;">返回首頁</a>
    </div>
  `);
}

/* ═══ EOF ═══
F: engine/router.js
V: 1792900830
W: ai-system-20261024-012#74
═══ EOF ═══ */