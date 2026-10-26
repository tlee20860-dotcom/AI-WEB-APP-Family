// ============================================
// table.js — 通用資料表格引擎（V2 引擎版）
// 位置：ui/table.js
// 說明：支援表頭排序（3態）、表頭下拉篩選、欄位顯示設定。
//       包含表格與卡片兩種渲染模式，並具備防破版樣式。
// ============================================

import { getColumns, getResolvers } from '../config/columns.js';
import { esc } from './format.js';
import { openModal, closeModal, destroyModal } from './modal.js';

/* ============================================
   狀態儲存（每個表格獨立）
   ============================================ */
const _tableStates = {};

function _getTableState(key) {
  if (!_tableStates[key]) {
    _tableStates[key] = {
      sortCol: null,
      sortDir: null, // 'asc' | 'desc' | null
      filters: {},   // { colId: value }
      visibleCols: null // 若為 null 表示全顯示
    };
  }
  return _tableStates[key];
}

/* ============================================
   1. 渲染表格 (Table)
   ============================================ */
export function renderTable(options) {
  const root = _resolveEl(options.container);
  if (!root) return;

  const { rows = [], columnsKey, renderActions, onRowClick, emptyText = '尚無資料' } = options;
  const state = _getTableState(columnsKey);

  const allColumns = getColumns(columnsKey);
  const resolvers = getResolvers(columnsKey);
  const hasActions = typeof renderActions === 'function';

  // 初始化可見欄位
  if (!state.visibleCols) {
    state.visibleCols = allColumns.map(c => c.id);
  }

  // 1. 篩選
  let displayRows = [...rows];
  Object.entries(state.filters).forEach(([colId, val]) => {
    if (!val) return;
    displayRows = displayRows.filter(r => String(r[colId] ?? '') === String(val));
  });

  // 2. 排序
  if (state.sortCol && state.sortDir) {
    const dir = state.sortDir === 'asc' ? 1 : -1;
    const colDef = allColumns.find(c => c.id === state.sortCol);
    const isNum = colDef && colDef.type === 'number';

    displayRows.sort((a, b) => {
      const va = a[state.sortCol];
      const vb = b[state.sortCol];
      if (isNum) return ((Number(va) || 0) - (Number(vb) || 0)) * dir;
      return String(va ?? '').localeCompare(String(vb ?? ''), 'zh-HK') * dir;
    });
  }

  // 渲染骨架
  if (rows.length === 0) {
    root.innerHTML = `<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">${esc(emptyText)}</div>`;
    return;
  }

  const finalCols = allColumns.filter(c => state.visibleCols.includes(c.id));
  if (hasActions) finalCols.push({ id: '__actions__', label: '操作', type: 'actions' });

  // 渲染表頭
  const theadHtml = `
    <thead>
      <tr>
        ${finalCols.map(c => _renderTh(c, allColumns, state)).join('')}
      </tr>
    </thead>
  `;

  // 渲染資料列
  const tbodyHtml = `
    <tbody>
      ${displayRows.map((row, index) => {
        const tds = finalCols.map(col => {
          if (col.id === '__actions__') {
            return `<td style="text-align:right; white-space:nowrap;">${renderActions(row)}</td>`;
          }
          const val = row[col.id];
          const resolver = resolvers[col.id];
          let content = resolver ? resolver(val, row) : esc(val);
          if (content === undefined || content === null || content === '') content = '<span class="text-muted">—</span>';
          
          const isNum = col.type === 'number';
          return `<td class="${isNum ? 'num' : ''}" style="white-space:nowrap;">${content}</td>`;
        }).join('');

        return `<tr data-index="${index}" ${onRowClick ? 'style="cursor:pointer;"' : ''}>${tds}</tr>`;
      }).join('')}
    </tbody>
  `;

  // 工具列 (顯示筆數 + 欄位設定)
  const toolbarHtml = `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid var(--border-color); background:var(--bg-surface);">
      <div style="font-size:13px; color:var(--text-muted);">共 ${displayRows.length} 筆</div>
      <button type="button" class="btn btn-sm btn-ghost" id="btn-col-settings-${columnsKey}">
        <i data-lucide="settings" style="width:14px;height:14px;"></i> 欄位設定
      </button>
    </div>
  `;

  root.innerHTML = `
    <div class="glass-card" style="padding:0; overflow:hidden; width:100%; max-width:100%;">
      ${toolbarHtml}
      <div class="data-table-scroll-wrapper" style="overflow-x:auto; -webkit-overflow-scrolling:touch;">
        <table class="data-table" style="width:100%; border-collapse:collapse; min-width:600px;">
          ${theadHtml}
          ${tbodyHtml}
        </table>
      </div>
    </div>
  `;

  // 綁定事件
  _bindTableEvents(root, state, allColumns, columnsKey, options);
}

/* ============================================
   2. 渲染卡片 (Cards)
   ============================================ */
export function renderCards(options) {
  const root = _resolveEl(options.container);
  if (!root) return;

  const { rows = [], columnsKey, renderActions, onRowClick, emptyText = '尚無資料' } = options;

  if (rows.length === 0) {
    root.innerHTML = `<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">${esc(emptyText)}</div>`;
    return;
  }

  const columns = getColumns(columnsKey);
  const resolvers = getResolvers(columnsKey);
  const hasActions = typeof renderActions === 'function';
  
  const primaryCol = columns[0];
  const restCols = columns.slice(1);

  const cardsHtml = rows.map((row, index) => {
    const primaryVal = row[primaryCol.id];
    const primaryResolver = resolvers[primaryCol.id];
    const primaryContent = primaryResolver ? primaryResolver(primaryVal, row) : esc(primaryVal);

    const fieldsHtml = restCols.map((col) => {
      const val = row[col.id];
      const resolver = resolvers[col.id];
      let content = resolver ? resolver(val, row) : esc(val);
      if (content === undefined || content === null || content === '') content = '<span class="text-muted">—</span>';
      
      return `
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;">
          <span style="color:var(--text-muted);">${esc(col.label)}</span>
          <span style="font-weight:500; text-align:right;">${content}</span>
        </div>
      `;
    }).join('');

    const actionsHtml = hasActions 
      ? `<div style="margin-top:12px; padding-top:12px; border-top:1px dashed var(--border-color); display:flex; justify-content:flex-end; gap:8px;">${renderActions(row)}</div>` 
      : '';

    return `
      <div class="glass-card" data-index="${index}" style="padding:16px; margin-bottom:12px; width:100%; max-width:100%; ${onRowClick ? 'cursor:pointer;' : ''}">
        <div style="font-size:16px; font-weight:700; color:var(--primary); margin-bottom:12px; word-break:break-word;">${primaryContent}</div>
        <div>${fieldsHtml}</div>
        ${actionsHtml}
      </div>
    `;
  }).join('');

  root.innerHTML = `<div class="mobile-card-list" style="width:100%; max-width:100%;">${cardsHtml}</div>`;

  _bindRowClick(root, onRowClick, rows);
}

/* ============================================
   3. 內部工具：渲染表頭
   ============================================ */
function _renderTh(col, allColumns, state) {
  if (col.id === '__actions__') {
    return `<th style="width:150px; text-align:right; white-space:nowrap;">操作</th>`;
  }

  const isSorted = state.sortCol === col.id;
  const sortIcon = isSorted ? (state.sortDir === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down';
  const isFiltered = state.filters[col.id] != null && state.filters[col.id] !== '';
  
  // 判斷是否支援排序與篩選（根據 col 設定）
  const sortable = col.sortable !== false; // 預設允許
  const filterable = !!col.filterOptions; // 有選項才顯示漏斗

  return `
    <th class="${col.type === 'number' ? 'num' : ''}" style="white-space:nowrap;" data-col-id="${col.id}">
      <div style="display:flex; align-items:center; gap:4px; ${col.type === 'number' ? 'justify-content:flex-end;' : ''}">
        <span>${esc(col.label)}</span>
        ${sortable ? `
          <button type="button" class="btn-icon btn-sort ${isSorted ? 'text-primary' : 'text-muted'}" data-sort="${col.id}">
            <i data-lucide="${sortIcon}" style="width:12px;height:12px;"></i>
          </button>
        ` : ''}
        ${filterable ? `
          <button type="button" class="btn-icon btn-filter ${isFiltered ? 'text-primary' : 'text-muted'}" data-filter="${col.id}">
            <i data-lucide="filter" style="width:12px;height:12px;"></i>
          </button>
        ` : ''}
      </div>
    </th>
  `;
}

/* ============================================
   4. 內部工具：事件綁定
   ============================================ */
function _bindTableEvents(root, state, allColumns, columnsKey, options) {
  const { rows, columnsKey: key, onRowClick } = options;
  
  // 排序 / 篩選按鈕
  root.querySelectorAll('.btn-sort').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const colId = btn.dataset.sort;
      if (state.sortCol !== colId) {
        state.sortCol = colId; state.sortDir = 'asc';
      } else if (state.sortDir === 'asc') {
        state.sortDir = 'desc';
      } else {
        state.sortCol = null; state.sortDir = null; // 恢復原狀
      }
      renderTable(options); // 重新渲染
    };
  });

  root.querySelectorAll('.btn-filter').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      _openFilterMenu(btn, allColumns.find(c => c.id === btn.dataset.filter), state, options);
    };
  });

  // 欄位設定
  const colBtn = root.querySelector(`#btn-col-settings-${key}`);
  if (colBtn) {
    colBtn.onclick = () => _openColumnSettings(allColumns, state, options);
  }

  // 列點擊
  if (onRowClick) {
    root.querySelectorAll('tbody tr[data-index]').forEach(tr => {
      tr.onclick = (e) => {
        if (e.target.closest('button')) return;
        const idx = Number(tr.dataset.index);
        const displayRows = _getDisplayRows(rows, state);
        onRowClick(displayRows[idx]);
      };
    });
  }

  if (window.lucide) window.lucide.createIcons();
}

/* ============================================
   5. 內部工具：篩選選單與欄位設定
   ============================================ */
function _getDisplayRows(rows, state) {
  let display = [...rows];
  Object.entries(state.filters).forEach(([colId, val]) => {
    if (val) display = display.filter(r => String(r[colId] ?? '') === String(val));
  });
  if (state.sortCol && state.sortDir) {
    const dir = state.sortDir === 'asc' ? 1 : -1;
    display.sort((a, b) => String(a[state.sortCol] ?? '').localeCompare(String(b[state.sortCol] ?? '')) * dir);
  }
  return display;
}

function _openFilterMenu(btnEl, colDef, state, options) {
  document.getElementById('__table-filter-menu')?.remove();
  const rect = btnEl.getBoundingClientRect();
  const curVal = state.filters[colDef.id] || '';

  const menu = document.createElement('div');
  menu.id = '__table-filter-menu';
  menu.style.cssText = `position:fixed; top:${rect.bottom + 4}px; left:${rect.left - 100}px; z-index:9999; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-sm); box-shadow:var(--shadow-md); padding:12px; min-width:200px;`;
  
  menu.innerHTML = `
    <div style="font-size:12px; font-weight:600; margin-bottom:8px; color:var(--text-primary);">篩選：${esc(colDef.label)}</div>
    <select class="input" style="width:100%; margin-bottom:12px; padding:6px;" id="__filter-select">
      <option value="">— 全部 —</option>
      ${colDef.filterOptions.map(o => `<option value="${esc(o.value)}" ${String(o.value) === curVal ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
    </select>
    <div style="display:flex; justify-content:flex-end; gap:8px;">
      <button type="button" class="btn btn-sm btn-ghost" id="__filter-clear">清除</button>
      <button type="button" class="btn btn-sm btn-primary" id="__filter-apply">套用</button>
    </div>
  `;
  document.body.appendChild(menu);

  const closeMenu = () => menu.remove();
  document.addEventListener('mousedown', function closeHandler(e) {
    if (!menu.contains(e.target)) { closeMenu(); document.removeEventListener('mousedown', closeHandler); }
  });

  menu.querySelector('#__filter-apply').onclick = () => {
    const val = menu.querySelector('#__filter-select').value;
    if (val) state.filters[colDef.id] = val;
    else delete state.filters[colDef.id];
    closeMenu();
    renderTable(options);
  };
  menu.querySelector('#__filter-clear').onclick = () => {
    delete state.filters[colDef.id];
    closeMenu();
    renderTable(options);
  };
}

function _openColumnSettings(allColumns, state, options) {
  const modalId = '__col-settings-modal';
  document.getElementById(modalId)?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = modalId;
  
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px; background:var(--bg-surface);">
      <h2 style="font-size:18px; font-weight:700; margin-bottom:16px; color:var(--text-primary);">欄位顯示設定</h2>
      <div style="max-height:60vh; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
        ${allColumns.map(c => `
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:8px; border-radius:6px; background:var(--bg-deep);">
            <input type="checkbox" data-col="${c.id}" ${state.visibleCols.includes(c.id) ? 'checked' : ''} style="width:16px;height:16px;">
            <span style="font-size:14px; color:var(--text-primary);">${esc(c.label)}</span>
          </label>
        `).join('')}
      </div>
      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
        <button type="button" class="btn btn-ghost" id="__col-cancel">取消</button>
        <button type="button" class="btn btn-primary" id="__col-save">儲存</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  openModal(modalId);

  overlay.querySelector('#__col-cancel').onclick = () => { closeModal(modalId); overlay.remove(); };
  overlay.querySelector('#__col-save').onclick = () => {
    const checked = Array.from(overlay.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.dataset.col);
    if (checked.length === 0) {
      alert('至少需保留一個欄位'); return;
    }
    state.visibleCols = checked;
    closeModal(modalId); overlay.remove();
    renderTable(options);
  };
}

/* ============================================
   輔助函式
   ============================================ */
function _resolveEl(target) {
  if (typeof target === 'string') return document.getElementById(target);
  if (target instanceof HTMLElement) return target;
  return null;
}

function _bindRowClick(root, onRowClick, rows) {
  if (onRowClick) {
    root.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const trOrCard = e.target.closest('[data-index]');
      if (trOrCard) {
        onRowClick(rows[Number(trOrCard.dataset.index)]);
      }
    });
  }
}

/* ═══ EOF ═══
F: ui/table.js
V: 1792901840
W: webapp-20261025-001#32
═══ */