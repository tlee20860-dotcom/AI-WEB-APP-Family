# P-12 事故日誌

最後更新：B29-9d
版本：v103.0.37
批次：B29-9d
適用批次：B11 ~ B29

**用途**：記錄歷史問題，避免重複犯錯

---

## 一、總覽

| 批次 | 編號 | 主題 | 嚴重度 |
|---|---|---|---|
| B11 | P01~P13 | 首次部署 | 🔴 |
| B12 | B01~B07 | 阻斷級修復 | 🔴 |
| B13 | H01~H11 | SSOT 統一 | 🟠 |
| B14 | M01~M18 | 中優先 | 🟡 |
| B15 | L01~L07 | 低優先 | 🟢 |
| B16 | P16-01~05 | 第二輪測試 | 🟠 |
| B17 | P17-01~06 | 第三輪測試 | 🔴 |
| B18 | — | entity-resolvers | 🟡 |
| B18.1 | — | onDataChange | 🟡 |
| B19 | — | 無補丁重構 | 🟡 |
| B20 | P18-01~05 | 第四輪測試 | 🟠 |
| B22 | P19-01~03 | 第五輪測試 | 🟠 |
| B23 | — | 基金保險分支 | 🟡 |
| B24 | — | 診斷報告 | 🟡 |
| B25 | P20~P24 | 全站修復 | 🟠 |
| B26 | — | 全站優化 | 🟠 |
| B29 | P25~P28 | 表頭 + metadata | 🟠 |

---

## 二、B29：表頭排序 + 頁面 metadata（P25~P28）

### P25 年月 select 高亮不動

| 項目 | 內容 |
|---|---|
| 症狀 | 點月份按鈕後，資料更新但按鈕高亮沒變 |
| 原因 | `page-controls.js` 的 `year` / `month` 值在 customMount 快照一次，之後不更新 |
| 解決 | 改為內部直接讀寫 AppState（B29-1a） |
| 引入批次 | B29-1a（AI 引入） |
| 修復批次 | B29-1a |
| 教訓 | 動態值應內部讀 AppState，不由外部傳入快照 |

### P26 月份邊界 / 雙重渲染

| 項目 | 內容 |
|---|---|
| 症狀 | 月份顯示「0 月」；filter / viewSwitcher 雙重渲染 |
| 原因 A | `prevM = cur - 1` 未處理 < 1 情況 |
| 原因 B | toolbar 過濾未排除 filter / viewSwitcher |
| 解決 | 邊界顯示「—」+ disabled；過濾排除 |
| 引入批次 | B29-1a |
| 修復批次 | B29-1a |
| 教訓 | 邊界值需特判；toolbar 過濾需完整 |

### P27 副標題未取代

| 項目 | 內容 |
|---|---|
| 症狀 | 設定副標題「-」→ 顯示「-所有交易資料的統一輸入入口」 |
| 原因 | HTML 硬編碼 `<p class="page-subtitle">...</p>`；page-engine 只加 `data-prefix`，未清空 textContent |
| 解決 | page-engine `_applyPageMetadata` 清空 textContent（B29-8） |
| 引入批次 | B29-5c |
| 修復批次 | B29-8 |
| 教訓 | 動態注入時需清空既有內容 |

### P28 page-header 同行（3 頁遺漏）

| 項目 | 內容 |
|---|---|
| 症狀 | input-center / database / settings 副標題與標題同行 |
| 原因 | B26-3.2 只改 7 頁；B29-4a 只改 insurance / settlements；漏 3 頁 |
| 解決 | 統一 page-header 結構（B29-8） |
| 引入批次 | B26-3.2 |
| 修復批次 | B29-8 |
| 教訓 | 全站結構改動需完整掃描 |

---

## 三、B25：全站修復（P20~P24）

### P20 供滿保單仍顯示

| 項目 | 內容 |
|---|---|
| 症狀 | 供滿後月份仍列「HK$ 0」 |
| 原因 | `_loadInsuranceRows` 未檢查保單期間 |
| 解決 | 用 `getPeriodInfo()` 判斷 |
| 引入批次 | B25-3b |
| 修復批次 | B25-3c |

### P21 hideCompleted 誤過濾

| 項目 | 內容 |
|---|---|
| 症狀 | 結算清單完全沒資料 |
| 原因 | `hideCompleted` 放進 `filters`，被 `applyFilters` 誤當 row 過濾 |
| 解決 | 移出 `filters` |
| 引入批次 | B25-3c |
| 修復批次 | B25-3d |

### P22 年月切換需重整

| 項目 | 內容 |
|---|---|
| 症狀 | navbar 切換後需 F5 |
| 原因 | `filters.year/month` 未同步 |
| 解決 | `reload()` 開頭同步 |
| 引入批次 | 早於 B25 |
| 修復批次 | B26-2 |

### P23 年份 / 月份按鈕設計退化

| 項目 | 內容 |
|---|---|
| 症狀 | 年份切換器從 3 按鈕退為一排 |
| 解決 | 恢復 3 按鈕（後於 B29 改 select） |
| 修復批次 | B25-5.1 |

### P24 全站佈局 + superadmin sidebar

| 項目 | 內容 |
|---|---|
| 症狀 A | 各頁佈局不統一 |
| 症狀 B | superadmin 無專屬 sidebar |
| 症狀 C | 遷移按鈕死代碼 |
| 解決 | B26-3~6 修復 |

---

## 四、B22：第五輪測試（P19-01~03）

### P19-01 view toggle 反向 + 卡片無資料

| 項目 | 內容 |
|---|---|
| 症狀 | 表格模式顯示卡片；卡片模式無資料 |
| 原因 A | data-card 找 `fields`，但頁面傳 `columns` |
| 原因 B | mobileCardMode: true 導致手機自動轉卡片 |
| 解決 | data-card 支援 columns；移除 mobileCardMode |

### P19-02 保險 / 銀行沒 toggle

| 項目 | 內容 |
|---|---|
| 症狀 | 保險 / 銀行頁無卡片/表格切換 |
| 原因 | B20 只加 toggle 到 4 頁 |
| 解決 | 兩頁加 initViewToggle + HTML 容器 |

### P19-03 年度報表統計卡不隨切換

| 項目 | 內容 |
|---|---|
| 症狀 | 切到月度明細，統計卡仍顯示全年 |
| 原因 | statsCards deps 只有 state.year |
| 解決 | statsCards 依 view 動態回傳 |

---

## 五、B20：第四輪測試（P18-01~05）

| 編號 | 症狀 | 原因 | 解決 |
|---|---|---|---|
| P18-01 | 多頁缺 view toggle | 頁面未初始化 | 各頁呼叫 + HTML 加容器 |
| P18-02 | 年度報表月度明細沒資料 | view-toggle 硬編碼 | 加 cardValue/tableValue |
| P18-03 | 已供滿保單不能展開 | insurance.js 遺漏 | 加展開 handler |
| P18-04 | 副標題顯示「載入中」 | 未更新副標題 | 各頁 syncSubtitle |
| P18-05 | 側欄不能滑到底 | flex 子項缺 min-height | 加 min-height |

---

## 六、B17：第三輪測試（P17-01~06）

| 編號 | 症狀 | 原因 | 解決 |
|---|---|---|---|
| P17-01 | 年度報表資料沒顯示 | derived 依賴非同步 | 改用 blocks |
| P17-02 | 基金表格沒資料 | 只有 stats block | 加 table block |
| P17-03 | 年月沒連動 | customMount 沒訂閱 | 加 onYearMonthChange |
| P17-04 | 類別顯示 ID | resolver 只 escapeHtml | resolveName |
| P17-05 | 輸入中心沒支出 | listenAllMemberExpenses(null, null) | 改用 listenAllExpenses |
| P17-06 | 保險持單人顯示 ID | 沒傳 resolvers | 新增 entity-resolvers |

---

## 七、B16：第二輪測試（P16-01~05）

| 編號 | 症狀 | 原因 | 解決 |
|---|---|---|---|
| P16-01 | 新增支出開錯 Modal | input-center.js 佔位 | 寫新支出 Modal |
| P16-02 | 年度報表缺月度明細 | 未實作 | 加年份 + 月份切換 |
| P16-03 | 成員名稱顯示 push key | resolver 只 escapeHtml | resolveName |
| P16-04 | 系統設定缺成員資料 | customMount 只保留 Tab | 補 _initPersonalTab |
| P16-05 | 基金版面沒資料 | display:none 隱藏 | 改 blocks |

---

## 八、B15：低優先修復（L01~L07）

| 編號 | 主題 | 說明 |
|---|---|---|
| L01 | 小排版問題 | 次要 UI 微調 |
| L02 | 空狀態文字 | 統一為 label-registry |
| L03 | Toast 訊息 | 統一為 label-registry |
| L04 | 按鈕 hover | CSS 微調 |
| L05 | 表頭欄寬 | CSS 微調 |
| L06 | 卡片間距 | CSS 微調 |
| L07 | 次要註解 | 移除裝飾性註解 |

**處理批次**：B15
**影響檔案**：5 檔（CSS + 少數 JS）

---

## 九、B14：中優先修復（M01~M18）

| 編號 | 主題 | 說明 |
|---|---|---|
| M01 | 年月切換器位置 | 移入 page-controls |
| M02 | 統計卡格式 | 統一走 format.js |
| M03 | 空狀態顯示 | 統一 empty-state 結構 |
| M04 | 卡片高度 | 統一 min-height |
| M05 | 表格欄寬 | 統一 table-layout |
| M06 | Modal 寬度 | 統一 max-width |
| M07 | 銀行餘額檢查 | 佔位實作（B25-4 移除） |
| M08 | 支出 Modal 欄位順序 | 依 entity-definitions |
| M09 | 收入 Modal 欄位順序 | 同上 |
| M10 | 保險 Modal 欄位 | 分組顯示 |
| M11 | 基金 Modal 欄位 | 分組顯示 |
| M12 | 類別下拉排序 | 依 order |
| M13 | 項目下拉排序 | 依 categoryId + order |
| M14 | 支付方式顯示 | 走 entity-registry |
| M15 | 狀態顯示 | 走 status-registry |
| M16 | 年份範圍限制 | 依 settings/year_range |
| M17 | UI 常數集中 | settings/ui_constants |
| M18 | 成員排序 | 依 order |

**處理批次**：B14
**影響檔案**：12 檔

---

## 十、B13：SSOT 統一（H01~H11）

| 編號 | 主題 | 說明 |
|---|---|---|
| H01 | 狀態字串硬編碼 | 全走 status-registry |
| H02 | 名稱解析分散 | 全走 entity-registry |
| H03 | 顯示文字分散 | 全走 label-registry |
| H04 | 表格欄位重複定義 | 全走 column-registry |
| H05 | 常數散落 | 全走 constants.js |
| H06 | esc 重複實作 | 全走 lib/dom.js |
| H07 | format 重複實作 | 全走 lib/format.js |
| H08 | 狀態顯示文字 | 全走 status.label（依 source） |
| H09 | 銀行交易分類 | 全走 constants.BANK_TXN_CATEGORIES |
| H10 | 支付模式 | 全走 constants.PAYMENT_MODES |
| H11 | 角色標籤 | 全走 label-registry.roles |

**處理批次**：B13
**影響檔案**：17 檔
**核心目標**：5 Registry 全面接管

---

## 十一、B12：阻斷級修復（B01~B07）

| 編號 | 症狀 | 原因 | 解決 |
|---|---|---|---|
| B01 | 檔案內容錯誤 | 複製貼上誤覆蓋 | 完全重寫目標檔 |
| B02 | 舊 import 路徑殘留 | 檔案搬移未全域搜尋 | 全域搜尋舊路徑 |
| B03 | page-engine customMount 遺漏 | 未呼叫 | 加 customMount 支援 |
| B04 | page-engine 修正遺漏 | 依賴圖 key 不一致 | 加 'data.' 前綴 |
| B05 | derived 對 undefined 崩潰 | 非同步初始未到 | 加 undefined 檢查 |
| B06 | app-shell 靜態 import 崩潰 | 缺失時整檔失敗 | 改動態 import |
| B07 | 阻斷級相關 | 多項阻斷性問題 | B12 全面修復 |

**處理批次**：B12
**影響檔案**：5 檔 + 刪 7 檔（舊子目錄）
**目的**：阻斷級問題清零

---

## 十二、B11：首次部署（P01~P13）

| 編號 | 症狀 | 原因 | 解決 |
|---|---|---|---|
| P01 | CF Functions 路由 500 | 跨檔 re-export 不支援 | 底線前綴 + Catch-all |
| P02 | HTML 缺 .html 匹配 .js | CF 路由優先序 | 所有連結加 .html |
| P03 | _redirects 循環 | 對 / 加 200 改寫 | 刪除 _redirects |
| P04 | page-engine 缺 customMount | 未呼叫 | 加 customMount 支援 |
| P05 | _onKeyChange 缺 data. 前綴 | 依賴圖 key 不一致 | 加 'data.' 前綴 |
| P06 | esc 從錯誤檔導入 | import 路徑錯 | 從 lib/dom.js |
| P07 | derived 對 undefined 崩潰 | 非同步初始未到 | 加 undefined 檢查 |
| P08 | 手機無 Console | — | 內嵌 vConsole |
| P09 | app-shell 靜態 import 崩潰 | 缺失時整檔失敗 | 改動態 import |
| P10 | SW stale 需訪問 2 次 | stale-while-revalidate | 全改 network-first |
| P11 | GitHub 檔案未真正更新 | 快取 | GitHub 網頁編輯 |
| P12 | database.js 內容錯誤 | 複製貼上誤覆蓋 | 完全重寫 |
| P13 | js/shared/* 舊 import 路徑 | 檔案搬移 | 全部按 v103 覆蓋 |

---

## 十三、歷史重演警告

| 類型 | 首次 | 再次 | 防止 |
|---|---|---|---|
| 複製貼上誤覆蓋 | P12 | B01 | 交付前確認目標 |
| page-engine 修正遺漏 | P07 | B04 | 改 engine 需回歸測試 |
| 舊 import 路徑殘留 | P13 | B02 | 搬移後全域搜尋 |
| view toggle 遺漏 | P18-01 | P19-02 | 新頁必加 |
| 狀態字串硬編碼 | H01 | H8 | 全走 registry |
| 自我引入 bug | P20 | P21 | 交付前全鏈路 |
| 全站結構改動不完整 | B26-3.2 | B29-8（P28） | 改前完整掃描 |
| 動態值快照 | P22 | P25 | 內部讀 AppState |
| 未清空既有內容 | — | P27 | 動態注入時清空 |
| backtick 嵌套 | — | B29-9 | 交付前強制檢查 |

---

## 十四、核心教訓總結

### CF Pages

| 教訓 | 說明 |
|---|---|
| Functions 路由 | 每個 URL 對應獨立實體檔 |
| 不支援 shim | 用底線前綴 + Catch-all |
| 靜態檔案 | 所有連結帶 .html |
| _redirects | 不要對 / 加規則 |

### Page Engine

| 教訓 | 說明 |
|---|---|
| customMount | 必須支援 |
| onDataChange | 必須支援 |
| 依賴圖 | key 與事件觸發一致 |
| undefined | derived 需容忍 |
| 動態值 | 內部讀 AppState，不傳快照 |
| 動態注入 | 需清空既有內容 |

### 程式碼

| 教訓 | 說明 |
|---|---|
| esc 路徑 | 從 lib/dom.js |
| format* 路徑 | 從 lib/format.js |
| 檔案搬移 | 全域搜尋舊路徑 |
| 無補丁 | 寧願重寫 |
| 狀態字串 | 一律走 status-registry |
| filters | 只放 row 過濾欄位 |
| 邊界值 | 需特判 |

### 交付

| 教訓 | 說明 |
|---|---|
| 先方案後交付 | 待確認 |
| 完整檔案 | 不 diff |
| END OF FILE | 檢查完整性 |
| 檔案 ≤ 500 行 | 拆檔 |
| backtick 嵌套 | 外層 = 內層 + 1 |
| 自我引入 bug 風險 | 交付前全鏈路 |
| 全站結構改動 | 完整掃描 |
| 最小改動 | 5 問自檢 |

### 方案設計（B29 教訓）

| 教訓 | 說明 |
|---|---|
| 未盤點實際範圍 | 估 10 檔前先 grep 掃描 |
| 未思考集中層強制 | 優先集中層 |
| 未檢查 API 複用 | 找複用機會 |
| 未用 CSS 替代 | ::before / data-prefix 等技巧 |

---

## 十五、關聯檔案

| 主題 | 檔案 |
|---|---|
| 錯誤摘要（AI 交付前必讀） | P-99-errors-map.md |
| 學習日誌（累積） | C-05-learning.md |
| 通用規則 | C-02-rules.md |
| 重構計畫 | P-14-refactor.md |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-12-incident.md
   Version: v103.0.37
   Batch: B29-9d
   ═══════════════════════════════════════════ */