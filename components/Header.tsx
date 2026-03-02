
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSchoolData } from '../context/SchoolContext';

interface HeaderProps {
  onMenuToggle?: () => void;
  onSearchItemClick?: (txId: number) => void;
}

const fmtMoney = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const Header: React.FC<HeaderProps> = ({ onMenuToggle, onSearchItemClick }) => {
  const { transactions } = useSchoolData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase().trim();

    // ลองแปลงวันที่ไทย dd/mm/yyyy(BE) → ISO เพื่อค้นหา
    let searchDateISO: string | null = null;
    const dateMatch = term.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      const yearBE = parseInt(dateMatch[3], 10);
      const yearCE = yearBE - 543;
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        searchDateISO = `${yearCE}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // ลองแปลงเป็นตัวเลขเพื่อค้นหาจำนวนเงิน
    const searchAmount = parseFloat(term.replace(/,/g, ''));
    const isNumericSearch = !isNaN(searchAmount) && searchAmount > 0;

    return transactions.filter((t: any) => {
      // ค้นหาด้วยวันที่
      if (searchDateISO && t.date === searchDateISO) return true;
      // ค้นหาด้วยจำนวนเงิน
      if (isNumericSearch) {
        if (t.income === searchAmount || t.expense === searchAmount) return true;
        // match แบบ partial เช่น 369 จะเจอ 3695
        const incStr = (t.income || 0).toString();
        const expStr = (t.expense || 0).toString();
        if (incStr.includes(term) || expStr.includes(term)) return true;
      }
      // ค้นหาปกติ (ข้อความ)
      return (
        (t.docNo && t.docNo.toLowerCase().includes(term)) ||
        (t.description && t.description.toLowerCase().includes(term)) ||
        (t.payer && t.payer.toLowerCase().includes(term)) ||
        (t.payee && t.payee.toLowerCase().includes(term))
      );
    }).slice(0, 10);
  }, [searchTerm, transactions]);

  return (
    <header className="h-16 bg-surface dark:bg-surface-dark border-b border-border-light dark:border-border-dark flex items-center justify-between px-6 sticky top-0 z-[60] shrink-0 shadow-sm/50 transition-colors">
      <div className="flex items-center gap-4 md:hidden">
        <button onClick={onMenuToggle} className="p-2 -ml-2 text-text-muted dark:text-text-muted-dark hover:text-primary transition-colors">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="font-bold text-lg text-primary">Smart School</span>
      </div>

      <div className="hidden md:block">
        <h1 className="text-lg font-bold text-text dark:text-text-dark">ระบบบริหารจัดการการเงิน</h1>
        <p className="text-xs text-text-muted dark:text-text-muted-dark">โรงเรียนตัวอย่างวิทยา • ปีงบประมาณ 2567</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64 hidden md:block z-[60]" ref={searchRef}>
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted dark:text-text-muted-dark">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setIsSearchOpen(true); }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full bg-background-light dark:bg-background-dark text-text dark:text-text-dark border border-transparent focus:border-primary/30 rounded-full py-1.5 pl-9 pr-4 focus:ring-2 focus:ring-primary/20 text-sm placeholder-text-muted dark:placeholder-text-muted-dark outline-none transition-all"
            placeholder="ค้นหารายการ, ใบเสร็จ..."
          />
          {/* Search Dropdown */}
          {isSearchOpen && searchTerm && (
            <div className="absolute top-10 right-0 w-80 max-h-96 overflow-y-auto bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-[60]">
              <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500">
                  ผลการค้นหา {searchResults.length} {searchResults.length === 10 ? ' (แสดงสูงสุด 10 รายการ)' : 'รายการ'}
                </span>
                <button onClick={() => { setSearchTerm(''); setIsSearchOpen(false); }} className="text-xs text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">ไม่พบรายการที่ตรงกับ "{searchTerm}"</div>
                ) : (
                  searchResults.map((t: any) => (
                    <div key={t.id} onClick={() => {
                      if (onSearchItemClick) onSearchItemClick(t.id);
                      setIsSearchOpen(false);
                    }} className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors text-left group">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-200 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t.description}</span>
                        <span className={`text-sm font-bold whitespace-nowrap ml-2 ${t.income ? 'text-green-600' : 'text-red-600'}`}>
                          {t.income ? '+' : '-'}{fmtMoney(t.income || t.expense)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                        <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">{t.docNo || 'ไม่มีเลขที่'}</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          {fmtShort(t.date)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-l border-border-light dark:border-border-dark pl-4 ml-2">
          <button className="relative p-2 rounded-full hover:bg-background-light dark:hover:bg-white/5 text-text-muted dark:text-text-muted-dark hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border-2 border-white dark:border-surface-dark"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
