// ============================================
// firebase.js — Firebase 初始化與環境切換（V2 重構版）
// 位置：config/firebase.js
// 說明：預設連線新版 DB (new)。
//       支援 ?db=old 切換至舊版 DB 進行唯讀測試。
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================
   1. 環境設定檔
   ============================================ */
const FIREBASE_CONFIGS = {
  old: {
    apiKey: "AIzaSyCQlrNdorKJI9xsqr4m4ME046lrubo9Y7I",
    authDomain: "family-fin-a6dd1.firebaseapp.com",
    databaseURL: "https://family-fin-a6dd1-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "family-fin-a6dd1",
    storageBucket: "family-fin-a6dd1.firebasestorage.app",
    messagingSenderId: "382147296734",
    appId: "1:382147296734:web:42bdbd7401001e75e1f14f",
    measurementId: "G-JKK4TZLPQC"
  },
  new: {
    apiKey: "AIzaSyBJCK83RQyHbol4yJ4UDo3pOUXpUgcW9hU",
    authDomain: "family-3d0a5.firebaseapp.com",
    databaseURL: "https://family-3d0a5-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "family-3d0a5",
    storageBucket: "family-3d0a5.firebasestorage.app",
    messagingSenderId: "109775445681",
    appId: "1:109775445681:web:84e974db35951d0a6ecc90"
  },
};

/* ============================================
   2. 環境判定（預設 new）
   ============================================ */
function _resolveDbTarget() {
  if (typeof window === 'undefined') return 'new';
  
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('db');
  
  // 開發測試用：如果帶了 ?db=old，則連線舊庫
  if (fromUrl === 'old') return 'old';
  
  // 預設一律連線新版庫
  return 'new';
}

export const DB_TARGET = _resolveDbTarget();
export const IS_READONLY = new URLSearchParams(window.location.search).get('readonly') === '1';

const firebaseConfig = FIREBASE_CONFIGS[DB_TARGET];

console.log(`[Firebase] 初始化環境: ${DB_TARGET.toUpperCase()} (唯讀: ${IS_READONLY})`);

/* ============================================
   3. 初始化與匯出
   ============================================ */
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

/* ═══ EOF ═══
F: config/firebase.js
V: 1792900160
W: ai-system-20261024-012#11
═══ EOF ═══ */