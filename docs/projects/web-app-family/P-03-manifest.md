# P-03 檔案清單

最後更新：B34-4
Version: 1791903820
Batch: B34-4
Writer: A20261013-004#170
用途：所有交付檔案版本 + 批次追蹤

---

## docs/（26 檔，目標結構）

### L1 AI 通用（C-*，10 檔）

| 檔案 | Version | Batch | Writer |
|---|---|---|---|
| C-00-startup.md | 1791903520 | B34-4 | A261013-004#166 |
| C-01-profile.md | 1791896060 | B34-1 | A261013-004#016 |
| C-02-rules.md | 1791903460 | B34-4 | A261013-004#165 |
| C-03-guide.md | 1791903580 | B34-4 | A261013-004#167 |
| C-04-delivery.md | 1791902320 | B34-4 | A261013-004#107 |
| C-05-learning.md | 1791902800 | B34-4 | A261013-004#136 |
| C-06-token-log.md | 1791897660 | B34-2 | A261013-004#036 |
| C-07-summary.md | 1791896360 | B34-1 | A261013-004#018 |
| C-09-rolling-mechanism.md | 1791898780 | B34-3 | A261013-004#057 |
| C-10-handoff-mechanism.md | 1791898840 | B34-3 | A261013-004#057 |

### L2 Web App 通用（W-*，6 檔）

| 檔案 | Version | Batch | Writer |
|---|---|---|---|
| W-00-startup.md | 1791903760 | B34-4 | A261013-004#169 |
| W-01-firebase.md | 1791899500 | B34-3 | A261013-004#065 |
| W-02-functions.md | 1791899560 | B34-3 | A261013-004#065 |
| W-03-esmodule.md | 1791899620 | B34-3 | A261013-004#065 |
| W-04-pwa.md | 1791899680 | B34-3 | A261013-004#065 |
| W-05-schema.md | 1791899740 | B34-3 | A261013-004#065 |

### L3 本專案（P-*，15 檔）

| 檔案 | Version | Batch | Writer |
|---|---|---|---|
| P-01-index.md | 1791898900 | B34-3 | A261013-004#058 |
| P-02-progress.md | 1791902860 | B34-4 | A261013-004#136 |
| P-03-manifest.md | 1791903820 | B34-4 | A261013-004#170 |
| P-04-decisions.md | 1791899080 | B34-3 | A261013-004#059 |
| P-05-sop.md | 1791899800 | B34-3 | A261013-004#067 |
| P-06-pagemap.md | 1791899980 | B34-3 | A261013-004#068 |
| P-07-uispec.md | 1791899860 | B34-3 | A261013-004#067 |
| P-08-api.md | 1791900040 | B34-3 | A261013-004#069 |
| P-09-data.md | 1791899140 | B34-3 | A261013-004#060 |
| P-10-incident.md | 1791899200 | B34-3 | A261013-004#061 |
| P-12-conclusion.md | 1791899320 | B34-3 | A261013-004#064 |
| P-13-handoff.md | 1791903640 | B34-4 | A261013-004#168 |
| P-14-decisions.md | 1791899380 | B34-3 | A261013-004#064 |
| P-15-reorg-plan.md | 1791903700 | B34-4 | A261013-004#168 |
| P-99-errors-map.md | 1791899920 | B34-3 | A261013-004#067 |

### L4 機械記錄（R-*，1 檔）

| 檔案 | Version | Batch | Writer |
|---|---|---|---|
| R-01-writers.md | 1791903400 | B34-4 | A261013-004#164 |

**註**：C-08 已刪除；C-09 / C-10 已改名機制版；P-11 已改名 R-01。

---

## docs/ 目標結構（P-15 重組後）

| 層級 | 路徑 | 檔案數 |
|---|---|---|
| 1 | docs/common/ | 10（C-*） |
| 1 | docs/skills/W/ | 6（W-*） |
| 1 | docs/records/ | 1（R-01） |
| 1 | docs/projects/family-fin/ | 15（P-*） |

---

## 程式碼（B34-4 交付，20 檔）

| 檔案 | 版本 | Batch | Writer |
|---|---|---|---|
| js/lib/code-registry.js | 1791900400 | B34-4 | A261013-004#076 |
| js/lib/id-resolver.js | 1791900460 | B34-4 | A261013-004#076 |
| functions/api/_entity.js | 1791901060 | B34-4 | A261013-004#087 |
| code-list.html | 1791900580 | B34-4 | A261013-004#077 |
| js/pages/code-list.js | 1791902680 | B34-4 | A261013-004#121 |
| js/ui/dropdown-plus.js | 1791901780 | B34-4 | A261013-004#100 |
| js/shared/yearrange-card.js | 1791902620 | B34-4 | A261013-004#118 |
| sw.js | 1791902140 | B34-4 | A261013-004#104 |
| js/entity/entity-definitions.js | 1791901900 | B34-4 | A261013-004#102 |
| js/entity/entity-helpers.js | 1791902740 | B34-4 | A261013-004#131 |
| js/entity/entity-modal.js | 1791901240 | B34-4 | A261013-004#090 |
| js/core/api.js | 1791900880 | B34-4 | A261013-004#082 |
| functions/api/[[path]].js | 1791900940 | B34-4 | A261013-004#083 |
| js/config/constants.js | 1791901300 | B34-4 | A261013-004#091 |
| js/config/column-registry.js | 1791901480 | B34-4 | A261013-004#094 |
| js/ui/modal.js | 1791901420 | B34-4 | A261013-004#093 |
| js/ui/form-builder.js | 1791901960 | B34-4 | A261013-004#103 |
| js/lib/expense-modal.js | 1791902020 | B34-4 | A261013-004#103 |
| js/lib/income-modal.js | 1791902080 | B34-4 | A261013-004#103 |
| js/pages/settings.js | 1791901600 | B34-4 | A261013-004#096 |

---

## 根目錄（2 檔 + 待產 3 檔）

| 檔案 | 狀態 |
|---|---|
| sw.js | ✅ |
| manifest.json | ✅ |
| STARTUP-core-webapp.md | 📋 待 Actions 產出 |
| STARTUP-project-family-fin.md | 📋 待 Actions 產出 |
| INDEX.md | 📋 待 Actions 產出 |

---

## GitHub Actions（1 檔）

| 檔案 | 狀態 |
|---|---|
| .github/workflows/setup-structure.yml | 📋 待上傳（#160 已交內容） |

---

## 統計

| 類別 | 檔案數 |
|---|---|
| docs/ | 26（目標結構） |
| js/* | 97 |
| functions/api/ | 11 |
| CSS | 6 |
| HTML | 13 |
| 根目錄 | 2 + 3（待產） |
| GitHub Actions | 1（待上傳） |
| **總計** | **156** |

---

## 待處理

| 項目 | 狀態 |
|---|---|
| P-15 重組執行（setup-structure.yml） | 📋 使用者手動 |
| W-00-startup.md 上傳 | 📋 使用者手動 |
| STARTUP-* / INDEX.md 產出 | 📋 待 Actions |
| END OF FILE 補齊（~44 檔代碼） | 📋 待處理 |
| 版本號統一（v103.0.xx） | 📋 待處理 |
| entity-registry 加 code 支援 | 📋 待驗證 |

---

## 更新記錄

| 批次 | 更新 |
|---|---|
| **B34-4** | **編號系統程式碼交付（20 檔）+ 通用大腦架構設計 + W-00 補齊** |
| B34-3 | 議題 7 / 9 + 四層架構（35 檔） |
| B34-2 | 議題 5 / 6 + Token 原則 + 上限 800 |
| B34-1 | docs 整合（D-001~D-023） |
| B33-1~3 | 編號系統 + C-09 / C-10 建立 |
| B32-2 | 兩層三反引號 |
| B32-1 | docs 重建（20 檔） |
| B31-1 | 9 個 bug 修正 |

---

## 關聯檔案

| 主題 | 檔案 |
|---|---|
| 專案索引 | P-01-index.md |
| 進度 | P-02-progress.md |
| 決策 | P-04-decisions.md |
| AI 名單 | R-01-writers.md |
| 議題結論 | P-12-conclusion.md |
| 重組計畫 | P-15-reorg-plan.md |

---

/* ═══ EOF ═══
F: docs/P-03-manifest.md
V: 1791903820
B: B34-4
W: A20261013-004#170
═══ */