// ============================================
// app-ui.js — UI 工具與純函數渲染
// ============================================

/* ============================================
   1. 基礎工具
   ============================================ */
export function esc(v) {
  if (v == null) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(v).replace(/[&<>"']/g, (c) => map[c]);
}

/**
 * 核心渲染函數：防抖比對 + innerHTML 覆蓋
 */
export function render(container, html) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;
  if (el.__lastHtml === html) return; // 防抖優化
  el.__lastHtml = html;
  el.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

/* ============================================
   2. Toast 提示
   ============================================ */
export function toast(msg, type = 'success', duration = 3000) {
  let container = document.getElementById('app-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'app-toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = 'app-toast';
  if (type === 'error') el.style.borderLeftColor = '#EF4444';
  el.textContent = msg;
  container.appendChild(el);
  
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ============================================
   3. Modal / Prompt
   ============================================ */
let _modalResolve = null;

export function openModal(title, htmlContent, actionsHtml) {
  document.getElementById('__custom-modal')?.remove();
  
  return new Promise((resolve) => {
    _modalResolve = resolve;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = '__custom-modal';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-title">${esc(title)}</div>
        <div id="__modal-body">${htmlContent}</div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-action="cancel">取消</button>
          ${actionsHtml || `<button type="button" class="btn btn-primary" data-action="ok">確定</button>`}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('[data-action="cancel"]')) {
        overlay.remove();
        _modalResolve(null);
      } else if (e.target.closest('[data-action="ok"]')) {
        overlay.remove();
        _modalResolve(true);
      }
    });
  });
}

export function closeModal() {
  document.getElementById('__custom-modal')?.remove();
  if (_modalResolve) { _modalResolve(null); _modalResolve = null; }
}

/* ============================================
   4. 事件委託機制
   ============================================ */
const _eventBus = {};

export function on(event, selector, handler) {
  if (!_eventBus[event]) {
    _eventBus[event] = [];
    document.addEventListener(event, (e) => {
      _eventBus[event].forEach(({ sel, fn }) => {
        const target = e.target.closest(sel);
        if (target) fn(e, target);
      });
    });
  }
  _eventBus[event].push({ sel: selector, fn: handler });
}

/* ============================================
   5. 表單建構器 (純字串生成)
   ============================================ */
export function buildFormHtml(fields, data = {}) {
  let html = '<div class="form-stack">';
  fields.forEach(f => {
    const val = data[f.id] != null ? data[f.id] : (f.defaultValue || '');
    html += `<div class="field">`;
    html += `<label class="field-label">${esc(f.label)}${f.required ? ' *' : ''}</label>`;
    
    if (f.type === 'select') {
      html += `<select class="select" id="${f.id}">`;
      if (f.includeEmpty) html += `<option value="">— 請選擇 —</option>`;
      (f.options || []).forEach(o => {
        html += `<option value="${esc(o.value)}" ${String(o.value) === String(val) ? 'selected' : ''}>${esc(o.label)}</option>`;
      });
      html += `</select>`;
    } else if (f.type === 'textarea') {
      html += `<textarea class="input" id="${f.id}" rows="3">${esc(val)}</textarea>`;
    } else {
      html += `<input class="input" type="${f.type || 'text'}" id="${f.id}" value="${esc(val)}" ${f.required ? 'required' : ''}>`;
    }
    html += `</div>`;
  });
  html += '</div>';
  return html;
}

export function getFormData(fields) {
  const res = {};
  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (el) {
      if (f.type === 'number') res[f.id] = el.value === '' ? 0 : Number(el.value);
      else res[f.id] = el.value;
    }
  });
  return res;
}

/* ═══ EOF ═══
F: js/app-ui.js
V: 1792800004
W: webapp-20261023-001#24
═══ */