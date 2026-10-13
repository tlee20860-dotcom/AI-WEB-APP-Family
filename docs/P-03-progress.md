# P-03 交付進度

最後更新：B31-1
版本：v103.0.41
批次：B31-1
狀態：B31-1 已交付，待部署測試

---

## 總覽

| 批次 | 主題 | 狀態 |
|---|---|---|
| B01 ~ B19 | 重構階段 | ✅ |
| B20 | 第二輪測試修復 | ✅ |
| B21 | docs 重構 | ✅ |
| B22 | 第三輪測試修復 | ✅ |
| B23 | 基金保險分支 | ✅ |
| B24 | docs 更新 + 診斷報告 | ✅ |
| B25 | 全站修復 | ✅ |
| B26 | 全站優化 | ✅ |
| B29 | 表頭排序 + config 整合 + 頁面 metadata | ✅ |
| B29-7 ~ B29-10 | docs 補回 + Token 視覺化 | ✅ |
| B30-1 | settings.html 加 requireFamily:false | ✅ |
| B30-2 | URL 切 DB + storage 前綴 | ✅ |
| B30-3 | 主題 A 家庭暖陽（Tailwind 色板） | ✅ |
| B30-3b | navbar DB 標籤 + 主題切換 | ✅ |
| B30-5 | 後端 DB 切換（CF env） | ✅ |
| B30-6 | 階段總結 + C-06 + C-07 + 規則更新 | ✅ |
| B30-7 | 保單付款類型驗證 + 基金成本自動累積 | ✅ |
| B30-8 | 基金成本按比例分配 + 已供款顯示 | ✅ |
| B30-9 | docs 記錄 Spck Editor 上傳失誤 | ✅ |
| B31-1 | 9 個 bug 修正（8 檔） | ✅ 本批 |

**本次階段性總結 @ B31-1**（上次總結：B30-9）

---

## B31-1：9 個 bug 修正

| # | 檔案 | 變更 | 版本 |
|---|---|---|---|
| 1 | `js/pages/database-yearrange.js` | 修正：清空起始年份被當 0 | v103.0.1 |
| 2 | `js/core/auth-guard.js` | 修正：fallback 用 uid 當 familyId | v103.0.12 |
| 3 | `js/pages/insurance.js` | 修正：payments 快取不刷新 | v103.0.37 |
| 4 | `js/lib/merge.js` | 加 family-change 重置快取 | v103.0.23 |
| 5 | `js/core/db.js` | saveInsurancePaymentBatch set→update + @deprecated | v103.0.35 |
| 6 | `functions/api/_admin.js` | 移除 _migrate_check_expenses 死代碼 | v103.0.23 |
| 7 | `functions/api/_admin.js` | 3 個 handler 權限驗證提前 | v103.0.23 |
| 8 | `js/pages/settings.js` | 改用 listenPageMetadata（SSOT） | v103.0.35 |
| 9 | `js/ui/modal.js` | openConfirm 先 resolve 舊 Promise | v103.0.23 |

### Bug 詳述

| # | 症狀 | 根因 | 修法 |
|---|---|---|---|
| 1 | 清空起始年份 → 被當 0 | form-builder number 欄位 `Number('')===0` | 改從 DOM 直讀 value |
| 2 | fallback 時 API 全失效 | fallback 用 `user.uid` 當 familyId | 不覆蓋既有 familyId |
| 3 | 已供款資訊不刷新 | `_lastIds` id 快取擋住 payments 更新 | 訂閱 `insurance_payments` |
| 4 | 換家庭後狀態解析錯誤 | 模組級快取未監聽 family-change | 加 `AppState.on('family-change')` |
| 5 | 廢棄函式會清欄位 | `set` 覆蓋而非 `update` 合併 | 改 `update` + 標 @deprecated |
| 6 | 死代碼 | `_migrate_check_expenses` 寫入即刪 | 移除 |
| 7 | 驗證順序 | 先驗 uid 再驗權限 | 權限驗證提前 |
| 8 | 違反 SSOT | 硬編碼 Firebase URL 動態 import | 改用 `listenPageMetadata` |
| 9 | 脆弱設計 | `_confirmResolve` 全域單一 | 開新前先 resolve 舊 |

---

## 待辦（B31 系列）

| 項目 | 狀態 |
|---|---|
| B31-2：P-04 manifest 更新（8 檔版本） | 📋 待交付 |
| B31-3：SW 版本統一（v142 / v151 決策） | 📋 待決策 |
| B31-4：批次細化寫入 manifest（~30 檔） | 📋 待決策 |
| B31-5：END OF FILE 補齊（~44 檔） | 📋 待決策 |
| B31-6：P-12 記錄 9 bug | 📋 可選 |
| 版本號不一致 | 📋 使用者決策「日後慢慢修正」 |

---

## 當前狀態

| 項目 | 值 |
|---|---|
| 當前批次 | B31-1 |
| 上一部署 | B30-8 已測試通過 |
| 本批狀態 | 已交付，待部署測試 |
| 下一步 | B31-2（P-04 更新）或依使用者指示 |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-03-progress.md
   Version: v103.0.41
   Batch: B31-1
   ═══════════════════════════════════════════ */
