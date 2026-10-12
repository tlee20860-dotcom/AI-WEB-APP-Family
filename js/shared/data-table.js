// ============================================
// data-table.js — 通用表格渲染（v103.0.34）
// v103.0.34（B29-1c）：
//   ✅ 加表頭排序（3 態：升 / 降 / 清除）
//   ✅ 加表頭篩選（下拉面板）
//   ✅ 依 type 判斷可排序；依 filterOptions 可篩選
// ============================================
import { getEntityDef, getEntityUi } from '../entity/entity-definitions.js';
import { esc as escapeHtml } from '../lib/dom.js';
import { formatCellValue } from '../lib/format.js';
import { initColumnSettings } from './column-settings.js';

const LISTENER_KEY = '__dtClickListener';
const COLLAPSE_PREFIX = 'fin_ui_collapse_';
const SEARCH_INPUT_ID_PREFIX = '__dt_search_';

function _render(root, html) {
  if (root.__lastHtml === html) return false;
  root.__lastHtml = html;
  root.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
  return true;
}

export function renderDataTable(options) {
  const { container, entityKey, rows, tableId, options: extra = {}, hooks = {} } = options;
  const root = _resolveEl(container);
  if (!root) return null;

  const def = getEntityDef(entityKey);
  const customCols = extra.columns;
  const hasCustomCols = Array.isArray(customCols) && customCols.length > 0;
  if (!def && !hasCustomCols) return null;

  const effectiveDef = def || { fields: [] };
  const effectiveUi = def ? (getEntityUi(entityKey) || {}) : { canEdit: false, canDelete: false };
  const _tableId = tableId || entityKey;
  const {
    resolvers = {}, mobileCardMode = false, tableClass = '',
    expandable = false, renderDetail = null,
    collapsible = false, defaultCollapsed = false,
    headerActions = [], storageKey = _tableId,
  } = extra;

  const hasCustom = typeof hooks.customActions === 'function';
  const hasBuiltin = (effectiveUi.canEdit !== false) || (effectiveUi.canDelete !== false);
  const allowBuiltin = !hasCustom || extra.disableBuiltinActions === false;
  const shouldActions = hasCustom || (hasBuiltin && allowBuiltin);

  const finalClass = ['data-table', mobileCardMode ? 'mobile-cards' : '', tableClass].filter(Boolean).join(' ');
  const fieldMap = {};
  (effectiveDef.fields || []).forEach((f) => { fieldMap[f.id] = f; });

  let allCols;
  if (hasCustomCols) allCols = customCols.map((c) => ({ ...c }));
  else {
    const listCols = effectiveUi.listColumns || (effectiveDef.fields || []).map((f) => f.id);
    allCols = listCols.map((id) => {
      const f = fieldMap[id];
      return { id, label: f?.label || id, type: f?.type || 'text', defaultVisible: true };
    });
  }

  if (shouldActions && !allCols.some((c) => c.id === '__actions__')) {
    allCols.push({ id: '__actions__', label: '操作', type: 'actions', defaultVisible: true, defaultWidth: 180 });
  }

  const collapseKey = `${COLLAPSE_PREFIX}${storageKey}`;
  let _collapsed = false;
  if (collapsible) {
    try { const s = localStorage.getItem(collapseKey); _collapsed = s === null ? defaultCollapsed : s === 'true'; } catch (e) {}
  }

  const _expanded = new Set();
  const colSettings = initColumnSettings({ tableId: _tableId, columns: allCols });
  const _originalRows = typeof hooks.beforeRender === 'function' ? (hooks.beforeRender(rows) || rows) : rows;

  /* 🆕 v103.0.34：排序 / 篩選狀態 */
  let _sortState = { columnId: null, direction: null }; // null | 'asc' | 'desc'
  let _filterState = {}; // { columnId: value }

  /* 依 type 判斷是否可排序 */
  const _isSortable = (col) => {
    if (col.id === '__actions__' || col.type === 'actions') return false;
    if (col.sortable !== undefined) return !!col.sortable;
    return ['text', 'number', 'date', 'select'].includes(col.type || 'text');
  };

  /* 依 filterOptions 判斷是否可篩選 */
  const _isFilterable = (col) => {
    if (col.id === '__actions__' || col.type === 'actions') return false;
    if (col.filterable === true && Array.isArray(col.filterOptions)) return true;
    return false;
  };

  /* 計算篩選後 + 排序後的 rows */
  const _computeDisplayRows = () => {
    let result = [...(_originalRows || [])];

    /* 篩選 */
    Object.entries(_filterState).forEach(([colId, filterVal]) => {
      if (filterVal === '' || filterVal == null) return;
      const col = allCols.find((c) => c.id === colId);
      if (!col) return;

      if (typeof col.filterFn === 'function') {
        result = result.filter((row) => col.filterFn(row, filterVal));
      } else {
        result = result.filter((row) => String(row[colId] ?? '') === String(filterVal));
      }
    });

    /* 排序 */
    if (_sortState.columnId && _sortState.direction) {
      const col = allCols.find((c) => c.id === _sortState.columnId);
      if (col) {
        const dir = _sortState.direction === 'asc' ? 1 : -1;
        const type = col.type || 'text';
        result.sort((a, b) => {
          const va = a[_sortState.columnId];
          const vb = b[_sortState.columnId];
          if (type === 'number') {
            return ((Number(va) || 0) - (Number(vb) || 0)) * dir;
          }
          return String(va ?? '').localeCompare(String(vb ?? ''), 'zh-HK') * dir;
        });
      }
    }

    return result;
  };

  let _rows = _computeDisplayRows();

  _paint();

  function _paint() {
    _rows = _computeDisplayRows();
    const visible = colSettings.getVisibleColumns();
    if (!_rows || _rows.length === 0) {
      _render(root, `<div class="glass-card"><div class="empty-state">尚無資料</div></div>`);
      _bind();
      return;
    }
    const total = visible.length + (expandable ? 1 : 0);
    const left = collapsible
      ? `<button type="button" class="btn btn-sm btn-ghost" data-action="toggle-collapse"><i data-lucide="${_collapsed ? 'chevron-right' : 'chevron-down'}" style="width:14px;height:14px;"></i><span>共 ${_rows.length} 筆</span></button>`
      : `<span class="text-muted" style="font-size:12px;">共 ${_rows.length} 筆</span>`;
    const headerActionsHtml = headerActions.map((a) => `<button type="button" class="btn btn-sm ${escapeHtml(a.className || 'btn-ghost')}" data-action="${escapeHtml(a.action)}">${a.icon ? `<i data-lucide="${escapeHtml(a.icon)}" style="width:14px;height:14px;"></i>` : ''}<span>${escapeHtml(a.label)}</span></button>`).join('');
    const head = `<thead><tr>${expandable ? '<th class="expand-col" style="width:36px;"></th>' : ''}${visible.map((c) => _renderTh(c, colSettings)).join('')}</tr></thead>`;
    const body = _rows.map((row, i) => _rowHtml(row, i, visible, total)).join('');
    const html = `<div class="data-table-header"><div class="data-table-header-left">${left}</div><div class="data-table-header-right"><button type="button" class="btn btn-sm btn-ghost" data-action="column-settings" title="欄位設定"><i data-lucide="columns" style="width:14px;height:14px;"></i><span class="hide-mobile">欄位</span></button>${headerActionsHtml}</div></div><div class="data-table-body" style="display:${_collapsed ? 'none' : 'block'};"><div class="glass-card collapsible-card collapsible-card-flat" style="padding:0;"><div class="data-table-scroll-wrapper"><table class="${finalClass}">${head}<tbody>${body}</tbody></table></div></div></div>`;
    _render(root, html);
    _bind();
    if (typeof hooks.afterRender === 'function') hooks.afterRender(root);
  }

  /* 🆕 渲染表頭（含排序 / 篩選） */
  function _renderTh(col, colSettings) {
    const w = colSettings.getWidth(col.id);
    const sortable = _isSortable(col);
    const filterable = _isFilterable(col);
    const isSorted = _sortState.columnId === col.id;
    const sortIcon = isSorted
      ? (_sortState.direction === 'asc' ? 'chevron-up' : 'chevron-down')
      : 'chevrons-up-down';
    const isFiltered = _filterState[col.id] != null && _filterState[col.id] !== '';

    const sortHtml = sortable
      ? `<button type="button" class="dt-sort-btn ${isSorted ? 'active' : ''}" data-dt-sort="${escapeHtml(col.id)}" title="點擊排序"><i data-lucide="${sortIcon}" style="width:11px;height:11px;"></i></button>`
      : '';

    const filterHtml = filterable
      ? `<button type="button" class="dt-filter-btn ${isFiltered ? 'active' : ''}" data-dt-filter="${escapeHtml(col.id)}" title="篩選"><i data-lucide="filter" style="width:11px;height:11px;"></i></button>`
      : '';

    return `<th class="${col.type === 'number' ? 'num' : ''} ${sortable ? 'dt-th-sortable' : ''}" ${w ? `style="width:${w}px;"` : ''} data-dt-th="${escapeHtml(col.id)}">
      <span class="dt-th-label">${escapeHtml(col.label)}</span>
      ${sortHtml}${filterHtml}
    </th>`;
  }

  function _rowHtml(row, i, visible, total) {
    const main = `<tr data-row-index="${i}">${expandable ? `<td class="expand-col"><button type="button" class="btn btn-sm btn-ghost" data-action="toggle-expand" data-index="${i}" style="padding:2px 6px;"><i data-lucide="${_expanded.has(i) ? 'chevron-down' : 'chevron-right'}" style="width:14px;height:14px;"></i></button></td>` : ''}${visible.map((c, ci) => _cell(c, row, ci === 0)).join('')}</tr>`;
    if (!expandable || typeof renderDetail !== 'function') return main;
    return main + `<tr class="detail-row" data-detail-index="${i}" style="display:${_expanded.has(i) ? 'table-row' : 'none'};"><td colspan="${total}" class="detail-cell">${renderDetail(row)}</td></tr>`;
  }

  function _cell(col, row, isFirst) {
    if (col.id === '__actions__') return `<td data-label="操作">${_actions(col, row)}</td>`;
    if (typeof hooks.customCellRender === 'function') {
      const c = hooks.customCellRender(col, row);
      if (c !== null && c !== undefined) return `<td data-label="${escapeHtml(col.label)}" ${isFirst ? 'data-primary="1"' : ''}>${c}</td>`;
    }
    const val = row[col.id];
    const r = resolvers[col.id];
    const content = r ? r(val, row) : formatCellValue(val, col.type);
    return `<td class="${col.type === 'number' ? 'num' : ''}" ${isFirst ? 'data-primary="1"' : `data-label="${escapeHtml(col.label)}"`}>${content}</td>`;
  }

  function _actions(col, row) {
    let h = '';
    if (hasCustom) {
      h += (hooks.customActions(row) || []).map((a) => `<button type="button" class="btn btn-sm ${escapeHtml(a.className || 'btn-ghost')}" data-action="${escapeHtml(a.action || 'custom')}">${a.icon ? `<i data-lucide="${escapeHtml(a.icon)}" style="width:14px;height:14px;"></i>` : ''}${escapeHtml(a.label)}</button>`).join('');
    }
    if (allowBuiltin) {
      if (effectiveUi.canEdit !== false) h += `<button type="button" class="btn btn-sm btn-ghost" data-action="edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i> 編輯</button>`;
      if (effectiveUi.canDelete !== false) h += `<button type="button" class="btn btn-sm btn-danger" data-action="delete"><i data-lucide="trash-2" style="width:14px;height:14px;"></i> 刪除</button>`;
    }
    return h;
  }

  /* 🆕 篩選面板 */
  function _openFilterPanel(col) {
    const panelId = `dt-filter-panel-${_tableId}`;
    document.getElementById(panelId)?.remove();

    const th = root.querySelector(`[data-dt-th="${col.id}"]`);
    if (!th) return;
    const rect = th.getBoundingClientRect();

    const curVal = _filterState[col.id] ?? '';
    const options = col.filterOptions || [];

    const overlay = document.createElement('div');
    overlay.className = 'dt-filter-overlay';
    overlay.id = panelId;
    overlay.style.position = 'fixed';
    overlay.style.top = `${rect.bottom + 4}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.zIndex = '2000';

    overlay.innerHTML = `
      <div class="dt-filter-panel">
        <div class="dt-filter-panel-title">${escapeHtml(col.label)}</div>
        <select class="select" data-dt-filter-select style="width:100%; padding:6px 10px; font-size:13px;">
          <option value="">— 全部 —</option>
          ${options.map((o) => `<option value="${escapeHtml(o.value)}" ${String(o.value) === String(curVal) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
        </select>
        <div class="dt-filter-panel-actions">
          <button type="button" class="btn btn-sm btn-ghost" data-dt-filter-clear>清除</button>
          <button type="button" class="btn btn-sm btn-primary" data-dt-filter-apply>套用</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { overlay.remove(); return; }
      if (e.target.closest('[data-dt-filter-clear]')) {
        delete _filterState[col.id];
        overlay.remove();
        _paint();
        return;
      }
      if (e.target.closest('[data-dt-filter-apply]')) {
        const sel = overlay.querySelector('[data-dt-filter-select]');
        if (sel.value === '') {
          delete _filterState[col.id];
        } else {
          _filterState[col.id] = sel.value;
        }
        overlay.remove();
        _paint();
        return;
      }
    });

    /* 點擊外部關閉 */
    const outsideHandler = (e) => {
      if (!overlay.contains(e.target) && !e.target.closest('[data-dt-filter]')) {
        overlay.remove();
        document.removeEventListener('mousedown', outsideHandler);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', outsideHandler), 0);
  }

  function _bind() {
    const old = root[LISTENER_KEY];
    if (old) root.removeEventListener('click', old);
    const listener = (e) => {
      /* 排序按鈕 */
      const sortBtn = e.target.closest('[data-dt-sort]');
      if (sortBtn) {
        e.stopPropagation();
        const colId = sortBtn.dataset.dtSort;
        if (_sortState.columnId !== colId) {
          _sortState = { columnId: colId, direction: 'asc' };
        } else if (_sortState.direction === 'asc') {
          _sortState = { columnId: colId, direction: 'desc' };
        } else if (_sortState.direction === 'desc') {
          _sortState = { columnId: null, direction: null };
        } else {
          _sortState = { columnId: colId, direction: 'asc' };
        }
        _paint();
        return;
      }

      /* 篩選按鈕 */
      const filterBtn = e.target.closest('[data-dt-filter]');
      if (filterBtn) {
        e.stopPropagation();
        const colId = filterBtn.dataset.dtFilter;
        const col = allCols.find((c) => c.id === colId);
        if (col) _openFilterPanel(col);
        return;
      }

      const colBtn = e.target.closest('button[data-action="toggle-collapse"]');
      if (colBtn) { _collapsed = !_collapsed; try { localStorage.setItem(collapseKey, String(_collapsed)); } catch (err) {} _paint(); return; }
      const expBtn = e.target.closest('button[data-action="toggle-expand"]');
      if (expBtn) { const i = Number(expBtn.dataset.index); _expanded.has(i) ? _expanded.delete(i) : _expanded.add(i); _paint(); return; }
      const hBtn = e.target.closest('.data-table-header-right button[data-action]');
      if (hBtn) {
        const a = hBtn.dataset.action;
        if (a === 'column-settings') { colSettings.openPanel({ onChange: _paint }); return; }
        const m = headerActions.find((x) => x.action === a);
        if (m?.onClick) { e.stopPropagation(); m.onClick(); return; }
        return;
      }
      const actBtn = e.target.closest('tbody button[data-action]');
      if (actBtn) {
        const a = actBtn.dataset.action;
        const tr = actBtn.closest('tr[data-row-index]');
        if (!tr) return;
        const row = _rows[Number(tr.dataset.rowIndex)];
        if (!row) return;
        if (hasCustom) {
          const m = (hooks.customActions(row) || []).find((x) => (x.action || 'custom') === a);
          if (m?.onClick) { e.stopPropagation(); m.onClick(row); return; }
        }
        if (a === 'edit' && hooks.onEdit) { e.stopPropagation(); hooks.onEdit(row); return; }
        if (a === 'delete' && hooks.onDelete) { e.stopPropagation(); hooks.onDelete(row); return; }
        return;
      }
      const tr = e.target.closest('tr[data-row-index]');
      if (tr && hooks.onRowClick) hooks.onRowClick(_rows[Number(tr.dataset.rowIndex)]);
    };
    root.addEventListener('click', listener);
    root[LISTENER_KEY] = listener;
  }

  return {
    container: root,
    table: root.querySelector('table'),
    refresh: _paint,
    destroy: () => {
      const old = root[LISTENER_KEY];
      if (old) root.removeEventListener('click', old);
      root.innerHTML = '';
      root.__lastHtml = '';
    },
  };
}

function _resolveEl(t) {
  if (typeof t === 'string') return document.getElementById(t);
  if (t instanceof HTMLElement) return t;
  return null;
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/shared/data-table.js
   Version: v103.0.34
   Batch: B29-1c
   ═══════════════════════════════════════════ */