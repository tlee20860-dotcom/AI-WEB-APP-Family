// ============================================
// main.js — 系統啟動入口（V2 重構版 - 嚴格驗證）
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

  // 初始化路由，但傳入 false 不立刻執行
  initRouter(false);

  onAuthStateChanged(auth, async (user) => {
    const loadingEl = document.getElementById('app-loading');
    const root = document.getElementById('app-root');
    
    if (user) {
      // === 已登入（確認身分） ===
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

        // 關鍵：如果一般成員查無家庭，強制登出！
        if (!hasFamily) {
          showToast('此帳號尚未建立家庭，請聯繫管理員', 'error', 5000);
          await signOut(auth);
          return; // 這裡 return 後會再次觸發 onAuthStateChanged，進入未登入區塊
        }
      } else {
        // 超級管理員不需要家庭
        AppState.setRole(ROLES.SUPERADMIN);
        AppState.setDisplayName('超級管理員');
        hasFamily = true;
      }

      if (AppState.getFamilyId()) {
        await initAppConfig();
        watchConfigChanges();
        initEntityRegistry();
      }

      // 渲染主骨架
      if (root) {
        root.innerHTML = ''; // 清空
        root.style.display = 'block';
      }
      initLayout('app-root');
      updateNavbar();
      
      // 啟動路由
      initRouter(true);
      if (window.location.hash === `#${ROUTES.LOGIN}` || !window.location.hash) {
        window.location.hash = ROUTES.DASHBOARD;
      }

    } else {
      // === 未登入 ===
      AppState.destroy();
      
      // 清空畫面，確保沒有選單
      if (root) {
        root.innerHTML = '';
        root.style.display = 'block';
      }
      
      // 啟動路由並強制進入登入頁
      initRouter(true);
      window.location.hash = ROUTES.LOGIN;
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
V: 1792900650
W: ai-system-20261024-012#60
═══ EOF ═══ */