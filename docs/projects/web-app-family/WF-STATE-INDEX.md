# WF-STATE-INDEX（專案檔案狀態索引）

最後更新：2026-10-21
Version: 1792581010
Writer: ai-system-20261021-004#10
用途：記錄所有已交付檔案的版本與清單

---

## 一、專案總覽

| 專案顯示名稱 | code | domain | package_no | repo |
|---|---|---|---|---|
| 家庭 webapp | webapp | W | 90 | tlee20860-dotcom/AI-WEB-APP-Family |

---

## 二、檔案清單（手動維護）

### 1. L1 通用大腦（對齊體系後留空，僅供參考）
*(本專案現階段不包含 C-* 檔案，已由體系 IP/AP/RP/UP 替代)*

### 2. L2 Web App 領域包（W-*，體系提供）
*依賴體系 `AI-kernel/docs/skills/W/`，不在此重複記錄。*

### 3. L3 專案紀錄與技術包（WF-* / P-*）
| 檔案 | 版本 | 說明 |
|---|---|---|
| WF-PROGRESS.md | 1792581009 | 任務進度 |
| WF-STATE-INDEX.md | 1792581010 | 本檔 |
| WF-CONCLUSION.md | 1792581011 | 議題與決策 |
| WF-HANDOFF.md | 1792581012 | 交接快照 |
| P-01-index.md | 1792222800 | 架構與目錄 |
| P-04-adr-index.md | 1792581013 | ADR 索引 |
| P-05-sop.md | 1791904300 | 專案 SOP |
| P-06-pagemap.md | 1791904480 | 頁面區塊對照 |
| P-07-uispec.md | 1791899860 | UI 規格 |
| P-08-api.md | 1791904360 | API 契約 |
| P-09-data.md | 1791899140 | RTDB 資料結構 |
| P-10-incident.md | 1791899200 | 事故日誌 |
| P-14-decisions.md | 1792581014 | 決策明細附錄 |
| P-15-reorg-plan.md | 1791903160 | 重組計畫書 |
| P-99-errors-map.md | 1792581015 | 錯誤快速查核 |

### 4. 程式碼檔案（節錄，完整見 Repo）
| 目錄 | 檔數 | 說明 |
|---|---|---|
| `js/` | 97 | 核心邏輯與頁面 Schema |
| `functions/` | 11 | CF Pages Functions |
| `css/` | 6 | 樣式 |
| `*.html` | 13 | 頁面 |

---

## 三、自動生成宣告

> 本檔現階段由 AI 手動維護。未來若導入專案層 Actions，可比照體系 `STATE-INDEX.md` 自動生成機制，改由腳本於 push 時自動更新。

---

/* ═══ EOF ═══
F: WF-STATE-INDEX.md
V: 1792581010
W: ai-system-20261021-004#10
═══ */