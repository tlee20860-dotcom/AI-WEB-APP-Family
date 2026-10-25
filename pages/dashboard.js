// ============================================
// dashboard.js — 總覽儀表板（V2 重構版）
// 位置：pages/dashboard.js
// 說明：顯示家庭總餘額、年度收支與歷年總覽。
// ============================================

import { AppState } from '../config/state.js';
import { api } from '../domain/api-client.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc } from '../ui/format.js';
import { renderTable } from '../ui/table.js';

export default {
  _unsubYM: null,

  async render() {
    const content = document.getElementById('app-content');
    if (!content) return;

    // 1. 渲染基礎骨架 (無年月切換控制列)
    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h1 style="font-size:24px; font-weight:700; color:var(--primary);">總覽儀表板</h1>
        <a href="#/annual-report" class="btn btn-primary" style="display:inline-flex; align-items:center; gap:6px; text-decoration:none;">
          <i data-lucide="bar-chart-3" style="width:16px;height:16px;"></i> 查看年度報表
        </a>
      </div>

      <div id="dashboard-stats" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:16px; margin-bottom:24px;"></div>
      
      <div class="table-container" style="margin-bottom:24px;">
        <div style="padding:16px; border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:8px;">
          <i data-lucide="calendar" style="width:18px;height:18px;color:var(--primary);"></i>
          <span style="font-weight:700; font-size:15px;">年度總覽（前後 2 年）</span>
        </div>
        <div id="dashboard-annual-table" style="padding:16px;"></div>
      </div>
    `;

    // 3. 綁定 State 監聽 (若其他頁面切換年月，這裡也要連動)
    this._unsubYM = AppState.on('ym-change', () => {
      this._loadData();
    });

    // 4. 載入資料
    await this._loadData();
  },

  async _loadData() {
    const { year, month } = AppState.getYearMonth();
    const statsRoot = document.getElementById('dashboard-stats');
    const tableRoot = document.getElementById('dashboard-annual-table');
    
    if (!statsRoot || !tableRoot) return;

    statsRoot.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); grid-column:span 2;">載入統計資料…</div>';
    tableRoot.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">載入年度資料…</div>';

    try {
      const y = Number(year);
      const [summaryRes, annualRes] = await Promise.all([
        api.summary(year, month === 'all' ? '12' : month),
        api.fetchAnnualSummaryRange(y - 2, y + 2)
      ]);

      // 渲染統計卡 (套用舊版風格)
      const s = summaryRes;
      const statsHtml = [
        { title: '家庭總餘額', val: s.bankBalance + s.fundValue, color: (s.bankBalance + s.fundValue) >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', icon: 'landmark', hint: `共 ${s.bankCount || 1} 個銀行帳號` },
        { title: `${year} 家庭收入`, val: s.totalIncome, color: 'var(--accent-success)', icon: 'trending-up', hint: '家用轉入 + 額外收入' },
        { title: `${year} 年度總支出`, val: s.totalExpense, color: 'var(--accent-danger)', icon: 'trending-down', hint: `${s.monthCount || 0} 個月有紀錄` },
        { title: `${year} 年度淨餘額`, val: s.netBalance, color: s.netBalance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', icon: 'wallet', hint: s.netBalance >= 0 ? '收支平衡' : '支出大於收入' }
      ].map(card => `
        <div class="glass-card" style="padding:20px; display:flex; flex-direction:column; gap:8px;">
          <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
            <i data-lucide="${card.icon}" style="width:14px;height:14px;"></i> ${esc(card.title)}
          </div>
          <div class="mono" style="font-size:24px; font-weight:700; color:${card.color};">${formatHKD(card.val)}</div>
          <div style="font-size:11px; color:var(--text-muted);">${esc(card.hint)}</div>
        </div>
      `).join('');
      statsRoot.innerHTML = statsHtml;

      // 渲染年度表格
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
        tableRoot.innerHTML = '<div style="color:var(--text-muted);">無年度資料</div>';
      }

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('[dashboard] 載入失敗：', err);
      showToast('載入總覽資料失敗', 'error');
      statsRoot.innerHTML = '<div style="color:var(--accent-danger); padding:20px; grid-column:span 2;">載入失敗</div>';
      tableRoot.innerHTML = '';
    }
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
V: 1792900760
W: ai-system-20261024-012#67
═══ EOF ═══ */