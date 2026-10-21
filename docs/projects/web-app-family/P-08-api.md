# P-08 API 契約

最後更新：2026-10-21
Version: 1792581019
Writer: ai-system-20261021-004#19
用途：本專案前後端介面參考（通用錯誤碼已抽至 W-02）

---

## 一、前端模組 API

*(保留原有前端模組 API 完整清單，如 status-registry / entity-registry / code-registry / data-engine 等，不變動)*

---

## 二、後端 API 契約

所有 URL 路徑保持不變；實作改為 functions/api/[[path]].js Catch-all 分派。

### GET 端點
*(保留原有清單：/api/family-settings / /api/summary / /api/annual-summary 等)*

### POST 端點
*(保留原有清單：/api/lookup-family / /api/entity-create 等)*

### POST /api/entity-create（本專案核心端點）

**Request**：
| 欄位 | 類型 | 說明 |
|---|---|---|
| entityType | string | member / bank / category / item / payment / company / policy / fund / bankAccount |
| action | string | create / update / delete |
| code | string | 前端生成的編號（create 用） |
| name | string | 名稱 |
| id | string | 實體 ID（update / delete 用） |
| extra | object | 依類型不同 |

**成功回應**：`{ ok: true, id, code }`

**本專案專屬錯誤碼**：
| error | 觸發 |
|---|---|
| CODE_DUPLICATE | 編號已存在 |
| NAME_DUPLICATE | 名稱重複 |

*(通用錯誤碼如 MISSING_FIELDS, INVALID_BODY, UNAUTHORIZED 等請見 W-02)*

**後端檢查順序**：驗證登入 → 驗證 body → 驗證必填 → 查重複 code → 查重複 name → 寫入 Firebase。

---

## 三、錯誤回應格式

> **通用錯誤回應格式與 HTTP 狀態碼（401, 403, 400, 404, 409, 500）請見 `W-02-functions.md` §六。**

本專案額外定義：
| Code | HTTP | 說明 |
|---|---|---|
| CODE_DUPLICATE | 409 | 編號重複 |
| NAME_DUPLICATE | 409 | 名稱重複 |

---

## 四、成功回應格式

| 欄位 | 說明 |
|---|---|
| ok | true |
| ... | 資料欄位 |

---

## 五、B34-4 交付完成清單

| 模組 | 狀態 |
|---|---|
| code-registry.js | ✅ |
| id-resolver.js | ✅ |
| code-list.html / code-list.js | ✅ |
| entity-create 端點 | ✅ |
| dropdown-plus.js | ✅ |
| form-builder plusEntity | ✅ |
| settings 年份範圍 | ✅ |

---

## 六、關聯檔案

| 主題 | 檔案 |
|---|---|
| 通用 CF Functions 規則 | W-02-functions.md |
| 資料結構 | P-09-data.md |
| 專案索引 | P-01-index.md |

---

/* ═══ EOF ═══
F: P-08-api.md
V: 1792581019
W: ai-system-20261021-004#19
═══ */