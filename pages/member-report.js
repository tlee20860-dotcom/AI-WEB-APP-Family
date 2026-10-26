// ============================================
// member-report.js — 成員收支明細
// 位置：pages/member-report.js
// 說明：顯示各成員的收支與保險平攤狀況。
//       已完全套用 renderPageLayout 解決排版問題。
// ============================================

import { AppState } from '../config/state.js';
import { api } from '../domain/api-client.js';
import { getMembersOnce } from '../db/index.js';
import { renderTable, renderCards } from '../ui/table.js';
import { renderViewToggle, renderYearMonth } from '../ui/controls.js';
import { renderPageLayout } from '../ui/layout.js';
import { showToast } from '../ui/toast.js';
import { formatHKD, esc } from '../ui/format.js';
import { RESERVED_IDS } from '../config/constants.js';

export default {
  _data: [],
  _unsubYM: null,

  async render() {
    // 1. 準備控制列 HTML
    const controlsHtml = `
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <div id="mr-view-toggle"></div>
      </div>
      <div id="mr-controls-period"></div>
    `;

    // 2. 呼叫統一引擎繪製骨架
    renderPageLayout({
      title: '成員收支明細',
      stats: [], 
      controls: controlsHtml,
      listContainerId: 'mr-list-container'
    });

    // 3. 綁定控制列事件
    this._unsubYM = AppState.on('ym-change', () => this._loadData());

    renderYearMonth('mr-controls-period', { includeAllMonth: true }, () => {
      this._loadData();
    });

    renderViewToggle('mr-view-toggle', () => {
      this._renderListAndStats();
    });

    // 4. 載入資料
    await this._loadData();
  },

  async _loadData() {
    const listRoot = document.getElementById('mr-list-container');
    if (!listRoot) return;

    listRoot.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">載入資料中…</div>';

    const { year, month } = AppState.getYearMonth();

    try {
      // 取得當月（或全年）的 summary
      const s = await api.summary(year, month);
      
      // 取得成員列表
      const members = await getMembersOnce();

      // 處理每位成員的資料
      const rows = members.map(m => {
        const mData = s.perMember[m.id] || { sum: 0, items: [] };
        
        // 計算該成員的保險平攤與一般支出
        let insurance = 0;
        let expense = 0;
        mData.items.forEach(item => {
          if (item.isAutoLinked) insurance += item.amount;
          else expense += item.amount;
        });

        // 取得該成員的收入與個人收入
        const income = Number(s.incomeBreakdown?.[m.id]) || 0;
        const personalIncome = Number(s.personalIncomeBreakdown?.[m.id]) || 0;
        
        const net = income + personalIncome - expense - insurance;

        return {
          id: m.id,
          name: m.name,
          income,
          personalIncome,
          expense,
          insurance,
          net
        };
      });

      // 加入「家庭共用」 (如果有支出)
      const sharedData = s.perMember[RESERVED_IDS.SHARED_MEMBER] || { sum: 0, items: [] };
      let sharedIns = 0, sharedExp = 0;
      sharedData.items.forEach(item => {
        if (item.isAutoLinked) sharedIns += item.amount;
        else sharedExp += item.amount;
      });
      
      if (sharedExp > 0 || sharedIns > 0) {
        rows.push({
          id: RESERVED_IDS.SHARED_MEMBER,
          name: '🏠 家庭共用',
          income: 0,
          personalIncome: 0,
          expense: sharedExp,
          insurance: sharedIns,
          net: -(sharedExp + sharedIns)
        });
      }

      this._data = rows;
      this._renderListAndStats();

    } catch (err) {
      console.error('[member-report] 載入失敗：', err);
      showToast('載入成員報表失敗', 'error');
      listRoot.innerHTML = '<div style="color:var(--accent-danger); padding:20px; text-align:center;">載入失敗</div>';
    }
  },

  _renderListAndStats() {
    const listRoot = document.getElementById('mr-list-container');
    const statsRoot = document.getElementById('page-stats-container');
    if (!listRoot || !this._data) return;

    const currentView = AppState.getCurrentView() || 'table';
    const rows = this._data;

    // 更新統計卡 (防破版樣式)
    if (statsRoot) {
      statsRoot.style.display = 'grid';
      
      const tIncome = rows.reduce((sum, r) => sum + r.income, 0);
      const tPersonal = rows.reduce((sum, r) => sum + r.personalIncome, 0);
      const tExpense = rows.reduce((sum, r) => sum + r.expense, 0);
      const tIns = rows.reduce((sum, r) => sum + r.insurance, 0);

      statsRoot.innerHTML = [
        { title: '家庭收入', val: tIncome, color: 'var(--accent-success)', icon: 'trending-up', hint: '家用轉入' },
        { title: '個人收入', val: tPersonal, color: 'var(--primary)', icon: 'wallet', hint: '成員個人' },
        { title: '一般支出', val: tExpense, color: 'var(--accent-danger)', icon: 'trending-down', hint: '包含家庭共用' },
        { title: '保險平攤', val: tIns, color: 'var(--accent-warm)', icon: 'shield', hint: '自動扣款' },
        { title: '淨結餘', val: tIncome + tPersonal - tExpense - tIns, color: (tIncome + tPersonal - tExpense - tIns) >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', icon: 'calculator', hint: '收入 - 支出' }
      ].map(card => `
        <div class="glass-card" style="padding:16px; display:flex; flex-direction:column; gap:6px; min-width:0; overflow:hidden;">
          <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
            <i data-lucide="${card.icon}" style="width:14px;height:14px; flex-shrink:0;"></i> 
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${card.title}</span>
          </div>
          <div class="mono" style="font-size:20px; font-weight:700; color:${card.color}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${formatHKD(card.val)}
          </div>
          <div style="font-size:11px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(card.hint)}</div>
        </div>
      `).join('');
      
      // 如果有 5 張卡片，在手機版上可能 2x3 或 1x5，在桌面版上預設 grid 會自動排。這裡不強制改 grid-template。
      if (window.lucide) window.lucide.createIcons();
    }

    if (rows.length === 0) {
      listRoot.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">尚無資料</div>';
      return;
    }

    if (currentView === 'card') {
      renderCards({ container: listRoot, rows, columnsKey: 'memberReport', emptyText: '尚無資料' });
    } else {
      renderTable({ container: listRoot, rows, columnsKey: 'memberReport', emptyText: '尚無資料' });
    }
  },

  destroy() {
    if (this._unsubYM) { try { this._unsubYM(); } catch (e) {} this._unsubYM = null; }
  }
};

/* ═══ EOF ═══
F: pages/member-report.js
V: 1792901910
W: webapp-20261025-001#39
═══ */