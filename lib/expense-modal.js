// ============================================
// expense-modal.js — 支出編輯 Modal
// 位置：lib/expense-modal.js
// 說明：處理「新增支出」與「編輯支出」的完整表單。
//       包含類別與項目聯動、成員/類別/支付方式的「+」快速新增。
// ============================================

import { createForm } from '../ui/form.js';
import { openModal, closeModal } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { getList } from '../config/entity-registry.js';
import { addExpense, updateExpense, removeExpense } from '../db/write.js';
import { AppState } from '../config/state.js';
import { RESERVED_IDS } from '../config/constants.js';
import { todayISO } from '../ui/format.js';

const MODAL_ID = 'app-expense-modal';

/**
 * 開啟支出 Modal
 * @param {Object} opts
 * @param {Object} [opts.row] - 若為編輯模式，傳入現有資料
 * @param {Function} [opts.onSuccess] - 成功後的回呼
 */
export async function openExpenseModal(opts = {}) {
  try {
    const { row = null, onSuccess } = opts;
    const isEdit = !!row;

    const existingModal = document.getElementById(MODAL_ID);
    if (existingModal) existingModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = MODAL_ID;
    overlay.innerHTML = `
      <div class="modal" style="max-width:560px; max-height:90vh; overflow-y:auto;">
        <h2 class="modal-title" style="font-size:18px; font-weight:700; margin-bottom:16px; color:var(--text-primary); border-left:4px solid var(--primary); padding-left:12px;">
          ${isEdit ? '編輯支出' : '新增支出'}
        </h2>
        <div id="${MODAL_ID}-form-root"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { closeModal(MODAL_ID); overlay.remove(); }
    });

    // 準備選項資料（加入防呆，確保拿到的是陣列）
    const members = getList('members') || [];
    const memberOpts = members.map(m => ({ value: m.id, label: m.name }));
    memberOpts.push({ value: RESERVED_IDS.SHARED_MEMBER, label: '🏠 家庭共用' });

    const categories = getList('categories') || [];
    const catOpts = categories.map(c => ({ value: c.id, label: c.name }));

    const payments = getList('payments') || [];
    const payOpts = payments.map(p => ({ value: p.id, label: p.name }));

    const banks = getList('bank_accounts') || [];
    const bankOpts = banks.map(b => ({ value: b.id, label: b.name }));

    // 初始項目選項
    const items = getList('items') || [];
    let initialItemOpts = [];
    if (isEdit && row.categoryId) {
      initialItemOpts = items.filter(i => i.categoryId === row.categoryId).map(i => ({ value: i.id, label: i.name }));
    }

    // 表單欄位定義
    const fields = [
      { 
        id: 'memberId', 
        label: '成員', 
        type: 'select', 
        required: true, 
        options: memberOpts,
        plusEntity: 'member',
        onPlusReload: (result, formEl) => _reloadSelect(formEl, 'memberId', 'members', '請選擇成員', result)
      },
      { id: 'name', label: '項目名稱', type: 'text', required: true, placeholder: '例如：買書、看醫生' },
      { id: 'amount', label: '金額 (HK$)', type: 'number', required: true, min: 0, step: 1 },
      { id: 'date', label: '日期 (YYYY-MM-DD)', type: 'date', required: false },
      { 
        id: 'categoryId', 
        label: '類別', 
        type: 'select', 
        required: false, 
        options: catOpts,
        plusEntity: 'category',
        onPlusReload: (result, formEl) => _reloadSelect(formEl, 'categoryId', 'categories', '請選擇類別', result)
      },
      { 
        id: 'itemId', 
        label: '項目', 
        type: 'select', 
        required: false, 
        options: initialItemOpts
      },
      { 
        id: 'paymentMethodId', 
        label: '支付方式', 
        type: 'select', 
        required: false, 
        options: payOpts,
        plusEntity: 'payment',
        onPlusReload: (result, formEl) => _reloadSelect(formEl, 'paymentMethodId', 'payments', '請選擇支付方式', result)
      },
      { 
        id: 'bankId', 
        label: '出帳銀行 (可選)', 
        type: 'select', 
        required: false, 
        options: bankOpts 
      }
    ];

    // 預設值
    const initialData = isEdit ? {
      memberId: row.memberId || '',
      name: row.name || '',
      amount: row.amount || 0,
      date: row.date || '',
      categoryId: row.categoryId || '',
      itemId: row.itemId || '',
      paymentMethodId: row.paymentMethodId || '',
      bankId: row.bankId || '',
    } : {
      memberId: AppState.getCurrentMemberId() || (memberOpts.length > 0 ? memberOpts[0].value : ''),
      amount: 0,
      date: todayISO(),
    };

    createForm({
      container: `${MODAL_ID}-form-root`,
      fields,
      initialData,
      submitText: isEdit ? '儲存' : '新增',
      onCancel: () => { closeModal(MODAL_ID); overlay.remove(); },
      onSubmit: async (data) => {
        try {
          const payload = {
            ...data,
            amount: Math.round(Number(data.amount) || 0), // 金額防呆
          };

          const { year, month } = AppState.getYearMonth();
          const y = year || String(new Date().getFullYear());
          const m = month === 'all' ? String(new Date().getMonth() + 1).padStart(2, '0') : month;

          if (isEdit) {
            if (payload.memberId !== row.memberId) {
              await removeExpense(row.year, row.month, row.memberId, row.id);
              await addExpense(row.year, row.month, payload.memberId, payload);
            } else {
              await updateExpense(row.year, row.month, row.memberId, row.id, payload);
            }
            showToast('✅ 已更新支出', 'success');
          } else {
            await addExpense(y, m, payload.memberId, payload);
            showToast('✅ 已新增支出', 'success');
          }

          closeModal(MODAL_ID);
          overlay.remove();
          if (typeof onSuccess === 'function') onSuccess();
        } catch (err) {
          console.error('[expense-modal] 儲存失敗：', err);
          showToast('儲存失敗：' + err.message, 'error');
        }
      }
    });

    // 綁定類別與項目的聯動邏輯
    const catEl = document.getElementById('field-categoryId');
    const itemEl = document.getElementById('field-itemId');
    if (catEl && itemEl) {
      catEl.addEventListener('change', () => {
        const catId = catEl.value;
        const currentItems = getList('items') || [];
        const filtered = catId ? currentItems.filter(i => i.categoryId === catId) : [];
        
        itemEl.innerHTML = '<option value="">— 請選擇項目 —</option>' +
          filtered.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
        
        itemEl.value = '';
      });
    }

    openModal(MODAL_ID);
    if (window.lucide) window.lucide.createIcons();
    
  } catch (err) {
    console.error('[expense-modal] 初始化失敗：', err);
    // 將錯誤往外拋，讓呼叫端 (input-center.js) 的 try-catch 捕捉並 alert
    throw err;
  }
}

/* ============================================
   內部輔助：重新載入下拉選單（供 + 號使用）
   ============================================ */
function _reloadSelect(formEl, fieldId, listType, defaultLabel, result) {
  const el = formEl.querySelector(`#field-${fieldId}`);
  if (!el) return;

  // 從 registry 拿取當下快取
  const list = getList(listType) || [];
  const opts = list.map(x => ({ value: x.id, label: x.name }));
  
  if (fieldId === 'memberId') {
    opts.push({ value: RESERVED_IDS.SHARED_MEMBER, label: '🏠 家庭共用' });
  }

  // 將剛新增的 result 補進去，避免 Firebase 非同步延遲導致看不到
  if (result && result.id && !opts.some(o => o.value === result.id)) {
    opts.push({ value: result.id, label: result.name });
  }

  const curVal = el.value;
  let html = `<option value="">— ${defaultLabel} —</option>`;
  html += opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  
  el.innerHTML = html;
  
  // 如果原本沒選，或有新加入的，直接選中新加入的
  if (result && result.id) {
    el.value = result.id;
  } else if (!curVal && opts.length > 0) {
    el.value = opts[opts.length - 1].value;
  } else {
    el.value = curVal;
  }
}

/* ═══ EOF ═══
F: lib/expense-modal.js
V: 1792901750
W: webapp-20261025-001#25
═══ */