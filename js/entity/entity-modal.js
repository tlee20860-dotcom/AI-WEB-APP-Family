// ============================================
// entity-modal.js — 實體新增/編輯彈窗
// ============================================

import { openModal, closeModal, buildFormHtml, getFormData, toast, esc } from '../app-ui.js';
import { getEntityDef } from './entity-defs.js';
import { createEntity, updateEntity } from './entity-helpers.js';
import { getList } from '../app-data.js';

export async function openEntityModal(type, mode, id = null, allRows = [], onSuccess = null) {
  const def = getEntityDef(type);
  if (!def) return;

  // 準備選項
  const fields = def.fields.map(f => {
    const field = { ...f };
    if (f.optionsSource) {
      const list = getList(f.optionsSource === 'categories' ? 'expense_categories' : f.optionsSource);
      field.options = list.map(x => ({ value: x.id, label: x.name }));
    }
    return field;
  });

  let data = {};
  if (mode === 'edit' && id) {
    data = allRows.find(x => x.id === id) || {};
  }

  const html = buildFormHtml(fields, data);
  
  const ok = await openModal(`${mode === 'edit' ? '編輯' : '新增'} ${def.label}`, html);
  if (!ok) return;

  const formData = getFormData(fields);
  try {
    if (mode === 'edit') {
      await updateEntity(type, id, formData);
      toast('✅ 已更新');
    } else {
      await createEntity(type, formData, allRows);
      toast('✅ 已新增');
    }
    closeModal();
    if (onSuccess) onSuccess();
  } catch (err) {
    toast('操作失敗：' + err.message, 'error');
  }
}