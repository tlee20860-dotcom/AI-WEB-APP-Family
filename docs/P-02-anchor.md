# P-02 專案錨點（家庭財務 Web App）

最後更新：B29-9a
版本：v103.0.37
批次：B29-9a
用途：本專案技術架構（通用規則見 C-02）

---

## 一、專案身份

| 項目 | 內容 |
|---|---|
| 專案 | 家庭財務與固定供款管理 Web App |
| GitHub | family-fin-v2 |
| 部署 | Cloudflare Pages |
| 資料庫 | Firebase RTDB (asia-southeast1) |
| 登入 | Firebase Auth（自訂帳號 @familyfin.local） |
| 前端 | 純 HTML + CSS + ES Module JS |
| 後端 | Cloudflare Pages Functions |
| 視覺 | 深色科幻霓虹（Cyan / Magenta / Emerald） |
| 金額 | 四捨五入至整數 |

---

## 二、核心架構原則

| 原則 | 說明 |
|---|---|
| SSOT 極大化 | 任何知識只存在一處 |
| 宣告式 > 命令式 | 頁面只描述「要什麼」 |
| 舊資料 100% 相容 | 讀取時 normalize |
| 操作邏輯不變 | 只改實作方式 |
| 無補丁 | 能宣告就不手寫，能就地更新就不 destroy/create |

**三層資料流**（內層 3 backtick）：

```
Firebase RTDB → data-engine → page-engine → derived → block → DOM
```

---

## 三、5 大 Registry

| Registry | 職責 |
|---|---|
| status-registry.js | 狀態系統 |
| entity-registry.js | 名稱解析 |
| label-registry.js | 顯示文字 |
| column-registry.js | 表格欄位 + 排序 / 篩選屬性 |
| constants.js | 全站常數 |

**附加 registry**：

| Registry | 職責 |
|---|---|
| page-metadata-registry.js | 頁面 title / subtitle 預設 |

---

## 四、3 大引擎

| 引擎 | 職責 |
|---|---|
| page-engine.js | 解讀 Schema、生命週期、onDataChange、頁面 metadata |
| data-engine.js | Firebase 訂閱 + 衍生 |
| render-engine.js | 掛載 UI 區塊 |

---

## 五、5 大 Block

| Block | 職責 |
|---|---|
| stats-block.js | 統計卡區 |
| list-block.js | 列表區 |
| filter-block.js | 篩選列區 |
| detail-block.js | 明細展開區 |
| form-block.js | 表單 Modal 區 |

---

## 六、Page Schema 欄位

| 欄位 | 類型 | 說明 |
|---|---|---|
| title | string | 頁面標題 |
| data | object | Firebase 訂閱配置 |
| state | object | 響應式狀態初始值 |
| derived | object | 衍生資料計算 |
| blocks | array | UI 區塊 |
| onYearMonthChange | function | 年月變更 hook（可選） |
| customMount | function | 逃生艙（可選） |

**customMount 回傳**：

| 欄位 | 說明 |
|---|---|
| destroy | 清理函式 |

**ctx 提供**：

| 方法 | 用途 |
|---|---|
| ctx.onDataChange(fn) | 訂閱資料變更 |
| ctx.setState(path, val) | 設 state |
| ctx.invalidate(key) | 觸發重算 |

---

## 七、page-controls（統一控制列）

**模組**：`js/lib/page-controls.js`

**config 結構**：

| 欄位 | 說明 |
|---|---|
| containerId | body 容器 ID（`page-controls-root`） |
| headerContainerId | header 容器 ID（`page-header-actions`） |
| items | 元素陣列 |

**items 元素結構**：

| 欄位 | 說明 |
|---|---|
| type | 內建 type 或 'custom' |
| align | 'left' / 'right' |
| position | 'header'（部分 type 除外） |

**內建 type**：

| type | 說明 | position |
|---|---|---|
| add | 新增按鈕 | 任意 |
| export | 匯出按鈕 | 任意 |
| viewToggle | 卡片/表格切換 | **強制 body** |
| viewSwitcher | 檢視切換 | body |
| sort | 排序下拉 | **強制 body** |
| year | 年份下拉 | body（左側） |
| month | 月份下拉 | body（左側） |
| filter | 自訂篩選 | body |
| custom | 逃生艙 | 任意 |

**year / month 內部讀寫 AppState（各頁不需傳值）**。

---

## 八、側邊欄角色過濾

**模組**：`js/config/constants.js` + `js/layout/sidebar.js`

**SIDEBAR_GROUPS 每群組加 `roles` 陣列**。

**角色可見群組**：

| 角色 | 可見群組 |
|---|---|
| superadmin | 平台管理 + 系統 |
| owner | 全部家庭群組 + 系統 |
| member | 同 owner |

**對外函式**：`getSidebarGroupsByRole(role)`

---

## 九、頁面 metadata

**模組**：`js/config/page-metadata-registry.js` + `js/engines/page-engine.js`

**儲存**：`families/{familyId}/settings/page_metadata/{pageKey}`

**結構**：`{ title, subtitleStatic }`

**顯示機制**：

| 元素 | 機制 |
|---|---|
| title | `textContent` 覆蓋 |
| subtitleStatic | `data-prefix` + CSS `::before` |

**動態副標題已於 B29-7 刪除**（原 5 頁：dashboard / insurance / settlements / finance-overview / member-report）。

---

## 十、目標檔案結構

| 目錄 | 檔數 | 內容 |
|---|---|---|
| js/config | 8 | constants / firebase-config / app-config / 4 Registry / page-metadata-registry |
| js/core | 8 | state / api / db / auth / auth-guard / utils / pwa / debug |
| js/lib | 12 | dom / async / lifecycle / registry / merge / insurance / bank / format / expense-modal / income-modal / filter-sort / page-controls |
| js/engines | 3 | page / data / render |
| js/blocks | 5 | stats / list / filter / detail / form |
| js/ui | 6 | toast / modal / form-builder / tab-panel / view-toggle / collapsible |
| js/layout | 3 | navbar / sidebar / app-shell |
| js/entity | 5 | entity-modal / entity-helpers / entity-definitions / entity-resolvers / entity-funds-allocation |
| js/admin | 2 | admin / platform-defaults |
| js/pages | 13 | 純 Schema |
| functions/api | 10 | _config / _helpers / _admin / _bank / _family / _insurance / _personal / _platform / _summary / [[path]] |
| CSS | 6 | theme / layout / components / utilities / pages/annual-report / pages/insurance |
| HTML | 13 | 各頁 + login / register |
| 根目錄 | 3 | sw.js / manifest.json / docs/ |

---

## 十一、關鍵字索引

| 關鍵字 | 讀此檔 |
|---|---|
| 狀態 / pending / done | status-registry.js + P-10-data.md |
| 名稱解析 / ID | entity-registry.js + entity-resolvers.js |
| 表格欄位 | column-registry.js |
| 顯示文字 | label-registry.js |
| 常數 / 路徑 | constants.js |
| Firebase 節點 | P-10-data.md |
| API 端點 | P-09-api.md |
| 舊資料相容 | P-11-compat.md |
| 交付格式 / 批次號 | C-02-rules.md + C-04-delivery.md |
| 檔案清單 | P-04-manifest.md |
| 常見任務 | P-06-sop.md |
| 關鍵決策 | P-05-adr.md |
| 頁面 → 檔案 | P-07-pagemap.md |
| UI 術語 | P-08-uispec.md |
| 事故 / 教訓 | P-12-incident.md |
| 重構歷程 | P-14-refactor.md |
| 進度 | P-03-progress.md |
| AI 決策樹 | C-03-guide.md |
| 編輯入口職責 | C-02-rules.md |
| Modal 統一 | C-02-rules.md |
| Action 契約 | C-02-rules.md |
| 版面規格保護 | C-02-rules.md + P-07-pagemap.md |
| UI 術語權威 | C-02-rules.md + P-08-uispec.md |
| 最小改動優先 | C-02-rules.md |
| Token 不足處理 | C-02-rules.md §0 |
| backtick 嵌套 | C-02-rules.md §六 |
| 控制列 | P-02 第七節 + lib/page-controls.js |
| 側邊欄角色過濾 | P-02 第八節 + constants.js |
| 頁面 metadata | P-02 第九節 + page-metadata-registry.js |

---

## 十二、下一步

| 使用者說 | AI 動作 |
|---|---|
| 「請交付第 N 波」 | 依 P-03-progress 交付 |
| 「查看進度」 | 讀 P-03 回報 |
| 「需要更新清單」 | 列已交付批次，待確認 |
| 「有問題」 | 先診斷 + 方案，待確認後修 |
| 「執行補回」 | 依 C-02-rules §0 分批處理 |

---

## 十三、目前狀態

| 項目 | 值 |
|---|---|
| 當前批次 | B29-9a（docs 補回中） |
| SW 版本 | family-fin-v141 |
| 部署 URL | family-financial-management-system.pages.dev |
| 測試狀態 | B29 已部署測試通過 |

---

## 十四、待辦事項

| 項目 | 狀態 |
|---|---|
| B29-9 docs 補回（4 批） | 🔄 進行中（第 1 批已交，修正批已交） |
| P-14-refactor.md 新建 | 📋 第 2 批 |
| B30 起新功能 | 📋 待規劃 |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-02-anchor.md
   Version: v103.0.37
   Batch: B29-9a
   ═══════════════════════════════════════════ */
