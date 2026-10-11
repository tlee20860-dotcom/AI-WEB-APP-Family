# 交付進度

最後更新：B26-7
當前批次：B26-7
狀態：B26 全批次完成，部署測試中

---

## 總覽

| 批次 | 主題 | 檔案數 | 狀態 |
|---|---|---|---|
| B01 ~ B19 | 重構階段 | 見 incident-log | ✅ |
| B20 | 第二輪測試修復 | 10 | ✅ |
| B21 | docs 重構 | 14 | ✅ |
| B22 | 第三輪測試修復 | 9 | ✅ |
| B23 | 基金保險分支 | 8 | ✅ |
| B24 | docs 更新 + 診斷報告 | 14 | ✅ |
| B25 | 全站修復（含 B25-1~7） | 27 + 6 docs | ✅ |
| B26 | 全站優化（含 B26-1~7） | 30 + 7 docs | ✅ |

---

## B26 子批次

### B26-1a：docs 補齊（2 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | docs/api-contracts.md | 加 admin-migrate 端點 |
| 2 | docs/compatibility.md | 加一次性遷移說明 |

### B26-1b：docs 補齊（3 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | docs/ai-guide.md | 規則索引補 0.19~0.22 |
| 2 | docs/delivery-rules.md | 規則對照 + 新規則操作指引 |
| 3 | docs/sop.md | 加新任務 SOP |

### B26-2：P22 修正（1 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | js/pages/settlements.js | reload 開頭同步 filters.year/month |

### B26-3：P24 全站佈局統一（20 檔）

| 內容 | 檔案 |
|---|---|
| 新增 | js/lib/page-controls.js |
| 修改 | navbar / constants / sw / 7 JS / 7 HTML / components.css |
| docs | ui-spec.md（新）+ README + file-manifest + anchor |

### B26-3.1：缺陷修復（9 檔）

| 內容 | 檔案 |
|---|---|
| 修改 | page-controls.js + components.css + 7 HTML |

### B26-3.2：page-header 統一（16 檔）

| 內容 | 檔案 |
|---|---|
| 修改 | page-controls.js + components.css + 7 HTML + 3 JS |
| docs | ui-spec.md（新）+ README + file-manifest + anchor |

### B26-3.3：手機版 page-header 換行（1 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | css/components.css | 移除手機強制 column |

### B26-4：Superadmin sidebar（3 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | js/config/constants.js | SIDEBAR_GROUPS 加 roles 標記 |
| 2 | js/layout/sidebar.js | renderSidebar 依角色過濾 |
| 3 | admin.html | page-header 對齊標準 |

### B26-5：遷移按鈕方案 C（1 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | js/pages/settings.js | 遷移卡加家庭選擇器 |

### B26-6：年度總覽恢復（2 檔）

| # | 檔案 | 變更 |
|---|---|---|
| 1 | index.html | 加 annual-overview-root |
| 2 | js/pages/dashboard.js | 加年度總覽渲染 |

### B26-7：docs 收尾（7 檔）

| # | 檔案 | 狀態 |
|---|---|---|
| 1 | docs/file-manifest.md | ✅ |
| 2 | docs/progress.md | ✅ 本檔 |
| 3 | docs/README.md | ✅ |
| 4 | docs/anchor.md | 待交付 |
| 5 | docs/page-map.md | 待交付 |
| 6 | docs/ui-spec.md | 待交付 |
| 7 | docs/ai-guide.md | 待交付 |

---

## B26 已修復問題

| 編號 | 主題 | 修復批次 |
|---|---|---|
| P22 | 年月切換需重整 | B26-2 |
| P24 | 全站佈局不統一 | B26-3 |
| B26-3 缺陷 | 月份 0 / 雙重渲染 / 順序 | B26-3.1 |
| 手機換行 | page-header column | B26-3.3 |
| Superadmin sidebar | 顯示家庭頁面群組 | B26-4 |
| 遷移按鈕 | 無家庭選擇器 | B26-5 |
| 年度總覽 | 被移除 | B26-6 |

---

## 待處理

| 項目 | 狀態 |
|---|---|
| B27 偏好設定系統 | 暫緩 |
| B28 page-engine 統一佈局 | 記錄 |
| _headers | ✅ 確認不需 |
| SW 改 stale | ✅ 確認不需 |
| 清理 deprecated 檔（v104） | 記錄 |

---

## 下一步

| 項目 | 狀態 |
|---|---|
| B26 部署測試 | ⏳ 進行中 |
| B26-7 docs 收尾 | 🔄 進行中 |
| B27 偏好設定 | 📋 暫緩 |

---

/* ═══════════════════════════════════════════
   END OF FILE
   File: docs/progress.md
   Version: v103.0.32
   Batch: B26-7
   ═══════════════════════════════════════════ */