# P-10 事故日誌

最後更新：2026-10-21
Version: 1792581022
Writer: ai-system-20261021-004#22
用途：記錄歷史問題，避免重複犯錯

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
| B19 | — | 無補丁重構 | 🟡 |
| B20 | P18-01~05 | 第四輪測試 | 🟠 |
| B22 | P19-01~03 | 第五輪測試 | 🟠 |
| B23 | — | 基金保險分支 | 🟡 |
| B24 | — | 診斷報告 | 🟡 |
| B25 | P20~P24 | 全站修復 | 🟠 |
| B26 | — | 全站優化 | 🟠 |
| B29 | P25~P28 | 表頭 + metadata | 🟠 |
| B30-5 | P29 | 後端 DB 切換 | 🔴 |
| B30-8 | P30 | 基金成本計算錯誤 | 🟠 |
| B30-9 | P31 | Spck Editor 上傳失誤 | 🟠 |
| B31-1 | B31-1-B1~B9 | 9 個 bug 修正 | 🟠 |

---

## 二、B31-1：9 個 bug 修正

| # | 檔案 | 症狀 | 根因 | 修法 |
|---|---|---|---|---|
| B31-1-B1 | database-yearrange.js | 清空起始年份 → 被當 0 | form-builder number 欄位 Number('')===0 | 改從 DOM 直讀 value |
| B31-1-B2 | auth-guard.js | fallback 時 API 全失效 | fallback 用 user.uid 當 familyId | 不覆蓋既有 familyId |
| B31-1-B3 | pages/insurance.js | 已供款資訊不刷新 | _lastIds id 快取擋住 payments 更新 | 訂閱 insurance_payments |
| B31-1-B4 | lib/merge.js | 換家庭後狀態解析錯誤 | 模組級快取未監聽 family-change | 加 AppState.on('family-change') |
| B31-1-B5 | core/db.js | 廢棄函式會清欄位 | set 覆蓋而非 update 合併 | 改 update + 標 @deprecated |
| B31-1-B6 | _admin.js | 死代碼 | _migrate_check_expenses 寫入即刪 | 移除 |
| B31-1-B7 | _admin.js | 驗證順序 | 先驗 uid 再驗權限 | 權限驗證提前 |
| B31-1-B8 | pages/settings.js | 違反 SSOT | 硬編碼 Firebase URL 動態 import | 改用 listenPageMetadata |
| B31-1-B9 | ui/modal.js | 脆弱設計 | _confirmResolve 全域單一 | 開新前先 resolve 舊 |

---

## 三、B30-9：Spck Editor 上傳失誤（P31）

### P31：portfolio.js 被 insurance.js 內容覆蓋

| 項目 | 內容 |
|---|---|
| 症狀 | 修改「東方匯理基金成本」後，畫面數字未變 |
| 原因 A | 在 Spck Editor 手動修改時，把 insurance.js 的代碼貼到了 portfolio.js |
| 原因 B | 只 Commit 未 Push |
| 解決 | 重新貼上正確的 portfolio.js 代碼 |
| 教訓 | 上傳前必須逐一核對「檔名 ↔ 內容」 |

---

## 四、B30-8：基金成本計算錯誤（P30）

### P30：基金成本未按比例分配

| 項目 | 內容 |
|---|---|
| 症狀 | 四支基金投入成本皆顯示 199,500，總計 798,000 |
| 原因 A | _resolveCost 未乘以該基金在保單中的比例（pct） |
| 原因 B | 手動輸入成本的基金比例為 0，被計算為 0 |
| 解決 | 修正 _resolveCost：先扣除手動成本，剩餘按比例分配 |

---

## 五、B30-5：後端 DB 切換（P29）

### P29：後端永遠連舊 DB

| 項目 | 內容 |
|---|---|
| 症狀 | superadmin 登入新 DB 後，API 顯示「需要超級管理員權限」 |
| 原因 A | _config.js 寫死舊 DB URL + API Key |
| 原因 B | CF Pages 不支援 process.env → 改用 context.env |
| 原因 C | 移除 FIREBASE_DB_URL export → 依賴模組崩潰 |
| 解決 | export let + initConfig(env) + handler 傳遞 |
| 教訓 | CF Pages env 走 handler 參數；不得移除既有 export |

---

## 六、B29：表頭排序 + 頁面 metadata（P25~P28）

| 編號 | 症狀 | 原因 | 解決 |
|---|---|---|---|
| P25 | 年月 select 高亮不動 | page-controls.js 的 year / month 值在 customMount 快照一次 | 改為內部直接讀寫 AppState |
| P26 | 月份顯示「0 月」；雙重渲染 | prevM = cur - 1 未處理 < 1 | 邊界顯示「—」+ disabled |
| P27 | 副標題未取代 | HTML 硬編碼；page-engine 只加 data-prefix | page-engine 清空 textContent |
| P28 | page-header 同行（3 頁遺漏） | B26-3.2 只改 7 頁 | 統一 page-header 結構 |

---

## 七、B25~B26：全站修復（P20~P24）

| 編號 | 症狀 | 原因 | 解決 |
|---|---|---|---|
| P20 | 供滿保單仍顯示 | _loadInsuranceRows 未檢查保單期間 | 用 getPeriodInfo 判斷 |
| P21 | hideCompleted 誤過濾 | hideCompleted 放進 filters | 移出 filters |
| P22 | 年月切換需重整 | filters.year/month 未同步 | reload() 開頭同步 |
| P23 | 年份 / 月份按鈕設計退化 | — | 恢復 3 按鈕 |
| P24 | 全站佈局 + superadmin sidebar | — | B26-3~6 修復 |

---

## 八、早期事故（B11~B22，精簡版）

### B22：第五輪測試（P19-01~03）

| 編號 | 症狀 | 原因 | 解決 |
|---|---|---|---|
| P19-01 | view toggle 反向 + 卡片無資料 | data-card 找 fields，頁面傳 columns | data-card 支援 columns |
| P19-02 | 保險 / 銀行沒 toggle | B20 只加 4 頁 | 兩頁加 initViewToggle |
| P19-03 | 年度報表統計卡不隨切換 | statsCards deps 只有 state.year | 依 view 動態回傳 |

### B20：第四輪測試（P18-01~05）

| 編號 | 症狀 | 原因 | 解決 |
|---|---|---|---|
| P18-01 | 多頁缺 view toggle | 頁面未初始化 | 各頁呼叫 + HTML 加容器 |
| P18-02 | 年度報表月度明細沒資料 | view-toggle 硬編碼 | 加 cardValue/tableValue |
| P18-03 | 已供滿保單不能展開 | insurance.js 遺漏 | 加展開 handler |
| P18-04 | 副標題顯示「載入中」 | 未更新副標題 | 各頁 syncSubtitle |
| P18-05 | 側欄不能滑到底 | flex 子項缺 min-height | 加 min-height |

### B17：第三輪測試（P17-01~06）

| 編號 | 症狀 | 原因 | 解決 |
|---|---|---|---|
| P17-01 | 年度報表資料沒顯示 | derived 依賴非同步 | 改用 blocks |
| P17-02 | 基金表格沒資料 | 只有 stats block | 加 table block |
| P17-03 | 年月沒連動 | customMount 沒訂閱 | 加 onYearMonthChange |
| P17-04 | 類別顯示 ID | resolver 只 escapeHtml | resolveName |
| P17-05 | 輸入中心沒支出 | listenAllMemberExpenses(null, null) | 改用 listenAllExpenses |
| P17-06 | 保險持單人顯示 ID | 沒傳 resolvers | 新增 entity-resolvers |

### B16：第二輪測試（P16-01~05）

| 編號 | 症狀 | 原因 | 解決 |
|---|---|---|---|
| P16-01 | 新增支出開錯 Modal | input-center.js 佔位 | 寫新支出 Modal |
| P16-02 | 年度報表缺月度明細 | 未實作 | 加年份 + 月份切換 |
| P16-03 | 成員名稱顯示 push key | resolver 只 escapeHtml | resolveName |
| P16-04 | 系統設定缺成員資料 | customMount 只保留 Tab | 補 _initPersonalTab |
| P16-05 | 基金版面沒資料 | display:none 隱藏 | 改 blocks |

### B15：低優先（L01~L07）

小排版 / 空狀態文字 / Toast 訊息 / 按鈕 hover / 表頭欄寬 / 卡片間距 / 次要註解。

### B14：中優先（M01~M18，摘要）

M01 年月切換器位置 / M02 統計卡格式 / M03 空狀態顯示 / M04 卡片高度 / M05 表格欄寬 / M06 Modal 寬度 / M07 銀行餘額檢查 / M08 支出 Modal 欄位順序 / M09 收入 Modal 欄位順序 / M10 保險 Modal 欄位 / M11 基金 Modal 欄位 / M12 類別下拉排序 / M13 項目下拉排序 / M14 支付方式顯示 / M15 狀態顯示 / M16 年份範圍限制 / M17 UI 常數集中 / M18 成員排序

### B13：SSOT 統一（H01~H11）

H01 狀態字串硬編碼 / H02 名稱解析分散 / H03 顯示文字分散 / H04 表格欄位重複定義 / H05 常數散落 / H06 esc 重複實作 / H07 format 重複實作 / H08 狀態顯示文字 / H09 銀行交易分類 / H10 支付模式 / H11 角色標籤

### B12：阻斷級（B01~B07）

| 編號 | 症狀 | 原因 | 解決 |
|---|---|---|---|
| B01 | 檔案內容錯誤 | 複製貼上誤覆蓋 | 完全重寫目標檔 |
| B02 | 舊 import 路徑殘留 | 檔案搬移未全域搜尋 | 全域搜尋舊路徑 |
| B03 | page-engine customMount 遺漏 | 未呼叫 | 加 customMount 支援 |
| B04 | page-engine 修正遺漏 | 依賴圖 key 不一致 | 加 data. 前綴 |
| B05 | derived 對 undefined 崩潰 | 非同步初始未到 | 加 undefined 檢查 |
| B06 | app-shell 靜態 import 崩潰 | 缺失時整檔失敗 | 改動態 import |
| B07 | 阻斷級相關 | 多項阻斷性問題 | B12 全面修復 |

### B11：首次部署（P01~P13，摘要）

P01 CF Functions 路由 500 / P02 HTML 缺 .html 匹配 .js / P03 _redirects 循環 / P04 page-engine 缺 customMount / P05 _onKeyChange 缺 data. 前綴 / P06 esc 從錯誤檔導入 / P07 derived 對 undefined 崩潰 / P08 手機無 Console / P09 app-shell 靜態 import 崩潰 / P10 SW stale 需訪問 2 次 / P11 GitHub 檔案未真正更新 / P12 database.js 內容錯誤 / P13 js/shared/* 舊 import 路徑

---

## 九、歷史重演警告

| 類型 | 首次 | 再次 | 防止 |
|---|---|---|---|
| 複製貼上誤覆蓋 | P12 | B01 / P31 | 交付前確認目標 |
| page-engine 修正遺漏 | P07 | B04 | 改 engine 需回歸測試 |
| 舊 import 路徑殘留 | P13 | B02 | 搬移後全域搜尋 |
| view toggle 遺漏 | P18-01 | P19-02 | 新頁必加 |
| 狀態字串硬編碼 | H01 | H8 | 全走 registry |
| 自我引入 bug | P20 | P21 | 交付前全鏈路 |
| 全站結構改動不完整 | B26-3.2 | B29-8 | 改前完整掃描 |
| 動態值快照 | P22 | P25 | 內部讀 AppState |
| 未清空既有內容 | — | P27 | 動態注入時清空 |
| backtick 嵌套 | — | B29-9 | 交付前強制檢查 |
| 後端寫死舊 DB | — | P29 | 用 env + initConfig |
| 移除 export 崩潰 | — | P29 | 用 export let |
| 基金成本未按比例 | — | P30 | 動態分配 |
| 上傳檔案失誤 | P12 | P31 | 推送前逐一核對 |
| md 內三反引號 | — | B32-1 | 零三反引號 |
| 編號 / 序號未標 | — | B32-1 | 強制 9 條 |

---

## 十、核心教訓總結

### CF Pages

| 教訓 | 說明 |
|---|---|
| Functions 路由 | 每個 URL 對應獨立實體檔 |
| 不支援 shim | 用底線前綴 + Catch-all |
| 靜態檔案 | 所有連結帶 .html |
| _redirects | 不要對 / 加規則 |
| 環境變數 | 走 handler { env }，非 process.env |

### Page Engine

| 教訓 | 說明 |
|---|---|
| customMount | 必須支援 |
| onDataChange | 必須支援 |
| 依賴圖 | key 與事件觸發一致 |
| undefined | derived 需容忍 |
| 動態值 | 內部讀 AppState |
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
| export 相容 | 用 export let |

### 交付

| 教訓 | 說明 |
|---|---|
| 先方案後交付 | 待確認 |
| 完整檔案 | 不 diff |
| EOF | 檢查完整性 |
| 檔案 ≤ 800 行 | 拆檔 |
| backtick 嵌套 | 外層 = 內層 + 1 |
| md 零三反引號 | 用引用塊 |
| 編號 + 序號 | 每次回覆必標 |
| Writer | EOF 必填 |

---

## 十一、關聯檔案

| 主題 | 檔案 |
|---|---|
| 錯誤摘要 | P-99-errors-map.md |
| 學習日誌 | 體系 R-04-learning.md |
| 通用規則 | 體系 R-00-rules.md |
| 決策 | P-04-adr-index.md |
| CF Pages 規則 | W-02-functions.md |
| PWA 規則 | W-04-pwa.md |

---

/* ═══ EOF ═══
F: P-10-incident.md
V: 1792581022
W: ai-system-20261021-004#22
═══ */