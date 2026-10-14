// entity-modal.js — 通用實體編輯 Modal（v103.0.24）
// v103.0.24（B34-4）：
//   ✅ createEntity / updateEntity 回傳 { id, code }（D-080）
//   ✅ onSuccess 回傳 { id, code, data }（統一格式）
// v103.0.23（B34-4）：
//   ✅ 新增後回傳新 code 給呼叫端
// v103.0.22（B25-2）：
//   ✅ 傳 defaultYear / defaultMonth 給 funds-allocation 欄位
// ============================================
import { buildForm } from '../ui/form-builder.js';
import { openModal, closeModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import {
  createEntity,
  updateEntity,
  buildInitialData,
  getFieldDefaults,
} from './entity-helpers.js';
import { getEntityDef } from './entity-definitions.js';
import { renderFundsAllocationField } from './entity-funds-allocation.js';
import { esc } from '../lib/dom.js';

const MODAL_ID = 'entity-modal-root';
const FORM_ROOT_ID = 'entity-modal-form-root';
const TITLE_ID = 'entity-modal-title';
const ALLOC_ROOT_ID = 'em-funds-allocation-root';

export async function openEntityModal(options) {
  const {
    entity, mode = 'add', id = null, initialData = null,
    allRows = [], onSuccess, onCancel,
  } = options;
  const def = getEntityDef(entity);
  if (!def) { showToast(`未知的實體：${entity}`, 'error'); return null; }

  _ensureModal();
  const titleEl = document.getElementById(TITLE_ID);
  if (titleEl) titleEl.textContent = `${mode === 'edit' ? '編輯' : '新增'}${def.label}`;

  let initData = initialData;
  if (mode === 'edit' && id && !initData) {
    const row = allRows.find((r) => r.id === id);
    if (row) initData = buildInitialData(entity, row);
  }
  if (mode === 'add' && !initData) initData = getFieldDefaults(entity);

  const fields = def.fields.map((f) => {
    if (f.type === 'funds-allocation') {
      return {
        type: 'custom',
        id: f.id,
        html: `<div class="field">
          <label class="field-label">${esc(f.label || '')}</label>
          <div id="${ALLOC_ROOT_ID}"></div>
          ${f.hint ? `<div class="glass-card-hint" style="margin-top:4px;">${esc(f.hint)}</div>` : ''}
        </div>`,
      };
    }
    return f;
  });

  const formApi = buildForm({
    containerId: FORM_ROOT_ID,
    idPrefix: 'em-',
    fields,
    submitText: mode === 'edit' ? '儲存' : `新增${def.label}`,
    showCancel: true,
    cancelText: '取消',
    initialData: initData,
    beforeSubmit: (data) => {
      if (def.fields.some((f) => f.type === 'funds-allocation')) {
        const allocRoot = document.getElementById(ALLOC_ROOT_ID);
        if (allocRoot && allocRoot.__getValue) data.fundsAllocation = allocRoot.__getValue();
      }
      if (def.validate) {
        const err = def.validate(data, allRows, id);
        if (err) return err;
      }
      return true;
    },
    onSubmit: async (data) => {
      try {
        let result;
        if (mode === 'edit' && id) {
          /* ✅ v2：updateEntity 回傳 { id, code } */
          const r = await updateEntity(entity, id, data, allRows);
          result = { id: r.id, code: r.code, data };
          showToast(`✅ 已更新${def.label}`, 'success');
        } else {
          /* ✅ v2：createEntity 回傳 { id, code } */
          const r = await createEntity(entity, data, allRows);
          result = { id: r.id, code: r.code, data };
          showToast(`✅ 已新增${def.label}`, 'success');
        }
        closeModal(MODAL_ID);
        if (typeof onSuccess === 'function') onSuccess(result);
      } catch (err) {
        console.error('[entity-modal] 提交失敗：', err);
        showToast('操作失敗：' + (err.message || err), 'error');
      }
    },
    onCancel: () => {
      closeModal(MODAL_ID);
      if (typeof onCancel === 'function') onCancel();
    },
  });

  /* 基金分配欄位 */
  if (def.fields.some((f) => f.type === 'funds-allocation')) {
    const allocRoot = document.getElementById(ALLOC_ROOT_ID);
    if (allocRoot) {
      allocRoot.__getValue = renderFundsAllocationField(
        allocRoot,
        initData?.fundsAllocation || [],
        initData?.type || 'normal',
        {
          defaultYear: initData?.firstStartYear || new Date().getFullYear(),
          defaultMonth: initData?.firstStartMonth || '01',
        }
      );
    }
  }

  openModal(MODAL_ID);
  setTimeout(() => {
    const first = document.querySelector(`#${FORM_ROOT_ID} input, #${FORM_ROOT_ID} select`);
    if (first) first.focus();
  }, 100);

  return formApi;
}

export function openEntityAddModal(entity, options = {}) {
  return openEntityModal({ entity, mode: 'add', ...options });
}

export function openEntityEditModal(entity, id, options = {}) {
  return openEntityModal({ entity, mode: 'edit', id, ...options });
}

export function closeEntityModal() { closeModal(MODAL_ID); }

function _ensureModal() {
  let overlay = document.getElementById(MODAL_ID);
  if (overlay) {
    const root = document.getElementById(FORM_ROOT_ID);
    if (root) root.innerHTML = '';
    return;
  }
  overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = MODAL_ID;
  overlay.innerHTML = `
    <div class="modal" style="max-width:560px;max-height:90vh;overflow-y:auto;">
      <h2 class="modal-title" id="${TITLE_ID}">編輯</h2>
      <div id="${FORM_ROOT_ID}"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(MODAL_ID);
  });
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/entity/entity-modal.js
   Version: 1791901240
   Batch: B34-4
   Writer: A20261013-004#090
   ═══════════════════════════════════════════ */