// ============================================
// login.js — 登入頁面（V2 重構版）
// 位置：pages/login.js
// 說明：處理使用者登入。未登入時隱藏側邊欄與導覽列。
// ============================================

import { loginWithCustomAccount } from '../domain/auth.js';
import { showToast } from '../ui/toast.js';
import { esc } from '../ui/format.js';

export default {
  async render() {
    // 隱藏主畫面的側邊欄與導覽列，讓登入頁獨立呈現
    const sidebar = document.querySelector('.sidebar');
    const navbar = document.querySelector('.navbar');
    if (sidebar) sidebar.style.display = 'none';
    if (navbar) navbar.style.display = 'none';

    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; min-height:80vh; padding:20px;">
        <div class="glass-card" style="width:100%; max-width:400px; padding:32px; background:var(--bg-surface);">
          <div style="text-align:center; margin-bottom:24px;">
            <h1 style="font-family:var(--font-mono); font-size:28px; font-weight:700; color:var(--primary); letter-spacing:2px;">◈ FAMILY.FIN</h1>
            <p style="font-size:13px; color:var(--text-muted); margin-top:8px;">家庭財務與固定供款管理 (V2)</p>
          </div>

          <form id="login-form" novalidate>
            <div class="field" style="margin-bottom:16px;">
              <label class="field-label" for="account" style="display:block; font-size:12px; color:var(--text-secondary); margin-bottom:6px;">帳號</label>
              <input class="input" type="text" id="account" required placeholder="例如：superadmin" style="width:100%; padding:10px; background:var(--bg-deep); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary);">
            </div>
            
            <div class="field" style="margin-bottom:24px;">
              <label class="field-label" for="password" style="display:block; font-size:12px; color:var(--text-secondary); margin-bottom:6px;">密碼</label>
              <input class="input" type="password" id="password" required minlength="6" placeholder="至少 6 位" style="width:100%; padding:10px; background:var(--bg-deep); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary);">
            </div>

            <div id="login-error" style="display:none; color:var(--accent-danger); font-size:13px; margin-bottom:16px; text-align:center;"></div>

            <button class="btn btn-primary" type="submit" id="login-btn" style="width:100%; justify-content:center; padding:10px;">
              登入
            </button>
          </form>

          <p style="margin-top:24px; font-size:12px; color:var(--text-muted); text-align:center;">
            沒有帳號？請聯繫平台管理員開通
          </p>
        </div>
      </div>
    `;

    const form = document.getElementById('login-form');
    const errorBox = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.style.display = 'none';
      btn.disabled = true;
      btn.textContent = '登入中…';

      const account = document.getElementById('account').value.trim();
      const password = document.getElementById('password').value;

      try {
        await loginWithCustomAccount(account, password);
        
        // 登入成功後，重新整理頁面，讓系統重新跑初始化流程
        showToast('登入成功，正在載入系統…', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 500);
        
      } catch (err) {
        console.error('[login] 登入失敗：', err);
        errorBox.textContent = '登入失敗：帳號或密碼錯誤';
        errorBox.style.display = 'block';
        btn.disabled = false;
        btn.textContent = '登入';
      }
    });
  },

  destroy() {
    // 離開登入頁時，恢復側邊欄與導覽列的顯示
    const sidebar = document.querySelector('.sidebar');
    const navbar = document.querySelector('.navbar');
    if (sidebar) sidebar.style.display = 'flex';
    if (navbar) navbar.style.display = 'flex';
  }
};

/* ═══ EOF ═══
F: pages/login.js
V: 1792900470
W: ai-system-20261024-012#42
═══ EOF ═══ */