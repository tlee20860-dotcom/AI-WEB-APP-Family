# 交付進度

最後更新：B29-6c
當前批次：B29
狀態：B29 已部署測試通過

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

---

## B29 子批次

### B29-1a：page-controls.js

| # | 變更 |
|---|---|
| 1 | 強制 viewToggle / sort 在 body |
| 2 | year + month 靠左同排 |

### B29-1b：column-registry.js

| # | 變更 |
|---|---|
| 1 | 加 6 columns（settlements / insurancePolicies / bankAccounts / bankTransactions / recentExpense） |
| 2 | 加 sortable / filterable / filterOptions 屬性 |

### B29-1c：data-table.js

| # | 變更 |
|---|---|
| 1 | 表頭點擊排序（升 / 降 / 清除） |
| 2 | 表頭篩選下拉 |

### B29-2a：settlements.js

| # | 變更 |
|---|---|
| 1 | columns 用 registry |
| 2 | 移除 sort / source（改表頭） |

### B29-2b：insurance + member-report

| # | 變更 |
|---|---|
| 1 | columns 用 registry |

### B29-3：finance-overview + input-center

| # | 變更 |
|---|---|
| 1 | columns 用 registry |

**注意**：portfolio 自繪卡片，不需改（依 anchor 0.25）

### B29-4a：HTML + input-center.js

| # | 變更 |
|---|---|
| 1 | insurance.html / settlements.html banner 上移 |
| 2 | input-center.js 刪支出 Tab banner |

### B29-4b：components.css

| # | 變更 |
|---|---|
| 1 | 加 `.page-banner` |
| 2 | 加 dt-* 樣式 |

### B29-5a：page-metadata-registry.js（新）

| # | 變更 |
|---|---|
| 1 | 每頁預設 title / subtitleStatic |
| 2 | getPageKeyFromUrl / getDefaultMetadata / listPages |

### B29-5b：db.js

| # | 變更 |
|---|---|
| 1 | listenPageMetadata / savePageMetadata |

### B29-5c：page-engine.js

| # | 變更 |
|---|---|
| 1 | _applyPageMetadata（title 覆蓋 + subtitle data-prefix） |

### B29-5d：layout.css + settings.js

| # | 變更 |
|---|---|
| 1 | layout.css 加 ::before 規則 |
| 2 | settings.js 加「頁面標題」卡 |

### B29-7a：insurance + settlements + finance-overview

| # | 變更 |
|---|---|
| 1 | 刪 syncSubtitle（動態副標題） |

### B29-7b：dashboard + member-report

| # | 變更 |
|---|---|
| 1 | 刪 subtitle derived / syncSubtitle |

### B29-8：副標題修正

| # | 變更 |
|---|---|
| 1 | page-engine 清 textContent（避免硬編碼殘留） |
| 2 | input-center / database / settings HTML page-header 統一結構 |

### B29-6：docs 收尾

| # | 檔案 | 狀態 |
|---|---|---|
| 1 | docs/anchor.md | ✅ |
| 2 | docs/ai-guide.md | ✅ |
| 3 | docs/file-manifest.md | ✅ |
| 4 | docs/progress.md | ✅ 本檔 |
| 5 | docs/README.md | ✅ |
| 6 | docs/ui-spec.md | 待交付 |
| 7 | docs/page-map.md | 待交付 |
| 8 | docs/incident-log.md | 待交付 |

---

## B29 期間發現問題

| # | 問題 | 修復批次 |
|---|---|---|
| 1 | 年月 select 高亮不動 | B29-1a（內部讀 AppState） |
| 2 | 月份邊界 / 雙重渲染 | B29-1a |
| 3 | 副標題動態不重要（刪除） | B29-7 |
| 4 | 副標題未取代（硬編碼殘留） | B29-8 |

---

## B29 教訓（納入 anchor 0.25）

| # | 教訓 |
|---|---|
| 1 | 未盤點實際 banner 頁數（估 10，實 2） |
| 2 | 未思考集中層強制（切換位置） |
| 3 | 未檢查現有 API 複用（頁面標題） |
| 4 | 未用 CSS ::before 替代 5 頁 compose |

---

## 目前狀態

| 項目 | 值 |
|---|---|
| 當前批次 | B29-6（docs 收尾） |
| 當前部署 | B29 已測試通過 |
| 下一步 | docs 收尾（B29-6d） |

---

## 下一步

| 項目 | 狀態 |
|---|---|
| B29-6d 交付 | 🔄 進行中 |
| B30 起新功能 | 📋 待規劃 |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/progress.md
   Version: v103.0.36
   Batch: B29-6c
   ═══════════════════════════════════════════ */