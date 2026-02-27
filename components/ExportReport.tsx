
import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import * as XLSX from 'xlsx';
import { formatThaiDate } from '../utils';
import { buildDailyPDF, buildCoverPDF, buildCashBookPDF, openBlob } from './exportReportBuilders';

// ─────────────────────────────────────────────
// Font CDN
// ─────────────────────────────────────────────
const FONT_CDN = {
    regular: 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNew.ttf',
    bold: 'https://cdn.jsdelivr.net/gh/watchawin156/font@main/THSarabunNewBold.ttf',
};

const FS = 16; // global font size

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const THAI_MONTHS_FULL = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const toBE = (y: number) => y + 543;
const fmtMoney = (n: number) =>
    n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toDateShort = (s: string) => {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear() + 543).slice(-2)}`;
};

const REPORT_LIST = [
    { id: 'daily', icon: 'summarize', label: '1. รายงานเงินคงเหลือประจำวัน', desc: 'แสดงยอดเงินคงเหลือทุกกองทุน ณ วันที่เลือก' },
    { id: 'cover', icon: 'book_2', label: '2. หน้าปกสมุดเงินสด', desc: 'รายการเปิดบัญชีต้นปีงบประมาณ (Debit / Credit)' },
    { id: 'cashbook', icon: 'menu_book', label: '3. สมุดเงินสด', desc: 'บัญชีรายรับ–รายจ่าย แยกรายเดือน' },
];

// ─────────────────────────────────────────────
// PDF Builders
// ─────────────────────────────────────────────
const ExportReport: React.FC = () => {
    const { transactions, schoolSettings } = useSchoolData();
    const [selected, setSelected] = useState<string[]>([]);
    const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');

    const toggle = (id: string) =>
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    // ── computed data ─────────────────────────
    const getBalance = (fundTypes: string[], upTo: string) =>
        transactions.filter(t => fundTypes.includes(t.fundType) && t.date <= upTo)
            .reduce((a, t) => a + (t.income || 0) - (t.expense || 0), 0);

    const dailyData = useMemo(() => {
        const d = reportDate;
        const tax = getBalance(['fund-tax'], d);
        const eef = getBalance(['fund-eef'], d);
        const lunch = getBalance(['fund-lunch'], d);
        const lunchInt = getBalance(['fund-state-lunch-interest'], d);
        const subsidy = getBalance(['fund-subsidy', 'fund-subsidy-utility'], d);
        const book = getBalance(['fund-15y-book'], d);
        const supply = getBalance(['fund-15y-supply'], d);
        const uniform = getBalance(['fund-15y-uniform'], d);
        const activity = getBalance(['fund-15y-activity'], d);
        const poor = getBalance(['fund-poor'], d);
        const subInt = getBalance(['fund-state-subsidy-interest'], d);
        const income = getBalance(['fund-school-income'], d);
        const rows = [
            { item: 'เงินสดในมือ (ภาษีหัก ณ ที่จ่าย 1%)', amount: tax },
            { item: 'เช็ค', note: 'ฉบับ', amount: null },
            { item: 'ธนาณัติ', note: 'ฉบับ', amount: null },
            { item: 'สมุดคู่ฝาก 4 เล่ม', amount: null },
            { item: '1. บช.เงิน กสศ.', amount: eef, indent: 1 },
            { item: '2. บช.เงินอาหารกลางวัน', amount: lunch + lunchInt, indent: 1 },
            { item: '3. บช.เงินอุดหนุนอื่น', amount: subsidy + book + supply + uniform + activity + poor + subInt, indent: 1 },
            { item: '4. บช.เงินรายได้สถานศึกษา', amount: income, indent: 1 },
        ];
        const total = rows.filter(r => !r.note && r.amount != null).reduce((a, r) => a + (r.amount ?? 0), 0);
        return { rows, total };
    }, [reportDate, transactions]);

    const FUND_ROWS = [
        { label: 'เงินสด (ภาษีหัก ณ ที่จ่าย)', debitKey: 'cash_tax', creditKey: '' },
        { label: 'เงินฝากธนาคาร', debitKey: '', creditKey: '' },
        { label: '   - เงินอุดหนุนรายหัว', debitKey: 'fund-subsidy', creditKey: '' },
        { label: '   - เงินเรียนฟรี 15 ปี – หนังสือเรียน', debitKey: 'fund-15y-book', creditKey: '' },
        { label: '   - เงินเรียนฟรี 15 ปี – อุปกรณ์การเรียน', debitKey: 'fund-15y-supply', creditKey: '' },
        { label: '   - เงินเรียนฟรี 15 ปี – เครื่องแบบนักเรียน', debitKey: 'fund-15y-uniform', creditKey: '' },
        { label: '   - เงินเรียนฟรี 15 ปี – กิจกรรมพัฒนาคุณภาพผู้เรียน', debitKey: 'fund-15y-activity', creditKey: '' },
        { label: '   - เงินปัจจัยพื้นฐานนักเรียนยากจน', debitKey: 'fund-poor', creditKey: '' },
        { label: '   - เงินอาหารกลางวัน', debitKey: 'fund-lunch', creditKey: '' },
        { label: '   - เงิน กสศ.', debitKey: 'fund-eef', creditKey: '' },
        { label: '   - เงินรายได้สถานศึกษา', debitKey: 'fund-school-income', creditKey: 'fund-school-income' },
        { label: 'เงินอุดหนุนรายหัว', debitKey: '', creditKey: 'fund-subsidy' },
        { label: 'เงินเรียนฟรี 15 ปี – หนังสือเรียน', debitKey: '', creditKey: 'fund-15y-book' },
        { label: 'เงินเรียนฟรี 15 ปี – อุปกรณ์การเรียน', debitKey: '', creditKey: 'fund-15y-supply' },
        { label: 'เงินเรียนฟรี 15 ปี – เครื่องแบบนักเรียน', debitKey: '', creditKey: 'fund-15y-uniform' },
        { label: 'เงินเรียนฟรี 15 ปี – กิจกรรมพัฒนาคุณภาพผู้เรียน', debitKey: '', creditKey: 'fund-15y-activity' },
        { label: 'เงินปัจจัยพื้นฐานนักเรียนยากจน', debitKey: '', creditKey: 'fund-poor' },
        { label: 'เงิน กสศ.', debitKey: '', creditKey: 'fund-eef' },
        { label: 'เงินอาหารกลางวัน', debitKey: '', creditKey: 'fund-lunch' },
        { label: 'เงินภาษี 1 %', debitKey: '', creditKey: 'fund-tax' },
        { label: 'เงินรายได้แผ่นดิน', debitKey: '', creditKey: 'fund-state' },
    ];

    const coverData = useMemo(() => {
        const today = new Date();
        const fyBE = toBE(today.getMonth() + 1 >= 10 ? today.getFullYear() + 1 : today.getFullYear());
        const fyStart = `${fyBE - 543 - 1}-10-01`;
        const balances: Record<string, number> = {};
        transactions.filter(t => t.date < fyStart).forEach(t => {
            const k = t.fundType;
            balances[k] = (balances[k] || 0) + (t.income || 0) - (t.expense || 0);
        });
        const rows = FUND_ROWS.map(r => ({
            label: r.label,
            debit: r.debitKey ? (balances[r.debitKey] ?? 0) : null,
            credit: r.creditKey ? (balances[r.creditKey] ?? 0) : null,
        }));
        const totalDebit = rows.reduce((s, r) => s + (r.debit ?? 0), 0);
        const totalCredit = rows.reduce((s, r) => s + (r.credit ?? 0), 0);
        const fyStartDateStr = `1 ตุลาคม ${toBE(parseInt(fyStart.slice(0, 4)))}`;
        return { fyBE, fyStartDateStr, rows, totalDebit, totalCredit };
    }, [transactions]);

    const cashBookData = useMemo(() => {
        const [yrStr, monStr] = selectedMonth.split('-');
        const year = parseInt(yrStr), mon = parseInt(monStr);
        const fyBE = toBE(mon >= 10 ? year + 1 : year);
        const fyStart = `${fyBE - 544}-10-01`;
        const mStart = `${selectedMonth}-01`;
        const lastDay = new Date(year, mon, 0).getDate();
        const mEnd = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
        const isRev = (ft: string) => ft.startsWith('fund-state-');

        const prevCash = transactions.filter(t => t.date >= fyStart && t.date < mStart)
            .reduce((a, t) => a + (t.income || 0) - (t.expense || 0), 0);

        const curTxs = transactions.filter(t => t.date >= mStart && t.date <= mEnd)
            .sort((a, b) => a.date.localeCompare(b.date));

        const receipts: any[] = [], payments: any[] = [];
        curTxs.forEach(t => {
            const ds = toDateShort(t.date); const rv = isRev(t.fundType);
            if ((t.income || 0) > 0) receipts.push({ dateStr: ds, docNo: t.docNo || '', desc: t.description || '', cash: t.income, budget: 0, revenue: rv ? t.income : 0, nonBudget: !rv ? t.income : 0 });
            if ((t.expense || 0) > 0) payments.push({ dateStr: ds, docNo: t.docNo || '', desc: t.description || '', cash: t.expense, budget: 0, revenue: rv ? t.expense : 0, nonBudget: !rv ? t.expense : 0 });
        });

        const sumArr = (arr: any[]) => arr.reduce((a, r) => ({ cash: a.cash + r.cash, budget: a.budget + r.budget, revenue: a.revenue + r.revenue, nonBudget: a.nonBudget + r.nonBudget }), { cash: 0, budget: 0, revenue: 0, nonBudget: 0 });
        const totalRec = sumArr(receipts), totalPay = sumArr(payments);
        const yodYokPai = prevCash + totalRec.cash - totalPay.cash;
        const allTxs = transactions.filter(t => t.date >= fyStart && t.date <= mEnd);
        const accRec = sumArr(allTxs.filter(t => (t.income || 0) > 0).map(t => { const rv = isRev(t.fundType); return { cash: t.income, budget: 0, revenue: rv ? t.income : 0, nonBudget: !rv ? t.income : 0 }; }));
        const accPay = sumArr(allTxs.filter(t => (t.expense || 0) > 0).map(t => { const rv = isRev(t.fundType); return { cash: t.expense, budget: 0, revenue: rv ? t.expense : 0, nonBudget: !rv ? t.expense : 0 }; }));

        const fyStartYear = mon >= 10 ? year : year - 1;
        let bookNo = (year - fyStartYear) * 12 + mon - 10 + 1;
        if (bookNo < 1) bookNo = 1;

        return { fyBE, receipts, payments, prevCash, yodYokPai, totalRec, totalPay, accRec, accPay, bookNo };
    }, [selectedMonth, transactions]);

    // ── Export single PDF ────────────────────
    const handleExportSingle = async (id: string) => {
        setLoading(true);
        setProgress(`กำลังสร้าง PDF...`);
        try {
            if (id === 'daily') {
                const bytes = await buildDailyPDF(reportDate, schoolSettings.schoolNameTH,
                    schoolSettings.financeOfficerName, dailyData.rows as any, dailyData.total);
                openBlob(bytes);
            } else if (id === 'cover') {
                const { fyBE, fyStartDateStr, rows, totalDebit, totalCredit } = coverData;
                const bytes = await buildCoverPDF(fyBE, fyStartDateStr, rows, totalDebit, totalCredit,
                    schoolSettings.financeOfficerName, schoolSettings.directorName);
                openBlob(bytes);
            } else if (id === 'cashbook') {
                const { fyBE, receipts, payments, prevCash, yodYokPai, totalRec, totalPay, accRec, accPay, bookNo } = cashBookData;

                // Pack monthly sum into a single dailyData representation
                const [yrStr, monStr] = selectedMonth.split('-');
                const mon = parseInt(monStr);
                const monthName = THAI_MONTHS_FULL[mon - 1];

                const dailyData = [{
                    dateStr: `เดือน ${monthName}`,
                    receipts,
                    payments,
                    prevCash,
                    yodYokPai,
                    totalRec,
                    totalPay,
                    accRec,
                    accPay
                }];

                const bytes = await buildCashBookPDF(
                    bookNo, fyBE, dailyData,
                    schoolSettings.financeOfficerName, schoolSettings.auditorName, schoolSettings.directorName
                );
                openBlob(bytes);
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + String(err));
        } finally {
            setLoading(false); setProgress('');
        }
    };

    // ── Export selected PDFs (all in sequence) ──
    const handleExportSelected = async () => {
        if (selected.length === 0) return;
        setLoading(true);
        try {
            for (const id of selected) {
                setProgress(`กำลังสร้าง PDF: ${REPORT_LIST.find(r => r.id === id)?.label}...`);
                await handleExportSingle(id);
                await new Promise(r => setTimeout(r, 800));
            }
        } finally {
            setLoading(false); setProgress('');
        }
    };

    // ── Excel export (all data) ──
    const handleExcel = () => {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Daily
        const dailySheet = XLSX.utils.aoa_to_sheet([
            [`รายงานเงินคงเหลือประจำวัน ${formatThaiDate(reportDate)}`],
            ['รายการ', 'จำนวนเงิน'],
            ...dailyData.rows.map(r => [r.item, r.amount ?? '']),
            [],
            ['รวม', dailyData.total],
        ]);
        XLSX.utils.book_append_sheet(wb, dailySheet, 'รายงานเงินคงเหลือ');

        // Sheet 2: Cover
        const coverSheet = XLSX.utils.aoa_to_sheet([
            [`ปีงบประมาณ ${coverData.fyBE}`],
            ['รายการ', 'เดบิต', 'เครดิต'],
            ...coverData.rows.map(r => [r.label, r.debit ?? '', r.credit ?? '']),
            [],
            ['รวมทั้งสิ้น', coverData.totalDebit, coverData.totalCredit],
        ]);
        XLSX.utils.book_append_sheet(wb, coverSheet, 'หน้าปกสมุดเงินสด');

        // Sheet 3: CashBook Receipts
        const recSheet = XLSX.utils.aoa_to_sheet([
            [`สมุดเงินสด ${cashBookData.bookNo} ปีงบ ${cashBookData.fyBE} - รายรับ`],
            ['วันที่', 'ที่เอกสาร', 'รายการ', 'เงินสด', 'งบประมาณ', 'รายได้แผ่นดิน', 'นอกงบประมาณ'],
            ...cashBookData.receipts.map(r => [r.dateStr, r.docNo, r.desc, r.cash, r.budget, r.revenue, r.nonBudget]),
            [],
            ['รวมรับ', '', '', cashBookData.totalRec.cash, cashBookData.totalRec.budget, cashBookData.totalRec.revenue, cashBookData.totalRec.nonBudget],
        ]);
        XLSX.utils.book_append_sheet(wb, recSheet, 'สมุดเงินสด-รับ');

        // Sheet 4: CashBook Payments
        const paySheet = XLSX.utils.aoa_to_sheet([
            [`สมุดเงินสด ${cashBookData.bookNo} ปีงบ ${cashBookData.fyBE} - รายจ่าย`],
            ['วันที่', 'ที่เอกสาร', 'รายการ', 'เงินสด', 'งบประมาณ', 'รายได้แผ่นดิน', 'นอกงบประมาณ'],
            ...cashBookData.payments.map(r => [r.dateStr, r.docNo, r.desc, r.cash, r.budget, r.revenue, r.nonBudget]),
            [],
            ['รวมจ่าย', '', '', cashBookData.totalPay.cash, cashBookData.totalPay.budget, cashBookData.totalPay.revenue, cashBookData.totalPay.nonBudget],
        ]);
        XLSX.utils.book_append_sheet(wb, paySheet, 'สมุดเงินสด-จ่าย');

        XLSX.writeFile(wb, `รายงานการเงินโรงเรียน_ปีงบ${cashBookData.fyBE}.xlsx`);
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark p-4 md:p-6 flex flex-col gap-5">
            {/* Header */}
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">file_export</span>
                            ส่งออกรายงาน (Export Report)
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            เลือกรายงานที่ต้องการ แล้วกด PDF หรือ Excel เพื่อส่งออก
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={handleExportSelected} disabled={selected.length === 0 || loading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium shadow-sm transition-colors">
                            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                            ส่งออก PDF ({selected.length})
                        </button>
                        <button onClick={handleExcel} disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium shadow-sm transition-colors">
                            <span className="material-symbols-outlined text-base">table_view</span>
                            ส่งออก Excel (ทั้งหมด)
                        </button>
                    </div>
                </div>
                {progress && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {progress}
                    </div>
                )}
            </div>

            {/* Date / Month Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        <span className="material-symbols-outlined text-base align-middle mr-1 text-blue-500">event</span>
                        วันที่รายงานเงินคงเหลือ
                    </label>
                    <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                </div>
                <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        <span className="material-symbols-outlined text-base align-middle mr-1 text-blue-500">calendar_month</span>
                        เดือนสมุดเงินสด
                    </label>
                    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
                </div>
            </div>

            {/* Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {REPORT_LIST.map(r => {
                    const isChecked = selected.includes(r.id);
                    return (
                        <div key={r.id}
                            className={`bg-white dark:bg-surface-dark rounded-xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-md
                ${isChecked ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-100 dark:border-gray-700'}`}
                            onClick={() => toggle(r.id)}
                        >
                            <div className="p-5 flex flex-col gap-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isChecked ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                            <span className={`material-symbols-outlined text-xl ${isChecked ? 'text-blue-600' : 'text-slate-500'}`}>{r.icon}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-slate-800 dark:text-white">{r.label}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.desc}</p>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                    ${isChecked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}>
                                        {isChecked && <span className="material-symbols-outlined text-white" style={{ fontSize: 13 }}>check</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={e => { e.stopPropagation(); handleExportSingle(r.id); }}
                                    disabled={loading}
                                    className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors mt-1"
                                >
                                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                                    เปิด PDF
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="font-bold text-slate-700 dark:text-white mb-3 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-lg">analytics</span>
                    สรุปข้อมูลปัจจุบัน
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'ยอดเงินคงเหลือรวม', value: fmtMoney(dailyData.total), icon: 'account_balance_wallet', color: 'text-green-600' },
                        { label: 'รายการรับเดือนนี้', value: `${cashBookData.receipts.length} รายการ`, icon: 'trending_up', color: 'text-blue-600' },
                        { label: 'รายการจ่ายเดือนนี้', value: `${cashBookData.payments.length} รายการ`, icon: 'trending_down', color: 'text-red-600' },
                        { label: 'สมุดเงินสดเล่มที่', value: `${cashBookData.bookNo}`, icon: 'menu_book', color: 'text-purple-600' },
                    ].map((s, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                            <span className={`material-symbols-outlined text-2xl mb-1 ${s.color}`}>{s.icon}</span>
                            <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ExportReport;
