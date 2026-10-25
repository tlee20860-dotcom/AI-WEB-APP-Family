// ============================================
// settings.js — 系統設定頁面（V2 重構版）
// 位置：pages/settings.js
// 說明：提供帳號資訊、系統偏好與登出功能。
// ============================================

import { AppState } from '../config/state.js';
import { logout } from '../domain/auth.js';
import { openConfirm } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { esc } from '../ui/format.js';
import { ROLES } from '../config/constants.js';

export default {
  async render() {
    const content = document.getElementById('app-content');
    if (!content) return;

    const user = AppState.currentUser;
    const name = AppState.getDisplayName() || '訪客';
    const role = AppState.getRole();
    const family = AppState.getFamilyName() || '無';
    
    let roleLabel = '成員';
    if (role === ROLES.SUPERADMIN) roleLabel = '超級管理員';
    else if (role === ROLES.OWNER) roleLabel = '家庭擁有者';

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h1 style="font-size:24px; font-weight:700; color:var(--primary);">系統設定</h1>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
        
        <!-- 帳號資訊卡 -->
        <div class="glass-card" style="padding:20px;">
          <h2 style="font-size:16px; font-weight:700; margin-bottom:16px; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            <i data-lucide="user" style="width:18px;height:18px;color:var(--primary);"></i> 帳號資訊
          </h2>
          
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div>
              <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">登入帳號</div>
              <div class="mono" style="font-size:14px; color:var(--text-primary);">${esc(user?.email || '')}</div>
            </div>
            <div>
              <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">顯示名稱</div>
              <div style="font-size:14px; color:var(--text-primary);">${esc(name)}</div>
            </div>
            <div>
              <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">角色權限</div>
              <div><span class="badge ${role === ROLES.SUPERADMIN ? 'badge-magenta' : (role === ROLES.OWNER ? 'badge-info' : 'badge-muted')}">${roleLabel}</span></div>
            </div>
            <div>
              <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">所屬家庭</div>
              <div style="font-size:14px; color:var(--text-primary);">${esc(family)}</div>
            </div>
          </div>
        </div>

        <!-- 系統偏好卡 -->
        <div class="glass-card" style="padding:20px;">
          <h2 style="font-size:16px; font-weight:700; margin-bottom:16px; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
            <i data-lucide="settings" style="width:18px;height:18px;color:var(--primary);"></i> 系統偏好
          </h2>
          
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:14px;">深色模式</span>
              <button type="button" class="btn ${AppState.getTheme() === 'dark' ? 'btn-primary' : 'btn-ghost'}" id="btn-toggle-theme">
                ${AppState.getTheme() === 'dark' ? '已開啟' : '已關閉'}
              </button>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:14px;">清除本地快取</span>
              <button type="button" class="btn btn-ghost" id="btn-clear-cache">清除</button>
            </div>
          </div>
        </div>

        <!-- 危險區域 -->
        <div class="glass-card" style="padding:20px; grid-column:1 / -1; border-color:rgba(244,63,94,0.3);">
          <h2 style="font-size:16px; font-weight:700; margin-bottom:16px; color:var(--accent-danger); display:flex; align-items:center; gap:8px;">
            <i data-lucide="alert-triangle" style="width:18px;height:18px;"></i> 危險區域
          </h2>
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:16px;">
            登出後將清除本地登入狀態，需要重新輸入帳號密碼。
          </p>
          <button type="button" class="btn btn-danger" id="btn-logout">
            <i data-lucide="log-out" style="width:16px;height:16px;"></i> 登出系統
          </button>
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // 事件綁定
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
      AppState.toggleTheme();
      this.render(); // 重新渲染以更新按鈕狀態
    });

    document.getElementById('btn-clear-cache')?.addEventListener('click', async () => {
      const ok = await openConfirm('確定要清除本地快取嗎？這會重新載入系統。', { title: '清除快取' });
      if (!ok) return;
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    });

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      const ok = await openConfirm('確定要登出嗎？', { title: '登出', okClass: 'btn-danger' });
      if (ok) logout();
    });
  },

  destroy() {}
};

/* ═══ EOF ═══
F: pages/settings.js
V: 1792900590
W: ai-system-20261024-012#54
═══ EOF ═══ */