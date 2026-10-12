# P-13 業務術語表

最後更新：B29-8b
版本：v103.0.36
批次：B29
用途：本專案業務術語對照（AI 理解使用者語意）

---

## 一、保險類

| 術語 | 說明 |
|---|---|
| 基金保險 | 投資型保險；掛於保單，每月供款按比例購基金 |
| 普通保險 | 住院 / 人壽 / 意外等非投資型保險 |
| 供滿 | 保單供款年期結束（completedPeriods = totalPeriods） |
| 平攤 | 將年繳保費按 12 個月分攤（monthlyAverage） |
| 代墊 | 成員先墊付保費，家庭每月償還 |
| 保單持有人 | policyHolderId（fallback = memberId） |
| 受保人 | memberId |
| 供款期 | 保單年度的分期（periodIndex） |

---

## 二、收支類

| 術語 | 說明 |
|---|---|
| 家用轉入 | 家庭成員轉入家用（income 節點） |
| 個人收入 | 成員個人收入（personal_income 節點） |
| 共同支出 | 家庭共用支出（memberId = 'shared'） |
| 家庭共用 | 同上 |
| 額外收入 | extra 節點（income 特殊 key） |
| 個人支出 | 成員個人支出（member_expenses） |

---

## 三、結算類

| 術語 | 說明 |
|---|---|
| 待處理 | 未付款 / 未扣款 / 未轉入（pending） |
| 已處理 | 已付款 / 已扣款 / 已轉入（done） |
| 不適用 | skipped |
| 結算清單 | 整合個人支出 / 共同支出 / 保險扣款 |

---

## 四、基金類

| 術語 | 說明 |
|---|---|
| 保險基金 | type = 'insurance'；掛於基金保險保單 |
| 獨立基金 | type = 'standalone'；手動記錄 |
| 快照 | 每月記錄股數 / 股價 / 現值 / 累積供款 |
| 累積供款 | 保險扣款時自動分配（cumulativeCost） |
| 盈虧 | 現值 − 累積供款 |

---

## 五、銀行類

| 術語 | 說明 |
|---|---|
| 家庭帳號 | type = 'family' |
| 個人帳號 | type = 'personal' |
| 初始餘額 | initialBalance |
| 初始年月 | initialYear / initialMonth |
| 銀行交易 | in / out / transfer |
| 出帳 | type = 'out' |
| 入帳 | type = 'in' |
| 內部轉帳 | type = 'transfer' |

---

## 六、角色類

| 術語 | 說明 |
|---|---|
| superadmin | 超級管理員（平台層） |
| owner | 家庭擁有者 |
| member | 家庭成員 |
| canInput | 是否可輸入（true / false） |

---

## 七、實體類

| 術語 | 說明 |
|---|---|
| 8 實體 | member / bank / policy / fund / category / item / payment / status |
| 實體定義 | entity-definitions.js |
| 實體 resolver | entity-resolvers.js |
| 實體 modal | entity-modal.js |

---

## 八、UI 類

| 術語 | 說明 |
|---|---|
| 控制列 | page-controls |
| 表頭互動 | data-table 排序 / 篩選 |
| viewToggle | 卡片 / 表格切換 |
| viewSwitcher | 檢視切換（如全年/月度） |
| 卡片模式 | card |
| 表格模式 | table |

**完整 UI 術語**：P-08-uispec.md

---

## 九、資料節點類

| 術語 | 說明 |
|---|---|
| families/{id}/ | 家庭根節點 |
| platform/ | 平台層 |
| expenses/ | 支出 |
| income/ | 家用轉入 |
| personal_income/ | 個人收入 |
| insurance_policies/ | 保單 |
| insurance_payments/ | 保險扣款 |
| funds/ | 基金 |
| funds/{id}/snapshots/ | 基金快照 |
| bank_accounts/ | 銀行帳號 |
| bank_accounts/{id}/transactions/ | 銀行交易 |
| member_advances/ | 成員代墊 |

**完整結構**：P-10-data.md

---

## 十、關聯檔案

| 主題 | 檔案 |
|---|---|
| UI 術語 | P-08-uispec.md |
| 資料結構 | P-10-data.md |
| 舊資料相容 | P-11-compat.md |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-13-glossary.md
   Version: v103.0.36
   Batch: B29-8b
   ═══════════════════════════════════════════ */