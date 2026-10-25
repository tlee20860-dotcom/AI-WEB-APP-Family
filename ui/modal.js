// ============================================
// modal.js — 對話框與確認視窗（V2 重構版）
// 位置：ui/modal.js
// 說明：集中管理 Modal 開關、Promise 形式的確認框與輸入框。
// ============================================

import { esc } from './format.js';

/* ============================================
   1. 基礎 Modal 開關
   ============================================ */
const _stack = [];

export function openModal(target) {
  const modal = _resolveElement(target);
  if (!modal) return;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  if (!_stack.includes(modal)) {
    _stack.push(modal);
  }
  _bindEscClose();
}

export function closeModal(target) {
  const modal = _resolveElement(target);
  if (!modal) return;

  modal.classList.remove('active');
  const idx = _stack.indexOf(modal);
  if (idx >= 0) _stack.splice(idx, 1);

  if (_stack.length === 0) {
    document.body.style.overflow = '';
  }
}

export function closeAllModals() {
  document.querySelectorAll('.modal-overlay.active').forEach((m) => {
    m.classList.remove('active');
  });
  _stack.length = 0;
  document.body.style.overflow = '';
}

export function destroyModal(target) {
  const modal = _resolveElement(target);
  if (!modal) return;
  closeModal(modal);
  modal.remove();
}

/* ============================================
   2. 確認對話框 (Confirm)
   ============================================ */
let _confirmResolve = null;

export function openConfirm(message, options = {}) {
  const {
    title = '確認',
    okText = '確定',
    cancelText = '取消',
    okClass = 'btn-danger',
  } = options;

  // 如果已有開啟中的 confirm，先強制結束它
  const oldOverlay = document.getElementById('__confirm-modal');
  if (oldOverlay) {
    if (oldOverlay._cleanup) oldOverlay._cleanup();
    oldOverlay.remove();
    document.body.style.overflow = '';
    if (_confirmResolve) {
      _confirmResolve(false);
      _confirmResolve = null;
    }
  }

  return new Promise((resolve) => {
    _confirmResolve = resolve;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = '__confirm-modal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px; background:var(--bg-surface);">
        <h2 class="modal-title" style="font-size:18px; margin-bottom:12px; color:var(--text-primary);">${esc(title)}</h2>
        <div style="font-size:14px; line-height:1.6; color:var(--text-secondary); white-space:pre-wrap; margin-bottom:20px;">${esc(message)}</div>
        <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn btn-ghost" data-confirm-action="cancel">${esc(cancelText)}</button>
          <button type="button" class="btn ${okClass}" data-confirm-action="ok">${esc(okText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const handleClick = (e) => {
      const btn = e.target.closest('[data-confirm-action]');
      if (!btn) {
        if (e.target === overlay) _closeConfirm(false);
        return;
      }
      _closeConfirm(btn.dataset.confirmAction === 'ok');
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') _closeConfirm(false);
      if (e.key === 'Enter') _closeConfirm(true);
    };

    overlay.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);

    overlay._cleanup = () => {
      overlay.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  });
}

function _closeConfirm(result) {
  const overlay = document.getElementById('__confirm-modal');
  if (overlay) {
    if (overlay._cleanup) overlay._cleanup();
    overlay.remove();
  }
  document.body.style.overflow = '';
  if (_confirmResolve) {
    _confirmResolve(result);
    _confirmResolve = null;
  }
}

/* ============================================
   3. 輸入對話框 (Prompt)
   ============================================ */
let _promptResolve = null;

export function openPrompt(options = {}) {
  const {
    title = '請輸入',
    label = '',
    placeholder = '',
    defaultValue = '',
    okText = '確定',
    cancelText = '取消',
    maxlength = 60,
  } = options;

  const oldOverlay = document.getElementById('__prompt-modal');
  if (oldOverlay) {
    if (oldOverlay._cleanup) oldOverlay._cleanup();
    oldOverlay.remove();
    document.body.style.overflow = '';
    if (_promptResolve) {
      _promptResolve(null);
      _promptResolve = null;
    }
  }

  return new Promise((resolve) => {
    _promptResolve = resolve;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = '__prompt-modal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px; background:var(--bg-surface);">
        <h2 class="modal-title" style="font-size:18px; margin-bottom:12px; color:var(--text-primary);">${esc(title)}</h2>
        ${label ? `<label class="field-label" style="display:block; font-size:12px; color:var(--text-secondary); margin-bottom:6px;">${esc(label)}</label>` : ''}
        <input type="text" class="input" id="__prompt-input"
               placeholder="${esc(placeholder)}" value="${esc(defaultValue)}"
               maxlength="${maxlength}" style="width:100%; padding:10px; background:var(--bg-deep); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); margin-bottom:20px;">
        <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:10px;">
          <button type="button" class="btn btn-ghost" data-prompt-action="cancel">${esc(cancelText)}</button>
          <button type="button" class="btn btn-primary" data-prompt-action="ok">${esc(okText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const input = overlay.querySelector('#__prompt-input');

    const handleClick = (e) => {
      const btn = e.target.closest('[data-prompt-action]');
      if (!btn) {
        if (e.target === overlay) _closePrompt(null);
        return;
      }
      if (btn.dataset.promptAction === 'cancel') {
        _closePrompt(null);
      } else {
        const v = (input.value || '').trim();
        if (!v) { input.focus(); return; }
        _closePrompt(v);
      }
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') _closePrompt(null);
      if (e.key === 'Enter') {
        const v = (input.value || '').trim();
        if (!v) { input.focus(); return; }
        _closePrompt(v);
      }
    };

    overlay.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);

    overlay._cleanup = () => {
      overlay.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };

    setTimeout(() => {
      input.focus();
      if (defaultValue) input.select();
    }, 50);
  });
}

function _closePrompt(result) {
  const overlay = document.getElementById('__prompt-modal');
  if (overlay) {
    if (overlay._cleanup) overlay._cleanup();
    overlay.remove();
  }
  document.body.style.overflow = '';
  if (_promptResolve) {
    _promptResolve(result);
    _promptResolve = null;
  }
}

/* ============================================
   內部工具
   ============================================ */
function _resolveElement(target) {
  if (typeof target === 'string') return document.getElementById(target);
  if (target instanceof HTMLElement) return target;
  return null;
}

let _escBound = false;
function _bindEscClose() {
  if (_escBound) return;
  _escBound = true;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (_stack.length === 0) return;
    closeModal(_stack[_stack.length - 1]);
  });
}

/* ═══ EOF ═══
F: ui/modal.js
V: 1792901700
W: webapp-20261025-001#20
═══ */