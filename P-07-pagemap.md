# P-07 頁面 → 檔案對照表

最後更新：B29-8h
版本：v103.0.36
批次：B29
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
| 基礎資料庫 | database.html | database.js | — |
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

## 三、index.html（總覽儀表板）

| 檔案 | 用途 |
|---|---|
| js/pages/dashboard.js | Schema |
| js/blocks/stats-block.js | 統計卡 |
| js/lib/page-controls.js | 控制列 |
| js/lib/bank.js | 銀行餘額計算 |
| js/lib/insurance.js | 保單年繳計算 |
| js/config/column-registry.js | dashboardAnnual |

---

## 四、input-center.html（綜合輸入中心）

| 檔案 | 用途 |
|---|---|
| js/pages/input-center.js | Schema（customMount） |
| js/ui/tab-panel.js | Tab 切換 |
| js/ui/view-toggle.js | 卡片/表格切換 |
| js/ui/modal.js | Modal |
| js/ui/toast.js | Toast |
| js/lib/expense-modal.js | 支出 Modal |
| js/lib/income-modal.js | 收入 Modal |
| js/shared/entity-list-page.js | 保險/基金/銀行 Tab |
| js/shared/data-table.js | 表格（含表頭互動） |
| js/shared/data-card.js | 卡片 |
| js/entity/entity-modal.js | 保單/基金 Modal |
| js/entity/entity-funds-allocation.js | 保單關聯基金 |
| js/config/column-registry.js | recentExpense |
| js/core/db.js | Firebase 讀寫 |

---

## 五、database.html（基礎資料庫）

| 檔案 | 用途 |
|---|---|
| js/pages/database.js | Schema（customMount） |
| js/pages/database-options.js | 支付/狀態 Tab |
| js/pages/database-dropdowns.js | 下拉選項 Tab |
| js/pages/database-yearrange.js | 年份範圍 Tab |
| js/ui/tab-panel.js | Tab 切換 |
| js/shared/entity-list-page.js | 成員/銀行/類別/項目 |
| js/shared/data-table.js | 表格 |
| js/shared/data-card.js | 卡片 |
| js/entity/entity-modal.js | 編輯 Modal |
| js/entity/entity-helpers.js | CRUD |
| js/entity/entity-resolvers.js | 顯示邏輯 |
| js/config/entity-registry.js | 名稱解析 |
| js/core/db.js | Firebase 讀寫 |

---

## 六、insurance.html（保險清單表）

| 檔案 | 用途 |
|---|---|
| js/pages/insurance.js | Schema（customMount） |
| js/shared/stats-cards.js | 統計卡 |
| js/shared/data-table.js | 表格（含表頭互動） |
| js/lib/page-controls.js | 控制列 |
| js/lib/insurance.js | 保單計算 |
| js/entity/entity-modal.js | 保單編輯 |
| js/entity/entity-funds-allocation.js | 保單關聯基金 |
| js/config/column-registry.js | insurancePolicies |
| js/core/db.js | Firebase 讀寫 |

---

## 七、portfolio.html（基金投資表）

| 檔案 | 用途 |
|---|---|
| js/pages/portfolio.js | Schema（customMount） |
| js/blocks/stats-block.js | 統計卡 |
| js/lib/page-controls.js | 控制列 |
| js/entity/entity-modal.js | 基金編輯 |
| js/ui/modal.js | 快照 Modal |
| js/core/db.js | 基金 + snapshot CRUD |
| js/config/column-registry.js | fundSnapshots |

**注意**：portfolio 卡片自繪（非 data-table），不受表頭排序影響。

---

## 八、settlements.html（結算清單）

| 檔案 | 用途 |
|---|---|
| js/pages/settlements.js | Schema（customMount） |
| js/lib/merge.js | 合併資料 |
| js/lib/filter-sort.js | 篩選 |
| js/lib/expense-modal.js | 結算 Modal（mode: 'settle'） |
| js/lib/page-controls.js | 控制列 |
| js/core/api.js | 保險扣款 sync / unsync |
| js/lib/insurance.js | getPeriodInfo |
| js/shared/stats-cards.js | 統計卡 |
| js/shared/data-table.js | 表格（含表頭互動） |
| js/shared/data-card.js | 卡片 |
| js/config/column-registry.js | settlements |
| js/core/db.js | Firebase 讀寫 |

**B29-2a 移除**：sort / source filter（改表頭）。

---

## 九、finance-overview.html（銀行交易）

| 檔案 | 用途 |
|---|---|
| js/pages/finance-overview.js | Schema（customMount） |
| js/shared/stats-cards.js | 統計卡 |
| js/shared/data-table.js | 表格（含表頭互動） |
| js/shared/data-card.js | 卡片 |
| js/lib/page-controls.js | 控制列 |
| js/lib/bank.js | 餘額計算 |
| js/config/column-registry.js | bankAccounts / bankTransactions |
| js/core/db.js | Firebase 讀寫 |

---

## 十、annual-report.html（年度報表）

| 檔案 | 用途 |
|---|---|
| js/pages/annual-report.js | Schema（customMount） |
| js/blocks/stats-block.js | 統計卡 |
| js/lib/page-controls.js | 控制列 |
| js/lib/format.js | 格式化 |
| js/config/column-registry.js | annualSummary / annualMonthly |

---

## 十一、member-report.html（成員報表）

| 檔案 | 用途 |
|---|---|
| js/pages/member-report.js | Schema（customMount） |
| js/blocks/stats-block.js | 統計卡 |
| js/shared/data-table.js | 表格（含表頭互動） |
| js/shared/data-card.js | 卡片 |
| js/lib/page-controls.js | 控制列 |
| js/config/column-registry.js | memberReport |

---

## 十二、settings.html（系統設定）

| 檔案 | 用途 |
|---|---|
| js/pages/settings.js | Schema（customMount） |
| js/ui/tab-panel.js | Tab 切換 |
| js/shared/bank-account-manager.js | 銀行帳號管理 |
| js/shared/entity-list-page.js | 家庭成員 |
| js/ui/toast.js | Toast |
| js/ui/modal.js | Modal |
| js/ui/form-builder.js | 表單 |
| js/core/api.js | adminMigrate |
| js/core/db.js | listenPageMetadata / savePageMetadata |
| js/config/page-metadata-registry.js | listPages |

---

## 十三、admin.html（平台管理）

| 檔案 | 用途 |
|---|---|
| js/admin/admin.js | 主邏輯 |
| js/admin/platform-defaults.js | 預設資料庫 |
| js/ui/tab-panel.js | Tab |
| js/core/api.js | API 呼叫 |
| js/layout/sidebar.js | 側邊欄（admin 群組） |

---

## 十四、login.html / register.html

| 檔案 | 用途 |
|---|---|
| js/core/auth.js | 登入 |
| js/core/state.js | 全域狀態 |
| js/core/pwa.js | PWA |

---

## 十五、共用 Registry（所有頁）

| Registry | 用途 |
|---|---|
| status-registry.js | 狀態正規化 |
| entity-registry.js | ID → 名稱 |
| label-registry.js | 顯示文字 |
| column-registry.js | 表格欄位 + 排序 / 篩選屬性 |
| constants.js | 全站常數 |
| page-metadata-registry.js | 頁面 title / subtitle 預設 |

---

## 十六、各頁可編輯欄位對照

**依據**：ADR-019（編輯入口職責分離）

| 頁面 | 可編輯欄位 | 禁止欄位 |
|---|---|---|
| input-center（支出） | name / amount / date / categoryId / itemId | status / paymentMethodId / bankId / repaidDate |
| input-center（收入） | memberId / amount | — |
| input-center（保單） | 全部保單資料 | 扣款狀態 |
| input-center（基金） | 全部基金資料 | — |
| database | 基礎資料 | — |
| settlements（支出） | status / paymentMethodId / bankId / repaidDate | name / amount / date / categoryId / itemId |
| settlements（保險） | status / bankId | 保單基本資料 |
| insurance | 保單資料（不含扣款狀態） | 扣款狀態 |
| portfolio | 基金資料 / 快照 | — |

---

## 十七、側邊欄角色可見群組

**依據**：ADR-020

| 群組 | roles |
|---|---|
| 總覽 / 記錄中心 / 保險基金 / 對帳 / 資產 / 報表 | owner / member |
| 平台管理 | **superadmin** |
| 系統 | owner / member / superadmin |

---

## 十八、頁面區塊規格

**依據**：ADR-019

**圖例**：✅ 存在 / 🔒 禁止改動

### index.html

| 順序 | 容器 ID | 類型 | 用途 | 狀態 |
|---|---|---|---|---|
| 1 | page-header | header | 標題 + 副標題 + 查看年報 | ✅ |
| 2 | stats-cards-root | stats | 統計卡 | ✅ |
| 3 | page-controls-root | controls | （空） | ✅ |
| 4 | annual-overview-root | list | 年度總覽 | ✅ |

### input-center.html

| 順序 | 容器 ID | 類型 | 用途 | 狀態 |
|---|---|---|---|---|
| 1 | page-header | header | 標題 + 副標題 + actions | ✅ |
| 2 | ic-buttons-root | actions | 5 個操作按鈕 | ✅ |
| 3 | ic-tab-bar-root | tabs | 4 Tab | ✅ |
| 4 | ic-panel-expense | panel | 支出 | ✅ |
| 5 | ic-panel-insurance | panel | 保險 | ✅ |
| 6 | ic-panel-fund | panel | 基金 | ✅ |
| 7 | ic-panel-bank | panel | 銀行 | ✅ |

### database.html

| 順序 | 容器 ID | 類型 | 用途 | 狀態 |
|---|---|---|---|---|
| 1 | page-header | header | 標題 + 副標題 + actions | ✅ |
| 2 | db-tab-bar-root | tabs | 6 Tab | ✅ |
| 3 | db-panel-members | panel | 成員 | ✅ |
| 4 | db-panel-banks | panel | 銀行 | ✅ |
| 5 | db-panel-categories | panel | 支出結構 | ✅ |
| 6 | db-panel-options | panel | 支付/狀態 | ✅ |
| 7 | db-panel-dropdowns | panel | 下拉選項 | ✅ |
| 8 | db-panel-yearrange | panel | 年份範圍 | ✅ |

### insurance.html

| 順序 | 容器 ID | 類型 | 用途 | 狀態 |
|---|---|---|---|---|
| 1 | page-banner | banner | 說明 | ✅ |
| 2 | page-header | header | 標題 + 副標題 | ✅ |
| 3 | insurance-stats-root | stats | 統計卡 | ✅ |
| 4 | page-controls-root | controls | add + viewToggle + year + month | ✅ |
| 5 | completed-section | section | 已供滿 | ✅ |
| 6 | insurance-card-view | list | 卡片 | ✅ |
| 7 | insurance-table-view | list | 表格 | ✅ |
| 8 | insurance-empty-state | empty | 空狀態 | ✅ |

### portfolio.html

| 順序 | 容器 ID | 類型 | 用途 | 狀態 |
|---|---|---|---|---|
| 1 | page-header | header | 標題 + 副標題 | ✅ |
| 2 | portfolio-stats-root | stats | 統計卡 | ✅ |
| 3 | page-controls-root | controls | add + year + month | ✅ |
| 4 | insurance-funds-list | list | 保險基金 | ✅ |
| 5 | standalone-funds-list | list | 獨立基金 | ✅ |
| 6 | fund-empty-state | empty | 空狀態 | ✅ |

### settlements.html

| 順序 | 容器 ID | 類型 | 用途 | 狀態 |
|---|---|---|---|---|
| 1 | page-banner | banner | 說明 | ✅ |
| 2 | page-header | header | 標題 + 副標題 | ✅ |
| 3 | settlement-stats-root | stats | 統計卡 | ✅ |
| 4 | page-controls-root | controls | viewToggle + year + month + filter | ✅ |
| 5 | settlement-table-root | list | 表格 / 卡片 | ✅ |

### finance-overview.html

| 順序 | 容器 ID | 類型 | 用途 | 狀態 |
|---|---|---|---|---|
| 1 | page-header | header | 標題 + 副標題 | ✅ |
| 2 | finance-stats-root | stats | 統計卡 | ✅ |
| 3 | page-controls-root | controls | viewToggle + year + month | ✅ |
| 4 | finance-tabs | tabs | 銀行/交易 | ✅ |
| 5 | finance-panel-banks | panel | 銀行清單 | ✅ |
| 6 | finance-panel-transactions | panel | 交易記錄 | ✅ |

### annual-report.html

| 順序 | 容器 ID | 類型 | 用途 | 狀態 |
|---|---|---|---|---|
| 1 | page-header | header | 標題 + 副標題 + 匯出 | ✅ |
| 2 | annual-stats-root | stats | 統計卡 | ✅ |
| 3 | page-controls-root | controls | year + month + viewSwitcher | ✅ |
| 4 | annual-summary-view | view | 全年總合 | ✅ |
| 5 | annual-monthly-view | view | 月度明細 | ✅ |

### member-report.html

| 順序 | 容器 ID | 類型 | 用途 | 狀態 |
|---|---|---|---|---|
| 1 | page-header | header | 標題 + 副標題 | ✅ |
| 2 | member-report-stats-root | stats | 統計卡 | ✅ |
| 3 | page-controls-root | controls | viewToggle + year + month | ✅ |
| 4 | member-list-root | list | 成員明細 | ✅ |

### settings.html

| 順序 | 容器 ID | 類型 | 用途 | 狀態 |
|---|---|---|---|---|
| 1 | page-header | header | 標題 + 副標題 + actions | ✅ |
| 2 | settings-tabs | tabs | Tab 切換 | ✅ |
| 3 | settings-panel-platform | panel | 平台設定 | ✅ |
| 4 | settings-panel-banks | panel | 銀行帳號 | ✅ |
| 5 | settings-panel-personal | panel | 個人化 | ✅ |

**個人化 Tab 動態注入**：

| 容器 ID | 用途 |
|---|---|
| settings-debug-card | 除錯工具 |
| settings-migrate-card | 一次性遷移（superadmin） |
| settings-page-meta-card | 頁面標題 |

### admin.html

| 順序 | 容器 ID | 類型 | 用途 | 狀態 |
|---|---|---|---|---|
| 1 | page-header | header | 標題 + 副標題 + 登出 | ✅ |
| 2 | admin-error | banner | 錯誤 | ✅ |
| 3 | admin-tabs | tabs | 3 Tab | ✅ |
| 4 | admin-panel-families | panel | 家庭管理 | ✅ |
| 5 | admin-panel-accounts | panel | 帳號總覽 | ✅ |
| 6 | admin-panel-defaults | panel | 預設資料庫 | ✅ |

---

## 十九、改動影響對照

| 若改此檔 | 影響頁面 |
|---|---|
| page-engine.js | 全部主頁 + 頁面 metadata |
| data-engine.js | 全部主頁 |
| render-engine.js | 全部主頁 |
| data-table.js | 全部有表格的頁（含表頭互動） |
| data-card.js | 全部有卡片的頁 |
| stats-block.js | dashboard / portfolio / annual-report / member-report |
| column-registry.js | 全部有表格的頁 |
| page-metadata-registry.js | 全部頁面標題預設 |
| entity-registry.js | 全部用名稱解析的頁 |
| status-registry.js | settlements + 全部狀態顯示 |
| constants.js | 全部主頁 + 側邊欄 |
| app-shell.js | 全部主頁 |
| sidebar.js | 全部主頁（依角色過濾） |
| navbar.js | 全部主頁 |
| ui/view-toggle.js | 各頁切換 |
| ui/tab-panel.js | input-center / database / settings / admin / finance-overview |
| lib/page-controls.js | 7 個主頁 |
| lib/expense-modal.js | input-center / settlements |
| entity-funds-allocation.js | input-center / insurance / portfolio |
| _insurance.js | 保險累積基金 |

---

## 二十、關聯檔案

| 主題 | 檔案 |
|---|---|
| UI 術語 | P-08-uispec.md |
| 技術架構 | P-02-anchor.md |
| 檔案清單 | P-04-manifest.md |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-07-pagemap.md
   Version: v103.0.36
   Batch: B29-8h
   ═══════════════════════════════════════════ */