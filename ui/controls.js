// ============================================
// controls.js — 共用控制列與篩選器（V2 重構版）
// 位置：ui/controls.js
// 說明：提供統一的「年月切換」、「檢視切換」與「篩選列」渲染。
//       大幅精簡舊版複雜的 config 陣列設計。
// ============================================

import { AppState } from '../config/state.js';
import { getYearList } from '../config/app-config.js';
import { STORAGE_KEYS } from '../config/constants.js';
import { esc } from './format.js';

/* ============================================
   1. 年月選擇器
   ============================================ */
/**
 * 渲染年月下拉選單
 * @param {string} containerId - 容器 ID
 * @param {Object} options - { includeAllMonth: boolean }
 * @param {Function} onChange - (year, month) => void
 */
export function renderYearMonth(containerId, options = {}, onChange) {
  const root = document.getElementById(containerId);
  if (!root) return;

  const { includeAllMonth = false } = options;
  const years = getYearList();
  const curY = String(AppState.year);
  const curM = AppState.month === 'all' ? 'all' : String(AppState.month).padStart(2, '0');

  let monthOpts = includeAllMonth ? `<option value="all" ${curM === 'all' ? 'selected' : ''}>全部</option>` : '';
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    monthOpts += `<option value="${mm}" ${curM === mm ? 'selected' : ''}>${m} 月</option>`;
  }

  root.innerHTML = `
    <div class="flex items-center gap-8">
      <select class="input" id="${containerId}-year" style="width:auto; padding:6px 28px 6px 10px;">
        ${years.map((y) => `<option value="${y}" ${String(y) === curY ? 'selected' : ''}>${y} 年</option>`).join('')}
      </select>
      <select class="input" id="${containerId}-month" style="width:auto; padding:6px 28px 6px 10px;">
        ${monthOpts}
      </select>
    </div>
  `;

  const ySel = document.getElementById(`${containerId}-year`);
  const mSel = document.getElementById(`${containerId}-month`);

  const handleChange = () => {
    const y = ySel.value;
    const m = mSel.value;
    AppState.setYearMonth(y, m);
    if (typeof onChange === 'function') onChange(y, m);
  };

  ySel.addEventListener('change', handleChange);
  mSel.addEventListener('change', handleChange);
}

/* ============================================
   2. 檢視切換 (表格 / 卡片)
   ============================================ */
export function renderViewToggle(containerId, onChange) {
  const root = document.getElementById(containerId);
  if (!root) return;

  const curView = AppState.getCurrentView() || 'table';

  root.innerHTML = `
    <div class="flex items-center gap-4" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:4px;">
      <button type="button" class="btn" data-view="table" style="padding:6px 10px; border:none; background:${curView === 'table' ? 'var(--primary)' : 'transparent'}; color:${curView === 'table' ? '#fff' : 'var(--text-secondary)'}; border-radius:var(--radius-sm);">
        <i data-lucide="list" style="width:16px;height:16px;"></i>
      </button>
      <button type="button" class="btn" data-view="card" style="padding:6px 10px; border:none; background:${curView === 'card' ? 'var(--primary)' : 'transparent'}; color:${curView === 'card' ? '#fff' : 'var(--text-secondary)'}; border-radius:var(--radius-sm);">
        <i data-lucide="layout-grid" style="width:16px;height:16px;"></i>
      </button>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    const view = btn.dataset.view;
    if (view === curView) return;

    AppState.setCurrentView(view);
    if (typeof onChange === 'function') onChange(view);
    
    // 更新 UI 狀態
    root.querySelectorAll('button[data-view]').forEach((b) => {
      const active = b.dataset.view === view;
      b.style.background = active ? 'var(--primary)' : 'transparent';
      b.style.color = active ? '#fff' : 'var(--text-secondary)';
    });
  });
}

/* ============================================
   3. 通用搜尋與篩選列
   ============================================ */
export function renderFilterBar(containerId, fields, onFilterChange) {
  const root = document.getElementById(containerId);
  if (!root) return;

  // fields 格式: [{ id: 'member', label: '成員', type: 'select', options: [{value, label}] }]
  root.innerHTML = `
    <div class="flex flex-wrap items-center gap-12" style="margin-bottom:16px;">
      ${fields.map((f) => {
        if (f.type === 'select') {
          return `
            <div class="flex flex-col gap-4">
              <label style="font-size:11px; color:var(--text-muted);">${esc(f.label)}</label>
              <select class="input" data-filter="${f.id}" style="width:auto; padding:6px 28px 6px 10px; font-size:13px;">
                <option value="">全部</option>
                ${(f.options || []).map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}
              </select>
            </div>
          `;
        }
        if (f.type === 'text') {
          return `
            <div class="flex flex-col gap-4">
              <label style="font-size:11px; color:var(--text-muted);">${esc(f.label)}</label>
              <input class="input" type="text" data-filter="${f.id}" placeholder="搜尋..." style="width:auto; min-width:150px; padding:6px 10px; font-size:13px;">
            </div>
          `;
        }
        return '';
      }).join('')}
    </div>
  `;

  const handleInput = () => {
    const filters = {};
    root.querySelectorAll('[data-filter]').forEach((el) => {
      filters[el.dataset.filter] = el.value;
    });
    if (typeof onFilterChange === 'function') onFilterChange(filters);
  };

  root.addEventListener('change', (e) => {
    if (e.target.closest('[data-filter]')) handleInput();
  });
  root.addEventListener('input', (e) => {
    if (e.target.closest('input[type="text"]')) {
      // Debounce 處理
      clearTimeout(root._timer);
      root._timer = setTimeout(handleInput, 300);
    }
  });
}

/* ═══ EOF ═══
F: ui/controls.js
V: 1792900440
W: ai-system-20261024-012#39
═══ EOF ═══ */