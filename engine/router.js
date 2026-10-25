// ============================================
// router.js — SPA 前端路由（V2 重構版）
// 位置：engine/router.js
// 說明：監聽 URL Hash，動態載入對應的頁面模組。
//       整合了登入守衛與 404 處理。
// ============================================

import { ROUTES } from '../config/constants.js';
import { AppState } from '../config/state.js';
import { setContent, setPageTitle, updateSidebarActive } from '../ui/layout.js';
import { initAuthContext } from '../domain/auth.js';

// 路由表：將路徑映射到動態載入的模組
const ROUTES_MAP = {
  [ROUTES.DASHBOARD]:    { module: () => import('../pages/dashboard.js'),    title: '總覽儀表板', auth: true },
  [ROUTES.INPUT_CENTER]: { module: () => import('../pages/input-center.js'), title: '綜合輸入中心', auth: true },
  [ROUTES.CODE_LIST]:    { module: () => import('../pages/code-list.js'),    title: '編號對照清單', auth: true },
  [ROUTES.INSURANCE]:    { module: () => import('../pages/insurance.js'),    title: '保險清單表', auth: true },
  [ROUTES.PORTFOLIO]:    { module: () => import('../pages/portfolio.js'),    title: '基金投資表', auth: true },
  [ROUTES.BANK]:         { module: () => import('../pages/bank.js'),         title: '銀行交易', auth: true },
  [ROUTES.SETTLEMENTS]:  { module: () => import('../pages/settlements.js'),  title: '結算清單', auth: true },
  [ROUTES.ANNUAL_REPORT]:{ module: () => import('../pages/annual-report.js'),title: '年度報表', auth: true },
  [ROUTES.MEMBER_REPORT]:{ module: () => import('../pages/member-report.js'),title: '成員收支明細', auth: true },
  [ROUTES.SETTINGS]:     { module: () => import('../pages/settings.js'),     title: '系統設定', auth: true },
  [ROUTES.ADMIN]:        { module: () => import('../admin/admin.js'),        title: '平台管理', auth: true, role: 'superadmin' },
  [ROUTES.LOGIN]:        { module: () => import('../pages/login.js'),        title: '登入', auth: false },
};

let _currentPage = null;

/* ============================================
   1. 初始化與監聽
   ============================================ */
export function initRouter() {
  window.addEventListener('hashchange', _handleRoute);
  
  // 首次載入處理
  if (!window.location.hash) {
    window.location.hash = ROUTES.DASHBOARD;
  } else {
    _handleRoute();
  }
}

/* ============================================
   2. 路由分派
   ============================================ */
async function _handleRoute() {
  // 取得當前路徑（移除 # 號）
  const path = window.location.hash.replace('#', '') || ROUTES.DASHBOARD;
  
  // 尋找對應路由
  const routeConfig = ROUTES_MAP[path];
  
  if (!routeConfig) {
    _render404(path);
    return;
  }

  // 權限檢查
  if (routeConfig.auth && !AppState.currentUser) {
    window.location.hash = ROUTES.LOGIN;
    return;
  }
  if (routeConfig.role && AppState.getRole() !== routeConfig.role) {
    window.location.hash = ROUTES.DASHBOARD;
    return;
  }

  // 更新標題與選單高亮
  setPageTitle(routeConfig.title);
  updateSidebarActive(path);

  // 銷毀上一個頁面（如果有）
  if (_currentPage && typeof _currentPage.destroy === 'function') {
    try { _currentPage.destroy(); } catch (e) { console.error('[router] 頁面銷毀失敗：', e); }
    _currentPage = null;
  }

  // 渲染 Loading 畫面
  setContent('<div style="text-align:center; padding:40px; color:var(--text-muted);">載入中…</div>');

  try {
    // 動態載入模組
    const module = await routeConfig.module();
    const page = module.default;

    if (!page || typeof page.render !== 'function') {
      throw new Error(`頁面模組 ${path} 未匯出 render 函數`);
    }

    // 執行渲染
    _currentPage = page;
    await page.render();

  } catch (err) {
    console.error(`[router] 載入頁面 ${path} 失敗：`, err);
    setContent(`
      <div class="glass-card" style="text-align:center; padding:40px;">
        <h2 style="color:var(--accent-danger); margin-bottom:12px;">載入失敗</h2>
        <p class="text-muted">${err.message}</p>
        <p style="font-size:12px; margin-top:8px;">請檢查 Console 或重新整理頁面。</p>
      </div>
    `);
  }
}

/* ============================================
   3. 輔助功能
   ============================================ */
function _render404(path) {
  setContent(`
    <div class="glass-card" style="text-align:center; padding:40px;">
      <h1 style="font-size:48px; color:var(--text-muted); margin-bottom:16px;">404</h1>
      <h2 style="color:var(--text-primary); margin-bottom:12px;">找不到頁面</h2>
      <p class="text-muted">路徑 ${path} 不存在。</p>
      <a href="#${ROUTES.DASHBOARD}" class="btn btn-primary" style="margin-top:20px; display:inline-flex;">返回首頁</a>
    </div>
  `);
}

/**
 * 導航到指定路徑
 */
export function navigateTo(path) {
  if (!path.startsWith('/')) path = '/' + path;
  window.location.hash = path;
}

/* ═══ EOF ═══
F: engine/router.js
V: 1792900430
W: ai-system-20261024-012#38
═══ EOF ═══ */