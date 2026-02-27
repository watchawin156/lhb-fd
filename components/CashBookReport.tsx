
import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import { buildCashBookPDF, buildCoverPDF, openBlob } from './exportReportBuilders';
import { generateDailyReportPDF } from './DailyReport';
import CashBookAddModal from './cashbook/CashBookAddModal';
import CashBookCarryForwardModal from './cashbook/CashBookCarryForwardModal';
import CashBookCheckModal from './cashbook/CashBookCheckModal';
import ThaiDatePicker from './ThaiDatePicker';
import { FUND_TYPE_OPTIONS } from '../utils';

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const fmtShort = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = d.getDate();
    const mm = THAI_MONTHS_SHORT[d.getMonth()];
    const yy = d.getFullYear() + 543;
    return `${dd} ${mm} ${yy}`;
};

const fmtMoney = (n: number) =>
    n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toBE = (y: number) => y + 543;

const FUND_ROWS: { label: string; debitKey: string; creditKey: string }[] = [
    { label: 'เงินสด (ภาษีหัก ณ ที่จ่าย)', debitKey: 'cash_tax', creditKey: '' },
    { label: 'เงินฝากธนาคาร', debitKey: '', creditKey: '' },
    { label: '   - เงินอุดหนุนรายหัวและอุดหนุน', debitKey: 'fund-subsidy', creditKey: '' },
    { label: '   - เงินเรียนฟรี 15 ปี – หนังสือเรียน', debitKey: 'fund-15y-book', creditKey: '' },
    { label: '   - เงินเรียนฟรี 15 ปี – อุปกรณ์การเรียน', debitKey: 'fund-15y-supply', creditKey: '' },
    { label: '   - เงินเรียนฟรี 15 ปี – เครื่องแบบนักเรียน', debitKey: 'fund-15y-uniform', creditKey: '' },
    { label: '   - เงินเรียนฟรี 15 ปี – กิจกรรมพัฒนาคุณภาพผู้เรียน', debitKey: 'fund-15y-activity', creditKey: '' },
    { label: '   - เงินปัจจัยพื้นฐานนักเรียนยากจน', debitKey: 'fund-poor', creditKey: '' },
    { label: '   - เงินอาหารกลางวัน', debitKey: 'fund-lunch', creditKey: '' },
    { label: '   - เงิน กสศ.', debitKey: 'fund-eef', creditKey: '' },
    { label: '   - เงินรายได้สถานศึกษา', debitKey: 'fund-school-income', creditKey: 'fund-school-income' },
    { label: 'เงินอุดหนุนรายหัวและอุดหนุน', debitKey: '', creditKey: 'fund-subsidy' },
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

const getFiscalYearStart = (fy: number) => new Date(`${fy - 1}-10-01`);



interface CashBookReportProps {
    selectedFiscalYear?: number;
}

const CashBookReport: React.FC<CashBookReportProps> = ({ selectedFiscalYear }) => {
    const { transactions, addTransaction, editTransaction, deleteTransaction, schoolSettings } = useSchoolData();
    const [loading, setLoading] = useState(false);
    const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
    const [isDailyDatePickerOpen, setIsDailyDatePickerOpen] = useState(false);
    const [dailyReportDate, setDailyReportDate] = useState(new Date().toISOString().slice(0, 10));
    const [dailyPickerTempDate, setDailyPickerTempDate] = useState(new Date().toISOString().slice(0, 10));

    // Bank Account Modal
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

    // Transaction detail/edit/delete
    const [selectedTx, setSelectedTx] = useState<any>(null);
    const [isEditingTx, setIsEditingTx] = useState(false);
    const [editTxData, setEditTxData] = useState({ date: '', docNo: '', description: '', amount: '', fundType: '', payer: '', payee: '' });
    const [showDeletePrompt, setShowDeletePrompt] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');

    // Add transaction modal - multi-item support
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [initialAddType, setInitialAddType] = useState<'income' | 'expense'>('income');
    const [showTaxWarning, setShowTaxWarning] = useState(false);
    const [taxWarningAmount, setTaxWarningAmount] = useState(0);
    const [taxWarningPayeeType, setTaxWarningPayeeType] = useState<'legal' | 'person' | null>(null);

    // Check Modal
    const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);

    // Carry Forward Modal
    const [isCarryForwardOpen, setIsCarryForwardOpen] = useState(false);
    const [carryForwardItems, setCarryForwardItems] = useState<{ fundType: string; label: string; balance: number }[]>([]);
    const [isManualMode, setIsManualMode] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false); // ดูรายการที่ยกครบแล้ว

    // Cash Book fund filter
    const [cashBookFilter, setCashBookFilter] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [pdfDateRange, setPdfDateRange] = useState(''); // e.g. "1/5/2568-9/5/2568"

    const { fyBE, bookNo, dailyData, prevCashStart, yodYokPaiEnd,
        totalRecYear, totalPayYear } = useMemo(() => {
            const fyBE = selectedFiscalYear || (new Date().getFullYear() + 543);
            const fyCE = fyBE - 543;
            const fyStartYear = fyCE - 1;
            const fyStart = `${fyStartYear}-10-01`;
            const fyEnd = `${fyCE}-09-30`;

            const getFundCategory = (ft: string) => {
                const opt = FUND_TYPE_OPTIONS.find(o => o.value === ft);
                return opt ? opt.group : 'เงินนอกงบประมาณ';
            };

            const getAmounts = (amount: number, fundType: string) => {
                const group = getFundCategory(fundType);
                return {
                    cash: amount,
                    budget: group === 'เงินงบประมาณ' ? amount : 0,
                    revenue: group === 'เงินรายได้แผ่นดิน' ? amount : 0,
                    nonBudget: group === 'เงินนอกงบประมาณ' ? amount : 0,
                };
            };

            const sumArr = (arr: any[]) => arr.reduce((a: any, r: any) => ({
                cash: a.cash + r.cash, budget: a.budget + r.budget,
                revenue: a.revenue + r.revenue, nonBudget: a.nonBudget + r.nonBudget,
            }), { cash: 0, budget: 0, revenue: 0, nonBudget: 0 });

            const curTxs = transactions.filter(
                (t: any) => t.date >= fyStart && t.date <= fyEnd
            );

            // คำนวณยอดเงินสะสมจริงจากรายการอดีตทั้งหมด โดยไม่รวมสิ่งที่เคยเขียนว่า 'ยกยอดมา' 
            const truePrevTxs = transactions.filter((t: any) => t.date < fyStart && !t.description?.includes('ยกยอดมา'));
            const prevCash = truePrevTxs.reduce((sum: number, t: any) => sum + (t.income || 0) - (t.expense || 0), 0);

            // === คำนวณยอดยกมาแยกตามหมวดเงิน (จากรายการจริง ไม่ใช่ transactions "ยกยอดมา") ===
            const fundBalanceMap: Record<string, number> = {};
            truePrevTxs.forEach((t: any) => {
                const ft = t.fundType || 'unknown';
                if (!fundBalanceMap[ft]) fundBalanceMap[ft] = 0;
                fundBalanceMap[ft] += (t.income || 0) - (t.expense || 0);
            });
            // สร้างรายการ carry-forward แยกตามหมวดเงิน (เฉพาะที่มียอด != 0)
            const orderPriority = [
                'fund-subsidy',
                'fund-15y-book',
                'fund-15y-supply',
                'fund-15y-uniform',
                'fund-15y-activity',
                'fund-poor',
                'fund-state',
                'fund-lunch',
                'fund-eef',
                'fund-school-income',
                'fund-tax',
                'fund-safekeeping',
            ];
            const carryForwardBreakdown = Object.entries(fundBalanceMap)
                .filter(([, bal]) => Math.abs(bal) > 0.01)
                .map(([ft, bal]) => {
                    const opt = FUND_TYPE_OPTIONS.find(o => o.value === ft);
                    const label = opt?.label?.replace(/^\d+\.?\d*\s*/, '') || ft;
                    const amts = getAmounts(bal, ft);
                    return { fundType: ft, label, balance: bal, ...amts };
                })
                .sort((a, b) => {
                    const ia = orderPriority.indexOf(a.fundType);
                    const ib = orderPriority.indexOf(b.fundType);
                    if (ia !== -1 && ib !== -1) return ia - ib;
                    if (ia !== -1) return -1;
                    if (ib !== -1) return 1;
                    return a.label.localeCompare(b.label);
                });

            let currentPrevCash = prevCash;

            const uniqueDays = Array.from(new Set(curTxs.map((t: any) => t.date))).sort();
            let runAccRec = { cash: 0, budget: 0, revenue: 0, nonBudget: 0 };
            let runAccPay = { cash: 0, budget: 0, revenue: 0, nonBudget: 0 };

            const dailyData: any[] = [];

            if (uniqueDays.length === 0) {
                dailyData.push({
                    date: fyEnd,
                    dateStr: fmtShort(fyEnd),
                    receipts: [], payments: [],
                    prevCash: currentPrevCash, yodYokPai: currentPrevCash,
                    totalRec: sumArr([]), totalPay: sumArr([]),
                    accRec: { ...runAccRec }, accPay: { ...runAccPay }
                });
            } else {
                // ถ้ามียอดยกมา ให้ใส่ carry-forward day เป็นวันแรก (ก่อนวันแรกที่มีรายการ)
                const hasCarryForward = prevCash !== 0 && carryForwardBreakdown.length > 0;
                if (hasCarryForward) {
                    // สร้าง virtual carry-forward day (ใช้วันเริ่มต้นปีงบประมาณ)
                    const cfDate = fyStart;
                    const cfDateStr = fmtShort(cfDate);
                    // สร้าง receipts จาก carryForwardBreakdown (ทั้งบวกและลบ)
                    // บวก = ยกยอดเงิน, ลบ = ยกยอดหนี้/ติดลบ (แสดงเป็น negative amount ใน receipts)
                    const cfReceipts = carryForwardBreakdown
                        .map(item => ({
                            date: cfDate, dateStr: cfDateStr, docNo: '',
                            desc: `ยกยอดมา (${item.label})`,
                            headerTitle: '', ...getAmounts(item.balance, item.fundType),
                        }));
                    const cfPayments: any[] = [];

                    const totalRec = sumArr(cfReceipts);
                    const totalPay = sumArr(cfPayments);
                    const yodYokPai = prevCash + totalRec.cash - totalPay.cash;

                    dailyData.push({
                        date: cfDate, dateStr: cfDateStr,
                        receipts: cfReceipts, payments: cfPayments,
                        prevCash: 0, yodYokPai,
                        totalRec, totalPay,
                        accRec: { ...runAccRec }, accPay: { ...runAccPay },
                        isCarryForwardDay: true,
                        prevYearBE: fyBE - 1,
                        carryForwardBreakdown,
                    });
                    // advance running cash so subsequent days are correct
                    currentPrevCash = yodYokPai;
                }

                uniqueDays.forEach(date => {
                    const txsToday = curTxs.filter((t: any) => t.date === date);
                    // กรอง transactions "ยกยอดมา" ออกจากรายการวันนี้ (เพราะใช้ calculated breakdown แล้ว)
                    const realTxsToday = txsToday.filter((t: any) => !t.description?.includes('ยกยอดมา'));

                    const receipts: any[] = [], payments: any[] = [];
                    realTxsToday.forEach((t: any) => {
                        if ((t.income || 0) > 0) {
                            const amts = getAmounts(t.income, t.fundType);
                            receipts.push({ date: t.date, dateStr: fmtShort(t.date), docNo: t.docNo || '', desc: t.description || '', headerTitle: t.payer || '', ...amts });
                        }
                        if ((t.expense || 0) > 0) {
                            const amts = getAmounts(t.expense, t.fundType);
                            payments.push({ date: t.date, dateStr: fmtShort(t.date), docNo: t.docNo || '', desc: t.description || '', headerTitle: t.payee || '', ...amts });
                        }
                    });

                    const dayRev = sumArr(receipts), dayPay = sumArr(payments);

                    const dayPrevCash = currentPrevCash;
                    const yodYokPai = currentPrevCash + dayRev.cash - dayPay.cash;
                    currentPrevCash = yodYokPai;

                    runAccRec = { cash: runAccRec.cash + dayRev.cash, budget: runAccRec.budget + dayRev.budget, revenue: runAccRec.revenue + dayRev.revenue, nonBudget: runAccRec.nonBudget + dayRev.nonBudget };
                    runAccPay = { cash: runAccPay.cash + dayPay.cash, budget: runAccPay.budget + dayPay.budget, revenue: runAccPay.revenue + dayPay.revenue, nonBudget: runAccPay.nonBudget + dayPay.nonBudget };

                    // ข้ามวันที่ไม่มีรายการจริงเหลือ (เช่น มีแต่ ยกยอดมา ที่กรองออกไปแล้ว)
                    if (receipts.length === 0 && payments.length === 0) return;

                    dailyData.push({
                        date, dateStr: fmtShort(date as string),
                        receipts, payments,
                        prevCash: dayPrevCash, yodYokPai,
                        totalRec: dayRev, totalPay: dayPay,
                        accRec: { ...runAccRec }, accPay: { ...runAccPay },
                        isCarryForwardDay: false,
                        prevYearBE: fyBE - 1,
                    });
                });
            }

            let bookNo = 1; // Assuming 1 for annual view

            const totalRecYear = { cash: dailyData.reduce((s, d) => s + (d.totalRec?.cash || 0), 0) };
            const totalPayYear = { cash: dailyData.reduce((s, d) => s + (d.totalPay?.cash || 0), 0) };

            return { fyBE, bookNo, dailyData, prevCashStart: prevCash, yodYokPaiEnd: currentPrevCash, totalRecYear, totalPayYear };
        }, [selectedFiscalYear, transactions]);

    const handlePDF = async () => {
        setLoading(true);
        try {
            // Helper: parse Thai date string "d/m/yyyy" -> ISO "YYYY-MM-DD"
            const parseThai = (s: string): string | null => {
                const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (!m) return null;
                const be = parseInt(m[3]);
                const yr = be > 2400 ? be - 543 : be;
                return `${yr}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
            };

            let filteredDaily = dailyData;
            if (pdfDateRange.includes('-')) {
                const parts = pdfDateRange.split('-').map(s => s.trim());
                if (parts.length === 2) {
                    const from = parseThai(parts[0]);
                    const to = parseThai(parts[1]);
                    if (from && to) {
                        filteredDaily = dailyData.filter((d: any) => d.date >= from && d.date <= to);
                    }
                }
            }

            const bytes = await buildCashBookPDF(
                bookNo, fyBE,
                filteredDaily,
                schoolSettings?.financeOfficerName || '',
                schoolSettings?.auditorName || '',
                schoolSettings?.directorName || ''
            );
            openBlob(bytes);
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + String(err));
        } finally {
            setLoading(false);
        }
    };

    const handleCoverPDF = async () => {
        const fiscalYear = (selectedFiscalYear || (new Date().getFullYear() + 543)) - 543;
        const focusFyBE = fiscalYear + 543;
        const fyStart = getFiscalYearStart(fiscalYear);
        const fyStartDateStr = `1 ตุลาคม ${toBE(fyStart.getFullYear())}`;

        // คำนวณเฉพาะ Transaction จริง ไม่รวม 'ยกยอดมา' ป้องกันยอดเบิ้ล
        const prevTxs = transactions.filter((t: any) => t.date < fyStart.toISOString().slice(0, 10) && !t.description?.includes('ยกยอดมา'));
        const balances: Record<string, number> = {};
        prevTxs.forEach((t: any) => {
            const key = t.fundType;
            if (!balances[key]) balances[key] = 0;
            balances[key] += (t.income || 0) - (t.expense || 0);
        });

        const rows = FUND_ROWS.map(row => {
            const debit = row.debitKey ? (balances[row.debitKey] ?? 0) : null;
            const credit = row.creditKey ? (balances[row.creditKey] ?? 0) : null;
            return { label: row.label, debit, credit };
        });

        const totalDebit = rows.reduce((s, r) => s + (r.debit ?? 0), 0);
        const totalCredit = rows.reduce((s, r) => s + (r.credit ?? 0), 0);

        setLoading(true);
        try {
            const bytes = await buildCoverPDF(
                focusFyBE,
                fyStartDateStr,
                rows,
                totalDebit,
                totalCredit,
                schoolSettings?.financeOfficerName || '',
                schoolSettings?.directorName || ''
            );
            openBlob(bytes);
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการสร้าง PDF หน้าปก: ' + String(err));
        } finally {
            setLoading(false);
        }
    };

    // ยกยอดคงเหลือจากปีงบประมาณก่อนหน้า
    const prevFyBE = fyBE - 1;

    // ตรวจสอบว่าประเภทไหนยกยอดไปแล้ว
    const carriedFundTypes = useMemo(() => {
        const fyCE = fyBE - 543;
        const fyStartDate = `${fyCE - 1}-10-01`;
        const carried = new Set<string>();
        transactions.forEach(t => {
            if (t.date === fyStartDate && t.description?.includes('ยกยอดมา')) {
                carried.add(t.fundType);
            }
        });
        return carried;
    }, [transactions, fyBE]);

    const handleCarryForward = async () => {
        const fyCE = fyBE - 543;
        const fyStartDate = `${fyCE - 1}-10-01`;
        const fundLabel = (ft: string) => FUND_TYPE_OPTIONS.find(o => o.value === ft)?.label || ft;

        // คำนวณยอดเงินสะสมที่แท้จริงถึงก่อนวันที่ 1 ต.ค. (รวมรายการยกยอดมาในอดีตทั้งหมดโดยไม่นับทับซ้อน)
        const prevTxs = transactions.filter((t: any) => t.date < fyStartDate && !t.description?.includes('ยกยอดมา'));

        const bal: Record<string, number> = {};
        prevTxs.forEach((t: any) => {
            if (!bal[t.fundType]) bal[t.fundType] = 0;
            bal[t.fundType] += (t.income || 0) - (t.expense || 0);
        });

        const orderPriority = [
            'fund-subsidy',
            'fund-subsidy-utility',
            'fund-15y-book',
            'fund-15y-supply',
            'fund-15y-uniform',
            'fund-15y-activity',
            'fund-poor',
            'fund-state',
            'fund-lunch',
            'fund-eef',
            'fund-school-income',
            'fund-tax',
            'fund-safekeeping',
        ];
        const items = Object.entries(bal)
            .filter(([, balance]) => Math.abs(balance) > 0.01)
            .map(([fundType, balance]) => ({
                fundType,
                label: fundLabel(fundType),
                balance
            }))
            .sort((a, b) => {
                const ia = orderPriority.indexOf(a.fundType);
                const ib = orderPriority.indexOf(b.fundType);
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return a.label.localeCompare(b.label);
            });

        setCarryForwardItems(items);
        setIsViewMode(true);
        setIsManualMode(false);
        setIsCarryForwardOpen(true);
    };

    const handleCarryForwardConfirm = () => {
        const fyCE = fyBE - 543;
        const fyStartDate = `${fyCE - 1}-10-01`;
        // กรองเฉพาะประเภทที่ยังไม่ได้ยกยอด และมียอด > 0
        const itemsToCarry = carryForwardItems.filter(item => item.balance > 0 && !carriedFundTypes.has(item.fundType));

        if (itemsToCarry.length === 0) {
            alert('ไม่มีรายการใหม่ให้ยกยอด (ทุกประเภทนำเข้าแล้ว หรือยอด = 0)');
            return;
        }

        itemsToCarry.forEach(({ fundType, balance }, idx) => {
            addTransaction({
                id: Date.now() + idx,
                date: fyStartDate,
                docNo: '-',
                description: `ยกยอดมา (${FUND_TYPE_OPTIONS.find(o => o.value === fundType)?.label || fundType}) จากปี ${prevFyBE}`,
                fundType,
                income: balance,
                expense: 0,
                payer: `ยกยอดจากปีงบ ${prevFyBE}`,
            });
        });

        setIsCarryForwardOpen(false);
        alert(`เพิ่มรายการยกยอดมา ${itemsToCarry.length} รายการ รวมยอด ${fmtMoney(itemsToCarry.reduce((s, i) => s + i.balance, 0))} บาท สำเร็จ`);
    };

    const handleAddManualFund = () => {
        // เพิ่มหมวดเงินใหม่ที่ยังไม่มีในรายการ
        const usedFunds = carryForwardItems.map(i => i.fundType);
        const available = FUND_TYPE_OPTIONS.filter(o => !usedFunds.includes(o.value));
        if (available.length === 0) {
            alert('เพิ่มครบทุกหมวดเงินแล้ว');
            return;
        }
        setCarryForwardItems(prev => [...prev, {
            fundType: available[0].value,
            label: available[0].label,
            balance: 0
        }]);
    };

    return (
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-background-dark p-6 flex flex-col gap-6">
            {/* Header */}
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">menu_book</span>
                            สมุดเงินสด (Cash Book)
                        </h1>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-slate-500">ปีงบประมาณ {fyBE}</p>
                            <button onClick={handleCarryForward}
                                className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold border border-amber-200 transition-all hover:shadow-sm"
                                title={`ยกยอดคงเหลือจากปีงบประมาณ ${prevFyBE} มาปี ${fyBE}`}
                            >
                                <span className="material-symbols-outlined text-sm">input</span>
                                ยกยอดจากปี {prevFyBE}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                        <button onClick={() => setIsCheckModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-semibold border border-blue-200 shadow-sm transition-all mr-2">
                            <span className="material-symbols-outlined text-[18px]">find_in_page</span>
                            ตรวจสอบความถูกต้อง
                        </button>
                        <button onClick={() => { setIsAddOpen(true); setInitialAddType('income'); }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-green-500/30 transition-all">
                            <span className="material-symbols-outlined text-base">add</span>
                            เพิ่มรายรับ
                        </button>
                        <button onClick={() => { setIsAddOpen(true); setInitialAddType('expense'); }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-red-500/30 transition-all">
                            <span className="material-symbols-outlined text-base">remove</span>
                            เพิ่มรายจ่าย
                        </button>

                        {/* Bank Accounts Dropdown */}
                        <div className="relative group/bank z-30">
                            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold shadow-sm transition-all border border-indigo-200">
                                <span className="material-symbols-outlined text-base">account_balance</span>
                                บัญชีเงินฝาก
                            </button>
                            {/* Dropdown Menu */}
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover/bank:opacity-100 group-hover/bank:visible transition-all p-2 transform origin-top-right scale-95 group-hover/bank:scale-100">
                                <h4 className="text-xs font-bold text-gray-400 px-3 py-2 uppercase tracking-wider flex justify-between items-center">
                                    <span>บัญชีของโรงเรียน</span>
                                    <span className="material-symbols-outlined text-[14px]">info</span>
                                </h4>
                                {(schoolSettings.bankAccounts || []).length === 0 ? (
                                    <div className="text-center py-4 text-sm text-gray-400 pb-5">
                                        <span className="material-symbols-outlined text-3xl mb-1 opacity-50">account_balance_wallet</span>
                                        <p>ยังไม่มีข้อมูลบัญชี</p>
                                        <p className="text-[10px] mt-1">เพิ่มได้ที่เมนู "ข้อมูลโรงเรียน"</p>
                                    </div>
                                ) : (
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {(schoolSettings.bankAccounts || []).map(acc => {
                                            const balance = transactions.filter(t => acc.fundTypes.includes(t.fundType)).reduce((sum, t) => sum + (t.income || 0) - (t.expense || 0), 0);
                                            // Provide fallback bg classes based on color string
                                            const getBgColor = (c: string) => {
                                                if (c === 'green') return 'bg-green-500 shadow-green-500/50';
                                                if (c === 'purple') return 'bg-purple-500 shadow-purple-500/50';
                                                if (c === 'orange') return 'bg-orange-500 shadow-orange-500/50';
                                                if (c === 'red') return 'bg-red-500 shadow-red-500/50';
                                                if (c === 'gray') return 'bg-gray-500 shadow-gray-500/50';
                                                return 'bg-blue-500 shadow-blue-500/50';
                                            };
                                            return (
                                                <button key={acc.id} onClick={() => { setSelectedBankId(acc.id); setIsBankModalOpen(true); }}
                                                    className="w-full text-left px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex justify-between items-center group/item border border-transparent hover:border-gray-200 mb-1 last:mb-0 relative overflow-hidden">
                                                    <div className="flex items-center gap-3 relative z-10 w-[60%]">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${getBgColor(acc.color)} shadow-sm shrink-0`}></div>
                                                        <div className="min-w-0 pr-2">
                                                            <p className="text-[13px] font-bold text-gray-800 dark:text-gray-200 truncate" title={acc.name}>{acc.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{acc.accountNo || '-'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right relative z-10 flex flex-col items-end w-[40%]">
                                                        <p className="text-[14px] font-bold text-blue-600 truncate max-w-full">฿{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                        <span className="text-[10px] text-gray-400 mt-0.5 group-hover/item:text-blue-500 transition-colors flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transform translate-x-1 group-hover/item:translate-x-0">
                                                            ดูรายละเอียด <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Unified Export Button */}
                        <div className="relative group">
                            <button
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold shadow-md transition-all">
                                <span className="material-symbols-outlined text-base">ios_share</span>
                                ส่งออกรายงาน
                                <span className="material-symbols-outlined text-sm transition-transform group-hover:rotate-180">expand_more</span>
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden transform origin-top-right scale-95 group-hover:scale-100">
                                <button onClick={() => {
                                    setDailyPickerTempDate(new Date().toISOString().slice(0, 10));
                                    setIsDailyDatePickerOpen(true);
                                }}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 transition-colors">
                                    <span className="material-symbols-outlined text-green-600 text-[20px]">summarize</span>
                                    รายงานประจำวัน
                                </button>
                                <button onClick={handleCoverPDF} disabled={loading}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 disabled:opacity-50 transition-colors">
                                    <span className="material-symbols-outlined text-blue-600 text-[20px]">picture_as_pdf</span>
                                    PDF หน้าปก
                                </button>
                                <button onClick={handlePDF} disabled={loading}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-3 disabled:opacity-50 transition-colors">
                                    <span className="material-symbols-outlined text-red-600 text-[20px]">picture_as_pdf</span>
                                    {loading ? 'กำลังสร้าง...' : 'PDF สมุดเงินสด'}
                                </button>
                                <div className="px-3 pb-2 pt-1">
                                    <input
                                        type="text"
                                        value={pdfDateRange}
                                        onChange={e => setPdfDateRange(e.target.value)}
                                        placeholder="ช่วงวันที่ เช่น 1/5/2568-9/5/2568"
                                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                    />
                                    {pdfDateRange && <p className="text-[10px] text-gray-400 mt-0.5">เว้นว่าง=พิมพ์ทั้งปี</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            {/* Preview table – ALL fund types - SCROLLABLE */}
            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 shrink-0">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <h3 className="font-bold text-slate-700 dark:text-white text-sm">รายการรับ - จ่าย ประจำปีงบประมาณ {fyBE}</h3>
                        <div className="flex items-center gap-3">
                            <select
                                value={cashBookFilter}
                                onChange={e => setCashBookFilter(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer min-w-[200px]"
                            >
                                <option value="all">ทุกประเภท</option>
                                {Array.from(new Set(FUND_TYPE_OPTIONS.map(o => o.group))).map(group => (
                                    <optgroup key={group} label={group}>
                                        {FUND_TYPE_OPTIONS.filter(o => o.group === group).map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <button
                                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 shrink-0 shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[18px]">
                                    {sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                                </span>
                                {sortOrder === 'desc' ? 'ใหม่-เก่า' : 'เก่า-ใหม่'}
                            </button>
                            <span className="text-xs text-slate-500 whitespace-nowrap">{dailyData.length} วันที่มีการเคลื่อนไหว</span>
                        </div>
                    </div>
                </div>
                <div className="overflow-auto max-h-[500px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-slate-500 font-semibold border-b sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap min-w-[100px]">วันที่</th>
                                <th className="px-4 py-3 whitespace-nowrap">ที่เอกสาร</th>
                                <th className="px-4 py-3 min-w-[140px]">ประเภท</th>
                                <th className="px-4 py-3 min-w-[180px]">รายการ</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap text-green-600">รายรับ</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap text-red-600">รายจ่าย</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap text-blue-600">คงเหลือสะสม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {/* แสดงยอดยกมาจากปีงบประมาณที่แล้วถ้ามี */}
                            {prevCashStart !== 0 && (
                                <tr className="font-medium text-amber-800 bg-amber-50/50">
                                    <td className="px-4 py-2 text-center" colSpan={6}>
                                        ยอดยกมาจากปีงบประมาณ {fyBE - 1}
                                    </td>
                                    <td className="px-4 py-2 text-right font-bold">{fmtMoney(prevCashStart)}</td>
                                </tr>
                            )}

                            {(() => {
                                const fyCE = fyBE - 543;
                                const fyStartYear = fyCE - 1;
                                const fyStart = `${fyStartYear}-10-01`;
                                const fyEnd = `${fyCE}-09-30`;

                                // กรอง transactions "ยกยอดมา" ออก (เพราะระบบคำนวณยอดยกมาแยกแล้ว)
                                let curTxs = transactions
                                    .filter((t: any) => t.date >= fyStart && t.date <= fyEnd && !t.description?.includes('ยกยอดมา'))
                                    .sort((a: any, b: any) => {
                                        const aTime = new Date(a.date).getTime();
                                        const bTime = new Date(b.date).getTime();
                                        if (sortOrder === 'desc') {
                                            if (bTime !== aTime) return bTime - aTime;
                                            // วันเดียวกัน: รายรับก่อนรายจ่าย
                                            const aIsIncome = (a.income || 0) > 0 ? 1 : 0;
                                            const bIsIncome = (b.income || 0) > 0 ? 1 : 0;
                                            if (bIsIncome !== aIsIncome) return bIsIncome - aIsIncome;
                                            return b.id - a.id;
                                        } else {
                                            if (aTime !== bTime) return aTime - bTime;
                                            // วันเดียวกัน: รายรับก่อนรายจ่าย
                                            const aIsIncome = (a.income || 0) > 0 ? 1 : 0;
                                            const bIsIncome = (b.income || 0) > 0 ? 1 : 0;
                                            if (bIsIncome !== aIsIncome) return bIsIncome - aIsIncome;
                                            return a.id - b.id;
                                        }
                                    });

                                // กรองตามหมวดเงิน
                                if (cashBookFilter !== 'all') {
                                    curTxs = curTxs.filter((t: any) => t.fundType === cashBookFilter);
                                }

                                if (curTxs.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-slate-400">ไม่มีรายการในปีงบประมาณนี้</td>
                                        </tr>
                                    );
                                }

                                const getFundLabel = (ft: string) => FUND_TYPE_OPTIONS.find(f => f.value === ft)?.label?.replace(/^\d+\.?\d*\s*/, '') || ft;

                                const getFundBadgeColor = (ft: string) => {
                                    const group = FUND_TYPE_OPTIONS.find(f => f.value === ft)?.group || '';
                                    if (group === 'เงินงบประมาณ') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
                                    if (group === 'เงินรายได้แผ่นดิน') return 'bg-blue-100 text-blue-700 border border-blue-200';
                                    if (ft === 'fund-lunch') return 'bg-orange-100 text-orange-700 border border-orange-200';
                                    if (ft === 'fund-eef') return 'bg-teal-100 text-teal-700 border border-teal-200';
                                    if (ft === 'fund-school-income') return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
                                    if (ft === 'fund-tax') return 'bg-amber-100 text-amber-700 border border-amber-200';
                                    return 'bg-slate-100 text-slate-600 border border-slate-200';
                                };

                                // คำนวณยอดสะสมจากเก่าไปใหม่เสมอ แล้วเก็บเป็น Map id→balance
                                const balanceMap = new Map<number | string, number>();
                                {
                                    let runBal = prevCashStart;
                                    // กรอง "ยกยอดมา" ออกจาก balance map ด้วย
                                    const balBase = transactions
                                        .filter((t: any) => t.date >= fyStart && t.date <= fyEnd && !t.description?.includes('ยกยอดมา'))
                                        .sort((a: any, b: any) => {
                                            const aTime = new Date(a.date).getTime();
                                            const bTime = new Date(b.date).getTime();
                                            if (aTime !== bTime) return aTime - bTime;
                                            // วันเดียวกัน: รายรับก่อนรายจ่าย
                                            const aIsIncome = (a.income || 0) > 0 ? 1 : 0;
                                            const bIsIncome = (b.income || 0) > 0 ? 1 : 0;
                                            if (bIsIncome !== aIsIncome) return bIsIncome - aIsIncome;
                                            return a.id - b.id;
                                        });
                                    // ถ้ากรองตาม fund ด้วยให้ใช้ fund ที่กรองแล้วสำหรับ balance
                                    const balFiltered = cashBookFilter !== 'all' ? balBase.filter((t: any) => t.fundType === cashBookFilter) : balBase;
                                    balFiltered.forEach((t: any) => {
                                        runBal = runBal + (t.income || 0) - (t.expense || 0);
                                        balanceMap.set(t.id ?? t, runBal);
                                    });
                                }

                                return curTxs.map((tx: any, idx: number) => {
                                    const currentBal = balanceMap.get(tx.id ?? tx) ?? prevCashStart;
                                    const isIncome = (tx.income || 0) > 0;
                                    return (
                                        <tr key={tx.id || idx}
                                            onClick={() => setSelectedTx(tx)}
                                            className="hover:bg-blue-50/50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors">
                                            <td className="px-4 py-2 whitespace-nowrap">{fmtShort(tx.date)}</td>
                                            <td className="px-4 py-2 font-mono text-xs">{tx.docNo || '-'}</td>
                                            <td className="px-4 py-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${getFundBadgeColor(tx.fundType)}`}>
                                                    {getFundLabel(tx.fundType)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">{tx.description}</td>
                                            <td className="px-4 py-2 text-right text-green-600">{isIncome ? fmtMoney(tx.income) : '-'}</td>
                                            <td className="px-4 py-2 text-right text-red-600">{!isIncome && (tx.expense || 0) > 0 ? fmtMoney(tx.expense) : '-'}</td>
                                            <td className="px-4 py-2 text-right font-medium text-slate-700">{fmtMoney(currentBal)}</td>
                                        </tr>
                                    );
                                });
                            })()}

                            <tr className="font-bold border-t border-slate-200 sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                                <td colSpan={4} className="px-4 py-4 text-right text-slate-700 bg-white">รวมรับ - จ่ายตลอดปีงบประมาณ</td>
                                <td className="px-4 py-4 text-right text-green-700 bg-green-50/30">{fmtMoney(totalRecYear.cash)}</td>
                                <td className="px-4 py-4 text-right text-red-700 bg-red-50/30">{fmtMoney(totalPayYear.cash)}</td>
                                <td className="px-4 py-4 text-right text-blue-700 bg-blue-50/30">{fmtMoney(yodYokPaiEnd)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transaction Detail / Edit / Delete Modal */}
            {selectedTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-scale-in">
                        <div className="px-6 pt-5 pb-3 flex justify-between items-start">
                            <div>
                                <p className="text-xs text-gray-400">รายละเอียดรายการ</p>
                                <h2 className="text-lg font-bold text-gray-900">{isEditingTx ? 'แก้ไขรายการ' : (selectedTx.income > 0 ? 'รายรับ' : 'รายจ่าย')}</h2>
                            </div>
                            <button onClick={() => { setSelectedTx(null); setIsEditingTx(false); setDeleteConfirm(''); }}
                                className="text-blue-500 hover:text-blue-700 text-sm font-semibold">ปิด</button>
                        </div>

                        {isEditingTx ? (
                            /* Edit form */
                            <div className="px-6 pb-5 space-y-3">
                                {/* วันที่ */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 block mb-1">วันที่</label>
                                    <input
                                        type="text"
                                        value={(() => {
                                            const d = new Date(editTxData.date);
                                            if (isNaN(d.getTime())) return editTxData.date;
                                            const day = d.getDate();
                                            const month = d.getMonth() + 1;
                                            const year = d.getFullYear() + 543;
                                            return `${day}/${month}/${year}`;
                                        })()}
                                        onChange={e => {
                                            const v = e.target.value;
                                            const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                                            if (m) {
                                                const be = parseInt(m[3]);
                                                const yr = be > 2400 ? be - 543 : be;
                                                const iso = `${yr}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
                                                setEditTxData({ ...editTxData, date: iso });
                                            } else {
                                                setEditTxData({ ...editTxData, date: v });
                                            }
                                        }}
                                        placeholder="วว/ดด/ปปปป เช่น 1/10/2568"
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
                                    />
                                </div>

                                {/* ที่เอกสาร */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 block mb-1">ที่เอกสาร</label>
                                    <input type="text" value={editTxData.docNo}
                                        onChange={e => setEditTxData({ ...editTxData, docNo: e.target.value })}
                                        placeholder="เลขที่เอกสาร"
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors" />
                                </div>

                                {/* ประเภทเงิน */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 block mb-1">ประเภทเงิน</label>
                                    <select value={editTxData.fundType}
                                        onChange={e => setEditTxData({ ...editTxData, fundType: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white transition-colors">
                                        {Array.from(new Set(FUND_TYPE_OPTIONS.map(o => o.group))).map(group => (
                                            <optgroup key={group} label={group}>
                                                {FUND_TYPE_OPTIONS.filter(o => o.group === group).map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                {/* รายการ */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 block mb-1">รายการ</label>
                                    <input type="text" value={editTxData.description}
                                        onChange={e => setEditTxData({ ...editTxData, description: e.target.value })}
                                        placeholder="รายละเอียดรายการ"
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors" />
                                </div>

                                {/* ผู้รับ / ผู้จ่าย */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 block mb-1">
                                        {selectedTx.income > 0 ? 'ผู้นำส่ง / หัวรายการ' : 'ผู้รับเงิน / หัวรายการ'}
                                    </label>
                                    <input type="text"
                                        value={selectedTx.income > 0 ? editTxData.payer : editTxData.payee}
                                        onChange={e => {
                                            if (selectedTx.income > 0) setEditTxData({ ...editTxData, payer: e.target.value });
                                            else setEditTxData({ ...editTxData, payee: e.target.value });
                                        }}
                                        placeholder="ชื่อหัวรายการ (ไม่บังคับ)"
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors" />
                                </div>

                                {/* จำนวนเงิน */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 block mb-1">
                                        จำนวนเงิน ({selectedTx.income > 0 ? 'รับ' : 'จ่าย'})
                                    </label>
                                    <div className={`flex items-center rounded-xl px-4 py-3 border ${parseFloat(editTxData.amount) > 0 ? (selectedTx.income > 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300') : 'bg-gray-50 border-gray-200'}`}>
                                        <input type="number" step="0.01" value={editTxData.amount}
                                            onChange={e => setEditTxData({ ...editTxData, amount: e.target.value })}
                                            className={`w-full text-base font-bold text-right outline-none bg-transparent ${parseFloat(editTxData.amount) > 0 ? (selectedTx.income > 0 ? 'text-green-700' : 'text-red-700') : 'text-gray-400'}`}
                                            placeholder="0.00" />
                                        <span className="text-sm text-gray-400 ml-2">บาท</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button onClick={() => setIsEditingTx(false)}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">ยกเลิก</button>
                                    <button onClick={() => {
                                        const amt = parseFloat(editTxData.amount) || 0;
                                        editTransaction(selectedTx.id, {
                                            date: editTxData.date,
                                            docNo: editTxData.docNo,
                                            description: editTxData.description,
                                            fundType: editTxData.fundType,
                                            income: selectedTx.income > 0 ? amt : 0,
                                            expense: selectedTx.expense > 0 ? amt : 0,
                                            payer: editTxData.payer,
                                            payee: editTxData.payee,
                                        });
                                        setIsEditingTx(false);
                                        setSelectedTx(null);
                                    }}
                                        className="flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-colors">บันทึกการแก้ไข</button>
                                </div>
                            </div>
                        ) : deleteConfirm !== null && deleteConfirm !== '' ? null : (
                            /* View mode */
                            <div className="px-6 pb-4">
                                <div className="space-y-2 mb-4">
                                    {[
                                        { label: 'วันที่', value: fmtShort(selectedTx.date) },
                                        { label: 'ที่เอกสาร', value: selectedTx.docNo || '-' },
                                        { label: 'รายการ', value: selectedTx.description },
                                        { label: 'ประเภท', value: FUND_TYPE_OPTIONS.find(o => o.value === selectedTx.fundType)?.label || selectedTx.fundType },
                                        { label: selectedTx.income > 0 ? 'จำนวนรับ' : 'จำนวนจ่าย', value: `฿${fmtMoney(selectedTx.income > 0 ? selectedTx.income : selectedTx.expense)}` },
                                        { label: 'ชื่อหัวรายการ', value: (selectedTx.payer || selectedTx.payee || '-') },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                                            <span className="text-xs text-gray-400">{item.label}</span>
                                            <span className="text-sm font-medium text-gray-800">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => {
                                        setEditTxData({
                                            date: selectedTx.date,
                                            docNo: selectedTx.docNo || '',
                                            description: selectedTx.description || '',
                                            amount: String(selectedTx.income > 0 ? selectedTx.income : selectedTx.expense),
                                            fundType: selectedTx.fundType || '',
                                            payer: selectedTx.payer || '',
                                            payee: selectedTx.payee || '',
                                        });
                                        setIsEditingTx(true);
                                    }}
                                        className="flex-1 py-2 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-base">edit</span> แก้ไข
                                    </button>
                                    <button onClick={() => setShowDeletePrompt(true)}
                                        className="flex-1 py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-base">delete</span> ลบ
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Delete confirmation */}
                        {showDeletePrompt && !isEditingTx && (
                            <div className="px-6 pb-5 border-t border-gray-100 pt-4">
                                <p className="text-sm text-red-600 font-semibold mb-2">⚠️ ยืนยันการลบรายการ</p>
                                <p className="text-xs text-gray-500 mb-3">พิมพ์ <span className="font-bold text-red-600">"ยืนยัน"</span> เพื่อยืนยันการลบ</p>
                                <input type="text" value={deleteConfirm}
                                    onChange={e => setDeleteConfirm(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm outline-none focus:border-red-400 mb-3"
                                    placeholder='พิมพ์ "ยืนยัน"' />
                                <div className="flex gap-2">
                                    <button onClick={() => { setShowDeletePrompt(false); setDeleteConfirm(''); }}
                                        className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200">ยกเลิก</button>
                                    <button
                                        disabled={deleteConfirm !== 'ยืนยัน'}
                                        onClick={() => {
                                            deleteTransaction(selectedTx.id, 'ลบรายการจากสมุดเงินสด');
                                            setSelectedTx(null);
                                            setShowDeletePrompt(false);
                                            setDeleteConfirm('');
                                        }}
                                        className={`flex-[2] py-2 rounded-xl text-sm font-semibold text-white transition-all ${deleteConfirm === 'ยืนยัน' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 cursor-not-allowed'}`}>
                                        ลบรายการ
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Daily Date Picker Mini Modal */}
            {isDailyDatePickerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden animate-scale-in">
                        <div className="px-6 pt-5 pb-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-xs text-gray-400">รายงานประจำวัน</p>
                                    <h3 className="text-lg font-bold text-gray-900">เลือกวันที่</h3>
                                </div>
                                <button onClick={() => setIsDailyDatePickerOpen(false)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50">
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            </div>

                            {/* Manual date picker */}
                            <div className="mb-5">
                                <p className="text-xs font-semibold text-gray-400 mb-2">ระบุวันที่ต้องการดูรายงาน</p>
                                <ThaiDatePicker value={dailyPickerTempDate} onChange={setDailyPickerTempDate} />
                            </div>

                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsDailyDatePickerOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                                    ยกเลิก
                                </button>
                                <button type="button" onClick={() => {
                                    setIsDailyDatePickerOpen(false);
                                    generateDailyReportPDF(dailyPickerTempDate, schoolSettings, transactions);
                                }}
                                    className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-base">summarize</span>
                                    ดูรายงาน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bank Account Detail Modal */}
            {isBankModalOpen && selectedBankId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-scale-in">
                        {(() => {
                            const acc = (schoolSettings.bankAccounts || []).find(a => a.id === selectedBankId);
                            if (!acc) return null;
                            const accTxs = transactions.filter(t => acc.fundTypes.includes(t.fundType)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);
                            const currentBalance = accTxs.reduce((sum, t) => sum + (t.income || 0) - (t.expense || 0), 0);

                            const getBadgeColors = (c: string) => {
                                if (c === 'green') return 'bg-green-100 text-green-700 border-green-200';
                                if (c === 'purple') return 'bg-purple-100 text-purple-700 border-purple-200';
                                if (c === 'orange') return 'bg-orange-100 text-orange-700 border-orange-200';
                                if (c === 'red') return 'bg-red-100 text-red-700 border-red-200';
                                if (c === 'gray') return 'bg-gray-100 text-gray-700 border-gray-200';
                                return 'bg-blue-100 text-blue-700 border-blue-200';
                            };

                            return (
                                <>
                                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 shrink-0">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-blue-500 text-2xl">account_balance</span>
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold flex items-center gap-2 text-navy dark:text-white">
                                                    {acc.name}
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeColors(acc.color)}`}>{acc.bankName}</span>
                                                </h3>
                                                <p className="text-sm text-gray-500 font-mono mt-0.5">เลขบัญชี: {acc.accountNo || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 font-semibold mb-1">ยอดเงินคงเหลือสุทธิ</p>
                                                <p className="text-2xl font-bold text-blue-600">฿{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="h-10 w-px bg-gray-200"></div>
                                            <button onClick={() => { setIsBankModalOpen(false); setSelectedBankId(null); }} className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-white rounded-full shadow-sm hover:bg-red-50 flex items-center justify-center relative group">
                                                <span className="material-symbols-outlined text-xl">close</span>
                                                <span className="absolute -bottom-8 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">ด ย้อนกลับ</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            {accTxs.length > 0 ? (
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-50 text-gray-500 font-semibold text-xs border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-6 py-4 whitespace-nowrap">วันที่</th>
                                                            <th className="px-6 py-4 whitespace-nowrap min-w-[200px]">ประเภท / หมวดเงิน</th>
                                                            <th className="px-6 py-4 w-full">รายการ</th>
                                                            <th className="px-6 py-4 text-right whitespace-nowrap">รายรับ</th>
                                                            <th className="px-6 py-4 text-right whitespace-nowrap">รายจ่าย</th>
                                                            <th className="px-6 py-4 text-right whitespace-nowrap text-blue-600">คงเหลือ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {(() => {
                                                            let runBal = 0;
                                                            return accTxs.map(tx => {
                                                                runBal += (tx.income || 0) - (tx.expense || 0);
                                                                return (
                                                                    <tr key={tx.id} className="hover:bg-blue-50/50 transition-colors group">
                                                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{fmtShort(tx.date)}</td>
                                                                        <td className="px-6 py-4 text-xs font-medium min-w-[200px]">
                                                                            <span className="px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-600 border border-gray-200/60 inline-block" title={tx.fundType}>
                                                                                {FUND_TYPE_OPTIONS.find(o => o.value === tx.fundType)?.label?.replace(/^\d+\.?\d*\s*/, '') || tx.fundType}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-gray-800 group-hover:text-blue-700 transition-colors">{tx.description}</td>
                                                                        <td className="px-6 py-4 text-right pr-6 font-medium text-green-600">{tx.income > 0 ? tx.income.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                                                                        <td className="px-6 py-4 text-right pr-6 font-medium text-red-600">{tx.expense > 0 ? tx.expense.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                                                                        <td className="px-6 py-4 text-right pr-6 font-bold text-blue-700">{runBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                    </tr>
                                                                );
                                                            });
                                                        })()}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">account_balance_wallet</span>
                                                    <p>ไม่มีรายการเคลื่อนไหวในบัญชีนี้</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* AI Checking Modal */}
            <CashBookCheckModal
                isOpen={isCheckModalOpen}
                onClose={() => setIsCheckModalOpen(false)}
                fyBE={fyBE}
            />

            {/* Add Transaction Modal */}
            {isAddOpen && (
                <CashBookAddModal
                    isOpen={isAddOpen}
                    onClose={() => setIsAddOpen(false)}
                    onTaxWarning={(amount, type) => {
                        setTaxWarningAmount(amount);
                        setTaxWarningPayeeType(type);
                        setShowTaxWarning(true);
                    }}
                    initialTransactionType={initialAddType}
                />
            )}

            {/* Carry Forward Modal */}
            <CashBookCarryForwardModal
                isOpen={isCarryForwardOpen}
                onClose={() => setIsCarryForwardOpen(false)}
                fyBE={fyBE}
                prevFyBE={prevFyBE}
                isViewMode={isViewMode}
                isManualMode={isManualMode}
                carryForwardItems={carryForwardItems}
                carriedFundTypes={carriedFundTypes}
                setCarryForwardItems={setCarryForwardItems}
                setIsManualMode={setIsManualMode}
                setIsViewMode={setIsViewMode}
                handleAddManualFund={handleAddManualFund}
                handleCarryForwardConfirm={handleCarryForwardConfirm}
            />

            {/* Tax Warning Popup */}
            {showTaxWarning && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden animate-scale-in">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                                <span className="material-symbols-outlined text-3xl text-orange-600">warning</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">แจ้งเตือนภาษีหัก ณ ที่จ่าย</h3>
                            <p className="text-sm text-gray-500 mb-3">
                                รายการนี้เข้าข่ายต้องหักภาษี ณ ที่จ่าย 1%
                                <br />({taxWarningPayeeType === 'legal' ? 'นิติบุคคล จ่ายตั้งแต่ 500 บาทขึ้นไป' : 'บุคคลธรรมดา จ่ายตั้งแต่ 10,000 บาทขึ้นไป'})
                            </p>
                            <div className="bg-orange-50 rounded-xl p-4 mb-4">
                                <p className="text-xs text-orange-600 mb-1">ภาษีที่ต้องหัก</p>
                                <p className="text-2xl font-bold text-orange-700">{fmtMoney(taxWarningAmount)} บาท</p>
                            </div>
                            <p className="text-xs text-gray-400 mb-4">กรุณาบันทึกรายการภาษีแยกต่างหากในหมวดเงินภาษี</p>
                            <button onClick={() => setShowTaxWarning(false)}
                                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors">
                                รับทราบ
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CashBookReport;
