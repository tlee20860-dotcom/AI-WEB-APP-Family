# P-06 常見任務 SOP

最後更新：B29-8e
版本：v103.0.36
批次：B29
用途：AI 執行常見任務時的具體步驟

---

## 一、修 Bug

| 步驟 | 動作 |
|---|---|
| 1 | 讀 P-12-incident.md（是否已記錄） |
| 2 | 讀 P-99-errors-map.md |
| 3 | **跑 5 問自檢**（C-02） |
| 4 | 複現問題 |
| 5 | 診斷根本原因 |
| 6 | 提供「診斷 + 方案」 |
| 7 | 待確認 |
| 8 | 交付 |
| 9 | 更新 P-04 + P-03 |
| 10 | 記錄到 P-12 / C-05 |

---

## 二、新增頁面

| 步驟 | 動作 |
|---|---|
| 1 | 讀 P-02-anchor 檔案結構 |
| 2 | 檢查 P-04 是否可複用 |
| 3 | 寫 js/pages/xxx.js（Schema） |
| 4 | 寫 xxx.html |
| 5 | 更新 constants.js 的 SIDEBAR_GROUPS / ROUTES |
| 6 | 更新 sw.js 的 STATIC_ASSETS |
| 7 | 更新 P-07-pagemap 頁面區塊規格 |
| 8 | 更新 P-04 + P-03 |

**Page Schema 結構**：

| 欄位 | 說明 |
|---|---|
| title | 頁面標題 |
| data | Firebase 訂閱配置 |
| state | 響應式狀態初始值 |
| derived | 衍生資料 |
| blocks | UI 區塊 |
| customMount | 逃生艙（可選） |

**HTML 結構**：參考任一現有頁面（如 settlements.html）

---

## 三、改 Block

| 步驟 | 動作 |
|---|---|
| 1 | grep 找出所有使用頁 |
| 2 | 評估向後相容 |
| 3 | 若破壞性 → 加參數 |
| 4 | 改 block |
| 5 | 驗證所有使用頁 |
| 6 | 更新 P-04 |

**block 使用對照**：

| Block | 使用頁 |
|---|---|
| stats-block | dashboard / portfolio / annual-report / member-report |
| list-block | portfolio / member-report |

---

## 四、改 Registry

| 步驟 | 動作 |
|---|---|
| 1 | 讀 P-09-api |
| 2 | grep 使用檔案 |
| 3 | 加新 API（不破壞舊） |
| 4 | 改 registry |
| 5 | 更新 P-09 + P-04 |

**禁止**：改 export 名 / 改回傳格式 / 刪 export。

---

## 五、改 Lib

| 步驟 | 動作 |
|---|---|
| 1 | 檢查是否可複用（C-02 0.15） |
| 2 | 評估抽新 lib 或擴充 |
| 3 | 改 lib |
| 4 | 更新 P-04 |

**判斷準則**：

| 情境 | 做法 |
|---|---|
| 只有 1 頁用 | 留在原檔 |
| 2+ 頁用 | 抽 lib |
| 未來會擴充 | 抽 lib |

---

## 六、改 Functions API

| 步驟 | 動作 |
|---|---|
| 1 | 讀 P-09-api |
| 2 | 決定哪個 _xxx.js |
| 3 | 改 handler |
| 4 | 若加新端點 → 改 [[path]].js 分派 |
| 5 | 更新 P-09 + P-04 |

**路由對照**：

| 端點 | 檔案 |
|---|---|
| GET /api/summary | _summary.js |
| POST /api/family-settings | _family.js |
| POST /api/insurance-sync | _insurance.js |
| POST /api/admin-migrate | _admin.js |

**禁止**：新增獨立 xxx.js / 用 shim re-export。

---

## 七、改資料結構

| 步驟 | 動作 |
|---|---|
| 1 | 讀 P-10-data |
| 2 | 讀 P-11-compat |
| 3 | 評估是否影響舊資料 |
| 4 | 若影響 → 加相容層 |
| 5 | 改程式碼 |
| 6 | 更新 P-10 + P-11 |

**相容原則**：舊資料 100% 可讀 / 讀取 normalize / 寫入新格式。

---

## 八、更新 docs

| 步驟 | 動作 |
|---|---|
| 1 | 找出受影響的 docs |
| 2 | 依「變更影響矩陣」 |
| 3 | 更新版本 + 批次 |
| 4 | 交付完整檔案 |

**變更影響矩陣**：

| 改動 | 同步更新 |
|---|---|
| 新增頁面 | P-04 / P-03 / P-07 / sw.js / constants.js |
| 改 API | P-09 / P-04 |
| 改資料結構 | P-10 / P-11 |
| 改 Registry API | P-09 / P-04 |
| 修 Bug | P-12 / P-03 / P-04 |
| 改 UI 元件 | P-08 / P-04 |

---

## 九、部署後驗證

| 步驟 | 動作 |
|---|---|
| 1 | 訪問主要頁面 |
| 2 | vConsole 檢查 Error |
| 3 | 切換年月 → 驗證連動 |
| 4 | 檢查 API |
| 5 | 手機測試 |

**驗證清單**：

| 頁面 | 檢查項 |
|---|---|
| index.html | 統計卡有數字 |
| settings.html | 3 Tab 可切換 |
| database.html | 6 Tab 可切換 |
| input-center.html | 5 按鈕可開啟 Modal |
| settlements.html | 表格 + toggle |
| insurance.html | 卡片 + 已供滿展開 |

**vConsole 啟用**：

| 方式 | 操作 |
|---|---|
| URL | `?debug=1` |
| 系統設定 | 個人化 → 除錯工具 |

---

## 十、緊急回滾

| 步驟 | 動作 |
|---|---|
| 1 | GitHub 找上一個 commit |
| 2 | Revert |
| 3 | CF Pages 自動重部署 |
| 4 | 分析後重做 |

**禁止**：手動改線上檔 / 強制 push。

---

## 十一、執行一次性遷移

| 步驟 | 動作 |
|---|---|
| 1 | 進「系統設定 → 個人化」 |
| 2 | 找「一次性資料遷移」卡 |
| 3 | 選目標家庭 |
| 4 | 點「執行遷移」 |
| 5 | 確認 → 執行 |
| 6 | 查看統計 |

**檢查**：重複執行 → 修改 0；UI 完全不變。

---

## 十二、任務速查

| 任務 | 章節 |
|---|---|
| 修 Bug | 一 |
| 新增頁面 | 二 |
| 改 Block | 三 |
| 改 Registry | 四 |
| 改 Lib | 五 |
| 改 Functions API | 六 |
| 改資料結構 | 七 |
| 更新 docs | 八 |
| 部署後驗證 | 九 |
| 緊急回滾 | 十 |
| 執行遷移 | 十一 |

---

## 十三、關聯檔案

| 主題 | 檔案 |
|---|---|
| 通用規則 | C-02-rules.md |
| 流程指南 | C-03-guide.md |
| 檔案清單 | P-04-manifest.md |
| API 契約 | P-09-api.md |
| 資料結構 | P-10-data.md |
| 錯誤摘要 | P-99-errors-map.md |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-06-sop.md
   Version: v103.0.36
   Batch: B29-8e
   ═══════════════════════════════════════════ */