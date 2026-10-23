// ============================================
// admin.js — 平台管理
// ============================================

import { AppState, logout } from '../app-core.js';
import { render, esc, toast, openModal, getFormData, buildFormHtml } from '../app-ui.js';
import { api } from '../app-data.js';

export function mount(container) {
  let state = { families: [] };

  const paint = () => {
    const html = `
      <div class="page-header" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
        <h1 class="page-title" style="color:var(--primary); font-family:var(--font-mono);">[ 平台管理 ]</h1>
        <button class="btn btn-danger" id="btn-logout">登出</button>
      </div>
      <div style="margin-bottom:16px;">
        <button class="btn btn-primary" id="btn-add-family">+ 新增家庭</button>
      </div>
      <div class="mecha-panel">
        <div class="mecha-content" style="padding:0;">
          <table class="data-table">
            <thead><tr><th>UID</th><th>名稱</th><th>擁有者 Email</th><th>操作</th></tr></thead>
            <tbody>
              ${state.families.map(f => `
                <tr>
                  <td><span class="mono">${esc(f.uid)}</span></td>
                  <td>${esc(f.name)}</td>
                  <td>${esc(f.ownerEmail || '—')}</td>
                  <td>
                    <button class="btn btn-ghost" onclick="window.__delFam('${f.uid}')" style="color:#EF4444;">刪除</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    render(container, html);

    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('btn-add-family').addEventListener('click', async () => {
      const fields = [
        { id: 'uid', label: 'Family UID', type: 'text', required: true },
        { id: 'name', label: '名稱', type: 'text', required: true },
        { id: 'email', label: 'Email (選填)', type: 'text' }
      ];
      const ok = await openModal('新增家庭', buildFormHtml(fields));
      if (!ok) return;
      const data = getFormData(fields);
      try {
        await api.adminAddFamily(data.uid, data.name, data.email);
        toast('✅ 已新增');
        loadFamilies();
      } catch (err) { toast(err.message, 'error'); }
    });

    window.__delFam = async (uid) => {
      if (!confirm(`確定刪除家庭 ${uid}？`)) return;
      try {
        await api.adminRemoveFamily(uid);
        toast('✅ 已刪除');
        loadFamilies();
      } catch (err) { toast(err.message, 'error'); }
    };
  };

  const loadFamilies = async () => {
    try {
      const res = await api.adminListFamilies();
      state.families = res.families || [];
      paint();
    } catch (err) { toast(err.message, 'error'); }
  };

  loadFamilies();
  return () => {};
}