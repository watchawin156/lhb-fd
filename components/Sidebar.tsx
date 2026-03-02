
import React, { useState } from 'react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  userRole: string;
  isSidebarOpen?: boolean;
  onClose?: () => void;
  selectedFiscalYear?: number;
  onFiscalYearChange?: (year: number) => void;
}

const getCurrentFY = () => {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  return (m >= 10 ? y + 1 : y) + 543;
};

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, userRole, isSidebarOpen, onClose, selectedFiscalYear, onFiscalYearChange }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'fund-15y': true,
    'fund-state': false,
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggle = (key: string) => {
    if (isCollapsed) return; // Disable submenu toggle when collapsed
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handle15YClick = () => {
    if (isCollapsed) {
      onNavigate('fund-15y-book');
    } else {
      setExpanded(prev => ({ ...prev, 'fund-15y': !prev['fund-15y'] }));
    }
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    // Close all submenus when collapsing
    if (!isCollapsed) {
      setExpanded({ 'fund-15y': false, 'fund-state': false });
    }
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 glass border-r border-white/10
        flex flex-col py-6 h-screen shrink-0 transition-all duration-500 ease-in-out overflow-y-auto nav-scroll
        md:translate-x-0 md:static md:z-auto
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        ${isCollapsed ? 'w-20 items-center' : 'w-72'}
      `}>
        {/* Logo */}
        <div className={`px-6 mb-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} shrink-0 w-full`}>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { onNavigate('dashboard'); if (onClose) onClose(); }}>
            <div className="bg-primary aspect-square rounded-lg size-10 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
              <span className="material-symbols-outlined text-2xl">school</span>
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in">
                <h1 className="font-bold text-lg leading-tight text-navy dark:text-white">Smart School</h1>
                <p className="text-xs text-text-muted dark:text-text-muted-dark">Finance System</p>
              </div>
            )}
          </div>
          {/* Close button for mobile */}
          <button onClick={onClose} className="md:hidden p-1 text-text-muted hover:text-red-500">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className={`flex flex-col gap-1 w-full ${isCollapsed ? 'px-2' : 'px-3'} pb-20`}>

          {/* Fiscal Year Selector */}
          {!isCollapsed && onFiscalYearChange && (
            <div className="mx-3 mb-6 mt-2 p-4 glass-card border-none animate-fade-in bg-primary/5 dark:bg-primary/10">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 dark:text-primary/40 block mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">event_note</span>
                ปีงบประมาณ
              </label>
              <div className="flex items-center gap-3">
                <button onClick={() => onFiscalYearChange((selectedFiscalYear || getCurrentFY()) - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm text-primary hover:bg-primary hover:text-white transition-all duration-200 active:scale-90">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <span className="flex-1 text-center text-base font-black text-slate-800 dark:text-white">
                  {selectedFiscalYear || getCurrentFY()}
                </span>
                <button onClick={() => onFiscalYearChange((selectedFiscalYear || getCurrentFY()) + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm text-primary hover:bg-primary hover:text-white transition-all duration-200 active:scale-90">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
          {isCollapsed && onFiscalYearChange && (
            <div className="mx-2 mb-3 mt-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center py-2.5 gap-1" title={`ปีงบประมาณ ${selectedFiscalYear}`}>
              <span className="material-symbols-outlined text-blue-500" style={{ fontSize: '18px' }}>calendar_today</span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{selectedFiscalYear}</span>
            </div>
          )}

          <NavItem
            icon="dashboard"
            label="ภาพรวม"
            isActive={activePage === 'dashboard'}
            onClick={() => onNavigate('dashboard')}
            isCollapsed={isCollapsed}
          />

          <NavItem
            icon="menu_book"
            label="สมุดเงินสด"
            isActive={activePage === 'report-cash-book' || activePage === 'report-cash-book-print'}
            onClick={() => onNavigate('report-cash-book')}
            isCollapsed={isCollapsed}
          />

          {/* (Moved Fiscal Year Selector from here) */}
          {isCollapsed && <div className="h-px bg-border-light dark:bg-border-dark my-2 mx-2"></div>}
          <SidebarGroup title="เงินงบประมาณ" isCollapsed={isCollapsed}>
            <NavItem
              icon="payments"
              label="เงินอุดหนุนรายหัว"
              isActive={activePage === 'fund-subsidy'}
              onClick={() => onNavigate('fund-subsidy')}
              isCollapsed={isCollapsed}
            />
            {isCollapsed ? (
              <NavItem
                icon="local_library"
                label="เงินเรียนฟรี 15 ปี"
                isActive={activePage.startsWith('fund-15y')}
                onClick={handle15YClick}
                isCollapsed={isCollapsed}
              />
            ) : (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <button
                    onClick={handle15YClick}
                    className={`flex-1 group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm cursor-pointer text-left hover:bg-gray-100 dark:hover:bg-white/5 text-text-muted dark:text-text-muted-dark hover:text-primary dark:hover:text-white`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>local_library</span>
                    <span className="flex-1 truncate">เงินเรียนฟรี 15 ปี</span>
                  </button>
                  <button onClick={() => setExpanded(prev => ({ ...prev, 'fund-15y': !prev['fund-15y'] }))} className="p-2 text-text-muted dark:text-text-muted-dark hover:text-primary dark:hover:text-white">
                    <span className={`material-symbols-outlined transition-transform duration-200 text-lg ${expanded['fund-15y'] ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                </div>

                {expanded['fund-15y'] && (
                  <div className="flex flex-col gap-1 pl-4 relative animate-fade-in">
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-border-light dark:bg-border-dark"></div>
                    <SubNavItem label="- หนังสือเรียน" isActive={activePage === 'fund-15y-book'} onClick={() => onNavigate('fund-15y-book')} />
                    <SubNavItem label="- อุปกรณ์การเรียน" isActive={activePage === 'fund-15y-supply'} onClick={() => onNavigate('fund-15y-supply')} />
                    <SubNavItem label="- เครื่องแบบนักเรียน" isActive={activePage === 'fund-15y-uniform'} onClick={() => onNavigate('fund-15y-uniform')} />
                    <SubNavItem label="- กิจกรรมพัฒนาผู้เรียน" isActive={activePage === 'fund-15y-activity'} onClick={() => onNavigate('fund-15y-activity')} />
                  </div>
                )}
              </div>
            )}

            <NavItem
              icon="family_restroom"
              label="เงินปัจจัยพื้นฐาน นร.ยากจน"
              isActive={activePage === 'fund-poor'}
              onClick={() => onNavigate('fund-poor')}
              isCollapsed={isCollapsed}
            />
          </SidebarGroup>

          <SidebarGroup title="เงินรายได้แผ่นดิน" isCollapsed={isCollapsed}>
            <NavItem
              icon="account_balance_wallet"
              label="เงินรายได้แผ่นดิน(ดอกเบี้ย)"
              isActive={activePage === 'fund-state' || activePage.startsWith('fund-state-')}
              onClick={() => onNavigate('fund-state')}
              isCollapsed={isCollapsed}
            />
          </SidebarGroup>

          <SidebarGroup title="เงินนอกงบประมาณ" isCollapsed={isCollapsed}>
            <NavItem
              icon="restaurant"
              label="เงินอาหารกลางวัน"
              isActive={activePage === 'fund-lunch'}
              onClick={() => onNavigate('fund-lunch')}
              isCollapsed={isCollapsed}
            />
            <NavItem
              icon="volunteer_activism"
              label="เงิน กสศ."
              isActive={activePage === 'fund-eef'}
              onClick={() => onNavigate('fund-eef')}
              isCollapsed={isCollapsed}
            />
            <NavItem
              icon="storefront"
              label="เงินรายได้สถานศึกษา"
              isActive={activePage === 'fund-school-income'}
              onClick={() => onNavigate('fund-school-income')}
              isCollapsed={isCollapsed}
            />

            <NavItem
              icon="receipt_long"
              label="เงินภาษี 1%"
              isActive={activePage === 'fund-tax'}
              onClick={() => onNavigate('fund-tax')}
              isCollapsed={isCollapsed}
            />
            <NavItem
              icon="savings"
              label="บันทึกการรับเงินเพื่อเก็บรักษา"
              isActive={activePage === 'fund-safekeeping'}
              onClick={() => onNavigate('fund-safekeeping')}
              isCollapsed={isCollapsed}
            />
          </SidebarGroup>

          {/* Settings & Other */}
          {!isCollapsed && <div className="text-xs font-semibold text-text-muted dark:text-text-muted-dark px-3 mb-2 mt-6 uppercase tracking-wider animate-fade-in">อื่นๆ</div>}
          {isCollapsed && <div className="h-px bg-border-light dark:bg-border-dark my-2 mx-2"></div>}

          <NavItem
            icon="format_list_numbered"
            label="ทะเบียนคุมเลขที่เอกสาร"
            isActive={activePage === 'doc-registry'}
            onClick={() => onNavigate('doc-registry')}
            isCollapsed={isCollapsed}
          />

          <NavItem
            icon="history"
            label="ประวัติการแก้ไข (Audit Log)"
            isActive={activePage === 'audit-log'}
            onClick={() => onNavigate('audit-log')}
            isCollapsed={isCollapsed}
          />

          <NavItem
            icon="assignment"
            label="โครงการโรงเรียน"
            isActive={activePage === 'school-projects'}
            onClick={() => onNavigate('school-projects')}
            isCollapsed={isCollapsed}
          />

          <NavItem
            icon="school"
            label="ข้อมูลโรงเรียน"
            isActive={activePage === 'settings-general'}
            onClick={() => onNavigate('settings-general')}
            isCollapsed={isCollapsed}
          />

          <NavItem
            icon="settings"
            label="ตั้งค่าระบบ"
            isActive={activePage === 'settings'}
            onClick={() => onNavigate('settings')}
            isCollapsed={isCollapsed}
          />
        </nav>

        {/* Collapse Toggle Button */}
        <div className="hidden md:flex justify-center w-full px-3 mt-auto pt-3 border-t border-border-light dark:border-border-dark bg-surface dark:bg-surface-dark sticky bottom-0">
          <button
            onClick={toggleSidebar}
            title={isCollapsed ? 'ขยาย sidebar' : 'ย่อ sidebar'}
            className={`p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-white/5 text-text-muted hover:text-blue-600 dark:text-text-muted-dark transition-all duration-200 flex items-center gap-2 ${isCollapsed ? 'w-auto justify-center' : 'w-full justify-between px-3'
              }`}
          >
            {!isCollapsed && <span className="text-xs font-medium text-gray-400">ย่อเมนู</span>}
            <span className={`material-symbols-outlined transition-transform duration-300 text-[20px] ${isCollapsed ? 'rotate-180' : ''}`}>
              keyboard_double_arrow_left
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

interface NavItemProps {
  icon: string;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  isCollapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick, isCollapsed }) => {
  const baseClasses = `group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 font-bold text-sm cursor-pointer w-full text-left relative overflow-hidden ${isCollapsed ? 'justify-center' : ''}`;
  const activeClasses = "bg-primary text-white shadow-lg shadow-primary/30 active:scale-[0.98]";
  const inactiveClasses = "text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white hover:bg-primary/5 dark:hover:bg-white/5 active:scale-[0.98]";

  return (
    <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`} title={isCollapsed ? label : ''}>
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-r-full"></span>
      )}
      <span className={`material-symbols-outlined ${isActive ? 'filled' : ''} shrink-0 text-[22px]`}>
        {icon}
      </span>
      {!isCollapsed && <span className="truncate tracking-tight">{label}</span>}
    </button>
  );
};

interface SidebarGroupProps {
  title: string;
  isCollapsed?: boolean;
  children: React.ReactNode;
}

const SidebarGroup: React.FC<SidebarGroupProps> = ({ title, isCollapsed, children }) => {
  if (isCollapsed) return <>{children}</>;
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-text-muted dark:text-text-muted-dark px-3 mb-2 uppercase tracking-wider animate-fade-in">
        {title}
      </div>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
};

interface NavGroupProps {
  icon: string;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const NavGroup: React.FC<NavGroupProps> = ({ icon, label, isOpen, onToggle, children }) => {
  return (
    <div className="flex flex-col gap-0.5">
      <button onClick={onToggle} className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-200 font-medium text-sm cursor-pointer w-full text-left text-text-muted dark:text-text-muted-dark hover:text-primary dark:hover:text-white">
        <span className="material-symbols-outlined shrink-0" style={{ fontSize: '20px' }}>
          {icon}
        </span>
        <span className="flex-1 truncate">{label}</span>
        <span className={`material-symbols-outlined transition-transform duration-200 text-lg ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {isOpen && (
        <div className="flex flex-col gap-1 pl-4 relative animate-fade-in">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border-light dark:bg-border-dark"></div>
          {children}
        </div>
      )}
    </div>
  );
};

interface SubNavItemProps {
  label: string;
  isActive?: boolean;
  onClick: () => void;
}

const SubNavItem: React.FC<SubNavItemProps> = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`relative pl-8 pr-3 py-2 rounded-lg text-xs font-medium text-left transition-colors w-full truncate
        ${isActive ? 'text-primary bg-blue-50 dark:bg-primary/10 dark:text-primary-400' : 'text-text-muted dark:text-text-muted-dark hover:text-text dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'}
      `}
    >
      {label}
    </button>
  );
};

export default Sidebar;
