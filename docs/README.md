# 家庭財務 Web App — 文檔索引

最後更新：B26-7
當前批次：B26-7
用途：新對話時，將整個 docs/ 上傳給 AI

---

## 檔案清單（15 份）

| # | 檔案 | 用途 |
|---|---|---|
| 1 | README.md | 本檔案，索引 |
| 2 | anchor.md | 主錨點：規則 + 架構 + 關鍵字索引 |
| 3 | ai-guide.md | AI 操作指南：決策樹 + 錯誤 + 模板 |
| 4 | file-manifest.md | 檔案清單：版本 + 批次 |
| 5 | progress.md | 交付進度 + 批次歷史 |
| 6 | sop.md | 常見任務 SOP |
| 7 | adr.md | 關鍵決策記錄（ADR-001~019） |
| 8 | page-map.md | 頁面 → 檔案對照 + 各頁可編輯欄位 + 頁面區塊規格 |
| 9 | ui-spec.md | UI 術語 + 頁面結構 + 元件對照 |
| 10 | delivery-rules.md | 交付規則（詳細版） |
| 11 | refactor-plan.md | 重構計畫 |
| 12 | api-contracts.md | API 契約 |
| 13 | data-structure.md | Firebase 資料結構 |
| 14 | compatibility.md | 舊資料相容策略 |
| 15 | incident-log.md | 事故日誌（P01~P24） |

---

## AI 讀取順序

**必讀**（每次對話）：

| 順序 | 檔案 | 用途 |
|---|---|---|
| 1 | anchor.md | 規則 + 架構 |
| 2 | ai-guide.md | 決策樹 |
| 3 | file-manifest.md | 檔案清單 |
| 4 | progress.md | 當前批次 |

**依情境讀**：

| 情境 | 讀此檔 |
|---|---|
| 交付 | delivery-rules.md |
| 修 Bug | incident-log.md |
| 新增功能 | sop.md |
| 理解決策 | adr.md |
| 改頁面 | page-map.md |
| 改 UI 元件 / 版面 | ui-spec.md + page-map.md |
| 改 API | api-contracts.md |
| 改資料 | data-structure.md + compatibility.md |
| 理解重構 | refactor-plan.md |
| 版面規格 | page-map.md + anchor 0.22 |
| 編輯入口職責 | page-map.md + anchor 0.19 |
| UI 術語 | ui-spec.md |
| 重大修改對比 | anchor 0.23 |
| 側邊欄群組 | constants.js + ui-spec.md |

---

## 新對話流程

### 情境 A：繼續開發

| 步驟 | 動作 |
|---|---|
| 1 | 上傳 docs/ 全部 15 檔 |
| 2 | 說：「我已上傳 docs/，請讀取全部內容」 |
| 3 | AI 回報：「已讀取，當前批次 B{nn}」 |
| 4 | 說：「我要修改 XXX」或「請修復 XXX」 |

### 情境 B：修復 Bug

| 步驟 | 動作 |
|---|---|
| 1 | 上傳 docs/ 全部 15 檔 |
| 2 | 說：「請讀取 docs/，[問題描述]」 |
| 3 | AI 診斷後提供方案 |
| 4 | 確認後交付 |

### 情境 C：新增功能

| 步驟 | 動作 |
|---|---|
| 1 | 上傳 docs/ 全部 15 檔 |
| 2 | 說：「請讀取 docs/，我要新增 XXX 功能」 |
| 3 | AI 提供方案（含是否新增檔案） |
| 4 | 確認後交付 |

### 情境 D：改 UI 元素位置

| 步驟 | 動作 |
|---|---|
| 1 | 讀 ui-spec.md |
| 2 | 用術語描述（如「add 移到 header」） |
| 3 | AI 依 page-controls 的 position 屬性處理 |

### 若 AI 回應「檔案內容不完整」

表示 docs/ 上傳不完整，請重新上傳缺少的檔案。

---

## 當前狀態

| 項目 | 值 |
|---|---|
| 當前批次 | B26-7 |
| docs 批次 | B26-7 |
| SW 版本 | family-fin-v141 |
| 部署 URL | family-financial-management-system.pages.dev |
| 測試狀態 | B26 已部署測試通過 |

---

## 完成度

| 項目 | 狀態 |
|---|---|
| 5 Registry | ✅ |
| 3 Engine | ✅ |
| 5 Block | ✅ |
| 13 Page Schema | ✅ |
| Functions API（10 檔） | ✅ |
| 全站頁面可訪問 | ✅ |
| 編輯入口職責分離（B25） | ✅ |
| Modal 統一（B25） | ✅ |
| Action 契約（B25） | ✅ |
| 版面規格保護（B25） | ✅ |
| 一次性資料遷移（B25） | ✅ |
| page-controls 統一控制列（B26-3） | ✅ |
| page-header 統一（B26-3.2） | ✅ |
| UI 術語表（B26-3.2） | ✅ |
| Superadmin sidebar（B26-4） | ✅ |
| 遷移按鈕加家庭選擇器（B26-5） | ✅ |
| 年度總覽恢復（B26-6） | ✅ |

---

## 快速連結

### 專案資訊

| 項目 | 值 |
|---|---|
| GitHub | family-fin-v2 |
| Firebase | family-fin-a6dd1 |
| Cloudflare | family-financial-management-system |

### 核心文檔

| 主題 | 檔案 |
|---|---|
| 架構總覽 | anchor.md |
| AI 指南 | ai-guide.md |
| 部署問題 | incident-log.md |
| 重構計畫 | refactor-plan.md |
| 資料結構 | data-structure.md |
| 關鍵決策 | adr.md |
| 頁面區塊規格 | page-map.md |
| UI 術語 | ui-spec.md |
| 編輯入口職責 | page-map.md + anchor 0.19 |

### 交付規則

| 主題 | 檔案 |
|---|---|
| 檔案交付 | delivery-rules.md + anchor.md 0.13 |
| API 契約 | api-contracts.md |
| 相容策略 | compatibility.md |

---

## 待辦事項

| 項目 | 狀態 |
|---|---|
| B27 偏好設定系統 | 📋 暫緩 |
| B28 page-engine 統一佈局 | 📋 記錄 |
| _headers | ✅ 確認不需 |
| SW 改 stale | ✅ 確認不需 |
| 清理 deprecated 檔（v104） | 📋 記錄 |

---

## docs 更新歷史

| 批次 | 更新 |
|---|---|
| B26-7 | docs 收尾（7 檔） |
| B26-3.2 | 新增 ui-spec.md（15 檔）；README + file-manifest + anchor 更新 |
| B26-1b | docs 補齊（ai-guide / delivery-rules / sop） |
| B26-1a | docs 補齊（api-contracts / compatibility） |
| B25-7 | 全盤更新（6 檔） |
| B25-1 | anchor 0.19~0.22 + page-map 擴充 |
| B24 | 全盤更新（14 檔） |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/README.md
   Version: v103.0.32
   Batch: B26-7
   ═══════════════════════════════════════════ */