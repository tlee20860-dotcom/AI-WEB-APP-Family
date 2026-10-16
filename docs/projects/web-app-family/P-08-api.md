# P-08 API 契約

最後更新：B34-4
Version: 1791904360
Batch: B34-4
Writer: A20261013-004#180
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

---

### label-registry.js

| API | 說明 |
|---|---|
| L(path, params) | 依路徑取得文字 |
| has(path) | 是否存在 |
| getGroup(name) | 取得整個分類 |

---

### column-registry.js

| API | 說明 |
|---|---|
| getColumns(key) | 欄位定義 |
| getResolvers(key) | 值轉換函式 |
| getColumnsWith(key, extra) | 追加欄位 |

**COLUMNS key（19 種）**：
members / banks / bankAccounts / categories / items / payments / statuses / companies / funds / fundSnapshots / insurance / insurancePolicies / settlements / bankTransactions / recentExpense / memberReport / dashboardAnnual / annualSummary / annualMonthly / **codeList（🆕 B34-4）**

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

---

### entity-funds-allocation.js

| API | 說明 |
|---|---|
| renderFundsAllocationField(root, initialAlloc, policyType, opts) | 渲染關聯基金欄位 |

**opts**：{ defaultYear, defaultMonth }
**回傳**：getValue() 函式

---

### code-registry.js（✅ B34-4 已交付）

| API | 說明 |
|---|---|
| generateCode(prefix, 現有實體列表) | 生成編號（查最大 + 1） |
| generateWithSubtype(prefix, subtype, 實體列表) | 帶子類短碼 |
| checkDuplicate(code, 實體列表) | 檢查重複 |
| getSubtypeFromContext(entityType, extra) | 依上下文自動決定子類短碼 |
| generateCodeFor(entityType, extra) | **主入口**：依 entityType 生成完整編號 |

**常數**：

| 常數 | 內容 |
|---|---|
| PREFIX_MAP | member → MEM / policy → POL / … |
| POLICY_SUBTYPE_MAP | normal → NORM / fund_insurance → FUND / savings → SAVE |
| CATEGORY_SHORTCODES | 學校類 → SCH / 交通類 → TRA / 醫療類 → MED / 銀行類 → BNK / 其他 → OTH |

---

### id-resolver.js（✅ B34-4 已交付）

| API | 說明 |
|---|---|
| getEntityByCode(entityType, code) | 從編號查實體（遍歷） |
| getRelatedEntities(code) | 從編號展開所有關聯 |

**禁止**：從名稱查編號（不做）。

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
| **編號前綴（🆕 B34-4）** | **CODE_PREFIXES / POLICY_SUBTYPE_MAP** |
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

**內建 type**：add / export / viewToggle / viewSwitcher / sort / year / month / filter / custom

---

### data-table.js

| API | 說明 |
|---|---|
| renderDataTable(options) | 渲染表格（含表頭排序 / 篩選） |

**回傳**：{ container, table, refresh, destroy }

---

### data-card.js

| API | 說明 |
|---|---|
| renderDataCard(options) | 渲染卡片（含 customActions） |

---

### lib/expense-modal.js

| API | 說明 |
|---|---|
| openExpenseModal({ row, mode, onSuccess }) | mode: 'data' \| 'settle' |

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

（同前，未變）

---

### lib/bank.js

（同前，未變）

---

### core/db.js

（同前，未變，v103.0.36）

---

### core/debug.js

（同前，未變）

---

### core/state.js（AppState）

（同前，未變）

---

### core/api.js（✅ B34-4 加 entityCreate）

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
| **api.entityCreate(payload)** | **🆕 統一新增端點** |
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

### ui/dropdown-plus.js（✅ B34-4 已交付）

| API | 說明 |
|---|---|
| isSimpleEntity(entityType) | 判定是否為簡單實體 |
| handlePlusClick(entityType, context) | 主入口：prompt 或 modal |
| attachPlusButton(selectEl, entityType, onCreated) | 為 select 掛 + 號 |

**簡單實體清單**：member / bank / category / payment / company

---

### ui/modal.js（✅ B34-4 加 openPrompt）

| API | 說明 |
|---|---|
| openModal(target, options) | 開啟 Modal |
| closeModal(target) | 關閉 |
| closeAllModals() | 全部關閉 |
| openConfirm(message, options) | 確認對話框 |
| **openPrompt(options)** | **🆕 輕量輸入框** |
| bindModalEscClose() | 綁定 ESC 關閉 |
| bindModalBackdropClose(modalId) | 綁定背景點擊關閉 |

---

### ui/form-builder.js（✅ B34-4 支援 plusEntity）

| API | 說明 |
|---|---|
| buildForm(options) | 建構表單 → api 物件 |

**api 提供**：getData / setData / setFieldValue / getFieldValue / getFieldEl / reset / setError / clearErrors / updateOptions / onFieldChange / submit / setSubmitting / destroy

**新支援欄位屬性**：

| 屬性 | 說明 |
|---|---|
| plusEntity | 自動生成 + 號按鈕 |
| plusValueKey | 自動選中的欄位（預設 'id'） |
| onPlusReload | 自訂重載 callback |

---

### shared/yearrange-card.js（✅ B34-4 已交付）

| API | 說明 |
|---|---|
| initYearRangeCard(containerId) | 初始化年份範圍卡 |

---

### entity-definitions.js（✅ B34-4 加 codePrefix）

（同前，加 codePrefix / policySubtypes 屬性）

---

### entity-helpers.js（✅ B34-4 全改走 API）

| API | 說明 |
|---|---|
| createEntity(entityKey, data, allRows) | 走 API + code-registry → 回傳 { id, code } |
| updateEntity(entityKey, id, data, allRows) | 走 API → 回傳 { id, code } |
| removeEntity(entityKey, id) | 走 API |
| deleteEntity(entityKey, id, ...args) | 有特殊 delete 則走本地 |
| getDynamicOptions(source, context) | 動態選項 |
| updateEntityStatus(source, row, newStatus) | 跨來源改狀態 |
| listenEntity(entityKey, cb, err) | 監聽 |

---

### entity-modal.js（✅ B34-4 回傳 { id, code }）

（同前，onSuccess 接收 { id, code, data }）

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
| **/api/entity-create** | **create / update / delete** | **🆕 統一 CRUD** |

---

### POST /api/entity-create（✅ B34-4 已交付）

**Request**：

| 欄位 | 類型 | 說明 |
|---|---|---|
| entityType | string | 見下表 |
| action | string | create / update / delete |
| code | string | 前端生成的編號（create 用） |
| name | string | 名稱 |
| id | string | 實體 ID（update / delete 用） |
| extra | object | 依類型不同 |

**entityType 清單與 extra 欄位**：

| entityType | extra 必填 | extra 可選 |
|---|---|---|
| member | — | role, order |
| bank | — | order |
| category | shortCode | order |
| item | categoryId | — |
| payment | — | order |
| company | — | — |
| policy | type, memberId, firstStartYear, firstStartMonth, totalPolicyYears | fundsAllocation, monthlyPremium, annualPremium |
| fund | type | policyId, cost, initialYear, initialMonth |
| bankAccount | bankId, type, ownerType | ownerId, initialBalance, initialYear, initialMonth |

**成功回應**：{ ok: true, id, code }

**失敗回應**：

| error | 觸發 |
|---|---|
| CODE_DUPLICATE | 編號已存在 |
| NAME_DUPLICATE | 名稱重複 |
| MISSING_FIELDS | 必填欄位缺少 |
| INVALID_BODY | JSON 格式錯誤 |
| UNAUTHORIZED | 未登入 |
| FORBIDDEN | 無權限 |
| NOT_FOUND | 找不到（update / delete） |
| INTERNAL | 後端例外 |

**後端檢查順序**：

| # | 檢查 |
|---|---|
| 1 | 驗證登入 + 權限 |
| 2 | 驗證 body 格式 |
| 3 | 驗證必填欄位 |
| 4 | 查重複 code（create） |
| 5 | 查重複 name |
| 6 | 寫入 Firebase |

**檔案**：functions/api/_entity.js（v1.0.2）

---

### POST /api/admin-migrate

（同前，未變）

---

### Functions 檔案結構

| 檔案 | Handler 數 | 狀態 |
|---|---|---|
| [[path]].js | Catch-all 路由器 | ✅ v103.0.45 |
| _config.js | Firebase REST 設定 | ✅ |
| _helpers.js | API 共用輔助 | ✅ |
| _admin.js | 3 | ✅ |
| _bank.js | 3 | ✅ |
| _family.js | 3 | ✅ |
| _insurance.js | 1 | ✅ |
| _personal.js | 2 | ✅ |
| _platform.js | 2 | ✅ |
| _summary.js | 3 | ✅ |
| **_entity.js** | **1（entity-create）** | **✅ B34-4** |

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
| CODE_DUPLICATE | 409 | 編號重複 |
| NAME_DUPLICATE | 409 | 名稱重複 |
| INTERNAL | 500 | 內部錯誤 |

---

## 四、成功回應格式

| 欄位 | 說明 |
|---|---|
| ok | true |
| ... | 資料欄位 |

---

## 五、B34-4 交付完成清單

| 模組 | 狀態 |
|---|---|
| code-registry.js | ✅ |
| id-resolver.js | ✅ |
| code-list.html / code-list.js | ✅ |
| entity-create 端點 | ✅ |
| dropdown-plus.js | ✅ |
| form-builder plusEntity | ✅ |
| settings 年份範圍 | ✅ |

**皆已交付並通過測試。**

---

## 六、關聯檔案

| 主題 | 檔案 |
|---|---|
| 資料結構 | P-09-data.md |
| 專案索引 | P-01-index.md |
| 議題結論 | P-12-conclusion.md |
| CF Functions 規則 | W-02-functions.md |
| 重組計畫 | P-15-reorg-plan.md |

---

/* ═══ EOF ═══
F: docs/P-08-api.md
V: 1791904360
B: B34-4
W: A20261013-004#180
═══ */