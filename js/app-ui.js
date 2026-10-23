// ============================================
// app-ui.js — SPA UI 元件集
// 職責：toast / modal / confirm / prompt / form / tab / view-toggle
// 介面：沿用舊版 ui/* 與 shared/*，呼叫端 100% 相容
// ============================================

import { AppState } from './app-core.js';

/* ============================================
   1. 通用工具
   ============================================ */
function _resolveEl(t) {
  if (typeof t === 'string') return document.getElementById(t);
  if (t instanceof HTMLElement) return t;
  return null;
}

export function esc(v, fallback = '') {
  if (v == null) return fallback;
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(v).replace(/[&<>"']/g, (c) => map[c]);
}

export function formatHKD(amount) {
  if (amount == null || isNaN(amount)) return 'HK$ 0';
  return 'HK$ ' + Math.round(Number(amount)).toLocaleString('zh-HK');
}

export function formatNumber(amount) {
  if (amount == null || isNaN(amount)) return '0';
  return Math.round(Number(amount)).toLocaleString('zh-HK');
}

/* ============================================
   2. Toast
   ============================================ */
const _TOAST_COLORS = {
  success: 'rgba(16, 185, 129, 0.95)',
  error:   'rgba(244, 63, 94, 0.95)',
  info:    'rgba(0, 240, 255, 0.95)',
  warning: 'rgba(251, 146, 60, 0.95)',
};
const _TOAST_CONTAINER_ID = 'app-toast-container';

export function toast(msg, type = 'success', duration = 2000) {
  let container = document.getElementById(_TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = _TOAST_CONTAINER_ID;
    container.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;align-items:center;pointer-events:none;max-width:90%;';
    document.body.appendChild(container);
  }
  while (container.children.length >= 3) container.removeChild(container.firstChild);

  const el = document.createElement('div');
  el.style.cssText = `background:${_TOAST_COLORS[type] || _TOAST_COLORS.success};color:#fff;padding:12px 22px;border-radius:8px;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.4);opacity:0;transform:translateY(10px);transition:opacity 0.3s ease,transform 0.3s ease;max-width:90%;text-align:center;pointer-events:none;margin-top:8px;`;
  el.textContent = msg;
  container.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  }, duration);
}

export const toastSuccess = (m, d) => toast(m, 'success', d);
export const toastError   = (m, d) => toast(m, 'error', d);
export const toastInfo    = (m, d) => toast(m, 'info', d);
export const toastWarning = (m, d) => toast(m, 'warning', d);

/* ============================================
   3. Modal / Confirm / Prompt
   ============================================ */
const _stack = [];
let _confirmResolve = null;
let _promptResolve = null;

export function openModal(target) {
  const m = _resolveEl(target);
  if (!m) return;
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (!_stack.includes(m)) _stack.push(m);
  if (!window._modalEscBound) {
    window._modalEscBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (_stack.length === 0) return;
      closeModal(_stack[_stack.length - 1]);
    });
  }
}

export function closeModal(target) {
  const m = _resolveEl(target);
  if (!m) return;
  m.classList.remove('active');
  const i = _stack.indexOf(m);
  if (i >= 0) _stack.splice(i, 1);
  if (_stack.length === 0) document.body.style.overflow = '';
}

export function destroyModal(target) {
  const m = _resolveEl(target);
  if (!m) return;
  closeModal(m);
  m.remove();
}

export function openConfirm(message, opts = {}) {
  const { title = '確認', okText = '確定', cancelText = '取消', okClass = 'btn-danger' } = opts;

  const oldOverlay = document.getElementById('__confirm-modal');
  if (oldOverlay) {
    if (oldOverlay._cleanup) oldOverlay._cleanup();
    oldOverlay.remove();
    document.body.style.overflow = '';
    if (_confirmResolve) { _confirmResolve(false); _confirmResolve = null; }
  }

  return new Promise((resolve) => {
    _confirmResolve = resolve;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = '__confirm-modal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <h2 class="modal-title">${esc(title)}</h2>
        <div style="font-size:14px;line-height:1.6;color:var(--text-secondary);white-space:pre-wrap;">${esc(message)}</div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-confirm-action="cancel">${esc(cancelText)}</button>
          <button type="button" class="btn ${okClass}" data-confirm-action="ok">${esc(okText)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const onClick = (e) => {
      const btn = e.target.closest('[data-confirm-action]');
      if (btn) _closeConfirm(btn.dataset.confirmAction === 'ok');
      else if (e.target === overlay) _closeConfirm(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') _closeConfirm(false);
      if (e.key === 'Enter') _closeConfirm(true);
    };
    overlay.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    overlay._cleanup = () => {
      overlay.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  });
}

function _closeConfirm(r) {
  const o = document.getElementById('__confirm-modal');
  if (o) { if (o._cleanup) o._cleanup(); o.remove(); }
  document.body.style.overflow = '';
  if (_confirmResolve) { _confirmResolve(r); _confirmResolve = null; }
}

export function openPrompt(opts = {}) {
  const { title = '請輸入', label = '', placeholder = '', defaultValue = '', okText = '確定', cancelText = '取消', maxlength = 60 } = opts;

  const oldOverlay = document.getElementById('__prompt-modal');
  if (oldOverlay) {
    if (oldOverlay._cleanup) oldOverlay._cleanup();
    oldOverlay.remove();
    document.body.style.overflow = '';
    if (_promptResolve) { _promptResolve(null); _promptResolve = null; }
  }

  return new Promise((resolve) => {
    _promptResolve = resolve;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = '__prompt-modal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <h2 class="modal-title">${esc(title)}</h2>
        ${label ? `<label class="field-label" style="display:block;margin-bottom:6px;">${esc(label)}</label>` : ''}
        <input type="text" class="input" id="__prompt-input" placeholder="${esc(placeholder)}" value="${esc(defaultValue)}" maxlength="${maxlength}" style="width:100%;margin-bottom:16px;">
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-prompt-action="cancel">${esc(cancelText)}</button>
          <button type="button" class="btn btn-primary" data-prompt-action="ok">${esc(okText)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const input = overlay.querySelector('#__prompt-input');
    const onClick = (e) => {
      const btn = e.target.closest('[data-prompt-action]');
      if (!btn) { if (e.target === overlay) _closePrompt(null); return; }
      if (btn.dataset.promptAction === 'cancel') _closePrompt(null);
      else {
        const v = (input.value || '').trim();
        if (!v) { input.focus(); return; }
        _closePrompt(v);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') _closePrompt(null);
      if (e.key === 'Enter') {
        const v = (input.value || '').trim();
        if (!v) { input.focus(); return; }
        _closePrompt(v);
      }
    };
    overlay.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    overlay._cleanup = () => {
      overlay.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
    setTimeout(() => { input.focus(); if (defaultValue) input.select(); }, 50);
  });
}

function _closePrompt(r) {
  const o = document.getElementById('__prompt-modal');
  if (o) { if (o._cleanup) o._cleanup(); o.remove(); }
  document.body.style.overflow = '';
  if (_promptResolve) { _promptResolve(r); _promptResolve = null; }
}

/* ============================================
   4. Form Builder
   ============================================ */
export function buildForm(opts) {
  const {
    containerId, fields = [], idPrefix = '', submitText = '儲存', cancelText = '取消',
    resetText = '重置', showCancel = true, showReset = false,
    onSubmit, onCancel, onReset, beforeSubmit, autoValidate = true, initialData = null,
  } = opts;

  const root = document.getElementById(containerId);
  if (!root) { console.warn(`[buildForm] 找不到 #${containerId}`); return null; }

  const fieldIdMap = {};
  fields.forEach((f) => {
    if (f.type === 'custom' || f.type === 'hidden') return;
    fieldIdMap[f.id] = idPrefix ? `${idPrefix}${f.id}` : f.id;
  });

  const fieldsHtml = _renderFields(fields, fieldIdMap);
  const buttons = [];
  if (showReset) buttons.push(`<button type="button" class="btn btn-ghost" data-form-action="reset">${esc(resetText)}</button>`);
  if (showCancel) buttons.push(`<button type="button" class="btn btn-ghost" data-form-action="cancel">${esc(cancelText)}</button>`);
  buttons.push(`<button type="submit" class="btn btn-primary" data-form-action="submit"><span>${esc(submitText)}</span></button>`);

  root.innerHTML = `
    <form class="form-builder-form" novalidate>
      <div class="form-stack">${fieldsHtml}</div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">${buttons.join('')}</div>
    </form>`;

  const form = root.querySelector('form');
  const submitBtn = form.querySelector('[data-form-action="submit"]');
  const submitLabel = submitBtn.querySelector('span');
  let _submitting = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (_submitting) return;
    _clearErrors();

    const data = _collectData(fields, fieldIdMap);

    if (autoValidate) {
      const err = _validateRequired(fields, data, fieldIdMap);
      if (err) {
        _showFieldError(err.field, err.message, fieldIdMap);
        toast(err.message, 'warning');
        document.getElementById(err.field)?.focus();
        return;
      }
    }

    if (typeof beforeSubmit === 'function') {
      let r;
      try { r = await beforeSubmit(data); } catch (er) { toast('驗證失敗：' + (er.message || er), 'error'); return; }
      if (r === false) return;
      if (typeof r === 'string') { toast(r, 'warning'); return; }
      if (r && r.field && r.message) {
        const rf = fieldIdMap[r.field] || r.field;
        _showFieldError(rf, r.message, fieldIdMap);
        toast(r.message, 'warning');
        return;
      }
    }

    if (typeof onSubmit !== 'function') return;
    _setSubmitting(true);
    try { await onSubmit(data, api); }
    catch (er) { console.error('[buildForm] 送出失敗：', er); toast('送出失敗：' + (er.message || er), 'error'); }
    finally { _setSubmitting(false); }
  });

  form.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-form-action]');
    if (!btn) return;
    if (btn.dataset.formAction === 'cancel' && typeof onCancel === 'function') onCancel();
    else if (btn.dataset.formAction === 'reset') {
      form.reset(); _clearErrors();
      if (typeof onReset === 'function') onReset();
    }
  });

  function _setSubmitting(b) {
    _submitting = b;
    submitBtn.disabled = b;
    if (submitLabel) submitLabel.textContent = b ? '處理中…' : submitText;
  }

  function _clearErrors() {
    form.querySelectorAll('.field-error').forEach((el) => el.remove());
    form.querySelectorAll('.field.has-error').forEach((el) => el.classList.remove('has-error'));
  }

  function _showFieldError(fieldId, message, map) {
    const rid = map && map[fieldId] ? map[fieldId] : fieldId;
    const el = document.getElementById(rid);
    if (!el) return;
    const fEl = el.closest('.field');
    if (!fEl) return;
    fEl.classList.add('has-error');
    const old = fEl.querySelector('.field-error');
    if (old) old.remove();
    const div = document.createElement('div');
    div.className = 'field-error';
    div.style.cssText = 'color:var(--neon-red);font-size:11px;margin-top:4px;';
    div.textContent = message;
    fEl.appendChild(div);
  }

  const api = {
    root, form,
    getData: () => _collectData(fields, fieldIdMap),
    setData: (data) => {
      Object.entries(data || {}).forEach(([k, v]) => {
        const rid = fieldIdMap[k] || k;
        const el = document.getElementById(rid);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!v;
        else el.value = v ?? '';
      });
    },
    setFieldValue: (fid, v) => {
      const rid = fieldIdMap[fid] || fid;
      const el = document.getElementById(rid);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v ?? '';
    },
    getFieldValue: (fid) => {
      const rid = fieldIdMap[fid] || fid;
      const el = document.getElementById(rid);
      if (!el) return null;
      if (el.type === 'checkbox') return el.checked;
      if (el.type === 'number') { const n = Number(el.value); return isNaN(n) ? 0 : n; }
      return el.value;
    },
    reset: () => { form.reset(); _clearErrors(); if (typeof onReset === 'function') onReset(); },
    setError: (fid, msg) => _showFieldError(fid, msg, fieldIdMap),
    clearErrors: _clearErrors,
    updateOptions: (fid, options, cfg = {}) => {
      const rid = fieldIdMap[fid] || fid;
      const el = document.getElementById(rid);
      if (!el) return;
      const { includeEmpty = true, emptyText = '— 請選擇 —' } = cfg;
      const cur = el.value;
      let html = includeEmpty ? `<option value="">${esc(emptyText)}</option>` : '';
      html += options.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
      el.innerHTML = html;
      if (cur && options.some((o) => String(o.value) === cur)) el.value = cur;
    },
    onFieldChange: (fid, cb) => {
      const rid = fieldIdMap[fid] || fid;
      const el = document.getElementById(rid);
      if (!el) return () => {};
      el.addEventListener('change', cb);
      return () => el.removeEventListener('change', cb);
    },
    submit: () => form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })),
    setSubmitting: _setSubmitting,
    destroy: () => { root.innerHTML = ''; },
  };

  /* 初始化：設預設值、載入初始資料 */
  fields.forEach((f) => {
    if (initialData && initialData[f.id] !== undefined) api.setFieldValue(f.id, initialData[f.id]);
    else if (f.defaultValue != null) {
      const def = typeof f.defaultValue === 'function' ? f.defaultValue() : f.defaultValue;
      api.setFieldValue(f.id, def);
    }
  });

  if (window.lucide) window.lucide.createIcons();
  return api;
}

function _renderFields(fields, fieldIdMap) {
  const out = [];
  const buf = [];
  const flush = () => { if (buf.length) { out.push(`<div class="form-stack-row">${buf.join('')}</div>`); buf.length = 0; } };
  fields.forEach((f) => {
    const html = _renderField(f, fieldIdMap);
    if (f.layout === 'half') { buf.push(html); if (buf.length >= 2) flush(); }
    else { flush(); out.push(html); }
  });
  flush();
  return out.join('');
}

function _renderField(f, fieldIdMap) {
  const { type, id, label, required = false, placeholder = '', options = [], min, max, step, disabled = false, hint } = f;
  const fid = fieldIdMap[id] || id;
  let input = '';

  if (type === 'select') {
    let opts = f.includeEmpty !== false ? `<option value="">${esc(f.emptyText || '— 請選擇 —')}</option>` : '';
    opts += options.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
    input = `<select class="select" id="${fid}" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''}>${opts}</select>`;
  } else if (type === 'number' || type === 'number-plain') {
    const attrs = [min != null ? `min="${min}"` : '', max != null ? `max="${max}"` : '', step != null ? `step="${step}"` : 'step="1"'].filter(Boolean).join(' ');
    const cls = type === 'number' ? 'input mono' : 'input';
    input = `<input class="${cls}" id="${fid}" type="number" ${attrs} ${required ? 'required' : ''} ${disabled ? 'disabled' : ''} placeholder="${esc(placeholder)}">`;
  } else if (type === 'text') {
    input = `<input class="input" id="${fid}" type="text" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''} placeholder="${esc(placeholder)}" maxlength="${f.maxlength || 60}">`;
  } else if (type === 'textarea') {
    input = `<textarea class="input" id="${fid}" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''} placeholder="${esc(placeholder)}" maxlength="${f.maxlength || 200}" rows="${f.rows || 3}"></textarea>`;
  } else if (type === 'checkbox') {
    return `<div class="field" style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="${fid}" style="width:auto;cursor:pointer;" ${disabled ? 'disabled' : ''}><label for="${fid}" style="font-size:13px;color:var(--text-secondary);cursor:pointer;">${esc(label)}</label></div>`;
  } else if (type === 'custom') {
    return `<div class="field">${f.html || ''}</div>`;
  } else if (type === 'hidden') {
    return `<input type="hidden" id="${fid}" value="${esc(f.value || '')}">`;
  }

  const hintHtml = hint ? `<div style="margin-top:4px;font-size:11px;color:var(--text-muted);">${esc(hint)}</div>` : '';
  return `<div class="field"><label class="field-label" for="${fid}">${esc(label)}${required ? ' *' : ''}</label>${input}${hintHtml}</div>`;
}

function _collectData(fields, fieldIdMap) {
  const d = {};
  fields.forEach((f) => {
    if (f.type === 'custom') return;
    const fid = fieldIdMap[f.id] || f.id;
    const el = document.getElementById(fid);
    if (!el) return;
    if (f.type === 'checkbox') d[f.id] = el.checked;
    else if (f.type === 'number' || f.type === 'number-plain') d[f.id] = el.value === '' ? 0 : (isNaN(Number(el.value)) ? 0 : Number(el.value));
    else d[f.id] = el.value;
  });
  return d;
}

function _validateRequired(fields, data, fieldIdMap) {
  for (const f of fields) {
    if (!f.required) continue;
    if (f.type === 'custom' || f.type === 'hidden') continue;
    const v = data[f.id];
    if (v === '' || v === null || v === undefined) {
      return { field: fieldIdMap[f.id] || f.id, message: `請填寫「${f.label}」` };
    }
  }
  return null;
}

/* ============================================
   5. Tab Panel
   ============================================ */
export function initTabPanel(opts) {
  const { containerId, tabs = [], defaultKey, storageKey, wrap = false, onChange } = opts;
  const root = document.getElementById(containerId);
  if (!root || tabs.length === 0) return null;

  const norm = tabs.map((t) => ({ ...t, panelId: t.panelId || `${containerId}-panel-${t.key}` }));
  const fullKey = storageKey ? `fin_ui_${storageKey.replace(/^fin_ui_/, '')}` : '';

  let initialKey = defaultKey;
  if (fullKey) {
    try { const s = localStorage.getItem(fullKey); if (s && norm.some((t) => t.key === s)) initialKey = s; } catch (e) {}
  }
  if (!initialKey || !norm.some((t) => t.key === initialKey)) initialKey = norm[0].key;

  const wrapCls = wrap ? ' tab-bar-wrap' : '';
  root.innerHTML = `<div class="tab-bar${wrapCls}">${norm.map((t) => `
    <button type="button" class="tab-btn ${t.key === initialKey ? 'active' : ''}" data-tab-key="${esc(t.key)}">
      ${t.icon ? `<i data-lucide="${esc(t.icon)}" style="width:14px;height:14px;"></i>` : ''}
      <span>${esc(t.label)}</span>
    </button>`).join('')}</div>`;

  let _cur = initialKey;

  function applyState() {
    root.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tabKey === _cur));
    norm.forEach((t) => {
      const p = document.getElementById(t.panelId);
      if (!p) return;
      const on = t.key === _cur;
      p.classList.toggle('active', on);
      p.style.display = on ? 'block' : 'none';
    });
  }

  function switchTo(key) {
    if (!norm.some((t) => t.key === key) || key === _cur) return;
    _cur = key;
    applyState();
    if (fullKey) try { localStorage.setItem(fullKey, key); } catch (e) {}
    if (typeof onChange === 'function') {
      const tab = norm.find((t) => t.key === key);
      try { onChange(key, tab); } catch (e) {}
    }
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('.tab-btn');
    if (b && b.dataset.tabKey) switchTo(b.dataset.tabKey);
  });

  applyState();
  if (typeof onChange === 'function') {
    const tab = norm.find((t) => t.key === initialKey);
    try { onChange(initialKey, tab); } catch (e) {}
  }
  if (window.lucide) window.lucide.createIcons();

  return { root, tabs: norm, getCurrent: () => _cur, switchTo, destroy: () => { root.innerHTML = ''; } };
}

/* ============================================
   6. View Toggle
   ============================================ */
export function initViewToggle(opts) {
  const {
    containerId, storageKey, defaultView = 'card', cardText = '卡片模式',
    tableText = '表格模式', onChange, syncAppState = true,
  } = opts;
  const root = document.getElementById(containerId);
  if (!root) return null;

  const fullKey = storageKey ? `fin_ui_view_${storageKey.replace(/^fin_ui_view_/, '')}` : '';
  let cur = defaultView;
  try { const s = localStorage.getItem(fullKey); if (s === 'card' || s === 'table') cur = s; } catch (e) {}
  if (syncAppState) AppState.setCurrentView(cur);

  function render() {
    root.innerHTML = `<div class="view-toggle-group">
      <button type="button" class="btn btn-sm ${cur === 'card' ? 'btn-primary' : 'btn-ghost'}" data-view="card">${esc(cardText)}</button>
      <button type="button" class="btn btn-sm ${cur === 'table' ? 'btn-primary' : 'btn-ghost'}" data-view="table">${esc(tableText)}</button>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
  }

  function setView(v) {
    if (v !== 'card' && v !== 'table') return;
    if (v === cur) return;
    cur = v;
    render();
    try { localStorage.setItem(fullKey, v); } catch (e) {}
    if (syncAppState) AppState.setCurrentView(v);
    if (typeof onChange === 'function') onChange(v);
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-view]');
    if (b) setView(b.dataset.view);
  });

  render();
  return { root, getView: () => cur, setView, destroy: () => { root.innerHTML = ''; } };
}