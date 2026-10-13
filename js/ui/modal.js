// ============================================
// modal.js — Modal 開關 + 確認框（v103.0.23）
// 位置：js/ui/modal.js
// ============================================
// v103.0.23（B31-1）：
//   ✅ openConfirm 開啟前先 resolve 舊 Promise（false）
//      - 避免連開時第一個 Promise 永遠 pending
// v103.0.22（B25-2）：
//   ✅ openModal 自動呼叫 bindModalEscClose（首次）
// ============================================

import { esc } from '../lib/dom.js';

/* ============================================
   Modal 堆疊
   ============================================ */
const _stack = [];

/* ============================================
   開關
   ============================================ */

export function openModal(target, options = {}) {
  const { pushToStack = true } = options;
  const modal = _resolveElement(target);
  if (!modal) return;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  if (pushToStack && !_stack.includes(modal)) {
    _stack.push(modal);
  }

  bindModalEscClose();
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

export function getTopModal() {
  return _stack.length > 0 ? _stack[_stack.length - 1] : null;
}

/* ============================================
   綁定工具
   ============================================ */

export function bindModalCancel(modalId, cancelBtnId) {
  const btn = document.getElementById(cancelBtnId);
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(modalId);
  });
}

export function bindModalBackdropClose(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modalId);
  });
}

export function bindModalEscClose() {
  if (window._modalEscBound) return;
  window._modalEscBound = true;

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const top = getTopModal();
    if (!top) return;
    closeModal(top);
  });
}

export function bindModals(configs = []) {
  configs.forEach((cfg) => {
    if (cfg.cancelBtnId) bindModalCancel(cfg.modalId, cfg.cancelBtnId);
    bindModalBackdropClose(cfg.modalId);
  });
  bindModalEscClose();
}

/* ============================================
   確認對話框
   ============================================ */

let _confirmResolve = null;

export function openConfirm(message, options = {}) {
  const {
    title = '確認',
    okText = '確定',
    cancelText = '取消',
    okClass = 'btn-danger',
  } = options;

  /* 🆕 v103.0.23（B31-1）：
     若已有開啟中的 confirm，先 resolve 舊 Promise（false）
     避免舊呼叫端 await 永遠卡住 */
  const oldOverlay = document.getElementById('__confirm-modal');
  if (oldOverlay) {
    if (oldOverlay._cleanup) {
      try { oldOverlay._cleanup(); } catch (e) { /* noop */ }
    }
    oldOverlay.remove();
    document.body.style.overflow = '';
    if (_confirmResolve) {
      try { _confirmResolve(false); } catch (e) { /* noop */ }
      _confirmResolve = null;
    }
  }

  return new Promise((resolve) => {
    _confirmResolve = resolve;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = '__confirm-modal';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <h2 class="modal-title">${esc(title)}</h2>
        <div style="font-size:14px; line-height:1.6; color:var(--text-secondary); white-space:pre-wrap;">${esc(message)}</div>
        <div class="modal-actions">
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
    document.addEventListener('keydown', handleKey, { once: false });

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
   銷毀
   ============================================ */

export function destroyModal(target) {
  const modal = _resolveElement(target);
  if (!modal) return;
  closeModal(modal);
  modal.remove();
}

export function cleanAllModals() {
  closeAllModals();
  _stack.length = 0;
}

/* ============================================
   內部工具
   ============================================ */
function _resolveElement(target) {
  if (typeof target === 'string') return document.getElementById(target);
  if (target instanceof HTMLElement) return target;
  return null;
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/ui/modal.js
   Version: v103.0.23
   Batch: B31-1
   ═══════════════════════════════════════════ */
