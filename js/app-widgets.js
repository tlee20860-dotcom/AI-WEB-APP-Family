// ============================================
// app-widgets.js — SPA 展示元件集
// 職責：data-table / data-card / stats-cards / page-controls / entity-list-page
// 介面：沿用舊版 shared/* 與 blocks/*，呼叫端 100% 相容
// ============================================

import { AppState } from './app-core.js';
import { esc, formatHKD, openConfirm, toast, initViewToggle } from './app-ui.js';
import { api, listen, resolveName, statusLabel, statusBadgeClass } from './app-data.js';

/* ============================================
   1. 通用渲染（就地更新）
   ============================================ */
function _paint(root, html) {
  if (root.__lastHtml === html) return;
  root.__lastHtml = html;
  root.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

/* ============================================
   2. 統計卡（合併舊 stats-block + stats-cards）
   ============================================ */
export function renderStats({ container, cards = [], columns = 3 } = {}) {
  const root = typeof container === 'string' ? document.getElementById(container) : container;
  if (!root) return null;

  function paint() {
    if (!cards.length) { _paint(root, ''); return; }
    const cols = Math.min(columns, cards.length);
    const html = `<div class="stats-compact-grid stats-compact-grid-${cols}" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px;margin-bottom:20px;">
      ${cards.map((c) => `
        <div class="glass-card" style="padding:12px 14px;">
          <div class="glass-card-title" style="display:flex;align-items:center;gap:4px;font-size:10px;margin-bottom:6px;">
            ${c.icon ? `<i data-lucide="${esc(c.icon)}" style="width:12px;height:12px;"></i>` : ''}
            <span>${esc(c.title || '')}</span>
          </div>
          <div class="mono ${esc(c.valueClass || '')}" style="font-size:17px;font-weight:700;color:var(--primary);word-break:break-all;">${c.value == null ? '—' : esc(String(c.value))}</div>
          ${c.hint ? `<div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${esc(c.hint)}</div>` : ''}
        </div>`).join('')}
    </div>`;
    _paint(root, html);
  }
  paint();
  return { root, refresh: paint, destroy: () => { root.innerHTML = ''; root.__lastHtml = ''; } };
}

/* ============================================
   3. 表格（合併舊 data-table + column-settings）
   ============================================ */
const _DT_LISTENER = '__widgets_dt__';

export function renderTable({ container, rows = [], columns = [], resolvers = {}, actions = () => [], emptyText = '尚無資料', storageKey = null }) {
  const root = typeof container === 'string' ? document.getElementById(container) : container;
  if (!root) return null;

  let _sortState = { id: null, dir: null };
  let _filterState = {};
  let _visible = columns.map((c) => c.id);
  if (storageKey) {
    try {
      const raw = localStorage.getItem(`fin_ui_col_${storageKey}`);
      if (raw) {
        const d = JSON.parse(raw);
        if (Array.isArray(d.visible)) {
          _visible = d.visible.filter((id) => columns.some((c) => c.id === id));
          columns.forEach((c) => { if (!_visible.includes(c.id)) _visible.push(c.id); });
        }
      }
    } catch (e) {}
  }

  const sortable = (c) => c.type && ['text', 'number', 'date', 'select'].includes(c.type);
  const filterable = (c) => Array.isArray(c.filterOptions);

  function computeRows() {
    let r = [...rows];
    Object.entries(_filterState).forEach(([k, v]) => {
      if (v === '' || v == null) return;
      r = r.filter((x) => String(x[k] ?? '') === String(v));
    });
    if (_sortState.id && _sortState.dir) {
      const col = columns.find((c) => c.id === _sortState.id);
      if (col) {
        const dir = _sortState.dir === 'asc' ? 1 : -1;
        const t = col.type;
        r.sort((a, b) => t === 'number'
          ? ((Number(a[_sortState.id]) || 0) - (Number(b[_sortState.id]) || 0)) * dir
          : String(a[_sortState.id] ?? '').localeCompare(String(b[_sortState.id] ?? ''), 'zh-HK') * dir);
      }
    }
    return r;
  }

  function paint() {
    const display = computeRows();
    if (display.length === 0) { _paint(root, `<div class="glass-card"><div class="empty-state">${esc(emptyText)}</div></div>`); bind(); return; }

    const visCols = _visible.map((id) => columns.find((c) => c.id === id)).filter(Boolean);
    const hasActions = typeof actions === 'function';

    const head = `<thead><tr>${visCols.map((c) => {
      const sortIcon = _sortState.id === c.id ? (_sortState.dir === 'asc' ? 'chevron-up' : 'chevron-down') : 'chevrons-up-down';
      const sBtn = sortable(c) ? `<button type="button" data-dt-sort="${esc(c.id)}" style="background:${_sortState.id === c.id ? 'var(--primary)' : 'transparent'};border:none;cursor:pointer;padding:2px 4px;border-radius:3px;color:${_sortState.id === c.id ? '#fff' : 'var(--text-muted)'};"><i data-lucide="${sortIcon}" style="width:11px;height:11px;"></i></button>` : '';
      const isFiltered = _filterState[c.id] != null && _filterState[c.id] !== '';
      const fBtn = filterable(c) ? `<button type="button" data-dt-filter="${esc(c.id)}" style="background:${isFiltered ? 'var(--accent-warm)' : 'transparent'};border:none;cursor:pointer;padding:2px 4px;border-radius:3px;color:${isFiltered ? '#fff' : 'var(--text-muted)'};"><i data-lucide="filter" style="width:11px;height:11px;"></i></button>` : '';
      return `<th class="${c.type === 'number' ? 'num' : ''}" style="${c.width ? `width:${c.width}px;` : ''}"><span>${esc(c.label)}</span>${sBtn}${fBtn}</th>`;
    }).join('')}${hasActions ? '<th style="width:160px;">操作</th>' : ''}</tr></thead>`;

    const body = display.map((row, i) => `<tr data-row-index="${i}">
      ${visCols.map((c) => {
        const resolver = resolvers[c.id];
        const content = resolver ? resolver(row[c.id], row) : (row[c.id] == null ? '—' : esc(String(row[c.id])));
        return `<td class="${c.type === 'number' ? 'num' : ''}">${content}</td>`;
      }).join('')}
      ${hasActions ? `<td>${(actions(row) || []).map((a) => `<button type="button" class="btn btn-sm ${esc(a.className || 'btn-ghost')}" data-act="${esc(a.action || 'custom')}" data-idx="${i}">${a.icon ? `<i data-lucide="${esc(a.icon)}" style="width:14px;height:14px;"></i>` : ''}${esc(a.label)}</button>`).join('')}</td>` : ''}
    </tr>`).join('');

    const html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
        <span style="font-size:12px;color:var(--text-muted);">共 ${display.length} 筆</span>
        <button type="button" class="btn btn-sm btn-ghost" data-dt-cols><i data-lucide="columns" style="width:14px;height:14px;"></i><span>欄位</span></button>
      </div>
      <div style="overflow-x:auto;"><div class="glass-card" style="padding:0;">
        <table class="data-table" style="width:100%;min-width:100%;">${head}<tbody>${body}</tbody></table>
      </div></div>`;
    _paint(root, html);
    bind();
  }

  function bind() {
    if (root[_DT_LISTENER]) root.removeEventListener('click', root[_DT_LISTENER]);
    const h = (e) => {
      const sBtn = e.target.closest('[data-dt-sort]');
      if (sBtn) {
        e.stopPropagation();
        const id = sBtn.dataset.dtSort;
        if (_sortState.id !== id) _sortState = { id, dir: 'asc' };
        else if (_sortState.dir === 'asc') _sortState = { id, dir: 'desc' };
        else _sortState = { id: null, dir: null };
        paint(); return;
      }
      const fBtn = e.target.closest('[data-dt-filter]');
      if (fBtn) { e.stopPropagation(); openFilter(fBtn.dataset.dtFilter); return; }
      const cBtn = e.target.closest('[data-dt-cols]');
      if (cBtn) { e.stopPropagation(); openCols(); return; }
      const act = e.target.closest('button[data-act]');
      if (act) {
        const tr = act.closest('tr[data-row-index]');
        if (!tr) return;
        const row = computeRows()[Number(tr.dataset.idx)];
        if (!row) return;
        const a = (actions(row) || []).find((x) => (x.action || 'custom') === act.dataset.act);
        if (a?.onClick) a.onClick(row);
      }
    };
    root.addEventListener('click', h);
    root[_DT_LISTENER] = h;
  }

  function openFilter(colId) {
    const col = columns.find((c) => c.id === colId);
    if (!col || !col.filterOptions) return;
    const th = root.querySelector(`[data-dt-filter="${colId}"]`);
    if (!th) return;
    const rect = th.getBoundingClientRect();
    const cur = _filterState[colId] ?? '';

    const panel = document.createElement('div');
    panel.style.cssText = `position:fixed;top:${rect.bottom + 4}px;left:${rect.left}px;z-index:2000;background:var(--modal-bg);border:1px solid var(--glass-border);border-radius:var(--radius-sm);padding:12px;min-width:200px;box-shadow:var(--shadow-lg);`;
    panel.innerHTML = `
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">${esc(col.label)}</div>
      <select class="select" style="width:100%;padding:6px 10px;font-size:13px;">
        <option value="">— 全部 —</option>
        ${col.filterOptions.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(cur) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
      </select>
      <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:10px;">
        <button type="button" class="btn btn-sm btn-ghost" data-clear>清除</button>
        <button type="button" class="btn btn-sm btn-primary" data-apply>套用</button>
      </div>`;
    document.body.appendChild(panel);

    panel.addEventListener('click', (e) => {
      if (e.target.closest('[data-clear]')) { delete _filterState[colId]; panel.remove(); paint(); }
      else if (e.target.closest('[data-apply]')) {
        const v = panel.querySelector('select').value;
        if (v === '') delete _filterState[colId]; else _filterState[colId] = v;
        panel.remove(); paint();
      }
    });
    const outside = (ev) => { if (!panel.contains(ev.target)) { panel.remove(); document.removeEventListener('mousedown', outside); } };
    setTimeout(() => document.addEventListener('mousedown', outside), 0);
  }

  function openCols() {
    const o = document.createElement('div');
    o.className = 'modal-overlay active';
    o.innerHTML = `<div class="modal" style="max-width:480px;max-height:90vh;overflow-y:auto;">
      <h2 class="modal-title">欄位設定</h2>
      <div id="__dt_cols_list"></div>
      <div class="modal-actions" style="margin-top:16px;">
        <button type="button" class="btn btn-ghost" data-cancel>取消</button>
        <button type="button" class="btn btn-primary" data-save>儲存</button>
      </div></div>`;
    document.body.appendChild(o);
    const listEl = o.querySelector('#__dt_cols_list');
    const temp = columns.map((c) => ({ id: c.id, label: c.label, visible: _visible.includes(c.id) }));
    const render = () => {
      listEl.innerHTML = temp.map((c, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--divider);">
          <input type="checkbox" data-idx="${i}" ${c.visible ? 'checked' : ''} style="width:auto;cursor:pointer;">
          <span style="font-size:13px;">${esc(c.label)}</span>
        </div>`).join('');
    };
    render();
    listEl.addEventListener('change', (e) => {
      const cb = e.target.closest('input[type="checkbox"]');
      if (cb) temp[Number(cb.dataset.idx)].visible = cb.checked;
    });
    o.addEventListener('click', (e) => {
      if (e.target === o || e.target.closest('[data-cancel]')) o.remove();
      else if (e.target.closest('[data-save]')) {
        _visible = temp.filter((c) => c.visible).map((c) => c.id);
        if (_visible.length === 0) _visible = [columns[0].id];
        if (storageKey) try { localStorage.setItem(`fin_ui_col_${storageKey}`, JSON.stringify({ visible: _visible })); } catch (er) {}
        o.remove(); paint();
      }
    });
  }

  paint();
  return { root, refresh: paint, destroy: () => {
    if (root[_DT_LISTENER]) root.removeEventListener('click', root[_DT_LISTENER]);
    root.innerHTML = ''; root.__lastHtml = '';
  } };
}

/* ============================================
   4. 卡片（合併舊 data-card）
   ============================================ */
export function renderCards({ container, rows = [], columns = [], resolvers = {}, actions = () => [], primaryCol = 'name', cardFields = null, gridClass = 'grid grid-3' }) {
  const root = typeof container === 'string' ? document.getElementById(container) : container;
  if (!root) return null;

  const fields = cardFields || columns.slice(1, 4).map((c) => c.id);
  const colMap = {};
  columns.forEach((c) => { colMap[c.id] = c; });
  const hasActions = typeof actions === 'function';

  function paint() {
    if (!rows.length) { _paint(root, `<div class="glass-card"><div class="empty-state">尚無資料</div></div>`); return; }
    const html = `<div class="${gridClass}" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
      ${rows.map((row, i) => {
        const fieldsHtml = fields.map((id) => {
          const col = colMap[id];
          if (!col) return '';
          const r = resolvers[id];
          const content = r ? r(row[id], row) : (row[id] == null ? '—' : esc(String(row[id])));
          return `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:var(--text-muted);font-size:11px;">${esc(col.label)}</span><span style="text-align:right;">${content}</span></div>`;
        }).join('');
        const actsHtml = hasActions
          ? `<div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--divider-strong);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
              ${(actions(row) || []).map((a) => `<button type="button" class="btn btn-sm ${esc(a.className || 'btn-ghost')}" data-act="${esc(a.action || 'custom')}" data-idx="${i}">${a.icon ? `<i data-lucide="${esc(a.icon)}" style="width:14px;height:14px;"></i>` : ''}${esc(a.label)}</button>`).join('')}
            </div>`
          : '';
        return `<div class="glass-card" data-row-index="${i}" style="padding:16px;">
          <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:10px;line-height:1.35;">${esc(row[primaryCol] || row.name || '（未命名）')}</div>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;">${fieldsHtml}</div>
          ${actsHtml}
        </div>`;
      }).join('')}
    </div>`;
    _paint(root, html);
  }

  const handler = (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const card = btn.closest('[data-row-index]');
    if (!card) return;
    const row = rows[Number(card.dataset.idx)];
    const a = (actions(row) || []).find((x) => (x.action || 'custom') === btn.dataset.act);
    if (a?.onClick) a.onClick(row);
  };
  root.addEventListener('click', handler);

  paint();
  return { root, refresh: paint, destroy: () => { root.removeEventListener('click', handler); root.innerHTML = ''; root.__lastHtml = ''; } };
}

/* ============================================
   5. 控制列（合併舊 page-controls）
   ============================================ */
export function renderControls({ container, items = [] } = {}) {
  const root = typeof container === 'string' ? document.getElementById(container) : container;
  if (!root) return null;

  function getYearList() {
    const curY = new Date().getFullYear();
    const startY = curY - 3;
    const endY = curY + 5;
    const list = [];
    for (let y = startY; y <= endY; y++) list.push(y);
    return list;
  }

  function paint() {
    const parts = [];
    const left = items.filter((it) => it.type !== 'year' && it.type !== 'month' && it.align !== 'right');
    const right = items.filter((it) => it.align === 'right');
    const yearIt = items.find((it) => it.type === 'year');
    const monthIt = items.find((it) => it.type === 'month');

    if (left.length || right.length) {
      parts.push(`<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">${left.map(_renderItem).join('')}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">${right.map(_renderItem).join('')}</div>
      </div>`);
    }
    if (yearIt || monthIt) {
      const curY = AppState.year;
      const curM = AppState.month;
      const yOpts = getYearList().map((y) => `<option value="${y}" ${String(y) === String(curY) ? 'selected' : ''}>${y} 年</option>`).join('');
      let mOpts = '';
      if (monthIt?.includeAll) mOpts += `<option value="all" ${curM === 'all' ? 'selected' : ''}>全部</option>`;
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, '0');
        mOpts += `<option value="${mm}" ${mm === String(curM) ? 'selected' : ''}>${m} 月</option>`;
      }
      parts.push(`<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        ${yearIt ? `<select class="select" data-pc-year style="width:auto;padding:8px 12px;">${yOpts}</select>` : ''}
        ${monthIt ? `<select class="select" data-pc-month style="width:auto;padding:8px 12px;">${mOpts}</select>` : ''}
      </div>`);
    }
    _paint(root, parts.length ? `<div style="margin-bottom:20px;">${parts.join('')}</div>` : '');
    bind();
  }

  function _renderItem(it) {
    if (it.type === 'add') return `<button type="button" class="btn btn-primary" data-pc-add><i data-lucide="plus"></i> ${esc(it.label || '新增')}</button>`;
    if (it.type === 'export') return `<button type="button" class="btn btn-magenta" data-pc-export><i data-lucide="file-spreadsheet"></i> ${esc(it.label || '匯出')}</button>`;
    if (it.type === 'viewToggle') {
      return `<div data-pc-view-toggle data-key="${esc(it.storageKey || '')}">
        <button type="button" class="btn btn-sm btn-primary" data-view="card">卡片</button>
        <button type="button" class="btn btn-sm btn-ghost" data-view="table">表格</button>
      </div>`;
    }
    if (it.type === 'custom') return it.render ? it.render() : (it.html || '');
    if (it.type === 'filter') return `<div data-pc-filter>${it.render ? it.render() : ''}</div>`;
    return '';
  }

  function bind() {
    const h = (e) => {
      const addBtn = e.target.closest('[data-pc-add]');
      if (addBtn) { const it = items.find((x) => x.type === 'add'); it?.onClick?.(); return; }
      const expBtn = e.target.closest('[data-pc-export]');
      if (expBtn) { const it = items.find((x) => x.type === 'export'); it?.onClick?.(); return; }
      const vBtn = e.target.closest('[data-pc-view-toggle] button[data-view]');
      if (vBtn) {
        const g = vBtn.closest('[data-pc-view-toggle]');
        g.querySelectorAll('button').forEach((b) => { b.classList.toggle('btn-primary', b === vBtn); b.classList.toggle('btn-ghost', b !== vBtn); });
        const it = items.find((x) => x.type === 'viewToggle');
        const v = vBtn.dataset.view;
        if (it?.storageKey) try { localStorage.setItem(`fin_ui_view_${it.storageKey}`, v); } catch (er) {}
        it?.onChange?.(v);
      }
    };
    const ch = (e) => {
      const y = e.target.closest('[data-pc-year]');
      if (y) { AppState.setYearMonth(y.value, AppState.month); return; }
      const m = e.target.closest('[data-pc-month]');
      if (m) { AppState.setYearMonth(AppState.year, m.value); return; }
    };
    root.addEventListener('click', h);
    root.addEventListener('change', ch);
    root.__pcH = h; root.__pcCh = ch;
  }

  paint();
  return { root, refresh: paint, destroy: () => {
    if (root.__pcH) root.removeEventListener('click', root.__pcH);
    if (root.__pcCh) root.removeEventListener('change', root.__pcCh);
    root.innerHTML = ''; root.__lastHtml = '';
  } };
}

/* ============================================
   6. 實體列表頁骨架（合併舊 entity-list-page）
   ============================================ */
export function initEntityListPage({ entity, containerId, columns, resolvers, actions, listenPath, sortFn = null, title = '' }) {
  const root = document.getElementById(containerId);
  if (!root) return null;

  let rows = [];
  let view = 'table';
  let unsub = null;
  let _table = null, _cards = null;

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
      <div style="font-size:13px;color:var(--text-muted);">${esc(title || '')}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <div id="${containerId}-view"></div>
        <button type="button" class="btn btn-primary" id="${containerId}-add"><i data-lucide="plus"></i> 新增</button>
      </div>
    </div>
    <div id="${containerId}-content"></div>`;

  const vt = initViewToggle({
    containerId: `${containerId}-view`,
    storageKey: `${entity}-view`,
    defaultView: 'table',
    cardText: '卡片', tableText: '表格',
    onChange: (v) => { view = v; paint(); },
  });
  view = vt?.getView() || 'table';

  document.getElementById(`${containerId}-add`)?.addEventListener('click', () => actions?.onAdd?.());

  function paint() {
    const content = document.getElementById(`${containerId}-content`);
    if (!content) return;
    _table?.destroy?.(); _cards?.destroy?.();
    _table = null; _cards = null;

    const opts = { container: content, rows, columns, resolvers, actions: (row) => actions?.row ? actions.row(row) : [] };
    if (view === 'card') _cards = renderCards(opts);
    else _table = renderTable(opts);
  }

  if (listenPath) {
    unsub = listen(listenPath, (snap) => {
      const v = snap.val() || {};
      rows = Object.entries(v).map(([id, x]) => ({ id, ...x }));
      if (typeof sortFn === 'function') rows.sort(sortFn);
      paint();
    });
  }

  if (window.lucide) window.lucide.createIcons();

  return { refresh: paint, getRows: () => rows, destroy: () => { unsub?.(); _table?.destroy?.(); _cards?.destroy?.(); root.innerHTML = ''; } };
}