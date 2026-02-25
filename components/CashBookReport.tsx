
import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import { buildCashBookPDF, buildCoverPDF, openBlob } from './exportReportBuilders';
import { generateDailyReportPDF } from './DailyReport';
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
    const [addTransactionType, setAddTransactionType] = useState<'income' | 'expense'>('income');

    // Shared header fields
    const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));
    const [addFundType, setAddFundType] = useState('fund-subsidy');
    const [addFundSearch, setAddFundSearch] = useState('');
    const [isFundDropdownOpen, setIsFundDropdownOpen] = useState(false);
    const [addDocNo, setAddDocNo] = useState('');
    const [addBankId, setAddBankId] = useState<string>('');

    // Sub-items: description + amount (empty amount = header row)
    interface SubItem { id: number; description: string; amount: string; }
    const createSubItem = (): SubItem => ({ id: Date.now() + Math.random(), description: '', amount: '' });
    const [subItems, setSubItems] = useState<SubItem[]>([createSubItem()]);

    // Payee info for expense
    const [addPayeeType, setAddPayeeType] = useState<'legal' | 'person' | null>(null);
    const [showTaxWarning, setShowTaxWarning] = useState(false);
    const [taxWarningAmount, setTaxWarningAmount] = useState(0);
    const [taxWarningPayeeType, setTaxWarningPayeeType] = useState<'legal' | 'person' | null>(null);

    // Selected tax income transaction (for fund-tax expense)
    const [selectedTaxIncomeId, setSelectedTaxIncomeId] = useState<number | null>(null);

    // Tax 1% income mode - simple input
    const [taxPayerName, setTaxPayerName] = useState('');
    const [taxAmount, setTaxAmount] = useState('');

    // Tax 1% expense - manual mode (when no income records e.g. carry forward)
    const [isTaxManualMode, setIsTaxManualMode] = useState(false);
    const [taxManualDesc, setTaxManualDesc] = useState('');
    const [taxManualAmount, setTaxManualAmount] = useState('');

    // Selected poor fund income transaction (for fund-poor expense)
    const [selectedPoorIncomeId, setSelectedPoorIncomeId] = useState<number | null>(null);

    // Get income transactions of fund-tax type for selection
    const taxIncomeTransactions = useMemo(() => {
        return transactions
            .filter((t: any) => t.fundType === 'fund-tax' && (t.income || 0) > 0)
            .map((t: any) => {
                const spent = transactions
                    .filter((exp: any) => exp.fundType === 'fund-tax' && (exp.incomeRefId === t.id || (!exp.incomeRefId && exp.description === `นำส่งภาษี 1% (${t.description || t.payer || 'ไม่ระบุ'})`)))
                    .reduce((sum: number, exp: any) => sum + (exp.expense || 0), 0);
                return { ...t, remaining: (t.income || 0) - spent };
            })
            .filter((t: any) => t.remaining > 0)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions]);

    // Get income transactions of fund-poor type for selection
    const poorIncomeTransactions = useMemo(() => {
        return transactions
            .filter((t: any) => t.fundType === 'fund-poor' && (t.income || 0) > 0)
            .map((t: any) => {
                const spent = transactions
                    .filter((exp: any) => exp.fundType === 'fund-poor' && (exp.incomeRefId === t.id || (!exp.incomeRefId && t.description && exp.description.includes(t.description))))
                    .reduce((sum: number, exp: any) => sum + (exp.expense || 0), 0);
                return { ...t, remaining: (t.income || 0) - spent };
            })
            .filter((t: any) => t.remaining > 0)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions]);

    // Get income transactions of fund-state type for selection (เงินรายได้แผ่นดิน - ดอกเบี้ย)
    const stateIncomeTransactions = useMemo(() => {
        return transactions
            .filter((t: any) => t.fundType === 'fund-state' && (t.income || 0) > 0)
            .map((t: any) => {
                const spent = transactions
                    .filter((exp: any) => exp.fundType === 'fund-state' && (exp.incomeRefId === t.id || (!exp.incomeRefId && exp.description === `ส่งดอกเบี้ย (${t.description || 'เงินรายได้แผ่นดิน'})`)))
                    .reduce((sum: number, exp: any) => sum + (exp.expense || 0), 0);
                return { ...t, remaining: (t.income || 0) - spent };
            })
            .filter((t: any) => t.remaining > 0)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions]);

    // Get income transactions of fund-eef type for selection (กสศ.)
    const eefIncomeTransactions = useMemo(() => {
        return transactions
            .filter((t: any) => t.fundType === 'fund-eef' && (t.income || 0) > 0)
            .map((t: any) => {
                const spent = transactions
                    .filter((exp: any) => exp.fundType === 'fund-eef' && (exp.incomeRefId === t.id || (!exp.incomeRefId && t.description && exp.description.includes(t.description))))
                    .reduce((sum: number, exp: any) => sum + (exp.expense || 0), 0);
                return { ...t, remaining: (t.income || 0) - spent };
            })
            .filter((t: any) => t.remaining > 0)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions]);
    const [selectedEefIncomeId, setSelectedEefIncomeId] = useState<number | null>(null);
    const [customExpenseAmount, setCustomExpenseAmount] = useState(''); // จำนวนเงินที่จ่ายจริง (กรอกเอง)

    // fund-state expense mode states
    const [isStateManualMode, setIsStateManualMode] = useState(false);
    const [stateManualDesc, setStateManualDesc] = useState('');
    const [stateManualAmount, setStateManualAmount] = useState('');
    const [selectedStateIncomeId, setSelectedStateIncomeId] = useState<number | null>(null);

    // Carry Forward Modal
    const [isCarryForwardOpen, setIsCarryForwardOpen] = useState(false);
    const [carryForwardItems, setCarryForwardItems] = useState<{ fundType: string; label: string; balance: number }[]>([]);
    const [isManualMode, setIsManualMode] = useState(false);

    // Cash Book fund filter
    const [cashBookFilter, setCashBookFilter] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [pdfDateRange, setPdfDateRange] = useState(''); // e.g. "1/5/2568-9/5/2568"

    const updateSub = (id: number, field: 'description' | 'amount', value: string) => {
        setSubItems(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };
    const addSubItem = () => setSubItems(prev => [...prev, createSubItem()]);
    const removeSubItem = (id: number) => {
        if (subItems.length <= 1) return;
        setSubItems(prev => prev.filter(s => s.id !== id));
    };

    const subTotal = subItems.reduce((sum, s) => {
        const v = parseFloat(s.amount);
        return sum + (isNaN(v) ? 0 : v);
    }, 0);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const isTaxMode = addFundType === 'fund-tax';
        const isPoorExpense = addFundType === 'fund-poor' && addTransactionType === 'expense';
        const isStateExpense = addFundType === 'fund-state' && addTransactionType === 'expense';
        const isEefExpense = addFundType === 'fund-eef' && addTransactionType === 'expense';

        // === โหมดภาษี 1% ===
        if (isTaxMode) {
            if (!addDocNo) {
                alert('กรุณากรอกที่เอกสาร');
                return;
            }

            if (addTransactionType === 'income') {
                // รับเงินภาษี 1%: กรอกชื่อร้าน + จำนวนเงิน
                const amt = parseFloat(taxAmount);
                if (!taxPayerName || isNaN(amt) || amt <= 0) {
                    alert('กรุณากรอกชื่อผู้จ่าย (ร้านค้า) และจำนวนเงิน');
                    return;
                }
                addTransaction({
                    id: Date.now(),
                    date: addDate,
                    docNo: addDocNo,
                    description: `รับเงินภาษี 1% จาก${taxPayerName}`,
                    fundType: 'fund-tax',
                    income: amt,
                    expense: 0,
                    payer: taxPayerName,
                    payee: '',
                });
            } else {
                // จ่ายเงินภาษี 1%
                if (isTaxManualMode) {
                    // โหมดกรอกเอง (เช่น ยอดยกมา)
                    const amt = parseFloat(taxManualAmount);
                    if (!taxManualDesc || isNaN(amt) || amt <= 0) {
                        alert('กรุณากรอกรายละเอียดและจำนวนเงิน');
                        return;
                    }
                    const fundBalance = transactions
                        .filter((t: any) => t.fundType === 'fund-tax' && t.date <= addDate)
                        .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
                    if (amt > fundBalance) {
                        alert(`ยอด ${fmtMoney(amt)} บาท เกินยอดคงเหลือภาษี (${fmtMoney(fundBalance)} บาท)`);
                        return;
                    }
                    addTransaction({
                        id: Date.now(),
                        date: addDate,
                        docNo: addDocNo,
                        description: `นำส่งภาษี 1% (${taxManualDesc})`,
                        fundType: 'fund-tax',
                        income: 0,
                        expense: amt,
                        payer: '',
                        payee: taxManualDesc,
                    });
                } else {
                    // โหมดเลือกจากรายการรายรับ
                    if (!selectedTaxIncomeId) {
                        alert('กรุณาเลือกรายการรายรับภาษี 1% ที่ต้องการจ่าย');
                        return;
                    }
                    const selectedTx = taxIncomeTransactions.find((t: any) => t.id === selectedTaxIncomeId);
                    if (!selectedTx) {
                        alert('ไม่พบรายการที่เลือก');
                        return;
                    }
                    const fundBalance = transactions
                        .filter((t: any) => t.fundType === 'fund-tax' && t.date <= addDate)
                        .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
                    if (selectedTx.income > fundBalance) {
                        alert(`ยอด ${fmtMoney(selectedTx.income)} บาท เกินยอดคงเหลือภาษี (${fmtMoney(fundBalance)} บาท)`);
                        return;
                    }
                    addTransaction({
                        id: Date.now(),
                        date: addDate,
                        docNo: addDocNo,
                        description: `นำส่งภาษี 1% (${selectedTx.description || selectedTx.payer || 'ไม่ระบุ'})`,
                        fundType: 'fund-tax',
                        income: 0,
                        expense: selectedTx.income,
                        payer: '',
                        payee: selectedTx.payer || selectedTx.description || '',
                        incomeRefId: selectedTx.id,
                    });
                }
            }

            setIsAddOpen(false);
            setSubItems([createSubItem()]);
            setAddDate(new Date().toISOString().slice(0, 10));
            setAddDocNo('');
            setAddPayeeType(null);
            setSelectedTaxIncomeId(null);
            setSelectedPoorIncomeId(null);
            setTaxPayerName('');
            setTaxAmount('');
            setIsTaxManualMode(false);
            setTaxManualDesc('');
            setTaxManualAmount('');
            setAddFundSearch('');
            setAddBankId('');
            return;
        }

        // === โหมดเงินปัจจัยพื้นฐานนักเรียนยากจน - จ่าย ===
        if (isPoorExpense) {
            if (!addDocNo) {
                alert('กรุณากรอกที่เอกสาร');
                return;
            }
            if (!selectedPoorIncomeId) {
                alert('กรุณาเลือกรายการรายรับปัจจัยยากจนที่ต้องการจ่าย');
                return;
            }
            const selectedTx = poorIncomeTransactions.find((t: any) => t.id === selectedPoorIncomeId);
            if (!selectedTx) {
                alert('ไม่พบรายการที่เลือก');
                return;
            }
            const amt = parseFloat(customExpenseAmount);
            if (isNaN(amt) || amt <= 0) {
                alert('กรุณากรอกจำนวนเงินที่ต้องการจ่าย');
                return;
            }
            const fundBalance = transactions
                .filter((t: any) => t.fundType === 'fund-poor' && t.date <= addDate)
                .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
            if (amt > fundBalance) {
                alert(`ยอด ${fmtMoney(amt)} บาท เกินยอดคงเหลือปัจจัยยากจน (${fmtMoney(fundBalance)} บาท)`);
                return;
            }
            const baseDesc = selectedTx.description || 'เงินปัจจัยพื้นฐานนักเรียนยากจน';
            const expenseDesc = baseDesc.startsWith('รับ') ? baseDesc.replace(/^รับ/, 'จ่าย') : `จ่าย${baseDesc}`;
            addTransaction({
                id: Date.now(),
                date: addDate,
                docNo: addDocNo,
                description: expenseDesc,
                fundType: 'fund-poor',
                income: 0,
                expense: amt,
                payer: '',
                payee: selectedTx.description || selectedTx.payer || '',
                incomeRefId: selectedTx.id,
            });

            setIsAddOpen(false);
            setSubItems([createSubItem()]);
            setAddDate(new Date().toISOString().slice(0, 10));
            setAddDocNo('');
            setAddPayeeType(null);
            setSelectedTaxIncomeId(null);
            setSelectedPoorIncomeId(null);
            setCustomExpenseAmount('');
            setTaxPayerName('');
            setTaxAmount('');
            setAddFundSearch('');
            setAddBankId('');
            return;
        }

        // === โหมดเงิน กสศ. - จ่าย ===
        if (isEefExpense) {
            if (!addDocNo) {
                alert('กรุณากรอกที่เอกสาร');
                return;
            }
            if (!selectedEefIncomeId) {
                alert('กรุณาเลือกรายการรายรับ กสศ. ที่ต้องการจ่าย');
                return;
            }
            const selectedTx = eefIncomeTransactions.find((t: any) => t.id === selectedEefIncomeId);
            if (!selectedTx) {
                alert('ไม่พบรายการที่เลือก');
                return;
            }
            const amt = parseFloat(customExpenseAmount);
            if (isNaN(amt) || amt <= 0) {
                alert('กรุณากรอกจำนวนเงินที่ต้องการจ่าย');
                return;
            }
            const fundBalance = transactions
                .filter((t: any) => t.fundType === 'fund-eef' && t.date <= addDate)
                .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
            if (amt > fundBalance) {
                alert(`ยอด ${fmtMoney(amt)} บาท เกินยอดคงเหลือ กสศ. (${fmtMoney(fundBalance)} บาท)`);
                return;
            }
            const baseDesc = selectedTx.description || 'เงิน กสศ.';
            const expenseDesc = baseDesc.startsWith('รับ') ? baseDesc.replace(/^รับ/, 'จ่าย') : `จ่าย${baseDesc}`;
            addTransaction({
                id: Date.now(),
                date: addDate,
                docNo: addDocNo,
                description: expenseDesc,
                fundType: 'fund-eef',
                income: 0,
                expense: amt,
                payer: '',
                payee: selectedTx.description || selectedTx.payer || '',
                incomeRefId: selectedTx.id,
            });

            setIsAddOpen(false);
            setSubItems([createSubItem()]);
            setAddDate(new Date().toISOString().slice(0, 10));
            setAddDocNo('');
            setAddPayeeType(null);
            setSelectedEefIncomeId(null);
            setCustomExpenseAmount('');
            setAddFundSearch('');
            setAddBankId('');
            return;
        }

        // === โหมดเงินรายได้แผ่นดิน - จ่าย ===
        if (isStateExpense) {
            if (!addDocNo) {
                alert('กรุณากรอกที่เอกสาร');
                return;
            }
            if (isStateManualMode) {
                // กรอกเอง (ยอดยกมา)
                const amt = parseFloat(stateManualAmount);
                if (!stateManualDesc || isNaN(amt) || amt <= 0) {
                    alert('กรุณากรอกรายละเอียดและจำนวนเงิน');
                    return;
                }
                const fundBalance = transactions
                    .filter((t: any) => t.fundType === 'fund-state' && t.date <= addDate)
                    .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
                if (amt > fundBalance) {
                    alert(`ยอด ${fmtMoney(amt)} บาท เกินยอดคงเหลือเงินรายได้แผ่นดิน (${fmtMoney(fundBalance)} บาท)`);
                    return;
                }
                addTransaction({
                    id: Date.now(),
                    date: addDate,
                    docNo: addDocNo,
                    description: `ส่งดอกเบี้ย (${stateManualDesc})`,
                    fundType: 'fund-state',
                    income: 0,
                    expense: amt,
                    payer: '',
                    payee: stateManualDesc,
                });
            } else {
                // เลือกจากรายการรายรับ
                if (!selectedStateIncomeId) {
                    alert('กรุณาเลือกรายการรายรับเงินรายได้แผ่นดินที่ต้องการจ่าย');
                    return;
                }
                const selectedTx = stateIncomeTransactions.find((t: any) => t.id === selectedStateIncomeId);
                if (!selectedTx) {
                    alert('ไม่พบรายการที่เลือก');
                    return;
                }
                const amt = parseFloat(customExpenseAmount);
                if (isNaN(amt) || amt <= 0) {
                    alert('กรุณากรอกจำนวนเงินที่ต้องการจ่าย');
                    return;
                }
                const fundBalance = transactions
                    .filter((t: any) => t.fundType === 'fund-state' && t.date <= addDate)
                    .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
                if (amt > fundBalance) {
                    alert(`ยอด ${fmtMoney(amt)} บาท เกินยอดคงเหลือเงินรายได้แผ่นดิน (${fmtMoney(fundBalance)} บาท)`);
                    return;
                }
                addTransaction({
                    id: Date.now(),
                    date: addDate,
                    docNo: addDocNo,
                    description: `ส่งดอกเบี้ย (${selectedTx.description || 'เงินรายได้แผ่นดิน'})`,
                    fundType: 'fund-state',
                    income: 0,
                    expense: amt,
                    payer: '',
                    payee: selectedTx.description || selectedTx.payer || '',
                    incomeRefId: selectedTx.id,
                });
            }

            setIsAddOpen(false);
            setSubItems([createSubItem()]);
            setAddDate(new Date().toISOString().slice(0, 10));
            setAddDocNo('');
            setAddPayeeType(null);
            setSelectedStateIncomeId(null);
            setIsStateManualMode(false);
            setStateManualDesc('');
            setStateManualAmount('');
            setCustomExpenseAmount('');
            setAddFundSearch('');
            setAddBankId('');
            return;
        }

        // === โหมดปกติ (ไม่ใช่ภาษี 1%) ===
        // Separate header items (no amount) from data items (has amount)
        const dataItems = subItems.filter(s => {
            const amt = parseFloat(s.amount);
            return amt > 0 && !isNaN(amt) && s.description;
        });
        // Find the first header item (has description but no amount)
        const headerItem = subItems.find(s => s.description && (!s.amount || parseFloat(s.amount) === 0 || isNaN(parseFloat(s.amount))));
        const headerTitle = headerItem?.description || '';

        if (dataItems.length === 0 || !addDocNo) {
            alert('กรุณากรอกที่เอกสาร และรายการย่อยอย่างน้อย 1 รายการ (ชื่อรายการ + จำนวนเงิน)');
            return;
        }

        const isInterestMode = addTransactionType === 'income' && addFundType === 'fund-state';

        if (isInterestMode && !addBankId) {
            alert('กรุณาเลือกบัญชีธนาคารที่รับดอกเบี้ย (เนื่องจากเป็นรายการเงินรายได้แผ่นดิน)');
            return;
        }

        if (addTransactionType === 'expense') {
            if (!addPayeeType) {
                alert('กรุณาเลือกประเภทผู้รับเงิน (นิติบุคคล หรือ บุคคลธรรมดา)');
                return;
            }
            const fundBalance = transactions
                .filter((t: any) => t.fundType === addFundType && t.date <= addDate)
                .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
            if (subTotal > fundBalance) {
                alert(`ยอดรวม ${fmtMoney(subTotal)} บาท เกินยอดคงเหลือประเภท (${fmtMoney(fundBalance)} บาท)`);
                return;
            }

            // Check if tax warning should be shown
            const taxThreshold = addPayeeType === 'legal' ? 500 : 10000;
            if (subTotal > taxThreshold) {
                const taxAmt = Math.round(subTotal * 0.01 * 100) / 100;
                setTaxWarningAmount(taxAmt);
                setTaxWarningPayeeType(addPayeeType);
                setShowTaxWarning(true);
            }
        }

        for (let idx = 0; idx < dataItems.length; idx++) {
            const s = dataItems[idx];
            const amt = parseFloat(s.amount);
            addTransaction({
                id: Date.now() + idx,
                date: addDate,
                docNo: addDocNo,
                description: s.description,
                fundType: addFundType,
                income: addTransactionType === 'income' ? amt : 0,
                expense: addTransactionType === 'expense' ? amt : 0,
                payer: addTransactionType === 'income' ? headerTitle : '',
                payee: addTransactionType === 'expense' ? headerTitle : '',
                recipientType: addTransactionType === 'expense' ? (addPayeeType === 'legal' ? 'juristic' : 'individual') : undefined,
                bankId: isInterestMode ? addBankId : undefined,
            });
        }

        setIsAddOpen(false);
        setSubItems([createSubItem()]);
        setAddDate(new Date().toISOString().slice(0, 10));
        setAddDocNo('');
        setAddPayeeType(null);
        setSelectedTaxIncomeId(null);
        setTaxPayerName('');
        setTaxAmount('');
        setAddFundSearch('');
        setAddBankId('');
    };

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

            const prevCash = transactions
                .filter((t: any) => t.date < fyStart)
                .reduce((a: number, t: any) => a + (t.income || 0) - (t.expense || 0), 0);

            const curTxs = transactions
                .filter((t: any) => t.date >= fyStart && t.date <= fyEnd)
                .sort((a: any, b: any) => a.date.localeCompare(b.date));

            const sumArr = (arr: any[]) => arr.reduce((a: any, r: any) => ({
                cash: a.cash + r.cash, budget: a.budget + r.budget,
                revenue: a.revenue + r.revenue, nonBudget: a.nonBudget + r.nonBudget,
            }), { cash: 0, budget: 0, revenue: 0, nonBudget: 0 });

            let currentPrevCash = prevCash;
            const prevAccTxs = transactions.filter((t: any) => t.date < fyStart);
            let runAccRec = sumArr(prevAccTxs.filter((t: any) => (t.income || 0) > 0).map((t: any) => getAmounts(t.income, t.fundType)));
            let runAccPay = sumArr(prevAccTxs.filter((t: any) => (t.expense || 0) > 0).map((t: any) => getAmounts(t.expense, t.fundType)));

            const uniqueDays = Array.from(new Set(curTxs.map((t: any) => t.date)));

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
                uniqueDays.forEach(date => {
                    const txsToday = curTxs.filter((t: any) => t.date === date);
                    const receipts: any[] = [], payments: any[] = [];
                    txsToday.forEach((t: any) => {
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

                    // ตรวจว่าวันนี้เป็นวันยกยอดมาจากปีก่อน (รายการรับล้วนเป็น "ยกยอดมา")
                    const isCarryForwardDay = receipts.length > 0 && receipts.every((r: any) => r.desc.includes('ยกยอดมา'));

                    dailyData.push({
                        date, dateStr: fmtShort(date as string),
                        receipts, payments,
                        prevCash: dayPrevCash, yodYokPai,
                        totalRec: dayRev, totalPay: dayPay,
                        accRec: { ...runAccRec }, accPay: { ...runAccPay },
                        isCarryForwardDay,
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

        const prevTxs = transactions.filter((t: any) => t.date < fyStart.toISOString().slice(0, 10));
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

    const handleCarryForward = () => {
        const fyCE = fyBE - 543;
        const prevFyEnd = `${fyCE - 1}-09-30`;

        const prevTxs = transactions.filter(t => t.date <= prevFyEnd);
        const balanceByFund: Record<string, number> = {};
        prevTxs.forEach(t => {
            if (!balanceByFund[t.fundType]) balanceByFund[t.fundType] = 0;
            balanceByFund[t.fundType] += (t.income || 0) - (t.expense || 0);
        });

        const fundLabel = (ft: string) => FUND_TYPE_OPTIONS.find(o => o.value === ft)?.label || ft;
        const items = Object.entries(balanceByFund)
            .filter(([, bal]) => bal > 0)
            .map(([fundType, balance]) => ({ fundType, label: fundLabel(fundType), balance }));

        if (items.length === 0) {
            // ไม่มียอดจากระบบ → ใส่ข้อมูลยกมาปี 2568 ตามที่โรงเรียนแจ้ง
            const presetData: { fundType: string; balance: number }[] = [
                { fundType: 'fund-subsidy', balance: 1459.63 },
                { fundType: 'fund-15y-book', balance: 0 },
                { fundType: 'fund-15y-supply', balance: 300 },
                { fundType: 'fund-15y-uniform', balance: 900 },
                { fundType: 'fund-15y-activity', balance: 28390.00 },
                { fundType: 'fund-poor', balance: 0 },
                { fundType: 'fund-eef', balance: 20071.59 },
                { fundType: 'fund-lunch', balance: 125124.46 },
                { fundType: 'fund-tax', balance: 0 },
                { fundType: 'fund-state', balance: 322.71 },
                { fundType: 'fund-school-income', balance: 2903.28 },
            ];
            const presetItems = presetData
                .map(d => ({ fundType: d.fundType, label: fundLabel(d.fundType), balance: d.balance }));
            setCarryForwardItems(presetItems);
            setIsManualMode(true); // เปิดโหมดแก้ไขเลย
        } else {
            setCarryForwardItems(items);
            setIsManualMode(false);
        }
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
                        </div>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                        <button onClick={() => { setIsAddOpen(true); setAddTransactionType('income'); }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold shadow-md shadow-green-500/30 transition-all">
                            <span className="material-symbols-outlined text-base">add</span>
                            เพิ่มรายรับ
                        </button>
                        <button onClick={() => { setIsAddOpen(true); setAddTransactionType('expense'); }}
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
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            <tr className="bg-blue-50/30 dark:bg-blue-900/10 font-medium">
                                <td colSpan={4} className="px-4 py-3 text-slate-600 text-right">ยอดยกมา {cashBookFilter === 'all' ? '(ทุกประเภท)' : ''}</td>
                                <td className="px-4 py-3 text-right"></td>
                                <td className="px-4 py-3 text-right"></td>
                                <td className="px-4 py-3 text-right text-blue-700 font-bold">{fmtMoney(prevCashStart)}</td>
                            </tr>

                            {(() => {
                                const fyCE = fyBE - 543;
                                const fyStartYear = fyCE - 1;
                                const fyStart = `${fyStartYear}-10-01`;
                                const fyEnd = `${fyCE}-09-30`;

                                let curTxs = transactions
                                    .filter((t: any) => t.date >= fyStart && t.date <= fyEnd)
                                    .sort((a: any, b: any) => {
                                        if (sortOrder === 'desc') {
                                            return new Date(b.date).getTime() - new Date(a.date).getTime() || (b.id - a.id);
                                        } else {
                                            return new Date(a.date).getTime() - new Date(b.date).getTime() || (a.id - b.id);
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

                                // คำนวณยอดสะสมจากเก่าไปใหม่เสมอ แล้วเก็บเป็น Map id→balance
                                const balanceMap = new Map<number | string, number>();
                                {
                                    let runBal = prevCashStart;
                                    const balBase = transactions
                                        .filter((t: any) => t.date >= fyStart && t.date <= fyEnd)
                                        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime() || (a.id - b.id));
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
                                                <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
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

            {/* Add Transaction Modal */}
            {isAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/80 backdrop-blur-sm animate-fade-in">
                    <form onSubmit={handleAddSubmit}
                        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[94vh] min-h-[80vh] flex flex-col overflow-hidden animate-scale-in mx-4">

                        {/* Top */}
                        <div className="px-8 pt-6 pb-4 shrink-0">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <p className="text-sm text-gray-400">สมุดเงินสด</p>
                                    <h2 className="text-2xl font-bold text-gray-900">เพิ่มรายการ</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* iOS-style switch */}
                                    <span className={`text-xs font-semibold ${addTransactionType === 'income' ? 'text-green-600' : 'text-gray-300'}`}>รับ</span>
                                    <button type="button"
                                        onClick={() => setAddTransactionType(addTransactionType === 'income' ? 'expense' : 'income')}
                                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${addTransactionType === 'expense' ? 'bg-red-500' : 'bg-green-500'}`}>
                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${addTransactionType === 'expense' ? 'translate-x-[22px]' : 'translate-x-0.5'}`}></div>
                                    </button>
                                    <span className={`text-xs font-semibold ${addTransactionType === 'expense' ? 'text-red-600' : 'text-gray-300'}`}>จ่าย</span>
                                    <span className="mx-1 text-gray-200">|</span>
                                    <button type="button" onClick={() => setIsAddOpen(false)}
                                        className="text-blue-500 hover:text-blue-700 text-sm font-semibold">ปิด</button>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto px-8">

                            {/* Shared fields */}
                            <div className="space-y-4 mb-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500 mb-1 block">ประเภท / หมวดเงิน</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsFundDropdownOpen(!isFundDropdownOpen)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base outline-none focus:border-gray-400 transition-colors flex justify-between items-center"
                                        >
                                            <span className="truncate">
                                                {FUND_TYPE_OPTIONS.find(o => o.value === addFundType)?.label || 'เลือกประเภท'}
                                            </span>
                                            <span className="material-symbols-outlined text-gray-400 text-sm">expand_more</span>
                                        </button>

                                        {/* Dropdown Menu */}
                                        {isFundDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsFundDropdownOpen(false)}></div>
                                                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-64 flex flex-col overflow-hidden">
                                                    <div className="p-2 border-b border-gray-100 shrink-0">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            placeholder="ค้นหาประเภท..."
                                                            value={addFundSearch}
                                                            onChange={e => setAddFundSearch(e.target.value)}
                                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
                                                        />
                                                    </div>
                                                    <div className="overflow-y-auto py-1">
                                                        {Array.from(new Set(FUND_TYPE_OPTIONS.map(o => o.group))).map(group => {
                                                            const filteredOpts = FUND_TYPE_OPTIONS.filter(opt => opt.group === group && opt.label.toLowerCase().includes(addFundSearch.toLowerCase()));
                                                            if (filteredOpts.length === 0) return null;
                                                            return (
                                                                <div key={group}>
                                                                    <div className="px-3 py-1.5 text-xs font-bold text-gray-400 bg-gray-50 uppercase tracking-wide">
                                                                        {group}
                                                                    </div>
                                                                    {filteredOpts.map(opt => (
                                                                        <button
                                                                            key={opt.value}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setAddFundType(opt.value);
                                                                                setIsFundDropdownOpen(false);
                                                                                setAddFundSearch('');
                                                                            }}
                                                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${addFundType === opt.value ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'}`}
                                                                        >
                                                                            {opt.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 mb-1 block">วัน/เดือน/ปี</label>
                                        <ThaiDatePicker value={addDate} onChange={(val: string) => setAddDate(val)} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 mb-1 block">ที่เอกสาร</label>
                                        <input type="text" value={addDocNo}
                                            onChange={e => setAddDocNo(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base outline-none focus:border-gray-400 transition-colors"
                                            placeholder="กค 68/001" />
                                    </div>
                                </div>
                                {addTransactionType === 'income' && addFundType === 'fund-state' && (
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 animate-fade-in mt-4">
                                        <label className="text-sm font-semibold text-blue-800 mb-1 block">เงินรายได้แผ่นดิน(ดอกเบี้ย) — เลือกบัญชีธนาคาร</label>
                                        <p className="text-xs text-blue-600 mb-3 opacity-80">โปรดระบุบัญชีธนาคารที่รับดอกเบี้ยมา</p>
                                        <select value={addBankId} onChange={e => setAddBankId(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white text-base outline-none focus:border-blue-400 transition-colors">
                                            <option value="">-- กรุณาเลือกบัญชีธนาคาร --</option>
                                            {(schoolSettings.bankAccounts || []).map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.bankName} {acc.accountNo})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* === โหมดภาษี 1% - รับ === */}
                            {addFundType === 'fund-tax' && addTransactionType === 'income' && (
                                <div className="space-y-3 mt-2">
                                    <div className="bg-orange-50/50 rounded-xl border border-orange-200 p-4">
                                        <label className="text-xs font-semibold text-orange-600 mb-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">storefront</span>
                                            รับภาษี 1% จากใคร?
                                        </label>
                                        <input
                                            type="text"
                                            value={taxPayerName}
                                            onChange={e => setTaxPayerName(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-white text-base outline-none focus:border-orange-400 transition-colors mt-1"
                                            placeholder="เช่น ร้านเกรซ, ร้านวินัย"
                                        />
                                        <div className="mt-3">
                                            <label className="text-xs font-semibold text-orange-600 mb-1 block">จำนวนเงินภาษี</label>
                                            <div className={`flex items-center rounded-xl px-4 py-3 border ${parseFloat(taxAmount) > 0 ? 'bg-green-50 border-green-300' : 'bg-white border-orange-200'}`}>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={taxAmount}
                                                    onChange={e => setTaxAmount(e.target.value)}
                                                    className={`w-full text-base font-bold text-right outline-none bg-transparent ${parseFloat(taxAmount) > 0 ? 'text-green-700' : 'text-gray-400'}`}
                                                    placeholder="0.00"
                                                />
                                                <span className="text-sm text-gray-400 ml-2">บาท</span>
                                            </div>
                                        </div>
                                        {taxPayerName && parseFloat(taxAmount) > 0 && (
                                            <div className="mt-3 bg-white rounded-lg border border-orange-100 px-3 py-2">
                                                <p className="text-[11px] text-gray-400">จะบันทึกเป็น:</p>
                                                <p className="text-sm font-semibold text-gray-700">
                                                    <span className="material-symbols-outlined text-green-500 text-sm align-middle mr-1">check_circle</span>
                                                    รับเงินภาษี 1% จาก{taxPayerName} จำนวน {fmtMoney(parseFloat(taxAmount))} บาท
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* === โหมดภาษี 1% - จ่าย === */}
                            {addFundType === 'fund-tax' && addTransactionType === 'expense' && (
                                <div className="mt-2">
                                    {/* ปุ่มสลับโหมด */}
                                    <div className="flex gap-1.5 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => { setIsTaxManualMode(false); setTaxManualDesc(''); setTaxManualAmount(''); }}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${!isTaxManualMode
                                                ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-500 hover:border-orange-300'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-sm align-middle mr-0.5">list</span>
                                            เลือกจากรายการรับ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setIsTaxManualMode(true); setSelectedTaxIncomeId(null); }}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${isTaxManualMode
                                                ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-500 hover:border-orange-300'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-sm align-middle mr-0.5">edit_note</span>
                                            กรอกเอง (ยอดยกมา)
                                        </button>
                                    </div>

                                    {!isTaxManualMode ? (
                                        /* โหมดเลือกจากรายการรับ */
                                        <>
                                            <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm text-orange-500">receipt_long</span>
                                                เลือกรายการรายรับภาษี 1% ที่ต้องการนำส่ง
                                                {!selectedTaxIncomeId && (
                                                    <span className="text-red-400 text-[10px] bg-red-50 border border-red-200 rounded-full px-2 py-0.5 ml-1">กรุณาเลือก</span>
                                                )}
                                            </label>
                                            <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                                {taxIncomeTransactions.length === 0 ? (
                                                    <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                        <span className="material-symbols-outlined text-2xl mb-1 opacity-50">inbox</span>
                                                        <p className="text-xs">ยังไม่มีรายการรายรับภาษี 1%</p>
                                                        <p className="text-[10px] mt-1">หากเป็นยอดยกมา กรุณาใช้โหมด "กรอกเอง" แทน</p>
                                                    </div>
                                                ) : (
                                                    taxIncomeTransactions.map((tx: any) => {
                                                        const isSelected = selectedTaxIncomeId === tx.id;
                                                        return (
                                                            <button
                                                                key={tx.id}
                                                                type="button"
                                                                onClick={() => setSelectedTaxIncomeId(isSelected ? null : tx.id)}
                                                                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all border-2 flex justify-between items-center gap-2 ${isSelected
                                                                    ? 'bg-orange-50 border-orange-400 shadow-sm shadow-orange-100'
                                                                    : 'bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected
                                                                        ? 'border-orange-500 bg-orange-500'
                                                                        : 'border-gray-300'
                                                                        }`}>
                                                                        {isSelected && (
                                                                            <span className="material-symbols-outlined text-[12px] text-white">check</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-medium text-gray-800 truncate">{tx.description || tx.payer || 'ไม่ระบุรายการ'}</p>
                                                                        <p className="text-[11px] text-gray-400">
                                                                            {fmtShort(tx.date)} • เอกสาร: {tx.docNo || '-'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-sm font-bold text-green-600 whitespace-nowrap shrink-0">
                                                                    {fmtMoney(tx.income)} ฿
                                                                </span>
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                            {selectedTaxIncomeId && (() => {
                                                const sel = taxIncomeTransactions.find((t: any) => t.id === selectedTaxIncomeId);
                                                if (!sel) return null;
                                                return (
                                                    <div className="mt-3 bg-red-50/50 rounded-xl border border-red-200 px-4 py-3">
                                                        <p className="text-[11px] text-gray-400">จะบันทึกเป็น:</p>
                                                        <p className="text-sm font-semibold text-gray-700">
                                                            <span className="material-symbols-outlined text-red-500 text-sm align-middle mr-1">payments</span>
                                                            นำส่งภาษี 1% ({sel.description || sel.payer || 'ไม่ระบุ'}) จำนวน {fmtMoney(sel.income)} บาท
                                                        </p>
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    ) : (
                                        /* โหมดกรอกเอง (ยอดยกมา) */
                                        <div className="bg-orange-50/50 rounded-xl border border-orange-200 p-4">
                                            <p className="text-[11px] text-orange-600 mb-3 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">info</span>
                                                สำหรับยอดยกมาที่ไม่มีรายการรับให้เลือก
                                            </p>
                                            <label className="text-xs font-semibold text-orange-700 mb-1 block">รายละเอียดการนำส่ง</label>
                                            <input
                                                type="text"
                                                value={taxManualDesc}
                                                onChange={e => setTaxManualDesc(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-white text-base outline-none focus:border-orange-400 transition-colors"
                                                placeholder="เช่น นำส่งภาษี 1% จากร้านค้า ABC"
                                            />
                                            <div className="mt-3">
                                                <label className="text-xs font-semibold text-orange-700 mb-1 block">จำนวนเงิน</label>
                                                <div className={`flex items-center rounded-xl px-4 py-3 border ${parseFloat(taxManualAmount) > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-orange-200'}`}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={taxManualAmount}
                                                        onChange={e => setTaxManualAmount(e.target.value)}
                                                        className={`w-full text-base font-bold text-right outline-none bg-transparent ${parseFloat(taxManualAmount) > 0 ? 'text-red-700' : 'text-gray-400'}`}
                                                        placeholder="0.00"
                                                    />
                                                    <span className="text-sm text-gray-400 ml-2">บาท</span>
                                                </div>
                                            </div>
                                            {taxManualDesc && parseFloat(taxManualAmount) > 0 && (
                                                <div className="mt-3 bg-white rounded-lg border border-orange-100 px-3 py-2">
                                                    <p className="text-[11px] text-gray-400">จะบันทึกเป็น:</p>
                                                    <p className="text-sm font-semibold text-gray-700">
                                                        <span className="material-symbols-outlined text-red-500 text-sm align-middle mr-1">payments</span>
                                                        นำส่งภาษี 1% ({taxManualDesc}) จำนวน {fmtMoney(parseFloat(taxManualAmount))} บาท
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* === โหมดเงินปัจจัยยากจน - จ่าย === */}
                            {addFundType === 'fund-poor' && addTransactionType === 'expense' && (
                                <div className="mt-2">
                                    <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm text-purple-500">volunteer_activism</span>
                                        เลือกรายการรายรับปัจจัยยากจนที่ต้องการจ่าย
                                        {!selectedPoorIncomeId && (
                                            <span className="text-red-400 text-[10px] bg-red-50 border border-red-200 rounded-full px-2 py-0.5 ml-1">กรุณาเลือก</span>
                                        )}
                                    </label>
                                    <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                        {poorIncomeTransactions.length === 0 ? (
                                            <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                <span className="material-symbols-outlined text-2xl mb-1 opacity-50">inbox</span>
                                                <p className="text-xs">ยังไม่มีรายการรายรับปัจจัยยากจน</p>
                                                <p className="text-[10px] mt-1">กรุณาเพิ่มรายการรับก่อน</p>
                                            </div>
                                        ) : (
                                            poorIncomeTransactions.map((tx: any) => {
                                                const isSelected = selectedPoorIncomeId === tx.id;
                                                return (
                                                    <button
                                                        key={tx.id}
                                                        type="button"
                                                        onClick={() => setSelectedPoorIncomeId(isSelected ? null : tx.id)}
                                                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all border-2 flex justify-between items-center gap-2 ${isSelected
                                                            ? 'bg-purple-50 border-purple-400 shadow-sm shadow-purple-100'
                                                            : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected
                                                                ? 'border-purple-500 bg-purple-500'
                                                                : 'border-gray-300'
                                                                }`}>
                                                                {isSelected && (
                                                                    <span className="material-symbols-outlined text-[12px] text-white">check</span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-gray-800 truncate">{tx.description || tx.payer || 'ไม่ระบุรายการ'}</p>
                                                                <p className="text-[11px] text-gray-400">
                                                                    {fmtShort(tx.date)} • เอกสาร: {tx.docNo || '-'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold text-green-600 whitespace-nowrap shrink-0">
                                                            {fmtMoney(tx.income)} ฿
                                                        </span>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                    {selectedPoorIncomeId && (() => {
                                        const sel = poorIncomeTransactions.find((t: any) => t.id === selectedPoorIncomeId);
                                        if (!sel) return null;
                                        return (
                                            <div className="mt-3 space-y-2">
                                                <div className="bg-purple-50/60 rounded-xl border border-purple-200 px-4 py-3">
                                                    <label className="text-xs font-semibold text-purple-700 block mb-1">จำนวนเงินที่จ่าย (บาท)</label>
                                                    <div className={`flex items-center rounded-lg px-3 py-2 border ${parseFloat(customExpenseAmount) > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-purple-200'}`}>
                                                        <input
                                                            type="number" step="0.01"
                                                            value={customExpenseAmount}
                                                            onChange={e => setCustomExpenseAmount(e.target.value)}
                                                            className={`w-full text-base font-bold text-right outline-none bg-transparent ${parseFloat(customExpenseAmount) > 0 ? 'text-red-700' : 'text-gray-400'}`}
                                                            placeholder={`สูงสุด ${fmtMoney(sel.income)}`}
                                                        />
                                                        <span className="text-sm text-gray-400 ml-2">บาท</span>
                                                    </div>
                                                    <p className="text-[10px] text-purple-500 mt-1">รายการ: {sel.description || 'เงินปัจจัยพื้นฐานนักเรียนยากจน'} (รับมา {fmtMoney(sel.income)} บาท)</p>
                                                </div>
                                                {parseFloat(customExpenseAmount) > 0 && (
                                                    <div className="bg-white rounded-lg border border-purple-100 px-3 py-2">
                                                        <p className="text-[11px] text-gray-400">จะบันทึกเป็น:</p>
                                                        <p className="text-sm font-semibold text-gray-700">
                                                            <span className="material-symbols-outlined text-red-500 text-sm align-middle mr-1">payments</span>
                                                            จ่าย{sel.description || 'เงินปัจจัยพื้นฐานนักเรียนยากจน'} จำนวน {fmtMoney(parseFloat(customExpenseAmount))} บาท
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* === โหมดเงิน กสศ. - จ่าย === */}
                            {addFundType === 'fund-eef' && addTransactionType === 'expense' && (
                                <div className="mt-2">
                                    <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm text-teal-500">volunteer_activism</span>
                                        เลือกรายการรายรับ กสศ. ที่ต้องการจ่าย
                                        {!selectedEefIncomeId && (
                                            <span className="text-red-400 text-[10px] bg-red-50 border border-red-200 rounded-full px-2 py-0.5 ml-1">กรุณาเลือก</span>
                                        )}
                                    </label>
                                    <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                        {eefIncomeTransactions.length === 0 ? (
                                            <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                <span className="material-symbols-outlined text-2xl mb-1 opacity-50">inbox</span>
                                                <p className="text-xs">ยังไม่มีรายการรายรับ กสศ.</p>
                                                <p className="text-[10px] mt-1">กรุณาเพิ่มรายการรับก่อน</p>
                                            </div>
                                        ) : (
                                            eefIncomeTransactions.map((tx: any) => {
                                                const isSelected = selectedEefIncomeId === tx.id;
                                                return (
                                                    <button
                                                        key={tx.id}
                                                        type="button"
                                                        onClick={() => setSelectedEefIncomeId(isSelected ? null : tx.id)}
                                                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all border-2 flex justify-between items-center gap-2 ${isSelected
                                                            ? 'bg-teal-50 border-teal-400 shadow-sm shadow-teal-100'
                                                            : 'bg-white border-gray-200 hover:border-teal-300 hover:bg-teal-50/30'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected
                                                                ? 'border-teal-500 bg-teal-500'
                                                                : 'border-gray-300'
                                                                }`}>
                                                                {isSelected && (
                                                                    <span className="material-symbols-outlined text-[12px] text-white">check</span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-gray-800 truncate">{tx.description || tx.payer || 'ไม่ระบุรายการ'}</p>
                                                                <p className="text-[11px] text-gray-400">
                                                                    {fmtShort(tx.date)} • เอกสาร: {tx.docNo || '-'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold text-green-600 whitespace-nowrap shrink-0">
                                                            {fmtMoney(tx.income)} ฟ
                                                        </span>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                    {selectedEefIncomeId && (() => {
                                        const sel = eefIncomeTransactions.find((t: any) => t.id === selectedEefIncomeId);
                                        if (!sel) return null;
                                        return (
                                            <div className="mt-3 space-y-2">
                                                <div className="bg-teal-50/60 rounded-xl border border-teal-200 px-4 py-3">
                                                    <label className="text-xs font-semibold text-teal-700 block mb-1">จำนวนเงินที่จ่าย (บาท)</label>
                                                    <div className={`flex items-center rounded-lg px-3 py-2 border ${parseFloat(customExpenseAmount) > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-teal-200'}`}>
                                                        <input
                                                            type="number" step="0.01"
                                                            value={customExpenseAmount}
                                                            onChange={e => setCustomExpenseAmount(e.target.value)}
                                                            className={`w-full text-base font-bold text-right outline-none bg-transparent ${parseFloat(customExpenseAmount) > 0 ? 'text-red-700' : 'text-gray-400'}`}
                                                            placeholder={`สูงสุด ${fmtMoney(sel.income)}`}
                                                        />
                                                        <span className="text-sm text-gray-400 ml-2">บาท</span>
                                                    </div>
                                                    <p className="text-[10px] text-teal-600 mt-1">รายการ: {sel.description || 'เงิน กสศ.'} (รับมา {fmtMoney(sel.income)} บาท)</p>
                                                </div>
                                                {parseFloat(customExpenseAmount) > 0 && (
                                                    <div className="bg-white rounded-lg border border-teal-100 px-3 py-2">
                                                        <p className="text-[11px] text-gray-400">จะบันทึกเป็น:</p>
                                                        <p className="text-sm font-semibold text-gray-700">
                                                            <span className="material-symbols-outlined text-red-500 text-sm align-middle mr-1">payments</span>
                                                            จ่าย{sel.description || 'เงิน กสศ.'} จำนวน {fmtMoney(parseFloat(customExpenseAmount))} บาท
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* === โหมดเงินรายได้แผ่นดิน - จ่าย === */}
                            {addFundType === 'fund-state' && addTransactionType === 'expense' && (
                                <div className="mt-2">
                                    {/* ปุ่มสลับโหมด */}
                                    <div className="flex gap-1.5 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => { setIsStateManualMode(false); setStateManualDesc(''); setStateManualAmount(''); }}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${!isStateManualMode
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-sm align-middle mr-0.5">list</span>
                                            เลือกจากรายการรับ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setIsStateManualMode(true); setSelectedStateIncomeId(null); }}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${isStateManualMode
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-sm align-middle mr-0.5">edit_note</span>
                                            กรอกเอง (ยอดยกมา)
                                        </button>
                                    </div>

                                    {!isStateManualMode ? (
                                        /* โหมดเลือกจากรายการรับ */
                                        <>
                                            <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm text-blue-500">account_balance</span>
                                                เลือกรายการรายรับเงินรายได้แผ่นดิน (ดอกเบี้ย) ที่ต้องการจ่าย
                                                {!selectedStateIncomeId && (
                                                    <span className="text-red-400 text-[10px] bg-red-50 border border-red-200 rounded-full px-2 py-0.5 ml-1">กรุณาเลือก</span>
                                                )}
                                            </label>
                                            <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                                {stateIncomeTransactions.length === 0 ? (
                                                    <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                        <span className="material-symbols-outlined text-2xl mb-1 opacity-50">inbox</span>
                                                        <p className="text-xs">ยังไม่มีรายการรายรับเงินรายได้แผ่นดิน</p>
                                                        <p className="text-[10px] mt-1">หากเป็นยอดยกมา กรุณาใช้โหมด "กรอกเอง" แทน</p>
                                                    </div>
                                                ) : (
                                                    stateIncomeTransactions.map((tx: any) => {
                                                        const isSelected = selectedStateIncomeId === tx.id;
                                                        return (
                                                            <button
                                                                key={tx.id}
                                                                type="button"
                                                                onClick={() => setSelectedStateIncomeId(isSelected ? null : tx.id)}
                                                                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all border-2 flex justify-between items-center gap-2 ${isSelected
                                                                    ? 'bg-blue-50 border-blue-400 shadow-sm shadow-blue-100'
                                                                    : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected
                                                                        ? 'border-blue-500 bg-blue-500'
                                                                        : 'border-gray-300'
                                                                        }`}>
                                                                        {isSelected && (
                                                                            <span className="material-symbols-outlined text-[12px] text-white">check</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="font-medium text-gray-800 truncate">{tx.description || tx.payer || 'ไม่ระบุรายการ'}</p>
                                                                        <p className="text-[11px] text-gray-400">
                                                                            {fmtShort(tx.date)} • เอกสาร: {tx.docNo || '-'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-sm font-bold text-green-600 whitespace-nowrap shrink-0">
                                                                    {fmtMoney(tx.income)} ฿
                                                                </span>
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                            {selectedStateIncomeId && (() => {
                                                const sel = stateIncomeTransactions.find((t: any) => t.id === selectedStateIncomeId);
                                                if (!sel) return null;
                                                return (
                                                    <div className="mt-3 space-y-2">
                                                        <div className="bg-blue-50/60 rounded-xl border border-blue-200 px-4 py-3">
                                                            <label className="text-xs font-semibold text-blue-700 block mb-1">จำนวนเงินที่จ่าย (บาท)</label>
                                                            <div className={`flex items-center rounded-lg px-3 py-2 border ${parseFloat(customExpenseAmount) > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-blue-200'}`}>
                                                                <input
                                                                    type="number" step="0.01"
                                                                    value={customExpenseAmount}
                                                                    onChange={e => setCustomExpenseAmount(e.target.value)}
                                                                    className={`w-full text-base font-bold text-right outline-none bg-transparent ${parseFloat(customExpenseAmount) > 0 ? 'text-red-700' : 'text-gray-400'}`}
                                                                    placeholder={`สูงสุด ${fmtMoney(sel.income)}`}
                                                                />
                                                                <span className="text-sm text-gray-400 ml-2">บาท</span>
                                                            </div>
                                                            <p className="text-[10px] text-blue-500 mt-1">รายการ: {sel.description || 'เงินรายได้แผ่นดิน'} (รับมา {fmtMoney(sel.income)} บาท)</p>
                                                        </div>
                                                        {parseFloat(customExpenseAmount) > 0 && (
                                                            <div className="bg-white rounded-lg border border-blue-100 px-3 py-2">
                                                                <p className="text-[11px] text-gray-400">จะบันทึกเป็น:</p>
                                                                <p className="text-sm font-semibold text-gray-700">
                                                                    <span className="material-symbols-outlined text-red-500 text-sm align-middle mr-1">payments</span>
                                                                    ส่งดอกเบี้ย ({sel.description || 'เงินรายได้แผ่นดิน'}) จำนวน {fmtMoney(parseFloat(customExpenseAmount))} บาท
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    ) : (
                                        /* โหมดกรอกเอง (ยอดยกมา) */
                                        <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-4">
                                            <p className="text-[11px] text-blue-600 mb-3 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">info</span>
                                                สำหรับยอดยกมาที่ไม่มีรายการรับให้เลือก
                                            </p>
                                            <label className="text-xs font-semibold text-blue-700 mb-1 block">รายละเอียดการจ่าย</label>
                                            <input
                                                type="text"
                                                value={stateManualDesc}
                                                onChange={e => setStateManualDesc(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-blue-200 bg-white text-base outline-none focus:border-blue-400 transition-colors"
                                                placeholder="เช่น ส่งดอกเบี้ยอาหารกลางวันเป็นเงินรายได้แผ่นดิน"
                                            />
                                            <div className="mt-3">
                                                <label className="text-xs font-semibold text-blue-700 mb-1 block">จำนวนเงิน</label>
                                                <div className={`flex items-center rounded-xl px-4 py-3 border ${parseFloat(stateManualAmount) > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-blue-200'}`}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={stateManualAmount}
                                                        onChange={e => setStateManualAmount(e.target.value)}
                                                        className={`w-full text-base font-bold text-right outline-none bg-transparent ${parseFloat(stateManualAmount) > 0 ? 'text-red-700' : 'text-gray-400'}`}
                                                        placeholder="0.00"
                                                    />
                                                    <span className="text-sm text-gray-400 ml-2">บาท</span>
                                                </div>
                                            </div>
                                            {stateManualDesc && parseFloat(stateManualAmount) > 0 && (
                                                <div className="mt-3 bg-white rounded-lg border border-blue-100 px-3 py-2">
                                                    <p className="text-[11px] text-gray-400">จะบันทึกเป็น:</p>
                                                    <p className="text-sm font-semibold text-gray-700">
                                                        <span className="material-symbols-outlined text-red-500 text-sm align-middle mr-1">payments</span>
                                                        ส่งดอกเบี้ย ({stateManualDesc}) จำนวน {fmtMoney(parseFloat(stateManualAmount))} บาท
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* === โหมดปกติ (ไม่ใช่ภาษี 1%, ปัจจัยยากจน, กสศ., รายได้แผ่นดิน โหมดจ่าย) === */}
                            {!(addFundType === 'fund-tax') && !(addFundType === 'fund-poor' && addTransactionType === 'expense') && !(addFundType === 'fund-eef' && addTransactionType === 'expense') && !(addFundType === 'fund-state' && addTransactionType === 'expense') && (
                                <>
                                    {/* Separator with count */}
                                    <div className="flex items-center justify-between py-3 border-t border-gray-200 mt-2">
                                        <span className="text-sm text-gray-400">
                                            {subItems.length} รายการ
                                            <span className="text-gray-300 ml-1">• ไม่ใส่เงิน = หัวรายการ</span>
                                        </span>
                                        <button type="button" onClick={addSubItem}
                                            className="text-sm text-blue-500 font-semibold hover:text-blue-700 transition-colors">+ เพิ่มรายการ</button>
                                    </div>

                                    {/* Sub-items list */}
                                    <div className="space-y-2 pb-2">
                                        {subItems.map((s, idx) => {
                                            const hasAmount = s.amount && parseFloat(s.amount) > 0;
                                            const isHeader = !hasAmount && s.description;
                                            return (
                                                <div key={s.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${isHeader
                                                    ? 'bg-slate-50 border-slate-200'
                                                    : 'bg-white border-gray-200 hover:border-blue-300'
                                                    }`}>
                                                    {subItems.length > 1 ? (
                                                        <button type="button" onClick={() => removeSubItem(s.id)}
                                                            className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center shrink-0 hover:border-red-400 hover:bg-red-50 transition-all group">
                                                            <span className="material-symbols-outlined text-[12px] text-gray-300 group-hover:text-red-400">close</span>
                                                        </button>
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center shrink-0">
                                                            <span className="material-symbols-outlined text-[12px] text-white">check</span>
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <input type="text" value={s.description}
                                                            onChange={e => updateSub(s.id, 'description', e.target.value)}
                                                            className={`w-full py-1 text-sm outline-none placeholder:text-gray-300 bg-transparent ${isHeader ? 'font-semibold text-gray-600' : 'font-medium text-gray-900'
                                                                }`}
                                                            placeholder={!s.amount ? 'ชื่อหัว/รายการ' : `รายการที่ ${idx + 1}`} />
                                                    </div>
                                                    <div className={`flex items-center rounded-lg px-2.5 py-1 border ${hasAmount
                                                        ? addTransactionType === 'income'
                                                            ? 'bg-green-50 border-green-200'
                                                            : 'bg-red-50 border-red-200'
                                                        : 'bg-gray-50 border-gray-200'
                                                        }`}>
                                                        <input type="number" step="0.01" value={s.amount}
                                                            onChange={e => updateSub(s.id, 'amount', e.target.value)}
                                                            className={`w-28 py-0.5 text-sm font-bold text-right outline-none bg-transparent ${hasAmount
                                                                ? addTransactionType === 'income' ? 'text-green-700' : 'text-red-700'
                                                                : 'text-gray-400'
                                                                }`}
                                                            placeholder="จำนวนเงิน" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Payee type selector - expense only */}
                                    {addTransactionType === 'expense' && (
                                        <div className="mt-4">
                                            <label className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                                                ประเภทผู้รับเงิน
                                                {!addPayeeType && (
                                                    <span className="text-red-400 text-[10px] bg-red-50 border border-red-200 rounded-full px-2 py-0.5 ml-1">กรุณาเลือก</span>
                                                )}
                                            </label>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => setAddPayeeType('legal')}
                                                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${addPayeeType === 'legal'
                                                        ? 'bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-200'
                                                        : addPayeeType === null
                                                            ? 'bg-white border-dashed border-gray-300 text-gray-400 hover:border-blue-300 hover:text-blue-500'
                                                            : 'bg-gray-50 border-gray-200 text-gray-400'
                                                        }`}>
                                                    <span className="material-symbols-outlined text-base align-middle mr-1">business</span>
                                                    นิติบุคคล
                                                </button>
                                                <button type="button" onClick={() => setAddPayeeType('person')}
                                                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${addPayeeType === 'person'
                                                        ? 'bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-200'
                                                        : addPayeeType === null
                                                            ? 'bg-white border-dashed border-gray-300 text-gray-400 hover:border-blue-300 hover:text-blue-500'
                                                            : 'bg-gray-50 border-gray-200 text-gray-400'
                                                        }`}>
                                                    <span className="material-symbols-outlined text-base align-middle mr-1">person</span>
                                                    บุคคลธรรมดา
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Total */}
                            {subTotal > 0 && (
                                <div className="flex justify-between items-center py-3 border-t border-gray-200 mt-2">
                                    <span className="text-sm font-medium text-gray-500">ยอดรวม</span>
                                    <span className={`text-lg font-bold ${addTransactionType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {fmtMoney(subTotal)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Bottom buttons */}
                        <div className="px-8 py-4 flex justify-between items-center shrink-0 border-t border-gray-100">
                            <button type="button" onClick={() => setIsAddOpen(false)}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                                ยกเลิก
                            </button>
                            <button type="submit"
                                className={`px-8 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all ${addTransactionType === 'income' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                                บันทึก{addTransactionType === 'income' ? 'รายรับ' : 'รายจ่าย'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Carry Forward Modal */}
            {isCarryForwardOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-amber-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-amber-700">input</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">ยกยอดคงเหลือจากปี {prevFyBE}</h3>
                                    <p className="text-xs text-amber-700">เข้าปีงบประมาณ {fyBE}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCarryForwardOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-3">
                            {carryForwardItems.length === 0 && !isManualMode ? (
                                <div className="text-center py-8 text-gray-400">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">account_balance_wallet</span>
                                    <p className="text-sm">ไม่พบยอดคงเหลือจากปี {prevFyBE}</p>
                                    <p className="text-xs mt-1">คุณสามารถกรอกยอดด้วยตัวเองได้</p>
                                </div>
                            ) : (
                                carryForwardItems.map((item, idx) => {
                                    const alreadyCarried = carriedFundTypes.has(item.fundType);
                                    return (
                                        <div key={item.fundType + idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${alreadyCarried
                                            ? 'border-green-200 bg-green-50/50 opacity-70'
                                            : 'border-gray-200 bg-gray-50/50 hover:border-amber-200'
                                            }`}>
                                            <div className="flex-1 min-w-0">
                                                {isManualMode && !alreadyCarried ? (
                                                    <select
                                                        value={item.fundType}
                                                        onChange={e => {
                                                            const opt = FUND_TYPE_OPTIONS.find(o => o.value === e.target.value);
                                                            setCarryForwardItems(prev => prev.map((it, i) => i === idx ? { ...it, fundType: e.target.value, label: opt?.label || e.target.value } : it));
                                                        }}
                                                        className="w-full text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-amber-300"
                                                    >
                                                        {FUND_TYPE_OPTIONS.filter(o => !carriedFundTypes.has(o.value)).map(o => (
                                                            <option key={o.value} value={o.value}>{o.label}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-gray-700 truncate">{item.label}</p>
                                                        {alreadyCarried && (
                                                            <span className="text-[10px] font-bold text-green-600 bg-green-100 border border-green-200 rounded-full px-2 py-0.5 whitespace-nowrap flex items-center gap-0.5">
                                                                <span className="material-symbols-outlined text-[11px]">check_circle</span>
                                                                นำเข้าแล้ว
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {isManualMode && !alreadyCarried ? (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.balance || ''}
                                                        onChange={e => setCarryForwardItems(prev => prev.map((it, i) => i === idx ? { ...it, balance: parseFloat(e.target.value) || 0 } : it))}
                                                        className="w-32 px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-sm font-bold text-right text-amber-700 outline-none focus:border-amber-400"
                                                        placeholder="0.00"
                                                    />
                                                ) : (
                                                    <span className={`text-sm font-bold px-3 py-1.5 rounded-lg border ${alreadyCarried
                                                        ? 'text-green-700 bg-green-50 border-green-200'
                                                        : 'text-amber-700 bg-amber-50 border-amber-200'
                                                        }`}>
                                                        {fmtMoney(item.balance)}
                                                    </span>
                                                )}
                                                {isManualMode && !alreadyCarried && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setCarryForwardItems(prev => prev.filter((_, i) => i !== idx))}
                                                        className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {isManualMode && (
                                <button
                                    type="button"
                                    onClick={handleAddManualFund}
                                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-amber-300 hover:text-amber-600 transition-colors flex items-center justify-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-base">add</span>
                                    เพิ่มหมวดเงิน
                                </button>
                            )}

                            {/* ยอดรวม */}
                            {carryForwardItems.length > 0 && (
                                <div className="flex justify-between items-center py-3 border-t border-gray-200 mt-2">
                                    <span className="text-sm font-medium text-gray-500">ยอดรวมทั้งหมด</span>
                                    <span className="text-lg font-bold text-amber-700">
                                        {fmtMoney(carryForwardItems.reduce((s, i) => s + (i.balance || 0), 0))} บาท
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2 shrink-0 bg-gray-50/50">
                            {!isManualMode && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsManualMode(true);
                                        if (carryForwardItems.length === 0) {
                                            handleAddManualFund();
                                        }
                                    }}
                                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-base">edit_note</span>
                                    กรอกยอดคงเหลือด้วยตัวเอง
                                </button>
                            )}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCarryForwardOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCarryForwardConfirm}
                                    disabled={carryForwardItems.filter(i => i.balance > 0).length === 0}
                                    className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-base">check</span>
                                    ยืนยันยกยอด
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
