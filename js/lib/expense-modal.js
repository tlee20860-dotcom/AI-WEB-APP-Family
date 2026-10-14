// ============================================
// expense-modal.js — 支出編輯 Modal（v103.0.23）
// v103.0.23（B34-4）：
//   ✅ m-pay 加 plusEntity: 'payment'
//   ✅ m-cat 加 plusEntity: 'category' + onPlusReload（類別變更後重載項目）
//   ✅ m-member 加 plusEntity: 'member' + onPlusReload（保留 shared）
// v103.0.22（B25-3a）：加 mode 參數（'data' | 'settle'）
// ============================================
import { buildForm } from '../ui/form-builder.js';
import { openModal, closeModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { addExpense, updateExpense, removeExpense } from '../core/db.js';
import { getDynamicOptions } from '../entity/entity-helpers.js';
import { AppState } from '../core/state.js';
import { RESERVED_IDS } from '../config/constants.js';
import { normalize as normalizeStatus, options as statusOptions } from '../config/status-registry.js';
import { esc } from '../lib/dom.js';

const MODAL_ID = 'app-expense-modal';

export async function openExpenseModal(opts = {}) {
  const { row = null, mode = 'data', onSuccess } = opts;
  const isEdit = !!row;
  const isSettle = mode === 'settle';

  document.getElementById(MODAL_ID)?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = MODAL_ID;
  overlay.innerHTML = `<div class="modal" style="max-width:560px;max-height:90vh;overflow-y:auto;"><h2 class="modal-title">${isSettle ? '結算支出' : (isEdit ? '編輯支出' : '新增支出')}</h2><div id="${MODAL_ID}-form-root"></div></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { closeModal(MODAL_ID); overlay.remove(); } });

  const [members, categories, payments, banks] = await Promise.all([
    getDynamicOptions('members'),
    getDynamicOptions('categories'),
    getDynamicOptions('payments'),
    getDynamicOptions('bankAccounts'),
  ]);
  const memberOptions = [...members, { value: RESERVED_IDS.SHARED_MEMBER, label: '🏠 家庭共用' }];
  const { year, month } = AppState.getYearMonth();

  /* ============================================
     🆕 v103.0.23：+ 號重載邏輯（呼叫端自訂）
     ============================================ */
  const reloadMembers = async (result, api) => {
    const fresh = await getDynamicOptions('members');
    const opts = [...fresh, { value: RESERVED_IDS.SHARED_MEMBER, label: '🏠 家庭共用' }];
    api.updateOptions('m-member', opts, { includeEmpty: false });
    if (result.id) api.setFieldValue('m-member', result.id);
  };

  const reloadCategories = async (result, api) => {
    const fresh = await getDynamicOptions('categories');
    api.updateOptions('m-cat', fresh, { includeEmpty: true, emptyText: '— 請選擇類別 —' });
    if (result.id) {
      api.setFieldValue('m-cat', result.id);
      /* 類別變更後清空項目 */
      const itemEl = document.getElementById('m-item');
      if (itemEl) {
        itemEl.innerHTML = '<option value="">— 請先選擇類別 —</option>';
        itemEl.value = '';
      }
    }
  };

  const fields = isSettle ? [
    { type: 'select', id: 'm-status', label: '狀態', required: true, includeEmpty: false, options: statusOptions({ source: 'personal' }) },
    { type: 'select', id: 'm-pay', label: '支付方式', includeEmpty: true, options: payments, plusEntity: 'payment' },
    { type: 'select', id: 'm-bank', label: '銀行（可選）', includeEmpty: true, options: banks },
  ] : [
    { type: 'select', id: 'm-member', label: '成員', required: true, includeEmpty: false, options: memberOptions, plusEntity: 'member', onPlusReload: reloadMembers },
    { type: 'text', id: 'm-name', label: '項目名稱', required: true, maxlength: 60 },
    { type: 'number', id: 'm-amount', label: '金額（HK$）', required: true, min: 0, step: 1 },
    { type: 'text', id: 'm-date', label: '日期（YYYY-MM-DD）' },
    { type: 'select', id: 'm-cat', label: '類別', includeEmpty: true, options: categories, plusEntity: 'category', onPlusReload: reloadCategories },
    { type: 'select', id: 'm-item', label: '項目', includeEmpty: true, options: [] },
  ];

  const initialData = isSettle
    ? {
        'm-status': normalizeStatus(row?.status) || 'pending',
        'm-pay': row?.paymentMethodId || '',
        'm-bank': row?.bankId || '',
      }
    : (isEdit
        ? {
            'm-member': row.memberId || '',
            'm-name': row.name || '',
            'm-amount': row.amount || 0,
            'm-date': row.date || '',
            'm-cat': row.categoryId || '',
            'm-item': row.itemId || '',
          }
        : {
            'm-member': AppState.getCurrentMemberId() || memberOptions[0]?.value || '',
            'm-amount': 0,
            'm-date': new Date().toISOString().slice(0, 10),
          });

  buildForm({
    containerId: `${MODAL_ID}-form-root`,
    fields,
    submitText: isSettle ? '儲存' : (isEdit ? '儲存' : '新增'),
    showCancel: true,
    cancelText: '取消',
    initialData,
    onSubmit: async (data) => {
      try {
        if (isSettle) {
          const payload = {
            status: data['m-status'] || 'pending',
            paymentMethodId: data['m-pay'] || '',
            bankId: data['m-bank'] || '',
          };
          await updateExpense(row.year, row.month, row.memberId, row.id, payload);
          showToast('✅ 已更新結算狀態', 'success');
        } else {
          const memberId = data['m-member'];
          const payload = {
            name: data['m-name'],
            amount: Number(data['m-amount']) || 0,
            date: data['m-date'] || '',
            categoryId: data['m-cat'] || '',
            itemId: data['m-item'] || '',
          };
          if (isEdit) {
            if (memberId !== row.memberId) {
              await removeExpense(row.year, row.month, row.memberId, row.id);
              await addExpense(row.year, row.month, memberId, payload);
            } else {
              await updateExpense(row.year, row.month, memberId, row.id, payload);
            }
            showToast('✅ 已更新支出', 'success');
          } else {
            const y = year || String(new Date().getFullYear());
            const m = month === 'all' ? '01' : month;
            await addExpense(y, m, memberId, payload);
            showToast('✅ 已新增支出', 'success');
          }
        }
        closeModal(MODAL_ID);
        overlay.remove();
        if (typeof onSuccess === 'function') onSuccess();
      } catch (err) { showToast('儲存失敗：' + err.message, 'error'); }
    },
    onCancel: () => { closeModal(MODAL_ID); overlay.remove(); },
  });

  if (!isSettle) {
    const catEl = document.getElementById('m-cat');
    const itemEl = document.getElementById('m-item');
    if (catEl && itemEl) {
      const updateItems = async () => {
        const list = await getDynamicOptions('items', { categoryId: catEl.value });
        itemEl.innerHTML = '<option value="">— 請選擇項目 —</option>' +
          list.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
      };
      catEl.addEventListener('change', updateItems);
      if (isEdit && row.categoryId) {
        await updateItems();
        if (row.itemId) itemEl.value = row.itemId;
      }
    }
  }

  openModal(MODAL_ID);
  if (window.lucide) window.lucide.createIcons();
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/lib/expense-modal.js
   Version: 1791902020
   Batch: B34-4
   Writer: A20261013-004#103
   ═══════════════════════════════════════════ */