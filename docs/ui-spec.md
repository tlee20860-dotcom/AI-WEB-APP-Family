# UI 規格書（UI Spec）

最後更新：B26-3.2
用途：全站 UI 術語 + 頁面結構 + 元件對照，供 AI 與使用者共同詞彙

**權威來源**：本檔為 UI 術語唯一真相；其他 docs 引用本檔。
**引用規則**：任何 UI 相關描述一律使用本檔術語。

---

## 一、頁面結構層級（Page / Section / Row / Item）

| 層級 | 術語 | 說明 | 範例 |
|---|---|---|---|
| L1 | Page（頁面） | 一個 .html | `index.html` |
| L2 | Section（區塊） | 頁面內垂直堆疊的功能區 | page-header / stats / page-controls |
| L3 | Row（列） | Section 內水平排列 | toolbar row |
| L4 | Item（元素） | 最小單位 | button / select / input |

**原則**：所有 UI 描述均以這 4 層為基礎。

---

## 二、Section 類型（區塊）

| 術語 | 中文 | 用途 | 標準位置 |
|---|---|---|---|
| `page-header` | 頁首 | 標題 + 副標題 + 主要操作 | 頁面最上 |
| `stats` | 統計卡區 | 數字統計 | header 之後 |
| `page-controls` | 控制列 | 篩選 / 切換 / 年月 | stats 之後 |
| `content` | 內容區 | 表格 / 卡片 | 最底 |
| `banner` | 提示橫幅 | 說明文字 | 各處 |
| `empty-state` | 空狀態 | 無資料時顯示 | 內容區內 |
| `tab-bar` | 分頁列 | 同頁多分頁 | 各處 |
| `tab-panel` | 分頁內容 | Tab 對應內容 | 分頁列下方 |

---

## 三、控制列元素（page-controls Item）

| 術語 | type | 用途 | 標準位置 |
|---|---|---|---|
| **add** | `add` | 新增按鈕 | toolbar 左 |
| **export** | `export` | 匯出按鈕 | page-header 右 |
| **viewToggle** | `viewToggle` | 卡片 / 表格切換 | page-header 右 / toolbar 右 |
| **viewSwitcher** | `viewSwitcher` | 檢視切換（如全年/月度） | page-controls 全行 |
| **sort** | `sort` | 排序下拉 | page-header 右 / toolbar 右 |
| **year** | `year` | 年份切換（3 顆按鈕） | page-controls 左 |
| **month** | `month` | 月份切換（3 顆按鈕） | page-controls 右 |
| **filter** | `filter` | 篩選器（自訂 HTML） | page-controls 全行 |
| **custom** | `custom` | 自訂按鈕 / 連結 | 依需求 |

**位置屬性**：

| position | 渲染位置 |
|---|---|
| （未設） | page-controls body |
| `'header'` | page-header 右側 |

---

## 四、頁面標準佈局（依你要求）

**標準順序**（一般頁面）：

| 順序 | Section | 內容 |
|---|---|---|
| 1 | page-header | 標題（左） + 副標題 + 主要操作（右） |
| 2 | stats | 統計卡 |
| 3 | page-controls | 新增 / 切換 / 年月 / 篩選 |
| 4 | banner | 提示（若有） |
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

**viewToggle 切換規則**：

| 模式 | 適合 |
|---|---|
| table | 桌面 / 需比較 |
| card | 手機 / 瀏覽為主 |

---

## 六、常用頁面類型（模式）

| 頁面類型 | 標準結構 |
|---|---|
| **清單頁** | page-header + stats + page-controls + table/card |
| **表單頁** | page-header + form |
| **報表頁** | page-header + stats + page-controls + table |
| **Tab 頁** | page-header + tab-bar + tab-panel |

**本專案對應**：

| 頁面 | 類型 |
|---|---|
| index.html | 清單頁（報表類） |
| insurance.html | 清單頁 |
| portfolio.html | 清單頁 |
| settlements.html | 清單頁（報表類） |
| finance-overview.html | Tab 頁 |
| annual-report.html | 報表頁 |
| member-report.html | 報表頁 |
| input-center.html | Tab 頁 |
| database.html | Tab 頁 |
| settings.html | Tab 頁 |
| admin.html | Tab 頁 |

---

## 七、常用術語對照（使用者 ↔ AI）

**使用者描述 → 術語**：

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

---

## 八、AI 使用本檔的方式

**情境 1：使用者要求移動元素**

| 使用者說 | AI 動作 |
|---|---|
| 「把新增按鈕移到 header 右側」 | page-controls `add` 加 `position: 'header'` |
| 「切換移到 header」 | page-controls `viewToggle` 加 `position: 'header'` |
| 「年月移到 header」 | page-controls `year` / `month` 加 `position: 'header'` |

**情境 2：使用者要求新增元素**

| 使用者說 | AI 動作 |
|---|---|
| 「加匯出按鈕」 | page-controls 加 `export` item |
| 「加篩選」 | page-controls 加 `filter` item |
| 「加排序」 | page-controls 加 `sort` item |

**情境 3：使用者用模糊詞**

| 使用者說 | AI 動作 |
|---|---|
| 「調整版面」 | 反問「調整哪個 section / item」 |
| 「那個按鈕」 | 列舉可能的 item，請使用者確認 |
| 「樣式不對」 | 反問「哪個術語」 |

---

## 九、擴充規則

**新增術語時**：

| 步驟 | 動作 |
|---|---|
| 1 | 檢查是否已有類似術語 |
| 2 | 加到對應表格 |
| 3 | 更新本檔版本 + 批次 |
| 4 | 若影響 anchor 章節，同步更新 |

**禁止**：

| 項目 | 說明 |
|---|---|
| 使用未定義術語 | 需先加入本檔 |
| 與 anchor 衝突 | 以本檔為 UI 術語權威 |
| 各 docs 重複定義 | 引用本檔即可 |

---

## 十、參考

| 主題 | 檔案 |
|---|---|
| 頁面區塊規格 | page-map.md |
| 版面規格保護規則 | anchor 0.22 |
| 頁面 → 檔案對照 | page-map.md |
| 控制列實作 | lib/page-controls.js |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/ui-spec.md
   Version: v103.0.29
   Batch: B26-3.2
   ═══════════════════════════════════════════ */