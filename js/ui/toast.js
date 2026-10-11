// ============================================
// toast.js — Toast 提示（v103.0.22）
// 位置：js/ui/toast.js
// ============================================
// v103.0.22（B25-5）：
//   ✅ M5：MAX_TOASTS 超出時清 timer，避免 timer 洩漏
//   ✅ 補 END OF FILE
// ============================================

import { getUIConstants } from '../config/app-config.js';
import { LIMITS } from '../config/constants.js';

const COLORS = {
  success: 'rgba(16, 185, 129, 0.95)',
  error:   'rgba(244, 63, 94, 0.95)',
  info:    'rgba(0, 240, 255, 0.95)',
  warning: 'rgba(251, 146, 60, 0.95)',
};

const CONTAINER_ID = 'app-toast-container';
const MAX_TOASTS = 3;

/* 🆕 v103.0.22：每個 toast 記錄 timer，方便清理 */
const _timers = new WeakMap();

export function showToast(msg, type = 'success', duration) {
  if (duration == null) {
    try {
      const cfg = getUIConstants();
      duration = cfg.toastDuration;
    } catch (e) {
      duration = LIMITS.TOAST_DURATION_DEFAULT;
    }
  }

  const container = _getOrCreateContainer();

  /* 🆕 v103.0.22：超出上限時，先清 timer 再移除 */
  while (container.children.length >= MAX_TOASTS) {
    const first = container.firstChild;
    if (!first) break;
    _clearToastTimer(first);
    container.removeChild(first);
  }

  const toast = document.createElement('div');
  toast.className = 'app-toast';
  toast.style.cssText = `
    background: ${COLORS[type] || COLORS.success};
    color: #fff;
    padding: 12px 22px;
    border-radius: 8px;
    font-size: 14px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    max-width: 90%;
    text-align: center;
    pointer-events: none;
    margin-top: 8px;
  `;
  toast.textContent = msg;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  /* 🆕 v103.0.22：記錄 timer */
  const outerTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    const innerTimer = setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      _timers.delete(toast);
    }, 300);
    _timers.set(toast, innerTimer);
  }, duration);

  _timers.set(toast, outerTimer);
}

export const toastSuccess = (msg, duration) => showToast(msg, 'success', duration);
export const toastError   = (msg, duration) => showToast(msg, 'error', duration);
export const toastInfo    = (msg, duration) => showToast(msg, 'info', duration);
export const toastWarning = (msg, duration) => showToast(msg, 'warning', duration);

/* ============================================
   內部工具
   ============================================ */

/**
 * 🆕 v103.0.22：清除單一 toast 的 timer
 * 注意：outerTimer 或 innerTimer 二擇一存於 WeakMap
 */
function _clearToastTimer(toast) {
  const t = _timers.get(toast);
  if (t) {
    clearTimeout(t);
    _timers.delete(toast);
  }
}

function _getOrCreateContainer() {
  let container = document.getElementById(CONTAINER_ID);
  if (container) return container;

  container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99999;
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
    max-width: 90%;
  `;
  document.body.appendChild(container);
  return container;
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/ui/toast.js
   Version: v103.0.22
   Batch: B25-5
   ═══════════════════════════════════════════ */