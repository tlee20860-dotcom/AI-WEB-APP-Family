# UI 規格書（UI Spec）

最後更新：B29-6d
用途：全站 UI 術語 + 頁面結構 + 元件對照

**權威來源**：本檔為 UI 術語唯一真相；其他 docs 引用本檔。

---

## 一、頁面結構層級

| 層級 | 術語 | 說明 | 範例 |
|---|---|---|---|
| L1 | Page（頁面） | 一個 .html | `index.html` |
| L2 | Section（區塊） | 頁面內垂直堆疊的功能區 | page-header / stats / page-controls |
| L3 | Row（列） | Section 內水平排列 | toolbar row |
| L4 | Item（元素） | 最小單位 | button / select / input |

---

## 二、Section 類型（區塊）

| 術語 | 中文 | 用途 | 標準位置 |
|---|---|---|---|
| `page-banner` | 提示橫幅 | 說明文字 | 頁面最上（標題上方） |
| `page-header` | 頁首 | 標題 + 副標題 + 主要操作 | banner 之後 |
| `page-header-actions` | 頁首操作區 | 標題行右側主要操作 | page-header 內 |
| `stats` | 統計卡區 | 數字統計 | header 之後 |
| `page-controls` | 控制列 | 篩選 / 切換 / 年月 | stats 之後 |
| `content` | 內容區 | 表格 / 卡片 | 最底 |
| `banner` | 提示（Tab 內） | Tab 內說明 | 各處 |
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

**強制 body 的 type**：`viewToggle` / `sort`（即使傳 `position: 'header'` 仍渲染在 body）

---

## 四、頁面標準佈局

**標準順序**（一般頁面）：

| 順序 | Section | 內容 |
|---|---|---|
| 1 | page-banner | banner（若有） |
| 2 | page-header | 標題（左） + 副標題 + 主要操作（右） |
| 3 | stats | 統計卡 |
| 4 | page-controls | 新增 / 切換 / 排序 / 年月 / 篩選 |
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

**依 `filterOptions` 判斷可篩選**（需同時設 `filterable: true`）。

**排序 / 篩選狀態**：實例內保存，切頁重置。

---

## 七、側邊欄群組（依角色過濾）

**依據**：anchor 八

**群組清單**：

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

**各角色實際可見**：

| 角色 | 可見群組 |
|---|---|
| superadmin | 平台管理 + 系統 |
| owner | 全部家庭群組 + 系統 |
| member | 同 owner |

**對外函式**：`getSidebarGroupsByRole(role)`

---

## 八、頁面 metadata（可編輯）

**模組**：`js/config/page-metadata-registry.js`

**儲存**：`families/{familyId}/settings/page_metadata/{pageKey}`

**結構**：

| 欄位 | 說明 |
|---|---|
| title | 頁面標題 |
| subtitleStatic | 副標題靜態段（使用者可編輯） |

**顯示機制**：

| 元素 | 機制 |
|---|---|
| title | `textContent` 覆蓋 |
| subtitleStatic | `data-prefix` + CSS `::before` |

**動態副標題已於 B29-7 刪除**（原 dashboard / insurance / settlements / finance-overview / member-report）。

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
| 「全年總合/月度明細切換」 | page-controls `viewSwitcher` |
| 「右上角那顆按鈕」 | page-header-actions 內的 item |
| 「Tab」 | tab-bar + tab-panel |
| 「列表」 | table 或 card（依 viewToggle） |
| 「側邊欄 / 左側欄」 | sidebar |
| 「角色 / 權限」 | ROLES |
| 「表頭排序」 | data-table sortable |

---

## 十、AI 使用本檔的方式

**情境 1：移動元素**

| 使用者說 | AI 動作 |
|---|---|
| 「把新增按鈕移到 header」 | page-controls `add` 加 `position: 'header'` |
| 「切換移到 header」 | 提醒：viewToggle **強制 body**（B29-1a） |
| 「年月移到 header」 | 提醒：year / month 標準在 body |

**情境 2：新增元素**

| 使用者說 | AI 動作 |
|---|---|
| 「加匯出」 | page-controls 加 `export` item |
| 「加篩選」 | 表頭加 `filterable: true` + `filterOptions`（column-registry） |
| 「加排序」 | 表頭加 `sortable: true`（column-registry） |

**情境 3：改側邊欄**

| 使用者說 | AI 動作 |
|---|---|
| 「加新群組」 | constants.js SIDEBAR_GROUPS 加群組 + roles |
| 「改某群組可見角色」 | 改該群組 roles 陣列 |

**情境 4：改頁面標題**

| 使用者說 | AI 動作 |
|---|---|
| 「改頁面標題」 | 提示「可從 settings 編輯」；預設改 page-metadata-registry.js |

---

## 十一、擴充規則

| 步驟 | 動作 |
|---|---|
| 1 | 檢查是否已有類似術語 |
| 2 | 加到對應表格 |
| 3 | 更新版本 + 批次 |
| 4 | 若影響 anchor，同步更新 |

**禁止**：

| 項目 | 說明 |
|---|---|
| 使用未定義術語 | 需先加入本檔 |
| 與 anchor 衝突 | 以本檔為 UI 術語權威 |
| 各 docs 重複定義 | 引用本檔即可 |

---

## 十二、參考

| 主題 | 檔案 |
|---|---|
| 頁面區塊規格 | page-map.md |
| 版面規格保護 | anchor 0.22 |
| UI 術語權威 | anchor 0.24 |
| 最小改動 | anchor 0.25 |
| 側邊欄角色過濾 | anchor 八 |
| 頁面 metadata | anchor 九 |
| 控制列實作 | lib/page-controls.js |
| 表頭互動實作 | shared/data-table.js |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/ui-spec.md
   Version: v103.0.36
   Batch: B29-6d
   ═══════════════════════════════════════════ */