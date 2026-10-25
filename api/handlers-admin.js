// ============================================
// handlers-admin.js — 管理員與平台設定（V2 重構版）
// 位置：api/handlers-admin.js
// 說明：包含家庭管理、平台預設資料（選項、狀態、UI常數）的 CRUD。
// ============================================

import { dbGet, dbPut, dbPush, dbDelete } from './config.js';
import {
  authenticate, errorResponse, successResponse, handleError,
  requireFields, extractToken, verifyFamilyAccess
} from './helpers.js';

/* ============================================
   1. 管理員：家庭列表 (admin-families)
   ============================================ */
export async function handleAdminFamilies(context) {
  try {
    const { request } = context;
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    if (request.method === 'GET') {
      const list = await dbGet('platform/families', token);
      const families = Object.entries(list || {}).map(([uid, data]) => ({ uid, ...data }));
      families.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return successResponse({ families });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { action, uid, name, email } = body || {};

      if (action === 'add') {
        const missing = requireFields(body, ['uid', 'name']);
        if (missing) return errorResponse('MISSING_FIELDS', '缺少 uid 或 name');
        const ok = await dbPut(`platform/families/${uid}`, { name: String(name).trim(), ownerEmail: email ? String(email).trim() : '', createdAt: Date.now() }, token);
        if (!ok) return errorResponse('INTERNAL', 'Firebase 寫入失敗');
        return successResponse();
      }

      if (action === 'remove') {
        const missing = requireFields(body, ['uid']);
        if (missing) return errorResponse('MISSING_FIELDS', '缺少 uid');

        // 清理帳號索引
        const accounts = await dbGet(`platform/families/${uid}/memberAccounts`, token);
        if (accounts) {
          for (const [memberUid, acc] of Object.entries(accounts)) {
            await dbDelete(`platform/uid_index/${memberUid}`, token);
            if (acc && acc.account) await dbDelete(`platform/email_index/${acc.account}`, token);
          }
        }
        
        await dbDelete(`platform/families/${uid}`, token);
        await dbDelete(`families/${uid}`, token);
        return successResponse({ deleted: true });
      }
    }
    return errorResponse('BAD_REQUEST', '未知的請求');
  } catch (err) { return handleError(err); }
}

/* ============================================
   2. 管理員：初始化家庭 (admin-init-family)
   ============================================ */
export async function handleAdminInitFamily(context) {
  try {
    const { request } = context;
    const body = await request.json();
    const { uid } = body || {};
    if (!uid) return errorResponse('MISSING_FIELDS', '缺少 uid');

    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    const basePath = `families/${uid}`;
    const existing = await dbGet(`${basePath}/members`, token);
    if (existing && Object.keys(existing).length > 0) {
      return successResponse({ skipped: true, message: '此家庭已有資料' });
    }

    // 載入平台預設（若無則留空）
    const defaults = {
      members: await dbGet('platform/defaults/members', token) || {},
      categories: await dbGet('platform/defaults/expense_categories', token) || {},
      items: await dbGet('platform/defaults/expense_items', token) || {},
      payments: await dbGet('platform/defaults/payment_methods', token) || {},
      companies: await dbGet('platform/defaults/insurance_companies', token) || {},
      statuses: await dbGet('platform/defaults/statuses', token) || {},
    };

    const now = Date.now();
    const results = {};

    // 寫入基礎資料
    results.members = Object.keys(defaults.members).length > 0 ? await dbPut(`${basePath}/members`, defaults.members, token) : true;
    results.categories = Object.keys(defaults.categories).length > 0 ? await dbPut(`${basePath}/expense_categories`, defaults.categories, token) : true;
    results.items = Object.keys(defaults.items).length > 0 ? await dbPut(`${basePath}/expense_items`, defaults.items, token) : true;
    results.payments = Object.keys(defaults.payments).length > 0 ? await dbPut(`${basePath}/payment_methods`, defaults.payments, token) : true;
    results.companies = Object.keys(defaults.companies).length > 0 ? await dbPut(`${basePath}/insurance_companies`, defaults.companies, token) : true;
    results.statuses = Object.keys(defaults.statuses).length > 0 ? await dbPut(`${basePath}/statuses`, defaults.statuses, token) : true;

    return successResponse({ created: true, results });
  } catch (err) { return handleError(err); }
}

/* ============================================
   3. 平台設定 (platform-settings)
   ============================================ */
export async function handlePlatformSettings(context) {
  try {
    const { request } = context;
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    if (request.method === 'GET') {
      const data = await dbGet('platform/defaults/ui_constants', token);
      return successResponse({ data: data || {} });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      if (body.action !== 'update') return errorResponse('BAD_REQUEST', '未知的 action');
      
      const clean = {
        nameMaxLenDesktop: _toInt(body.data.nameMaxLenDesktop, 12),
        nameMaxLenMobile:  _toInt(body.data.nameMaxLenMobile, 6),
        toastDuration:     _toInt(body.data.toastDuration, 2000),
      };
      await dbPut('platform/defaults/ui_constants', clean, token);
      return successResponse({ data: clean });
    }
  } catch (err) { return handleError(err); }
}

/* ============================================
   4. 平台預設資料 (platform-defaults)
   ============================================ */
const PLATFORM_RESOURCES = {
  members:     { path: 'members',             type: 'list' },
  banks:       { path: 'banks',               type: 'list' },
  companies:   { path: 'insurance_companies', type: 'list' },
  payments:    { path: 'payment_methods',     type: 'list' },
  categories:  { path: 'expense_categories',  type: 'list' },
  items:       { path: 'expense_items',       type: 'list' },
  statuses:    { path: 'statuses',            type: 'list' },
  options:     { path: 'options',             type: 'object' },
  yearRange:   { path: 'year_range',          type: 'object' },
  uiConstants: { path: 'ui_constants',        type: 'object' },
};

export async function handlePlatformDefaults(context) {
  try {
    const { request } = context;
    const url = new URL(request.url);
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    if (request.method === 'GET') {
      const resource = url.searchParams.get('resource');
      const config = PLATFORM_RESOURCES[resource];
      if (!config) return errorResponse('BAD_REQUEST', `未知的 resource：${resource}`);

      const data = await dbGet(`platform/defaults/${config.path}`, token);
      if (config.type === 'object') {
        return successResponse({ resource, type: 'object', data: data || {} });
      }
      const list = Object.entries(data || {}).map(([id, x]) => ({ id, ...x })).sort((a, b) => (a.order || 0) - (b.order || 0));
      return successResponse({ resource, type: 'list', list });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { action, resource, id, data } = body || {};
      const config = PLATFORM_RESOURCES[resource];
      if (!config) return errorResponse('BAD_REQUEST', `未知的 resource：${resource}`);

      const basePath = `platform/defaults/${config.path}`;

      if (action === 'put' && config.type === 'list') {
        let savedId = id;
        if (id) await dbPut(`${basePath}/${id}`, data, token);
        else savedId = await dbPush(basePath, { ...data, createdAt: Date.now() }, token);
        return successResponse({ id: savedId });
      }

      if (action === 'delete' && config.type === 'list') {
        await dbDelete(`${basePath}/${id}`, token);
        return successResponse({ deletedId: id });
      }

      if (action === 'set' && config.type === 'object') {
        await dbPut(basePath, data, token);
        return successResponse({ data });
      }
      return errorResponse('BAD_REQUEST', '未知的 action 或 resource 類型不符');
    }
  } catch (err) { return handleError(err); }
}

function _toInt(v, fallback) {
  const n = Number(v);
  return (isNaN(n) || n < 0) ? fallback : Math.floor(n);
}

/* ═══ EOF ═══
F: api/handlers-admin.js
V: 1792900390
W: ai-system-20261024-012#34
═══ EOF ═══ */