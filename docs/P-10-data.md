# P-10 Firebase RTDB 資料結構

最後更新：B29-9d
版本：v103.0.37
批次：B29-9d
用途：資料節點參考

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
| members/{id} | name / role / order / createdAt |
| banks/{id} | name / order / createdAt（舊） |
| expense_categories/{id} | name / order / createdAt |
| expense_items/{id} | name / categoryId / createdAt |
| payment_methods/{id} | name / order / createdAt |
| insurance_companies/{id} | name / createdAt |
| statuses/{id} | name / category / isDone / order / createdAt |

### 銀行系統

| 路徑 | 欄位 |
|---|---|
| bank_accounts/{bankId} | name / type / ownerType / ownerId / isSystemCreated / initialBalance / initialYear / initialMonth / order / createdAt |
| bank_accounts/{bankId}/transactions/{txnId} | type / category / amount / date / memberId / refId / note / createdAt |

**交易 type**：in / out / transfer
**交易 category**：contribution / expense / insurance / reimbursement / manual

### 個人財務

| 路徑 | 內容 |
|---|---|
| personal_income/{memberId}/{year}/{month} | 數字 |
| member_advances/{memberId}/{advanceId} | policyId / totalAmount / remainingAmount / startYear / startMonth / paidMonths / note / createdAt |

**paidMonths 格式**：`{ 'YYYY-MM': true }`

### 收入

| 路徑 | 內容 |
|---|---|
| income/{year}/{month}/{memberId} | 數字 |

**額外收入 memberId**：`extra`

### 支出

| 路徑 | 欄位 |
|---|---|
| expenses/{year}/{month}/member_expenses/{memberId}/{expenseId} | name / amount / status / date / categoryId / itemId / paymentMethodId / bankId / txnId / isAutoLinked / policyId / repaidDate / createdAt |

**特殊 memberId**：`shared`（家庭共用）
**特殊 expenseId**：`linked_{policyId}`（保險連動）

### 保險

| 路徑 | 欄位 |
|---|---|
| insurance_policies/{policyId} | type / memberId / policyHolderId / name / company / paymentType / paymentMode / advanceHolderId / advanceId / firstStartYear / firstStartMonth / totalPolicyYears / totalPolicyPeriods / totalPremium / currentPeriodIndex / monthlyPremium / annualPremium / account / fundsAllocation / periods / isCompleted / createdAt |
| insurance_payments/{policyId}/{year}/{month} | status / amount / date / bankId / txnId / paymentMode |

**periods 結構**：`{ '{N}': { periodIndex, startYear, startMonth, annualPremium, monthlyAverage } }`

**fundsAllocation 結構**（B23 新增）：`[{ fundId, pct, fromYear, fromMonth }, ...]`

### 基金（B23 擴充）

| 路徑 | 欄位 |
|---|---|
| funds/{fundId} | name / type / policyId / cost / currentValue / units / initialYear / initialMonth / note / createdAt |
| funds/{fundId}/snapshots/{year}/{month} | shares / nav / value / contribution / cumulativeCost / createdAt / updatedAt |

**type**：`standalone`（獨立）| `insurance`（掛於保單）

**snapshot.value**：`shares × nav`（自動計算）

### 家庭設定

| 節點 | 內容 |
|---|---|
| settings/options | { memberRoles, policyTypes, ... } |
| settings/year_range | { startYear, futureYears } |
| settings/ui_constants | { nameMaxLenDesktop, ... } |
| settings/page_metadata/{pageKey} | { title, subtitleStatic }（B29-5b 新增） |

### 廢除節點（保留不讀寫）

| 節點 | 狀態 |
|---|---|
| bank_balances/{year}/{month}/ | 🗑 廢除 |
| fixed_expenses/{year}/{month}/ | 🗑 廢除 |

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

由 `status.label(raw, { source })` 決定。

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
| funds/{id}/snapshots/ | 無上限（依年月，最多 = 年數 × 12） |

---

## 七、B23 新增：基金累積流程

### 7.1 觸發

| 步驟 | 動作 |
|---|---|
| 1 | 使用者在結算清單改保險狀態為 `done` |
| 2 | 前端呼叫 `api.insuranceSync(payload)` |
| 3 | 後端 `_insurance.js` 執行 `_accumulateFunds` |
| 4 | 前端收到回應 → 更新 UI |

### 7.2 累積邏輯（_accumulateFunds）

| 步驟 | 動作 |
|---|---|
| 1 | 讀取 `policy.fundsAllocation`（陣列） |
| 2 | 若為空 → 跳過 |
| 3 | 對每個 fundId：計算 `addCost = monthlyPremium × pct / 100` |
| 4 | 讀取 `funds/{fundId}/snapshots/{y}/{m}` |
| 5 | 若 snapshot 存在 → 累加 `cumulativeCost` |
| 6 | 若不存在 → 建立 snapshot，`cumulativeCost = addCost` |
| 7 | 寫回 Firebase |

**關鍵欄位**：

| 欄位 | 說明 |
|---|---|
| fundsAllocation[].fundId | 目標基金 ID |
| fundsAllocation[].pct | 分配比例（%） |
| fundsAllocation[].fromYear | 起始年 |
| fundsAllocation[].fromMonth | 起始月 |
| snapshot.cumulativeCost | 累積供款（自動累加） |
| snapshot.contribution | 當月供款 |

### 7.3 撤銷（_reverseFundAccumulation）

| 步驟 | 動作 |
|---|---|
| 1 | 使用者在結算清單改回 `pending` |
| 2 | 前端呼叫 `api.insuranceUnsync(payload)` |
| 3 | 後端 `_insurance.js` 執行 `_reverseFundAccumulation` |
| 4 | 讀取 `policy.fundsAllocation` |
| 5 | 對每個 fundId：減去 `addCost` |
| 6 | 更新 snapshot 的 `cumulativeCost` |
| 7 | 寫回 Firebase |

### 7.4 一致性保證

| 保證 | 說明 |
|---|---|
| 自動累積 | 使用者不需手動計算 |
| 自動撤銷 | 改回 pending 時自動回退 |
| 禁止手動改 cumulativeCost | 只能透過 sync / unsync |
| 冪等 | 重複呼叫同狀態 → 無變化 |

---

## 八、關聯檔案

| 主題 | 檔案 |
|---|---|
| 相容策略 | P-11-compat.md |
| API 契約 | P-09-api.md |
| 專案錨點 | P-02-anchor.md |
| 重構計畫 | P-14-refactor.md |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-10-data.md
   Version: v103.0.37
   Batch: B29-9d
   ═══════════════════════════════════════════ */
