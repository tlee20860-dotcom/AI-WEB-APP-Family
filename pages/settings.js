// ============================================
// settings.js — 系統設定頁面（V2 引擎版）
// 位置：pages/settings.js
// 說明：整合帳號資訊、統計模式、成員管理、年份範圍、頁面標題與除錯工具。
//       已完全拔除 shared/ 依賴，改用原生引擎。
// ============================================

import { AppState } from '../config/state.js';
import { logout } from '../domain/auth.js';
import { openConfirm, openModal, closeModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { esc, formatHKD } from '../ui/format.js';
import { ROLES, STORAGE_KEYS, ENTITY_KEYS } from '../config/constants.js';
import { initTabPanel } from '../ui/tab-panel.js';
import { createForm } from '../ui/form.js';
import { renderTable } from '../ui/table.js';
import { listen, saveObject, listenMembers, listenBankAccounts, removeObject } from '../db/index.js';
import { listPages, getDefaultMetadata } from '../config/page-metadata-registry.js';
import { api } from '../domain/api-client.js';

export default {
  _unsubMeta: null,
  _unsubYear: null,
  _unsubMembers: null,
  _unsubBanks: null,

  async render() {
    const content = document.getElementById('app-content');
    if (!content) return;

    // 1. 建立 Tab 骨架
    const isSuper = AppState.isSuperAdmin;
    const tabs = [];
    if (isSuper) tabs.push({ key: 'platform', label: '平台設定', icon: 'settings', panelId: 'settings-panel-platform' });
    tabs.push({ key: 'banks', label: '銀行帳號', icon: 'landmark', panelId: 'settings-panel-banks' });
    tabs.push({ key: 'personal', label: '個人化', icon: 'user', panelId: 'settings-panel-personal' });

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h1 style="font-size:24px; font-weight:700; color:var(--primary);">系統設定</h1>
      </div>
      <div id="settings-tabs"></div>
      
      <div id="settings-panel-platform" class="tab-panel" style="display:none;">
        <div class="banner mb-16">ℹ️ 平台 UI 常數為全站預設值，家庭可在「預設資料庫」中覆蓋。</div>
      </div>

      <div id="settings-panel-banks" class="tab-panel" style="display:none;">
        <div class="banner mb-16">ℹ️ 管理家庭的銀行帳號。每個帳號有「初始餘額」與「初始年月」。</div>
        <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
          <button type="button" class="btn btn-primary" id="btn-add-bank"><i data-lucide="plus" style="width:14px;height:14px;"></i> 新增銀行</button>
        </div>
        <div id="settings-banks-list"></div>
      </div>

      <div id="settings-panel-personal" class="tab-panel" style="display:none;">
        <div class="settings-personal-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:16px;">
          <!-- 帳號資訊 -->
          <div class="glass-card">
            <div class="glass-card-title" style="margin-bottom:16px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="user" style="width:16px;height:16px;color:var(--primary);"></i> 帳號資訊
            </div>
            <div class="form-stack">
              <div class="field"><label class="field-label">登入帳號</label><input class="input mono" id="settings-account" disabled></div>
              <div class="field"><label class="field-label">角色</label><input class="input mono" id="settings-role" disabled></div>
              <div class="field"><label class="field-label">家庭名稱</label><input class="input" id="settings-family" disabled></div>
            </div>
            <div style="margin-top:16px; padding-top:16px; border-top:1px dashed var(--border-color); text-align:right;">
              <button type="button" class="btn btn-danger" id="settings-logout-btn"><i data-lucide="log-out" style="width:14px;height:14px;"></i> 登出</button>
            </div>
          </div>

          <!-- 統計卡顯示模式 -->
          <div class="glass-card">
            <div class="glass-card-title" style="margin-bottom:16px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="bar-chart-2" style="width:16px;height:16px;color:var(--primary);"></i> 統計卡顯示模式
            </div>
            <div id="stats-mode-options" style="display:flex; flex-direction:column; gap:8px;"></div>
            <div style="margin-top:16px; padding-top:16px; border-top:1px dashed var(--border-color); text-align:right;">
              <button type="button" class="btn btn-primary" id="save-stats-mode-btn"><i data-lucide="check" style="width:14px;height:14px;"></i> 儲存模式</button>
            </div>
          </div>

          <!-- 年份範圍 -->
          <div class="glass-card" style="grid-column: 1 / -1;">
            <div class="glass-card-title" style="margin-bottom:16px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="calendar" style="width:16px;height:16px;color:var(--primary);"></i> 年份範圍設定
            </div>
            <div id="yearrange-form-root"></div>
          </div>

          <!-- 頁面標題 -->
          <div class="glass-card" style="grid-column: 1 / -1;">
            <div class="glass-card-title" style="margin-bottom:16px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="type" style="width:16px;height:16px;color:var(--primary);"></i> 頁面標題客製化
            </div>
            <div id="pagemeta-form-root"></div>
          </div>

          <!-- 除錯工具 -->
          <div class="glass-card" style="grid-column: 1 / -1;">
            <div class="glass-card-title" style="margin-bottom:12px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="bug" style="width:16px;height:16px;color:var(--primary);"></i> 除錯工具 (vConsole)
            </div>
            <p class="glass-card-hint mb-12">手機若無 DevTools，可手動開啟 vConsole 檢視日誌。</p>
            <div id="debug-status" style="margin-bottom:12px; font-size:13px;"></div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn btn-primary" id="debug-enable-btn">開啟 vConsole</button>
              <button type="button" class="btn btn-ghost" id="debug-disable-btn">關閉</button>
            </div>
          </div>

          <!-- 家庭成員 -->
          <div class="glass-card" style="grid-column: 1 / -1;">
            <div class="glass-card-title" style="margin-bottom:16px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="users" style="width:16px;height:16px;color:var(--primary);"></i> 家庭成員
            </div>
            <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
              <button type="button" class="btn btn-primary" id="btn-add-member"><i data-lucide="plus" style="width:14px;height:14px;"></i> 新增成員</button>
            </div>
            <div id="family-members-root"></div>
          </div>
        </div>
      </div>
    `;

    // 2. 初始化 Tab 切換
    const tabPanel = initTabPanel({
      containerId: 'settings-tabs',
      tabs,
      defaultKey: isSuper ? 'platform' : 'banks',
      storageKey: 'settings-tab',
      onChange: (key) => {
        if (key === 'banks') this._renderBanksTab();
        if (key === 'personal') this._initPersonalTab();
      }
    });

    // 3. 若預設為個人化或銀行，直接初始化
    if (tabPanel.getCurrent() === 'personal') this._initPersonalTab();
    if (tabPanel.getCurrent() === 'banks') this._renderBanksTab();
  },

  /* ============================================
     銀行帳號管理 (拔除 initBankAccountManager)
     ============================================ */
  _renderBanksTab() {
    const root = document.getElementById('settings-banks-list');
    if (!root) return;

    if (this._unsubBanks) this._unsubBanks();
    this._unsubBanks = listenBankAccounts((accounts) => {
      const renderActions = (row) => `
        <button type="button" class="btn btn-sm btn-ghost" data-action="edit" data-id="${row.id}">編輯</button>
        <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${row.id}">刪除</button>
      `;
      
      renderTable({
        container: root,
        rows: accounts,
        columnsKey: 'bankAccounts',
        renderActions
      });

      root.onclick = async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.dataset.id;
        const row = accounts.find(a => a.id === id);
        if (!row) return;

        if (btn.dataset.action === 'delete') {
          const ok = await openConfirm(`確定要刪除「${row.name}」嗎？`, { okClass: 'btn-danger' });
          if (ok) {
            await removeObject(`bank_accounts/${id}`);
            showToast('✅ 已刪除帳號', 'success');
          }
        } else if (btn.dataset.action === 'edit') {
          this._openBankModal(row);
        }
      };
    });

    document.getElementById('btn-add-bank').onclick = () => this._openBankModal();
  },

  _openBankModal(bank = null) {
    const isEdit = !!bank;
    const modalId = 'bank-modal-settings';
    document.getElementById(modalId)?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `<div class="modal" style="max-width:400px;"><h2 class="modal-title">${isEdit ? '編輯' : '新增'}銀行</h2><div id="${modalId}-form"></div></div>`;
    document.body.appendChild(overlay);
    openModal(modalId);

    createForm({
      container: `${modalId}-form`,
      fields: [
        { id: 'name', label: '帳號名稱', type: 'text', required: true },
        { id: 'type', label: '類型', type: 'select', required: true, options: [{ value: 'family', label: '家庭' }, { value: 'personal', label: '個人' }] },
        { id: 'initialBalance', label: '初始餘額', type: 'number', required: true },
        { id: 'initialYear', label: '初始年份', type: 'number', required: true },
        { id: 'initialMonth', label: '初始月份', type: 'number', required: true, min: 1, max: 12 }
      ],
      initialData: isEdit ? bank : { type: 'family', initialBalance: 0, initialYear: new Date().getFullYear(), initialMonth: 1 },
      submitText: isEdit ? '儲存' : '新增',
      onCancel: () => { closeModal(modalId); overlay.remove(); },
      onSubmit: async (data) => {
        try {
          if (isEdit) {
            await saveObject(`bank_accounts/${bank.id}`, { ...bank, ...data });
          } else {
            const { pushObject } = await import('../db/write.js');
            await pushObject('bank_accounts', { ...data, createdAt: Date.now() });
          }
          showToast('✅ 已儲存', 'success');
          closeModal(modalId); overlay.remove();
        } catch (err) { showToast('錯誤：' + err.message, 'error'); }
      }
    });
  },

  /* ============================================
     個人化 Tab
     ============================================ */
  _initPersonalTab() {
    // 1. 帳號資訊
    const accEl = document.getElementById('settings-account');
    const roleEl = document.getElementById('settings-role');
    const famEl = document.getElementById('settings-family');
    const memberAcc = AppState.getMemberAccount() || {};

    if (accEl) accEl.value = memberAcc.account || (AppState.currentUser?.email ? AppState.currentUser.email.split('@')[0] : '—');
    if (roleEl) roleEl.value = AppState.getRole() === ROLES.SUPERADMIN ? '超級管理員' : (AppState.getRole() === ROLES.OWNER ? '擁有者' : '成員');
    if (famEl) famEl.value = AppState.getFamilyName() || '—';

    const logoutBtn = document.getElementById('settings-logout-btn');
    logoutBtn.onclick = async () => {
      if (await openConfirm('確定要登出嗎？', { title: '登出', okClass: 'btn-danger' })) logout();
    };

    // 2. 統計模式
    const statsRoot = document.getElementById('stats-mode-options');
    if (statsRoot) {
      let curMode = 'auto';
      try { curMode = localStorage.getItem(STORAGE_KEYS.STATS_MODE) || 'auto'; } catch (e) {}
      const modes = [
        { value: 'auto', label: '自動（依裝置 / 檢視模式）' },
        { value: 'integrated', label: '整合卡（單一大卡）' },
        { value: 'compact', label: '緊湊卡（多個小卡）' }
      ];
      statsRoot.innerHTML = modes.map(m => `
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:8px; background:var(--bg-deep); border-radius:6px;">
          <input type="radio" name="stats-mode" value="${m.value}" ${m.value === curMode ? 'checked' : ''} style="cursor:pointer;">
          <span style="font-size:13px;">${m.label}</span>
        </label>
      `).join('');

      document.getElementById('save-stats-mode-btn').onclick = () => {
        const selected = document.querySelector('input[name="stats-mode"]:checked');
        if (selected) {
          localStorage.setItem(STORAGE_KEYS.STATS_MODE, selected.value);
          showToast('✅ 已儲存顯示模式', 'success');
        }
      };
    }

    // 3. 年份範圍
    const yearFormRoot = document.getElementById('yearrange-form-root');
    if (yearFormRoot) {
      if (this._unsubYear) this._unsubYear();
      this._unsubYear = listen('settings/year_range', (snap) => {
        const data = snap.val() || {};
        if (yearFormRoot.querySelector('form')) {
          yearFormRoot.querySelector('#yr-start').value = data.startYear || '';
          yearFormRoot.querySelector('#yr-future').value = data.futureYears || 5;
        }
      });

      createForm({
        container: yearFormRoot,
        fields: [
          { id: 'yr-start', label: '起始年份 (留空=當前-3)', type: 'number', min: 1900, max: 2200 },
          { id: 'yr-future', label: '往後顯示年數', type: 'number', required: true, min: 0, max: 20 }
        ],
        submitText: '儲存年份範圍',
        onCancel: null,
        onSubmit: async (data) => {
          const sy = data['yr-start'] === '' ? null : Number(data['yr-start']);
          const fy = Number(data['yr-future']) || 5;
          await saveObject('settings/year_range', { startYear: sy, futureYears: fy });
          showToast('✅ 年份範圍已更新', 'success');
        }
      });
    }

    // 4. 頁面標題
    const pageFormRoot = document.getElementById('pagemeta-form-root');
    if (pageFormRoot) {
      const pages = listPages();
      let allMeta = {};
      
      if (this._unsubMeta) this._unsubMeta();
      this._unsubMeta = listen('settings/page_metadata', (snap) => {
        allMeta = snap.val() || {};
        const pageSel = pageFormRoot.querySelector('#pm-page');
        if (pageSel) _applyPageMeta(pageFormRoot, pageSel.value, allMeta, pages);
      });

      pageFormRoot.innerHTML = `
        <div class="form-stack">
          <div class="field">
            <label class="field-label">選擇頁面</label>
            <select class="input" id="pm-page">
              ${pages.map(p => `<option value="${esc(p.key)}">${esc(p.title)}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label class="field-label">頁面標題</label><input class="input" id="pm-title" type="text" maxlength="40"></div>
          <div class="field"><label class="field-label">副標題 (靜態段)</label><input class="input" id="pm-sub" type="text" maxlength="60"></div>
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button type="button" class="btn btn-ghost" id="pm-reset">恢復預設</button>
            <button type="button" class="btn btn-primary" id="pm-save">儲存標題</button>
          </div>
        </div>
      `;

      pageFormRoot.querySelector('#pm-page').onchange = (e) => {
        _applyPageMeta(pageFormRoot, e.target.value, allMeta, pages);
      };

      pageFormRoot.querySelector('#pm-save').onclick = async () => {
        const pk = pageFormRoot.querySelector('#pm-page').value;
        const title = pageFormRoot.querySelector('#pm-title').value.trim();
        const sub = pageFormRoot.querySelector('#pm-sub').value;
        if (!title) { showToast('標題不可為空', 'warning'); return; }
        
        const next = { ...allMeta, [pk]: { title, subtitleStatic: sub } };
        await saveObject('settings/page_metadata', next);
        showToast('✅ 頁面標題已更新', 'success');
      };

      pageFormRoot.querySelector('#pm-reset').onclick = async () => {
        const pk = pageFormRoot.querySelector('#pm-page').value;
        const next = { ...allMeta };
        delete next[pk];
        await saveObject('settings/page_metadata', next);
        _applyPageMeta(pageFormRoot, pk, next, pages);
        showToast('✅ 已恢復預設', 'success');
      };
    }

    // 5. vConsole 除錯工具
    const debugStatus = document.getElementById('debug-status');
    const updateDebugUI = async () => {
      try {
        const mod = await import('../core/debug.js');
        debugStatus.innerHTML = mod.isDebugEnabled() ? '<span class="badge badge-success">● 已開啟</span>' : '<span class="badge badge-muted">● 已關閉</span>';
      } catch (e) { debugStatus.innerHTML = '載入失敗'; }
    };
    updateDebugUI();

    document.getElementById('debug-enable-btn').onclick = async () => {
      const mod = await import('../core/debug.js');
      await mod.forceEnableDebug();
      updateDebugUI();
    };
    document.getElementById('debug-disable-btn').onclick = async () => {
      const mod = await import('../core/debug.js');
      mod.forceDisableDebug();
      updateDebugUI();
    };

    // 6. 家庭成員 (拔除 initEntityListPage)
    const memberRoot = document.getElementById('family-members-root');
    if (memberRoot) {
      if (this._unsubMembers) this._unsubMembers();
      this._unsubMembers = listenMembers((members) => {
        const renderActions = (row) => `
          <button type="button" class="btn btn-sm btn-ghost" data-action="edit" data-id="${row.id}">編輯</button>
          <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${row.id}">刪除</button>
        `;
        renderTable({
          container: memberRoot,
          rows: members,
          columnsKey: 'memberReport', // 借用 memberReport 的欄位定義（name, net...），或自訂
          customColumns: [
            { id: 'name', label: '名稱' },
            { id: 'role', label: '角色' },
            { id: 'order', label: '排序' }
          ],
          customResolvers: {
            name: (v) => esc(v),
            role: (v) => esc(v),
            order: (v) => `<span class="mono">${v || 0}</span>`
          },
          renderActions
        });

        memberRoot.onclick = async (e) => {
          const btn = e.target.closest('button[data-action]');
          if (!btn) return;
          const id = btn.dataset.id;
          const row = members.find(m => m.id === id);
          if (!row) return;

          if (btn.dataset.action === 'delete') {
            const ok = await openConfirm(`確定要刪除成員「${row.name}」嗎？`, { okClass: 'btn-danger' });
            if (ok) {
              await removeObject(`members/${id}`);
              showToast('✅ 已刪除成員', 'success');
            }
          } else if (btn.dataset.action === 'edit') {
            this._openMemberModal(row);
          }
        };
      });

      document.getElementById('btn-add-member').onclick = () => this._openMemberModal();
    }

    if (window.lucide) window.lucide.createIcons();
  },

  _openMemberModal(member = null) {
    const isEdit = !!member;
    const modalId = 'member-modal-settings';
    document.getElementById(modalId)?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = modalId;
    overlay.innerHTML = `<div class="modal" style="max-width:400px;"><h2 class="modal-title">${isEdit ? '編輯' : '新增'}成員</h2><div id="${modalId}-form"></div></div>`;
    document.body.appendChild(overlay);
    openModal(modalId);

    createForm({
      container: `${modalId}-form`,
      fields: [
        { id: 'name', label: '成員名稱', type: 'text', required: true },
        { id: 'role', label: '角色', type: 'text', required: false, placeholder: '例如：husband' },
        { id: 'order', label: '排序', type: 'number', required: false }
      ],
      initialData: isEdit ? member : { order: 0 },
      submitText: isEdit ? '儲存' : '新增',
      onCancel: () => { closeModal(modalId); overlay.remove(); },
      onSubmit: async (data) => {
        try {
          if (isEdit) {
            await saveObject(`members/${member.id}`, { ...member, ...data });
          } else {
            const { pushObject } = await import('../db/write.js');
            await pushObject('members', { ...data, createdAt: Date.now() });
          }
          showToast('✅ 已儲存', 'success');
          closeModal(modalId); overlay.remove();
        } catch (err) { showToast('錯誤：' + err.message, 'error'); }
      }
    });
  },

  destroy() {
    if (this._unsubMeta) { try { this._unsubMeta(); } catch (e) {} this._unsubMeta = null; }
    if (this._unsubYear) { try { this._unsubYear(); } catch (e) {} this._unsubYear = null; }
    if (this._unsubMembers) { try { this._unsubMembers(); } catch (e) {} this._unsubMembers = null; }
    if (this._unsubBanks) { try { this._unsubBanks(); } catch (e) {} this._unsubBanks = null; }
  }
};

/* ============================================
   內部輔助：套用頁面標題
   ============================================ */
function _applyPageMeta(formRoot, pageKey, allMeta, pages) {
  const custom = allMeta[pageKey] || {};
  const def = getDefaultMetadata(pageKey);
  formRoot.querySelector('#pm-title').value = custom.title || def.title;
  formRoot.querySelector('#pm-sub').value = custom.subtitleStatic !== undefined ? custom.subtitleStatic : (def.subtitleStatic || '');
}

/* ═══ EOF ═══
F: pages/settings.js
V: 1792901970
W: webapp-20261025-001#45
═══ */