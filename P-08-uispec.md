# P-08 UI 規格書

最後更新：B29-8e
版本：v103.0.36
批次：B29
用途：UI 術語 + 頁面結構 + 元件對照

**通用 UI 原則**：見 C-02-rules.md

---

## 一、頁面結構層級

| 層級 | 術語 | 說明 | 範例 |
|---|---|---|---|
| L1 | Page（頁面） | 一個 .html | `index.html` |
| L2 | Section（區塊） | 頁面內垂直堆疊的功能區 | page-header / stats |
| L3 | Row（列） | Section 內水平排列 | toolbar row |
| L4 | Item（元素） | 最小單位 | button / select |

---

## 二、Section 類型

| 術語 | 中文 | 用途 | 標準位置 |
|---|---|---|---|
| `page-banner` | 提示橫幅 | 說明文字 | 頁面最上 |
| `page-header` | 頁首 | 標題 + 副標題 + 主要操作 | banner 之後 |
| `page-header-actions` | 頁首操作區 | 標題行右側 | page-header 內 |
| `stats` | 統計卡區 | 數字統計 | header 之後 |
| `page-controls` | 控制列 | 篩選 / 切換 / 年月 | stats 之後 |
| `content` | 內容區 | 表格 / 卡片 | 最底 |
| `empty-state` | 空狀態 | 無資料時顯示 | 內容區內 |
| `tab-bar` | 分頁列 | 同頁多分頁 | 各處 |
| `tab-panel` | 分頁內容 | Tab 對應內容 | 分頁列下方 |
| `sidebar` | 側邊欄 | 左側導覽 | 頁面左側 |
| `navbar` | 頂部導覽 | 使用者資訊 | 頁面頂部 |

---

## 三、控制列元素（page-controls Item）

| 術語 | type | 用途 | 位置 |
|---|---|---|---|
| **add** | `add` | 新增按鈕 | toolbar 左 |
| **export** | `export` | 匯出按鈕 | page-header 右 / toolbar 右 |
| **viewToggle** | `viewToggle` | 卡片 / 表格切換 | **強制 body**（toolbar 右） |
| **viewSwitcher** | `viewSwitcher` | 檢視切換 | body 全行 |
| **sort** | `sort` | 排序下拉 | **強制 body**（toolbar 右） |
| **year** | `year` | 年份下拉 | body 左側 |
| **month** | `month` | 月份下拉 | body 左側（靠年） |
| **filter** | `filter` | 篩選器（自訂 HTML） | body 全行 |
| **custom** | `custom` | 自訂按鈕 / 連結 | 依需求 |

**位置屬性**：

| position | 渲染位置 |
|---|---|
| （未設） | page-controls body |
| `'header'` | page-header 右側 |

**強制 body 的 type**：`viewToggle` / `sort`

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
| **table** | 表格 | 欄位多、需對齊比較 |
| **card** | 卡片 | 手機 / 少量欄位 |
| **tab** | 分頁 | 同頁多個獨立區塊 |
| **collapsible** | 可摺疊 | 次要內容 |
| **modal** | 彈窗 | 編輯 / 確認對話框 |
| **form** | 表單 | 資料輸入欄位 |
| **badge** | 標籤 | 狀態小標籤 |
| **progress** | 進度條 | 進度視覺化 |

---

## 六、表頭互動（data-table）

**表頭可排序**：

| 動作 | 結果 |
|---|---|
| 點欄位標題（首次） | 升序 |
| 點欄位標題（第二次） | 降序 |
| 點欄位標題（第三次） | 清除排序 |

**依 type 判斷可排序**：`text` / `number` / `date` / `select`

**表頭可篩選**：

| 動作 | 結果 |
|---|---|
| 點欄位旁的 🔽 | 開下拉面板 |
| 選值 → 套用 | 篩選生效 |
| 點清除 | 清除篩選 |

**依 `filterOptions` 判斷可篩選**。

---

## 七、側邊欄群組（依角色過濾）

| 群組 key | 標籤 | roles |
|---|---|---|
| overview | 總覽 | owner / member |
| record | 記錄中心 | owner / member |
| insurance-fund | 保險與基金 | owner / member |
| settle | 對帳 | owner / member |
| assets | 資產 | owner / member |
| reports | 報表 | owner / member |
| platform | 平台管理 | **superadmin** |
| system | 系統 | owner / member / superadmin |

**各角色可見**：

| 角色 | 可見群組 |
|---|---|
| superadmin | 平台管理 + 系統 |
| owner | 全部家庭群組 + 系統 |
| member | 同 owner |

---

## 八、頁面 metadata（可編輯）

**模組**：`js/config/page-metadata-registry.js`
**儲存**：`families/{familyId}/settings/page_metadata/{pageKey}`

**結構**：`{ title, subtitleStatic }`

**顯示機制**：

| 元素 | 機制 |
|---|---|
| title | `textContent` 覆蓋 |
| subtitleStatic | `data-prefix` + CSS `::before` |

**編輯入口**：settings 個人化 Tab → 「頁面標題」卡

---

## 九、常用術語對照（使用者 ↔ AI）

| 使用者常說 | 對應術語 |
|---|---|
| 「頁面主題」 | page-header 標題 |
| 「副標題」 | page-header 副標題 |
| 「統計卡」 | stats section |
| 「新增按鈕」 | page-controls `add` |
| 「卡片/表格切換」 | page-controls `viewToggle` |
| 「年度按鈕」 | page-controls `year` |
| 「月份按鈕」 | page-controls `month` |
| 「篩選器」 | page-controls `filter` |
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
| 3 | 更新版本 + 批次 |

**禁止**：使用未定義術語 / 重複定義。

---

## 十一、關聯檔案

| 主題 | 檔案 |
|---|---|
| 頁面區塊規格 | P-07-pagemap.md |
| 通用規則 | C-02-rules.md |
| 控制列實作 | lib/page-controls.js |
| 表頭互動實作 | shared/data-table.js |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-08-uispec.md
   Version: v103.0.36
   Batch: B29-8e
   ═══════════════════════════════════════════ */