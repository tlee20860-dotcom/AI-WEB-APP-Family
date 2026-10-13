# P-07 UI 規格書 + 業務術語

最後更新：B32-1
Version: 1791883800
Batch: B32-1
Writer: A20261013-001#011
用途：UI 術語 + 頁面結構 + 業務術語（合併原 P-08 + P-13）

---

## 一、頁面結構層級

| 層級 | 術語 | 說明 | 範例 |
|---|---|---|---|
| L1 | Page（頁面） | 一個 .html | index.html |
| L2 | Section（區塊） | 頁面內垂直堆疊的功能區 | page-header / stats |
| L3 | Row（列） | Section 內水平排列 | toolbar row |
| L4 | Item（元素） | 最小單位 | button / select |

---

## 二、Section 類型

| 術語 | 中文 | 用途 | 標準位置 |
|---|---|---|---|
| page-banner | 提示橫幅 | 說明文字 | 頁面最上 |
| page-header | 頁首 | 標題 + 副標題 + 主要操作 | banner 之後 |
| page-header-actions | 頁首操作區 | 標題行右側 | page-header 內 |
| stats | 統計卡區 | 數字統計 | header 之後 |
| page-controls | 控制列 | 篩選 / 切換 / 年月 | stats 之後 |
| content | 內容區 | 表格 / 卡片 | 最底 |
| empty-state | 空狀態 | 無資料時顯示 | 內容區內 |
| tab-bar | 分頁列 | 同頁多分頁 | 各處 |
| tab-panel | 分頁內容 | Tab 對應內容 | 分頁列下方 |
| sidebar | 側邊欄 | 左側導覽 | 頁面左側 |
| navbar | 頂部導覽 | 使用者資訊 | 頁面頂部 |

---

## 三、控制列元素

| 術語 | type | 用途 | 位置 |
|---|---|---|---|
| add | add | 新增按鈕 | toolbar 左 |
| export | export | 匯出按鈕 | page-header 右 / toolbar 右 |
| viewToggle | viewToggle | 卡片 / 表格切換 | 強制 body |
| viewSwitcher | viewSwitcher | 檢視切換 | body 全行 |
| sort | sort | 排序下拉 | 強制 body |
| year | year | 年份下拉 | body 左側 |
| month | month | 月份下拉 | body 左側（靠年） |
| filter | filter | 篩選器（自訂 HTML） | body 全行 |
| custom | custom | 自訂按鈕 / 連結 | 依需求 |

**位置屬性**：

| position | 渲染位置 |
|---|---|
| （未設） | page-controls body |
| header | page-header 右側 |

**強制 body 的 type**：viewToggle / sort

---

## 四、頁面標準佈局

| 順序 | Section | 內容 |
|---|---|---|
| 1 | page-banner | banner（若有） |
| 2 | page-header | 標題 + 副標題 + 主要操作 |
| 3 | stats | 統計卡 |
| 4 | page-controls | 新增 / 切換 / 年月 / 篩選 |
| 5 | content | 表格 / 卡片 |

**例外**（Tab 頁）：input-center / database / settings / admin / finance-overview

---

## 五、資料呈現元件

| 術語 | 中文 | 判斷準則 |
|---|---|---|
| table | 表格 | 欄位多、需對齊比較 |
| card | 卡片 | 手機 / 少量欄位 |
| tab | 分頁 | 同頁多個獨立區塊 |
| collapsible | 可摺疊 | 次要內容 |
| modal | 彈窗 | 編輯 / 確認對話框 |
| form | 表單 | 資料輸入欄位 |
| badge | 標籤 | 狀態小標籤 |
| progress | 進度條 | 進度視覺化 |

---

## 六、表頭互動（data-table）

**表頭可排序**：

| 動作 | 結果 |
|---|---|
| 點欄位標題（首次） | 升序 |
| 點欄位標題（第二次） | 降序 |
| 點欄位標題（第三次） | 清除排序 |

**依 type 判斷可排序**：text / number / date / select

**表頭可篩選**：

| 動作 | 結果 |
|---|---|
| 點欄位旁的 🔽 | 開下拉面板 |
| 選值 → 套用 | 篩選生效 |
| 點清除 | 清除篩選 |

**依 filterOptions 判斷可篩選**。

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

**模組**：js/config/page-metadata-registry.js

**儲存**：families/{familyId}/settings/page_metadata/{pageKey}

**結構**：`{ title, subtitleStatic }`

**顯示機制**：

| 元素 | 機制 |
|---|---|
| title | textContent 覆蓋 |
| subtitleStatic | data-prefix + CSS ::before |

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

---

## 十、擴充規則

| 步驟 | 動作 |
|---|---|
| 1 | 檢查是否已有類似術語 |
| 2 | 加到對應表格 |
| 3 | 更新 Version |

**禁止**：使用未定義術語 / 重複定義。

---

## 十一、業務術語（原 P-13）

### 保險類

| 術語 | 說明 |
|---|---|
| 基金保險 | 投資型保險；掛於保單，每月供款按比例購基金 |
| 普通保險 | 住院 / 人壽 / 意外等非投資型保險 |
| 供滿 | 保單供款年期結束 |
| 平攤 | 將年繳保費按 12 個月分攤 |
| 代墊 | 成員先墊付保費，家庭每月償還 |
| 保單持有人 | policyHolderId（fallback = memberId） |
| 受保人 | memberId |
| 供款期 | 保單年度的分期（periodIndex） |

### 收支類

| 術語 | 說明 |
|---|---|
| 家用轉入 | 家庭成員轉入家用（income 節點） |
| 個人收入 | 成員個人收入（personal_income 節點） |
| 共同支出 | 家庭共用支出（memberId = 'shared'） |
| 家庭共用 | 同上 |
| 額外收入 | extra 節點 |
| 個人支出 | 成員個人支出 |

### 結算類

| 術語 | 說明 |
|---|---|
| 待處理 | 未付款 / 未扣款 / 未轉入（pending） |
| 已處理 | 已付款 / 已扣款 / 已轉入（done） |
| 不適用 | skipped |
| 結算清單 | 整合個人支出 / 共同支出 / 保險扣款 |

### 基金類

| 術語 | 說明 |
|---|---|
| 保險基金 | type = 'insurance' |
| 獨立基金 | type = 'standalone' |
| 快照 | 每月記錄股數 / 股價 / 現值 / 累積供款 |
| 累積供款 | 保險扣款時自動分配（cumulativeCost） |
| 盈虧 | 現值 − 累積供款 |

### 銀行類

| 術語 | 說明 |
|---|---|
| 家庭帳號 | type = 'family' |
| 個人帳號 | type = 'personal' |
| 初始餘額 | initialBalance |
| 初始年月 | initialYear / initialMonth |
| 銀行交易 | in / out / transfer |

### 角色類

| 術語 | 說明 |
|---|---|
| superadmin | 超級管理員（平台層） |
| owner | 家庭擁有者 |
| member | 家庭成員 |
| canInput | 是否可輸入 |

### 實體類

| 術語 | 說明 |
|---|---|
| 8 實體 | member / bank / policy / fund / category / item / payment / status |
| 實體定義 | entity-definitions.js |
| 實體 resolver | entity-resolvers.js |
| 實體 modal | entity-modal.js |

### 資料節點類

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
| bank_accounts/ | 銀行帳號 |
| member_advances/ | 成員代墊 |

---

## 十二、關聯檔案

| 主題 | 檔案 |
|---|---|
| 頁面區塊規格 | P-06-pagemap.md |
| 通用規則 | C-02-rules.md |
| 控制列實作 | js/lib/page-controls.js |
| 表頭互動實作 | js/shared/data-table.js |
| 資料結構 | P-09-data.md |

---

/* ═══ EOF ═══
F: docs/P-07-uispec.md
V: 1791883800
B: B32-1
W: A20261013-001#011
═══ */
