// ============================================
// settings.js — 系統設定頁面（V2 引擎版）
// 位置：pages/settings.js
// 說明：整合帳號資訊、統計模式、成員管理、年份範圍、頁面標題與除錯工具。
// ============================================

import { AppState } from '../config/state.js';
import { logout } from '../domain/auth.js';
import { openConfirm } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { esc } from '../ui/format.js';
import { ROLES, STORAGE_KEYS, ENTITY_KEYS } from '../config/constants.js';
import { initTabPanel } from '../ui/tab-panel.js';
import { initEntityListPage } from '../shared/entity-list-page.js';
import { initBankAccountManager } from '../shared/bank-account-manager.js';
import { createForm } from '../ui/form.js';
import { listen, saveObject } from '../db/index.js';
import { listPages, getDefaultMetadata } from '../config/page-metadata-registry.js';

export default {
  _unsubMeta: null,
  _unsubYear: null,
  _memberList: null,
  _bankMgr: null,

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
        <div id="bank-account-manager-root"></div>
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
        if (key === 'banks' && !this._bankMgr) {
          this._bankMgr = initBankAccountManager('bank-account-manager-root', { canInput: AppState.getCanInput() });
        }
        if (key === 'personal') {
          this._initPersonalTab();
        }
      }
    });

    // 3. 若預設為個人化，直接初始化
    if (tabPanel.getCurrent() === 'personal') {
      this._initPersonalTab();
    }
  },

  _initPersonalTab() {
    // 3.1 帳號資訊
    const accEl = document.getElementById('settings-account');
    const roleEl = document.getElementById('settings-role');
    const famEl = document.getElementById('settings-family');
    const memberAcc = AppState.getMemberAccount() || {};

    if (accEl) accEl.value = memberAcc.account || (AppState.currentUser?.email ? AppState.currentUser.email.split('@')[0] : '—');
    if (roleEl) roleEl.value = AppState.getRole() === ROLES.SUPERADMIN ? '超級管理員' : (AppState.getRole() === ROLES.OWNER ? '擁有者' : '成員');
    if (famEl) famEl.value = AppState.getFamilyName() || '—';

    document.getElementById('settings-logout-btn')?.addEventListener('click', async () => {
      if (await openConfirm('確定要登出嗎？', { title: '登出', okClass: 'btn-danger' })) logout();
    });

    // 3.2 統計模式
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

      document.getElementById('save-stats-mode-btn')?.addEventListener('click', () => {
        const selected = document.querySelector('input[name="stats-mode"]:checked');
        if (selected) {
          localStorage.setItem(STORAGE_KEYS.STATS_MODE, selected.value);
          showToast('✅ 已儲存顯示模式', 'success');
        }
      });
    }

    // 3.3 年份範圍
    const yearFormRoot = document.getElementById('yearrange-form-root');
    if (yearFormRoot) {
      let startYear = '', futureYears = 5;
      if (this._unsubYear) this._unsubYear();
      this._unsubYear = listen('settings/year_range', (snap) => {
        const data = snap.val() || {};
        startYear = data.startYear || '';
        futureYears = data.futureYears || 5;
        if (yearFormRoot.querySelector('form')) {
          yearFormRoot.querySelector('#yr-start').value = startYear;
          yearFormRoot.querySelector('#yr-future').value = futureYears;
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

    // 3.4 頁面標題
    const pageFormRoot = document.getElementById('pagemeta-form-root');
    if (pageFormRoot) {
      const pages = listPages();
      let allMeta = {};
      
      if (this._unsubMeta) this._unsubMeta();
      this._unsubMeta = listen('settings/page_metadata', (snap) => {
        allMeta = snap.val() || {};
        const pageSel = pageFormRoot.querySelector('#pm-page');
        if (pageSel) {
          _applyPageMeta(pageFormRoot, pageSel.value, allMeta, pages);
        }
      });

      // 構建自訂 HTML 表單
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

      pageFormRoot.querySelector('#pm-page').addEventListener('change', (e) => {
        _applyPageMeta(pageFormRoot, e.target.value, allMeta, pages);
      });

      pageFormRoot.querySelector('#pm-save').addEventListener('click', async () => {
        const pk = pageFormRoot.querySelector('#pm-page').value;
        const title = pageFormRoot.querySelector('#pm-title').value.trim();
        const sub = pageFormRoot.querySelector('#pm-sub').value;
        if (!title) { showToast('標題不可為空', 'warning'); return; }
        
        const next = { ...allMeta, [pk]: { title, subtitleStatic: sub } };
        await saveObject('settings/page_metadata', next);
        showToast('✅ 頁面標題已更新', 'success');
      });

      pageFormRoot.querySelector('#pm-reset').addEventListener('click', async () => {
        const pk = pageFormRoot.querySelector('#pm-page').value;
        const next = { ...allMeta };
        delete next[pk];
        await saveObject('settings/page_metadata', next);
        _applyPageMeta(pageFormRoot, pk, next, pages);
        showToast('✅ 已恢復預設', 'success');
      });
    }

    // 3.5 vConsole 除錯工具
    const debugStatus = document.getElementById('debug-status');
    const updateDebugUI = async () => {
      try {
        const mod = await import('../core/debug.js');
        debugStatus.innerHTML = mod.isDebugEnabled() ? '<span class="badge badge-success">● 已開啟</span>' : '<span class="badge badge-muted">● 已關閉</span>';
      } catch (e) { debugStatus.innerHTML = '載入失敗'; }
    };
    updateDebugUI();

    document.getElementById('debug-enable-btn')?.addEventListener('click', async () => {
      const mod = await import('../core/debug.js');
      await mod.forceEnableDebug();
      updateDebugUI();
    });
    document.getElementById('debug-disable-btn')?.addEventListener('click', async () => {
      const mod = await import('../core/debug.js');
      mod.forceDisableDebug();
      updateDebugUI();
    });

    // 3.6 家庭成員
    if (!this._memberList) {
      this._memberList = initEntityListPage({
        entity: ENTITY_KEYS.MEMBER,
        containerId: 'family-members-root',
        options: { defaultView: 'table', showViewToggle: false }
      });
    }

    if (window.lucide) window.lucide.createIcons();
  },

  destroy() {
    if (this._unsubMeta) { try { this._unsubMeta(); } catch (e) {} this._unsubMeta = null; }
    if (this._unsubYear) { try { this._unsubYear(); } catch (e) {} this._unsubYear = null; }
    if (this._memberList) { try { this._memberList.destroy(); } catch (e) {} this._memberList = null; }
    if (this._bankMgr) { try { this._bankMgr.destroy(); } catch (e) {} this._bankMgr = null; }
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
V: 1792901850
W: webapp-20261025-001#33
═══ */