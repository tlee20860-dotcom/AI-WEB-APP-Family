// ============================================
// main.js — 系統啟動入口（V2 重構版）
// 位置：engine/main.js
// ============================================

import { auth } from '../config/firebase.js';
import { AppState } from '../config/state.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initAppConfig, watchConfigChanges } from '../config/app-config.js';
import { initEntityRegistry } from '../config/entity-registry.js';
import { isSuperAdmin } from '../domain/auth.js';
import { initLayout, updateNavbar } from '../ui/layout.js';
import { initRouter } from './router.js';
import { ROUTES, ROLES } from '../config/constants.js';
import { showToast } from '../ui/toast.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('[PWA] SW 失敗', err));
  });
}

async function bootstrap() {
  AppState.init();

  // 1. 先建立骨架
  initLayout('app-root');

  onAuthStateChanged(auth, async (user) => {
    const loadingEl = document.getElementById('app-loading');
    
    if (user) {
      AppState.setUser(user);
      const superAdmin = isSuperAdmin(user);
      AppState.setSuperAdmin(superAdmin);

      // 超級管理員登入：不查家庭，不載入家庭設定，直接去管理頁
      if (superAdmin) {
        AppState.setRole(ROLES.SUPERADMIN);
        AppState.setDisplayName('超級管理員');
        updateNavbar();
        
        let initialPath = window.location.hash.replace('#', '');
        // 若超管當前不在 admin 路由，強制轉向 admin
        if (!initialPath || initialPath === ROUTES.LOGIN || initialPath === ROUTES.DASHBOARD) {
          window.location.hash = ROUTES.ADMIN;
          initialPath = ROUTES.ADMIN;
        }
        if (loadingEl) loadingEl.style.display = 'none';
        initRouter(initialPath);
        return;
      }

      // 一般成員登入：查詢家庭
      let hasFamily = false;
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/lookup-family', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({})
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.familyId) {
            AppState.setFamily(data.familyId, data.familyName || '我的家庭');
            AppState.setMemberAccount(data.memberAccount);
            hasFamily = true;
          }
        } else {
          showToast(`載入家庭失敗 (${res.status})`, 'error');
        }
      } catch (err) {
        console.error('[main] 取得家庭資訊失敗：', err);
        showToast('網路異常，無法載入家庭資訊', 'error');
      }

      // 若一般成員無家庭，退回登入頁
      if (!hasFamily) {
        window.location.hash = ROUTES.LOGIN;
        if (loadingEl) loadingEl.style.display = 'none';
        initRouter(ROUTES.LOGIN);
        return;
      }

      // 初始化家庭相關配置與實體快取
      try {
        await initAppConfig();
        watchConfigChanges();
        initEntityRegistry();
      } catch (initErr) {
        console.error('[main] 設定初始化失敗：', initErr);
      }

      updateNavbar();
      
      // 一般成員決定初始路徑
      let initialPath = window.location.hash.replace('#', '');
      // 若一般成員誤入 admin 頁，強制轉向 dashboard
      if (!initialPath || initialPath === ROUTES.LOGIN || initialPath === ROUTES.ADMIN) {
        initialPath = ROUTES.DASHBOARD;
        window.location.hash = initialPath;
      }
      
      if (loadingEl) loadingEl.style.display = 'none';
      initRouter(initialPath);

    } else {
      // === 未登入 ===
      AppState.destroy();
      
      let initialPath = window.location.hash.replace('#', '');
      if (initialPath !== ROUTES.LOGIN) {
        initialPath = ROUTES.LOGIN;
        window.location.hash = initialPath;
      }
      if (loadingEl) loadingEl.style.display = 'none';
      initRouter(initialPath);
    }
  });
}

bootstrap().catch(err => {
  console.error('[main] 系統啟動失敗：', err);
  document.body.innerHTML = `<div style="padding:40px; text-align:center; color:var(--accent-danger);"><h2>系統啟動失敗</h2><p>${err.message}</p></div>`;
});

/* ═══ EOF ═══
F: engine/main.js
V: 1792901800
W: webapp-20261025-001#28
═══ */