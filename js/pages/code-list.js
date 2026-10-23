// ============================================
// code-list.js — 編號對照清單
// ============================================

import { AppState } from '../app-core.js';
import { render, esc } from '../app-ui.js';
import { renderTable } from '../components/data-table.js';
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { openEntityModal } from '../entity/entity-modal.js';
import { removeEntity } from '../entity/entity-helpers.js';
import { toast } from '../app-ui.js';

const ENTITY_TYPES = [
  { key: 'member', label: '成員' }, { key: 'bank', label: '銀行' },
  { key: 'category', label: '類別' }, { key: 'item', label: '項目' },
  { key: 'payment', label: '支付' }, { key: 'company', label: '公司' },
  { key: 'policy', label: '保單' }, { key: 'fund', label: '基金' },
  { key: 'bankAccount', label: '帳號' }
];

export function mount(container) {
  const db = getDatabase();
  const fid = AppState.currentFamilyId;
  const unsubs = [];
  let state = {};
  let filterType = 'all';

  const paint = () => {
    const rows = [];
    ENTITY_TYPES.forEach(t => {
      if (filterType !== 'all' && filterType !== t.key) return;
      Object.entries(state[t.key] || {}).forEach(([id, x]) => {
        rows.push({ entity: t.key, entityLabel: t.label, id, code: x.code || '', name: x.name || '' });
      });
    });
    rows.sort((a, b) => (a.code || 'zzz').localeCompare(b.code || 'zzz'));

    const cols = [
      { id: 'code', label: '編號', width: 160 },
      { id: 'entityLabel', label: '類型', width: 120 },
      { id: 'name', label: '名稱' }
    ];
    const resolvers = {
      code: v => `<span class="mono text-cyan">${v || '—'}</span>`,
      entityLabel: v => `<span class="badge badge-info">${v}</span>`
    };

    const html = `
      <div class="page-header" style="margin-bottom:20px;">
        <h1 class="page-title" style="color:var(--primary); font-family:var(--font-mono);">[ 編號對照清單 ]</h1>
      </div>
      <div style="margin-bottom:20px;">
        <select class="select" id="filter-type" style="width:200px;">
          <option value="all">全部類型</option>
          ${ENTITY_TYPES.map(t => `<option value="${t.key}" ${filterType===t.key?'selected':''}>${t.label}</option>`).join('')}
        </select>
      </div>
      <div id="cl-table"></div>
    `;
    render(container, html);
    
    document.getElementById('filter-type').addEventListener('change', e => { filterType = e.target.value; paint(); });
    
    renderTable('cl-table', rows, cols, resolvers, () => true);
    
    // 綁定表格編輯/刪除
    document.getElementById('cl-table').addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const row = rows[Number(btn.dataset.idx)];
      if (btn.dataset.action === 'edit') {
        await openEntityModal(row.entity, 'edit', row.id, Object.entries(state[row.entity] || {}).map(([id, x]) => ({ id, ...x })));
      } else if (btn.dataset.action === 'delete') {
        if (!confirm(`確定刪除 ${row.name}？`)) return;
        try { await removeEntity(row.entity, row.id); toast('✅ 已刪除'); } catch (err) { toast(err.message, 'error'); }
      }
    });
  };

  const paths = {
    member: 'members', bank: 'banks', category: 'expense_categories', item: 'expense_items',
    payment: 'payment_methods', company: 'insurance_companies', policy: 'insurance_policies',
    fund: 'funds', bankAccount: 'bank_accounts'
  };
  Object.entries(paths).forEach(([key, p]) => {
    unsubs.push(onValue(ref(db, `families/${fid}/${p}`), (snap) => {
      state[key] = snap.val() || {};
      paint();
    }));
  });

  paint();
  return () => unsubs.forEach(u => u && u());
}