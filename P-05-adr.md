# P-05 關鍵決策記錄（ADR）

最後更新：B29-8g
版本：v103.0.36
批次：B29
用途：記錄重大設計決策，避免反向改動

---

## 決策索引

| 編號 | 主題 | 時間 |
|---|---|---|
| ADR-001 | Page Schema 宣告式 | B01~B11 |
| ADR-002 | Functions 底線前綴 + Catch-all | B11 |
| ADR-003 | onDataChange 統一通知 | B18.1 |
| ADR-004 | Registry SSOT | B01 |
| ADR-005 | AI 優先原則 | B19 |
| ADR-006 | 無補丁原則 | B19 |
| ADR-007 | 批次號系統 | B19 |
| ADR-008 | docs 例外 | B21 |
| ADR-009 | 文檔寫作原則 | B21 |
| ADR-010 | 機會型重構 | B20 |
| ADR-011 | SW network-first | B11 |
| ADR-012 | 舊資料 normalize | B01 |
| ADR-013 | 8 個實體定義集中 | B06 |
| ADR-014 | entity-resolvers 集中顯示 | B18 |
| ADR-015 | 共用元件化 | B19 |
| ADR-016 | 基金分兩類 | B23 |
| ADR-017 | 基金快照 | B23 |
| ADR-018 | 保險扣款觸發基金累積 | B23 |
| ADR-019 | 版面規格保護 | B25 |
| ADR-020 | 側邊欄角色過濾 | B26-4 |
| ADR-021 | 頁面 metadata 可編輯 | B29 |
| ADR-022 | 表頭排序 / 篩選 | B29 |
| ADR-023 | 最小改動優先 | B29 |

---

## ADR-001：Page Schema 宣告式

| 項目 | 內容 |
|---|---|
| 背景 | v102 頁面層 9,000 行，重複度高 |
| 決策 | 頁面改寫為 Schema |
| 理由 | 頁面只描述「要什麼」；引擎解讀 + 渲染；SSOT 集中 |
| 影響 | 13 頁面從 ~700 行 → ~80 行；頁面層精簡 82% |
| 替代 | 保留命令式（重複度高）；MVC（過度工程） |

---

## ADR-002：Functions 底線前綴 + Catch-all

| 項目 | 內容 |
|---|---|
| 背景 | P01 事故，CF Pages Functions 路由 500 |
| 決策 | 主檔改 `_xxx.js`；用 `[[path]].js` 統一分派 |
| 理由 | CF 每個 URL 對應獨立實體檔；不支援跨檔 re-export |
| 影響 | Functions 從 13 檔 → 10 檔 |
| 禁止 | 新增獨立 `xxx.js`（除 `_xxx.js`） |

---

## ADR-003：onDataChange 統一通知

| 項目 | 內容 |
|---|---|
| 背景 | B18.1，customMount 頁面資料到達不更新 |
| 決策 | page-engine 加 `ctx.onDataChange(fn)` |
| 理由 | 統一通知；避免猴子補丁 |
| 影響 | 5 頁面受益；廢除所有猴子補丁 |
| 禁止 | 覆寫 `ctx.invalidate`；加快取變數判斷 |

---

## ADR-004：Registry SSOT

| 項目 | 內容 |
|---|---|
| 背景 | v102 狀態文字散落 15+ 檔 |
| 決策 | 抽 5 大 Registry + 1 |
| 理由 | 知識只存在一處；修改只改 1 處 |
| 禁止 | 硬編碼狀態字串；直接顯示 ID；欄位結構重複定義 |

**Registry**：

| Registry | 職責 |
|---|---|
| status-registry | 狀態系統 |
| entity-registry | 名稱解析 |
| label-registry | 顯示文字 |
| column-registry | 表格欄位 + 排序 / 篩選屬性 |
| constants | 全站常數 |
| page-metadata-registry | 頁面 metadata |

---

## ADR-005：AI 優先原則

| 項目 | 內容 |
|---|---|
| 背景 | 專案所有代碼皆由 AI 編寫 |
| 決策 | 不需為人類可讀性妥協 |
| 理由 | AI 讀取為主；簡潔 = 更少 token |
| 邊界 | export 名 / CSS class / API 路徑 / Firebase 欄位不受影響 |

---

## ADR-006：無補丁原則

| 項目 | 內容 |
|---|---|
| 背景 | B19，發現多處補丁思維 |
| 決策 | 能宣告就不手寫；能就地更新就不 destroy/create |
| 理由 | 補丁掩蓋症狀；長期維護成本高 |
| 影響 | block 加 `renderInPlace`；廢除快取變數判斷 |
| 邊界 | `__lastHtml` 快取為效能所需，不算違反 |

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
| 理由 | docs 為 AI 協作便利而存在 |
| 邊界 | 只限 docs；code（js / css / html）仍受限 |

---

## ADR-009：文檔寫作原則

| 項目 | 內容 |
|---|---|
| 背景 | 「用 code block 示範含 code block 的格式」導致嵌套問題 |
| 決策 | 示範用「規則 + 表格」 |
| 影響 | 全部 docs 改用表格；backtick 規則：外層 = 內層 + 1 |

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

## ADR-011：SW network-first（開發階段）

| 項目 | 內容 |
|---|---|
| 背景 | P10，stale 導致需訪問 2 次 |
| 決策 | 全部改 network-first |
| 理由 | 開發階段頻繁部署；一次生效 |
| 影響 | sw.js 全改 network-first；CACHE_NAME 每次部署升版 |
| 未來 | 正式階段可改回 stale |

---

## ADR-012：舊資料 normalize

| 項目 | 內容 |
|---|---|
| 背景 | 狀態名稱從「未付款」改為 `pending` |
| 決策 | 讀取時 normalize；寫入時寫新代碼；舊節點保留 |
| 補充 | B25-6 加一次性遷移（admin-migrate）供手動執行 |

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
| 影響 | entity-list-page 傳 resolvers |

---

## ADR-015：共用元件化（Modal / filter-sort）

| 項目 | 內容 |
|---|---|
| 背景 | B19，expense-modal 在 2 頁重複 |
| 決策 | 抽 lib/expense-modal.js + lib/income-modal.js + lib/filter-sort.js |
| 影響 | input-center.js -420 行；settlements.js -100 行 |
| 補充 | B29-3a：expense-modal 加 `mode` 參數 |

---

## ADR-016：基金分兩類（保險 / 獨立）

| 項目 | 內容 |
|---|---|
| 背景 | 使用者需求：每月供款 3500，按比例購買 3 款基金 |
| 決策 | 基金分 `type: 'insurance'` 與 `'standalone'` |
| 影響 | insurance_policies 加 fundsAllocation；funds 加 type / policyId |

---

## ADR-017：基金快照

| 項目 | 內容 |
|---|---|
| 背景 | 需每月記錄股數 / 股價 / 現值 / 盈虧 |
| 決策 | 每基金存 `snapshots/{year}/{month}` |
| 影響 | funds 加 snapshots 節點；portfolio 加快照 Modal |

---

## ADR-018：保險扣款觸發基金累積

| 項目 | 內容 |
|---|---|
| 背景 | 基金保險每月供款需自動分配到各基金 |
| 決策 | 結算清單改保險狀態為 done → 呼叫 `_accumulateFunds` |
| 禁止 | 手動修改 cumulativeCost |

---

## ADR-019：版面規格保護

| 項目 | 內容 |
|---|---|
| 背景 | P23，年度報表的年份切換器被早期改版移除 |
| 決策 | 每頁的區塊結構視為規格 |
| 理由 | AI 優化時可能無意砍掉區塊 |
| 影響 | page-map.md 加「頁面區塊規格」章節 |

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
| 背景 | B26-4，superadmin 無專屬 sidebar；一般帳號看到無關群組 |
| 決策 | SIDEBAR_GROUPS 每群組加 `roles` 陣列；`getSidebarGroupsByRole` 過濾 |
| 理由 | SSOT：單一 SIDEBAR_GROUPS；未來擴充只加 role |

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
| 理由 | 使用者自主；不需 AI 介入 |
| 影響 | page-engine 加 `_applyPageMetadata`；settings 加編輯卡 |

**顯示機制**：

| 元素 | 機制 |
|---|---|
| title | `textContent` 覆蓋 |
| subtitleStatic | `data-prefix` + CSS `::before` |

---

## ADR-022：表頭排序 / 篩選

| 項目 | 內容 |
|---|---|
| 背景 | B29，使用者要求表格支援排序 / 篩選 |
| 決策 | data-table.js 加表頭互動；column-registry 加屬性 |
| 理由 | 全站一致；取代控制列的 sort / source 下拉 |
| 影響 | 6 頁 JS 移除本地 columns；column-registry 加 6 columns |

**欄位屬性**：

| 屬性 | 說明 |
|---|---|
| `sortable: true` | 可排序 |
| `filterable: true` | 可篩選 |
| `filterOptions: [...]` | 篩選選項 |

---

## ADR-023：最小改動優先

| 項目 | 內容 |
|---|---|
| 背景 | B29 期間發現多次「未掃描實際檔數就估算」 |
| 決策 | 提方案前必跑 5 問自檢；交付摘要附「最小改動對比」 |
| 理由 | 避免過度設計；避免大規模改動 |
| 影響 | C-02-rules 加 5 問；P-99-errors-map 加防範項 |

**5 問自檢**：

| # | 問題 |
|---|---|
| 1 | 能不能只改 1 檔？ |
| 2 | 能否改集中層？ |
| 3 | 各檔改動可否用「預設值」吸收？ |
| 4 | 可否加參數（向後相容）解決？ |
| 5 | 現有架構是否已提供切入點？ |

---

## 關聯檔案

| 主題 | 檔案 |
|---|---|
| 通用規則 | C-02-rules.md |
| 專案錨點 | P-02-anchor.md |
| 事故日誌 | P-12-incident.md |
| 學習日誌 | C-05-learning.md |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-05-adr.md
   Version: v103.0.36
   Batch: B29-8g
   ═══════════════════════════════════════════ */