# P-15 AI 訓練體系重組計畫書

最後更新：B34-4
Version: 1791903160
Batch: B34-4
Writer: A20261013-004#156
用途：通用大腦 + N 領域技能包架構重組計畫

---

## 一、背景與目標

### 1.1 現況問題

| # | 問題 |
|---|---|
| 1 | 現有 C-* / W-* / P-* / R-* 混在同一 repo |
| 2 | 每開新對話需手動上傳 4 檔啟動包 |
| 3 | 無法套用到其他專案（VBA / 資料分析等） |
| 4 | 加新領域需重新設計 |

### 1.2 目標

| # | 目標 |
|---|---|
| 1 | 通用大腦 + N 領域技能包架構 |
| 2 | 零上傳（貼 1~2 條 URL） |
| 3 | 新專案 5 分鐘內啟動 |
| 4 | 新領域照抄模板即可 |

---

## 二、架構總覽

### 2.1 四層架構

| 層 | 前綴 | 職責 | Repo |
|---|---|---|---|
| L1 | C-* | 通用大腦 | A（共用） |
| L2 | W-* / V-* / D-* / M-* | 領域技能包 | A（共用） |
| L3 | P-* | 專案專屬 | B（每專案） |
| L4 | R-01 | 機械記錄（跨專案） | A（共用） |

### 2.2 領域前綴分配

| 前綴 | 領域 | 狀態 |
|---|---|---|
| C | 通用大腦（非領域） | ✅ 已有 |
| W | Web App | ✅ 已有 |
| V | VBA / 桌面自動化 | 🔒 保留 |
| D | 資料分析 / 腳本 | 🔒 保留 |
| M | 文案 / 內容創作 | 🔒 保留 |
| E | Excel（純公式 / PQ） | 🔒 保留 |
| A | AutoHotkey | 🔒 保留 |
| S | SEO / 社群 | 🔒 保留 |
| N | Notion / 知識管理 | 🔒 保留 |
| X / Y / Z | 未分配 | 🔒 保留 |

### 2.3 啟動包機制

**用戶每次開新對話**：

| 步驟 | 動作 |
|---|---|
| 1 | 貼 INDEX.md URL（可選） |
| 2 | 依 INDEX 指引，貼 2 條 URL（core + project） |

**2 條 URL**：

| # | URL | 內容 |
|---|---|---|
| 1 | STARTUP-core-{領域}.md（Repo A） | C-00 + R-01 + 該領域技能包 |
| 2 | STARTUP-project-{專案}.md（Repo B） | P-12 + P-13 |

---

## 三、目錄結構

### 3.1 Repo A（共用，只有一個）

**名稱**：`AI-training-files`

**目錄表**：

| 層級 | 路徑 | 說明 |
|---|---|---|
| 1 | AI-training-files/ | repo 根 |
| 2 | docs/ | 文件根 |
| 3 | docs/common/ | C-00 ~ C-10 |
| 3 | docs/skills/ | 領域技能包 |
| 4 | docs/skills/W/ | Web App（W-00 ~ W-99） |
| 4 | docs/skills/V/ | VBA（未來） |
| 4 | docs/skills/D/ | 資料分析（未來） |
| 4 | docs/skills/M/ | 文案（未來） |
| 3 | docs/records/ | R-01 |
| 2 | .github/ | GitHub 設定 |
| 3 | .github/workflows/ | Actions |
| 4 | .github/workflows/build-core-startup.yml | 自動合併腳本 |
| 1 | STARTUP-core-webapp.md | 自動產 |
| 1 | STARTUP-core-vba.md | 自動產（未來） |
| 1 | INDEX.md | 自動產 |
| 1 | README.md | 手寫 |

### 3.2 Repo B（每專案一個）

**名稱**：`{專案名}-docs`（例：`family-fin-docs`）

**目錄表**：

| 層級 | 路徑 | 說明 |
|---|---|---|
| 1 | family-fin-docs/ | repo 根 |
| 2 | docs/ | 文件根 |
| 3 | docs/projects/ | 專案根 |
| 4 | docs/projects/family-fin/ | P-01 ~ P-99 |
| 2 | .github/ | GitHub 設定 |
| 3 | .github/workflows/ | Actions |
| 4 | .github/workflows/build-project-startup.yml | 自動合併腳本 |
| 1 | STARTUP-project-family-fin.md | 自動產 |
| 1 | README.md | 手寫 |

---

## 四、各層職責

### 4.1 L1 通用大腦（C-*）

| 檔案 | 職責 | 狀態 |
|---|---|---|
| C-00-startup.md | 啟動卡 | ✅ 已有 |
| C-01-profile.md | 使用者畫像 | ✅ 已有 |
| C-02-rules.md | 通用規則 | ✅ 已有 |
| C-03-guide.md | 流程指南 | ✅ 已有 |
| C-04-delivery.md | 交付格式 | ✅ 已有 |
| C-05-learning.md | 學習日誌 | ✅ 已有 |
| C-06-token-log.md | Token 記錄 | ✅ 已有 |
| C-07-summary.md | 階段總結 | ✅ 已有 |
| C-09-rolling-mechanism.md | 滾動結論機制 | ✅ 已有 |
| C-10-handoff-mechanism.md | 交接快照機制 | ✅ 已有 |

**變更**：路徑從 `docs/` → `docs/common/`

### 4.2 L2 領域技能包（統一 6 檔模板）

每個領域 `{X}-*` 一律 6 檔：

| # | 檔名 | 職責 |
|---|---|---|
| 1 | {X}-00-startup.md | 領域啟動卡（工具鏈 / 慣例） |
| 2 | {X}-01-structure.md | 專案結構 / 命名規則 |
| 3 | {X}-02-rules.md | 領域專屬規則 |
| 4 | {X}-03-sop.md | 常見任務 SOP |
| 5 | {X}-04-templates.md | 常用範本 / 樣板 |
| 6 | {X}-99-errors-map.md | 常見錯誤 |

**W-* 現有 5 檔需補 1 檔**（目前缺 W-00-startup.md）

### 4.3 L3 專案專屬（P-*）

| 檔案 | 職責 |
|---|---|
| P-01 ~ P-11 | 專案索引 / 進度 / 清單 / 決策等 |
| P-12-conclusion.md | 議題結論 |
| P-13-handoff.md | 交接快照 |
| P-14-decisions.md | 決策記錄 |
| P-99-errors-map.md | 錯誤摘要 |

### 4.4 L4 機械記錄（R-01）

| 欄位 | 內容 |
|---|---|
| 編號規則 | — |
| 生成流程 | — |
| 專案清單 | **加「領域」欄** |
| 編寫者清單 | — |
| 檔案歸屬 | — |

---

## 五、啟動包機制（詳細）

### 5.1 INDEX.md（動態索引）

**位置**：Repo A 根目錄

**內容表格**：

| 專案 | 領域 | 核心 STARTUP | 專案 STARTUP |
|---|---|---|---|
| 家庭 webapp | W | STARTUP-core-webapp.md | STARTUP-project-family-fin.md |
| （未來）VBA 會計 | V | STARTUP-core-vba.md | STARTUP-project-vba-accounting.md |

### 5.2 用戶操作流程

**首次或忘記 URL 時**：

| 步驟 | 動作 |
|---|---|
| 1 | 貼 INDEX.md URL |
| 2 | AI 讀完說「請選擇專案」 |
| 3 | 你說「家庭 webapp」 |
| 4 | AI 給 2 條 URL |
| 5 | 你貼 2 條 |

**日常（已記住 URL）**：

| 步驟 | 動作 |
|---|---|
| 1 | 貼 2 條 URL（core + project） |

### 5.3 URL 範本（給你存手機記事本）

| 專案 | 核心 URL | 專案 URL |
|---|---|---|
| 家庭 webapp | raw…/STARTUP-core-webapp.md | raw…/family-fin-docs/main/STARTUP-project-family-fin.md |

---

## 六、GitHub Actions 設計

### 6.1 Repo A：build-core-startup.yml

**觸發**：`docs/common/*` 或 `docs/skills/*` 或 `docs/records/*` 更新

**產出**：

| 檔 | 內容 |
|---|---|
| STARTUP-core-{領域}.md | 每個領域一份（C-00 + R-01 + 該領域 6 檔） |
| INDEX.md | 讀 R-01 §三 專案清單 → 產出索引表 |

### 6.2 Repo B：build-project-startup.yml

**觸發**：`docs/projects/{專案}/*` 更新

**產出**：

| 檔 | 內容 |
|---|---|
| STARTUP-project-{專案}.md | P-12 + P-13 |

---

## 七、遷移計畫

### 7.1 階段 1：Repo A 重組（現有）

| 步驟 | 動作 |
|---|---|
| 1 | 建 docs/common/，搬入 C-* |
| 2 | 建 docs/skills/W/，搬入 W-* |
| 3 | 建 docs/records/，搬入 R-01 |
| 4 | W-* 補 W-00-startup.md |
| 5 | C-00 更新路徑引用 |
| 6 | 加 build-core-startup.yml |

### 7.2 階段 2：Repo B 建立（家庭 webapp）

| 步驟 | 動作 |
|---|---|
| 1 | 新建 repo family-fin-docs |
| 2 | 建 docs/projects/family-fin/，搬入 P-* |
| 3 | 加 build-project-startup.yml |
| 4 | 移除 Repo A 內的 P-* |

### 7.3 階段 3：驗證

| 步驟 | 動作 |
|---|---|
| 1 | 手動觸發 Actions |
| 2 | 確認 STARTUP / INDEX 產出 |
| 3 | 貼 URL 測試新對話 |

---

## 八、未來擴充規則

### 8.1 新增領域（AI 主動建議，依 C-00 §十一）

**觸發**：使用者選「新專案」→ AI 問領域 → 若為新領域 → 主動建議建 6 檔

**AI 動作**：

| 步驟 | 動作 |
|---|---|
| 1 | 依使用者描述產草稿 |
| 2 | 提示「是否需要調整」 |
| 3 | 使用者確認 → 產出 6 檔 |
| 4 | 放 docs/skills/{X}/ |
| 5 | 更新 C-00 §九、R-01 §三 |

### 8.2 新增專案

| 步驟 | 動作 |
|---|---|
| 1 | 開新 Repo B |
| 2 | 複製 P-* 模板 |
| 3 | R-01 §三 加該專案（含領域欄） |
| 4 | 設 GitHub Actions |

---

## 九、對比表：現況 vs 重組後

| 項目 | 現況 | 重組後 |
|---|---|---|
| Repo 數 | 2 | 3 |
| 檔案結構 | docs/ 混放 | docs/common + skills + records |
| 加新領域 | 需重設計 | 照抄 6 檔模板 |
| 加新專案 | 難 | 4 步 |
| 啟動包 | 4 檔上傳 | 2 條 URL |
| 領域檔案數 | 不定 | 統一 6 檔 |
| GitHub Actions | 無 | 2 個 workflow |

---

## 十、待決事項

| # | 項目 | 狀態 |
|---|---|---|
| 1 | C-00 加 §十一「AI 主動建議領域」 | 📋 |
| 2 | C-00 §二 步驟改讀 INDEX.md | 📋 |
| 3 | R-01 §三 加「領域」欄 | 📋 |
| 4 | W-* 補 W-00-startup.md | 📋 |
| 5 | GitHub Actions yml（2 個） | 📋 |
| 6 | URL 範本（給使用者存） | 📋 |
| 7 | C-02 §六點五 加替換對照表（Q251） | 📋 |

---

## 十一、關聯檔案

| 主題 | 檔案 |
|---|---|
| 啟動卡 | C-00-startup.md |
| AI 名單 | R-01-writers.md |
| 議題結論 | P-12-conclusion.md |
| 交接快照 | P-13-handoff.md |
| 決策記錄 | P-14-decisions.md |

---

/* ═══ EOF ═══
F: docs/P-15-reorg-plan.md
V: 1791903160
B: B34-4
W: A20261013-004#156
═══ */