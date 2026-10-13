# P-03 交付進度

最後更新：B30-9
版本：v103.0.40
批次：B30-9
狀態：B30-9 已測試通過

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
| B30-9 | docs 記錄 Spck Editor 上傳失誤 | ✅ 本批 |

**本次階段性總結 @ B30-9**（上次總結：B30-6）

---

## B30-9：docs 記錄上傳失誤

| # | 檔案 | 變更 |
|---|---|---|
| 1 | `C-05-learning.md` | 加 L-014（Spck Editor 上傳失誤） |
| 2 | `C-02-rules.md` | 加 §十六（上傳檔案自我檢查） |
| 3 | `P-12-incident.md` | 加 P30（基金成本）+ P31（上傳失誤） |
| 4 | `P-03-progress.md` | 本檔 |
| 5 | `P-04-manifest.md` | 版本號更新 |

---

## B30-8：基金成本修正

| # | 檔案 | 變更 |
|---|---|---|
| 1 | `js/lib/insurance.js` | 加 `calcFundCostEstimate` / `calcFundCostFromPayments` |
| 2 | `js/pages/portfolio.js` | 成本按比例分配；手動成本先扣除 |
| 3 | `js/entity/entity-definitions.js` | 基金保險不強制覆蓋 `annualPremium` |
| 4 | `js/pages/insurance.js` | 卡片加「已供款總額」與「剩餘供款」 |

---

## B30-7：付款類型驗證

| # | 檔案 | 變更 |
|---|---|---|
| 1 | `js/entity/entity-definitions.js` | POLICY 依付款類型驗證；新增 `oncePremium` |
| 2 | `js/lib/insurance.js` | 加 `calcMonthlyExpense`（後移至 B30-8） |

---

## B30-6：階段總結

| # | 檔案 | 變更 |
|---|---|---|
| 1 | `C-07-summary.md` | 新建 |
| 2 | `C-02-rules.md` | 精簡 |
| 3 | `C-04-delivery.md` | 加交付類型標示 |
| 4 | `C-05-learning.md` | 加 L-012 / L-013 |
| 5 | `C-06-token-log.md` | 加記錄方法 |
| 6 | `P-02-anchor.md` | 加 icons/ + C-06 / C-07 |
| 7 | `P-01-index.md` | 加 C-06 / C-07 |

---

## B30-5：後端 DB 切換

| # | 檔案 | 變更 |
|---|---|---|
| 1 | `functions/api/_config.js` | `export let` + `initConfig(env)` |
| 2 | `functions/api/_helpers.js` | 改從 `getApiKey()` 讀 |
| 3 | `functions/api/[[path]].js` | 每個 `onRequest*` 呼叫 `initConfig(env)` |

**CF 設定**：

| 部署 | 環境變數 |
|---|---|
| 新網頁 | `DB_TARGET=new` |
| 舊網頁 | `DB_TARGET=old` |

---

## B30-3 系列：主題

| 批次 | 檔案 | 變更 |
|---|---|---|
| B30-3 | theme.css | Tailwind 色板 |
| B30-3b | state.js / navbar.js / components.css | DB 標籤 + 主題切換 |
| B30-3d | theme.css / components.css | 實色按鈕 / 色條 |
| B30-3-2 | 5 檔 CSS | 硬編碼改走變數 |

---

## B30-1 / B30-2

| 批次 | 檔案 | 變更 |
|---|---|---|
| B30-1 | settings.html | `requireFamily: false` |
| B30-2 | firebase-config.js / constants.js | URL 切 DB + storage 前綴 |

---

## 當前狀態

| 項目 | 值 |
|---|---|
| 當前批次 | B30-9 |
| 當前部署 | B30-8 已測試通過 |
| 下一步 | B31 起新功能 |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-03-progress.md
   Version: v103.0.40
   Batch: B30-9
   ═══════════════════════════════════════════ */
