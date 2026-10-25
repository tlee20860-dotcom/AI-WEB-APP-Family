// ============================================
// handlers.js — 後端處理函式統一出口（V2 重構版）
// 位置：api/handlers.js
// 說明：將業務邏輯拆分到不同模組，這裡負責統一匯出，
//       讓 [[path]].js 只需要認這一個檔案。
// ============================================

export * from './handlers-core.js';
export * from './handlers-report.js';
export * from './handlers-admin.js';

/* ═══ EOF ═══
F: api/handlers.js
V: 1792900360
W: ai-system-20261024-012#31
═══ EOF ═══ */