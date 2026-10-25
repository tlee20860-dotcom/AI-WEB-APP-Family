// ============================================
// index.js — 資料層統一入口（V2 重構版）
// 位置：db/index.js
// 說明：將 read.js 與 write.js 的所有方法統一匯出。
//       外部模組只需 import { ... } from '../db/index.js'。
// ============================================

// 匯出讀取與監聽
export * from './read.js';

// 匯出寫入與更新
export * from './write.js';

// 匯出基礎路徑工具
export { getFamilyPath } from './read.js';

/* ═══ EOF ═══
F: db/index.js
V: 1792900240
W: ai-system-20261024-012#19
═══ EOF ═══ */