// ============================================
// annual-report.js — 年度報表
// 位置：pages/annual-report.js
// 說明：顯示全年總合與月度明細，支援匯出 CSV。
//       使用 renderPageLayout 統一排版，並將月度明細改為引擎渲染。
// ============================================

import { AppState } from '../config/state.js';
import { api } from '../domain/api-client.js';
import { getYearList } from '../config/app-config.js';
import { renderPageLayout } from '../ui/layout.js';
import { renderTable } from '../ui/table.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc } from '../ui/format.js';

export default {
  _data: null,
  _view: 'monthly', // monthly | summary

  async render() {
    const currentYear = AppState.getYearMonth().year;
    const years = getYearList();

    // 1. 準備 Header Actions
    const headerActions = `
      <button type="button" class="btn btn-primary" id="btn-export-csv">
        <i data-lucide="file-spreadsheet" style="width:16px;height:16px;"></i> 匯出 CSV
      </button>
    `;

    // 2. 準備控制列 HTML
    const controlsHtml = `
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <select class="input" id="report-year" style="padding:6px 28px 6px 10px; width:auto;">
          ${years.map(y => `<option value="${y}" ${String(y) === currentYear ? 'selected' : ''}>${y} 年</option>`).join('')}
        </select>
        <div style="display:flex; gap:4px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:4px;">
          <button type="button" class="btn" data-view="monthly" style="padding:6px 12px; border:none; border-radius:var(--radius-sm); transition:all 0.2s;">月度明細</button>
          <button type="button" class="btn" data-view="summary" style="padding:6px 12px; border:none; border-radius:var(--radius-sm); transition:all 0.2s;">全年總合</button>
        </div>
      </div>
    `;

    // 3. 繪製骨架
    renderPageLayout({
      title: '年度報表',
      headerActions,
      stats: [],
      controls: controlsHtml,
      listContainerId: 'report-table-container'
    });

    // 4. 初始化 UI 狀態
    this._updateViewButtons();
    
    // 5. 綁定事件
    document.getElementById('report-year')?.addEventListener('change', (e) => {
      const y = e.target.value;
      AppState.setYearMonth(y, AppState.month);
      this._loadData(Number(y));
    });

    document.querySelectorAll('button[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const v = e.target.dataset.view;
        if (this._view === v) return;
        this._view = v;
        this._updateViewButtons();
        this._renderTable();
      });
    });

    document.getElementById('btn-export-csv')?.addEventListener('click', () => this._exportCsv());

    // 6. 載入資料
    await this._loadData(Number(currentYear));
  },

  _updateViewButtons() {
    document.querySelectorAll('button[data-view]').forEach(b => {
      const isActive = b.dataset.view === this._view;
      b.style.background = isActive ? 'var(--primary)' : 'transparent';
      b.style.color = isActive ? '#fff' : 'var(--text-secondary)';
      b.style.fontWeight = isActive ? '600' : '500';
    });
  },

  async _loadData(year) {
    const tableRoot = document.getElementById('report-table-container');
    if (!tableRoot) return;

    tableRoot.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">載入資料中…</div>';

    try {
      const res = await api.fetchAnnualSummaryRange(year, year);
      if (!res || !res.years || res.years.length === 0) {
        throw new Error('查無資料');
      }

      this._data = res.years[0];
      this._updateStats();
      this._renderTable();

    } catch (err) {
      console.error('[annual-report] 載入失敗：', err);
      showToast('載入報表失敗', 'error');
      tableRoot.innerHTML = '<div style="color:var(--accent-danger); padding:20px; text-align:center;">載入失敗</div>';
    }
  },

  _updateStats() {
    const statsRoot = document.getElementById('page-stats-container');
    if (!statsRoot || !this._data) return;

    statsRoot.style.display = 'grid';
    const d = this._data;
    const pnlCls = d.netBalance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';

    statsRoot.innerHTML = [
      { title: '年度總收入', val: formatHKD(d.totalIncome), color: 'var(--accent-success)', icon: 'trending-up' },
      { title: '年度總支出', val: formatHKD(d.totalExpense), color: 'var(--accent-danger)', icon: 'trending-down' },
      { title: '年度保險平攤', val: formatHKD(d.yearlyInsuranceTotal || 0), color: 'var(--accent-warm)', icon: 'shield' },
      { title: '年度淨餘額', val: formatHKD(d.netBalance), color: pnlCls, icon: 'wallet' }
    ].map(card => `
      <div class="glass-card" style="padding:16px; display:flex; flex-direction:column; gap:6px; min-width:0; overflow:hidden;">
        <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
          <i data-lucide="${card.icon}" style="width:14px;height:14px; flex-shrink:0;"></i> 
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${card.title}</span>
        </div>
        <div class="mono" style="font-size:20px; font-weight:700; color:${card.color}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${card.val}
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  },

  _renderTable() {
    const container = document.getElementById('report-table-container');
    if (!container || !this._data) return;

    const monthlyData = this._data.monthly || [];
    
    if (this._view === 'monthly') {
      if (monthlyData.length === 0) {
        container.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">尚無月度資料</div>';
        return;
      }

      const rows = monthlyData.map(m => ({
        month: `${m.monthNum} 月`,
        totalIncome: m.totalIncome,
        totalExpense: m.totalExpense,
        netBalance: m.netBalance
      }));

      // 🆕 改用引擎渲染
      renderTable({
        container,
        rows,
        columnsKey: 'annualMonthly',
        emptyText: '尚無月度資料'
      });

    } else {
      // 全年總合（單行統計表，保留手寫結構，因為它是特殊報表而非列表）
      container.innerHTML = `
        <div class="glass-card" style="padding:0; overflow:hidden;">
          <div style="overflow-x:auto;">
            <table class="data-table" style="width:100%; border-collapse:collapse; min-width:700px;">
              <thead>
                <tr>
                  <th style="white-space:nowrap;">年度</th>
                  <th class="num" style="white-space:nowrap;">總收入</th>
                  <th class="num" style="white-space:nowrap;">總支出</th>
                  <th class="num" style="white-space:nowrap;">保險平攤</th>
                  <th class="num" style="white-space:nowrap;">銀行餘額</th>
                  <th class="num" style="white-space:nowrap;">基金現值</th>
                  <th class="num" style="white-space:nowrap;">淨餘額</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="white-space:nowrap;">${this._data.year} 年</td>
                  <td class="num text-emerald mono" style="white-space:nowrap;">${formatHKD(this._data.totalIncome)}</td>
                  <td class="num text-red mono" style="white-space:nowrap;">${formatHKD(this._data.totalExpense)}</td>
                  <td class="num text-magenta mono" style="white-space:nowrap;">${formatHKD(this._data.yearlyInsuranceTotal || 0)}</td>
                  <td class="num mono" style="white-space:nowrap;">${formatHKD(this._data.bankBalance || 0)}</td>
                  <td class="num mono" style="white-space:nowrap;">${formatHKD(this._data.fundValue || 0)}</td>
                  <td class="num mono ${this._data.netBalance >= 0 ? 'text-emerald' : 'text-red'}" style="white-space:nowrap;">${formatHKD(this._data.netBalance)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  },

  _exportCsv() {
    if (!this._data) return;
    const monthlyData = this._data.monthly || [];
    if (monthlyData.length === 0) {
      showToast('無資料可匯出', 'warning');
      return;
    }

    const year = this._data.year;
    const lines = [['月份', '總收入', '總支出', '淨餘額'].join(',')];
    
    monthlyData.forEach(m => {
      lines.push([`${m.monthNum}月`, m.totalIncome, m.totalExpense, m.netBalance].join(','));
    });

    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annual-report-${year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ 已匯出 CSV', 'success');
  },

  destroy() {}
};

/* ═══ EOF ═══
F: pages/annual-report.js
V: 1792901950
W: webapp-20261025-001#43
═══ */