// ============================================
// annual-report.js — 年度報表
// 位置：pages/annual-report.js
// 說明：顯示全年總合與月度明細，支援匯出 CSV。
// ============================================

import { AppState } from '../config/state.js';
import { api } from '../domain/api-client.js';
import { getYearList } from '../config/app-config.js';
import { renderPageLayout } from '../ui/layout.js';
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
      <div class="flex items-center gap-8">
        <select class="input" id="report-year" style="padding:6px 28px 6px 10px;">
          ${years.map(y => `<option value="${y}" ${String(y) === currentYear ? 'selected' : ''}>${y} 年</option>`).join('')}
        </select>
      </div>
      <div class="flex gap-4" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:4px;">
        <button type="button" class="btn" data-view="monthly" style="padding:6px 12px; border:none; border-radius:var(--radius-sm); transition:all 0.2s;">月度明細</button>
        <button type="button" class="btn" data-view="summary" style="padding:6px 12px; border:none; border-radius:var(--radius-sm); transition:all 0.2s;">全年總合</button>
      </div>
    `;

    // 3. 呼叫統一引擎繪製骨架
    renderPageLayout({
      title: '年度報表',
      headerActions,
      stats: [], // 年報表不需要額外統計卡
      controls: controlsHtml,
      listContainerId: 'report-table-container'
    });

    // 4. 初始化 UI 狀態
    this._updateViewButtons();
    
    // 5. 綁定事件
    document.getElementById('report-year')?.addEventListener('change', (e) => {
      AppState.setYearMonth(e.target.value, AppState.month);
      this._loadData(Number(e.target.value));
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
      this._renderTable();

    } catch (err) {
      console.error('[annual-report] 載入失敗：', err);
      showToast('載入報表失敗', 'error');
      tableRoot.innerHTML = '<div style="color:var(--accent-danger); padding:20px; text-align:center;">載入失敗</div>';
    }
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

      container.innerHTML = `
        <div class="glass-card" style="padding:0; overflow:hidden;">
          <div class="data-table-scroll-wrapper" style="overflow-x:auto; -webkit-overflow-scrolling:touch;">
            <table class="data-table" style="width:100%; border-collapse:collapse; min-width:500px;">
              <thead>
                <tr>
                  <th style="white-space:nowrap;">月份</th>
                  <th class="num" style="white-space:nowrap;">總收入</th>
                  <th class="num" style="white-space:nowrap;">總支出</th>
                  <th class="num" style="white-space:nowrap;">淨餘額</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(r => `
                  <tr>
                    <td style="white-space:nowrap;">${esc(r.month)}</td>
                    <td class="num text-emerald mono" style="white-space:nowrap;">${formatHKD(r.totalIncome)}</td>
                    <td class="num text-red mono" style="white-space:nowrap;">${formatHKD(r.totalExpense)}</td>
                    <td class="num mono ${r.netBalance >= 0 ? 'text-emerald' : 'text-red'}" style="white-space:nowrap;">${formatHKD(r.netBalance)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="glass-card" style="padding:0; overflow:hidden;">
          <div class="data-table-scroll-wrapper" style="overflow-x:auto; -webkit-overflow-scrolling:touch;">
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
                  <td class="num text-magenta mono" style="white-space:nowrap;">${formatHKD(this._data.yearlyInsuranceTotal)}</td>
                  <td class="num mono" style="white-space:nowrap;">${formatHKD(this._data.bankBalance)}</td>
                  <td class="num mono" style="white-space:nowrap;">${formatHKD(this._data.fundValue)}</td>
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
  }
};

/* ═══ EOF ═══
F: pages/annual-report.js
V: 1792901010
W: ai-system-20261024-012#3
═══ EOF ═══ */