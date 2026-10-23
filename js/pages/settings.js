// ============================================
// settings.js — 系統設定
// ============================================

import { AppState, logout } from '../app-core.js';
import { render, esc, toast, openModal, getFormData, buildFormHtml } from '../app-ui.js';
import { api } from '../app-data.js';
import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export function mount(container) {
  const db = getDatabase();
  const fid = AppState.currentFamilyId;
  const unsubs = [];
  let activeTab = 'banks';
  let state = { bankAccounts: {}, members: {} };

  const paint = () => {
    const html = `
      <div class="page-header" style="margin-bottom:20px;">
        <h1 class="page-title" style="color:var(--primary); font-family:var(--font-mono);">[ 系統設定 ]</h1>
      </div>
      <div style="display:flex; gap:8px; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:10px;">
        ${AppState.isSuperAdmin ? `<button class="btn ${activeTab==='platform'?'btn-primary':'btn-ghost'}" data-tab="platform">平台設定</button>` : ''}
        <button class="btn ${activeTab==='banks'?'btn-primary':'btn-ghost'}" data-tab="banks">銀行帳號</button>
        <button class="btn ${activeTab==='personal'?'btn-primary':'btn-ghost'}" data-tab="personal">個人化</button>
      </div>
      <div id="tab-content"></div>
    `;
    render(container, html);

    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => { activeTab = btn.dataset.tab; paint(); });
    });

    if (activeTab === 'banks') paintBanks();
    else if (activeTab === 'personal') paintPersonal();
    else if (activeTab === 'platform') paintPlatform();
  };

  const paintBanks = () => {
    const accounts = Object.entries(state.bankAccounts).map(([id, a]) => ({ id, ...a }));
    const html = `
      <div style="display:flex; justify-content:space-between; margin-bottom:16px;">
        <span class="text-muted">共 ${accounts.length} 個帳號</span>
        <button class="btn btn-primary" id="btn-add-bank">+ 新增銀行</button>
      </div>
      <div class="mecha-panel">
        <div class="mecha-content" style="padding:0;">
          <table class="data-table">
            <thead><tr><th>名稱</th><th>類型</th><th class="num">初始餘額</th><th style="width:100px;">操作</th></tr></thead>
            <tbody>
              ${accounts.map(a => `
                <tr>
                  <td>${esc(a.name)}</td>
                  <td>${a.type === 'personal' ? '個人' : '家庭'}</td>
                  <td class="num">${Number(a.initialBalance).toLocaleString()}</td>
                  <td><button class="btn btn-ghost" style="color:#EF4444;" onclick="window.__delBank('${a.id}')">刪除</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    render('tab-content', html);
    document.getElementById('btn-add-bank')?.addEventListener('click', () => {
      // 這裡簡化實作，實際可對接 entity-modal
      toast('請至實體新增彈窗操作'); 
    });
    window.__delBank = async (id) => {
      if (!confirm('確定刪除？')) return;
      await api.bankAccounts.remove(id);
      toast('✅ 已刪除');
    };
  };

  const paintPersonal = () => {
    const html = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:16px;">
        <div class="mecha-panel">
          <div class="mecha-content">
            <div class="mecha-title">帳號資訊</div>
            <div style="margin-bottom:12px; font-size:13px;">帳號：${esc(AppState.currentUser?.email?.split('@')[0] || '')}</div>
            <div style="margin-bottom:12px; font-size:13px;">角色：${esc(AppState.role)}</div>
            <button class="btn btn-danger" onclick="window.__logout()">登出</button>
          </div>
        </div>
        
        <div class="mecha-panel">
          <div class="mecha-content">
            <div class="mecha-title">除錯工具</div>
            <button class="btn btn-primary" onclick="window.__enableVConsole()">開啟 vConsole</button>
          </div>
        </div>
      </div>
    `;
    render('tab-content', html);
    window.__logout = () => logout();
    window.__enableVConsole = () => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/vconsole@3.15.0/dist/vconsole.min.js';
      script.onload = () => { window.vConsole = new window.VConsole(); toast('✅ vConsole 已開啟'); };
      document.head.appendChild(script);
    };
  };

  const paintPlatform = () => {
    render('tab-content', `<div class="mecha-panel"><div class="mecha-content text-muted">平台設定功能請至管理員頁面</div></div>`);
  };

  const unsubs2 = [
    onValue(ref(db, `families/${fid}/bank_accounts`), (snap) => { state.bankAccounts = snap.val() || {}; if(activeTab==='banks') paint(); })
  ];

  paint();
  return () => unsubs2.forEach(u => u && u());
}