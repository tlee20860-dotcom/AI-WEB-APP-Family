# P-05 常見任務 SOP

最後更新：2026-10-21
Version: 1792581017
Writer: ai-system-20261021-004#17
用途：AI 執行常見任務的具體步驟（專案專屬）

---

## 一、修 Bug

| 步驟 | 動作 |
|---|---|
| 1 | 讀 P-10-incident |
| 2 | 讀 P-99-errors-map |
| 3 | 跑 5 問自檢（體系 R-00） |
| 4 | 複現問題 |
| 5 | 診斷根本原因 |
| 6 | 提供「診斷 + 方案」 |
| 7 | 待確認 |
| 8 | 交付 |
| 9 | 更新 WF-STATE-INDEX + WF-PROGRESS |
| 10 | 記錄到 P-10 / 體系 R-04 |

---

## 二、新增頁面

> **通用流程請見 `W-06-sop.md` §一。**

| 步驟 | 本專案專屬動作 |
|---|---|
| 1 | 遵循 W-06 通用步驟（寫 js/pages、html、更新 sw.js） |
| 2 | 更新 `js/config/constants.js` 的 `SIDEBAR_GROUPS` / `ROUTES` |
| 3 | 更新 `P-06-pagemap` 頁面區塊規格 |
| 4 | 更新 `WF-STATE-INDEX` + `WF-PROGRESS` |

---

## 三、改 Block

| 步驟 | 動作 |
|---|---|
| 1 | grep 找出所有使用頁 |
| 2 | 評估向後相容 |
| 3 | 若破壞性 → 加參數 |
| 4 | 改 block |
| 5 | 驗證所有使用頁 |
| 6 | 更新 WF-STATE-INDEX |

---

## 四、改 Registry

| 步驟 | 動作 |
|---|---|
| 1 | 讀 P-08-api |
| 2 | grep 使用檔案 |
| 3 | 加新 API（不破壞舊） |
| 4 | 改 registry |
| 5 | 更新 P-08 + WF-STATE-INDEX |

**禁止**：改 export 名 / 改回傳格式 / 刪 export。

---

## 五、改 Lib

| 步驟 | 動作 |
|---|---|
| 1 | 檢查是否可複用 |
| 2 | 評估抽新 lib 或擴充 |
| 3 | 改 lib |
| 4 | 更新 WF-STATE-INDEX |

---

## 六、改 Functions API

> **通用流程請見 `W-02-functions.md`。**

| 步驟 | 本專案專屬動作 |
|---|---|
| 1 | 讀 P-08-api + W-02 |
| 2 | 決定哪個 `_xxx.js` |
| 3 | 改 handler |
| 4 | 若加新端點 → 改 `[[path]].js` 分派 |
| 5 | 更新 P-08 + WF-STATE-INDEX |

**禁止**：新增獨立 xxx.js / 用 shim re-export。

---

## 七、改資料結構

| 步驟 | 動作 |
|---|---|
| 1 | 讀 P-09-data + W-01 |
| 2 | 讀 P-09-data §八（相容） |
| 3 | 評估是否影響舊資料 |
| 4 | 若影響 → 加相容層 |
| 5 | 改程式碼 |
| 6 | 更新 P-09-data |

---

## 八、更新 docs

| 步驟 | 動作 |
|---|---|
| 1 | 找出受影響的 docs |
| 2 | 依「變更影響矩陣」 |
| 3 | 更新 Version |
| 4 | 交付完整檔案 |

**變更影響矩陣**：

| 改動 | 同步更新 |
|---|---|
| 新增頁面 | WF-STATE-INDEX / WF-PROGRESS / P-06 / sw.js / constants.js |
| 改 API | P-08 / WF-STATE-INDEX |
| 改資料結構 | P-09-data |
| 修 Bug | P-10 / WF-PROGRESS / WF-STATE-INDEX |
| 改 Web App 通用 | W-* |

---

## 九、部署後驗證

> **通用驗證清單請見 `W-06-sop.md` §二。**

| 步驟 | 本專案專屬驗證項 |
|---|---|
| 1 | 訪問 index.html（統計卡有數字） |
| 2 | settings.html（3 Tab 可切換） |
| 3 | code-list.html（篩選器 + 兩區塊） |
| 4 | input-center.html（5 按鈕可開啟 Modal） |
| 5 | settlements.html（表格 + toggle） |
| 6 | insurance.html（卡片 + 已供滿展開） |

---

## 十、緊急回滾

> **通用回滾流程請見 `W-06-sop.md` §三。**

| 步驟 | 本專案專屬動作 |
|---|---|
| 1 | GitHub 找上一個穩定 commit |
| 2 | Revert |
| 3 | Cloudflare Pages 自動重部署 |
| 4 | 驗證後分析原因 |

---

## 十一～十四（保留原專案專屬流程）

*(保留原有「執行一次性遷移」、「改版面」、「貼 URL 啟動」、「領域技能包建立」等專案特定操作步驟，不變動)*

---

## 十五、任務速查

| 任務 | 章節 |
|---|---|
| 修 Bug | 一 |
| 新增頁面 | 二（結合 W-06） |
| 改 Block | 三 |
| 改 Registry | 四 |
| 改 Lib | 五 |
| 改 Functions API | 六（結合 W-02） |
| 改資料結構 | 七 |
| 更新 docs | 八 |
| 部署後驗證 | 九（結合 W-06） |
| 緊急回滾 | 十（結合 W-06） |

---

## 十六、關聯檔案

| 主題 | 檔案 |
|---|---|
| 通用 SOP | W-06-sop.md |
| Web App 技能包 | W-00 ~ W-07 |
| 檔案清單 | WF-STATE-INDEX.md |
| 錯誤摘要 | P-99-errors-map.md |

---

/* ═══ EOF ═══
F: P-05-sop.md
V: 1792581017
W: ai-system-20261021-004#17
═══ */