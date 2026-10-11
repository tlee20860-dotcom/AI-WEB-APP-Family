// ============================================
// page-controls.js — 統一控制列渲染（v103.0.29）
// 位置：js/lib/page-controls.js
// ============================================
// v103.0.29（B26-3.2）：
//   ✅ 加 headerContainerId 參數
//   ✅ item 加 position: 'header' 支援（渲染到頁首）
//   ✅ 事件綁定改用參數傳 items（不再用 __pcItems）
// v103.0.28（B26-3.1）：
//   ✅ 月份邊界：< 1 / > 12 顯示「—」+ disabled
//   ✅ toolbar 過濾排除 filter / viewSwitcher
//   ✅ 年月按鈕改用 .btn btn-sm
// ============================================

import { esc } from './dom.js';
import { STORAGE_PREFIXES } from '../config/constants.js';

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

    /* 分派：header vs body */
    const headerItems = items.filter((it) => it.position === 'header');
    const bodyItems = items.filter((it) => it.position !== 'header');

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

    if (yearItem || monthItem) {
      parts.push(`
        <div class="page-controls-row page-controls-period">
          <div class="page-controls-left">${yearItem ? _renderYearSwitcher(yearItem) : ''}</div>
          <div class="page-controls-right">${monthItem ? _renderMonthSwitcher(monthItem) : ''}</div>
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

    /* 綁定事件（root + headerRoot 各自綁定，用同一份 items 查找） */
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
   年 / 月 切換（3 顆按鈕設計，改用 .btn btn-sm）
   ============================================ */
function _renderYearSwitcher(item) {
  const { year, __pcId } = item;
  const cur = Number(year);
  const prevY = cur - 1;
  const nextY = cur + 1;
  return `<div class="page-controls-period-group" data-pc-year data-pc-id="${esc(__pcId)}">
    <button type="button" class="btn btn-sm btn-ghost" data-pc-year-val="${prevY}">
      <i data-lucide="chevron-left" style="width:14px;height:14px;"></i>
      <span class="mono">${prevY}</span>
    </button>
    <button type="button" class="btn btn-sm btn-primary" data-pc-year-val="${cur}" disabled>
      <span class="mono">${cur}</span>
    </button>
    <button type="button" class="btn btn-sm btn-ghost" data-pc-year-val="${nextY}">
      <span class="mono">${nextY}</span>
      <i data-lucide="chevron-right" style="width:14px;height:14px;"></i>
    </button>
  </div>`;
}

function _renderMonthSwitcher(item) {
  const { month, __pcId } = item;
  const cur = Number(month);
  const prevM = cur - 1;
  const nextM = cur + 1;
  const canPrev = prevM >= 1;
  const canNext = nextM <= 12;

  const prevLabel = canPrev ? `${prevM} 月` : '—';
  const nextLabel = canNext ? `${nextM} 月` : '—';

  return `<div class="page-controls-period-group" data-pc-month data-pc-id="${esc(__pcId)}">
    <button type="button" class="btn btn-sm btn-ghost" data-pc-month-val="${canPrev ? String(prevM).padStart(2, '0') : ''}" ${canPrev ? '' : 'disabled'}>
      <i data-lucide="chevron-left" style="width:14px;height:14px;"></i>
      <span class="mono">${prevLabel}</span>
    </button>
    <button type="button" class="btn btn-sm btn-primary" data-pc-month-val="${String(cur).padStart(2, '0')}" disabled>
      <span class="mono">${cur} 月</span>
    </button>
    <button type="button" class="btn btn-sm btn-ghost" data-pc-month-val="${canNext ? String(nextM).padStart(2, '0') : ''}" ${canNext ? '' : 'disabled'}>
      <span class="mono">${nextLabel}</span>
      <i data-lucide="chevron-right" style="width:14px;height:14px;"></i>
    </button>
  </div>`;
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

    const yearBtn = e.target.closest('[data-pc-year] button[data-pc-year-val]');
    if (yearBtn && !yearBtn.disabled) {
      const group = yearBtn.closest('[data-pc-year]');
      const y = Number(yearBtn.dataset.pcYearVal);
      const item = _findByItem(items, 'year', group.dataset.pcId);
      if (!item) return;
      if (Number(item.year) === y) return;
      if (typeof item.onChange === 'function') item.onChange(y);
      return;
    }

    const monthBtn = e.target.closest('[data-pc-month] button[data-pc-month-val]');
    if (monthBtn && !monthBtn.disabled) {
      const group = monthBtn.closest('[data-pc-month]');
      const m = monthBtn.dataset.pcMonthVal;
      if (!m) return;
      const item = _findByItem(items, 'month', group.dataset.pcId);
      if (!item) return;
      if (String(Number(item.month)).padStart(2, '0') === m) return;
      if (typeof item.onChange === 'function') item.onChange(m);
      return;
    }
  };

  const changeHandler = (e) => {
    const sortSel = e.target.closest('[data-pc-sort]');
    if (sortSel) {
      const item = _findByItem(items, 'sort', sortSel.dataset.pcId);
      if (item && typeof item.onChange === 'function') item.onChange(sortSel.value);
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
   Version: v103.0.29
   Batch: B26-3.2
   ═══════════════════════════════════════════ */