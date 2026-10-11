# 交付進度

最後更新：B25-7
當前批次：B25
狀態：B25 已部署測試中

---

## 總覽

| 批次 | 主題 | 檔案數 | 狀態 |
|---|---|---|---|
| B01 ~ B19 | 重構階段 | 見 incident-log | ✅ |
| B20 | 第二輪測試修復 | 10 | ✅ |
| B21 | docs 重構 | 14 | ✅ |
| B22 | 第三輪測試修復 | 9 | ✅ |
| B23 | 基金保險分支 | 8 | ✅ |
| B24 | docs 更新 + 診斷報告 | 14 | ✅ |
| B25 | 全站修復（含 B25-1 ~ B25-7） | 27 + 6 docs | ⏳ 待測 |

---

## B25 子批次

### B25-1：docs 規則（2 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | docs/anchor.md | 新增 0.19 / 0.20 / 0.21 / 0.22 |
| 2 | docs/page-map.md | 加「各頁可編輯欄位對照」+「頁面區塊規格」 |

### B25-2：Modal 基礎設施（5 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | js/ui/modal.js | 自動綁定 ESC |
| 2 | js/entity/entity-funds-allocation.js | R1 走 ui/modal + 穩定選擇器 |
| 3 | js/entity/entity-modal.js | 傳 defaultYM |
| 4 | js/pages/portfolio.js | H5 + H6 |
| 5 | js/shared/column-settings.js | H4 destroyModal |

### B25-3：Action 契約 + 狀態入口（6 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | js/shared/data-table.js | R2 customActions 互斥 |
| 2 | js/shared/data-card.js | R3 hasActions 補 custom |
| 3 | js/lib/expense-modal.js | mode 參數 |
| 4 | insurance.html | 移除 sync-all-btn |
| 5 | js/pages/settlements.js | D2(a) 接線 + mode: 'settle' |

### B25-3c/d：settlements 修正（1 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | js/pages/settlements.js | 期間判斷 + hideCompleted 修正 |

### B25-4：Registry + SSOT（9 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | js/config/entity-registry.js | R6 ENTITY_TYPE_MAP |
| 2 | js/core/db.js | 加 getBanksOnce / getInsuranceCompaniesOnce |
| 3 | js/lib/insurance.js | H8 走 status-registry |
| 4 | js/lib/merge.js | H8 fallback |
| 5 | js/core/utils.js | H2 + L7 |
| 6 | js/entity/entity-helpers.js | M1 + M2 |
| 7 | js/entity/entity-resolvers.js | M2 |
| 8 | js/lib/bank.js | M7 移除佔位 |
| 9 | functions/api/_helpers.js | H3 去重複 |

### B25-5/5.1：部署資產 + 語意（7 + 2 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | sw.js | R4 補 5 檔 + v140 |
| 2 | js/config/constants.js | L2 APP_VERSION |
| 3 | js/config/firebase-config.js | L3 END |
| 4 | js/config/app-config.js | END |
| 5 | js/ui/toast.js | M5 setTimeout |
| 6 | js/ui/view-toggle.js | R5 syncAppState |
| 7 | js/pages/annual-report.js | R5 連帶 |
| 8 | css/pages/annual-report.css | P23 年份/月份按鈕 |
| 9 | js/pages/annual-report.js | P23 switcher |

### B25-6：一次性資料遷移（4 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | functions/api/[[path]].js | admin-migrate 分派 |
| 2 | functions/api/_admin.js | handleAdminMigrate |
| 3 | js/core/api.js | adminMigrate |
| 4 | js/pages/settings.js | 遷移卡（superadmin only） |

### B25-7：docs 收尾（6 檔）

| # | 檔案 | 狀態 |
|---|---|---|
| 1 | docs/file-manifest.md | ✅ |
| 2 | docs/progress.md | ✅ 本檔 |
| 3 | docs/incident-log.md | ✅ |
| 4 | docs/page-map.md | ✅ |
| 5 | docs/adr.md | ✅ |
| 6 | docs/README.md | ✅ |

---

## 待處理（P 系列）

| 編號 | 主題 | 優先 |
|---|---|---|
| P22 | 年月切換需重整 | 🟠 高 |
| P24 | 全站佈局 + superadmin sidebar + 遷移按鈕方案 C | 🟠 高 |

---

## 已完成問題（B25 修復）

| 編號 | 主題 | 修復批次 |
|---|---|---|
| 問題 1 | 關聯基金 Modal 不顯示 | B25-2 |
| 問題 2 | 雙重按鈕 | B25-3a |
| 問題 3 | 卡片無按鈕 | B25-3a |
| 問題 4 | 狀態入口分散 | B25-3b |
| 問題 5 | 供滿保單仍顯示 | B25-3c |
| 問題 6 | hideCompleted 誤過濾 | B25-3d |
| P20 | 供滿保單列出（同問題 5） | B25-3c |
| P21 | hideCompleted 誤過濾（同問題 6） | B25-3d |
| P23 | 年份按鈕設計退化 | B25-5.1 |

---

## 下一步

| 項目 | 狀態 |
|---|---|
| B25 部署測試 | ⏳ 進行中 |
| P22 診斷 + 修復 | 📋 待處理 |
| P24 方案設計 + 交付 | 📋 待處理 |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/progress.md
   Version: v103.0.22
   Batch: B25-7
   ═══════════════════════════════════════════ */