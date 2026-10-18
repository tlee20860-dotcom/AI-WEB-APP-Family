---
name: web-app-family
display: 家庭 webapp
code: webapp
domain: W
package_no: 90
repo: tlee20860-dotcom/WEB-APP-Family
---

# P-01 專案索引 + 技術架構

最後更新：ai-system-20261017-004
Version: 1792222800
Batch: B34-5
Writer: ai-system-20261017-004#027
用途：專案索引（技術架構已抽至 W-*）

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
| 當前批次 | B34-4（完成 + 測試通過） |
| 部署 URL | family-financial-management-system-v2.pages.dev |
| 測試狀態 | 5 組全通過 |
| 下一步 | 執行 P-15 重組計畫 |

---

## 三、架構概覽（詳見 W-*）

| 主題 | 檔案 |
|---|---|
| Web App 領域啟動卡 | W-00-startup.md |
| Firebase RTDB 原則 | W-01-firebase.md |
| Cloudflare Pages Functions | W-02-functions.md |
| 純前端 ES Module 架構 | W-03-esmodule.md |
| PWA + Service Worker | W-04-pwa.md |
| Page Schema | W-05-schema.md |

> **技術架構完整內容已抽至 W-* 層。**

---

## 四、docs 目錄結構（P-15 重組後）

### 4.1 AI-training-files repo

| 層級 | 路徑 | 說明 |
|---|---|---|
| 1 | AI-training-files/ | repo 根 |
| 2 | docs/common/ | C-00 ~ C-10 |
| 2 | docs/skills/W/ | W-00 ~ W-05 |
| 2 | docs/records/ | R-01 |
| 2 | docs/projects/family-fin/ | P-01 ~ P-99 |
| 2 | .github/workflows/ | Actions |
| 1 | STARTUP-core-webapp.md | 自動產 |
| 1 | STARTUP-project-family-fin.md | 自動產 |
| 1 | INDEX.md | 自動產 |

### 4.2 v2.Family repo（程式碼）

| 層級 | 路徑 | 說明 |
|---|---|---|
| 1 | js/config/ | constants / registry |
| 1 | js/core/ | state / db / api / auth |
| 1 | js/lib/ | 通用 lib |
| 1 | js/engines/ | page / data / render |
| 1 | js/blocks/ | 5 大 block |
| 1 | js/ui/ | UI 元件 |
| 1 | js/layout/ | navbar / sidebar / app-shell |
| 1 | js/entity/ | entity 相關 |
| 1 | js/shared/ | 共用元件 |
| 1 | js/pages/ | 純 Schema |
| 1 | functions/api/ | CF Functions |
| 1 | css/ | 6 檔 |
| 1 | *.html | 13 檔 |

---

## 五、本專案檔案結構（實作）

| 目錄 | 檔數 | 內容 |
|---|---|---|
| js/config | 8+1 | constants / firebase-config / app-config / 4 Registry / page-metadata-registry /（待）code-registry |
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

## 六、編號系統（已交付）

| 模組 | 職責 |
|---|---|
| js/lib/code-registry.js | 生成編號（查最大 + 1）、子類短碼自動決定 |
| js/lib/id-resolver.js | 從編號查實體、從編號展開關聯 |
| code-list.html + js/pages/code-list.js | 編號對照清單頁（取代 database.html） |
| POST /api/entity-create | 統一新增端點（含 action 參數） |

**詳細**：P-12 §議題 5 / 6

---

## 七、關聯檔案

| 主題 | 檔案 |
|---|---|
| 進度 | P-02-progress.md |
| 檔案清單 | P-03-manifest.md |
| 決策 | P-04-decisions.md |
| 常見任務 | P-05-sop.md |
| 議題結論 | P-12-conclusion.md |
| 交接快照 | P-13-handoff.md |
| 重組計畫 | P-15-reorg-plan.md |
| Web App 技能包 | W-00 ~ W-05 |
| 機械記錄 | STATE-INDEX.md |

---

/* ═══ EOF ═══
F: docs/P-01-index.md
V: 1792222800
B(歷史): B34-5
W: ai-system-20261017-004#027
═══ */