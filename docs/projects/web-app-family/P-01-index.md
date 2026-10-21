# P-01 專案索引 + 技術架構

最後更新：2026-10-21
Version: 1792581016
Writer: ai-system-20261021-004#16
用途：專案索引與專屬技術架構（通用架構已抽至 W-*）

---

## 一、專案身份

| 項目 | 內容 |
|---|---|
| 專案 | 家庭財務與固定供款管理 Web App |
| 領域 | W（Web App） |
| GitHub（程式碼） | tlee20860-dotcom/v2.Family |
| GitHub（文件） | tlee20860-dotcom/AI-training-files |
| 部署 | Cloudflare Pages |
| 資料庫 | Firebase RTDB (asia-southeast1) |
| 登入 | Firebase Auth |
| 前端 | 純 HTML + CSS + ES Module JS |
| 後端 | Cloudflare Pages Functions |
| 視覺 | 亮色家庭暖陽 |
| 金額 | 四捨五入至整數 |

---

## 二、當前狀態

| 項目 | 值 |
|---|---|
| 當前批次 | B34-5（體系對齊中） |
| 部署 URL | family-financial-management-system-v2.pages.dev |
| 測試狀態 | B34-4 5 組全通過 |
| 下一步 | 執行 P-15 重組與 Actions 觸發 |

---

## 三、架構概覽（詳見 W-*）

| 主題 | 檔案 |
|---|---|
| Web App 領域啟動卡 | W-00-startup.md |
| Firebase RTDB 原則 | W-01-firebase.md |
| Cloudflare Pages Functions | W-02-functions.md |
| 純前端 ES Module 架構 | W-03-esmodule.md |
| PWA + Service Worker | W-04-pwa.md |
| Page Schema 與 UI 規範 | W-05-schema.md |
| 通用任務 SOP | W-06-sop.md |
| 通用錯誤防呆 | W-07-errors.md |

> **技術架構完整內容已抽至 W-* 層。**

---

## 四、本專案檔案結構（專屬實作）

> **通用目錄規範（如 js/config, js/engines 等配置）已抽離至 `W-03-esmodule.md` §八。以下僅列本專案特有之實作與檔數。**

| 目錄 | 檔數 | 內容（專案特有補充） |
|---|---|---|
| js/config | 8+1 | 4 Registry / page-metadata-registry /（待）code-registry |
| js/core | 8 | state / api / db / auth / auth-guard / utils / pwa / debug |
| js/lib | 14 | dom / async / lifecycle / registry / merge / insurance / bank / format / expense-modal / income-modal / filter-sort / page-controls / code-registry / id-resolver |
| js/engines | 3 | page / data / render |
| js/blocks | 5 | stats / list / filter / detail / form |
| js/ui | 7 | toast / modal / form-builder / tab-panel / view-toggle / collapsible / dropdown-plus |
| js/layout | 3 | navbar / sidebar / app-shell |
| js/entity | 5 | entity-modal / entity-helpers / entity-definitions / entity-resolvers / entity-funds-allocation |
| js/admin | 2 | admin / platform-defaults |
| js/shared | 13 | data-table / data-card / ... / yearrange-card |
| js/pages | 10 | 純 Schema |
| functions/api | 11 | _config / _helpers / _admin / _bank / _family / _insurance / _personal / _platform / _summary / _entity / [[path]] |
| CSS | 6 | theme / layout / components / utilities / pages/annual-report / pages/insurance |
| HTML | 13 | 各頁 + login / register + code-list |
| icons | 1+ | icon.svg / icon.png |
| 根目錄 | 3 | sw.js / manifest.json / docs/ |

---

## 五、編號系統（已交付）

| 模組 | 職責 |
|---|---|
| js/lib/code-registry.js | 生成編號（查最大 + 1）、子類短碼自動決定 |
| js/lib/id-resolver.js | 從編號查實體、從編號展開關聯 |
| code-list.html + js/pages/code-list.js | 編號對照清單頁（取代 database.html） |
| POST /api/entity-create | 統一新增端點（含 action 參數） |

**詳細**：參見 `WF-CONCLUSION.md` §二 議題 5 / 6

---

## 六、關聯檔案

| 主題 | 檔案 |
|---|---|
| 進度 | WF-PROGRESS.md |
| 檔案清單 | WF-STATE-INDEX.md |
| 議題與決策 | WF-CONCLUSION.md |
| 交接快照 | WF-HANDOFF.md |
| 重組計畫 | P-15-reorg-plan.md |
| Web App 技能包 | W-00 ~ W-07 |

---

/* ═══ EOF ═══
F: P-01-index.md
V: 1792581016
W: ai-system-20261021-004#16
═══ */