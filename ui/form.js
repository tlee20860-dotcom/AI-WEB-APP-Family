// ============================================
// form.js — 通用動態表單建構器（V2 引擎版）
// 位置：ui/form.js
// 說明：支援 dependsOn 聯動、custom 自訂區塊、plusEntity。
//       徹底取代 V1 破碎的表單邏輯。
// ============================================

import { esc } from './format.js';
import { handlePlusClick } from './dropdown-plus.js';

/**
 * 建立並渲染表單
 * @param {Object} options
 * @param {string|HTMLElement} options.container - 容器
 * @param {Array} options.fields - 欄位設定陣列
 * @param {Object} [options.initialData] - 初始資料
 * @param {string} [options.submitText] - 送出按鈕文字
 * @param {string} [options.cancelText] - 取消按鈕文字
 * @param {Function} options.onSubmit - (data) => Promise|void 送出回呼
 * @param {Function} [options.onCancel] - 取消回呼
 */
export function createForm(options) {
  const {
    container,
    fields = [],
    initialData = {},
    submitText = '儲存',
    cancelText = '取消',
    onSubmit,
    onCancel
  } = options;

  const root = _resolveEl(container);
  if (!root) {
    console.error('[ui/form] 找不到容器', container);
    return null;
  }

  // 生成欄位 HTML
  const fieldsHtml = fields.map((f) => _renderField(f, initialData[f.id])).join('');

  root.innerHTML = `
    <form class="app-form" novalidate style="display:flex; flex-direction:column; gap:16px;">
      ${fieldsHtml}
      
      <div class="form-actions" style="display:flex; justify-content:flex-end; gap:12px; margin-top:12px;">
        ${onCancel ? `<button type="button" class="btn btn-ghost" data-form-action="cancel">${esc(cancelText)}</button>` : ''}
        <button type="submit" class="btn btn-primary" data-form-action="submit">
          <i data-lucide="check"></i> <span>${esc(submitText)}</span>
        </button>
      </div>
    </form>
  `;

  const formEl = root.querySelector('form');
  const submitBtn = formEl.querySelector('[data-form-action="submit"]');
  const submitBtnSpan = submitBtn.querySelector('span');

  let _isSubmitting = false;

  // 綁定「+」按鈕事件
  _bindPlusEvents(fields, formEl);
  
  // 綁定聯動事件 (dependsOn)
  _bindDependencies(fields, formEl);

  // 表單送出
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (_isSubmitting) return;

    // 清除舊錯誤
    formEl.querySelectorAll('.field-error').forEach(el => el.remove());
    formEl.querySelectorAll('.field').forEach(el => el.style.borderColor = 'transparent');

    const data = _collectData(fields, formEl);
    
    // 基本驗證
    const error = _validate(fields, data, formEl);
    if (error) return;

    if (typeof onSubmit === 'function') {
      _isSubmitting = true;
      submitBtn.disabled = true;
      submitBtnSpan.textContent = '處理中…';
      
      try {
        await onSubmit(data);
      } catch (err) {
        console.error('[ui/form] 送出失敗：', err);
      } finally {
        _isSubmitting = false;
        submitBtn.disabled = false;
        submitBtnSpan.textContent = submitText;
      }
    }
  });

  // 取消按鈕
  if (onCancel) {
    formEl.querySelector('[data-form-action="cancel"]')?.addEventListener('click', onCancel);
  }

  if (window.lucide) window.lucide.createIcons();

  return {
    root,
    formEl,
    // 取得當前表單資料
    getData: () => _collectData(fields, formEl),
    // 重設表單
    reset: () => formEl.reset()
  };
}

/* ============================================
   內部實作：渲染欄位
   ============================================ */
function _renderField(f, value) {
  // 支援自訂區塊 (如基金分配器)
  if (f.type === 'custom') {
    const html = typeof f.html === 'function' ? f.html(value) : (f.html || '');
    return `
      <div class="field" id="field-wrapper-${f.id || 'custom'}">
        ${html}
      </div>
    `;
  }

  const { id, label, type = 'text', required, placeholder = '', options = [], min, max, step, plusEntity } = f;
  const reqMark = required ? '<span style="color:var(--accent-danger); margin-left:4px;">*</span>' : '';
  const valStr = value != null ? String(value) : '';

  let inputHtml = '';

  switch (type) {
    case 'select':
      inputHtml = `
        <select class="input" id="field-${id}" name="${id}" ${required ? 'required' : ''}>
          <option value="">— 請選擇 —</option>
          ${options.map(o => `<option value="${esc(o.value)}" ${String(o.value) === valStr ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
        </select>
      `;
      break;
    case 'textarea':
      inputHtml = `<textarea class="input" id="field-${id}" name="${id}" rows="3" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}>${esc(valStr)}</textarea>`;
      break;
    case 'number':
      const attrs = [
        min != null ? `min="${min}"` : '',
        max != null ? `max="${max}"` : '',
        step != null ? `step="${step}"` : 'step="1"'
      ].join(' ');
      inputHtml = `<input class="input mono" type="number" id="field-${id}" name="${id}" value="${esc(valStr)}" placeholder="${esc(placeholder)}" ${attrs} ${required ? 'required' : ''}>`;
      break;
    case 'date':
      inputHtml = `<input class="input" type="date" id="field-${id}" name="${id}" value="${esc(valStr)}" ${required ? 'required' : ''}>`;
      break;
    case 'checkbox':
      return `
        <div class="field" style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="field-${id}" name="${id}" ${valStr === 'true' || value === true ? 'checked' : ''}>
          <label for="field-${id}" style="font-size:14px; cursor:pointer; color:var(--text-primary);">${esc(label)}${reqMark}</label>
        </div>
      `;
    default: // text
      inputHtml = `<input class="input" type="text" id="field-${id}" name="${id}" value="${esc(valStr)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}>`;
  }

  // 若需要「+」按鈕，包裝成 flex 容器
  if (plusEntity) {
    inputHtml = `
      <div style="display:flex; gap:8px; align-items:center;">
        <div style="flex:1;">${inputHtml}</div>
        <button type="button" class="btn btn-ghost" id="plus-btn-${id}" style="padding:0 12px; height:42px; flex-shrink:0;">
          <i data-lucide="plus" style="width:18px;height:18px;"></i>
        </button>
      </div>
    `;
  }

  return `
    <div class="field" style="display:flex; flex-direction:column; gap:6px; border:1px solid transparent; border-radius:var(--radius-sm);">
      <label for="field-${id}" style="font-size:12px; color:var(--text-secondary); font-weight:500;">${esc(label)}${reqMark}</label>
      ${inputHtml}
    </div>
  `;
}

/* ============================================
   內部實作：綁定「+」按鈕事件
   ============================================ */
function _bindPlusEvents(fields, formEl) {
  fields.forEach(f => {
    if (!f.plusEntity) return;
    const btn = formEl.querySelector(`#plus-btn-${f.id}`);
    if (!btn) return;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (btn.disabled) return;
      btn.disabled = true;

      try {
        const result = await handlePlusClick(f.plusEntity);
        if (!result) return;

        if (typeof f.onPlusReload === 'function') {
          await f.onPlusReload(result, formEl);
        }
      } catch (err) {
        console.error('[ui/form] 快速新增失敗：', err);
      } finally {
        btn.disabled = false;
      }
    });
  });
}

/* ============================================
   內部實作：綁定聯動事件 (dependsOn)
   ============================================ */
function _bindDependencies(fields, formEl) {
  fields.forEach(f => {
    if (!f.dependsOn) return;
    
    const targetEl = formEl.querySelector(`#field-${f.id}`);
    const sourceEl = formEl.querySelector(`#field-${f.dependsOn}`);
    
    if (!targetEl || !sourceEl) return;

    sourceEl.addEventListener('change', () => {
      const sourceVal = sourceEl.value;
      
      // 清空當前選項
      targetEl.innerHTML = '<option value="">— 請先選擇上層項目 —</option>';
      targetEl.value = '';

      // 若有傳入動態載入回呼，則觸發
      if (typeof f.onDependsChange === 'function') {
        f.onDependsChange(sourceVal, targetEl, formEl);
      }
    });
  });
}

/* ============================================
   內部實作：收集資料
   ============================================ */
function _collectData(fields, formEl) {
  const data = {};
  fields.forEach(f => {
    if (f.type === 'custom') return;
    
    const el = formEl.querySelector(`#field-${f.id}`);
    if (!el) return;

    if (f.type === 'checkbox') {
      data[f.id] = el.checked;
    } else if (f.type === 'number') {
      data[f.id] = el.value === '' ? 0 : Number(el.value);
    } else {
      data[f.id] = el.value;
    }
  });
  return data;
}

/* ============================================
   內部實作：驗證
   ============================================ */
function _validate(fields, data, formEl) {
  for (const f of fields) {
    if (!f.required || f.type === 'custom') continue;

    const val = data[f.id];
    const isEmpty = val === '' || val === null || val === undefined;

    if (isEmpty) {
      const fieldWrapper = formEl.querySelector(`#field-${f.id}`)?.closest('.field');
      if (fieldWrapper) {
        fieldWrapper.style.borderColor = 'var(--accent-danger)';
        const err = document.createElement('div');
        err.className = 'field-error';
        err.style.cssText = 'color:var(--accent-danger); font-size:11px; margin-top:2px;';
        err.textContent = `請填寫「${f.label}」`;
        fieldWrapper.appendChild(err);
      }
      return true; // 驗證失敗
    }
  }
  return false; // 驗證成功
}

function _resolveEl(target) {
  if (typeof target === 'string') return document.getElementById(target);
  if (target instanceof HTMLElement) return target;
  return null;
}

/* ═══ EOF ═══
F: ui/form.js
V: 1792901830
W: webapp-20261025-001#31
═══ */