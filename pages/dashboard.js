// ============================================
// dashboard.js — 總覽儀表板
// 位置：pages/dashboard.js
// 說明：顯示年度統計與前後 2 年的總覽表格。
//       已完全套用 renderPageLayout 解決排版問題。
// ============================================

import { AppState } from '../config/state.js';
import { api } from '../domain/api-client.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc } from '../ui/format.js';
import { renderTable } from '../ui/table.js';
import { renderPageLayout } from '../ui/layout.js';

export default {
  _unsubYM: null,

  async render() {
    // 1. 準備 Header Actions
    const headerActions = `
      <a href="#/annual-report" class="btn btn-primary" style="display:inline-flex; align-items:center; gap:6px; text-decoration:none;">
        <i data-lucide="bar-chart-3" style="width:16px;height:16px;"></i> 查看年度報表
      </a>
    `;

    // 2. 呼叫統一引擎繪製骨架 (先傳入空 stats，載入後再更新)
    renderPageLayout({
      title: '總覽儀表板',
      headerActions,
      stats: [],
      listTitle: '年度總覽（前後 2 年）',
      listContainerId: 'dashboard-annual-table'
    });

    this._unsubYM = AppState.on('ym-change', () => {
      this._loadData();
    });

    await this._loadData();
  },

  async _loadData() {
    const { year } = AppState.getYearMonth();
    const statsRoot = document.getElementById('page-stats-container');
    const tableRoot = document.getElementById('dashboard-annual-table');
    
    if (!statsRoot || !tableRoot) return;

    tableRoot.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">載入年度資料…</div>';

    try {
      const y = Number(year);
      const annualRes = await api.fetchAnnualSummaryRange(y - 2, y + 2);
      
      const currentYearData = (annualRes.years || []).find(d => d.year === y) || {
        totalIncome: 0, totalExpense: 0, netBalance: 0, bankBalance: 0, fundValue: 0, monthly: []
      };

      const monthCount = (currentYearData.monthly || []).filter(m => m.totalExpense > 0).length;

      // 更新統計卡 (使用統一引擎結構)
      this._updateStats(statsRoot, currentYearData, year, monthCount);

      // 渲染表格
      if (annualRes && annualRes.years) {
        const tableRows = annualRes.years.map(yData => ({
          year: yData.year,
          totalIncome: yData.totalIncome,
          totalExpense: yData.totalExpense,
          insurance: yData.yearlyInsuranceTotal || 0,
          net: yData.netBalance,
          isCurrent: yData.year === y
        }));

        renderTable({
          container: 'dashboard-annual-table',
          rows: tableRows,
          columnsKey: 'dashboardAnnual',
          emptyText: '無年度資料'
        });
      } else {
        tableRoot.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">無年度資料</div>';
      }

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('[dashboard] 載入失敗：', err);
      showToast('載入總覽資料失敗', 'error');
      statsRoot.innerHTML = '<div style="color:var(--accent-danger); padding:20px; grid-column:1/-1; text-align:center;">載入失敗</div>';
      tableRoot.innerHTML = '';
    }
  },

  _updateStats(statsRoot, data, year, monthCount) {
    statsRoot.style.display = 'grid';
    // 由於 layout.js 已經設定了 grid，這裡只需塞入子元素
    const totalAssets = (data.bankBalance || 0) + (data.fundValue || 0);

    statsRoot.innerHTML = [
      { 
        title: '家庭總餘額', 
        val: totalAssets, 
        color: totalAssets >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', 
        icon: 'landmark', 
        hint: `共 1 個銀行帳號` // 假設性提示
      },
      { 
        title: `${year} 家庭收入`, 
        val: data.totalIncome || 0, 
        color: 'var(--accent-success)', 
        icon: 'trending-up', 
        hint: '家用轉入 + 額外收入' 
      },
      { 
        title: `${year} 年度總支出`, 
        val: data.totalExpense || 0, 
        color: 'var(--accent-danger)', 
        icon: 'trending-down', 
        hint: `${monthCount} 個月有紀錄` 
      },
      { 
        title: `${year} 年度淨餘額`, 
        val: data.netBalance || 0, 
        color: (data.netBalance || 0) >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', 
        icon: 'wallet', 
        hint: (data.netBalance || 0) >= 0 ? '收支平衡' : '支出大於收入' 
      }
    ].map(card => `
      <div class="glass-card" style="padding:16px; display:flex; flex-direction:column; gap:6px; min-width:0; overflow:hidden;">
        <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
          <i data-lucide="${card.icon}" style="width:14px;height:14px; flex-shrink:0;"></i> 
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${card.title}</span>
        </div>
        <div class="mono" style="font-size:20px; font-weight:700; color:${card.color}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${formatHKD(card.val)}
        </div>
        <div style="font-size:11px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${esc(card.hint)}
        </div>
      </div>
    `).join('');
  },

  destroy() {
    if (this._unsubYM) {
      try { this._unsubYM(); } catch (e) { /* noop */ }
      this._unsubYM = null;
    }
  }
};

/* ═══ EOF ═══
F: pages/dashboard.js
V: 1792901890
W: webapp-20261025-001#37
═══ */