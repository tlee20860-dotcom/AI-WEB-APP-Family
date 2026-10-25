// ============================================
// toast.js — 全局提示元件（V2 重構版）
// 位置：ui/toast.js
// 說明：提供輕量、美觀的彈出提示。無依賴，可獨立使用。
// ============================================

const COLORS = {
  success: 'rgba(16, 185, 129, 0.95)',  // 翠綠
  error:   'rgba(244, 63, 94, 0.95)',   // 洋紅
  info:    'rgba(0, 240, 255, 0.95)',   // 賽博青
  warning: 'rgba(251, 191, 36, 0.95)',  // 橘黃
};

const CONTAINER_ID = 'app-toast-container';
const MAX_TOASTS = 3;
const DEFAULT_DURATION = 2500;

// 記錄每個 Toast 的 Timer，避免記憶體洩漏
const _timers = new WeakMap();

export function showToast(msg, type = 'success', duration = DEFAULT_DURATION) {
  const container = _getOrCreateContainer();

  // 超過上限時，先清 timer 再移除
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
    padding: 10px 20px;
    border-radius: var(--radius-md, 12px);
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    max-width: 90%;
    text-align: center;
    pointer-events: none;
    margin-top: 8px;
    white-space: pre-wrap;
    word-break: break-word;
  `;
  toast.textContent = msg;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

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

/* ═══ EOF ═══
F: ui/toast.js
V: 1792900400
W: ai-system-20261024-012#35
═══ EOF ═══ */