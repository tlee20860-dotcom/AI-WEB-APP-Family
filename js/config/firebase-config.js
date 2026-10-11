// ============================================
// firebase-config.js — Firebase 初始化設定（v103.0.22）
// 位置：js/config/firebase-config.js
// ============================================
// v103.0.22（B25-5）：
//   ✅ 補 END OF FILE
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCQlrNdorKJI9xsqr4m4ME046lrubo9Y7I",
  authDomain: "family-fin-a6dd1.firebaseapp.com",
  databaseURL: "https://family-fin-a6dd1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "family-fin-a6dd1",
  storageBucket: "family-fin-a6dd1.firebasestorage.app",
  messagingSenderId: "382147296734",
  appId: "1:382147296734:web:42bdbd7401001e75e1f14f",
  measurementId: "G-JKK4TZLPQC"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

/* ═══════════════════════════════════════════
   END OF FILE
   File: js/config/firebase-config.js
   Version: v103.0.22
   Batch: B25-5
   ═══════════════════════════════════════════ */