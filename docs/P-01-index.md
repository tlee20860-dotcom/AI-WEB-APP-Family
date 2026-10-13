# P-01 專案索引 + 技術架構

最後更新：B32-1
Version: 1791883200
Batch: B32-1
Writer: A20261013-001#010
用途：專案索引 + 技術架構（合併原 P-01 + P-02）

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
| 視覺 | 亮色家庭暖陽（Tailwind 色板） |
| 金額 | 四捨五入至整數 |

---

## 二、當前狀態

| 項目 | 值 |
|---|---|
| 當前批次 | B32-1（docs 重建中） |
| 部署 URL | family-financial-management-system.pages.dev |
| 測試狀態 | B30-8 已測試通過 |

---

## 三、三層架構

| 層 | 職責 | 檔案 |
|---|---|---|
| 資料層 | Firebase RTDB | — |
| 引擎層 | page-engine / data-engine / render-engine | js/engines/ |
| 呈現層 | block / UI 元件 / DOM | js/blocks, js/ui |

**資料流**：

> Firebase RTDB → data-engine → page-engine → derived → block → DOM

---

## 四、核心架構原則

| 原則 | 說明 |
|---|---|
| SSOT 極大化 | 任何知識只存在一處 |
| 宣告式 > 命令式 | 頁面只描述「要什麼」 |
| 舊資料 100% 相容 | 讀取時 normalize |
| 操作邏輯不變 | 只改實作方式 |
| 無補丁 | 能宣告就不手寫 |

---

## 五、5 大 Registry

| Registry | 職責 |
|---|---|
| status-registry.js | 狀態系統 |
| entity-registry.js | 名稱解析 |
| label-registry.js | 顯示文字 |
| column-registry.js | 表格欄位 + 排序 / 篩選屬性 |
| constants.js | 全站常數 |

**附加**：page-metadata-registry.js

---

## 六、3 大引擎

| 引擎 | 職責 |
|---|---|
| page-engine.js | 解讀 Schema、生命週期、onDataChange、頁面 metadata |
| data-engine.js | Firebase 訂閱 + 衍生 |
| render-engine.js | 掛載 UI 區塊 |

---

## 七、5 大 Block

| Block | 職責 |
|---|---|
| stats-block.js | 統計卡區 |
| list-block.js | 列表區 |
| filter-block.js | 篩選列區 |
| detail-block.js | 明細展開區 |
| form-block.js | 表單 Modal 區 |

---

## 八、Page Schema 欄位

| 欄位 | 類型 | 說明 |
|---|---|---|
| title | string | 頁面標題 |
| data | object | Firebase 訂閱配置 |
| state | object | 響應式狀態初始值 |
| derived | object | 衍生資料計算 |
| blocks | array | UI 區塊 |
| onYearMonthChange | function | 年月變更 hook（可選） |
| customMount | function | 逃生艙（可選） |

**customMount 回傳**：`{ destroy }`

**ctx 提供**：

| 方法 | 用途 |
|---|---|
| ctx.onDataChange(fn) | 訂閱資料變更 |
| ctx.setState(path, val) | 設 state |
| ctx.invalidate(key) | 觸發重算 |

---

## 九、page-controls

**模組**：js/lib/page-controls.js

**config 結構**：

| 欄位 | 說明 |
|---|---|
| containerId | body 容器 ID |
| headerContainerId | header 容器 ID |
| items | 元素陣列 |

**內建 type**：

| type | position |
|---|---|
| add | 任意 |
| export | 任意 |
| viewToggle | 強制 body |
| viewSwitcher | body |
| sort | 強制 body |
| year | body（左側） |
| month | body（左側） |
| filter | body |
| custom | 任意 |

**year / month 內部讀寫 AppState**。

---

## 十、側邊欄角色過濾

**模組**：constants.js + js/layout/sidebar.js

**SIDEBAR_GROUPS 每群組加 roles 陣列**。

| 角色 | 可見群組 |
|---|---|
| superadmin | 平台管理 + 系統 |
| owner | 全部家庭群組 + 系統 |
| member | 同 owner |

**對外函式**：`getSidebarGroupsByRole(role)`

---

## 十一、頁面 metadata

**模組**：page-metadata-registry.js + page-engine.js

**儲存**：families/{familyId}/settings/page_metadata/{pageKey}

**結構**：`{ title, subtitleStatic }`

**顯示機制**：

| 元素 | 機制 |
|---|---|
| title | textContent 覆蓋 |
| subtitleStatic | data-prefix + CSS ::before |

---

## 十二、目標檔案結構

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
| icons | 1+ | icon.svg / icon.png |
| docs | 19 | C-00 ~ C-07（8）+ P-01 ~ P-99（11） |
| 根目錄 | 3 | sw.js / manifest.json / docs/ |

---

## 十三、關聯檔案

| 主題 | 檔案 |
|---|---|
| 進度 | P-02-progress.md |
| 檔案清單 | P-03-manifest.md |
| 決策 | P-04-decisions.md |
| 常見任務 | P-05-sop.md |

---

/* ═══ EOF ═══
F: docs/P-01-index.md
V: 1791883200
B: B32-1
W: A20261013-001#010
═══ */
