// ============================================
// annual-report.js — 年度報表（V2 重構版）
// 位置：pages/annual-report.js
// 說明：顯示全年總合與月度明細，支援匯出 CSV。
// ============================================

import { AppState } from '../config/state.js';
import { api } from '../domain/api-client.js';
import { getYearList } from '../config/app-config.js';
import { renderTable } from '../ui/table.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc } from '../ui/format.js';

export default {
  _data: null,
  _view: 'monthly', // monthly | summary

  async render() {
    const content = document.getElementById('app-content');
    if (!content) return;

    const { year } = AppState.getYearMonth();
    const years = getYearList();

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h1 style="font-size:24px; font-weight:700; color:var(--primary);">年度報表</h1>
        <button type="button" class="btn btn-primary" id="btn-export-csv">
          <i data-lucide="file-spreadsheet" style="width:16px;height:16px;"></i> 匯出 CSV
        </button>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div class="flex items-center gap-8">
          <select class="input" id="report-year" style="padding:6px 28px 6px 10px;">
            ${years.map(y => `<option value="${y}" ${String(y) === year ? 'selected' : ''}>${y} 年</option>`).join('')}
          </select>
        </div>
        <div class="flex gap-4" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:4px;">
          <button type="button" class="btn" data-view="monthly" style="padding:6px 12px; border:none; background:var(--primary); color:#fff; border-radius:var(--radius-sm);">月度明細</button>
          <button type="button" class="btn" data-view="summary" style="padding:6px 12px; border:none; background:transparent; color:var(--text-secondary); border-radius:var(--radius-sm);">全年總合</button>
        </div>
      </div>

      <div id="report-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;"></div>
      
      <div id="report-table-container"></div>
    `;

    // 綁定年份切換
    document.getElementById('report-year')?.addEventListener('change', (e) => {
      AppState.setYearMonth(e.target.value, AppState.month);
      this._loadData(Number(e.target.value));
    });

    // 綁定檢視切換
    document.querySelectorAll('button[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const v = e.target.dataset.view;
        if (this._view === v) return;
        this._view = v;
        
        document.querySelectorAll('button[data-view]').forEach(b => {
          b.style.background = b.dataset.view === v ? 'var(--primary)' : 'transparent';
          b.style.color = b.dataset.view === v ? '#fff' : 'var(--text-secondary)';
        });
        this._renderTable();
      });
    });

    // 綁定匯出
    document.getElementById('btn-export-csv')?.addEventListener('click', () => this._exportCsv());

    await this._loadData(Number(year));
  },

  async _loadData(year) {
    const statsRoot = document.getElementById('report-stats');
    const tableRoot = document.getElementById('report-table-container');
    if (!statsRoot || !tableRoot) return;

    statsRoot.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">載入資料中…</div>';
    tableRoot.innerHTML = '';

    try {
      const res = await api.fetchAnnualSummaryRange(year, year);
      if (!res || !res.years || res.years.length === 0) {
        throw new Error('查無資料');
      }

      this._data = res.years[0];

      // 渲染統計卡
      const d = this._data;
      statsRoot.innerHTML = `
        <div class="glass-card" style="padding:16px;">
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">${year} 年度總收入</div>
          <div class="mono" style="font-size:20px; font-weight:700; color:var(--accent-success);">${formatHKD(d.totalIncome)}</div>
        </div>
        <div class="glass-card" style="padding:16px;">
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">${year} 年度總支出</div>
          <div class="mono" style="font-size:20px; font-weight:700; color:var(--accent-danger);">${formatHKD(d.totalExpense)}</div>
        </div>
        <div class="glass-card" style="padding:16px;">
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">${year} 年度淨餘額</div>
          <div class="mono" style="font-size:20px; font-weight:700; color:${d.netBalance >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'};">${formatHKD(d.netBalance)}</div>
        </div>
      `;

      this._renderTable();

    } catch (err) {
      console.error('[annual-report] 載入失敗：', err);
      showToast('載入報表失敗', 'error');
      statsRoot.innerHTML = '<div style="color:var(--accent-danger); padding:20px;">載入失敗</div>';
    }
  },

  _renderTable() {
    const container = document.getElementById('report-table-container');
    if (!container || !this._data) return;

    const monthlyData = this._data.monthly || [];
    
    if (this._view === 'monthly') {
      // 月度明細表
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

      // 借用 codeList 的欄位來客製化（或直接手寫 HTML）
      container.innerHTML = `
        <div class="glass-card" style="padding:0; overflow:hidden;">
          <table class="data-table" style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th>月份</th>
                <th class="num">總收入</th>
                <th class="num">總支出</th>
                <th class="num">淨餘額</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td>${esc(r.month)}</td>
                  <td class="num text-emerald mono">${formatHKD(r.totalIncome)}</td>
                  <td class="num text-red mono">${formatHKD(r.totalExpense)}</td>
                  <td class="num mono ${r.netBalance >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(r.netBalance)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      // 全年總合表 (只有一列)
      container.innerHTML = `
        <div class="glass-card" style="padding:0; overflow:hidden;">
          <table class="data-table" style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th>年度</th>
                <th class="num">總收入</th>
                <th class="num">總支出</th>
                <th class="num">保險平攤</th>
                <th class="num">銀行餘額</th>
                <th class="num">基金現值</th>
                <th class="num">淨餘額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${this._data.year} 年</td>
                <td class="num text-emerald mono">${formatHKD(this._data.totalIncome)}</td>
                <td class="num text-red mono">${formatHKD(this._data.totalExpense)}</td>
                <td class="num text-magenta mono">${formatHKD(this._data.yearlyInsuranceTotal)}</td>
                <td class="num mono">${formatHKD(this._data.bankBalance)}</td>
                <td class="num mono">${formatHKD(this._data.fundValue)}</td>
                <td class="num mono ${this._data.netBalance >= 0 ? 'text-emerald' : 'text-red'}">${formatHKD(this._data.netBalance)}</td>
              </tr>
            </tbody>
          </table>
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

    const csv = '\uFEFF' + lines.join('\n'); // 加入 BOM 防止 Excel 亂碼
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
V: 1792900570
W: ai-system-20261024-012#52
═══ EOF ═══ */