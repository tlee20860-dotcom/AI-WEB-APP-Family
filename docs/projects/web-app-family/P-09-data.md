# P-09 Firebase RTDB 資料結構

最後更新：2026-10-21
Version: 1792581021
Writer: ai-system-20261021-004#21
用途：本專案實際資料節點

---

## 一、platform 節點

### families/{familyId}/

| 欄位 | 內容 |
|---|---|
| name | 家庭名稱 |
| ownerEmail | 擁有者 Email |
| createdAt | 建立時間戳 |

### families/{familyId}/memberAccounts/{uid}/

| 欄位 | 內容 |
|---|---|
| email / account / displayName | 帳號資訊 |
| role | owner / member |
| canInput | true / false |
| memberId | 對應成員 ID |
| createdAt | 建立時間 |

### platform 索引

| 路徑 | 內容 |
|---|---|
| uid_index/{uid} | familyId |
| email_index/{account} | { uid, familyId } |

### platform/defaults/

| 節點 | 內容 |
|---|---|
| members / banks / insurance_companies | 預設基礎 |
| payment_methods / expense_categories / expense_items | 預設選項 |
| statuses / options / year_range / ui_constants | 預設設定 |

---

## 二、families 節點

### 基礎資料

| 節點 | 欄位 |
|---|---|
| members/{id} | name / role / order / code / createdAt |
| banks/{id} | name / order / code / createdAt（舊） |
| expense_categories/{id} | name / shortCode / order / code / createdAt |
| expense_items/{id} | name / categoryId / code / createdAt |
| payment_methods/{id} | name / order / code / createdAt |
| insurance_companies/{id} | name / code / createdAt |
| statuses/{id} | name / category / isDone / order / createdAt |

**新制**：所有實體加 code 欄位（D-008）。

### 銀行系統

| 路徑 | 欄位 |
|---|---|
| bank_accounts/{bankId} | name / type / ownerType / ownerId / isSystemCreated / initialBalance / initialYear / initialMonth / order / code / createdAt |
| bank_accounts/{bankId}/transactions/{txnId} | type / category / amount / date / memberId / refId / note / code / createdAt |

**交易 type**：in / out / transfer
**交易 category**：contribution / expense / insurance / reimbursement / manual

### 個人財務

| 路徑 | 內容 |
|---|---|
| personal_income/{memberId}/{year}/{month} | 數字 |
| member_advances/{memberId}/{advanceId} | policyId / totalAmount / remainingAmount / startYear / startMonth / paidMonths / note / createdAt |

**paidMonths 格式**：{ 'YYYY-MM': true }

### 收入

| 路徑 | 內容 |
|---|---|
| income/{year}/{month}/{memberId} | 數字 |

**額外收入 memberId**：extra

### 支出

| 路徑 | 欄位 |
|---|---|
| expenses/{year}/{month}/member_expenses/{memberId}/{expenseId} | name / amount / status / date / categoryId / itemId / paymentMethodId / bankId / txnId / isAutoLinked / policyId / repaidDate / code / createdAt |

**特殊 memberId**：shared（家庭共用）
**特殊 expenseId**：linked_{policyId}（保險連動）

### 保險

| 路徑 | 欄位 |
|---|---|
| insurance_policies/{policyId} | type / memberId / policyHolderId / name / company / paymentType / paymentMode / advanceHolderId / advanceId / firstStartYear / firstStartMonth / totalPolicyYears / totalPolicyPeriods / totalPremium / currentPeriodIndex / monthlyPremium / annualPremium / account / fundsAllocation / periods / isCompleted / code / createdAt |
| insurance_payments/{policyId}/{year}/{month} | status / amount / date / bankId / txnId / paymentMode |

**periods 結構**：{ '{N}': { periodIndex, startYear, startMonth, annualPremium, monthlyAverage } }

**fundsAllocation 結構**：[{ fundId, pct, fromYear, fromMonth }, ...]

### 基金

| 路徑 | 欄位 |
|---|---|
| funds/{fundId} | name / type / policyId / cost / currentValue / units / initialYear / initialMonth / note / code / createdAt |
| funds/{fundId}/snapshots/{year}/{month} | shares / nav / value / contribution / cumulativeCost / createdAt / updatedAt |

**type**：standalone（獨立）| insurance（掛於保單）
**snapshot.value**：shares × nav（自動計算）

### 家庭設定

| 節點 | 內容 |
|---|---|
| settings/options | { memberRoles, policyTypes, ... } |
| settings/year_range | { startYear, futureYears } |
| settings/ui_constants | { nameMaxLenDesktop, ... } |
| settings/page_metadata/{pageKey} | { title, subtitleStatic } |

### 廢除節點（保留不讀寫）

| 節點 | 狀態 |
|---|---|
| bank_balances/{year}/{month}/ | 廢除 |
| fixed_expenses/{year}/{month}/ | 廢除 |

---

## 三、狀態代碼

### 新代碼

| 代碼 | isDone |
|---|---|
| pending | false |
| done | true |
| skipped | true |

### 舊名稱 → 新代碼

| 舊名稱 | 新代碼 |
|---|---|
| 未處理 / 未還款 / 未付款 / 未扣款 / 未轉入 | pending |
| 已處理 / 已還款 / 已付款 / 已扣款 / 已轉入 | done |
| 不適用 | skipped |

### 讀寫策略

| 情境 | 做法 |
|---|---|
| 讀取 | status.normalize(raw) |
| 寫入 | 直接寫新代碼 |

---

## 四、顯示文字（依來源）

| 代碼 | 支出 | 保險 | 收入 |
|---|---|---|---|
| pending | 未付款 | 未扣款 | 未轉入 |
| done | 已付款 | 已扣款 | 已轉入 |

由 status.label(raw, { source }) 決定。

---

## 五、跨節點關聯

| 欄位 | 關聯 |
|---|---|
| expenses.*.bankId | bank_accounts/{bankId} |
| expenses.*.txnId | bank_accounts/{bankId}/transactions/{txnId} |
| expenses.*.categoryId | expense_categories/{id} |
| expenses.*.itemId | expense_items/{id} |
| expenses.*.paymentMethodId | payment_methods/{id} |
| expenses.*.policyId | insurance_policies/{policyId} |
| insurance_payments.*.bankId | bank_accounts/{bankId} |
| insurance_policies.advanceId | member_advances/{advanceHolderId}/{advanceId} |
| insurance_policies.fundsAllocation[].fundId | funds/{fundId} |
| funds.policyId | insurance_policies/{policyId} |
| member_advances.policyId | insurance_policies/{policyId} |
| platform.uid_index.{uid} | familyId |
| platform.email_index.{account} | { uid, familyId } |

---

## 六、大小限制

| 節點 | 限制 |
|---|---|
| expenses/{y}/{m}/member_expenses/{memberId}/ | ≤ 100 筆 |
| bank_accounts/{bankId}/transactions/ | ≤ 1000 筆 |
| income/{y}/{m}/ | ≤ 20 成員 |
| member_advances/{memberId}/ | ≤ 20 筆 |
| funds/{id}/snapshots/ | 無上限 |

---

## 七、基金累積流程

### 觸發

| 步驟 | 動作 |
|---|---|
| 1 | 使用者在結算清單改保險狀態為 done |
| 2 | 前端呼叫 api.insuranceSync(payload) |
| 3 | 後端 _insurance.js 執行 _accumulateFunds |
| 4 | 前端收到回應 → 更新 UI |

### 累積邏輯

| 步驟 | 動作 |
|---|---|
| 1 | 讀取 policy.fundsAllocation |
| 2 | 若為空 → 跳過 |
| 3 | 對每個 fundId：計算 addCost = monthlyPremium × pct / 100 |
| 4 | 讀取 funds/{fundId}/snapshots/{y}/{m} |
| 5 | 若 snapshot 存在 → 累加 cumulativeCost |
| 6 | 若不存在 → 建立 snapshot |
| 7 | 寫回 Firebase |

### 撤銷

| 步驟 | 動作 |
|---|---|
| 1 | 使用者在結算清單改回 pending |
| 2 | 前端呼叫 api.insuranceUnsync |
| 3 | 後端執行 _reverseFundAccumulation |
| 4 | 對每個 fundId：減去 addCost |
| 5 | 更新 snapshot 的 cumulativeCost |

### 一致性保證

| 保證 | 說明 |
|---|---|
| 自動累積 | 使用者不需手動計算 |
| 自動撤銷 | 改回 pending 時自動回退 |
| 禁止手動改 | 只能透過 sync / unsync |
| 冪等 | 重複呼叫同狀態 → 無變化 |

---

## 八、舊資料相容策略

### 相容原則

| 原則 | 說明 |
|---|---|
| 不刪除舊資料 | 所有節點保留 |
| 不破壞讀寫 | 舊資料可正常讀取 |
| 寫入新格式 | 新資料一律寫新代碼 |
| 讀取時映射 | 舊名稱 → 新代碼 |
| 使用者零感知 | 操作邏輯完全不變 |
| 一次性遷移 | 提供 API 供主動遷移 |

### 相容清單

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
| 舊版帳號 | verifyFamilyAccess 收緊 | functions/api/_helpers.js |
| 基金無 type | fallback = 'standalone' | entity-definitions.js |
| 基金無 initialYear / Month | fallback = '' | db.js |
| 保單無 fundsAllocation | fallback = [] | db.js |
| 支出無 isAutoLinked | fallback = !!policyId | entity-definitions.js |
| 實體無 code | 由新制遷移補上（議題 4） | code-registry.js |

### 狀態正規化流程

**讀取**：Firebase → normalize → 標準代碼 → label → 顯示
**寫入**：使用者輸入 → options → 代碼 → Firebase

**主動遷移**：

| 步驟 | 動作 |
|---|---|
| 1 | superadmin 進 settings 個人化 |
| 2 | 點「執行遷移」 |
| 3 | 呼叫 POST /api/admin-migrate |
| 4 | 後端改寫舊狀態為新代碼 |
| 5 | 補齊缺失欄位（含 code） |

**特性**：可重複執行 / 不刪資料 / 不影響 UI / 不可逆。

### 舊節點處理

| 節點 | 狀態 | 處理 |
|---|---|---|
| bank_balances/ | 廢除 | 不讀寫；UI 提供清除按鈕 |
| fixed_expenses/ | 廢除 | 保留 summary.js 讀取 |
| banks/ | 部分廢除 | entity-registry 一併註冊 |

### 測試清單

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
| 14 | 實體無 code | 遷移後補上 |

---

## 九、關聯檔案

| 主題 | 檔案 |
|---|---|
| Firebase RTDB 原則 | W-01-firebase.md |
| API 契約 | P-08-api.md |
| 專案索引 | P-01-index.md |
| 決策 | P-04-adr-index.md |

---

/* ═══ EOF ═══
F: P-09-data.md
V: 1792581021
W: ai-system-20261021-004#21
═══ */