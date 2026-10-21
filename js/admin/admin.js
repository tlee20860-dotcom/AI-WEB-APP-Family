// ============================================
// admin.js — 平台管理頁面入口（前端）
// 位置：js/admin/admin.js
// ============================================
// 職責：
//   1. 綁定登出按鈕
//   2. 渲染 3 個 Tab（家庭列表 / 帳號管理 / 預設資料庫）
//   3. 家庭 CRUD（新增 / 刪除 / 初始化）
//   4. 成員帳號 CRUD（新增 / 還原 / 編輯 / 移除）
//   5. 預設資料庫編輯（轉交 initPlatformDefaults）
//
// 依賴契約（詳見 P-08）：
//   - api.adminListFamilies / adminAddFamily / adminRemoveFamily / adminInitFamily
//   - api.familyAccounts.list / create / restore / update / remove
//   - initPlatformDefaults(containerId)
//   - initTabPanel / buildForm / openConfirm / openPrompt / openModal / closeModal
//   - showToast / logout / esc
// ============================================

import { api } from '../core/api.js';
import { logout } from '../core/auth.js';
import { initTabPanel } from '../ui/tab-panel.js';
import { initPlatformDefaults } from './platform-defaults.js';
import { showToast } from '../ui/toast.js';
import { openConfirm, openPrompt, openModal, closeModal } from '../ui/modal.js';
import { buildForm } from '../ui/form-builder.js';
import { esc } from '../lib/dom.js';

const TABS = [
  { key: 'families', label: '家庭列表', icon: 'home',     panelId: 'admin-panel-families' },
  { key: 'accounts', label: '帳號管理', icon: 'users',    panelId: 'admin-panel-accounts' },
  { key: 'defaults', label: '預設資料庫', icon: 'database', panelId: 'admin-panel-defaults' },
];

let _tabPanel = null;
let _defaultsApi = null;
let _familiesCache = [];
let _accountsCache = {};
let _selectedFamilyId = '';
let _cleanups = [];

/* ============================================
   主入口
   ============================================ */
export function initAdminPage() {
  _cleanups = [];
  _bindLogout();
  _initTabs();
  if (window.lucide) window.lucide.createIcons();
}

/* ============================================
   錯誤橫幅
   ============================================ */
function _showError(msg) {
  const el = document.getElementById('admin-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function _clearError() {
  const el = document.getElementById('admin-error');
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}

/* ============================================
   登出
   ============================================ */
function _bindLogout() {
  const btn = document.getElementById('admin-logout-btn');
  if (!btn) return;
  const handler = () => logout();
  btn.addEventListener('click', handler);
  _cleanups.push(() => btn.removeEventListener('click', handler));
}

/* ============================================
   Tabs 初始化
   ============================================ */
function _initTabs() {
  _tabPanel = initTabPanel({
    containerId: 'admin-tabs',
    tabs: TABS,
    defaultKey: 'families',
    storageKey: 'admin-tab',
    wrap: true,
    onChange: (key) => _activateTab(key),
  });
}

async function _activateTab(key) {
  _clearError();
  if (key === 'families') return _renderFamiliesTab();
  if (key === 'accounts') return _renderAccountsTab();
  if (key === 'defaults') return _renderDefaultsTab();
}

/* ============================================
   Tab 1：家庭列表
   ============================================ */
async function _renderFamiliesTab() {
  const panel = document.getElementById('admin-panel-families');
  if (!panel) return;

  panel.innerHTML = `
    <div class="flex flex-between items-center flex-wrap gap-12 mb-16">
      <div class="text-muted" style="font-size:13px;">共 <span id="admin-families-count">0</span> 個家庭</div>
      <button type="button" class="btn btn-primary" id="admin-add-family-btn">
        <i data-lucide="plus" style="width:14px;height:14px;"></i> 新增家庭
      </button>
    </div>
    <div id="admin-families-list"></div>
  `;

  const addBtn = document.getElementById('admin-add-family-btn');
  if (addBtn) addBtn.addEventListener('click', _openAddFamilyModal);

  await _loadFamilies();
  if (window.lucide) window.lucide.createIcons();
}

async function _loadFamilies() {
  const listEl = document.getElementById('admin-families-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="glass-card"><div class="empty-state">載入中…</div></div>';

  try {
    const result = await api.adminListFamilies();
    _familiesCache = result.families || [];
    const countEl = document.getElementById('admin-families-count');
    if (countEl) countEl.textContent = String(_familiesCache.length);
    _paintFamiliesList();
  } catch (err) {
    _showError('載入家庭列表失敗：' + (err.message || err));
    listEl.innerHTML = '<div class="glass-card"><div class="empty-state text-red">載入失敗</div></div>';
  }
}

function _paintFamiliesList() {
  const listEl = document.getElementById('admin-families-list');
  if (!listEl) return;

  if (_familiesCache.length === 0) {
    listEl.innerHTML = '<div class="glass-card"><div class="empty-state">尚無家庭</div></div>';
    return;
  }

  listEl.innerHTML = `
    <div class="glass-card" style="padding:0;">
      <div class="data-table-scroll-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:220px;">UID</th>
              <th>名稱</th>
              <th style="width:200px;">擁有者 Email</th>
              <th style="width:170px;">建立時間</th>
              <th style="width:200px;">操作</th>
            </tr>
          </thead>
          <tbody>
            ${_familiesCache.map((f) => `
              <tr>
                <td><span class="mono" style="font-size:12px;">${esc(f.uid)}</span></td>
                <td>${esc(f.name || '（未命名）')}</td>
                <td><span class="mono" style="font-size:12px; color:var(--text-muted);">${esc(f.ownerEmail || '—')}</span></td>
                <td><span class="mono" style="font-size:12px; color:var(--text-muted);">${_formatTimestamp(f.createdAt)}</span></td>
                <td>
                  <button type="button" class="btn btn-sm btn-ghost" data-action="init" data-uid="${esc(f.uid)}">
                    <i data-lucide="refresh-cw" style="width:12px;height:12px;"></i> 初始化
                  </button>
                  <button type="button" class="btn btn-sm btn-danger" data-action="remove" data-uid="${esc(f.uid)}">
                    <i data-lucide="trash-2" style="width:12px;height:12px;"></i> 刪除
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  const handler = async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const uid = btn.dataset.uid;
    const family = _familiesCache.find((f) => f.uid === uid);
    if (!family) return;

    if (btn.dataset.action === 'init') await _handleInitFamily(family);
    else if (btn.dataset.action === 'remove') await _handleRemoveFamily(family);
  };
  listEl.addEventListener('click', handler);
  _cleanups.push(() => listEl.removeEventListener('click', handler));
}

async function _handleInitFamily(family) {
  const ok = await openConfirm(
    `要對家庭「${family.name || family.uid}」執行初始化嗎？\n\n` +
    `將寫入平台預設資料（成員 / 類別 / 項目 / 狀態等）。\n` +
    `若家庭已有資料，將自動跳過。`,
    { title: '初始化家庭', okText: '初始化', okClass: 'btn-primary' }
  );
  if (!ok) return;

  try {
    const result = await api.adminInitFamily(family.uid);
    if (result.skipped) {
      showToast('此家庭已有資料，已跳過', 'info');
      return;
    }
    if (result.partial) {
      const failed = (result.failedSteps || []).join(', ');
      _showError(`初始化部分失敗，未完成的步驟：${failed || '(未知)'}`);
      showToast('初始化部分完成', 'warning');
    } else {
      showToast('✅ 家庭初始化完成', 'success');
    }
  } catch (err) {
    _showError('初始化失敗：' + (err.message || err));
    showToast('初始化失敗', 'error');
  }
}

async function _handleRemoveFamily(family) {
  const ok = await openConfirm(
    `⚠️ 確定要刪除家庭「${family.name || family.uid}」嗎？\n\n` +
    `將一併刪除：\n` +
    `• 平台記錄（platform/families）\n` +
    `• 家庭所有資料（families/{uid}）\n` +
    `• 所有成員帳號索引\n\n` +
    `此操作不可逆。`,
    { title: '刪除家庭', okText: '下一步', okClass: 'btn-danger' }
  );
  if (!ok) return;

  const input = await openPrompt({
    title: '確認刪除',
    label: `請輸入 UID「${family.uid}」以確認：`,
    placeholder: family.uid,
    okText: '刪除',
    cancelText: '取消',
  });
  if (input !== family.uid) {
    showToast('UID 不符，已取消', 'warning');
    return;
  }

  try {
    const result = await api.adminRemoveFamily(family.uid);
    showToast(`✅ 已刪除（清理 ${result.cleanedIndexes || 0} 個索引）`, 'success');
    await _loadFamilies();
  } catch (err) {
    _showError('刪除失敗：' + (err.message || err));
    showToast('刪除失敗', 'error');
  }
}

async function _openAddFamilyModal() {
  const MODAL_ID = 'admin-add-family-modal';
  document.getElementById(MODAL_ID)?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = MODAL_ID;
  overlay.innerHTML = `
    <div class="modal" style="max-width:480px;">
      <h2 class="modal-title">新增家庭</h2>
      <div id="${MODAL_ID}-form-root"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  buildForm({
    containerId: `${MODAL_ID}-form-root`,
    fields: [
      { type: 'text', id: 'uid', label: 'Family UID', required: true, maxlength: 80, hint: '通常為擁有者的 Firebase Auth uid' },
      { type: 'text', id: 'name', label: '家庭名稱', required: true, maxlength: 40 },
      { type: 'text', id: 'email', label: '擁有者 Email（可選）', maxlength: 80 },
    ],
    submitText: '新增', showCancel: true, cancelText: '取消',
    onSubmit: async (data) => {
      try {
        await api.adminAddFamily(
          String(data.uid || '').trim(),
          String(data.name || '').trim(),
          String(data.email || '').trim()
        );
        showToast('✅ 已新增家庭', 'success');
        closeModal(MODAL_ID);
        overlay.remove();
        await _loadFamilies();
      } catch (err) {
        _showError('新增失敗：' + (err.message || err));
        showToast('新增失敗', 'error');
      }
    },
    onCancel: () => { closeModal(MODAL_ID); overlay.remove(); },
  });

  openModal(MODAL_ID);
  if (window.lucide) window.lucide.createIcons();
}

/* ============================================
   Tab 2：帳號管理
   ============================================ */
async function _renderAccountsTab() {
  const panel = document.getElementById('admin-panel-accounts');
  if (!panel) return;

  if (_familiesCache.length === 0) {
    try {
      const result = await api.adminListFamilies();
      _familiesCache = result.families || [];
    } catch (err) { /* noop */ }
  }

  panel.innerHTML = `
    <div class="glass-card" style="padding:12px; margin-bottom:16px;">
      <div class="flex items-center gap-12 flex-wrap">
        <div class="flex items-center gap-8">
          <label class="field-label" style="margin:0;">選擇家庭：</label>
          <select class="select" id="admin-accounts-family" style="min-width:240px; width:auto;">
            <option value="">— 請選擇 —</option>
            ${_familiesCache.map((f) => `<option value="${esc(f.uid)}" ${f.uid === _selectedFamilyId ? 'selected' : ''}>${esc(f.name || f.uid)}</option>`).join('')}
          </select>
        </div>
        <div class="flex items-center gap-8" style="margin-left:auto;">
          <button type="button" class="btn btn-ghost" id="admin-restore-account-btn" ${!_selectedFamilyId ? 'disabled' : ''}>
            <i data-lucide="rotate-ccw" style="width:14px;height:14px;"></i> 還原帳號
          </button>
          <button type="button" class="btn btn-primary" id="admin-add-account-btn" ${!_selectedFamilyId ? 'disabled' : ''}>
            <i data-lucide="plus" style="width:14px;height:14px;"></i> 新增帳號
          </button>
        </div>
      </div>
    </div>
    <div id="admin-accounts-list"></div>
  `;

  const sel = document.getElementById('admin-accounts-family');
  if (sel) {
    sel.addEventListener('change', async () => {
      _selectedFamilyId = sel.value;
      _updateAccountButtons();
      if (_selectedFamilyId) await _loadAccounts(_selectedFamilyId);
      else _showAccountsPrompt();
    });
  }

  const addBtn = document.getElementById('admin-add-account-btn');
  if (addBtn) addBtn.addEventListener('click', () => {
    if (_selectedFamilyId) _openAddAccountModal(_selectedFamilyId);
  });

  const restoreBtn = document.getElementById('admin-restore-account-btn');
  if (restoreBtn) restoreBtn.addEventListener('click', () => {
    if (_selectedFamilyId) _openRestoreAccountModal(_selectedFamilyId);
  });

  if (_selectedFamilyId) await _loadAccounts(_selectedFamilyId);
  else _showAccountsPrompt();

  if (window.lucide) window.lucide.createIcons();
}

function _updateAccountButtons() {
  const addBtn = document.getElementById('admin-add-account-btn');
  const restoreBtn = document.getElementById('admin-restore-account-btn');
  const disabled = !_selectedFamilyId;
  if (addBtn) addBtn.disabled = disabled;
  if (restoreBtn) restoreBtn.disabled = disabled;
}

function _showAccountsPrompt() {
  const listEl = document.getElementById('admin-accounts-list');
  if (listEl) listEl.innerHTML = '<div class="glass-card"><div class="empty-state">請先選擇家庭</div></div>';
}

async function _loadAccounts(familyId) {
  const listEl = document.getElementById('admin-accounts-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="glass-card"><div class="empty-state">載入中…</div></div>';

  try {
    const result = await api.familyAccounts.list(familyId);
    _accountsCache[familyId] = result.accounts || [];
    _paintAccountsList(familyId);
  } catch (err) {
    _showError('載入帳號列表失敗：' + (err.message || err));
    listEl.innerHTML = '<div class="glass-card"><div class="empty-state text-red">載入失敗</div></div>';
  }
}

function _paintAccountsList(familyId) {
  const listEl = document.getElementById('admin-accounts-list');
  if (!listEl) return;
  const accounts = _accountsCache[familyId] || [];

  if (accounts.length === 0) {
    listEl.innerHTML = '<div class="glass-card"><div class="empty-state">此家庭尚無帳號</div></div>';
    return;
  }

  listEl.innerHTML = `
    <div class="glass-card" style="padding:0;">
      <div class="data-table-scroll-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>帳號</th>
              <th>顯示名稱</th>
              <th style="width:100px;">角色</th>
              <th style="width:90px;">可輸入</th>
              <th style="width:160px;">成員 ID</th>
              <th style="width:180px;">操作</th>
            </tr>
          </thead>
          <tbody>
            ${accounts.map((a) => `
              <tr>
                <td><span class="mono" style="font-size:12px;">${esc(a.account || '—')}</span></td>
                <td>${esc(a.displayName || '—')}</td>
                <td>${a.role === 'owner' ? '<span class="badge badge-info">擁有者</span>' : '<span class="badge badge-muted">成員</span>'}</td>
                <td>${a.canInput !== false ? '<span class="badge badge-success">是</span>' : '<span class="badge badge-muted">否</span>'}</td>
                <td><span class="mono" style="font-size:12px; color:var(--text-muted);">${esc(a.memberId || '—')}</span></td>
                <td>
                  <button type="button" class="btn btn-sm btn-ghost" data-action="edit" data-uid="${esc(a.id)}">
                    <i data-lucide="pencil" style="width:12px;height:12px;"></i> 編輯
                  </button>
                  ${a.role !== 'owner' ? `
                    <button type="button" class="btn btn-sm btn-danger" data-action="remove" data-uid="${esc(a.id)}">
                      <i data-lucide="trash-2" style="width:12px;height:12px;"></i> 移除
                    </button>
                  ` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  const handler = async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const uid = btn.dataset.uid;
    const account = accounts.find((a) => a.id === uid);
    if (!account) return;

    if (btn.dataset.action === 'edit') await _openEditAccountModal(familyId, account);
    else if (btn.dataset.action === 'remove') await _handleRemoveAccount(familyId, account);
  };
  listEl.addEventListener('click', handler);
  _cleanups.push(() => listEl.removeEventListener('click', handler));
}

async function _openAddAccountModal(familyId) {
  const MODAL_ID = 'admin-add-account-modal';
  document.getElementById(MODAL_ID)?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = MODAL_ID;
  overlay.innerHTML = `
    <div class="modal" style="max-width:520px; max-height:90vh; overflow-y:auto;">
      <h2 class="modal-title">新增成員帳號</h2>
      <div id="${MODAL_ID}-form-root"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  buildForm({
    containerId: `${MODAL_ID}-form-root`,
    fields: [
      { type: 'text', id: 'account', label: '帳號（小寫英文數字 . _ -）', required: true, maxlength: 40 },
      { type: 'text', id: 'password', label: '密碼（至少 6 位）', required: true, maxlength: 60 },
      { type: 'text', id: 'displayName', label: '顯示名稱', required: true, maxlength: 40 },
      { type: 'select', id: 'role', label: '角色', required: true, includeEmpty: false,
        options: [{ value: 'member', label: '成員' }, { value: 'owner', label: '擁有者' }],
        defaultValue: 'member' },
      { type: 'select', id: 'canInput', label: '可輸入', required: true, includeEmpty: false,
        options: [{ value: 'true', label: '是' }, { value: 'false', label: '否（只讀）' }],
        defaultValue: 'true' },
      { type: 'text', id: 'memberId', label: '成員 ID（可選，留空自動匹配）', maxlength: 40 },
    ],
    submitText: '新增', showCancel: true, cancelText: '取消',
    onSubmit: async (data) => {
      try {
        await api.familyAccounts.create(familyId, {
          account: String(data.account || '').trim().toLowerCase(),
          password: String(data.password || ''),
          displayName: String(data.displayName || '').trim(),
          role: data.role,
          canInput: data.canInput === 'true',
          memberId: String(data.memberId || '').trim(),
        });
        showToast('✅ 已新增帳號', 'success');
        closeModal(MODAL_ID);
        overlay.remove();
        await _loadAccounts(familyId);
      } catch (err) {
        _showError('新增帳號失敗：' + (err.message || err));
        showToast('新增失敗', 'error');
      }
    },
    onCancel: () => { closeModal(MODAL_ID); overlay.remove(); },
  });

  openModal(MODAL_ID);
  if (window.lucide) window.lucide.createIcons();
}

async function _openRestoreAccountModal(familyId) {
  const MODAL_ID = 'admin-restore-account-modal';
  document.getElementById(MODAL_ID)?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = MODAL_ID;
  overlay.innerHTML = `
    <div class="modal" style="max-width:520px; max-height:90vh; overflow-y:auto;">
      <h2 class="modal-title">還原成員帳號</h2>
      <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
        用於 Firebase Auth 已存在、但平台記錄缺失的帳號。
      </p>
      <div id="${MODAL_ID}-form-root"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  buildForm({
    containerId: `${MODAL_ID}-form-root`,
    fields: [
      { type: 'text', id: 'account', label: '帳號（小寫英文數字 . _ -）', required: true, maxlength: 40 },
      { type: 'text', id: 'password', label: '舊密碼（用於驗證身份）', required: true, maxlength: 60 },
      { type: 'text', id: 'displayName', label: '顯示名稱', required: true, maxlength: 40 },
      { type: 'select', id: 'role', label: '角色', required: true, includeEmpty: false,
        options: [{ value: 'member', label: '成員' }, { value: 'owner', label: '擁有者' }],
        defaultValue: 'member' },
      { type: 'select', id: 'canInput', label: '可輸入', required: true, includeEmpty: false,
        options: [{ value: 'true', label: '是' }, { value: 'false', label: '否（只讀）' }],
        defaultValue: 'true' },
      { type: 'text', id: 'memberId', label: '成員 ID（可選）', maxlength: 40 },
    ],
    submitText: '還原', showCancel: true, cancelText: '取消',
    onSubmit: async (data) => {
      try {
        await api.familyAccounts.restore(familyId, {
          account: String(data.account || '').trim().toLowerCase(),
          password: String(data.password || ''),
          displayName: String(data.displayName || '').trim(),
          role: data.role,
          canInput: data.canInput === 'true',
          memberId: String(data.memberId || '').trim(),
        });
        showToast('✅ 已還原帳號', 'success');
        closeModal(MODAL_ID);
        overlay.remove();
        await _loadAccounts(familyId);
      } catch (err) {
        _showError('還原失敗：' + (err.message || err));
        showToast('還原失敗', 'error');
      }
    },
    onCancel: () => { closeModal(MODAL_ID); overlay.remove(); },
  });

  openModal(MODAL_ID);
  if (window.lucide) window.lucide.createIcons();
}

async function _openEditAccountModal(familyId, account) {
  const MODAL_ID = 'admin-edit-account-modal';
  document.getElementById(MODAL_ID)?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = MODAL_ID;
  overlay.innerHTML = `
    <div class="modal" style="max-width:480px;">
      <h2 class="modal-title">編輯帳號</h2>
      <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
        帳號「${esc(account.account || account.id)}」不可修改，僅可編輯以下欄位。
      </p>
      <div id="${MODAL_ID}-form-root"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  buildForm({
    containerId: `${MODAL_ID}-form-root`,
    fields: [
      { type: 'text', id: 'displayName', label: '顯示名稱', required: true, maxlength: 40 },
      { type: 'select', id: 'role', label: '角色', required: true, includeEmpty: false,
        options: [{ value: 'member', label: '成員' }, { value: 'owner', label: '擁有者' }] },
      { type: 'select', id: 'canInput', label: '可輸入', required: true, includeEmpty: false,
        options: [{ value: 'true', label: '是' }, { value: 'false', label: '否（只讀）' }] },
      { type: 'text', id: 'memberId', label: '成員 ID', maxlength: 40 },
    ],
    initialData: {
      displayName: account.displayName || '',
      role: account.role === 'owner' ? 'owner' : 'member',
      canInput: account.canInput !== false ? 'true' : 'false',
      memberId: account.memberId || '',
    },
    submitText: '儲存', showCancel: true, cancelText: '取消',
    onSubmit: async (data) => {
      try {
        await api.familyAccounts.update(familyId, account.id, {
          displayName: String(data.displayName || '').trim(),
          role: data.role,
          canInput: data.canInput === 'true',
          memberId: String(data.memberId || '').trim(),
        });
        showToast('✅ 已更新', 'success');
        closeModal(MODAL_ID);
        overlay.remove();
        await _loadAccounts(familyId);
      } catch (err) {
        _showError('更新失敗：' + (err.message || err));
        showToast('更新失敗', 'error');
      }
    },
    onCancel: () => { closeModal(MODAL_ID); overlay.remove(); },
  });

  openModal(MODAL_ID);
  if (window.lucide) window.lucide.createIcons();
}

async function _handleRemoveAccount(familyId, account) {
  const ok = await openConfirm(
    `確定要移除帳號「${account.displayName || account.account}」嗎？\n\n` +
    `將移除平台記錄與索引（Firebase Auth 帳號本身不會刪除）。`,
    { title: '移除帳號', okText: '移除', okClass: 'btn-danger' }
  );
  if (!ok) return;

  try {
    await api.familyAccounts.remove(familyId, account.id);
    showToast('✅ 已移除帳號', 'success');
    await _loadAccounts(familyId);
  } catch (err) {
    _showError('移除失敗：' + (err.message || err));
    showToast('移除失敗', 'error');
  }
}

/* ============================================
   Tab 3：預設資料庫
   ============================================ */
function _renderDefaultsTab() {
  if (_defaultsApi) {
    try { _defaultsApi.refresh?.(); } catch (e) { /* noop */ }
    return;
  }
  _defaultsApi = initPlatformDefaults('admin-defaults-root');
}

/* ============================================
   工具
   ============================================ */
function _formatTimestamp(ts) {
  if (!ts || !Number.isFinite(Number(ts))) return '—';
  try {
    const d = new Date(Number(ts));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${dd} ${hh}:${mm}`;
  } catch (e) {
    return '—';
  }
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/admin/admin.js
   Version: 1792620000
   Batch: B34-5
   Writer: ai-system-20261021-005#1
   ═══════════════════════════════════════════ */