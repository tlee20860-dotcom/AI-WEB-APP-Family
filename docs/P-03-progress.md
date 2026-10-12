# P-03 交付進度

最後更新：B29-10b
版本：v103.0.37
批次：B29-10b
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
| B29-8 | P-* 重組（14 檔） | ✅ |
| B29-9 | docs 補回（4 批 + 修正批） | ✅ |
| B29-10 | C-02 Token 視覺化 + 3 檔同步 | ✅ |

---

## B29-9：docs 補回

### 第 1 批（B29-9）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | C-02-rules.md | 加入 §0 Token 不足處理 |
| 2 | P-02-anchor.md | 完整補回（二~七、十~十四） |

### 修正批（B29-9a）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | C-02-rules.md | §0 開場白改 3 backtick；§六 加 backtick 嵌套強制檢查 |
| 2 | P-02-anchor.md | 三層資料流改 3 backtick |
| 3 | C-05-learning.md | 加 L-009（backtick 嵌套未自檢） |

### 第 2 批（B29-9b）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | C-04-delivery.md | 補回 11 項錯誤 + 檔案大小 + 命名 + 新規則 |
| 2 | P-14-refactor.md | 新建（從舊 refactor-plan.md 遷移） |

### 第 3 批（B29-9c）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | C-03-guide.md | 補回 Q1~Q14 FAQ + 動作模板 4 個 + 規則速查 |
| 2 | P-06-sop.md | 補回 Page Schema 結構完整欄位 |

### 第 4 批（B29-9d）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | P-12-incident.md | 補回 B12~B15 完整事故表 |
| 2 | P-10-data.md | 補回 B23 基金累積流程完整步驟 |

---

## B29-10：Token 視覺化 + 同步

### B29-10

| # | 檔案 | 變更 |
|---|---|---|
| 1 | C-02-rules.md | §0 調整（Token 足夠不需開場白）+ §0.5 新增 Token 視覺化 |

### B29-10a

| # | 檔案 | 變更 |
|---|---|---|
| 1 | C-03-guide.md | §五 +§九 +§十 +§十一 加 Token 提示；Q15 新增 |
| 2 | C-04-delivery.md | §四 +§十一 +§十二 +§十三 +§十四 加 Token 相關 |

### B29-10b（本批）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | P-02-anchor.md | §十一 加「Token 視覺化」關鍵字 |
| 2 | P-03-progress.md | 本檔（記錄 B29-9 / B29-10） |
| 3 | P-04-manifest.md | 版本更新 |

---

## B29 子批次（歷史）

### B29-1a：page-controls.js

| # | 變更 |
|---|---|
| 1 | 強制 viewToggle / sort 在 body |
| 2 | year + month 靠左同排 |

### B29-1b：column-registry.js

| # | 變更 |
|---|---|
| 1 | 加 6 columns |
| 2 | 加 sortable / filterable / filterOptions |

### B29-1c：data-table.js

| # | 變更 |
|---|---|
| 1 | 表頭排序 |
| 2 | 表頭篩選下拉 |

### B29-2a ~ B29-5d

| 批次 | 主題 |
|---|---|
| B29-2a | settlements.js columns 用 registry |
| B29-2b | insurance + member-report |
| B29-3 | finance-overview + input-center |
| B29-4a | HTML banner 上移 |
| B29-4b | components.css |
| B29-5a | page-metadata-registry.js（新） |
| B29-5b | db.js |
| B29-5c | page-engine.js |
| B29-5d | layout.css + settings.js |

### B29-7a / 7b / 8

| 批次 | 主題 |
|---|---|
| B29-7a | 刪 syncSubtitle（3 頁） |
| B29-7b | 刪 subtitle derived（2 頁） |
| B29-8 | 副標題修正（清 textContent） |

---

## 當前狀態

| 項目 | 值 |
|---|---|
| 當前批次 | B29-10b（docs 同步） |
| 當前部署 | B29 已測試通過 |
| 下一步 | 完成 P-04 更新，B30 起新功能 |

---

## 下一步

| 項目 | 狀態 |
|---|---|
| B29-10b 完成 | 🔄 進行中 |
| B30 起新功能 | 📋 待規劃 |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-03-progress.md
   Version: v103.0.37
   Batch: B29-10b
   ═══════════════════════════════════════════ */