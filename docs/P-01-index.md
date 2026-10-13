# P-01 專案索引（家庭財務 Web App）

最後更新：B30-6
版本：v103.0.39
批次：B30-6
用途：新對話時上傳此檔 + 相關 P-*

---

## ⚡ 開場白（複製用）

---
```

請讀取 docs/，繼續家庭財務 Web App 專案。

```

## 一、專案身份

| 項目 | 內容 |
|---|---|
| 專案 | 家庭財務與固定供款管理 Web App |
| GitHub | family-fin-v2 |
| 部署 | Cloudflare Pages |
| 資料庫 | Firebase RTDB (asia-southeast1) |
| 登入 | Firebase Auth（自訂帳號 @familyfin.local） |
| 前端 | 純 HTML + CSS + ES Module JS |
| 後端 | Cloudflare Pages Functions |
| 視覺 | 亮色家庭暖陽（Tailwind 色板，B30-3 起） |
| 金額 | 四捨五入至整數 |

---

## 二、當前狀態

| 項目 | 值 |
|---|---|
| 版本 | v103.0.39 |
| 批次 | B30-6（docs 同步） |
| SW 版本 | family-fin-v141 |
| 部署 URL | family-financial-management-system.pages.dev |
| 測試狀態 | B30-5 已部署測試通過 |

---

## 三、技術棧速覽

**三層架構**：

| 層 | 職責 |
|---|---|
| 資料層 | Firebase RTDB |
| 引擎層 | page-engine / data-engine / render-engine |
| 呈現層 | block / UI 元件 / DOM |

**核心 SSOT**：

| 類型 | 檔 |
|---|---|
| 5 Registry | status / entity / label / column / constants |
| 附加 | page-metadata-registry |
| 實體定義 | entity-definitions / entity-resolvers |

---

## 四、檔案結構

| 目錄 | 檔數 | 職責 |
|---|---|---|
| js/config/ | 8 | 常數 / Registry |
| js/core/ | 8 | state / api / db / auth |
| js/lib/ | 12 | 工具 / Modal / page-controls |
| js/engines/ | 3 | page / data / render |
| js/blocks/ | 5 | stats / list / filter / detail / form |
| js/ui/ | 6 | toast / modal / form-builder / tab-panel / view-toggle / collapsible |
| js/layout/ | 3 | navbar / sidebar / app-shell |
| js/entity/ | 5 | entity-modal / helpers / definitions / resolvers / funds-allocation |
| js/admin/ | 2 | admin / platform-defaults |
| js/shared/ | 12 | data-table / data-card / 其他 |
| js/pages/ | 13 | 純 Schema |
| functions/api/ | 10 | CF Pages Functions |
| icons/ | 1+ | icon.svg / icon.png |

**詳細檔案清單**：P-04-manifest.md

---

## 五、文檔索引（P-* 專案專用）

| # | 檔案 | 用途 |
|---|---|---|
| 1 | P-01-index.md | 本檔，索引 |
| 2 | P-02-anchor.md | 技術架構 + 專案規則 |
| 3 | P-03-progress.md | 交付進度 |
| 4 | P-04-manifest.md | 檔案清單 |
| 5 | P-05-adr.md | 關鍵決策 |
| 6 | P-06-sop.md | 常見任務 |
| 7 | P-07-pagemap.md | 頁面 → 檔案 |
| 8 | P-08-uispec.md | UI 術語 |
| 9 | P-09-api.md | API 契約 |
| 10 | P-10-data.md | Firebase 結構 |
| 11 | P-11-compat.md | 舊資料相容 |
| 12 | P-12-incident.md | 事故日誌 |
| 13 | P-13-glossary.md | 業務術語 |
| 14 | P-14-refactor.md | 重構歷程 |
| 15 | P-99-errors-map.md | 錯誤摘要（交付前必讀） |

**C-* 共用檔**（跨專案）：C-00 ~ C-07

---

## 六、AI 讀取順序

**必讀**：

| 順序 | 檔案 |
|---|---|
| 1 | C-00-startup.md |
| 2 | C-01-profile.md |
| 3 | C-02-rules.md |
| 4 | C-03-guide.md |
| 5 | C-04-delivery.md |
| 6 | C-05-learning.md |
| 7 | C-06-token-log.md |
| 8 | C-07-summary.md |

**舊專案啟動時**：

| 順序 | 檔案 |
|---|---|
| 9 | P-01-index.md（本檔） |
| 10 | P-02-anchor.md |
| 11 | P-03-progress.md |
| 12 | P-04-manifest.md |

**按需**：

| 情境 | 讀此檔 |
|---|---|
| 交付前 | P-99-errors-map.md |
| 修 Bug | P-12-incident.md |
| 改頁面 | P-07-pagemap.md |
| 改 UI | P-08-uispec.md |
| 改 API | P-09-api.md |
| 改資料 | P-10-data.md + P-11-compat.md |
| 業務術語 | P-13-glossary.md |
| 決策背景 | P-05-adr.md |
| 常見任務 | P-06-sop.md |

---

## 七、五大鐵則

| # | 鐵則 |
|---|---|
| 1 | 最簡潔實用 |
| 2 | 無補丁（能宣告就不手寫） |
| 3 | SSOT 極大化 |
| 4 | 檔案 ≤ 500 行 |
| 5 | AI 優先（不需為人類可讀性妥協） |

**詳細**：C-02-rules.md + P-02-anchor.md

---

## 八、下一步

| 使用者說 | AI 動作 |
|---|---|
| 「請交付第 N 波」 | 依 P-03-progress 交付 |
| 「查看進度」 | 讀 P-03 回報 |
| 「需要更新清單」 | 列已交付批次 |
| 「有問題」 | 跑 5 問 → 先診斷 |
| 「新增 X」 | 跑 5 問 → 提供方案 |
| 「重構 X」 | 跑 5 問 → 提供方案 |
| 「階段性總結」 | 依 C-07 §一 執行 |

---

## 九、待辦事項

| 項目 | 狀態 |
|---|---|
| B31：icon 更換 | 📋 待規劃 |
| B31：docs 版本號統一 | 📋 待規劃 |
| 清理 deprecated 檔（v104） | 📋 記錄 |
| db.js 拆檔（~510 行） | 📋 觀察 |
| column-registry.js 拆檔（~450 行） | 📋 觀察 |
| B30 起新功能 | 📋 待規劃 |

---

## 十、關聯檔案

| 主題 | 檔案 |
|---|---|
| 技術架構 | P-02-anchor.md |
| 進度 | P-03-progress.md |
| 檔案清單 | P-04-manifest.md |
| 錯誤摘要 | P-99-errors-map.md |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/P-01-index.md
   Version: v103.0.39
   Batch: B30-6
   ═══════════════════════════════════════════ */