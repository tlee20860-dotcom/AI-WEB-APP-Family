// ============================================
// code-list.js — 編號對照清單（V2 重構版）
// 位置：pages/code-list.js
// 說明：整合所有基礎實體的編號與名稱，方便對照與搜尋。
// ============================================

import {
  getMembersOnce, getBanksOnce, getBankAccountsOnce,
  getCategoriesOnce, getItemsOnce, getPaymentMethodsOnce,
  getInsuranceCompaniesOnce, getInsurancePoliciesOnce, getFundsOnce
} from '../db/index.js';
import { renderTable } from '../ui/table.js';
import { showToast } from '../ui/toast.js';
import { esc } from '../ui/format.js';

export default {
  _allRows: [],

  async render() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h1 style="font-size:24px; font-weight:700; color:var(--primary);">編號對照清單</h1>
      </div>

      <div class="glass-card" style="padding:16px; margin-bottom:20px;">
        <div style="display:grid; grid-template-columns:100px 1fr; gap:12px; align-items:center; max-width:400px;">
          <label style="font-size:13px; color:var(--text-secondary); text-align:right;">篩選類型：</label>
          <select class="input" id="code-filter-type" style="width:100%; padding:8px;">
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
      </div>

      <div id="code-list-container">
        <div style="text-align:center; padding:40px; color:var(--text-muted);">載入資料中…</div>
      </div>
    `;

    // 綁定篩選事件
    document.getElementById('code-filter-type')?.addEventListener('change', (e) => {
      this._renderList(e.target.value);
    });

    await this._loadData();
  },

  async _loadData() {
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

      // 預設排序：依編號
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
      document.getElementById('code-list-container').innerHTML = '<div style="color:var(--accent-danger); text-align:center; padding:20px;">載入失敗</div>';
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

    renderTable({
      container,
      rows: displayData,
      columnsKey: 'codeList',
      emptyText: '尚無資料'
    });
  },

  destroy() {}
};

/* ═══ EOF ═══
F: pages/code-list.js
V: 1792900560
W: ai-system-20261024-012#51
═══ EOF ═══ */