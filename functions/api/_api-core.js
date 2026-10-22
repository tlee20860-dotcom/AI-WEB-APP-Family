// ============================================
// _api-core.js — 後端核心邏輯 (v2.0.0)
// ============================================

const _DB_CONFIGS = {
  old: { url: 'https://family-fin-a6dd1-default-rtdb.asia-southeast1.firebasedatabase.app', apiKey: 'AIzaSyCQlrNdorKJI9xsqr4m4ME046lrubo9Y7I' },
  new: { url: 'https://family-3d0a5-default-rtdb.asia-southeast1.firebasedatabase.app', apiKey: 'AIzaSyBJCK83RQyHbol4yJ4UDo3pOUXpUgcW9hU' },
};

let FIREBASE_DB_URL = _DB_CONFIGS.old.url;
let FIREBASE_API_KEY = _DB_CONFIGS.old.apiKey;
const SUPERADMIN_EMAIL = 'superadmin@familyfin.local';
const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1';

export function initConfig(env) {
  const target = (env && env.DB_TARGET) || 'old';
  const cfg = _DB_CONFIGS[target] || _DB_CONFIGS.old;
  FIREBASE_DB_URL = cfg.url;
  FIREBASE_API_KEY = cfg.apiKey;
}

async function dbGet(path, token = '') {
  const url = `${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}
async function dbPut(path, data, token = '') {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.ok;
}
async function dbPatch(path, data, token = '') {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return res.ok;
}
async function dbPush(path, data, token = '') {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  if (!res.ok) return null;
  const result = await res.json();
  return result?.name || null;
}
async function dbDelete(path, token = '') {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json${token ? `?auth=${token}` : ''}`, { method: 'DELETE' });
  return res.ok;
}
async function dbSignUp(email, password) {
  const res = await fetch(`${IDENTITY_TOOLKIT_URL}/accounts:signUp?key=${FIREBASE_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: false }) });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data?.error?.message || 'UNKNOWN_ERROR' };
  return { ok: true, uid: data.localId, email: data.email };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function errorResponse(code, message = '', status) {
  const statusMap = { UNAUTHORIZED: 401, FORBIDDEN: 403, MISSING_FIELDS: 400, INVALID_BODY: 400, BAD_REQUEST: 400, NOT_FOUND: 404, CONFLICT: 409, INTERNAL: 500 };
  return jsonResponse({ ok: false, error: code, message: message || undefined }, status || statusMap[code] || 500);
}
function handleError(err) {
  console.error('[_api-core] error:', err);
  return errorResponse('INTERNAL', String(err?.message || err));
}
function successResponse(data = {}) {
  return jsonResponse({ ok: true, ...data });
}
function extractToken(request) {
  return (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
}
function requireFields(body, fields) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'INVALID_BODY', fields };
  const missing = fields.filter((f) => body[f] === '' || body[f] == null);
  return missing.length > 0 ? { ok: false, error: 'MISSING_FIELDS', fields: missing } : null;
}

const _tokenCache = new Map();
async function verifyToken(token) {
  if (!token) return null;
  const cached = _tokenCache.get(token);
  if (cached && cached.expireAt > Date.now()) return cached.user;
  try {
    const res = await fetch(`${IDENTITY_TOOLKIT_URL}/accounts:lookup?key=${FIREBASE_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.users?.[0] || null;
    if (user) _tokenCache.set(token, { user, expireAt: Date.now() + 60000 });
    return user;
  } catch { return null; }
}

async function verifySuperAdmin(token) {
  const user = await verifyToken(token);
  return user?.email === SUPERADMIN_EMAIL ? user : null;
}

async function verifyFamilyAccess(token, familyId) {
  if (!familyId) return null;
  const user = await verifyToken(token);
  if (!user) return null;
  const isSuper = user.email === SUPERADMIN_EMAIL;
  if (isSuper) return { user, isSuper: true, isOwner: true, canInput: true };
  if (user.localId === familyId) return { user, isSuper: false, isOwner: true, canInput: true, isLegacy: true };
  const memberAccount = await dbGet(`platform/families/${familyId}/memberAccounts/${user.localId}`, token);
  if (memberAccount) return { user, isSuper: false, isOwner: memberAccount.role === 'owner', canInput: memberAccount.canInput !== false };
  return null;
}

async function verifyFamilyAccessByUid(uid, token = '') {
  if (!uid) return null;
  const familyId = await dbGet(`platform/uid_index/${uid}`, token);
  if (familyId && typeof familyId === 'string') {
    const memberAccount = await dbGet(`platform/families/${familyId}/memberAccounts/${uid}`, token);
    return { familyId, memberAccount: memberAccount || null, isLegacy: false };
  }
  const familySnap = await dbGet(`platform/families/${uid}`, token);
  if (familySnap) return { familyId: uid, memberAccount: { email: '', displayName: familySnap.name || '我的家庭', role: 'owner', canInput: true }, isLegacy: true };
  return null;
}

async function authenticate(request, options = {}) {
  const { body, requiredFields: reqFields, needSuperAdmin, needFamily } = options;
  const token = extractToken(request);
  if (reqFields && body) { const missing = requireFields(body, reqFields); if (missing) return errorResponse('MISSING_FIELDS', '', 400); }
  if (needSuperAdmin) {
    const user = await verifySuperAdmin(token);
    return user ? { token, user, isSuper: true } : errorResponse('FORBIDDEN', '需要超級管理員權限');
  }
  if (needFamily) {
    let familyId = body?.familyId || new URL(request.url).searchParams.get('familyId');
    if (!familyId) return errorResponse('MISSING_FIELDS', 'familyId 為必填');
    const result = await verifyFamilyAccess(token, familyId);
    if (!result) return errorResponse('FORBIDDEN', '無權存取此家庭');
    return { token, user: result.user, isSuper: result.isSuper, isOwner: result.isOwner, canInput: result.canInput, familyId };
  }
  const user = await verifyToken(token);
  return user ? { token, user, isSuper: user.email === SUPERADMIN_EMAIL } : errorResponse('UNAUTHORIZED', '請重新登入');
}

const objToList = (obj, sortFn) => { const list = Object.entries(obj || {}).map(([id, x]) => ({ id, ...x })); if (sortFn) list.sort(sortFn); return list; };
const roundInt = (v) => Math.round(Number(v) || 0);
const LINKED_PREFIX = 'linked_';
const buildLinkedKey = (policyId) => `${LINKED_PREFIX}${policyId}`;

// --- Admin ---
async function handleAdminFamiliesGet(request) {
  try {
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const list = await dbGet('platform/families', auth.token);
    const families = Object.entries(list || {}).map(([uid, data]) => ({ uid, ...data })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return successResponse({ families });
  } catch (err) { return handleError(err); }
}

async function handleAdminFamiliesPost(request) {
  try {
    const body = await request.json();
    const { action, uid, name, email } = body || {};
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;

    if (action === 'add') {
      const missing = requireFields(body, ['uid', 'name']);
      if (missing) return errorResponse('MISSING_FIELDS', '缺少 uid 或 name');
      const success = await dbPut(`platform/families/${uid}`, { name: String(name).trim(), ownerEmail: email ? String(email).trim() : '', createdAt: Date.now() }, token);
      if (!success) return errorResponse('INTERNAL', 'Firebase 寫入失敗');
      return successResponse();
    }
    if (action === 'remove') {
      const missing = requireFields(body, ['uid']);
      if (missing) return errorResponse('MISSING_FIELDS', '缺少 uid');
      let accounts = null;
      try { accounts = await dbGet(`platform/families/${uid}/memberAccounts`, token); } catch (e) {}
      const cleanups = [];
      if (accounts) {
        Object.entries(accounts).forEach(([mUid, acc]) => {
          cleanups.push(dbDelete(`platform/uid_index/${mUid}`, token).catch(() => false));
          if (acc?.account) cleanups.push(dbDelete(`platform/email_index/${acc.account}`, token).catch(() => false));
        });
      }
      await Promise.all(cleanups);
      const ok1 = await dbDelete(`platform/families/${uid}`, token);
      const ok2 = await dbDelete(`families/${uid}`, token);
      if (!ok1 && !ok2) return errorResponse('INTERNAL', '刪除失敗');
      return successResponse({ deletedPlatform: ok1, deletedFamilyData: ok2, cleanedIndexes: cleanups.length });
    }
    return errorResponse('BAD_REQUEST', '未知的 action');
  } catch (err) { return handleError(err); }
}

const FALLBACK = {
  members: { mem_husband: { name: '成員1', role: 'husband', order: 0 }, mem_wife: { name: '成員2', role: 'wife', order: 1 }, mem_son: { name: '成員3', role: 'child', order: 2 }, mem_daughter: { name: '成員4', role: 'child', order: 3 } },
  banks: {}, insurance_companies: { comp_ftlife: { name: '富通', order: 1 }, comp_prudential: { name: '保誠', order: 2 }, comp_fwd: { name: 'FWD', order: 3 }, comp_aia: { name: 'AIA', order: 4 }, comp_manulife: { name: '宏利', order: 5 }, comp_axa: { name: 'AXA', order: 6 } },
  payment_methods: { pm_cash: { name: '現金', order: 1 }, pm_boc: { name: '中銀', order: 2 }, pm_hsbc: { name: '匯豐', order: 3 }, pm_hangs: { name: '恆生', order: 4 }, pm_credit: { name: '信用卡', order: 5 } },
  expense_categories: { cat_medical: { name: '醫療類', order: 1 }, cat_school: { name: '學校類', order: 2 }, cat_insurance: { name: '保險類', order: 3 }, cat_fixed: { name: '固定費用類', order: 4 }, cat_other: { name: '其他', order: 5 } },
  expense_items: { item_med_01: { categoryKey: 'cat_medical', name: '看病-一般' }, item_sch_01: { categoryKey: 'cat_school', name: '學費' } },
  statuses: { status_untreated: { name: '未處理', category: 'personal', isDone: false, order: 1 }, status_done: { name: '已處理', category: 'personal', isDone: true, order: 2 }, status_unbilled: { name: '未扣款', category: 'insurance', isDone: false, order: 8 }, status_billed: { name: '已扣款', category: 'insurance', isDone: true, order: 9 } },
  options: { memberRoles: [{ value: 'husband', label: '老公 / 丈夫' }, { value: 'wife', label: '老婆 / 妻子' }, { value: 'child', label: '子女' }, { value: 'other', label: '其他' }], policyTypes: [{ value: 'normal', label: '普通保險' }, { value: 'fund_insurance', label: '基金保險' }], categoryOrder: ['銀行類', '醫療類', '學校類', '保險類', '固定費用類', '交通類', '其他'] },
  year_range: { startYear: null, futureYears: 5 }, ui_constants: { nameMaxLenDesktop: 12, nameMaxLenMobile: 6, toastDuration: 2000 },
};

async function handleAdminInitFamily(request) {
  try {
    const body = await request.json();
    const { uid } = body || {};
    if (!uid) return errorResponse('MISSING_FIELDS', '缺少 uid');
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${uid}`;
    const existing = await dbGet(`${basePath}/members`, token);
    if (existing && Object.keys(existing).length > 0) return successResponse({ skipped: true, message: '此家庭已有資料' });

    const defaults = {};
    for (const k of Object.keys(FALLBACK)) {
      const val = await dbGet(`platform/defaults/${k}`, token);
      defaults[k] = (val && Object.keys(val).length > 0) ? val : FALLBACK[k];
    }
    const now = Date.now();
    const results = { members: false, banks: false, insurance_companies: false, payment_methods: false, expense_categories: false, expense_items: false, statuses: false, options: false, year_range: false, ui_constants: false };

    results.members = await dbPut(`${basePath}/members`, Object.fromEntries(Object.entries(defaults.members).map(([k, v], i) => [k, { ...v, createdAt: now + i }])), token);
    results.banks = await dbPut(`${basePath}/banks`, {}, token);
    results.insurance_companies = await dbPut(`${basePath}/insurance_companies`, Object.fromEntries(Object.entries(defaults.insurance_companies).map(([k, v], i) => [k, { ...v, createdAt: now + i }])), token);
    results.payment_methods = await dbPut(`${basePath}/payment_methods`, Object.fromEntries(Object.entries(defaults.payment_methods).map(([k, v], i) => [k, { ...v, createdAt: now + i }])), token);
    results.expense_categories = await dbPut(`${basePath}/expense_categories`, Object.fromEntries(Object.entries(defaults.expense_categories).map(([k, v], i) => [k, { ...v, createdAt: now + i }])), token);
    results.expense_items = await dbPut(`${basePath}/expense_items`, Object.fromEntries(Object.entries(defaults.expense_items).map(([k, v], i) => [k, { name: v.name || '', categoryId: v.categoryKey || v.categoryId || '', createdAt: now + i }])), token);
    results.statuses = await dbPut(`${basePath}/statuses`, Object.fromEntries(Object.entries(defaults.statuses).map(([k, v], i) => [k, { ...v, createdAt: now + i }])), token);
    results.options = await dbPut(`${basePath}/settings/options`, defaults.options, token);
    results.year_range = await dbPut(`${basePath}/settings/year_range`, defaults.year_range, token);
    results.ui_constants = await dbPut(`${basePath}/settings/ui_constants`, defaults.ui_constants, token);

    const failed = Object.entries(results).filter(([, ok]) => ok === false).map(([k]) => k);
    return successResponse({ created: true, partial: failed.length > 0, failedSteps: failed, results });
  } catch (err) { return handleError(err); }
}

const LEGACY_STATUS_MAP = { '未處理': 'pending', '未還款': 'pending', '未付款': 'pending', '未扣款': 'pending', '未轉入': 'pending', '已處理': 'done', '已還款': 'done', '已付款': 'done', '已扣款': 'done', '已轉入': 'done', '不適用': 'skipped' };
const _normalizeStatus = (raw) => (raw == null || raw === '') ? 'pending' : (['pending', 'done', 'skipped'].includes(raw) ? raw : (LEGACY_STATUS_MAP[raw] || 'pending'));

async function handleAdminMigrate(request) {
  try {
    const body = await request.json();
    const { familyId, confirm } = body || {};
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    if (confirm !== 'MIGRATE_ALL') return errorResponse('BAD_REQUEST', '必須提供確認參數');
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${familyId}`;
    const summary = { expenses: { scanned: 0, normalized: 0 }, payments: { scanned: 0, normalized: 0 }, policies: { scanned: 0, patched: 0 }, funds: { scanned: 0, patched: 0 } };

    const expensesSnap = await dbGet(`${basePath}/expenses`, token);
    if (expensesSnap) {
      for (const [y, months] of Object.entries(expensesSnap)) {
        for (const [m, monthData] of Object.entries(months || {})) {
          for (const [mid, items] of Object.entries(monthData?.member_expenses || {})) {
            for (const [eid, e] of Object.entries(items || {})) {
              if (!e || typeof e !== 'object') continue;
              summary.expenses.scanned++;
              let changed = false;
              const ns = _normalizeStatus(e.status);
              if (e.status !== ns) { e.status = ns; changed = true; }
              if (e.isAutoLinked === undefined) { e.isAutoLinked = !!e.policyId; changed = true; }
              if (changed) { await dbPut(`${basePath}/expenses/${y}/${m}/member_expenses/${mid}/${eid}`, e, token); summary.expenses.normalized++; }
            }
          }
        }
      }
    }
    return successResponse({ migrated: true, familyId, summary });
  } catch (err) { return handleError(err); }
}

// --- Bank ---
async function handleBankAccountsGet(request) {
  try {
    const familyId = new URL(request.url).searchParams.get('familyId');
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    const auth = await authenticate(request, { needFamily: true });
    if (auth instanceof Response) return auth;
    const data = await dbGet(`families/${familyId}/bank_accounts`, auth.token);
    const list = objToList(data, (a, b) => (a.order ?? 9999) - (b.order ?? 9999) || (a.createdAt || 0) - (b.createdAt || 0));
    return successResponse({ familyId, accounts: list, count: list.length });
  } catch (err) { return handleError(err); }
}

async function handleBankAccountsPost(request) {
  try {
    const body = await request.json();
    const { familyId, action, id, data } = body || {};
    if (!familyId || !action) return errorResponse('MISSING_FIELDS', '缺少參數');
    const auth = await authenticate(request, { needFamily: true, body });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${familyId}/bank_accounts`;

    if (action === 'create') {
      if (!data || !data.name) return errorResponse('MISSING_FIELDS', '缺少 data 或 name');
      const clean = { name: String(data.name).trim(), type: ['family', 'personal'].includes(data.type) ? data.type : 'family', initialBalance: roundInt(data.initialBalance), initialYear: String(data.initialYear || new Date().getFullYear()), initialMonth: String(data.initialMonth || '01').padStart(2, '0'), order: Number(data.order) || 0, createdAt: Date.now() };
      const newId = await dbPush(basePath, clean, token);
      return newId ? successResponse({ id: newId, data: clean }) : errorResponse('INTERNAL', '寫入失敗');
    }
    if (action === 'update') {
      if (!id || !data) return errorResponse('MISSING_FIELDS', '缺少 id 或 data');
      const existing = await dbGet(`${basePath}/${id}`, token);
      if (!existing) return errorResponse('NOT_FOUND', '找不到');
      const clean = { ...existing };
      if (data.name !== undefined) clean.name = String(data.name).trim();
      if (data.type !== undefined) clean.type = data.type;
      if (data.initialBalance !== undefined) clean.initialBalance = roundInt(data.initialBalance);
      if (data.initialYear !== undefined) clean.initialYear = String(data.initialYear);
      if (data.initialMonth !== undefined) clean.initialMonth = String(data.initialMonth).padStart(2, '0');
      if (data.order !== undefined) clean.order = Number(data.order) || 0;
      clean.updatedAt = Date.now();
      return await dbPut(`${basePath}/${id}`, clean, token) ? successResponse({ id, data: clean }) : errorResponse('INTERNAL', '更新失敗');
    }
    if (action === 'remove') {
      if (!id) return errorResponse('MISSING_FIELDS', '缺少 id');
      const refCount = await _countBankReferences(basePath, id, token);
      if (refCount > 0) return errorResponse('CONFLICT', `此銀行仍被 ${refCount} 筆記錄引用，請先移除引用`, 409);
      return await dbDelete(`${basePath}/${id}`, token) ? successResponse({ removedId: id }) : errorResponse('INTERNAL', '刪除失敗');
    }
    return errorResponse('BAD_REQUEST', '未知 action');
  } catch (err) { return handleError(err); }
}

async function _countBankReferences(bankAccountsBasePath, bankId, token) {
  const familyBase = bankAccountsBasePath.replace(/\/bank_accounts$/, '');
  let count = 0;
  try {
    const expensesSnap = await dbGet(`${familyBase}/expenses`, token);
    if (expensesSnap) Object.values(expensesSnap).forEach((ms) => Object.values(ms || {}).forEach((md) => Object.values(md?.member_expenses || {}).forEach((items) => Object.values(items || {}).forEach((e) => { if (e?.bankId === bankId) count++; }))));
    const paySnap = await dbGet(`${familyBase}/insurance_payments`, token);
    if (paySnap) Object.values(paySnap).forEach((ys) => Object.values(ys || {}).forEach((ms) => Object.values(ms || {}).forEach((p) => { if (p?.bankId === bankId) count++; })));
  } catch (e) {}
  return count;
}

async function handleBankTransactionsGet(request) { return successResponse({}); }
async function handleBankTransactionsPost(request) { return successResponse({}); }
async function handleClearBankBalances(request) {
  try {
    const body = await request.json();
    if (body.confirm !== 'CONFIRM_DELETE') return errorResponse('BAD_REQUEST', '必須提供確認');
    const auth = await authenticate(request, { needFamily: true, body });
    if (auth instanceof Response) return auth;
    await dbDelete(`families/${body.familyId}/bank_balances`, auth.token);
    return successResponse({ cleared: true });
  } catch (err) { return handleError(err); }
}

// --- Family ---
async function handleLookupFamily(request) {
  try {
    const auth = await authenticate(request);
    if (auth instanceof Response) return auth;
    const result = await verifyFamilyAccessByUid(auth.user.localId, auth.token);
    if (!result) return errorResponse('NOT_FOUND', '此帳號不屬於任何家庭');
    let familyName = '我的家庭';
    try { const s = await dbGet(`platform/families/${result.familyId}`, auth.token); if (s?.name) familyName = s.name; } catch (e) {}
    return successResponse({ familyId: result.familyId, familyName, memberAccount: result.memberAccount, isLegacy: result.isLegacy });
  } catch (err) { return handleError(err); }
}

async function handleFamilySettingsGet(request) { return successResponse({}); }
async function handleFamilySettingsPost(request) { return successResponse({}); }

async function handleFamilyAccountsGet(request) {
  try {
    const familyId = new URL(request.url).searchParams.get('familyId');
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    const token = extractToken(request);
    const superUser = await verifySuperAdmin(token);
    if (!superUser && !(await verifyFamilyAccess(token, familyId))) return errorResponse('FORBIDDEN', '無權存取');
    const snap = await dbGet(`platform/families/${familyId}/memberAccounts`, token);
    const accounts = objToList(snap, (a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    return successResponse({ familyId, accounts, count: accounts.length });
  } catch (err) { return handleError(err); }
}

async function handleFamilyAccountsPost(request) { return successResponse({}); }

// --- Entity (統一 CRUD) ---
const ENTITY_PATH = { member: 'members', bank: 'banks', bankAccount: 'bank_accounts', category: 'expense_categories', item: 'expense_items', payment: 'payment_methods', company: 'insurance_companies', policy: 'insurance_policies', fund: 'funds' };
const REQUIRED_EXTRA = { member: [], bank: [], bankAccount: ['bankId', 'type', 'ownerType'], category: ['shortCode'], item: ['categoryId'], payment: [], company: [], policy: ['type', 'memberId', 'firstStartYear', 'firstStartMonth', 'totalPolicyYears'], fund: ['type'] };

async function handleEntityPost(request) {
  try {
    const body = await request.json();
    const { familyId, action, entityType, id, code, name, extra } = body;
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    const token = extractToken(request);
    const access = await verifyFamilyAccess(token, familyId);
    if (!access) return errorResponse('FORBIDDEN', '無權存取');
    if (!entityType || !ENTITY_PATH[entityType]) return errorResponse('INVALID_BODY', `未知 entityType`);

    const path = ENTITY_PATH[entityType];
    const listPath = `families/${familyId}/${path}`;

    if (action === 'create') {
      const missing = (REQUIRED_EXTRA[entityType] || []).filter((k) => extra[k] === undefined || extra[k] === '');
      if (missing.length) return errorResponse('MISSING_FIELDS', `缺少欄位：${missing.join(', ')}`);
      if (!name || !code) return errorResponse('MISSING_FIELDS', '缺少 name 或 code');
      const list = (await dbGet(listPath, token)) || {};
      if (Object.values(list).some((v) => v.code === code)) return errorResponse('CODE_DUPLICATE', `編號已存在：${code}`, 409);
      if (Object.values(list).some((v) => v.name === name)) return errorResponse('NAME_DUPLICATE', `名稱重複：${name}`, 409);
      
      const payload = { code, name, ..._normalizeExtra(entityType, extra), createdAt: Date.now() };
      const newId = await dbPush(listPath, payload, token);
      return newId ? successResponse({ id: newId, code }) : errorResponse('INTERNAL', '寫入失敗');
    }

    if (action === 'update') {
      if (!id) return errorResponse('MISSING_FIELDS', '缺少 id');
      const itemPath = `${listPath}/${id}`;
      const existing = await dbGet(itemPath, token);
      if (!existing) return errorResponse('NOT_FOUND', `找不到 ${id}`);
      if (name) {
        const list = (await dbGet(listPath, token)) || {};
        if (Object.entries(list).some(([k, v]) => k !== id && v.name === name)) return errorResponse('NAME_DUPLICATE', `名稱重複：${name}`, 409);
      }
      const payload = { ...(name !== undefined ? { name } : {}), ...(Object.keys(extra).length ? _normalizeExtra(entityType, extra) : {}), updatedAt: Date.now() };
      return await dbPatch(itemPath, payload, token) ? successResponse({ id }) : errorResponse('INTERNAL', '更新失敗');
    }

    if (action === 'delete') {
      if (!id) return errorResponse('MISSING_FIELDS', '缺少 id');
      const itemPath = `${listPath}/${id}`;
      if (!(await dbGet(itemPath, token))) return errorResponse('NOT_FOUND', `找不到 ${id}`);
      return await dbDelete(itemPath, token) ? successResponse({ id }) : errorResponse('INTERNAL', '刪除失敗');
    }
    return errorResponse('INVALID_BODY', '未知 action');
  } catch (err) { return handleError(err); }
}

function _normalizeExtra(entityType, extra) {
  const round = (v) => Math.round(Number(v) || 0);
  switch (entityType) {
    case 'member': return { role: extra.role || 'other', order: Number(extra.order) || 0 };
    case 'bank': return { order: Number(extra.order) || 0 };
    case 'bankAccount': return { type: extra.type, ownerType: extra.ownerType, ownerId: extra.ownerId || 'family', initialBalance: round(extra.initialBalance), initialYear: String(extra.initialYear || ''), initialMonth: String(extra.initialMonth || '01').padStart(2, '0'), order: Number(extra.order) || 0 };
    case 'category': return { shortCode: extra.shortCode, order: Number(extra.order) || 0 };
    case 'item': return { categoryId: extra.categoryId };
    case 'payment': return { order: Number(extra.order) || 0 };
    case 'company': return {};
    case 'policy': return { type: extra.type, memberId: extra.memberId, policyHolderId: extra.policyHolderId || extra.memberId, firstStartYear: Number(extra.firstStartYear), firstStartMonth: String(extra.firstStartMonth).padStart(2, '0'), totalPolicyYears: Number(extra.totalPolicyYears), totalPolicyPeriods: Number(extra.totalPolicyYears) * 12, monthlyPremium: round(extra.monthlyPremium), annualPremium: round(extra.annualPremium), fundsAllocation: Array.isArray(extra.fundsAllocation) ? extra.fundsAllocation : [] };
    case 'fund': return { type: extra.type, policyId: extra.policyId || '', cost: round(extra.cost), initialYear: String(extra.initialYear || ''), initialMonth: String(extra.initialMonth || '').padStart(2, '0') };
    default: return {};
  }
}

// --- Insurance ---
async function handleInsuranceSync(request) {
  try {
    const body = await request.json();
    const { action, familyId, policyId, memberId, policyName, monthlyAverage, year, month, bankId, txnId, paymentMode, advanceHolderId } = body || {};
    if (!familyId || !policyId || !memberId || !year || !month) return errorResponse('MISSING_FIELDS');
    const auth = await authenticate(request, { needFamily: true, body });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${familyId}`;
    const linkedKey = buildLinkedKey(policyId);
    const expensePath = `${basePath}/expenses/${year}/${month}/member_expenses/${memberId}/${linkedKey}`;
    const paymentPath = `${basePath}/insurance_payments/${policyId}/${year}/${month}`;
    const amount = roundInt(monthlyAverage);

    if (action === 'delete') {
      await dbDelete(expensePath, token);
      await dbDelete(paymentPath, token);
      await _reverseFundAccumulation({ basePath, policyId, year, month, token });
      return successResponse({ deleted: true });
    }

    const statuses = await dbGet(`${basePath}/statuses`, token) || {};
    const categories = await dbGet(`${basePath}/expense_categories`, token) || {};
    const firstCategoryId = Object.values(categories).sort((a, b) => (a.order || 0) - (b.order || 0))[0]?.id || '';
    
    const expense = { name: `${policyName} (平攤)`, amount, status: 'done', date: '', categoryId: firstCategoryId, itemId: '', paymentMethodId: '', bankId: bankId || '', txnId: txnId || '', isAutoLinked: true, policyId, createdAt: Date.now() };
    const paymentRecord = { status: 'done', amount, date: new Date().toISOString().slice(0, 10), bankId: bankId || '', txnId: txnId || '', paymentMode: paymentMode || 'direct' };
    
    await Promise.all([ dbPut(expensePath, expense, token), dbPut(paymentPath, paymentRecord, token) ]);
    await _accumulateFunds({ basePath, policyId, year, month, token });

    return successResponse({ path: expensePath });
  } catch (err) { return handleError(err); }
}

async function _accumulateFunds({ basePath, policyId, year, month, token }) {
  const policy = await dbGet(`${basePath}/insurance_policies/${policyId}`, token);
  if (!policy || policy.type !== 'fund_insurance') return;
  const alloc = policy.fundsAllocation || [];
  if (!alloc.length) return;
  const monthlyPremium = roundInt(policy.monthlyPremium);
  for (const a of alloc) {
    if (!a.fundId) continue;
    const addCost = Math.round(monthlyPremium * (Number(a.pct) || 0) / 100);
    const fundPath = `${basePath}/funds/${a.fundId}`;
    const snapPath = `${fundPath}/snapshots/${year}/${String(month).padStart(2, '0')}`;
    const snap = (await dbGet(snapPath, token)) || {};
    await dbPut(snapPath, { ...snap, cumulativeCost: roundInt(snap.cumulativeCost) + addCost, contribution: addCost, createdAt: snap.createdAt || Date.now(), updatedAt: Date.now() }, token);
    const fund = (await dbGet(fundPath, token)) || {};
    if (fund.type !== 'insurance') await dbPut(fundPath, { ...fund, type: 'insurance', policyId }, token);
  }
}
async function _reverseFundAccumulation({ basePath, policyId, year, month, token }) {
  const policy = await dbGet(`${basePath}/insurance_policies/${policyId}`, token);
  if (!policy || policy.type !== 'fund_insurance') return;
  const alloc = policy.fundsAllocation || [];
  const monthlyPremium = roundInt(policy.monthlyPremium);
  for (const a of alloc) {
    if (!a.fundId) continue;
    const subCost = Math.round(monthlyPremium * (Number(a.pct) || 0) / 100);
    const snapPath = `${basePath}/funds/${a.fundId}/snapshots/${year}/${String(month).padStart(2, '0')}`;
    const snap = await dbGet(snapPath, token);
    if (!snap) continue;
    await dbPut(snapPath, { ...snap, cumulativeCost: Math.max(0, roundInt(snap.cumulativeCost) - subCost), contribution: 0, updatedAt: Date.now() }, token);
  }
}

// --- Personal ---
async function handlePersonalIncomeGet(request) { return successResponse({}); }
async function handlePersonalIncomePost(request) { return successResponse({}); }
async function handleMemberAdvancesGet(request) { return successResponse({}); }
async function handleMemberAdvancesPost(request) { return successResponse({}); }

// --- Platform ---
async function handlePlatformSettingsGet(request) {
  try {
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const data = await dbGet('platform/defaults/ui_constants', auth.token);
    return successResponse({ data: data || {} });
  } catch (err) { return handleError(err); }
}
async function handlePlatformSettingsPost(request) { return successResponse({}); }
async function handlePlatformDefaultsGet(request) {
  try {
    const resource = new URL(request.url).searchParams.get('resource');
    const auth = await authenticate(request, { needSuperAdmin: true });
    if (auth instanceof Response) return auth;
    const data = await dbGet(`platform/defaults/${resource}`, auth.token);
    return successResponse({ data: data || {} });
  } catch (err) { return handleError(err); }
}
async function handlePlatformDefaultsPost(request) { return successResponse({}); }

// --- Summary ---
async function handleSummary(request) {
  try {
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId');
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    if (!familyId) return errorResponse('MISSING_FIELDS', '缺少 familyId');
    const auth = await authenticate(request, { needFamily: true });
    if (auth instanceof Response) return auth;
    const { token } = auth;
    const basePath = `families/${familyId}`;

    const [members, policies, expenses, income, funds, categories, items, banks, paymentMethods, statuses, settingsOptions, bankAccounts, personalIncome, memberAdvances] = await Promise.all([
      dbGet(`${basePath}/members`, token), dbGet(`${basePath}/insurance_policies`, token), year && month ? dbGet(`${basePath}/expenses/${year}/${month}/member_expenses`, token) : null,
      year && month ? dbGet(`${basePath}/income/${year}/${month}`, token) : null, dbGet(`${basePath}/funds`, token), dbGet(`${basePath}/expense_categories`, token),
      dbGet(`${basePath}/expense_items`, token), dbGet(`${basePath}/banks`, token), dbGet(`${basePath}/payment_methods`, token), dbGet(`${basePath}/statuses`, token),
      dbGet(`${basePath}/settings/options`, token), dbGet(`${basePath}/bank_accounts`, token), dbGet(`${basePath}/personal_income`, token), dbGet(`${basePath}/member_advances`, token),
    ]);

    const membersObj = members || {};
    let totalExpense = 0; const perMember = {};
    Object.entries(expenses || {}).forEach(([mid, list]) => {
      const itemsArr = objToList(list).map((e) => ({ ...e, amount: roundInt(e.amount) }));
      const sum = itemsArr.reduce((s, e) => s + e.amount, 0);
      perMember[mid] = { memberName: membersObj[mid]?.name || '未知', itemCount: itemsArr.length, sum: roundInt(sum), items: itemsArr };
      totalExpense += sum;
    });

    let totalIncome = 0; const incomeBreakdown = {};
    Object.entries(income || {}).forEach(([key, val]) => {
      const num = roundInt(val);
      if (key === 'extra' || membersObj[key]) { incomeBreakdown[key] = num; totalIncome += num; }
    });

    let piTotal = 0;
    Object.values(personalIncome || {}).forEach((yd) => Object.values(yd?.[year] || {}).forEach((v) => { piTotal += roundInt(v); }));

    let yearlyIns = 0, monthlyIns = 0, activeCount = 0;
    const curY = Number(year), curM = Number(month);
    Object.values(policies || {}).forEach((p) => {
      const fY = Number(p.firstStartYear) || 0; const fM = Number(p.firstStartMonth) || 1;
      if (!fY) return;
      const tMonths = (curY - fY) * 12 + (curM - fM);
      if (tMonths < 0) return;
      const pIdx = Math.floor(tMonths / 12) + 1;
      if (Number(p.totalPolicyYears) > 0 && pIdx > Number(p.totalPolicyYears)) return;
      if (p.type === 'fund_insurance') {
        const mp = roundInt(p.monthlyPremium); if (mp <= 0) return;
        monthlyIns += mp; yearlyIns += mp * 12; activeCount++;
      } else {
        const pd = (p.periods || {})[String(pIdx)];
        if (pd) { monthlyIns += roundInt(pd.monthlyAverage); yearlyIns += roundInt(pd.annualPremium); activeCount++; }
      }
    });

    const bankList = Object.entries(bankAccounts || {}).map(([id, x]) => ({ id, ...x }));
    let bankBalance = 0;
    return jsonResponse({ ok: true, year, month, totalIncome: roundInt(totalIncome), totalExpense: roundInt(totalExpense), netBalance: roundInt(totalIncome - totalExpense), personalIncomeTotal: roundInt(piTotal), yearlyInsuranceTotal: roundInt(yearlyIns), monthlyInsuranceAverage: roundInt(monthlyIns), policyCount: activeCount, bankBalance, perMember });
  } catch (err) { return handleError(err); }
}

async function handleAnnualSummary(request) { return jsonResponse({ ok: true, years: [] }); }
async function handleSettlementsYear(request) { return jsonResponse({ ok: true, memberExpensesByMonth: {}, policies: [], paymentsCache: {} }); }

export async function handleRequest(request, method) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (method === 'GET') {
    if (path === '/api/family-settings') return handleFamilySettingsGet(request);
    if (path === '/api/family-accounts') return handleFamilyAccountsGet(request);
    if (path === '/api/admin-families') return handleAdminFamiliesGet(request);
    if (path === '/api/summary') return handleSummary(request);
    if (path === '/api/annual-summary') return handleAnnualSummary(request);
    if (path === '/api/settlements-year') return handleSettlementsYear(request);
    if (path === '/api/platform-settings') return handlePlatformSettingsGet(request);
    if (path === '/api/platform-defaults') return handlePlatformDefaultsGet(request);
    if (path === '/api/bank-accounts') return handleBankAccountsGet(request);
    if (path === '/api/bank-transactions') return handleBankTransactionsGet(request);
    if (path === '/api/personal-income') return handlePersonalIncomeGet(request);
    if (path === '/api/member-advances') return handleMemberAdvancesGet(request);
  }

  if (method === 'POST') {
    if (path === '/api/lookup-family') return handleLookupFamily(request);
    if (path === '/api/family-settings') return handleFamilySettingsPost(request);
    if (path === '/api/family-accounts') return handleFamilyAccountsPost(request);
    if (path === '/api/admin-families') return handleAdminFamiliesPost(request);
    if (path === '/api/admin-init-family') return handleAdminInitFamily(request);
    if (path === '/api/admin-migrate') return handleAdminMigrate(request);
    if (path === '/api/platform-settings') return handlePlatformSettingsPost(request);
    if (path === '/api/platform-defaults') return handlePlatformDefaultsPost(request);
    if (path === '/api/bank-accounts') return handleBankAccountsPost(request);
    if (path === '/api/bank-transactions') return handleBankTransactionsPost(request);
    if (path === '/api/clear-bank-balances') return handleClearBankBalances(request);
    if (path === '/api/personal-income') return handlePersonalIncomePost(request);
    if (path === '/api/member-advances') return handleMemberAdvancesPost(request);
    if (path === '/api/insurance-sync') return handleInsuranceSync(request);
    if (path === '/api/entity-create') return handleEntityPost(request);
  }

  return errorResponse('NOT_FOUND', `未知的 API：${path}`);
}

/* ═══ EOF ═══
F: functions/api/_api-core.js
V: 1792670011
W: webapp-20261022-041#1
═══ */
