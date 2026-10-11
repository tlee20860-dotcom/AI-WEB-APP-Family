// entity-funds-allocation.js — 保單關聯基金編輯（v103.0.22）
// v103.0.22（B25-2）：
//   ✅ R1 修正：選擇基金 Modal 走 ui/modal（openModal + closeModal）
//   ✅ 支援 defaultYear / defaultMonth（從保單起始年月）
//   ✅ 總和更新改用 data-role 穩定選擇器
//   ✅ 所有 button 加 type="button"
// ============================================
import { esc } from '../lib/dom.js';
import { showToast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { getFundsOnce } from '../core/db.js';

const SELECT_MODAL_ID = 'efa-select-fund-modal';

export function renderFundsAllocationField(root, initialAlloc, policyType, opts = {}) {
  const defaultYear = opts.defaultYear || new Date().getFullYear();
  const defaultMonth = opts.defaultMonth || '01';

  let alloc = Array.isArray(initialAlloc) ? initialAlloc.map((a) => ({ ...a })) : [];
  let fundsList = [];

  const loadFunds = async () => {
    try { fundsList = await getFundsOnce(); } catch (e) { fundsList = []; }
    paint();
  };

  const paint = () => {
    const isFundIns = policyType === 'fund_insurance';
    const total = alloc.reduce((s, a) => s + (Number(a.pct) || 0), 0);
    const totalClass = Math.abs(total - 100) < 0.01 ? 'text-emerald' : 'text-orange';

    root.innerHTML = `
      <div class="glass-card" style="padding:12px;background:rgba(8,11,17,0.4);">
        ${!isFundIns ? '<div class="banner mb-12" style="margin:0;">ℹ️ 只有「基金保險」才需設定關聯基金</div>' : ''}
        <div id="efa-list" style="margin-bottom:12px;"></div>
        <div class="flex flex-between items-center" style="margin-bottom:8px;">
          <span style="font-size:12px;color:var(--text-muted);">比例總和：<span data-role="total" class="${totalClass}" style="font-weight:700;">${total}%</span></span>
          <button type="button" class="btn btn-sm btn-ghost" data-action="add-alloc">
            <i data-lucide="plus" style="width:14px;height:14px;"></i> 新增基金
          </button>
        </div>
      </div>
    `;

    const listEl = root.querySelector('#efa-list');
    if (alloc.length === 0) {
      listEl.innerHTML = '<div class="text-muted" style="font-size:12px;text-align:center;padding:12px;">尚未設定</div>';
    } else {
      listEl.innerHTML = alloc.map((a, i) => {
        const fund = fundsList.find((f) => f.id === a.fundId);
        const fundName = fund ? fund.name : a.fundId;
        return `
          <div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid rgba(255,255,255,0.04);" data-index="${i}">
            <span style="flex:1;font-size:13px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(fundName)}</span>
            <input type="number" data-role="pct" value="${a.pct || 0}" min="0" max="100" step="1"
                   style="width:70px;padding:4px 8px;font-size:12px;background:rgba(8,11,17,0.6);border:1px solid var(--glass-border);border-radius:var(--radius-sm);color:var(--text-primary);text-align:right;">
            <span style="font-size:11px;color:var(--text-muted);">%</span>
            <button type="button" class="btn btn-sm btn-danger" data-action="del-alloc" style="padding:2px 6px;">
              <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
            </button>
          </div>
        `;
      }).join('');
    }

    if (window.lucide) window.lucide.createIcons();
  };

  root.addEventListener('input', (e) => {
    const pctInput = e.target.closest('input[data-role="pct"]');
    if (!pctInput) return;
    const row = pctInput.closest('[data-index]');
    const i = Number(row.dataset.index);
    alloc[i].pct = Number(pctInput.value) || 0;
    const total = alloc.reduce((s, a) => s + (Number(a.pct) || 0), 0);
    const totalEl = root.querySelector('[data-role="total"]');
    if (totalEl) {
      totalEl.textContent = `${total}%`;
      totalEl.className = Math.abs(total - 100) < 0.01 ? 'text-emerald' : 'text-orange';
      totalEl.style.fontWeight = '700';
    }
  });

  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'add-alloc') {
      await _openSelectFundModal();
    } else if (btn.dataset.action === 'del-alloc') {
      const row = btn.closest('[data-index]');
      const i = Number(row.dataset.index);
      alloc.splice(i, 1);
      paint();
    }
  });

  const _openSelectFundModal = async () => {
    if (fundsList.length === 0) {
      showToast('尚無基金，請先至基金頁新增', 'warning', 4000);
      return;
    }
    const usedIds = new Set(alloc.map((a) => a.fundId));
    const available = fundsList.filter((f) => !usedIds.has(f.id));
    if (available.length === 0) {
      showToast('所有基金都已加入', 'info');
      return;
    }

    document.getElementById(SELECT_MODAL_ID)?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = SELECT_MODAL_ID;
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <h2 class="modal-title">選擇基金</h2>
        <div style="max-height:50vh;overflow-y:auto;">
          ${available.map((f) => `
            <button type="button" class="btn btn-ghost" data-fund-id="${esc(f.id)}"
                    style="width:100%;justify-content:flex-start;margin-bottom:6px;">
              ${esc(f.name)}
            </button>
          `).join('')}
        </div>
        <div class="modal-actions" style="margin-top:16px;">
          <button type="button" class="btn btn-ghost" data-action="close">取消</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('button[data-action="close"]')) {
        closeModal(SELECT_MODAL_ID);
        overlay.remove();
        return;
      }
      const fundBtn = e.target.closest('button[data-fund-id]');
      if (fundBtn) {
        alloc.push({
          fundId: fundBtn.dataset.fundId,
          pct: 0,
          fromYear: defaultYear,
          fromMonth: defaultMonth,
        });
        closeModal(SELECT_MODAL_ID);
        overlay.remove();
        paint();
      }
    });

    openModal(SELECT_MODAL_ID);
    if (window.lucide) window.lucide.createIcons();
  };

  paint();
  loadFunds();

  return () => alloc.map((a) => ({
    fundId: a.fundId,
    pct: Number(a.pct) || 0,
    fromYear: a.fromYear || defaultYear,
    fromMonth: a.fromMonth || defaultMonth,
  }));
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/entity/entity-funds-allocation.js
   Version: v103.0.22
   Batch: B25-2
   ═══════════════════════════════════════════ */