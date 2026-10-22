// ============================================
// [[path]].js — API Catch-all 路由器 (v2.0.1)
// ============================================
import { initConfig, handleRequest } from './_api-core.js';

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

export async function onRequestGet(context) {
  initConfig(context.env);
  return handleRequest(context.request, 'GET');
}

export async function onRequestPost(context) {
  initConfig(context.env);
  return handleRequest(context.request, 'POST');
}
