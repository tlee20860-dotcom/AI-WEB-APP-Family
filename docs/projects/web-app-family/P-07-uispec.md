# P-07 專案 UI 規格與業務術語

最後更新：2026-10-21
Version: 1792581018
Writer: ai-system-20261021-004#18
用途：專案專屬 UI 規範與業務術語（通用結構已抽至 W-05）

---

## 一～六、通用 UI 結構

> **通用 UI 結構（頁面層級、Section 類型、控制列、標準佈局、資料呈現元件、表頭互動）請見 `W-05-schema.md` §九。**

---

## 七、側邊欄群組

| 群組 key | 標籤 | roles |
|---|---|---|
| overview | 總覽 | owner / member |
| record | 記錄中心 | owner / member |
| insurance-fund | 保險與基金 | owner / member |
| settle | 對帳 | owner / member |
| assets | 資產 | owner / member |
| reports | 報表 | owner / member |
| platform | 平台管理 | superadmin |
| system | 系統 | owner / member / superadmin |

---

## 八、頁面 metadata

**模組**：`js/config/page-metadata-registry.js`
**儲存**：`families/{familyId}/settings/page_metadata/{pageKey}`
**結構**：`{ title, subtitleStatic }`
**編輯入口**：settings 個人化 Tab → 「頁面標題」卡

---

## 九、常用術語對照（使用者 ↔ AI）

| 使用者常說 | 對應術語 |
|---|---|
| 「頁面主題」 | page-header 標題 |
| 「副標題」 | page-header 副標題 |
| 「統計卡」 | stats section |
| 「新增按鈕」 | page-controls add |
| 「卡片/表格切換」 | page-controls viewToggle |
| 「年度按鈕」 | page-controls year |
| 「月份按鈕」 | page-controls month |
| 「篩選器」 | page-controls filter |
| 「右上角那顆按鈕」 | page-header-actions 內的 item |
| 「Tab」 | tab-bar + tab-panel |
| 「側邊欄」 | sidebar |
| 「表頭排序」 | data-table sortable |
| 「編號對照清單」 | code-list.html（原「基礎資料庫」） |

---

## 十、擴充規則

| 步驟 | 動作 |
|---|---|
| 1 | 檢查是否已有類似術語 |
| 2 | 加到對應表格 |
| 3 | 更新 Version |

**禁止**：使用未定義術語 / 重複定義。

---

## 十一、業務術語（專案專屬）

### 保險類
| 術語 | 說明 |
|---|---|
| 基金保險 | 投資型保險 |
| 普通保險 | 住院 / 人壽 / 意外 |
| 供滿 | 保單供款年期結束 |
| 平攤 | 將年繳保費按 12 個月分攤 |
| 代墊 | 成員先墊付保費 |
| 保單持有人 | policyHolderId |
| 受保人 | memberId |
| 供款期 | periodIndex |

### 收支類
| 術語 | 說明 |
|---|---|
| 家用轉入 | income 節點 |
| 個人收入 | personal_income 節點 |
| 共同支出 | memberId = 'shared' |
| 額外收入 | extra 節點 |

### 結算類
| 術語 | 說明 |
|---|---|
| 待處理 | pending |
| 已處理 | done |
| 不適用 | skipped |
| 結算清單 | 整合個人支出 / 共同支出 / 保險扣款 |

### 基金類
| 術語 | 說明 |
|---|---|
| 保險基金 | type = 'insurance' |
| 獨立基金 | type = 'standalone' |
| 快照 | 每月記錄 |
| 累積供款 | cumulativeCost |
| 盈虧 | 現值 − 累積供款 |

### 銀行類
| 術語 | 說明 |
|---|---|
| 家庭帳號 | type = 'family' |
| 個人帳號 | type = 'personal' |
| 初始餘額 | initialBalance |
| 銀行交易 | in / out / transfer |

### 角色類
| 術語 | 說明 |
|---|---|
| superadmin | 超級管理員 |
| owner | 家庭擁有者 |
| member | 家庭成員 |
| canInput | 是否可輸入 |

### 編號系統類
| 術語 | 說明 |
|---|---|
| code | 實體編號（如 POL-001） |
| code-registry | 編號生成模組 |
| id-resolver | 編號查詢模組 |
| entity-create | 統一新增端點 |
| 編號對照清單 | code-list.html |
| 大類前綴 | MEM / PAY / POL / FUND / CAT / ITEM / COMP / INC / TXN |
| 子類短碼 | FUND / NORM / FUNIN / SAVE / SCH / TRA / MED / BNK / OTH |

---

## 十二、關聯檔案

| 主題 | 檔案 |
|---|---|
| 通用 UI 結構 | W-05-schema.md |
| 頁面區塊規格 | P-06-pagemap.md |
| 資料結構 | P-09-data.md |

---

/* ═══ EOF ═══
F: P-07-uispec.md
V: 1792581018
W: ai-system-20261021-004#18
═══ */