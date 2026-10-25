// ============================================
// [[path]].js — API 路由總管（V2 重構版）
// 位置：api/[[path]].js
// 說明：Cloudflare Pages Functions 的 Catch-all 路由。
//       負責將請求分派給對應的 handler。
// ============================================

import { initConfig, jsonResponse } from './config.js';
import { 
  handleSummary, 
  handleAnnualSummary, 
  handleSettlementsYear,
  handleLookupFamily,
  handleFamilySettings,
  handleEntityPost,
  handleInsuranceSync,
  handleAdminFamilies,
  handleAdminInitFamily,
  handlePlatformSettings,
  handlePlatformDefaults,
  handleBankAccounts,
  handleBankTransactions
} from './handlers.js';

/* ============================================
   1. CORS 預檢處理
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
   2. GET 路由
   ============================================ */
export async function onRequestGet(context) {
  initConfig(context.env);
  const url = new URL(context.request.url);
  const path = url.pathname;

  switch (path) {
    case '/api/summary': return handleSummary(context);
    case '/api/annual-summary': return handleAnnualSummary(context);
    case '/api/settlements-year': return handleSettlementsYear(context);
    case '/api/family-settings': return handleFamilySettings(context);
    
    case '/api/admin-families': return handleAdminFamilies(context);
    case '/api/platform-settings': return handlePlatformSettings(context);
    case '/api/platform-defaults': return handlePlatformDefaults(context);
    
    case '/api/bank-accounts': return handleBankAccounts(context);
    case '/api/bank-transactions': return handleBankTransactions(context);
    
    default:
      return jsonResponse({ ok: false, error: 'NOT_FOUND', message: `未知的 GET API：${path}` }, 404);
  }
}

/* ============================================
   3. POST 路由
   ============================================ */
export async function onRequestPost(context) {
  initConfig(context.env);
  const url = new URL(context.request.url);
  const path = url.pathname;

  switch (path) {
    case '/api/lookup-family': return handleLookupFamily(context);
    case '/api/entity-create': return handleEntityPost(context);
    case '/api/insurance-sync': return handleInsuranceSync(context);
    
    case '/api/family-settings': return handleFamilySettings(context);
    
    case '/api/admin-families': return handleAdminFamilies(context);
    case '/api/admin-init-family': return handleAdminInitFamily(context);
    case '/api/platform-settings': return handlePlatformSettings(context);
    case '/api/platform-defaults': return handlePlatformDefaults(context);
    
    case '/api/bank-accounts': return handleBankAccounts(context);
    case '/api/bank-transactions': return handleBankTransactions(context);

    default:
      return jsonResponse({ ok: false, error: 'NOT_FOUND', message: `未知的 POST API：${path}` }, 404);
  }
}

/* ═══ EOF ═══
F: api/[[path]].js
V: 1792900350
W: ai-system-20261024-012#30
═══ EOF ═══ */