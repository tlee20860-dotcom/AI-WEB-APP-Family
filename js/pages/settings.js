// ============================================
// settings.js — 系統設定（v103.0.36 Page Schema）
// 位置：js/pages/settings.js
// ============================================
// v103.0.36（B34-4）：
//   ✅ 個人化 Tab 加「年份範圍」卡（D-036）
//   ✅ 從 database-yearrange.js 搬入，改用 js/shared/yearrange-card.js
// v103.0.35（B31-1）：
//   ✅ _load 改用 listenPageMetadata（SSOT）
// v103.0.34（B29-5d）：
//   ✅ 個人化 Tab 加「頁面標題」卡
// ============================================

import { initTabPanel } from '../ui/tab-panel.js';
import { initBankAccountManager } from '../shared/bank-account-manager.js';
import { initEntityListPage } from '../shared/entity-list-page.js';
import { initYearRangeCard } from '../shared/yearrange-card.js';
import { AppState } from '../core/state.js';
import { logout } from '../core/auth.js';
import { api } from '../core/api.js';
import { STORAGE_KEYS, ENTITY_KEYS } from '../config/constants.js';
import { showToast } from '../ui/toast.js';
import { openConfirm } from '../ui/modal.js';
import { esc } from '../lib/dom.js';
import { listPages, getDefaultMetadata } from '../config/page-metadata-registry.js';
import { listenPageMetadata, savePageMetadata } from '../core/db.js';

export default {
  title: '系統設定',
  data: {},
  state: { activeTab: AppState.isSuperAdmin ? 'platform' : 'banks' },
  derived: {},
  blocks: [],

  customMount: (ctx) => {
    const isSuper = AppState.isSuperAdmin;
    const tabs = [];

    if (isSuper) {
      tabs.push({ key: 'platform', label: '平台設定', icon: 'settings', panelId: 'settings-panel-platform' });
    }
    tabs.push({ key: 'banks', label: '銀行帳號', icon: 'landmark', panelId: 'settings-panel-banks' });
    tabs.push({ key: 'personal', label: '個人化', icon: 'user', panelId: 'settings-panel-personal' });

    ctx._bankMgr = null;
    ctx._memberList = null;
    ctx._debugCleanup = null;
    ctx._personalCleanup = null;
    ctx._migrateCleanup = null;
    ctx._pageMetaCleanup = null;
    ctx._pageMetaUnsub = null;
    ctx._yearRangeApi = null;   /* 🆕 v103.0.36 */

    const tabPanel = initTabPanel({
      containerId: 'settings-tabs',
      tabs,
      defaultKey: isSuper ? 'platform' : 'banks',
      storageKey: 'settings-tab',
      onChange: (key) => {
        if (key === 'banks') {
          if (!ctx._bankMgr) {
            ctx._bankMgr = initBankAccountManager('bank-account-manager-root', {
              canInput: AppState.getCanInput(),
            });
          } else {
            try { ctx._bankMgr.refresh?.(); } catch (e) {}
          }
        }
        if (key === 'personal') {
          _initPersonalTab(ctx);
        }
      },
    });

    ctx._tabPanel = tabPanel;

    const initialKey = tabPanel?.getCurrent?.();
    if (initialKey === 'personal') _initPersonalTab(ctx);

    return {
      destroy: () => {
        try { tabPanel?.destroy(); } catch (e) {}
        if (ctx._bankMgr) { try { ctx._bankMgr.destroy?.(); } catch (e) {} ctx._bankMgr = null; }
        if (ctx._memberList) { try { ctx._memberList.destroy?.(); } catch (e) {} ctx._memberList = null; }
        if (ctx._personalCleanup) { try { ctx._personalCleanup(); } catch (e) {} ctx._personalCleanup = null; }
        if (ctx._debugCleanup) { try { ctx._debugCleanup(); } catch (e) {} ctx._debugCleanup = null; }
        if (ctx._migrateCleanup) { try { ctx._migrateCleanup(); } catch (e) {} ctx._migrateCleanup = null; }
        if (ctx._pageMetaCleanup) { try { ctx._pageMetaCleanup(); } catch (e) {} ctx._pageMetaCleanup = null; }
        if (ctx._pageMetaUnsub) { try { ctx._pageMetaUnsub(); } catch (e) {} ctx._pageMetaUnsub = null; }
        if (ctx._yearRangeApi) { try { ctx._yearRangeApi.destroy?.(); } catch (e) {} ctx._yearRangeApi = null; }
      },
    };
  },
};

/* ============================================
   個人化 Tab
   ============================================ */
function _initPersonalTab(ctx) {
  if (ctx._personalCleanup) {
    _renderDebugStatus();
    return;
  }

  const accEl = document.getElementById('settings-account');
  const roleEl = document.getElementById('settings-role');
  const famEl = document.getElementById('settings-family');
  const memberAcc = AppState.getMemberAccount() || {};

  if (accEl) accEl.value = memberAcc.account || AppState.currentUser?.email?.split('@')[0] || '—';
  if (roleEl) roleEl.value = AppState.getRoleLabel();
  if (famEl) famEl.value = AppState.getFamilyName() || '—';

  const logoutBtn = document.getElementById('settings-logout-btn');
  const onLogout = async () => {
    const ok = await openConfirm('確定要登出嗎？', { title: '登出', okText: '登出', okClass: 'btn-danger' });
    if (ok) logout();
  };
  if (logoutBtn) logoutBtn.addEventListener('click', onLogout);

  _renderStatsModeOptions();

  const saveBtn = document.getElementById('save-stats-mode-btn');
  const onSaveMode = () => {
    const selected = document.querySelector('input[name="stats-mode"]:checked');
    if (!selected) return;
    try {
      localStorage.setItem(STORAGE_KEYS.STATS_MODE, selected.value);
      showToast('✅ 已儲存顯示模式', 'success');
    } catch (e) {
      showToast('儲存失敗', 'error');
    }
  };
  if (saveBtn) saveBtn.addEventListener('click', onSaveMode);

  const memberRoot = document.getElementById('family-members-root');
  if (memberRoot && !ctx._memberList) {
    ctx._memberList = initEntityListPage({
      entity: ENTITY_KEYS.MEMBER,
      containerId: 'family-members-root',
      options: {
        defaultView: 'table',
        showViewToggle: false,
        storageKey: 'settings-members-view',
        mobileCardMode: true,
      },
    });
  }

  _injectDebugCard(ctx);
  _injectMigrateCard(ctx);
  _injectPageMetadataCard(ctx);
  _injectYearRangeCard(ctx);   /* 🆕 v103.0.36（B34-4） */

  ctx._personalCleanup = () => {
    if (logoutBtn) logoutBtn.removeEventListener('click', onLogout);
    if (saveBtn) saveBtn.removeEventListener('click', onSaveMode);
  };

  if (window.lucide) window.lucide.createIcons();
}

/* ============================================
   統計卡顯示模式
   ============================================ */
function _renderStatsModeOptions() {
  const root = document.getElementById('stats-mode-options');
  if (!root) return;

  let current = 'auto';
  try {
    current = localStorage.getItem(STORAGE_KEYS.STATS_MODE) || 'auto';
  } catch (e) {}

  const options = [
    { value: 'auto',        label: '自動（依裝置 / 檢視模式）' },
    { value: 'integrated',  label: '整合卡（單一大卡）' },
    { value: 'compact',     label: '緊湊卡（多個小卡）' },
  ];

  root.innerHTML = options.map((o) => `
    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:8px; border-radius:6px; background:rgba(255,255,255,0.03);">
      <input type="radio" name="stats-mode" value="${o.value}" ${o.value === current ? 'checked' : ''} style="width:auto; cursor:pointer;">
      <span style="font-size:13px;">${o.label}</span>
    </label>
  `).join('');
}

/* ============================================
   除錯工具卡
   ============================================ */
function _injectDebugCard(ctx) {
  const grid = document.querySelector('#settings-panel-personal .settings-personal-grid');
  if (!grid) return;

  if (document.getElementById('settings-debug-card')) {
    _renderDebugStatus();
    return;
  }

  const card = document.createElement('div');
  card.className = 'glass-card';
  card.id = 'settings-debug-card';
  card.style.gridColumn = '1 / -1';
  card.innerHTML = `
    <div class="glass-card-title" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
      <i data-lucide="bug" style="width:16px;height:16px;color:var(--neon-cyan);"></i>
      <span>除錯工具（開發者用）</span>
    </div>
    <p class="glass-card-hint mb-12">
      手機若無 DevTools，可手動開啟 vConsole 檢視日誌。開啟後會**跨頁保持**，
      直到你手動關閉。
    </p>
    <div id="settings-debug-status" style="margin-bottom:12px; font-size:13px;"></div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button type="button" class="btn btn-primary" id="settings-debug-enable">
        <i data-lucide="play" style="width:14px;height:14px;"></i> 開啟 vConsole
      </button>
      <button type="button" class="btn btn-ghost" id="settings-debug-disable">
        <i data-lucide="square" style="width:14px;height:14px;"></i> 關閉 vConsole
      </button>
    </div>
  `;
  grid.appendChild(card);

  if (window.lucide) window.lucide.createIcons();

  _renderDebugStatus();
  _bindDebugButtons(ctx);
}

async function _renderDebugStatus() {
  const statusEl = document.getElementById('settings-debug-status');
  if (!statusEl) return;

  try {
    const mod = await import('../core/debug.js');
    const enabled = mod.isDebugEnabled();

    statusEl.innerHTML = enabled
      ? '<span class="badge badge-success">● 已開啟</span> <span class="text-muted" style="font-size:12px; margin-left:6px;">vConsole 正在運行（右下角綠點）</span>'
      : '<span class="badge badge-muted">● 已關閉</span> <span class="text-muted" style="font-size:12px; margin-left:6px;">點擊「開啟 vConsole」以啟用</span>';
  } catch (err) {
    statusEl.innerHTML = '<span class="badge badge-pending">載入失敗</span>';
  }
}

function _bindDebugButtons(ctx) {
  const enableBtn = document.getElementById('settings-debug-enable');
  const disableBtn = document.getElementById('settings-debug-disable');

  const onEnable = async () => {
    if (enableBtn.disabled) return;
    enableBtn.disabled = true;
    const originalText = enableBtn.innerHTML;
    enableBtn.innerHTML = '<i data-lucide="loader" style="width:14px;height:14px;"></i> 載入中…';
    if (window.lucide) window.lucide.createIcons();

    try {
      const mod = await import('../core/debug.js');
      const ok = await mod.forceEnableDebug();
      if (ok) showToast('✅ vConsole 已開啟（跨頁保持）', 'success', 3000);
      else showToast('❌ 載入失敗，請檢查網路', 'error', 4000);
    } catch (err) {
      console.error('[settings] vConsole 開啟失敗：', err);
    } finally {
      enableBtn.disabled = false;
      enableBtn.innerHTML = originalText;
      if (window.lucide) window.lucide.createIcons();
      _renderDebugStatus();
    }
  };

  const onDisable = async () => {
    try {
      const mod = await import('../core/debug.js');
      mod.forceDisableDebug();
      showToast('vConsole 已關閉', 'info', 2000);
    } catch (err) {}
    _renderDebugStatus();
  };

  if (enableBtn) enableBtn.addEventListener('click', onEnable);
  if (disableBtn) disableBtn.addEventListener('click', onDisable);

  ctx._debugCleanup = () => {
    if (enableBtn) enableBtn.removeEventListener('click', onEnable);
    if (disableBtn) disableBtn.removeEventListener('click', onDisable);
  };
}

/* ============================================
   一次性遷移卡（superadmin）
   ============================================ */
function _injectMigrateCard(ctx) {
  if (!AppState.isSuperAdmin) return;

  const grid = document.querySelector('#settings-panel-personal .settings-personal-grid');
  if (!grid) return;
  if (document.getElementById('settings-migrate-card')) return;

  const card = document.createElement('div');
  card.className = 'glass-card';
  card.id = 'settings-migrate-card';
  card.style.gridColumn = '1 / -1';
  card.style.borderColor = 'rgba(251,146,60,0.3)';
  card.style.background = 'rgba(251,146,60,0.03)';
  card.innerHTML = `
    <div class="glass-card-title" style="display:flex; align-items:center; gap:8px; margin-bottom:12px; color:var(--neon-orange);">
      <i data-lucide="alert-triangle" style="width:16px;height:16px;"></i>
      <span>一次性資料遷移（超級管理員專用）</span>
    </div>
    <p class="glass-card-hint mb-12">
      將舊資料（狀態名稱、缺失欄位）正規化為新格式。
      <b>可重複執行</b>（已遷移的資料不會再次修改）。
    </p>
    <div class="field" style="margin-bottom:12px;">
      <label class="field-label">目標家庭</label>
      <select class="select" id="settings-migrate-family" style="max-width:400px;">
        <option value="">載入中…</option>
      </select>
    </div>
    <button type="button" class="btn btn-magenta" id="settings-migrate-btn">
      <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> 執行遷移
    </button>
    <div id="settings-migrate-status" style="margin-top:12px; font-size:12px; color:var(--text-muted);"></div>
  `;
  grid.appendChild(card);

  if (window.lucide) window.lucide.createIcons();

  const sel = document.getElementById('settings-migrate-family');
  const btn = document.getElementById('settings-migrate-btn');
  const statusEl = document.getElementById('settings-migrate-status');

  const _loadFamilies = async () => {
    try {
      const data = await api.adminListFamilies();
      const families = data.families || [];
      if (families.length === 0) {
        sel.innerHTML = '<option value="">（尚無家庭）</option>';
        return;
      }
      sel.innerHTML = families.map((f) =>
        `<option value="${esc(f.uid)}">${esc(f.name || f.uid)}（${esc(f.uid.slice(0, 8))}…）</option>`
      ).join('');
    } catch (err) {
      console.error('[settings] 載入家庭清單失敗：', err);
      sel.innerHTML = '<option value="">載入失敗</option>';
    }
  };
  _loadFamilies();

  const onMigrate = async () => {
    const familyId = sel.value;
    if (!familyId) {
      showToast('請先選擇家庭', 'error');
      return;
    }

    const familyName = sel.options[sel.selectedIndex]?.textContent || familyId;

    const ok = await openConfirm(
      `⚠️ 確定要對以下家庭執行一次性資料遷移嗎？\n\n` +
      `目標家庭：${familyName}\n\n` +
      `• 將舊狀態名稱改為新代碼\n` +
      `• 補齊缺失欄位（isAutoLinked / fundsAllocation / type 等）\n` +
      `• 可重複執行（已遷移的資料不會再改）`,
      { title: '一次性資料遷移', okText: '執行遷移', okClass: 'btn-danger' }
    );
    if (!ok) return;

    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = '遷移中…';

    try {
      const result = await api.adminMigrate(familyId);
      const s = result.summary || {};
      const lines = [
        `✅ 完成（${esc(familyName)}）`,
        `• 支出：掃描 ${s.expenses?.scanned || 0}，正規化 ${s.expenses?.normalized || 0}`,
        `• 保險付款：掃描 ${s.payments?.scanned || 0}，正規化 ${s.payments?.normalized || 0}`,
        `• 保單：掃描 ${s.policies?.scanned || 0}，補齊 ${s.policies?.patched || 0}`,
        `• 基金：掃描 ${s.funds?.scanned || 0}，補齊 ${s.funds?.patched || 0}`,
      ];
      if (statusEl) statusEl.innerHTML = lines.join('<br>');
      showToast('✅ 遷移完成', 'success');
    } catch (err) {
      if (statusEl) statusEl.textContent = '❌ 遷移失敗：' + err.message;
      showToast('遷移失敗：' + err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  if (btn) btn.addEventListener('click', onMigrate);

  ctx._migrateCleanup = () => {
    if (btn) btn.removeEventListener('click', onMigrate);
  };
}

/* ============================================
   頁面標題卡
   ============================================ */
function _injectPageMetadataCard(ctx) {
  const grid = document.querySelector('#settings-panel-personal .settings-personal-grid');
  if (!grid) return;
  if (document.getElementById('settings-page-meta-card')) return;

  const pages = listPages();

  const card = document.createElement('div');
  card.className = 'glass-card';
  card.id = 'settings-page-meta-card';
  card.style.gridColumn = '1 / -1';
  card.innerHTML = `
    <div class="glass-card-title" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
      <i data-lucide="type" style="width:16px;height:16px;color:var(--neon-cyan);"></i>
      <span>頁面標題</span>
    </div>
    <p class="glass-card-hint mb-12">
      可自訂每個頁面的標題與副標題（副標題會加在動態資訊之前）。
    </p>

    <div class="field" style="margin-bottom:12px;">
      <label class="field-label">選擇頁面</label>
      <select class="select" id="settings-page-meta-page" style="max-width:400px;">
        ${pages.map((p) => `<option value="${esc(p.key)}">${esc(p.title)}</option>`).join('')}
      </select>
    </div>

    <div class="field" style="margin-bottom:12px;">
      <label class="field-label">頁面標題</label>
      <input class="input" type="text" id="settings-page-meta-title" maxlength="40" placeholder="輸入標題" style="max-width:400px;">
    </div>

    <div class="field" style="margin-bottom:12px;">
      <label class="field-label">副標題（靜態段）</label>
      <input class="input" type="text" id="settings-page-meta-sub" maxlength="60" placeholder="留空 = 使用預設" style="max-width:400px;">
      <div class="glass-card-hint" style="margin-top:4px;">
        💡 此段會加在動態資訊（如年月）之前
      </div>
    </div>

    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button type="button" class="btn btn-primary" id="settings-page-meta-save">
        <i data-lucide="check" style="width:14px;height:14px;"></i> 儲存
      </button>
      <button type="button" class="btn btn-ghost" id="settings-page-meta-reset">
        <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> 恢復預設
      </button>
    </div>

    <div id="settings-page-meta-status" style="margin-top:12px; font-size:12px; color:var(--text-muted);"></div>
  `;
  grid.appendChild(card);

  if (window.lucide) window.lucide.createIcons();

  const pageSel = document.getElementById('settings-page-meta-page');
  const titleInput = document.getElementById('settings-page-meta-title');
  const subInput = document.getElementById('settings-page-meta-sub');
  const saveBtn = document.getElementById('settings-page-meta-save');
  const resetBtn = document.getElementById('settings-page-meta-reset');
  const statusEl = document.getElementById('settings-page-meta-status');

  let _allMeta = {};

  const _applyFormFromMeta = (pageKey) => {
    const custom = _allMeta[pageKey] || {};
    const def = getDefaultMetadata(pageKey);
    titleInput.value = (custom.title != null && custom.title !== '') ? custom.title : def.title;
    subInput.value = (custom.subtitleStatic != null) ? custom.subtitleStatic : (def.subtitleStatic || '');
  };

  const _load = () => {
    if (ctx._pageMetaUnsub) {
      try { ctx._pageMetaUnsub(); } catch (e) { /* noop */ }
      ctx._pageMetaUnsub = null;
    }
    try {
      ctx._pageMetaUnsub = listenPageMetadata((all) => {
        _allMeta = all || {};
        _applyFormFromMeta(pageSel.value);
      });
    } catch (err) {
      console.warn('[settings] 載入頁面 metadata 失敗：', err);
      _applyFormFromMeta(pageSel.value);
    }
  };

  const onPageChange = () => _applyFormFromMeta(pageSel.value);
  pageSel.addEventListener('change', onPageChange);

  const onSave = async () => {
    const pageKey = pageSel.value;
    if (!pageKey) return;

    const title = titleInput.value.trim();
    const subtitleStatic = subInput.value;

    if (!title) {
      showToast('標題不可為空', 'warning');
      return;
    }

    if (saveBtn) saveBtn.disabled = true;
    if (statusEl) statusEl.textContent = '儲存中…';

    try {
      const next = { ..._allMeta };
      next[pageKey] = { title, subtitleStatic };
      await savePageMetadata(next);
      _allMeta = next;
      if (statusEl) statusEl.textContent = '✅ 已儲存';
      showToast('✅ 已儲存頁面標題', 'success');
    } catch (err) {
      if (statusEl) statusEl.textContent = '❌ 儲存失敗：' + err.message;
      showToast('儲存失敗：' + err.message, 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  };

  const onReset = async () => {
    const pageKey = pageSel.value;
    if (!pageKey) return;

    const ok = await openConfirm('確定要恢復此頁面的預設標題嗎？', { title: '恢復預設', okText: '恢復', okClass: 'btn-danger' });
    if (!ok) return;

    try {
      const next = { ..._allMeta };
      delete next[pageKey];
      await savePageMetadata(next);
      _allMeta = next;
      _applyFormFromMeta(pageKey);
      if (statusEl) statusEl.textContent = '✅ 已恢復預設';
      showToast('✅ 已恢復預設', 'success');
    } catch (err) {
      if (statusEl) statusEl.textContent = '❌ 恢復失敗：' + err.message;
      showToast('恢復失敗：' + err.message, 'error');
    }
  };

  if (saveBtn) saveBtn.addEventListener('click', onSave);
  if (resetBtn) resetBtn.addEventListener('click', onReset);

  _load();

  ctx._pageMetaCleanup = () => {
    pageSel.removeEventListener('change', onPageChange);
    if (saveBtn) saveBtn.removeEventListener('click', onSave);
    if (resetBtn) resetBtn.removeEventListener('click', onReset);
  };
}

/* ============================================
   🆕 v103.0.36（B34-4）：年份範圍卡（D-036）
   ============================================ */
function _injectYearRangeCard(ctx) {
  const grid = document.querySelector('#settings-panel-personal .settings-personal-grid');
  if (!grid) return;
  if (document.getElementById('settings-yearrange-card')) return;

  const card = document.createElement('div');
  card.className = 'glass-card';
  card.id = 'settings-yearrange-card';
  card.style.gridColumn = '1 / -1';
  card.innerHTML = `
    <div class="glass-card-title" style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
      <i data-lucide="calendar" style="width:16px;height:16px;color:var(--neon-cyan);"></i>
      <span>年份範圍</span>
    </div>
    <div id="settings-yearrange-root"></div>
  `;
  grid.appendChild(card);

  if (window.lucide) window.lucide.createIcons();

  if (!ctx._yearRangeApi) {
    ctx._yearRangeApi = initYearRangeCard('settings-yearrange-root');
  }
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/pages/settings.js
   Version: 1791901600
   Batch: B34-4
   Writer: A20261013-004#096
   ═══════════════════════════════════════════ */