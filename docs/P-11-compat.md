# P-11 舊資料相容策略

最後更新：B29-8c
版本：v103.0.36
批次：B29
用途：舊資料相容處理參考

---

## 一、相容原則

| 原則 | 說明 |
|---|---|
| 不刪除舊資料 | 所有節點保留 |
| 不破壞讀寫 | 舊資料可正常讀取 |
| 寫入新格式 | 新資料一律寫新代碼 |
| 讀取時映射 | 舊名稱 → 新代碼 |
| 使用者零感知 | 操作邏輯完全不變 |
| 一次性遷移 | 提供 API 供主動遷移 |

---

## 二、相容清單

| 舊資料 | 相容策略 | 實作位置 |
|---|---|---|
| 狀態：未處理 / 已扣款 | status.normalize(raw) | status-registry.js |
| banks/ 節點 | entity-registry 註冊 | entity-registry.js |
| bank_balances/ | 不讀寫，UI 清除按鈕 | bank-account-manager |
| fixed_expenses/ | summary.js 仍讀取 | functions/api/_summary.js |
| linked_xxx 支出 | merge.js 仍解析 | lib/merge.js |
| 保險無 paymentMode | fallback = 'direct' | entity-definitions.js |
| 帳號無 memberId | 3 層 fallback | functions/api/_personal.js |
| 保單無 advanceHolderId | fallback = '' | entity-definitions.js |
| 保單無 advanceId | fallback = '' | entity-definitions.js |
| 舊版帳號（無 memberAccount） | verifyFamilyAccess 收緊 | functions/api/_helpers.js |
| 基金無 type | fallback = 'standalone' | entity-definitions.js |
| 基金無 initialYear / Month | fallback = '' | db.js |
| 保單無 fundsAllocation | fallback = [] | db.js |
| 支出無 isAutoLinked | fallback = !!policyId | entity-definitions.js |

---

## 三、狀態正規化流程

**讀取（自動）**：

| 步驟 | 動作 |
|---|---|
| 1 | Firebase 資料 |
| 2 | status.normalize(raw) |
| 3 | 標準代碼（pending / done / skipped） |
| 4 | status.label(code, { source }) |
| 5 | 顯示文字 |

**寫入（自動）**：

| 步驟 | 動作 |
|---|---|
| 1 | 使用者輸入 |
| 2 | status.options({ source }) |
| 3 | 選擇代碼 |
| 4 | 寫入 Firebase |

**主動遷移**：

| 步驟 | 動作 |
|---|---|
| 1 | superadmin 進 settings 個人化 |
| 2 | 點「執行遷移」 |
| 3 | 呼叫 `POST /api/admin-migrate` |
| 4 | 後端改寫舊狀態為新代碼 |
| 5 | 補齊缺失欄位 |

**特性**：

| 項目 | 說明 |
|---|---|
| 可重複執行 | 冪等 |
| 不刪資料 | 只更新欄位 |
| 不影響 UI | 前端顯示完全不變 |
| 不可逆 | 舊格式永久改新格式 |

---

## 四、舊狀態名稱映射

| 舊名稱 | 新代碼 |
|---|---|
| 未處理 / 未還款 / 未付款 / 未扣款 / 未轉入 | pending |
| 已處理 / 已還款 / 已付款 / 已扣款 / 已轉入 | done |
| 不適用 | skipped |

---

## 五、舊節點處理

| 節點 | 狀態 | 處理 |
|---|---|---|
| bank_balances/ | 廢除 | 不讀寫；UI 提供清除按鈕 |
| fixed_expenses/ | 廢除 | 保留 summary.js 讀取 |
| banks/ | 部分廢除 | entity-registry 一併註冊 |

---

## 六、實作細節

### 6.1 status.normalize()

| 情況 | 回傳 |
|---|---|
| null / undefined / 空字串 | pending |
| 已是新代碼 | 原樣 |
| 舊名稱在 LEGACY_MAP | 對應新代碼 |
| 未知 | pending |

### 6.2 entity-registry 舊 banks 註冊

| 節點 | 對應 |
|---|---|
| members | members |
| banks | banks |
| bank_accounts | bank_accounts |
| categories | expense_categories |
| items | expense_items |
| companies | insurance_companies |
| payments | payment_methods |

### 6.3 merge.js 舊 linked 解析

| 步驟 | 動作 |
|---|---|
| 1 | 過濾 memberExpenses 的 isAutoLinked |
| 2 | 取 policyId 或 _extractPolicyId(e.id) |
| 3 | 存入 linkedMap[policyId] |
| 4 | 與 insuranceRows 合併 |

### 6.4 entity-definitions 保單 toForm

| 欄位 | fallback |
|---|---|
| annualPremium | 從 periods[currentPeriodIndex] 取，否則 row.annualPremium |
| monthlyPremium | row.monthlyPremium 或 0 |
| paymentMode | row.paymentMode 或 'direct' |
| advanceHolderId | row.advanceHolderId 或 '' |
| fundsAllocation | row.fundsAllocation 或 [] |

### 6.5 functions/api/_personal.js 3 層 fallback

| 層級 | 邏輯 |
|---|---|
| 1 | memberAccount.memberId 存在 → 使用 |
| 2 | displayName 匹配 members → 使用 |
| 3 | 家庭只有 1 個成員 → 自動使用 |
| 4 | 皆無 → 回傳空字串 |

### 6.6 verifyFamilyAccess 收緊

| 情境 | 處理 |
|---|---|
| Super admin | 直接通過 |
| 舊版帳號（user.localId === familyId） | 允許 |
| 新版帳號（memberAccounts 有記錄） | 允許 |
| 找不到 | 拒絕 |

### 6.7 基金 fallback

| 情況 | 處理 |
|---|---|
| 舊基金無 type | 當作 standalone |
| 舊基金無 initialYear / Month | 顯示 '—' |
| 舊保單無 fundsAllocation | 當作 [] |

---

## 七、舊資料保留策略

**不刪除的節點**：

| 節點 | 說明 |
|---|---|
| bank_balances/ | 保留但 UI 不再寫入 |
| fixed_expenses/ | 保留但 UI 不再寫入 |
| banks/ | 保留，向後相容 |

**UI 提供清除按鈕**：

| 位置 | 用途 |
|---|---|
| 系統設定 → 銀行帳號 → 危險區域 | 清除 bank_balances/ |

---

## 八、測試清單

| # | 情境 | 預期 |
|---|---|---|
| 1 | 舊資料（狀態「未付款」） | 顯示「未付款」 |
| 2 | 舊資料（狀態「已扣款」） | 顯示「已扣款」 |
| 3 | 新資料（狀態 pending） | 顯示「未付款」 |
| 4 | 新資料（狀態 done） | 顯示「已付款」 |
| 5 | 舊 banks/ 節點 | 正常顯示 |
| 6 | bank_balances/ 存在 | UI 顯示清除按鈕 |
| 7 | fixed_expenses/ 存在 | summary 仍讀取 |
| 8 | 保險無 paymentMode | 當作 direct |
| 9 | 帳號無 memberId | fallback 生效 |
| 10 | 基金無 type | 當作 standalone |
| 11 | 保單無 fundsAllocation | 當作 [] |
| 12 | 執行一次性遷移 | 舊狀態改寫為新代碼 |
| 13 | 重複執行遷移 | 掃描 X，修改 0 |

---

## 九、相容層版本歷史

| 版本 | 變更 |
|---|---|
| v103.0.0 | 建立相容層 |
| v103.0.11 | 移除 updateFixedExpenseCompat |
| v103.0.18 | B19 無補丁重構 |
| v103.0.21 | B23 基金 fallback |
| v103.0.22 | B25-6 一次性遷移 API |

---

## 十、關聯檔案

| 主題 | 檔案 |
|---|---|
| 資料結構 | P-10-data.md |
| API 契約 | P-09-api.md |
| 專案錨點 | P-02-anchor.md |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-11-compat.md
   Version: v103.0.36
   Batch: B29-8c
   ═══════════════════════════════════════════ */