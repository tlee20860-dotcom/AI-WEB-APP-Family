// ============================================
// firebase-config.js — Firebase 初始化設定（v103.0.38）
// 位置：js/config/firebase-config.js
// ============================================
// v103.0.38（B30-2）：
//   ✅ DB_TARGET 解析上移至 constants.js（SSOT）
//   ✅ 依 DB_TARGET 選對應 config
// v103.0.22（B25-5）：
//   ✅ 補 END OF FILE
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { DB_TARGET } from './constants.js';

/* ---------- 兩套環境設定 ---------- */
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

const firebaseConfig = FIREBASE_CONFIGS[DB_TARGET];

console.log(`[firebase-config] DB=${DB_TARGET} project=${firebaseConfig.projectId}`);

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/config/firebase-config.js
   Version: v103.0.38
   Batch: B30-2
   ═══════════════════════════════════════════ */