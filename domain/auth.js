// ============================================
// auth.js — 身分驗證與權限（V2 重構版）
// 位置：domain/auth.js
// 說明：封裝 Firebase Auth 操作，處理自訂帳號轉換。
//       整合了舊版的 auth.js 與 auth-guard.js 核心功能。
// ============================================

import { auth } from '../config/firebase.js';
import { AppState } from '../config/state.js';
import { STORAGE_KEYS, ROLES } from '../config/constants.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/* ============================================
   1. 帳號格式轉換 (自訂帳號 <-> Email)
   ============================================ */
export const SUPERADMIN_DOMAIN = '@familyfin.local';
export const SUPERADMIN_EMAIL = `superadmin${SUPERADMIN_DOMAIN}`;

export function toEmail(account) {
  if (!account) return '';
  return account.includes('@') ? account : `${account}${SUPERADMIN_DOMAIN}`;
}

export function toAccount(email) {
  if (!email) return '';
  return email.replace(SUPERADMIN_DOMAIN, '');
}

/* ============================================
   2. 登入與登出
   ============================================ */

/**
 * 使用自訂帳號登入
 */
export async function loginWithCustomAccount(account, password) {
  const email = toEmail(account);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/**
 * 登出並清理本地狀態
 */
export async function logout() {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('[auth] signOut 失敗：', err);
  }

  AppState.destroy();
  localStorage.removeItem(STORAGE_KEYS.FAMILY_ID);
  localStorage.removeItem(STORAGE_KEYS.FAMILY_NAME);
  
  // 導向登入頁 (SPA 模式，通常在 router 處理，這裡先寫死)
  window.location.hash = '#/login';
  window.location.reload();
}

/* ============================================
   3. 監聽與權限判定
   ============================================ */

/**
 * 監聽登入狀態
 */
export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * 判斷是否為超級管理員
 */
export function isSuperAdmin(user) {
  return !!user && user.email === SUPERADMIN_EMAIL;
}

/**
 * 取得顯示名稱（帳號前綴）
 */
export function getDisplayName(user) {
  return user ? toAccount(user.email) : '';
}

/* ============================================
   4. 啟動時的身分初始化
   ============================================ */

/**
 * 在 App 啟動時，取得使用者的家庭資訊並寫入 AppState
 * 回傳 true 表示成功，false 表示未登入或無權限
 */
export async function initAuthContext() {
  return new Promise((resolve) => {
    let _resolved = false;

    const unsubscribe = watchAuth(async (user) => {
      if (_resolved) return;
      _resolved = true;
      try { unsubscribe(); } catch (e) {}

      if (!user) {
        resolve(false);
        return;
      }

      AppState.setUser(user);
      const superAdmin = isSuperAdmin(user);
      AppState.setSuperAdmin(superAdmin);

      if (superAdmin) {
        AppState.setRole(ROLES.SUPERADMIN);
        AppState.setCanInput(true);
        AppState.setDisplayName('超級管理員');
        // 超級管理員不需要家庭綁定
        resolve(true);
        return;
      }

      // 一般成員：向後端查詢家庭資訊
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/lookup-family', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({})
        });

        if (!res.ok) throw new Error('查詢家庭失敗');
        
        const data = await res.json();
        if (data && data.familyId) {
          AppState.setFamily(data.familyId, data.familyName || '我的家庭');
          AppState.setMemberAccount(data.memberAccount);
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (err) {
        console.error('[auth] 取得家庭資訊失敗：', err);
        resolve(false);
      }
    });
  });
}

/* ═══ EOF ═══
F: domain/auth.js
V: 1792900310
W: ai-system-20261024-012#26
═══ EOF ═══ */