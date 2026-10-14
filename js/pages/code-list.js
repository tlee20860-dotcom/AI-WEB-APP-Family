// ============================================
// code-list.js — 編號對照清單頁（v1.0.1）
// 位置：js/pages/code-list.js
// ============================================
// v1.0.1（B34-4）：
//   ✅ 篩選器改 2 欄並排（外層 grid 2 列 + 內層 grid）（Q186 A / Q187 A）
// v1.0.0（B34-4）：初版
// ============================================

import { listenEntity } from '../entity/entity-helpers.js';
import { openEntityEditModal } from '../entity/entity-modal.js';
import { removeEntity } from '../entity/entity-helpers.js';
import { openConfirm } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { esc } from '../lib/dom.js';
import { AppState } from '../core/state.js';
import { ENTITY_KEYS } from '../config/constants.js';

/* ============================================
   涵蓋的實體類型
   ============================================ */
const ENTITY_TYPES = [
  { key: ENTITY_KEYS.MEMBER,   label: '成員',     prefix: 'MEM' },
  { key: ENTITY_KEYS.BANK,     label: '銀行',     prefix: 'PAY-BANK' },
  { key: ENTITY_KEYS.CATEGORY, label: '支出類別', prefix: 'CAT' },
  { key: ENTITY_KEYS.ITEM,     label: '支出項目', prefix: 'ITEM' },
  { key: ENTITY_KEYS.PAYMENT,  label: '支付方式', prefix: 'PAY' },
  { key: 'company',            label: '保險公司', prefix: 'COMP' },
  { key: ENTITY_KEYS.POLICY,   label: '保單',     prefix: 'POL' },
  { key: ENTITY_KEYS.FUND,     label: '基金',     prefix: 'FUND' },
  { key: 'bankAccount',        label: '銀行帳號', prefix: 'PAY-BANK' },
];

export default {
  title: '編號對照清單',
  data: {},
  state: {
    filterType: 'all',
    filterCodeState: 'all',
  },
  derived: {},
  blocks: [],

  customMount: (ctx) => {
    const allData = {};
    const unsubs = [];

    ENTITY_TYPES.forEach((t) => {
      const unsub = listenEntity(
        t.key,
        (list) => {
          allData[t.key] = list || [];
          _paint(ctx, allData);
        },
        (err) => console.warn(`[code-list] ${t.key} 訂閱失敗：`, err)
      );
      unsubs.push(unsub);
    });

    _renderSkeleton(ctx);
    _bindFilter(ctx);
    _bindListClick(ctx, allData);

    return {
      destroy: () => {
        unsubs.forEach((u) => { try { u && u(); } catch (e) {} });
      },
    };
  },
};

/* ============================================
   渲染骨架（v1.0.1：2 欄並排）
   ============================================ */
function _renderSkeleton(ctx) {
  const filterRoot = document.getElementById('cl-filter-root');
  if (filterRoot) {
    filterRoot.innerHTML = `
      <div class="glass-card" style="padding:12px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div style="display:grid; grid-template-columns:72px 1fr; gap:8px; align-items:center;">
            <label style="font-size:12px; color:var(--text-muted); text-align:right;">類型：</label>
            <select class="select" id="cl-filter-type">
              <option value="all">全部</option>
              ${ENTITY_TYPES.map((t) => `<option value="${esc(t.key)}">${esc(t.label)}</option>`).join('')}
            </select>
          </div>
          <div style="display:grid; grid-template-columns:72px 1fr; gap:8px; align-items:center;">
            <label style="font-size:12px; color:var(--text-muted); text-align:right;">編號狀態：</label>
            <select class="select" id="cl-filter-code">
              <option value="all">全部</option>
              <option value="with-code">有編號</option>
              <option value="without-code">無編號</option>
            </select>
          </div>
        </div>
        ${AppState.isSuperAdmin ? `
          <div style="display:flex; justify-content:flex-end; margin-top:12px;">
            <button type="button" class="btn btn-sm btn-ghost" id="cl-permission-btn">
              <i data-lucide="shield" style="width:14px;height:14px;"></i> 權限設定
            </button>
          </div>
        ` : ''}
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

/* ============================================
   綁定篩選器
   ============================================ */
function _bindFilter(ctx) {
  const typeSel = document.getElementById('cl-filter-type');
  const codeSel = document.getElementById('cl-filter-code');

  if (typeSel) {
    typeSel.addEventListener('change', () => {
      ctx.state.filterType = typeSel.value;
      _paint(ctx, ctx._allData);
    });
  }
  if (codeSel) {
    codeSel.addEventListener('change', () => {
      ctx.state.filterCodeState = codeSel.value;
      _paint(ctx, ctx._allData);
    });
  }
}

/* ============================================
   綁定列表點擊
   ============================================ */
function _bindListClick(ctx, allData) {
  const listRoot = document.getElementById('cl-list-root');
  if (!listRoot) return;

  listRoot.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, entity: entityType, id } = btn.dataset;
    if (!entityType || !id) return;

    if (action === 'edit') {
      const list = allData[entityType] || [];
      await openEntityEditModal(entityType, id, {
        allRows: list,
        onSuccess: () => showToast('✅ 已更新', 'success'),
      });
      return;
    }

    if (action === 'delete') {
      const list = allData[entityType] || [];
      const row = list.find((r) => r.id === id);
      const displayName = row?.name || id;
      const ok = await openConfirm(
        `⚠️ 確定要刪除「${displayName}」嗎？\n\n此操作無法復原。`,
        { title: '刪除', okText: '刪除', okClass: 'btn-danger' }
      );
      if (!ok) return;
      try {
        await removeEntity(entityType, id);
        showToast('✅ 已刪除', 'success');
      } catch (err) {
        showToast('刪除失敗：' + err.message, 'error');
      }
      return;
    }
  });
}

/* ============================================
   渲染主列表
   ============================================ */
function _paint(ctx, allData) {
  ctx._allData = allData;
  const listRoot = document.getElementById('cl-list-root');
  const emptyRoot = document.getElementById('cl-empty-state');
  if (!listRoot) return;

  const filterType = ctx.state.filterType;
  const filterCode = ctx.state.filterCodeState;

  const flatRows = [];
  ENTITY_TYPES.forEach((t) => {
    if (filterType !== 'all' && filterType !== t.key) return;
    const list = allData[t.key] || [];
    list.forEach((row) => {
      const hasCode = !!row.code;
      if (filterCode === 'with-code' && !hasCode) return;
      if (filterCode === 'without-code' && hasCode) return;
      flatRows.push({
        entityType: t.key,
        entityLabel: t.label,
        id: row.id,
        code: row.code || '',
        name: row.name || '（未命名）',
      });
    });
  });

  flatRows.sort((a, b) => {
    if (a.code && b.code) return a.code.localeCompare(b.code);
    if (a.code) return -1;
    if (b.code) return 1;
    return a.name.localeCompare(b.name, 'zh-HK');
  });

  if (flatRows.length === 0) {
    listRoot.innerHTML = '';
    if (emptyRoot) {
      emptyRoot.style.display = 'block';
      emptyRoot.innerHTML = '<div class="glass-card"><div class="empty-state">尚無資料</div></div>';
    }
    return;
  }
  if (emptyRoot) emptyRoot.style.display = 'none';

  listRoot.innerHTML = `
    <div class="glass-card" style="padding:0;">
      <div class="data-table-scroll-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:180px;">編號</th>
              <th style="width:120px;">類型</th>
              <th>名稱</th>
              <th style="width:180px;">操作</th>
            </tr>
          </thead>
          <tbody>
            ${flatRows.map((r) => `
              <tr>
                <td><span class="mono" style="font-size:12px; color:${r.code ? 'var(--neon-cyan)' : 'var(--text-muted)'};">${esc(r.code || '—')}</span></td>
                <td><span class="badge badge-info">${esc(r.entityLabel)}</span></td>
                <td>${esc(r.name)}</td>
                <td>
                  <button type="button" class="btn btn-sm btn-ghost" data-action="edit" data-entity="${esc(r.entityType)}" data-id="${esc(r.id)}">
                    <i data-lucide="pencil" style="width:14px;height:14px;"></i> 編輯
                  </button>
                  <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-entity="${esc(r.entityType)}" data-id="${esc(r.id)}">
                    <i data-lucide="trash-2" style="width:14px;height:14px;"></i> 刪除
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/pages/code-list.js
   Version: 1791902680
   Batch: B34-4
   Writer: A20261013-004#121
   ═══════════════════════════════════════════ */