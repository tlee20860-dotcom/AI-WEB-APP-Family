# P-08 API 契約

最後更新：B32-1
Version: 1791883800
Batch: B32-1
Writer: A20261013-001#011
用途：前後端介面參考

---

## 一、前端模組 API

### status-registry.js

| API | 說明 |
|---|---|
| normalize(raw) | 任意輸入 → 標準代碼 |
| isDone(raw) | 是否完成 |
| label(raw, opts) | 顯示文字（依 source） |
| options(opts) | 下拉選項陣列 |
| badgeClass(raw) | badge class |
| toLegacyName(code, source) | 新代碼 → 舊名稱 |
| isPending(raw) | 是否 pending |
| isSkipped(raw) | 是否 skipped |

**常數**：STATUS / IS_DONE / LABELS / LEGACY_MAP

---

### entity-registry.js

| API | 說明 |
|---|---|
| init() | 初始化訂閱 |
| destroy() | 清理 |
| resolveName(type, id, fallback) | ID → 名稱 |
| getList(type) | 列表 |
| getNameMap(type) | { id: name } |
| isInitialized() | 是否已初始化 |
| resolveNames(type, ids) | 批次解析 |
| resolveEntityName(key, id, fallback) | 依 ENTITY_KEYS 解析 |

**ENTITY_TYPE_MAP**：member / bank / category / item / payment / policy

---

### label-registry.js

| API | 說明 |
|---|---|
| L(path, params) | 依路徑取得文字 |
| has(path) | 是否存在 |
| getGroup(name) | 取得整個分類 |

**LABELS 分類**：common / pages / fields / actions / confirm / toast / emptyState / nav / roles

---

### column-registry.js

| API | 說明 |
|---|---|
| getColumns(key) | 欄位定義 |
| getResolvers(key) | 值轉換函式 |
| getColumnsWith(key, extra) | 追加欄位 |

**COLUMNS key**（18 種）：
members / banks / bankAccounts / categories / items / payments / statuses / companies / funds / fundSnapshots / insurance / insurancePolicies / settlements / bankTransactions / recentExpense / memberReport / dashboardAnnual / annualSummary / annualMonthly

---

### page-metadata-registry.js

| API | 說明 |
|---|---|
| getPageKeyFromUrl() | 從 URL 取 pageKey |
| getDefaultMetadata(pageKey) | 取預設 metadata |
| listPages() | 列出所有可編輯頁面 |

---

### entity-resolvers.js

| API | 說明 |
|---|---|
| getEntityResolvers(entityKey) | 取得該 entity 的 resolvers |

**RESOLVERS key**：member / bank / policy / fund / category / item / payment / status

---

### entity-funds-allocation.js

| API | 說明 |
|---|---|
| renderFundsAllocationField(root, initialAlloc, policyType, opts) | 渲染關聯基金欄位 |

**opts**：`{ defaultYear, defaultMonth }`

**回傳**：`getValue()` 函式

---

### constants.js

| 類別 | 常數 |
|---|---|
| 版本 | APP_VERSION / SW_VERSION |
| Storage | STORAGE_KEYS / STORAGE_PREFIXES / SESSION_KEYS |
| TTL | AUTH_CONTEXT_TTL_MS / APP_CONFIG_TTL_MS / BANK_CACHE_TTL_MS |
| 限制 | LIMITS |
| ID | RESERVED_IDS |
| 角色 | ROLES / SOURCES |
| 前綴 | LINKED_PREFIX |
| 銀行 | BANK_TXN_TYPES / BANK_TXN_CATEGORIES / BANK_ACCOUNT_TYPES |
| 支付 | PAYMENT_MODES |
| 實體 | ENTITY_KEYS |
| 狀態 | STATUS_BADGE_CLASS / STATUS_CATEGORIES |
| 導覽 | SIDEBAR_GROUPS / ROUTES |
| 預設 | DEFAULT_* |
| 平台 | PLATFORM_RESOURCES / SUPERADMIN_* |

| 函式 | 說明 |
|---|---|
| buildLinkedKey(policyId) | linked_ 前綴 |
| isLinkedKey(key) | 判定 |
| getPolicyEffectiveMemberId(policy) | 保單持有人 fallback |
| buildColumnSettingsKey(tableId) | 欄位設定 key |
| getStatusBadgeClass(isDone, isSkipped) | badge class |
| getSidebarGroupsByRole(role) | 依角色過濾群組 |

---

### page-engine.js

| API | 說明 |
|---|---|
| createPage(schema) | 建立頁面 → { ctx, destroy, ready } |

**ctx 提供**：

| 方法 | 說明 |
|---|---|
| ctx.onDataChange(fn) | 訂閱資料變更 |
| ctx.setState(keyPath, val) | 設 state |
| ctx.invalidate(key) | 觸發重算 |

---

### data-engine.js

| API | 說明 |
|---|---|
| subscribe(cfg, cb) | 訂閱 |
| fetchOnce(cfg) | 一次性讀取 |
| makeReactive(obj, cb) | 響應式代理 |
| resolvePath(raw, params) | 路徑解析 |
| getNestedValue(obj, path) | 深層取值 |
| setNestedValue(obj, path, val) | 深層設值 |

**cfg 支援**：

| 欄位 | 說明 |
|---|---|
| type | list / object / value / raw |
| path | 相對路徑（含 {key} / {__all__}） |
| transform | 資料轉換 |
| params | 佔位符對應 |

---

### render-engine.js

| API | 說明 |
|---|---|
| resolveExpr(expr, ctx) | 解析單一表達式 |
| resolveDeep(obj, ctx) | 遞迴解析 |
| mountBlock(block, ctx) | 掛載 block |
| collectBlockDeps(block) | 掃描依賴 |

---

### page-controls.js

| API | 說明 |
|---|---|
| renderPageControls(config) | 渲染控制列 |
| destroyPageControls(instance) | 清理 |

**config**：

| 欄位 | 說明 |
|---|---|
| containerId | body 容器 |
| headerContainerId | header 容器 |
| items | 元素陣列 |

**內建 type**：add / export / viewToggle / viewSwitcher / sort / year / month / filter / custom

---

### data-table.js

| API | 說明 |
|---|---|
| renderDataTable(options) | 渲染表格（含表頭排序 / 篩選） |

**options**：

| 欄位 | 說明 |
|---|---|
| container | 容器 |
| entityKey | 實體 key 或虛構 key |
| rows | 資料列 |
| tableId | 表格 ID |
| options | { columns, resolvers, storageKey, ... } |
| hooks | { customActions, onEdit, onDelete, ... } |

**回傳**：`{ container, table, refresh, destroy }`

---

### data-card.js

| API | 說明 |
|---|---|
| renderDataCard(options) | 渲染卡片（含 customActions） |

**options**：同 data-table，gridClass 可自訂。

---

### lib/expense-modal.js

| API | 說明 |
|---|---|
| openExpenseModal({ row, mode, onSuccess }) | mode: 'data' \| 'settle' |

**mode 行為**：

| mode | 顯示欄位 |
|---|---|
| 'data' | member / name / amount / date / category / item |
| 'settle' | status / paymentMethod / bank |

---

### lib/income-modal.js

| API | 說明 |
|---|---|
| openContributionModal({ onSuccess }) | 家用轉入 |
| openPersonalIncomeModal({ onSuccess }) | 個人收入 |

---

### lib/filter-sort.js

| API | 說明 |
|---|---|
| applyFilters(list, filters, opts) | 篩選 |
| applySort(list, mode, modes) | 排序 |

**注意**：filters 只放 row 過濾欄位。

---

### lib/dom.js

| API | 說明 |
|---|---|
| qs / qsa | 選取 |
| esc(v, fallback) | HTML 逸出（SSOT） |
| when / unless | 條件執行 |
| el(tag, attrs, children) | 建立元素 |

---

### lib/async.js

| API | 說明 |
|---|---|
| withToast / withConfirm / withAsyncState / safe | 非同步輔助 |

---

### lib/lifecycle.js

| API | 說明 |
|---|---|
| createCleanupRegistry() | 回傳 { add, addAll, remove, size, run, isDestroyed } |

---

### lib/format.js

| API | 說明 |
|---|---|
| formatHKD / formatNumber / roundHKD / clampAmount | 金額 |
| formatPercent | 百分比 |
| formatCellValue | 通用格式化 |
| formatTransactionType / formatTransactionCategory / getCategoryBadgeClass | 交易 |

---

### lib/registry.js

| API | 說明 |
|---|---|
| initAllRegistries() | 初始化全部 |
| destroyAllRegistries() | 銷毀全部 |
| isAllRegistriesReady() | 查詢狀態 |

---

### lib/merge.js

| API | 說明 |
|---|---|
| mergeSettlementData({ memberExpenses, insuranceRows, year, month }) | 結算合併 |
| resetInsuranceStatusCache() | 重置快取 |

---

### lib/insurance.js

| API | 說明 |
|---|---|
| getPolicyHolderId(policy) | 保單持有人 |
| getPeriodRange(policy, idx) | 期間範圍 |
| getPeriodInfo(policy, y, m) | 期間資訊 |
| getPolicyAnnualPremium(policy, y) | 年繳 |
| resolveMonthlyAmount(policy, y, m, pd) | 月攤 |
| getPolicyTotalPremium(policy) | 總供款 |
| getPolicyPaidTotal(payments) | 已供款 |
| countCompletedPeriods(payments) | 完成期數 |
| isPolicyCompleted(policy) | 是否供滿 |
| calcProgress(policy) | 進度 |
| computeEnrichedPolicies(policies, cache, y) | 批次計算 |
| countCompletedPolicies(enriched) | 統計 |
| calcYearTotalPremium(enriched, y) | 年度總額 |
| calcMonthlyTotalAverage(enriched, y, m) | 月平均 |
| calcFundCostEstimate(policy, y, m) | 基金成本估算 |
| calcFundCostFromPayments(payments) | 基金成本精確 |

---

### lib/bank.js

| API | 說明 |
|---|---|
| calcBankBalance(acc, txns, y, m) | 單一銀行餘額 |
| calcTotalBankBalance(accs, txns, y, m) | 總餘額 |
| getBankTransactions(txns, bankId) | 交易篩選 |
| createTransactionForExpense / Insurance / Reimbursement / Contribution | 建立交易 |
| syncExpenseToBank(...) | 支出同步 |
| cleanupExpenseBankTransaction(bankId, txnId) | 清理 |
| createTransactionForInsurancePayment(...) | 保險付款 |
| groupTransactionsByCategory(txns) | 分類統計 |
| filterTransactionsByMonth(txns, y, m) | 月份篩選 |

---

### core/db.js

| 類別 | API |
|---|---|
| 成員 | listenMembers / getMembersOnce / addMember / updateMember / removeMember / deleteMemberAndData |
| 銀行 | listenBanks / getBanksOnce / addBank / updateBank / removeBank |
| 銀行帳號 | listenBankAccounts / getBankAccountsOnce / addBankAccount / updateBankAccount / removeBankAccount |
| 銀行交易 | listenAllBankTransactions / addBankTransaction / updateBankTransaction / removeBankTransaction |
| 個人收入 | listenPersonalIncome / savePersonalIncome |
| 成員代墊 | listenMemberAdvances / addMemberAdvance / updateMemberAdvance |
| 保險公司 | listenInsuranceCompanies / getInsuranceCompaniesOnce |
| 支付方式 | listenPaymentMethods |
| 類別 | listenCategories / getCategoriesOnce |
| 項目 | listenItems / getItemsOnce |
| 狀態 | listenStatuses / getStatusesOnce |
| 家庭設定 | listenFamilyOptions / saveFamilyOptions / listenYearRange / saveYearRange / listenUIConstants / saveUIConstants |
| 頁面 metadata | listenPageMetadata / savePageMetadata |
| 平台 | listenPlatformResource / getPlatformResourceOnce / putPlatformResource / removePlatformResource / setPlatformResource |
| 支出 | listenExpenses / listenAllExpenses / listenAllMemberExpenses / addExpense / updateExpense / removeExpense / batchUpdateExpenses |
| 保險 | listenInsurancePolicies / addInsurancePolicy / updateInsurancePolicy / removeInsurancePolicy / getInsurancePaymentsOnce / saveInsurancePaymentBatch（@deprecated） |
| 收入 | listenIncome / getIncomeOnce / saveIncome / listenAllIncome |
| 基金 | listenFunds / getFundsOnce / addFund / updateFund / removeFund |
| 基金快照 | listenFundSnapshots / getFundSnapshotsOnce / saveFundSnapshot / removeFundSnapshot |

---

### core/debug.js

| API | 說明 |
|---|---|
| initDebug() | 初始化 |
| forceEnableDebug() | 手動開啟 |
| forceDisableDebug() | 手動關閉 |
| isDebugEnabled() | 查詢狀態 |

---

### core/state.js（AppState）

| 分類 | 方法 |
|---|---|
| 使用者 | currentUser / isSuperAdmin / setUser / setSuperAdmin |
| 家庭 | setFamily / getFamilyId / getFamilyName / hasFamily / clearFamily |
| 帳號 | setRole / setCanInput / setDisplayName / setMemberAccount |
| 便利 | getRoleLabel / getCanInputLabel |
| 年月 | setYearMonth / getYearMonth / getYearMonthLabel |
| 檢視 | setCurrentView / getCurrentView |
| 主題 | setTheme / getTheme / toggleTheme |
| 事件 | on / off / emit |
| 生命週期 | init / destroy |

---

### core/api.js

| API | 說明 |
|---|---|
| callApi(path, opts) | 通用呼叫 |
| api.lookupFamily() | 家庭查詢 |
| api.summary(y, m) | 單月摘要 |
| api.fetchAnnualSummary(y) | 年度聚合 |
| api.fetchAnnualSummaryRange(s, e) | 年度範圍 |
| api.fetchSettlementsYear(y) | 結算年度 |
| api.insuranceSync(payload) | 保險扣款觸發連動 |
| api.insuranceUnsync(payload) | 取消扣款 |
| api.adminListFamilies / adminAddFamily / adminRemoveFamily / adminInitFamily | 平台家庭管理 |
| api.adminMigrate(familyId) | 一次性資料遷移 |
| api.familyAccounts.* | 家庭帳號 CRUD |
| api.platformSettings.* | 平台設定 |
| api.platformDefaults.* | 平台預設 CRUD |
| api.familySettings.* | 家庭設定 |
| api.bankAccounts.* | 銀行帳號 |
| api.bankTransactions.* | 銀行交易 |
| api.personalIncome.* | 個人收入 |
| api.memberAdvances.* | 成員代墊 |
| api.clearBankBalances() | 清除舊結餘 |

---

## 二、後端 API 契約

所有 URL 路徑保持不變；實作改為 functions/api/[[path]].js Catch-all 分派。

### GET 端點

| 路徑 | 說明 |
|---|---|
| /api/family-settings | 家庭設定 |
| /api/family-accounts | 家庭成員帳號 |
| /api/admin-families | 平台家庭列表 |
| /api/summary | 單月摘要 |
| /api/annual-summary | 年度聚合 |
| /api/settlements-year | 結算年度 |
| /api/platform-settings | 平台設定 |
| /api/platform-defaults | 平台預設資料庫 |
| /api/bank-accounts | 銀行帳號列表 |
| /api/bank-transactions | 銀行交易列表 |
| /api/personal-income | 個人收入列表 |
| /api/member-advances | 成員代墊列表 |

### POST 端點

| 路徑 | action | 說明 |
|---|---|---|
| /api/lookup-family | — | 查詢所屬家庭 |
| /api/family-settings | update / put-status / delete-status | 家庭設定 |
| /api/family-accounts | create / restore / update / remove | 帳號 CRUD |
| /api/admin-families | add / remove | 家庭 CRUD |
| /api/admin-init-family | — | 初始化家庭 |
| /api/admin-migrate | — | 一次性資料遷移 |
| /api/platform-settings | update | 平台設定 |
| /api/platform-defaults | put / delete / set | 平台預設 CRUD |
| /api/bank-accounts | create / update / remove | 銀行帳號 CRUD |
| /api/bank-transactions | create / update / remove | 銀行交易 CRUD |
| /api/clear-bank-balances | — | 清除舊結餘 |
| /api/personal-income | save / remove | 個人收入 |
| /api/member-advances | create / update / remove | 成員代墊 |
| /api/insurance-sync | upsert / delete | 保險同步 + 基金累積 |

### POST /api/admin-migrate

**Request**：

| 欄位 | 說明 |
|---|---|
| familyId | 目標家庭 ID |
| confirm | 'MIGRATE_ALL'（必填） |

**Response**：

| 欄位 | 說明 |
|---|---|
| ok | true |
| migrated | true |
| familyId | 家庭 ID |
| summary | { expenses, payments, policies, funds } |

**特性**：可重複執行 / 冪等 / 需 superadmin。

---

### Functions 檔案結構

| 檔案 | Handler 數 |
|---|---|
| [[path]].js | Catch-all 路由器 |
| _config.js | Firebase REST 設定 |
| _helpers.js | API 共用輔助 |
| _admin.js | 3 |
| _bank.js | 3 |
| _family.js | 3 |
| _insurance.js | 1 |
| _personal.js | 2 |
| _platform.js | 2 |
| _summary.js | 3 |

---

## 三、錯誤回應格式

| 欄位 | 說明 |
|---|---|
| ok | false |
| error | ERROR_CODE |
| message | 錯誤訊息 |

### ERROR_CODE 對照

| Code | HTTP | 說明 |
|---|---|---|
| UNAUTHORIZED | 401 | 未登入 |
| FORBIDDEN | 403 | 無權限 |
| MISSING_FIELDS | 400 | 缺少欄位 |
| INVALID_BODY | 400 | 無效 body |
| BAD_REQUEST | 400 | 請求錯誤 |
| NOT_FOUND | 404 | 找不到 |
| CONFLICT | 409 | 衝突 |
| INTERNAL | 500 | 內部錯誤 |

---

## 四、成功回應格式

| 欄位 | 說明 |
|---|---|
| ok | true |
| ... | 資料欄位 |

---

## 五、關聯檔案

| 主題 | 檔案 |
|---|---|
| 資料結構 | P-09-data.md |
| 專案索引 | P-01-index.md |

---

/* ═══ EOF ═══
F: docs/P-08-api.md
V: 1791883800
B: B32-1
W: A20261013-001#011
═══ */
