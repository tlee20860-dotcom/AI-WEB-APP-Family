# P-06 頁面 → 檔案對照表

最後更新：2026-10-21
Version: 1792581020
Writer: ai-system-20261021-004#20
用途：改某功能時，快速查哪些頁面受影響

---

## 一、總覽

| 頁面 | HTML | Schema | 主要 Blocks |
|---|---|---|---|
| 登入 | login.html | — | — |
| 註冊 | register.html | — | — |
| 平台管理 | admin.html | — | （admin.js） |
| 總覽儀表板 | index.html | dashboard.js | stats |
| 綜合輸入中心 | input-center.html | input-center.js | — |
| **編號對照清單** | **code-list.html**（✅ 已交付） | **code-list.js**（✅ 已交付） | — |
| 保險清單表 | insurance.html | insurance.js | — |
| 基金投資表 | portfolio.html | portfolio.js | stats |
| 結算清單 | settlements.html | settlements.js | — |
| 銀行交易 | finance-overview.html | finance-overview.js | — |
| 年度報表 | annual-report.html | annual-report.js | stats |
| 成員報表 | member-report.html | member-report.js | stats |
| 系統設定 | settings.html | settings.js | — |

---

## 二、共用（所有主頁）

| 檔案 | 職責 |
|---|---|
| js/layout/app-shell.js | App Shell 初始化 |
| js/layout/sidebar.js | 側邊欄（依角色過濾） |
| js/layout/navbar.js | 頂部導覽 |
| js/core/auth-guard.js | 登入驗證 |
| js/core/state.js | 全域狀態 |
| js/core/api.js | API 呼叫 |
| js/core/db.js | Firebase 讀寫 |
| js/core/pwa.js | PWA |
| js/core/debug.js | vConsole |
| js/config/app-config.js | 平台 / 家庭設定 |
| js/config/firebase-config.js | Firebase |
| js/config/page-metadata-registry.js | 頁面 metadata 預設 |
| js/lib/registry.js | Registry 統一初始化 |

---

## 三、各頁面檔案

### code-list.html（✅ 已交付）

| 檔案 | 用途 |
|---|---|
| js/pages/code-list.js | Schema |
| js/lib/code-registry.js | 編號生成 |
| js/lib/id-resolver.js | 編號查詢 |
| js/ui/toast.js | Toast |
| js/ui/modal.js | Modal |
| js/entity/entity-modal.js | 編輯 Modal |
| js/entity/entity-helpers.js | CRUD |
| js/entity/entity-definitions.js | 實體定義（含 code） |

**頁面結構**：
| 區塊 | 說明 |
|---|---|
| 頂部篩選器（2 欄並排） | 類型 + 編號狀態 |
| 主列表區 | 依 code 排序 |
| 權限按鈕 | superadmin 可見 |

### input-center.html

| 檔案 | 用途 |
|---|---|
| js/pages/input-center.js | Schema |
| js/ui/tab-panel.js | Tab |
| js/ui/view-toggle.js | 切換 |
| js/lib/expense-modal.js | 支出 Modal（含 + 號） |
| js/lib/income-modal.js | 收入 Modal（含 + 號） |
| js/entity/entity-modal.js | 保單 / 基金 Modal（含 + 號） |
| js/ui/dropdown-plus.js | + 號按鈕 |

### settings.html

| 檔案 | 用途 |
|---|---|
| js/pages/settings.js | Schema |
| js/shared/yearrange-card.js | 年份範圍卡（B34-4） |
| js/shared/bank-account-manager.js | 銀行帳號 |
| js/shared/entity-list-page.js | 家庭成員 |

（其餘頁面與 B34-3 版相同）

---

## 四、共用 Registry

| Registry | 用途 |
|---|---|
| status-registry.js | 狀態正規化 |
| entity-registry.js | ID → 名稱 |
| label-registry.js | 顯示文字 |
| column-registry.js | 表格欄位 + 排序 / 篩選 |
| constants.js | 全站常數 |
| page-metadata-registry.js | 頁面 title / subtitle |

---

## 五、各頁可編輯欄位對照

| 頁面 | 可編輯欄位 | 禁止欄位 |
|---|---|---|
| input-center（支出） | name / amount / date / categoryId / itemId | status / paymentMethodId / bankId / repaidDate |
| input-center（收入） | memberId / amount | — |
| input-center（保單） | 全部保單資料 | 扣款狀態 |
| input-center（基金） | 全部基金資料 | — |
| code-list | 全部欄位 | — |
| settlements（支出） | status / paymentMethodId / bankId / repaidDate | name / amount / date |
| settlements（保險） | status / bankId | 保單基本資料 |
| insurance | 保單資料（不含扣款狀態） | 扣款狀態 |
| portfolio | 基金資料 / 快照 | — |

---

## 六、側邊欄角色可見群組

| 群組 | roles |
|---|---|
| 總覽 / 記錄中心 / 保險基金 / 對帳 / 資產 / 報表 | owner / member |
| 平台管理 | superadmin |
| 系統 | owner / member / superadmin |

**「編號對照清單」歸「記錄中心」群組**（已交付）。

---

## 七、頁面區塊規格

### code-list.html（✅ B34-4）

| 順序 | 容器 ID | 類型 | 用途 | 狀態 |
|---|---|---|---|---|
| 1 | page-header | header | 標題 + 副標題 + 權限按鈕 | 🆕 |
| 2 | cl-filter-root | filter | 類型 + 編號狀態（2 欄並排） | 🆕 |
| 3 | cl-list-root | list | 主列表 | 🆕 |
| 4 | cl-empty-state | empty | 空狀態 | 🆕 |

（其餘頁面區塊規格與 B34-3 版相同）

---

## 八、改動影響對照

| 若改此檔 | 影響頁面 |
|---|---|
| page-engine.js | 全部主頁 |
| data-engine.js | 全部主頁 |
| render-engine.js | 全部主頁 |
| data-table.js | 全部有表格的頁 |
| data-card.js | 全部有卡片的頁 |
| stats-block.js | dashboard / portfolio / annual-report / member-report |
| column-registry.js | 全部有表格的頁 |
| code-registry.js | 全部新增流程 |
| id-resolver.js | 全部顯示 / 關聯展開 |
| dropdown-plus.js | input-center + 各 modal |
| yearrange-card.js | settings |
| entity-helpers.js | 全部實體新增 / 編輯 / 刪除 |
| entity-modal.js | 全部開啟 Modal 的頁 |
| **code-list.js** | **code-list.html** |

---

## 九、關聯檔案

| 主題 | 檔案 |
|---|---|
| UI 術語 | P-07-uispec.md |
| 專案索引 | P-01-index.md |
| 檔案清單 | WF-STATE-INDEX.md |
| 議題結論 | WF-CONCLUSION.md |
| 重組計畫 | P-15-reorg-plan.md |

---

/* ═══ EOF ═══
F: P-06-pagemap.md
V: 1792581020
W: ai-system-20261021-004#20
═══ */