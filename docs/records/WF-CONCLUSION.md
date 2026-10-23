# WF-CONCLUSION（專案滾動結論）

用途：WebApp Family 專案滾動式累積結論（議題 + 設計 + 決策）

---

## 一、議題清單

| # | 議題 | 狀態 |
|---|---|---|
| 1~4 | B33-3 早期重構與基礎整合 | 已完成 |
| 5 | 編號生成機制與 entity-create 統一 | 已完成 |
| 6 | 編號查詢與 code-list 頁面 | 已完成 |
| 7 | 專案四層架構與 W 包抽離 | 已完成 |
| 9 | 通用大腦與領域技能包對齊 | 已完成 |
| 71 | 體系對齊與專案紀錄重整 | 已完成 |
| 72 | SPA 重構與後端極簡化（V2） | 已完成 |
| 73 | 新舊倉庫分離與對照重寫 | 進行中 |

---

## 二、設計結論

### 2.1 編號系統與 API 統一（B34-4 定案）
1. **統一端點**：廢棄所有獨立 CRUD 端點，統一由 `POST /api/entity-create` 處理（含 `action` 參數）。
2. **編號生成**：由前端 `js/app-data.js` 負責，透過遍歷現有資料取得最大編號 +1，無計數器，防併發重複檢測。
3. **清單頁面**：`code-list.html` 取代舊 `database.html`，提供篩選與權限管理。

### 2.2 專案重組與體系對齊（B34-5 定案）
1. **紀錄檔重組**：專案技術文件保留 `P-*`，紀錄檔全面轉為 `WF-*`。
2. **領域資料抽離**：通用 Web App 規則已抽至體系 `W-00 ~ W-07`。

### 2.3 SPA 架構與後端極簡化（2026-10-22 定案）
1. **前端 10 檔架構**：將舊版 129 個檔案重構為 `app.html`, `app.css`, `sw-app.js`, `manifest-app.json`，以及 7 個 `app-*.js` 核心模組。
2. **後端 2 檔架構**：將 `functions/api/` 下 11 個檔案合併為 `[[path]].js` 與 `_api-core.js`。

### 2.4 倉庫分離與體系修正（2026-10-23 體系定案）
1. **舊檔分離**：舊版 129 個檔案已全數遷移至 `old-AI-WA-FAMILY` 倉庫。
2. **體系介入**：由 `ai-system-20261022-009` 撰寫遷移腳本。過程中發現腳本誤將 8 個新 `app-*.js` 搬至舊倉。
3. **修正結果**：體系再次介入，將 8 個 `app-*.js` 正確移回本倉，目前本倉（90）僅存 18 個乾淨的 SPA 檔案。
4. **下一步**：請 Web 開發者依 `old-AI-WA-FAMILY` 中的 `P-*` 規格，對照本倉 `app-*.js` 進行功能補齊與重寫。

---

## 三、決策記錄

*(完整歷史決策 D-001~D-143 請參閱舊倉 `P-14-decisions.md`)*

| 編號 | 決策 | 說明 |
|---|---|---|
| D-063 | entity-create 單一端點 | 取代舊有各自獨立的 CRUD 端點。 |
| D-064 | 舊端點全廢 | 只保留 GET 與特殊邏輯端點。 |
| D-118 | 通用大腦 + N 領域技能包 | 將通用邏輯抽離至體系 W 包。 |
| D-149 | `entity-registry.js` code 支援 | 已完成於新版 `app-data.js`。 |
| D-170 | SPA 重構與後端合併 | 前端 129 檔合併為 11 檔，後端 11 檔合併為 2 檔。 |
| D-171 | 新增 V2 識別與環境綁定 | `app.html` 加註 V2 與橘色識別；Cloudflare 環境變數設為 `DB_TARGET=new`。 |
| D-172 | 由體系協助完成舊檔遷移與修正 | 遷移目標為 `old-AI-WA-FAMILY`，並修正誤搬的 JS。 |

---

## 四、關聯檔案

| 主題 | 檔案 |
|---|---|
| 專案進度 | WF-PROGRESS.md |
| 專案交接 | WF-HANDOFF.md |
| 決策明細 | 舊倉 old-AI-WA-FAMILY/docs/projects/web-app-family/P-14-decisions.md |
| ADR 索引 | 舊倉 old-AI-WA-FAMILY/docs/projects/web-app-family/P-04-adr-index.md |

---

/* ═══ EOF ═══
F: docs/records/WF-CONCLUSION.md
V: 1792713002
W: ai-system-20261022-009#3
═══ */