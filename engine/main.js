// ============================================
// main.js — 系統啟動入口（V2 重構版 - 修正版）
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

  onAuthStateChanged(auth, async (user) => {
    const loadingEl = document.getElementById('app-loading');
    
    if (user) {
      // === 已登入 ===
      AppState.setUser(user);
      const superAdmin = isSuperAdmin(user);
      AppState.setSuperAdmin(superAdmin);

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
            AppState.setFamily(data.familyId, data.familyName || '我的家庭');
            AppState.setMemberAccount(data.memberAccount);
          } else {
            showToast('無法載入家庭資訊，請聯繫管理員', 'error');
          }
        } catch (err) {
          console.error('[main] 取得家庭資訊失敗：', err);
          showToast('網路異常，無法載入家庭資訊', 'error');
        }
      } else {
        AppState.setRole(ROLES.SUPERADMIN);
        AppState.setDisplayName('超級管理員');
      }

      if (AppState.getFamilyId()) {
        await initAppConfig();
        watchConfigChanges();
        initEntityRegistry();
      }

      // 確保 DOM 存在，並渲染主骨架
      const root = document.getElementById('app-root');
      if (root && root.style.display === 'none') {
        initLayout('app-root');
      }
      updateNavbar();
      
      // 顯示選單與 Navbar
      document.querySelector('.sidebar')?.style.setProperty('display', 'flex');
      document.querySelector('.navbar')?.style.setProperty('display', 'flex');

      // 啟動路由
      initRouter();
      if (window.location.hash === `#${ROUTES.LOGIN}` || !window.location.hash) {
        window.location.hash = ROUTES.DASHBOARD;
      }

    } else {
      // === 未登入 ===
      AppState.destroy();
      
      // 確保 DOM 存在，但不渲染主骨架的選單
      const root = document.getElementById('app-root');
      if (root && root.style.display === 'none') {
        root.style.display = 'block';
        // 不呼叫 initLayout，避免渲染側邊欄
        // 改為直接放入 app-content 容器
        root.innerHTML = `
          <div class="main-area" style="width:100%;">
            <main class="content" id="app-content" style="padding:0;"></main>
          </div>
        `;
      }

      // 隱藏選單與 Navbar (如果存在的話)
      document.querySelector('.sidebar')?.style.setProperty('display', 'none');
      document.querySelector('.navbar')?.style.setProperty('display', 'none');

      // 強制跳轉到登入頁
      window.location.hash = ROUTES.LOGIN;
      initRouter();
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
V: 1792900640
W: ai-system-20261024-012#59
═══ EOF ═══ */