// ============================================
// main.js — 系統啟動入口（V2 重構版）
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
          }
        } catch (err) {
          console.error('[main] 取得家庭資訊失敗：', err);
        }

        // 關鍵：如果查無家庭，強制登出並提示
        if (!hasFamily) {
          showToast('此帳號尚未建立家庭，請聯繫管理員', 'error', 5000);
          await signOut(auth);
          return; // 這裡 return 後會再次觸發 onAuthStateChanged，進入未登入區塊
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

      updateNavbar();
      
      // 啟動路由
      initRouter(true);
      if (window.location.hash === `#${ROUTES.LOGIN}` || !window.location.hash) {
        window.location.hash = ROUTES.DASHBOARD;
      }

    } else {
      // === 未登入 ===
      AppState.destroy();
      
      // 強制進入登入頁
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
V: 1792900660
W: ai-system-20261024-012#61
═══ EOF ═══ */