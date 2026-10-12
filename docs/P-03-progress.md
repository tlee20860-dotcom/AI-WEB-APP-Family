# P-03 交付進度

最後更新：B30-5
版本：v103.0.38
批次：B30-5
狀態：B30-5 已部署測試通過

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
| B29-7 | C-* 6 檔（共用） | ✅ |
| B29-8 | P-* 重組（14 檔） | ✅ |
| B29-9 | docs 補回（4 批 + 修正批） | ✅ |
| B29-10 | C-02 Token 視覺化 + 3 檔同步 | ✅ |
| B30-1 | settings.html 加 requireFamily:false | ✅ |
| B30-2 | URL 切 DB + storage 前綴 | ✅ |
| B30-3 | 主題 A 家庭暖陽（Tailwind 色板） | ✅ |
| B30-3b | navbar DB 標籤 + 主題切換 | ✅ |
| B30-5 | 後端 DB 切換（CF env） | ✅ |
| B30-5-docs | docs 同步（本批） | 🔄 |

---

## B30-5：後端 DB 切換

### 背景

superadmin 登入新 DB 後，API 顯示「需要超級管理員權限」。根因：後端 `_config.js` 寫死舊 DB URL + API Key。

### 修復

| # | 檔案 | 變更 |
|---|---|---|
| 1 | `functions/api/_config.js` | `export let` + `initConfig(env)` 動態切 DB |
| 2 | `functions/api/_helpers.js` | 改從 `getApiKey()` 讀 |
| 3 | `functions/api/[[path]].js` | 每個 `onRequest*` 呼叫 `initConfig(env)` |

### CF 設定

| 部署 | 環境變數 |
|---|---|
| 新網頁 | `DB_TARGET=new` |
| 舊網頁 | `DB_TARGET=old` |

### 測試結果

| # | 項目 | 結果 |
|---|---|---|
| 1 | 新網頁 superadmin 登入 | ✅ |
| 2 | 平台管理 → 家庭清單 | ✅ 正常載入 |
| 3 | 系統設定 → 遷移卡 | ✅ 正常 |

---

## B30-3b：navbar DB 標籤 + 主題切換

| # | 檔案 | 變更 |
|---|---|---|
| 1 | `js/core/state.js` | 加 `theme` 狀態 + `setTheme` / `getTheme` / `toggleTheme` |
| 2 | `js/layout/navbar.js` | 加 DB 標籤 + 主題按鈕 |
| 3 | `css/components.css` | 加 `.navbar-right` / `.navbar-db-tag` / `.navbar-theme-btn` |

---

## B30-3：主題 A 家庭暖陽（Tailwind 色板）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | `css/theme.css` | 全面改 Tailwind 色板（亮色 + 深色） |
| 2 | `css/components.css` | 實色按鈕 / 色條 / 實色 badge / 表格加深 |
| 3 | `css/layout.css` | 硬編碼深色改走變數 |
| 4 | `css/utilities.css` | 同上 |
| 5 | `css/pages/annual-report.css` | 同上 |
| 6 | `css/pages/insurance.css` | 同上 |

---

## B30-2：URL 切 DB + storage 前綴

| # | 檔案 | 變更 |
|---|---|---|
| 1 | `js/config/firebase-config.js` | 支援 `?db=old` / `?db=new` |
| 2 | `js/config/constants.js` | `DB_TARGET` 解析 + 所有 storage key 加 DB 前綴 |

---

## B30-1：settings.html 加 requireFamily:false

| # | 檔案 | 變更 |
|---|---|---|
| 1 | `settings.html` | `initApp` 加 `requireFamily: false` |

---

## B29 系列（歷史）

### B29-10b

| # | 檔案 | 變更 |
|---|---|---|
| 1 | P-02 / P-03 / P-04 | 同步 Token 視覺化 |

### B29-10a

| # | 檔案 | 變更 |
|---|---|---|
| 1 | C-03 / C-04 | 同步 Token 視覺化 |

### B29-10

| # | 檔案 | 變更 |
|---|---|---|
| 1 | C-02 | 加 Token 視覺化 |

### B29-9

| # | 檔案 | 變更 |
|---|---|---|
| 1 | C-02 / P-02 / C-04 / P-14 / C-03 / P-06 / P-12 / P-10 | 補回 |

### B29-8

| # | 檔案 | 變更 |
|---|---|---|
| 1 | P-* | 重組（14 檔） |

### B29-7

| # | 檔案 | 變更 |
|---|---|---|
| 1 | C-* | 6 檔（共用） |

### B29 主批次

| 批次 | 主題 |
|---|---|
| B29-1a | page-controls 強制 viewToggle / sort 在 body |
| B29-1b | column-registry 加 6 columns |
| B29-1c | data-table 表頭排序 / 篩選 |
| B29-2a | settlements 用 registry |
| B29-2b | insurance + member-report |
| B29-3 | finance-overview + input-center |
| B29-4a | HTML banner 上移 |
| B29-4b | components.css |
| B29-5a | page-metadata-registry.js（新） |
| B29-5b | db.js |
| B29-5c | page-engine.js |
| B29-5d | layout.css + settings.js |
| B29-7a | 刪 syncSubtitle（3 頁） |
| B29-7b | 刪 subtitle derived（2 頁） |
| B29-8 | 副標題修正 |

---

## 當前狀態

| 項目 | 值 |
|---|---|
| 當前批次 | B30-5（docs 同步中） |
| 當前部署 | B30-5 已測試通過 |
| 下一步 | 完成 docs 同步，B31 起新功能 |

---

## 下一步

| 項目 | 狀態 |
|---|---|
| B30-5-docs 完成 | 🔄 進行中 |
| icon 更換 | 📋 待規劃 |
| docs 版本號統一 | 📋 待規劃 |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-03-progress.md
   Version: v103.0.38
   Batch: B30-5
   ═══════════════════════════════════════════ */