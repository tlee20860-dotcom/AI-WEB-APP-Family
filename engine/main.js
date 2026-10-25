// ============================================
// main.js — 系統啟動入口（V2 重構版 - 除錯版）
// 位置：engine/main.js
// ============================================

import { auth } from '../config/firebase.js';
import { AppState } from '../config/state.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

  // 1. 先建立骨架 (確保 app-content 存在)
  initLayout('app-root');
  
  // 2. 初始化路由 (先不執行)
  initRouter(false);

  onAuthStateChanged(auth, async (user) => {
    const loadingEl = document.getElementById('app-loading');
    const sidebar = document.querySelector('.sidebar');
    const navbar = document.querySelector('.navbar');
    
    if (user) {
      // === 已登入 ===
      AppState.setUser(user);
      const superAdmin = isSuperAdmin(user);
      AppState.setSuperAdmin(superAdmin);

      let hasFamily = false;

      if (!superAdmin) {
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
            const errorText = await res.text();
            console.error('[main] lookup-family 失敗：', res.status, errorText);
            showToast(`載入家庭失敗 (${res.status})`, 'error');
          }
        } catch (err) {
          console.error('[main] 取得家庭資訊網路錯誤：', err);
          showToast('網路異常，無法載入家庭資訊', 'error');
        }

        if (!hasFamily) {
          // 如果查無家庭，不要立刻 signOut，避免無限迴圈，先停留在登入頁並提示
          window.location.hash = ROUTES.LOGIN;
          if (loadingEl) loadingEl.style.display = 'none';
          if (sidebar) sidebar.style.display = 'none';
          if (navbar) navbar.style.display = 'none';
          return;
        }
      } else {
        AppState.setRole(ROLES.SUPERADMIN);
        AppState.setDisplayName('超級管理員');
      }

      if (AppState.getFamilyId()) {
        try {
          await initAppConfig();
          watchConfigChanges();
          initEntityRegistry();
        } catch (initErr) {
          console.error('[main] 設定初始化失敗：', initErr);
        }
      }

      // 渲染主畫面
      if (sidebar) sidebar.style.display = 'flex';
      if (navbar) navbar.style.display = 'flex';
      updateNavbar();
      
      initRouter(true);
      if (window.location.hash === `#${ROUTES.LOGIN}` || !window.location.hash) {
        window.location.hash = ROUTES.DASHBOARD;
      }

    } else {
      // === 未登入 ===
      AppState.destroy();
      
      // 隱藏主畫面選單
      if (sidebar) sidebar.style.display = 'none';
      if (navbar) navbar.style.display = 'none';
      
      window.location.hash = ROUTES.LOGIN;
      initRouter(true);
    }

    if (loadingEl) loadingEl.style.display = 'none';
  });
}

bootstrap().catch(err => {
  console.error('[main] 系統啟動失敗：', err);
  document.body.innerHTML = `<div style="padding:40px; text-align:center; color:var(--accent-danger);"><h2>系統啟動失敗</h2><p>${err.message}</p></div>`;
});

/* ═══ EOF ═══
F: engine/main.js
V: 1792900670
W: ai-system-20261024-012#57
═══ EOF ═══ */