// ============================================
// app-pages-loader.js — 路由頁面註冊
// ============================================

import { registerPage } from './app-core.js';

import { mount as mountDashboard } from './pages/dashboard.js';
import { mount as mountInputCenter } from './pages/input-center.js';
import { mount as mountCodeList } from './pages/code-list.js';
import { mount as mountInsurance } from './pages/insurance.js';
import { mount as mountPortfolio } from './pages/portfolio.js';
import { mount as mountSettlements } from './pages/settlements.js';
import { mount as mountFinance } from './pages/finance.js';
import { mount as mountAnnualReport } from './pages/annual-report.js';
import { mount as mountMemberReport } from './pages/member-report.js';
import { mount as mountSettings } from './pages/settings.js';
import { mount as mountAdmin } from './pages/admin.js';

registerPage('/dashboard', mountDashboard);
registerPage('/input-center', mountInputCenter);
registerPage('/code-list', mountCodeList);
registerPage('/insurance', mountInsurance);
registerPage('/portfolio', mountPortfolio);
registerPage('/settlements', mountSettlements);
registerPage('/finance', mountFinance);
registerPage('/annual-report', mountAnnualReport);
registerPage('/member-report', mountMemberReport);
registerPage('/settings', mountSettings);
registerPage('/admin', mountAdmin);

/* ═══ EOF ═══
F: js/app-pages-loader.js
V: 1792800200
W: webapp-20261023-001#47
═══ */