// ============================================
// dropdown-plus.js — 下拉旁「+ 號」按鈕（v1.0.0）
// 位置：js/ui/dropdown-plus.js
// ============================================
// 依 D-029（B 層規則 1~3）：
//   ✅ 簡單實體 → openPrompt（只輸名稱）
//   ✅ 複雜實體 → openEntityModal
//   ✅ 新增成功 → 回傳 { id, code } → 呼叫端自動選中
// ============================================

import { openPrompt } from './modal.js';
import { openEntityAddModal } from '../entity/entity-modal.js';
import { createEntity } from '../entity/entity-helpers.js';
import { getEntityDef } from '../entity/entity-definitions.js';
import { showToast } from './toast.js';

/* ============================================
   1. 簡單 / 複雜實體分類（D-029 規則 1~2）
   ============================================
   簡單：只有 1~2 個欄位（name + order / role）
   複雜：需更多欄位或特殊流程
   ============================================ */
const SIMPLE_ENTITIES = [
  'member',
  'bank',
  'category',
  'payment',
  'company',
];

export function isSimpleEntity(entityType) {
  return SIMPLE_ENTITIES.includes(entityType);
}

/* ============================================
   2. 主入口：依 entityType 觸發 prompt 或 modal
   ============================================
   回傳：{ id, code } | null
   ============================================ */
export async function handlePlusClick(entityType, context = {}) {
  if (isSimpleEntity(entityType)) {
    return await _promptCreate(entityType, context);
  }
  return await _modalCreate(entityType, context);
}

/* ============================================
   3. 簡單實體：openPrompt
   ============================================ */
async function _promptCreate(entityType, context) {
  const def = getEntityDef(entityType);
  const label = def?.label || '項目';

  const name = await openPrompt({
    title: `新增${label}`,
    label: `${label}名稱`,
    placeholder: `請輸入${label}名稱`,
    maxlength: 30,
  });

  if (!name) return null;

  try {
    /* createEntity 內部會自動生成 code（依 codePrefix） */
    const result = await createEntity(entityType, { name, ...context }, []);
    showToast(`✅ 已新增${label}`, 'success');
    return result; /* { id, code } */
  } catch (err) {
    showToast('新增失敗：' + (err.message || err), 'error');
    return null;
  }
}

/* ============================================
   4. 複雜實體：openEntityModal
   ============================================ */
function _modalCreate(entityType, context) {
  return new Promise((resolve) => {
    openEntityAddModal(entityType, {
      initialData: Object.keys(context).length > 0 ? context : null,
      allRows: [],
      onSuccess: (result) => resolve(result), /* { id, code, data } */
      onCancel: () => resolve(null),
    });
  });
}

/* ============================================
   5. 為 select 欄位掛上 + 號按鈕
   ============================================
   呼叫端（form-builder）傳入：
   - selectEl: <select> 元素
   - entityType: 'member' 等
   - onCreated: (result) => Promise 或 void（成功後自動選中）
   ============================================ */
export function attachPlusButton(selectEl, entityType, onCreated) {
  if (!selectEl || !entityType) return null;

  const parent = selectEl.parentElement;
  if (!parent) return null;

  /* 防止重複插入 */
  if (parent.querySelector(`[data-plus-for="${entityType}"]`)) return null;

  /* 包成 flex 容器（select + 按鈕並排） */
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.gap = '6px';
  wrapper.style.alignItems = 'center';
  parent.insertBefore(wrapper, selectEl);
  wrapper.appendChild(selectEl);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-sm btn-ghost';
  btn.setAttribute('data-plus-for', entityType);
  btn.title = `新增${getEntityDef(entityType)?.label || ''}`;
  btn.style.flexShrink = '0';
  btn.style.padding = '6px 10px';
  btn.innerHTML = '<i data-lucide="plus" style="width:14px;height:14px;"></i>';

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.disabled) return;
    btn.disabled = true;

    try {
      const result = await handlePlusClick(entityType);
      if (result && typeof onCreated === 'function') {
        await onCreated(result);
      }
    } catch (err) {
      console.error('[dropdown-plus] + 號失敗：', err);
      showToast('操作失敗：' + (err.message || err), 'error');
    } finally {
      btn.disabled = false;
    }
  });

  wrapper.appendChild(btn);
  if (window.lucide) window.lucide.createIcons();

  return btn;
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/ui/dropdown-plus.js
   Version: 1791901780
   Batch: B34-4
   Writer: A20261013-004#100
   ═══════════════════════════════════════════ */