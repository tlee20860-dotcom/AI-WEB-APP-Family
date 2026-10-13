# P-02 交付進度

最後更新：B32-1
Version: 1791883200
Batch: B32-1
Writer: A20261013-001#010
狀態：B32-1 docs 重建中
用途：交付批次追蹤

---

## 總覽

| 批次 | 主題 | 狀態 |
|---|---|---|
| B01 ~ B19 | 重構階段 | ✅ |
| B20 ~ B29 | 測試修復 | ✅ |
| B30-1 ~ B30-9 | 主題 + DB 切換 + 基金 | ✅ |
| B31-1 | 9 個 bug 修正 | ✅ |
| **B32-1** | **docs 全套重建 + 新機制** | **進行中** |

---

## B32-1：docs 全套重建

### 目標

| # | 目標 |
|---|---|
| 1 | 新增編號 / 序號機制 |
| 2 | 新增 Version（Unix epoch） |
| 3 | 新增 Writer（編寫者） |
| 4 | md 檔案零三反引號 |
| 5 | docs 結構重組（23 → 19 檔） |
| 6 | A 類精簡 |

### 交付批次

| 批 | 內容 | 檔數 | 狀態 |
|---|---|---|---|
| 1/6 | C-00 / C-02 / C-04 | 3 | ✅ |
| 2/6 | C-01 / C-03 / C-05 / C-06 / C-07 | 5 | ✅ |
| 3/6 | P-01 / P-02 / P-03 / P-04 | 4 | ✅ 本批 |
| 4/6 | P-05 / P-06 / P-07 / P-08 | 4 | 📋 |
| 5/6 | P-09 / P-10 / P-11 / P-12 | 4 | 📋 |
| 6/6 | P-13 / P-14 / P-99 / P-11-writers | 4 | 📋 |

### 新編號對照

#### C-*（新 → 舊）

| 新 | 舊 |
|---|---|
| C-00-startup | C-00 |
| C-01-profile | C-01 |
| C-02-rules | C-02 |
| C-03-guide | C-03 |
| C-04-delivery | C-04 |
| C-05-learning | C-05 |
| C-06-token-log | C-06 |
| C-07-summary | C-07 |

#### P-*（新 → 舊）

| 新 | 舊 | 變動 |
|---|---|---|
| P-01-index | P-01 + P-02 | 合併 |
| P-02-progress | P-03 | 編號變 |
| P-03-manifest | P-04 | 編號變 |
| P-04-decisions | P-05 + P-14 | 合併 |
| P-05-sop | P-06 | 編號變 |
| P-06-pagemap | P-07 | 編號變 |
| P-07-uispec | P-08 + P-13 | 合併 |
| P-08-api | P-09 | 編號變 |
| P-09-data | P-10 + P-11 | 合併 |
| P-10-incident | P-12 | 編號變 |
| P-11-writers | P-16 新建 | 新 |
| P-99-errors-map | P-99 | — |

---

## B31-1：9 個 bug 修正（歷史）

| # | 檔案 | 變更 | 版本 |
|---|---|---|---|
| 1 | js/pages/database-yearrange.js | 修正清空起始年份被當 0 | v103.0.1 |
| 2 | js/core/auth-guard.js | 修正 fallback 用 uid 當 familyId | v103.0.12 |
| 3 | js/pages/insurance.js | 修正 payments 快取不刷新 | v103.0.37 |
| 4 | js/lib/merge.js | 加 family-change 重置快取 | v103.0.23 |
| 5 | js/core/db.js | saveInsurancePaymentBatch set→update | v103.0.35 |
| 6 | functions/api/_admin.js | 移除死代碼 | v103.0.23 |
| 7 | functions/api/_admin.js | 權限驗證提前 | v103.0.23 |
| 8 | js/pages/settings.js | 改用 listenPageMetadata | v103.0.35 |
| 9 | js/ui/modal.js | openConfirm 先 resolve 舊 Promise | v103.0.23 |

---

## 待辦

| 項目 | 狀態 |
|---|---|
| B32-1 docs 重建（第 4~6 批） | 📋 |
| SW 版本統一（v142 / v151 決策） | 📋 |
| END OF FILE 補齊（~44 檔代碼） | 📋 |
| 版本號不一致（依使用者指示） | 📋 日後修正 |

---

## 關聯檔案

| 主題 | 檔案 |
|---|---|
| 專案索引 | P-01-index.md |
| 檔案清單 | P-03-manifest.md |
| 決策 | P-04-decisions.md |

---

/* ═══ EOF ═══
F: docs/P-02-progress.md
V: 1791883200
B: B32-1
W: A20261013-001#010
═══ */
