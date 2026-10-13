# P-04 關鍵決策記錄 + 重構歷程

最後更新：B32-1
Version: 1791883200
Batch: B32-1
Writer: A20261013-001#010
用途：關鍵決策 + 重構史（合併原 P-05 + P-14）

---

## 決策索引

| 編號 | 主題 |
|---|---|
| ADR-001 | Page Schema 宣告式 |
| ADR-002 | Functions 底線前綴 + Catch-all |
| ADR-003 | onDataChange 統一通知 |
| ADR-004 | Registry SSOT |
| ADR-005 | AI 優先原則 |
| ADR-006 | 無補丁原則 |
| ADR-007 | 批次號系統 |
| ADR-008 | docs 例外 |
| ADR-009 | 文檔寫作原則 |
| ADR-010 | 機會型重構 |
| ADR-011 | SW network-first |
| ADR-012 | 舊資料 normalize |
| ADR-013 | 8 個實體定義集中 |
| ADR-014 | entity-resolvers 集中顯示 |
| ADR-015 | 共用元件化 |
| ADR-016 | 基金分兩類 |
| ADR-017 | 基金快照 |
| ADR-018 | 保險扣款觸發基金累積 |
| ADR-019 | 版面規格保護 |
| ADR-020 | 側邊欄角色過濾 |
| ADR-021 | 頁面 metadata 可編輯 |
| ADR-022 | 表頭排序 / 篩選 |
| ADR-023 | 最小改動優先 |
| ADR-024 | AI 編號 + Writer 機制 |
| ADR-025 | Version 用 Unix epoch |
| ADR-026 | md 檔案零三反引號 |

---

## ADR-001：Page Schema 宣告式

| 項目 | 內容 |
|---|---|
| 背景 | v102 頁面層 9,000 行，重複度高 |
| 決策 | 頁面改寫為 Schema |
| 理由 | 頁面只描述「要什麼」；引擎解讀 + 渲染 |
| 影響 | 13 頁面從 ~700 行 → ~80 行 |

---

## ADR-002：Functions 底線前綴 + Catch-all

| 項目 | 內容 |
|---|---|
| 背景 | P01 事故，CF Pages Functions 路由 500 |
| 決策 | 主檔改 _xxx.js；用 [[path]].js 統一分派 |
| 理由 | CF 每個 URL 對應獨立實體檔；不支援跨檔 re-export |
| 影響 | Functions 從 13 檔 → 10 檔 |
| 禁止 | 新增獨立 xxx.js |

---

## ADR-003：onDataChange 統一通知

| 項目 | 內容 |
|---|---|
| 背景 | B18.1，customMount 頁面資料到達不更新 |
| 決策 | page-engine 加 ctx.onDataChange(fn) |
| 禁止 | 覆寫 ctx.invalidate；加快取變數判斷 |

---

## ADR-004：Registry SSOT

| 項目 | 內容 |
|---|---|
| 背景 | v102 狀態文字散落 15+ 檔 |
| 決策 | 抽 5 大 Registry + 1 |
| 禁止 | 硬編碼狀態字串；直接顯示 ID |

**Registry**：

| Registry | 職責 |
|---|---|
| status-registry | 狀態系統 |
| entity-registry | 名稱解析 |
| label-registry | 顯示文字 |
| column-registry | 表格欄位 |
| constants | 全站常數 |
| page-metadata-registry | 頁面 metadata |

---

## ADR-005：AI 優先原則

| 項目 | 內容 |
|---|---|
| 背景 | 專案所有代碼皆由 AI 編寫 |
| 決策 | 不需為人類可讀性妥協 |
| 邊界 | export 名 / CSS class / API 路徑 / Firebase 欄位不受影響 |

---

## ADR-006：無補丁原則

| 項目 | 內容 |
|---|---|
| 背景 | B19，發現多處補丁思維 |
| 決策 | 能宣告就不手寫；能就地更新就不 destroy/create |
| 影響 | block 加 renderInPlace |
| 邊界 | __lastHtml 快取為效能所需，不算違反 |

---

## ADR-007：批次號系統

| 項目 | 內容 |
|---|---|
| 背景 | 使用者反饋「波次 / 專案版本 / 檔案版本」說法混亂 |
| 決策 | 統一使用批次號 |
| 格式 | B01~B99 → C01~C99 → D01~D99；重交付 B{n}.{x} |

---

## ADR-008：docs 例外

| 項目 | 內容 |
|---|---|
| 背景 | 規則「能不加檔就不加檔」 |
| 決策 | docs 例外 |
| 邊界 | 只限 docs |

---

## ADR-009：文檔寫作原則

| 項目 | 內容 |
|---|---|
| 背景 | 「用 code block 示範含 code block 的格式」導致嵌套問題 |
| 決策 | 示範用「規則 + 表格」 |
| 影響 | backtick 規則：外層 = 內層 + 1 |

---

## ADR-010：機會型重構

| 項目 | 內容 |
|---|---|
| 背景 | 使用者要求「每次交付都檢查舊代碼」 |
| 決策 | 分 A / B / C 級處理 |
| 影響 | 改動範圍 ≤ 30% 檔案 |

**分級**：

| 級別 | 處理 |
|---|---|
| 🟥 A 級 | 一定順便改 |
| 🟧 B 級 | 順便改，需記錄 |
| 🟨 C 級 | 記錄但不改 |

---

## ADR-011：SW network-first

| 項目 | 內容 |
|---|---|
| 背景 | P10，stale 導致需訪問 2 次 |
| 決策 | 全部改 network-first |
| 未來 | 正式階段可改回 stale |

---

## ADR-012：舊資料 normalize

| 項目 | 內容 |
|---|---|
| 背景 | 狀態名稱從「未付款」改為 pending |
| 決策 | 讀取時 normalize；寫入時寫新代碼；舊節點保留 |
| 補充 | B25-6 加一次性遷移（admin-migrate） |

---

## ADR-013：8 個實體定義集中

| 項目 | 內容 |
|---|---|
| 背景 | 表單欄位散落各頁 |
| 決策 | entity-definitions.js 集中 |
| 影響 | 新增實體只改 1 檔 |

**8 實體**：member / bank / policy / fund / category / item / payment / status

---

## ADR-014：entity-resolvers 集中顯示

| 項目 | 內容 |
|---|---|
| 背景 | P17-06，保險受保人顯示 ID |
| 決策 | 新增 entity-resolvers.js |

---

## ADR-015：共用元件化

| 項目 | 內容 |
|---|---|
| 背景 | B19，expense-modal 在 2 頁重複 |
| 決策 | 抽 lib/expense-modal.js + lib/income-modal.js + lib/filter-sort.js |
| 影響 | input-center.js -420 行；settlements.js -100 行 |
| 補充 | B29-3a：expense-modal 加 mode 參數 |

---

## ADR-016：基金分兩類

| 項目 | 內容 |
|---|---|
| 背景 | 使用者需求：每月供款 3500，按比例購買 3 款基金 |
| 決策 | 基金分 type: 'insurance' 與 'standalone' |
| 影響 | insurance_policies 加 fundsAllocation；funds 加 type / policyId |

---

## ADR-017：基金快照

| 項目 | 內容 |
|---|---|
| 背景 | 需每月記錄股數 / 股價 / 現值 / 盈虧 |
| 決策 | 每基金存 snapshots/{year}/{month} |

---

## ADR-018：保險扣款觸發基金累積

| 項目 | 內容 |
|---|---|
| 背景 | 基金保險每月供款需自動分配到各基金 |
| 決策 | 結算清單改保險狀態為 done → 呼叫 _accumulateFunds |
| 禁止 | 手動修改 cumulativeCost |

---

## ADR-019：版面規格保護

| 項目 | 內容 |
|---|---|
| 背景 | P23，年度報表的年份切換器被早期改版移除 |
| 決策 | 每頁的區塊結構視為規格 |

**允許 / 禁止**：

| 動作 | 允許 |
|---|---|
| 改區塊內部實作 | ✅ |
| 新增區塊（標示） | ✅ |
| 使用者明確要求刪除 | ✅ |
| 未經確認刪除區塊 | ❌ |
| 未經確認改容器 ID | ❌ |

---

## ADR-020：側邊欄角色過濾

| 項目 | 內容 |
|---|---|
| 背景 | B26-4，superadmin 無專屬 sidebar |
| 決策 | SIDEBAR_GROUPS 每群組加 roles 陣列；getSidebarGroupsByRole 過濾 |

**角色可見**：

| 角色 | 可見群組 |
|---|---|
| superadmin | 平台管理 + 系統 |
| owner | 全部家庭群組 + 系統 |
| member | 同 owner |

---

## ADR-021：頁面 metadata 可編輯

| 項目 | 內容 |
|---|---|
| 背景 | B29，使用者要求頁面標題 / 副標題可自訂 |
| 決策 | 新增 page-metadata-registry.js + Firebase 儲存 + page-engine 應用 |

**顯示機制**：

| 元素 | 機制 |
|---|---|
| title | textContent 覆蓋 |
| subtitleStatic | data-prefix + CSS ::before |

---

## ADR-022：表頭排序 / 篩選

| 項目 | 內容 |
|---|---|
| 背景 | B29，使用者要求表格支援排序 / 篩選 |
| 決策 | data-table.js 加表頭互動；column-registry 加屬性 |

**欄位屬性**：

| 屬性 | 說明 |
|---|---|
| sortable: true | 可排序 |
| filterable: true | 可篩選 |
| filterOptions: [...] | 篩選選項 |

---

## ADR-023：最小改動優先

| 項目 | 內容 |
|---|---|
| 背景 | B29 期間發現多次「未掃描實際檔數就估算」 |
| 決策 | 提方案前必跑 5 問自檢；交付摘要附「最小改動對比」 |

---

## ADR-024：AI 編號 + Writer 機制

| 項目 | 內容 |
|---|---|
| 背景 | 使用者難以在歷史對話中定位最新版代碼 |
| 決策 | 對話編號 + 回覆序號 + Writer 寫入 EOF |
| 影響 | 可搜索定位、可追溯編寫者 |

**格式**：

| 項目 | 格式 |
|---|---|
| 對話編號 | A{YYYYMMDD}-{序號3位} |
| 回覆序號 | #001 ~ #999 |
| Writer | A{YYMMDD}-{序號}#{回覆序號} |

---

## ADR-025：Version 用 Unix epoch

| 項目 | 內容 |
|---|---|
| 背景 | v103.0.xx 格式無法一眼判斷新舊 |
| 決策 | Version 改用 Unix epoch（10 位數字） |
| 影響 | B32-1 起新制；舊制保留不回溯 |
| 唯一性 | 同秒交付加 -01 / -02 |

---

## ADR-026：md 檔案零三反引號

| 項目 | 內容 |
|---|---|
| 背景 | md 內三反引號被渲染成灰框 + 複製按鈕 |
| 決策 | md 內禁用三反引號 |
| 替代 | 展示用引用塊；單行用行內反引號；真代碼另存 |

---

## 重構歷程（原 P-14 摘要）

### 方案選擇

| 方案 | 檔案數 | 行數 | 頁面層 | 風險 |
|---|---|---|---|---|
| A 最小修復 | 104 | 28,000 | 9,000 | 極低 |
| B 模組化 | 89 | 24,000 | 7,500 | 低 |
| C Registry | 91 | 22,000 | 6,500 | 中 |
| D Blocks | 92 | 21,000 | 5,000 | 中 |
| E 響應式 | 90 | 20,000 | 3,000 | 中高 |
| **F 終極宣告式** | **95** | **19,300** | **1,200** | **中高** |

**選擇 F 理由**：一次性解決所有問題；頁面精簡 87%；未來新增頁面只需 Schema。

### 三層架構

| 層級 | 職責 | 檔案 |
|---|---|---|
| L1 頁面層 | 純 Schema | js/pages/*.js |
| L2 引擎層 | 解讀 + 生命週期 | js/engines/*.js |
| L3 核心層 | Registry + Block + State + API | js/config, blocks, core |

### 重構成果

| 項目 | v102 | v103.0.19 |
|---|---|---|
| 檔案數 | 104 | 約 118 |
| 頁面層行數 | 9,000 | ~1,600 |
| Registry 集中 | 0 | 5 |
| Engine | 0 | 3 |
| Block | 0 | 5 |
| Page Schema | 0 | 13 |

### 重構期間挑戰

詳見 P-10-incident.md。

| 批次 | 主題 |
|---|---|
| B12 | 阻斷級修復（B01~B07） |
| B13 | SSOT 統一（H01~H11） |
| B14 | 中優先（M01~M18） |
| B15 | 低優先（L01~L07） |
| B16 | 第二輪測試 |
| B17 | 第三輪測試 |
| B18 | entity-resolvers |
| B19 | 無補丁重構 |
| B20 | 第四輪測試 |

---

## 關聯檔案

| 主題 | 檔案 |
|---|---|
| 通用規則 | C-02-rules.md |
| 專案索引 | P-01-index.md |
| 事故日誌 | P-10-incident.md |
| 學習日誌 | C-05-learning.md |

---

/* ═══ EOF ═══
F: docs/P-04-decisions.md
V: 1791883200
B: B32-1
W: A20261013-001#010
═══ */
