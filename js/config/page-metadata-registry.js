// ============================================
// page-metadata-registry.js — 頁面 metadata 預設（v103.0.34）
// 位置：js/config/page-metadata-registry.js
// ============================================
// v103.0.34（B29-5a）：
//   ✅ 每頁預設 title / subtitleStatic
//   ✅ getPageKeyFromUrl（從 URL 取 pageKey）
//   ✅ getDefaultMetadata（依 pageKey 取預設）
// ============================================

/* ============================================
   頁面預設 metadata
   - pageKey = URL 檔名（不含 .html）
   - title：頁面標題
   - subtitleStatic：副標題靜態段（使用者可編輯）
   ============================================ */
export const PAGE_METADATA = {
  index: {
    title: '總覽儀表板',
    subtitleStatic: '',
  },
  'input-center': {
    title: '綜合輸入中心',
    subtitleStatic: '所有交易資料的統一輸入入口',
  },
  database: {
    title: '基礎資料庫',
    subtitleStatic: '管理基礎資料與選項',
  },
  insurance: {
    title: '保險清單表',
    subtitleStatic: '',
  },
  portfolio: {
    title: '基金投資表',
    subtitleStatic: '基金持倉與最新現值',
  },
  settlements: {
    title: '結算清單',
    subtitleStatic: '',
  },
  'finance-overview': {
    title: '銀行交易',
    subtitleStatic: '',
  },
  'annual-report': {
    title: '年度報表',
    subtitleStatic: '全年總合與明細',
  },
  'member-report': {
    title: '成員與家庭收入與支出明細',
    subtitleStatic: '',
  },
  settings: {
    title: '系統設定',
    subtitleStatic: '平台設定與個人化',
  },
};

/* ============================================
   對外 API
   ============================================ */

/**
 * 從 URL 取得 pageKey（不含 .html）
 * @returns {string}
 */
export function getPageKeyFromUrl() {
  try {
    const path = location.pathname.split('/').pop() || 'index.html';
    const key = path.replace(/\.html$/, '');
    return key || 'index';
  } catch (e) {
    return 'index';
  }
}

/**
 * 取得某頁的預設 metadata
 * @param {string} pageKey
 * @returns {{ title: string, subtitleStatic: string }}
 */
export function getDefaultMetadata(pageKey) {
  return PAGE_METADATA[pageKey] || { title: '', subtitleStatic: '' };
}

/**
 * 列出所有可編輯頁面（供 settings UI 用）
 * @returns {Array<{ key: string, title: string }>}
 */
export function listPages() {
  return Object.entries(PAGE_METADATA).map(([key, meta]) => ({
    key,
    title: meta.title,
  }));
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/config/page-metadata-registry.js
   Version: v103.0.34
   Batch: B29-5a
   ═══════════════════════════════════════════ */