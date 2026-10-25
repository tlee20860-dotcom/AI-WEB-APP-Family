// ============================================
// dropdown-plus.js — 下拉旁「+ 號」按鈕邏輯
// 位置：ui/dropdown-plus.js
// 說明：處理簡單實體（只需名稱）的快速新增。
//       複雜實體（如保單、基金）目前不在此處理，交由專屬頁面。
// ============================================

import { openPrompt } from './modal.js';
import { showToast } from './toast.js';
import { api } from '../domain/api-client.js';

/* ============================================
   1. 簡單實體分類
   ============================================ */
const SIMPLE_ENTITIES = {
  member:   { label: '成員', prefix: 'MEM' },
  category: { label: '類別', prefix: 'CAT' },
  payment:  { label: '支付方式', prefix: 'PAY' },
  company:  { label: '保險公司', prefix: 'COMP' },
};

export function isSimpleEntity(entityType) {
  return !!SIMPLE_ENTITIES[entityType];
}

/* ============================================
   2. 主入口
   ============================================ */
export async function handlePlusClick(entityType) {
  const def = SIMPLE_ENTITIES[entityType];
  
  if (!def) {
    showToast(`此功能暫不支援快速新增「${entityType}」，請至對應頁面新增`, 'info');
    return null;
  }

  // 1. 彈出輸入框
  const name = await openPrompt({
    title: `新增${def.label}`,
    label: `${def.label}名稱`,
    placeholder: `請輸入${def.label}名稱`,
    maxlength: 20,
  });

  if (!name) return null; // 使用者取消

  // 2. 生成臨時 code（格式：PREFIX-時間戳）
  const code = `${def.prefix}-${Date.now().toString(36).toUpperCase()}`;

  // 3. 呼叫 API 新增
  try {
    const res = await api.entityCreate({
      entityType,
      action: 'create',
      code,
      name,
      extra: {},
    });

    if (res && res.ok) {
      showToast(`✅ 已新增${def.label}`, 'success');
      return { id: res.id, name, code };
    } else {
      throw new Error(res?.message || '未知錯誤');
    }
  } catch (err) {
    console.error(`[dropdown-plus] 新增 ${entityType} 失敗：`, err);
    showToast(`新增失敗：${err.message}`, 'error');
    return null;
  }
}

/* ═══ EOF ═══
F: ui/dropdown-plus.js
V: 1792901510
W: webapp-20261025-001#13
═══ */