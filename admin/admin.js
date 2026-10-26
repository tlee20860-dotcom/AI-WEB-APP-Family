// ============================================
// admin.js — 平台管理（V2 重構版）
// 位置：admin/admin.js
// 說明：供超級管理員管理家庭清單與平台預設資料。
//       已移除手寫表格，全面改用 renderTable 引擎。
// ============================================

import { api } from '../domain/api-client.js';
import { openConfirm, openModal, closeModal } from '../ui/modal.js';
import { createForm } from '../ui/form.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc } from '../ui/format.js';
import { renderTable } from '../ui/table.js';

export default {
  _families: [],

  async render() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h1 style="font-size:24px; font-weight:700; color:var(--primary);">平台管理</h1>
        <button type="button" class="btn btn-primary" id="btn-add-family">
          <i data-lucide="plus" style="width:16px;height:16px;"></i> 新增家庭
        </button>
      </div>

      <div style="display:flex; gap:8px; margin-bottom:20px; border-bottom:1px solid var(--border-color);">
        <button type="button" class="btn btn-ghost" data-tab="families" style="border-bottom:2px solid var(--primary); border-radius:0; color:var(--primary);">家庭列表</button>
        <button type="button" class="btn btn-ghost" data-tab="defaults" style="border-radius:0; color:var(--text-secondary);">平台預設資料</button>
      </div>

      <div id="admin-tab-families">
        <div id="admin-families-list">
          <div style="text-align:center; padding:40px; color:var(--text-muted);">載入中…</div>
        </div>
      </div>

      <div id="admin-tab-defaults" style="display:none;">
        <div class="glass-card" style="padding:20px;">
          <h2 style="font-size:16px; font-weight:700; margin-bottom:16px;">UI 常數預設值</h2>
          <div id="admin-defaults-form-root"></div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // 綁定 Tab 切換
    document.querySelectorAll('button[data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        document.querySelectorAll('button[data-tab]').forEach(b => {
          b.style.borderBottom = b.dataset.tab === tab ? '2px solid var(--primary)' : 'none';
          b.style.color = b.dataset.tab === tab ? 'var(--primary)' : 'var(--text-secondary)';
        });
        document.getElementById('admin-tab-families').style.display = tab === 'families' ? 'block' : 'none';
        document.getElementById('admin-tab-defaults').style.display = tab === 'defaults' ? 'block' : 'none';
        
        if (tab === 'defaults') this._loadDefaults();
      });
    });

    document.getElementById('btn-add-family')?.addEventListener('click', () => this._openAddFamilyModal());

    // 初始載入
    await this._loadFamilies();
  },

  async _loadFamilies() {
    const listRoot = document.getElementById('admin-families-list');
    if (!listRoot) return;

    try {
      const res = await api.adminListFamilies();
      this._families = res.families || [];
      
      if (this._families.length === 0) {
        listRoot.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">尚無家庭</div>';
        return;
      }

      const renderActions = (row) => `
        <button type="button" class="btn btn-sm btn-ghost" data-action="init" data-uid="${row.uid}">初始化</button>
        <button type="button" class="btn btn-sm btn-danger" data-action="remove" data-uid="${row.uid}">刪除</button>
      `;

      // 使用引擎渲染表格
      renderTable({
        container: listRoot,
        rows: this._families,
        columnsKey: 'adminFamilies',
        renderActions
      });

      // 改用 onclick 屬性賦值，覆蓋舊監聽，避免累積事件
      listRoot.onclick = async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const uid = btn.dataset.uid;
        const family = this._families.find(f => f.uid === uid);
        if (!family) return;

        if (btn.dataset.action === 'init') {
          await this._handleInit(uid, family.name);
        } else if (btn.dataset.action === 'remove') {
          await this._handleRemove(uid, family.name);
        }
      };

    } catch (err) {
      console.error('[admin] 載入家庭失敗：', err);
      listRoot.innerHTML = '<div style="color:var(--accent-danger); text-align:center; padding:20px;">載入失敗</div>';
    }
  },

  _openAddFamilyModal() {
    const modalId = 'add-family-modal';
    document.getElementById(modalId)?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `
      <div class="modal" style="max-width:450px; background:var(--bg-surface);">
        <h2 class="modal-title">新增家庭</h2>
        <div id="family-form-root"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    openModal(modalId);

    createForm({
      container: 'family-form-root',
      fields: [
        { id: 'uid', label: 'Family UID (通常為 Firebase Auth 的 uid)', type: 'text', required: true },
        { id: 'name', label: '家庭名稱', type: 'text', required: true },
        { id: 'email', label: '擁有者 Email', type: 'text' }
      ],
      submitText: '新增',
      onCancel: () => { closeModal(modalId); overlay.remove(); },
      onSubmit: async (data) => {
        try {
          await api.adminAddFamily(data.uid, data.name, data.email);
          showToast('✅ 已新增家庭', 'success');
          closeModal(modalId);
          overlay.remove();
          this._loadFamilies();
        } catch (err) {
          showToast('新增失敗：' + err.message, 'error');
        }
      }
    });
  },

  async _handleInit(uid, name) {
    const ok = await openConfirm(`要對家庭「${name}」執行初始化嗎？\n這會寫入平台預設資料（若已有資料會跳過）。`, { title: '初始化家庭' });
    if (!ok) return;
    try {
      await api.adminInitFamily(uid);
      showToast('✅ 初始化完成', 'success');
    } catch (err) {
      showToast('初始化失敗：' + err.message, 'error');
    }
  },

  async _handleRemove(uid, name) {
    const ok = await openConfirm(`⚠️ 確定要刪除家庭「${name}」嗎？\n此操作會一併刪除該家庭的所有資料，且無法復原。`, { title: '刪除家庭', okClass: 'btn-danger' });
    if (!ok) return;
    try {
      await api.adminRemoveFamily(uid);
      showToast('✅ 已刪除家庭', 'success');
      this._loadFamilies();
    } catch (err) {
      showToast('刪除失敗：' + err.message, 'error');
    }
  },

  async _loadDefaults() {
    const formRoot = document.getElementById('admin-defaults-form-root');
    if (!formRoot || formRoot.dataset.loaded) return;
    
    formRoot.innerHTML = '<div style="color:var(--text-muted);">載入中…</div>';
    
    try {
      const res = await api.platformSettings.get();
      const data = res.data || {};

      createForm({
        container: formRoot,
        fields: [
          { id: 'nameMaxLenDesktop', label: '名稱截斷長度 (桌面)', type: 'number', required: true },
          { id: 'nameMaxLenMobile', label: '名稱截斷長度 (手機)', type: 'number', required: true },
          { id: 'toastDuration', label: 'Toast 顯示時間 (毫秒)', type: 'number', required: true }
        ],
        initialData: data,
        submitText: '儲存設定',
        onCancel: null,
        onSubmit: async (formData) => {
          try {
            await api.platformSettings.update(formData);
            showToast('✅ 平台預設已更新', 'success');
          } catch (err) {
            showToast('更新失敗：' + err.message, 'error');
          }
        }
      });
      formRoot.dataset.loaded = '1';
    } catch (err) {
      formRoot.innerHTML = '<div style="color:var(--accent-danger);">載入失敗</div>';
    }
  },

  destroy() {}
};

/* ═══ EOF ═══
F: admin/admin.js
V: 1792901940
W: webapp-20261025-001#42
═══ */