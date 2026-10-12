// ============================================
// page-controls.js — 統一控制列渲染（v103.0.34）
// 位置：js/lib/page-controls.js
// ============================================
// v103.0.34（B29-1a）：
//   ✅ 強制 viewToggle / sort 在 body（忽略 position: 'header'）
//   ✅ year + month 都在左側（月靠年）
// v103.0.33（B26-8）：
//   ✅ year / month 改 select；內部讀寫 AppState
// ============================================

import { esc } from './dom.js';
import { STORAGE_PREFIXES } from '../config/constants.js';
import { AppState } from '../core/state.js';
import { getYearList } from '../config/app-config.js';

/* 🆕 v103.0.34：強制在 body 的 type（不接受 position: 'header'） */
const _FORCE_BODY_TYPES = ['viewToggle', 'sort'];

export function renderPageControls(config) {
  const { containerId, headerContainerId, items = [] } = config || {};
  const root = document.getElementById(containerId);
  if (!root) {
    console.warn(`[page-controls] 找不到容器 #${containerId}`);
    return null;
  }
  const headerRoot = headerContainerId ? document.getElementById(headerContainerId) : null;

  items.forEach((it) => {
    if (!it.__pcId) {
      it.__pcId = it.id || `pc-${it.type}-${Math.random().toString(36).slice(2, 8)}`;
    }
  });

  let _destroyed = false;

  const paint = () => {
    if (_destroyed) return;

    /* 🆕 v103.0.34：header items 排除強制 body 的 type */
    const headerItems = items.filter((it) =>
      it.position === 'header' && !_FORCE_BODY_TYPES.includes(it.type)
    );
    const bodyItems = items.filter((it) =>
      it.position !== 'header' || _FORCE_BODY_TYPES.includes(it.type)
    );

    /* 渲染 header */
    if (headerRoot) {
      const headerHtml = headerItems.length > 0
        ? `<div class="page-header-actions-group">${headerItems.map(_renderItem).join('')}</div>`
        : '';
      if (headerRoot.__lastHtml !== headerHtml) {
        headerRoot.__lastHtml = headerHtml;
        headerRoot.innerHTML = headerHtml;
      }
    }

    /* 渲染 body */
    const _isToolbarItem = (it) =>
      it.type !== 'year' && it.type !== 'month' &&
      it.type !== 'filter' && it.type !== 'viewSwitcher';

    const toolbarLeft = bodyItems.filter((it) => _isToolbarItem(it) && it.align !== 'right');
    const toolbarRight = bodyItems.filter((it) => _isToolbarItem(it) && it.align === 'right');
    const yearItem = bodyItems.find((it) => it.type === 'year');
    const monthItem = bodyItems.find((it) => it.type === 'month');
    const fullRowItems = bodyItems.filter((it) => it.type === 'filter' || it.type === 'viewSwitcher');

    const parts = [];

    if (toolbarLeft.length > 0 || toolbarRight.length > 0) {
      parts.push(`
        <div class="page-controls-row">
          <div class="page-controls-left">${toolbarLeft.map(_renderItem).join('')}</div>
          <div class="page-controls-right">${toolbarRight.map(_renderItem).join('')}</div>
        </div>
      `);
    }

    /* 🆕 v103.0.34：year + month 都在左側 */
    if (yearItem || monthItem) {
      parts.push(`
        <div class="page-controls-row page-controls-period">
          <div class="page-controls-left">
            ${yearItem ? _renderYearSelect(yearItem) : ''}
            ${monthItem ? _renderMonthSelect(monthItem) : ''}
          </div>
        </div>
      `);
    }

    fullRowItems.forEach((it) => {
      parts.push(`<div class="page-controls-row page-controls-full">${_renderItem(it)}</div>`);
    });

    const html = parts.length > 0 ? `<div class="page-controls">${parts.join('')}</div>` : '';
    if (root.__lastHtml !== html) {
      root.__lastHtml = html;
      root.innerHTML = html;
    }

    _bindAll(root, items);
    if (headerRoot) _bindAll(headerRoot, items);

    if (window.lucide) window.lucide.createIcons();
  };

  paint();

  return {
    refresh: paint,
    destroy: () => {
      _destroyed = true;
      [root, headerRoot].forEach((c) => {
        if (!c) return;
        const oldClick = c.__pcListener;
        if (oldClick) c.removeEventListener('click', oldClick);
        const oldChange = c.__pcChangeListener;
        if (oldChange) c.removeEventListener('change', oldChange);
        c.__pcListener = null;
        c.__pcChangeListener = null;
        c.innerHTML = '';
        c.__lastHtml = '';
      });
    },
  };
}

export function destroyPageControls(instance) {
  if (instance && typeof instance.destroy === 'function') {
    instance.destroy();
  }
}

/* ============================================
   元素渲染（依 type 分派）
   ============================================ */
function _renderItem(item) {
  switch (item.type) {
    case 'add':           return _renderAdd(item);
    case 'export':        return _renderExport(item);
    case 'viewToggle':    return _renderViewToggle(item);
    case 'viewSwitcher':  return _renderViewSwitcher(item);
    case 'sort':          return _renderSort(item);
    case 'filter':        return _renderFilter(item);
    case 'custom':        return _renderCustom(item);
    default:
      console.warn(`[page-controls] 未知 type：${item.type}`);
      return '';
  }
}

function _renderAdd(item) {
  const { label = '新增', icon = 'plus', __pcId } = item;
  return `<button type="button" class="btn btn-primary" data-pc-action="add" data-pc-id="${esc(__pcId)}">
    <i data-lucide="${esc(icon)}"></i> ${esc(label)}
  </button>`;
}

function _renderExport(item) {
  const { label = '匯出', icon = 'file-spreadsheet', className = 'btn-magenta', __pcId } = item;
  return `<button type="button" class="btn ${esc(className)}" data-pc-action="export" data-pc-id="${esc(__pcId)}">
    <i data-lucide="${esc(icon)}"></i> ${esc(label)}
  </button>`;
}

function _renderViewToggle(item) {
  const {
    storageKey,
    defaultView = 'table',
    cardText = '卡片模式',
    tableText = '表格模式',
    cardValue = 'card',
    tableValue = 'table',
    __pcId,
  } = item;
  const key = `${STORAGE_PREFIXES.VIEW}${storageKey || 'page-controls-default'}`;
  let current = defaultView;
  try {
    const saved = localStorage.getItem(key);
    if (saved === cardValue || saved === tableValue) current = saved;
  } catch (e) { /* noop */ }

  return `<div class="view-toggle-group" data-pc-view-toggle data-pc-id="${esc(__pcId)}" data-pc-storage="${esc(key)}" data-pc-card-value="${esc(cardValue)}" data-pc-table-value="${esc(tableValue)}">
    <button type="button" class="btn btn-sm ${current === cardValue ? 'btn-primary' : 'btn-ghost'}" data-pc-view="${esc(cardValue)}">${esc(cardText)}</button>
    <button type="button" class="btn btn-sm ${current === tableValue ? 'btn-primary' : 'btn-ghost'}" data-pc-view="${esc(tableValue)}">${esc(tableText)}</button>
  </div>`;
}

function _renderViewSwitcher(item) {
  const { options = [], value = '', __pcId } = item;
  return `<div class="view-toggle-group" data-pc-view-switcher data-pc-id="${esc(__pcId)}">
    ${options.map((o) => `<button type="button" class="btn btn-sm ${o.value === value ? 'btn-primary' : 'btn-ghost'}" data-pc-switch="${esc(o.value)}">${esc(o.label)}</button>`).join('')}
  </div>`;
}

function _renderSort(item) {
  const { options = [], value = '', __pcId } = item;
  return `<select class="select" data-pc-sort data-pc-id="${esc(__pcId)}" style="width:auto; padding:8px 12px;">
    ${options.map((o) => `<option value="${esc(o.value)}" ${o.value === value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
  </select>`;
}

function _renderFilter(item) {
  const { render } = item;
  if (typeof render !== 'function') return '';
  try {
    return `<div class="page-controls-filter">${render()}</div>`;
  } catch (err) {
    console.error('[page-controls] filter render 失敗：', err);
    return '';
  }
}

function _renderCustom(item) {
  const { render, html } = item;
  if (typeof render === 'function') {
    try { return render(); } catch (err) { console.error('[page-controls] custom render 失敗：', err); return ''; }
  }
  return html || '';
}

/* ============================================
   年 / 月 下拉清單
   ============================================ */
function _renderYearSelect(item) {
  const { __pcId } = item;
  const years = getYearList();
  const cur = String(AppState.year || new Date().getFullYear());

  return `<select class="select" data-pc-year data-pc-id="${esc(__pcId)}" style="width:auto; padding:8px 12px;">
    ${years.map((y) => {
      const ys = String(y);
      return `<option value="${ys}" ${ys === cur ? 'selected' : ''}>${ys} 年</option>`;
    }).join('')}
  </select>`;
}

function _renderMonthSelect(item) {
  const { includeAll = false, __pcId } = item;
  const curRaw = AppState.month === 'all' ? 'all' : String(AppState.month || '01').padStart(2, '0');

  const options = [];
  if (includeAll) {
    options.push({ value: 'all', label: '全部' });
  }
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    options.push({ value: mm, label: `${m} 月` });
  }

  return `<select class="select" data-pc-month data-pc-id="${esc(__pcId)}" style="width:auto; padding:8px 12px;">
    ${options.map((o) => `<option value="${esc(o.value)}" ${o.value === curRaw ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
  </select>`;
}

/* ============================================
   事件綁定
   ============================================ */
function _findByItem(items, type, id) {
  return items.find((it) => it.type === type && it.__pcId === id);
}

function _bindAll(container, items) {
  const oldClick = container.__pcListener;
  if (oldClick) container.removeEventListener('click', oldClick);
  const oldChange = container.__pcChangeListener;
  if (oldChange) container.removeEventListener('change', oldChange);

  const clickHandler = (e) => {
    const addBtn = e.target.closest('button[data-pc-action="add"]');
    if (addBtn) {
      const item = _findByItem(items, 'add', addBtn.dataset.pcId);
      if (item && typeof item.onClick === 'function') item.onClick();
      return;
    }

    const expBtn = e.target.closest('button[data-pc-action="export"]');
    if (expBtn) {
      const item = _findByItem(items, 'export', expBtn.dataset.pcId);
      if (item && typeof item.onClick === 'function') item.onClick();
      return;
    }

    const viewBtn = e.target.closest('[data-pc-view-toggle] button[data-pc-view]');
    if (viewBtn) {
      const group = viewBtn.closest('[data-pc-view-toggle]');
      const cardValue = group.dataset.pcCardValue;
      const tableValue = group.dataset.pcTableValue;
      const storageKey = group.dataset.pcStorage;
      const view = viewBtn.dataset.pcView;

      group.querySelectorAll('button').forEach((b) => {
        const isActive = b.dataset.pcView === view;
        b.classList.toggle('btn-primary', isActive);
        b.classList.toggle('btn-ghost', !isActive);
      });
      try { localStorage.setItem(storageKey, view); } catch (err) { /* noop */ }

      const item = _findByItem(items, 'viewToggle', group.dataset.pcId);
      if (item && typeof item.onChange === 'function') item.onChange(view);
      return;
    }

    const switchBtn = e.target.closest('[data-pc-view-switcher] button[data-pc-switch]');
    if (switchBtn) {
      const group = switchBtn.closest('[data-pc-view-switcher]');
      const value = switchBtn.dataset.pcSwitch;
      group.querySelectorAll('button').forEach((b) => {
        const isActive = b.dataset.pcSwitch === value;
        b.classList.toggle('btn-primary', isActive);
        b.classList.toggle('btn-ghost', !isActive);
      });
      const item = _findByItem(items, 'viewSwitcher', group.dataset.pcId);
      if (item && typeof item.onChange === 'function') item.onChange(value);
      return;
    }
  };

  const changeHandler = (e) => {
    const sortSel = e.target.closest('[data-pc-sort]');
    if (sortSel) {
      const item = _findByItem(items, 'sort', sortSel.dataset.pcId);
      if (item && typeof item.onChange === 'function') item.onChange(sortSel.value);
      return;
    }

    const yearSel = e.target.closest('[data-pc-year]');
    if (yearSel) {
      const y = yearSel.value;
      if (!y) return;
      if (String(AppState.year) === y) return;
      const curMonth = AppState.month === 'all' ? 'all' : AppState.month;
      AppState.setYearMonth(y, curMonth);
      return;
    }

    const monthSel = e.target.closest('[data-pc-month]');
    if (monthSel) {
      const m = monthSel.value;
      if (!m) return;
      if (String(AppState.month) === m) return;
      AppState.setYearMonth(AppState.year, m);
      return;
    }
  };

  container.addEventListener('click', clickHandler);
  container.addEventListener('change', changeHandler);
  container.__pcListener = clickHandler;
  container.__pcChangeListener = changeHandler;
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/lib/page-controls.js
   Version: v103.0.34
   Batch: B29-1a
   ═══════════════════════════════════════════ */