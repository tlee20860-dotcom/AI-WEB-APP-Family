// ============================================
// code-list.js — 編號對照清單
// 位置：pages/code-list.js
// 說明：整合所有基礎實體的編號與名稱，方便對照與搜尋。
// ============================================

import {
  getMembersOnce, getBanksOnce, getBankAccountsOnce,
  getCategoriesOnce, getItemsOnce, getPaymentMethodsOnce,
  getInsuranceCompaniesOnce, getInsurancePoliciesOnce, getFundsOnce
} from '../db/index.js';
import { renderTable, renderCards } from '../ui/table.js';
import { renderViewToggle } from '../ui/controls.js';
import { renderPageLayout } from '../ui/layout.js';
import { AppState } from '../config/state.js';
import { showToast } from '../ui/toast.js';
import { esc } from '../ui/format.js';

export default {
  _allRows: [],

  async render() {
    // 1. 準備控制列 HTML
    const controlsHtml = `
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <div id="code-view-toggle"></div>
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <label style="font-size:13px; color:var(--text-secondary); white-space:nowrap;">篩選類型：</label>
        <select class="input" id="code-filter-type" style="padding:8px; min-width:120px;">
          <option value="all">全部</option>
          <option value="member">成員</option>
          <option value="bank">銀行</option>
          <option value="bankAccount">銀行帳號</option>
          <option value="category">支出類別</option>
          <option value="item">支出項目</option>
          <option value="payment">支付方式</option>
          <option value="company">保險公司</option>
          <option value="policy">保單</option>
          <option value="fund">基金</option>
        </select>
      </div>
    `;

    // 2. 呼叫統一引擎繪製骨架
    renderPageLayout({
      title: '編號對照清單',
      stats: [], 
      controls: controlsHtml,
      listContainerId: 'code-list-container'
    });

    // 3. 綁定事件
    renderViewToggle('code-view-toggle', () => {
      const filterType = document.getElementById('code-filter-type').value;
      this._renderList(filterType);
    });

    document.getElementById('code-filter-type')?.addEventListener('change', (e) => {
      this._renderList(e.target.value);
    });

    // 4. 載入資料
    await this._loadData();
  },

  async _loadData() {
    const listRoot = document.getElementById('code-list-container');
    if (!listRoot) return;

    listRoot.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">載入資料中…</div>';

    try {
      const [
        members, banks, bankAccounts, categories, items, 
        payments, companies, policies, funds
      ] = await Promise.all([
        getMembersOnce(), getBanksOnce(), getBankAccountsOnce(),
        getCategoriesOnce(), getItemsOnce(), getPaymentMethodsOnce(),
        getInsuranceCompaniesOnce(), getInsurancePoliciesOnce(), getFundsOnce()
      ]);

      this._allRows = [];

      const _pushRows = (dataList, entityType, entityLabel) => {
        (dataList || []).forEach(item => {
          this._allRows.push({
            entityType,
            entityLabel,
            id: item.id,
            code: item.code || '',
            name: item.name || '（未命名）'
          });
        });
      };

      _pushRows(members, 'member', '成員');
      _pushRows(banks, 'bank', '銀行');
      _pushRows(bankAccounts, 'bankAccount', '銀行帳號');
      _pushRows(categories, 'category', '支出類別');
      _pushRows(items, 'item', '支出項目');
      _pushRows(payments, 'payment', '支付方式');
      _pushRows(companies, 'company', '保險公司');
      _pushRows(policies, 'policy', '保單');
      _pushRows(funds, 'fund', '基金');

      this._allRows.sort((a, b) => {
        if (a.code && b.code) return a.code.localeCompare(b.code);
        if (a.code) return -1;
        if (b.code) return 1;
        return a.name.localeCompare(b.name, 'zh-HK');
      });

      this._renderList('all');

    } catch (err) {
      console.error('[code-list] 載入失敗：', err);
      showToast('載入編號清單失敗', 'error');
      listRoot.innerHTML = '<div style="color:var(--accent-danger); text-align:center; padding:20px;">載入失敗</div>';
    }
  },

  _renderList(filterType = 'all') {
    const container = document.getElementById('code-list-container');
    if (!container) return;

    let displayData = this._allRows;
    if (filterType !== 'all') {
      displayData = displayData.filter(r => r.entityType === filterType);
    }

    if (displayData.length === 0) {
      container.innerHTML = '<div class="glass-card" style="text-align:center; padding:40px; color:var(--text-muted);">無符合條件的資料</div>';
      return;
    }

    const currentView = AppState.getCurrentView() || 'table';

    if (currentView === 'card') {
      renderCards({ container, rows: displayData, columnsKey: 'codeList', emptyText: '尚無資料' });
    } else {
      renderTable({ container, rows: displayData, columnsKey: 'codeList', emptyText: '尚無資料' });
    }
  },

  destroy() {}
};

/* ═══ EOF ═══
F: pages/code-list.js
V: 1792901050
W: ai-system-20261024-012#7
═══ EOF ═══ */