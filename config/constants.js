// ============================================
// constants.js — 全站核心常數（V2 重構版）
// 位置：config/constants.js
// 說明：只保留全站共用常數、路由與側邊欄設定。
//       狀態定義移至 status.js；預設資料移至 app-config.js。
// ============================================

/* ============================================
   1. 版本與儲存鍵
   ============================================ */
export const APP_VERSION = 'v2.0.0';
export const SW_VERSION = 'family-fin-v2-v1';

export const STORAGE_KEYS = {
  YEAR: 'v2_ui_year',
  MONTH: 'v2_ui_month',
  THEME: 'v2_ui_theme',
  FAMILY_ID: 'v2_family_id',
  FAMILY_NAME: 'v2_family_name',
  VIEW_PREFIX: 'v2_ui_view_',
  SIDEBAR_STATE: 'v2_ui_sidebar',
};

export const SESSION_KEYS = {
  AUTH_CONTEXT: 'v2_auth_ctx_',
};

/* ============================================
   2. 數值限制
   ============================================ */
export const LIMITS = {
  NAME_MAX_LEN_DESKTOP: 12,
  NAME_MAX_LEN_MOBILE: 6,
  AMOUNT_MAX: 1000000000,
  YEAR_PAST_DEFAULT: 3,
  YEAR_FUTURE_DEFAULT: 5,
  TOAST_DURATION: 2000,
  PAGE_SIZE: 20,
};

/* ============================================
   3. 保留 ID 與角色
   ============================================ */
export const RESERVED_IDS = {
  EXTRA_INCOME: 'extra',
  SHARED_MEMBER: 'shared',
};

export const ROLES = {
  SUPERADMIN: 'superadmin',
  OWNER: 'owner',
  MEMBER: 'member',
};

/* ============================================
   4. SPA 路由（Hash 模式）
   ============================================ */
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  INPUT_CENTER: '/input-center',
  CODE_LIST: '/code-list',
  INSURANCE: '/insurance',
  PORTFOLIO: '/portfolio',
  BANK: '/bank',
  SETTLEMENTS: '/settlements',
  ANNUAL_REPORT: '/annual-report',
  MEMBER_REPORT: '/member-report',
  SETTINGS: '/settings',
  ADMIN: '/admin',
};

/* ============================================
   5. 側邊欄導覽（4 大分類 + 系統）
   ============================================ */
const _ROLES_FAMILY = [ROLES.OWNER, ROLES.MEMBER];
const _ROLES_ALL = [ROLES.OWNER, ROLES.MEMBER, ROLES.SUPERADMIN];
const _ROLES_ADMIN = [ROLES.SUPERADMIN];

export const SIDEBAR_GROUPS = [
  {
    key: 'dashboard',
    label: '總覽',
    icon: 'home',
    roles: _ROLES_FAMILY,
    items: [
      { icon: 'home', label: '總覽儀表板', path: ROUTES.DASHBOARD },
    ],
  },
  {
    key: 'input',
    label: '輸入與清單',
    icon: 'pencil',
    roles: _ROLES_FAMILY,
    items: [
      { icon: 'pencil', label: '綜合輸入中心', path: ROUTES.INPUT_CENTER },
      { icon: 'database', label: '編號對照清單', path: ROUTES.CODE_LIST },
    ],
  },
  {
    key: 'assets',
    label: '資產與保障',
    icon: 'shield',
    roles: _ROLES_FAMILY,
    items: [
      { icon: 'shield', label: '保險清單表', path: ROUTES.INSURANCE },
      { icon: 'line-chart', label: '基金投資表', path: ROUTES.PORTFOLIO },
      { icon: 'landmark', label: '銀行交易', path: ROUTES.BANK },
      { icon: 'clipboard-check', label: '結算清單', path: ROUTES.SETTLEMENTS },
    ],
  },
  {
    key: 'reports',
    label: '報表',
    icon: 'bar-chart-3',
    roles: _ROLES_FAMILY,
    items: [
      { icon: 'bar-chart-3', label: '年度報表', path: ROUTES.ANNUAL_REPORT },
      { icon: 'users', label: '成員收支明細', path: ROUTES.MEMBER_REPORT },
    ],
  },
  {
    key: 'admin',
    label: '平台管理',
    icon: 'server',
    roles: _ROLES_ADMIN,
    items: [
      { icon: 'settings', label: '家庭與帳號', path: ROUTES.ADMIN },
    ],
  },
  {
    key: 'system',
    label: '系統',
    icon: 'settings',
    roles: _ROLES_ALL,
    items: [
      { icon: 'settings', label: '系統設定', path: ROUTES.SETTINGS },
    ],
  },
];

export function getSidebarGroupsByRole(role) {
  if (!role) return SIDEBAR_GROUPS.filter((g) => (g.roles || []).includes(ROLES.OWNER));
  return SIDEBAR_GROUPS.filter((g) => (g.roles || []).includes(role));
}

/* ═══ EOF ═══
F: config/constants.js
V: 1792900150
W: ai-system-20261024-012#10
═══ EOF ═══ */