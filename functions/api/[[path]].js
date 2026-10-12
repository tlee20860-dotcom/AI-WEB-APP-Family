// ============================================
// [[path]].js — API Catch-all 路由器（v103.0.44）
// 位置：functions/api/[[path]].js
// ============================================
// v103.0.44（B30-5）：
//   ✅ 每個 handler 呼叫 initConfig(env) 支援 DB 切換
// v103.0.22（B25-6）：
//   ✅ 加 admin-migrate 分派
// ============================================

import { initConfig } from './_config.js';

import {
  handleLookupFamily,
  handleFamilySettingsGet, handleFamilySettingsPost,
  handleFamilyAccountsGet, handleFamilyAccountsPost,
} from './_family.js';

import {
  handleAdminFamiliesGet, handleAdminFamiliesPost,
  handleAdminInitFamily,
  handleAdminMigrate,
} from './_admin.js';

import {
  handleBankAccountsGet, handleBankAccountsPost,
  handleBankTransactionsGet, handleBankTransactionsPost,
  handleClearBankBalances,
} from './_bank.js';

import {
  handlePersonalIncomeGet, handlePersonalIncomePost,
  handleMemberAdvancesGet, handleMemberAdvancesPost,
} from './_personal.js';

import {
  handlePlatformSettingsGet, handlePlatformSettingsPost,
  handlePlatformDefaultsGet, handlePlatformDefaultsPost,
} from './_platform.js';

import {
  handleSummary,
  handleAnnualSummary,
  handleSettlementsYear,
} from './_summary.js';

import { handleInsuranceSync } from './_insurance.js';

/* ============================================
   OPTIONS preflight
   ============================================ */
export async function onRequestOptions({ env }) {
  initConfig(env);
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/* ============================================
   GET 分派
   ============================================ */
export async function onRequestGet({ request, env }) {
  initConfig(env);
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/family-settings') return handleFamilySettingsGet(request);
  if (path === '/api/family-accounts') return handleFamilyAccountsGet(request);

  if (path === '/api/admin-families') return handleAdminFamiliesGet(request);

  if (path === '/api/summary')            return handleSummary(request);
  if (path === '/api/annual-summary')     return handleAnnualSummary(request);
  if (path === '/api/settlements-year')   return handleSettlementsYear(request);

  if (path === '/api/platform-settings')  return handlePlatformSettingsGet(request);
  if (path === '/api/platform-defaults')  return handlePlatformDefaultsGet(request);

  if (path === '/api/bank-accounts')      return handleBankAccountsGet(request);
  if (path === '/api/bank-transactions')  return handleBankTransactionsGet(request);

  if (path === '/api/personal-income')    return handlePersonalIncomeGet(request);
  if (path === '/api/member-advances')    return handleMemberAdvancesGet(request);

  return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND', message: `未知的 API：${path}` }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

/* ============================================
   POST 分派
   ============================================ */
export async function onRequestPost({ request, env }) {
  initConfig(env);
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/lookup-family') return handleLookupFamily(request);

  if (path === '/api/family-settings') return handleFamilySettingsPost(request);
  if (path === '/api/family-accounts') return handleFamilyAccountsPost(request);

  if (path === '/api/admin-families')      return handleAdminFamiliesPost(request);
  if (path === '/api/admin-init-family')   return handleAdminInitFamily(request);
  if (path === '/api/admin-migrate')       return handleAdminMigrate(request);

  if (path === '/api/platform-settings')   return handlePlatformSettingsPost(request);
  if (path === '/api/platform-defaults')   return handlePlatformDefaultsPost(request);

  if (path === '/api/bank-accounts')       return handleBankAccountsPost(request);
  if (path === '/api/bank-transactions')   return handleBankTransactionsPost(request);
  if (path === '/api/clear-bank-balances') return handleClearBankBalances(request);

  if (path === '/api/personal-income')     return handlePersonalIncomePost(request);
  if (path === '/api/member-advances')     return handleMemberAdvancesPost(request);

  if (path === '/api/insurance-sync')      return handleInsuranceSync(request);

  return new Response(JSON.stringify({ ok: false, error: 'NOT_FOUND', message: `未知的 API：${path}` }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

/* ═══════════════════════════════════════════
   END OF FILE
   File: functions/api/[[path]].js
   Version: v103.0.44
   Batch: B30-5
   ═══════════════════════════════════════════ */