
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import FundView from './components/FundView';
import SchoolSettings from './components/SchoolSettings';
import Revenue from './components/Revenue';
import Expenditure from './components/Expenditure';
import Loan from './components/Loan';
import Login from './components/Login';
import DailyReport from './components/DailyReport';
import AuditLog from './components/AuditLog';
import CashBookReport from './components/CashBookReport';
import ExportReport from './components/ExportReport';
import SystemSettings from './components/SystemSettings';
import SchoolProjects from './components/SchoolProjects';
import CashBookDetailModal from './components/cashbook/CashBookDetailModal';
import { SchoolProvider } from './context/SchoolContext';

const getCurrentFiscalYear = () => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  // Thai fiscal year: Oct-Sep, so Oct+ = next year in BE
  return (month >= 10 ? year + 1 : year) + 543;
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(getCurrentFiscalYear());
  const [viewedTxId, setViewedTxId] = useState<number | string | null>(null);

  const handleLogin = (role: string) => {
    setUserRole(role);
    setIsLoggedIn(true);
  };

  const getFundTitle = (page: string) => {
    switch (page) {
      case 'fund-subsidy': return 'เงินอุดหนุนรายหัว';
      case 'fund-15y-book': return 'เงินเรียนฟรี 15 ปี - หนังสือเรียน';
      case 'fund-15y-supply': return 'เงินเรียนฟรี 15 ปี - อุปกรณ์การเรียน';
      case 'fund-15y-uniform': return 'เงินเรียนฟรี 15 ปี - เครื่องแบบนักเรียน';
      case 'fund-15y-activity': return 'เงินเรียนฟรี 15 ปี - กิจกรรมพัฒนาคุณภาพผู้เรียน';
      case 'fund-poor': return 'เงินปัจจัยพื้นฐานนักเรียนยากจน';
      case 'fund-state': return 'เงินรายได้แผ่นดิน';
      case 'fund-lunch': return 'เงินอาหารกลางวัน';
      case 'fund-eef': return 'เงิน กสศ.';
      case 'fund-school-income': return 'เงินรายได้สถานศึกษา';
      case 'cash_tax': return 'เงินสด (ภาษีหัก ณ ที่จ่าย)';
      case 'fund-tax': return 'เงินภาษี 1%';
      case 'fund-safekeeping': return 'บันทึกรับเงินเพื่อเก็บรักษา';
      default: return 'บัญชีงบประมาณ';
    }
  };

  const renderContent = () => {
    if (activePage.startsWith('fund-')) {
      return <FundView key={activePage} title={getFundTitle(activePage)} pageId={activePage} />;
    }

    switch (activePage) {
      case 'settings-general':
        return <SchoolSettings />;
      case 'revenue':
        return <Revenue />;
      case 'report-daily':
        return <DailyReport />;
      case 'report-cash-book':
      case 'report-cash-book-print':
        return <CashBookReport selectedFiscalYear={selectedFiscalYear} />;
      case 'audit-log':
        return <AuditLog onNavigate={handleNavigate} />;
      case 'school-projects':
        return <SchoolProjects />;
      case 'report-fiscal-year':
        return <ExportReport />;
      case 'settings':
        return <SystemSettings />;
      case 'dashboard':
      default:
        // Pass user role to dashboard to conditionally render actions
        return <Dashboard onNavigate={handleNavigate} userRole={userRole} />;
    }
  };

  const handleNavigate = (page: string) => {
    setActivePage(page);
    setIsSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  const renderMainContent = () => {
    if (activePage === 'revenue') return <Revenue />;
    if (activePage === 'expenditure') return <Expenditure />;
    if (activePage === 'loan') return <Loan />;
    return renderContent();
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <SchoolProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark relative">
        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          userRole={userRole}
          isSidebarOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          selectedFiscalYear={selectedFiscalYear}
          onFiscalYearChange={setSelectedFiscalYear}
        />
        <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          <Header
            onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            onSearchItemClick={(id) => setViewedTxId(id)}
          />
          {renderMainContent()}
          {viewedTxId !== null && (
            <CashBookDetailModal
              isOpen={viewedTxId !== null}
              onClose={() => setViewedTxId(null)}
              txId={viewedTxId}
            />
          )}
        </main>
      </div>
    </SchoolProvider>
  );
};

export default App;
