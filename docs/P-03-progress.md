# P-03 交付進度

最後更新：B29-8c
版本：v103.0.36
批次：B29
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
| B29-7 | C-* 6 檔（共用） | ✅ |
| B29-8 | P-* 重組（進行中） | 🔄 |

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

**注意**：portfolio 自繪卡片，不需改。

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
| 1 | page-engine 清 textContent |
| 2 | input-center / database / settings HTML page-header 統一結構 |

### B29-7：C-* 6 檔（共用）

| # | 檔案 | 狀態 |
|---|---|---|
| 1 | C-00-startup.md | ✅ |
| 2 | C-01-profile.md | ✅ |
| 3 | C-02-rules.md | ✅ |
| 4 | C-03-guide.md | ✅ |
| 5 | C-04-delivery.md | ✅ |
| 6 | C-05-learning.md | ✅ |

### B29-8：P-* 重組（進行中）

| # | 檔案 | 狀態 |
|---|---|---|
| 1 | P-01-index.md | ✅ |
| 2 | P-99-errors-map.md | ✅ |
| 3 | P-02-anchor.md | ✅ |
| 4 | P-13-glossary.md | ✅ |
| 5 | P-03-progress.md | ✅ 本檔 |
| 6 | P-11-compat.md | ✅ |
| 7 | P-04-manifest.md | 📋 |
| 8 | P-05-adr.md | 📋 |
| 9 | P-06-sop.md | 📋 |
| 10 | P-07-pagemap.md | 📋 |
| 11 | P-08-uispec.md | 📋 |
| 12 | P-09-api.md | 📋 |
| 13 | P-10-data.md | 📋 |
| 14 | P-12-incident.md | 📋 |

---

## B29 期间发现问题

| # | 问题 | 修复批次 |
|---|---|---|
| 1 | 年月 select 高亮不动 | B29-1a |
| 2 | 月份边界 / 双重渲染 | B29-1a |
| 3 | 副标题动态不重要（删除） | B29-7 |
| 4 | 副标题未取代（硬编码残留） | B29-8 |

---

## B29 教训

| # | 教训 |
|---|---|
| 1 | 未盘点实际 banner 页数（估 10，实 2） |
| 2 | 未思考集中层强制 |
| 3 | 未检查现有 API 复用 |
| 4 | 未用 CSS ::before 替代 5 页 compose |

**完整教训**：C-05-learning.md

---

## 当前状态

| 项目 | 值 |
|---|---|
| 当前批次 | B29-8（P-* 重组） |
| 当前部署 | B29 已测试通过 |
| 下一步 | 完成剩余 7 个 P-* 档 |

---

## 下一步

| 项目 | 状态 |
|---|---|
| P-* 剩余 7 档 | 🔄 进行中 |
| B30 起新功能 | 📋 待规划 |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-03-progress.md
   Version: v103.0.36
   Batch: B29-8c
   ═══════════════════════════════════════════ */