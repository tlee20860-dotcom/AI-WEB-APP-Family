// ============================================
// main.js — 系統啟動入口（V2 重構版）
// 位置：engine/main.js
// 說明：負責初始化 Firebase、AppState、Layout、Router。
//       並等待 Auth 狀態確認後才渲染畫面。
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

/* ============================================
   1. 註冊 Service Worker (PWA)
   ============================================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('[PWA] SW 註冊失敗：', err);
    });
  });
}

/* ============================================
   2. 系統啟動
   ============================================ */
async function bootstrap() {
  // 1. 初始化本地狀態 (讀取 localStorage)
  AppState.init();

  // 2. 渲染基礎骨架 (此時側邊欄是空的，等待資料填入)
  initLayout('app-root');

  // 3. 監聽 Firebase 登入狀態
  onAuthStateChanged(auth, async (user) => {
    const loadingEl = document.getElementById('app-loading');
    
    if (user) {
      // === 已登入 ===
      AppState.setUser(user);
      const superAdmin = isSuperAdmin(user);
      AppState.setSuperAdmin(superAdmin);

      if (!superAdmin) {
        // 一般成員：向後端查詢家庭資訊
        try {
          const token = await user.getIdToken();
          const res = await fetch('/api/lookup-family', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
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

      // 初始化設定與實體快取
      if (AppState.getFamilyId()) {
        await initAppConfig();
        watchConfigChanges();
        initEntityRegistry();
      }

      // 更新 Navbar UI
      updateNavbar();

      // 啟動路由
      initRouter();
      
      // 如果當前是登入頁，導向首頁
      if (window.location.hash === `#${ROUTES.LOGIN}` || !window.location.hash) {
        window.location.hash = ROUTES.DASHBOARD;
      }

    } else {
      // === 未登入 ===
      AppState.destroy();
      
      // 啟動路由 (這會載入 login.js)
      initRouter();
      window.location.hash = ROUTES.LOGIN;
    }

    // 隱藏載入畫面
    if (loadingEl) loadingEl.style.display = 'none';
  });
}

// 啟動系統
bootstrap().catch(err => {
  console.error('[main] 系統啟動失敗：', err);
  document.body.innerHTML = `
    <div style="padding:40px; text-align:center; color:var(--accent-danger);">
      <h2>系統啟動失敗</h2>
      <p>${err.message}</p>
    </div>
  `;
});

/* ═══ EOF ═══
F: engine/main.js
V: 1792900610
W: ai-system-20261024-012#56
═══ EOF ═══ */