import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolContext';
import { FUND_TYPE_OPTIONS } from '../../utils';
import ThaiDatePicker from '../ThaiDatePicker';
import { fmtShort, fmtMoney, fmtBankShort } from './utils';
import { buildLoanDocPDF } from '../loanPdfBuilder';
import BankDetailModal from './BankDetailModal';
import ConfirmModal from '../ConfirmModal';
import DeleteConfirmModal from '../DeleteConfirmModal';

interface CashBookAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaxWarning: (amount: number, payeeType: 'legal' | 'person') => void;
    initialTransactionType?: 'income' | 'expense';
}

const CashBookAddModal: React.FC<CashBookAddModalProps> = ({ isOpen, onClose, onTaxWarning, initialTransactionType = 'income' }) => {
    const { transactions, addTransaction, schoolSettings, addLoan, getNextDocNo } = useSchoolData();

    const [addTransactionType, setAddTransactionType] = useState<'income' | 'expense'>(initialTransactionType);
    const [isGroupMode, setIsGroupMode] = useState(false);

    // Borrow Mode - ยืมเงิน within the modal
    const [showBorrowMode, setShowBorrowMode] = useState(false);
    const [borrowFromFund, setBorrowFromFund] = useState('');
    const [borrowAmount, setBorrowAmount] = useState('');
    const [borrowPurpose, setBorrowPurpose] = useState('');
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
    const [borrowSubmitted, setBorrowSubmitted] = useState(false);
    const [selectedBankId, setSelectedBankId] = useState('');

    // Shared header fields
    const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));
    const [addProject, setAddProject] = useState(''); // New field for Project
    const [addFundType, setAddFundType] = useState('fund-subsidy');
    const [isFundDropdownOpen, setIsFundDropdownOpen] = useState(false);
    const [isEditingFund, setIsEditingFund] = useState(false);
    const [addFundSearch, setAddFundSearch] = useState('');
    const [addDocNo, setAddDocNo] = useState('');
    const [addBankId, setAddBankId] = useState<string>('');
    const [isEditingBank, setIsEditingBank] = useState(false);

    // Modal Notifications
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'warning' | 'error' | 'success';
        onConfirm?: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const showAlert = (title: string, message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
        setModalConfig({ isOpen: true, title, message, type });
    };

    // Bank Detail Sub-modal
    const [isBankDetailOpen, setIsBankDetailOpen] = useState(false);
    const [selectedBankDetailId, setSelectedBankDetailId] = useState<string | null>(null);

    // Delete Modal
    const [deleteModalConfig, setDeleteModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: (reason: string) => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // --- Macro / Automation Helper ---
    // Removed per user request

    const currentFiscalYear = useMemo(() => {
        const d = new Date(addDate);
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        return (month >= 10 ? year + 1 : year) + 543;
    }, [addDate]);

    // --- Inject Auto Doc Number Effect ---
    React.useEffect(() => {
        if (!isOpen) return;

        if (showBorrowMode) {
            setAddDocNo(getNextDocNo('borrow', currentFiscalYear));
        } else {
            setAddDocNo(getNextDocNo(addTransactionType, currentFiscalYear));
        }
    }, [isOpen, addTransactionType, showBorrowMode, currentFiscalYear, getNextDocNo]);
    // -------------------------------------


    // Sub-items: description + amount (empty amount = header row)
    // โหมดกลุ่ม: แต่ละรายการมี fundType ของตัวเอง
    interface SubItem { id: number; description: string; amount: string; fundType?: string; bankId?: string; }
    const createSubItem = (): SubItem => ({ id: Date.now() + Math.random(), description: '', amount: '', fundType: addFundType || 'fund-subsidy', bankId: addBankId || '' });
    const [subItems, setSubItems] = useState<SubItem[]>([createSubItem()]);

    // --- Smart Auto-fill: Observe descriptions and suggest fund/bank ---
    const [lastAutoFilledDesc, setLastAutoFilledDesc] = useState<string>('');
    React.useEffect(() => {
        if (!isOpen || isGroupMode || showBorrowMode) return;

        // Use the first active subItem's description for single-mode auto-fill
        const currentDesc = subItems[0]?.description?.trim();
        if (!currentDesc || currentDesc.length < 3 || currentDesc === lastAutoFilledDesc) return;

        // Debounce slightly by checking if typing paused (we just do a direct check here for simplicity, 
        // real debounce would use a timeout, but since React state updates are fast enough, we just check exact match).
        const timer = setTimeout(() => {
            // Find past transactions with the EXACT same description
            const matches = transactions.filter(t =>
                t.description?.trim().toLowerCase() === currentDesc.toLowerCase() &&
                ((addTransactionType === 'income' && (t.income || 0) > 0) ||
                    (addTransactionType === 'expense' && (t.expense || 0) > 0))
            );

            if (matches.length > 0) {
                // Count frequencies
                const fundFreq: Record<string, number> = {};
                const bankFreq: Record<string, number> = {};

                matches.forEach(m => {
                    if (m.fundType) fundFreq[m.fundType] = (fundFreq[m.fundType] || 0) + 1;
                    if (m.bankId) bankFreq[m.bankId] = (bankFreq[m.bankId] || 0) + 1;
                });

                // Find most frequent
                let bestFund = '';
                let maxFundFreq = 0;
                for (const [f, c] of Object.entries(fundFreq)) {
                    if (c > maxFundFreq) { maxFundFreq = c; bestFund = f; }
                }

                let bestBank = '';
                let maxBankFreq = 0;
                for (const [b, c] of Object.entries(bankFreq)) {
                    if (c > maxBankFreq) { maxBankFreq = c; bestBank = b; }
                }

                if (bestFund && bestFund !== addFundType) {
                    setAddFundType(bestFund);
                }
                if (bestBank && bestBank !== addBankId) {
                    setAddBankId(bestBank);
                }

                setLastAutoFilledDesc(currentDesc);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [isOpen, subItems[0]?.description, isGroupMode, showBorrowMode, transactions, addTransactionType, addFundType, addBankId, lastAutoFilledDesc]);
    // -------------------------------------------------------------------

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
    // extract fund name: remove "รับภาษี 1% " or "รับเงิน " prefix
    const extractFundName = (desc: string) => {
        let result = desc
            .replace(/^รับภาษี 1%\s+/, '')  // "รับภาษี 1% X" → "X"
            .replace(/^รับเงิน\s+/, '')        // "รับเงิน X" → "X"
        return result;
    };

    const taxIncomeTransactions = useMemo(() => {
        return transactions
            .filter((t: any) => t.fundType === 'fund-tax' && (t.income || 0) > 0)
            .map((t: any) => {
                const spent = transactions
                    .filter((exp: any) => exp.fundType === 'fund-tax' && exp.incomeRefId === t.id)
                    .reduce((sum: number, exp: any) => sum + (exp.expense || 0), 0);
                const isPaid = spent >= (t.income || 0);
                return { ...t, remaining: (t.income || 0) - spent, isPaid };
            })
            .filter((t: any) => t.remaining > 0.01 || !t.isPaid)
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
            .filter((t: any) => t.fundType?.startsWith('fund-state') && (t.income || 0) > 0)
            .map((t: any) => {
                const spent = transactions
                    .filter((exp: any) => exp.fundType?.startsWith('fund-state') && (exp.incomeRefId === t.id || (!exp.incomeRefId && exp.description === `ส่งดอกเบี้ย (${t.description || 'เงินรายได้แผ่นดิน'})`)))
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
    const [isViewMode, setIsViewMode] = useState(false); // ดูรายการที่ยกครบแล้ว

    // Cash Book fund filter
    const [cashBookFilter, setCashBookFilter] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [pdfDateRange, setPdfDateRange] = useState(''); // e.g. "1/5/2568-9/5/2568"

    const updateSub = (id: number, field: 'description' | 'amount' | 'fundType' | 'bankId', value: string) => {
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

    // Calculate fund balance for borrow mode
    const fundBalance = useMemo(() => {
        if (!borrowFromFund) return 0;
        return transactions
            .filter(t => t.fundType === borrowFromFund)
            .reduce((sum, t) => sum + (t.income || 0) - (t.expense || 0), 0);
    }, [transactions, borrowFromFund]);

    const borrowAmountNum = parseFloat(borrowAmount) || 0;
    const shortfallAmount = Math.max(0, borrowAmountNum - fundBalance);

    const handleBorrowSubmit = async () => {
        if (!borrowFromFund) {
            showAlert('กรุณากรอกข้อมูล', 'กรุณาเลือกกองทุนต้นทาง', 'warning');
            return;
        }

        if (!borrowAmountNum || borrowAmountNum <= 0) {
            showAlert('กรุณากรอกข้อมูล', 'กรุณากรอกจำนวนเงิน', 'warning');
            return;
        }

        if (!borrowPurpose) {
            showAlert('กรุณากรอกข้อมูล', 'กรุณากรอกวัตถุประสงค์การยืม', 'warning');
            return;
        }

        const borrowPrefix = schoolSettings.docNumberSettings?.borrowPrefix || 'LN-';
        const sequence = String(new Date().getTime()).slice(-4);
        const docYear = new Date().getFullYear() + 543;
        const loanId = `${borrowPrefix}${docYear}-${sequence}`;
        const today = new Date().toISOString().slice(0, 10);

        const newLoan = {
            id: loanId,
            requester: schoolSettings.financeOfficerName || 'เจ้าหน้าที่การเงิน',
            project: borrowPurpose,
            amount: borrowAmountNum,
            dateBorrowed: today,
            dueDate: today,
            status: 'active' as const,
            fromFund: borrowFromFund,
            toFund: borrowPurpose,
            returnedAmount: 0,
        };

        try {
            setIsGeneratingPDF(true);

            const baseId = Date.now();
            const loanDocNo = getNextDocNo('borrow', currentFiscalYear);

            // Order: 1. ยืมเงิน -> 2. รับเงินยืม (Top to Bottom in Latest First)
            // 1. Lend Out (ขอยืม/ยืมเงิน) -> Highest ID (Top)
            const expenseTx = {
                id: baseId + 10,
                date: today,
                docNo: loanDocNo,
                description: `ยืมเงินให้โครงการ/งาน ${borrowPurpose}`,
                fundType: borrowFromFund,
                income: 0,
                expense: borrowAmountNum,
                loanId,
                skipLoanCheck: true,
                bankId: selectedBankId
            };

            // 2. Borrow In (รับเงินยืม) -> Lowest ID (Bottom)
            const incomeTx = {
                id: baseId,
                date: today,
                docNo: loanDocNo,
                description: `รับเงินยืมจาก ${FUND_TYPE_OPTIONS.find(f => f.value === borrowFromFund)?.label || borrowFromFund} เพื่อ ${borrowPurpose}`,
                fundType: borrowPurpose,
                income: borrowAmountNum,
                expense: 0,
                loanId,
                skipLoanCheck: true,
                bankId: selectedBankId
            };

            await addTransaction(expenseTx);
            await addTransaction(incomeTx);

            // Add loan record
            addLoan(newLoan);

            // Generate PDF as blob
            const pdfBytes = await buildLoanDocPDF(newLoan, false, schoolSettings, today);
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfBlobUrl(url);
            setBorrowSubmitted(true);

            setIsGeneratingPDF(false);
        } catch (e) {
            console.warn('Error creating loan', e);
            setIsGeneratingPDF(false);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการสร้างสัญญา: ' + String(e), 'error');
        }
    };

    const handleDownloadBorrowPDF = () => {
        if (pdfBlobUrl) {
            const a = document.createElement('a');
            a.href = pdfBlobUrl;
            a.download = `loan-${new Date().toISOString().slice(0, 10)}.pdf`;
            a.click();

            // Reset borrow mode
            setBorrowAmount('');
            setBorrowPurpose('');
            setSelectedBankId('');
            setPdfBlobUrl(null);
            setBorrowSubmitted(false);
            setShowBorrowMode(false);
        }
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (showBorrowMode) {
            handleBorrowSubmit();
            return;
        }

        // === โหมดกลุ่ม ===
        if (isGroupMode) {
            if (!addDocNo) {
                showAlert('กรุณากรอกข้อมูล', 'กรุณากรอกที่เอกสาร', 'warning');
                return;
            }
            const dataItems = subItems.filter(s => {
                const amt = parseFloat(s.amount);
                return amt > 0 && !isNaN(amt) && s.description;
            });
            if (dataItems.length === 0) {
                showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกรายการย่อยอย่างน้อย 1 รายการ (ชื่อรายการ + จำนวนเงิน)', 'warning');
                return;
            }

            for (let idx = 0; idx < dataItems.length; idx++) {
                const s = dataItems[idx];
                const amt = parseFloat(s.amount);
                const itemFundType = s.fundType || 'fund-subsidy';
                addTransaction({
                    id: Date.now() + idx,
                    date: addDate,
                    docNo: addDocNo,
                    description: s.description,
                    fundType: itemFundType,
                    income: addTransactionType === 'income' ? amt : 0,
                    expense: addTransactionType === 'expense' ? amt : 0,
                    payer: addTransactionType === 'income' ? '' : '',
                    payee: addTransactionType === 'expense' ? '' : '',
                    bankId: s.bankId
                });
            }

            onClose();
            setSubItems([createSubItem()]);
            setAddDate(new Date().toISOString().slice(0, 10));
            setAddDocNo('');
            setAddPayeeType(null);
            setAddFundSearch('');
            setAddBankId('');
            return;
        }

        const isTaxMode = addFundType === 'fund-tax';
        const isPoorExpense = addFundType === 'fund-poor' && addTransactionType === 'expense';
        const isStateExpense = addFundType?.startsWith('fund-state') && addTransactionType === 'expense';
        const isEefExpense = addFundType === 'fund-eef' && addTransactionType === 'expense';

        // === โหมดภาษี 1% ===
        if (isTaxMode) {
            if (!addDocNo) {
                showAlert('กรุณากรอกข้อมูล', 'กรุณากรอกที่เอกสาร', 'warning');
                return;
            }

            if (addTransactionType === 'income') {
                const amt = parseFloat(taxAmount);
                if (!taxPayerName || isNaN(amt) || amt <= 0) {
                    showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อผู้จ่าย (ร้านค้า) และจำนวนเงิน', 'warning');
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
                if (isTaxManualMode) {
                    const amt = parseFloat(taxManualAmount);
                    if (!taxManualDesc || isNaN(amt) || amt <= 0) {
                        showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกรายละเอียดและจำนวนเงิน', 'warning');
                        return;
                    }
                    const fundBalance = transactions
                        .filter((t: any) => t.fundType === 'fund-tax' && t.date <= addDate)
                        .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
                    if (amt > fundBalance) {

                    }
                    addTransaction({
                        id: Date.now(),
                        date: addDate,
                        docNo: addDocNo,
                        description: `นำส่งภาษี 1% ${taxManualDesc}`,
                        fundType: 'fund-tax',
                        income: 0,
                        expense: amt,
                        payer: '',
                        payee: taxManualDesc,
                    });
                } else {
                    if (!selectedTaxIncomeId) {
                        showAlert('ยังไม่ได้เลือกรายการ', 'กรุณาเลือกรายการรายรับภาษี 1% ที่ต้องการจ่าย', 'warning');
                        return;
                    }
                    const selectedTx = taxIncomeTransactions.find((t: any) => t.id === selectedTaxIncomeId);
                    if (!selectedTx) {
                        showAlert('ข้อผิดพลาด', 'ไม่พบรายการที่เลือก', 'error');
                        return;
                    }
                    const fundBalance = transactions
                        .filter((t: any) => t.fundType === 'fund-tax' && t.date <= addDate)
                        .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
                    if (selectedTx.income > fundBalance) {

                    }
                    addTransaction({
                        id: Date.now(),
                        date: addDate,
                        docNo: addDocNo,
                        description: `นำส่งภาษี 1% ${extractFundName(selectedTx.description || selectedTx.payer || 'ไม่ระบุ')}`,
                        fundType: 'fund-tax',
                        income: 0,
                        expense: selectedTx.income,
                        payer: '',
                        payee: selectedTx.payer || selectedTx.description || '',
                        incomeRefId: selectedTx.id,
                    });
                }
            }

            onClose();
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
                showAlert('กรุณากรอกข้อมูล', 'กรุณากรอกที่เอกสาร', 'warning');
                return;
            }
            if (!selectedPoorIncomeId) {
                showAlert('ยังไม่ได้เลือกรายการ', 'กรุณาเลือกรายการรายรับปัจจัยยากจนที่ต้องการจ่าย', 'warning');
                return;
            }
            const selectedTx = poorIncomeTransactions.find((t: any) => t.id === selectedPoorIncomeId);
            if (!selectedTx) {
                showAlert('ข้อผิดพลาด', 'ไม่พบรายการที่เลือก', 'error');
                return;
            }
            const amt = parseFloat(customExpenseAmount);
            if (isNaN(amt) || amt <= 0) {
                showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกจำนวนเงินที่ต้องการจ่าย', 'warning');
                return;
            }
            const fundBalance = transactions
                .filter((t: any) => t.fundType === 'fund-poor' && t.date <= addDate)
                .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
            if (amt > fundBalance) {

            }
            const baseDesc = selectedTx.description || 'เงินปัจจัยพื้นฐานนักเรียนยากจน';
            const cleanDesc = extractFundName(baseDesc);
            addTransaction({
                id: Date.now(),
                date: addDate,
                docNo: addDocNo,
                description: `จ่ายเงิน${cleanDesc}`,
                fundType: 'fund-poor',
                income: 0,
                expense: amt,
                payer: '',
                payee: selectedTx.description || selectedTx.payer || '',
                incomeRefId: selectedTx.id,
            });

            onClose();
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
                showAlert('กรุณากรอกข้อมูล', 'กรุณากรอกที่เอกสาร', 'warning');
                return;
            }
            if (!selectedEefIncomeId) {
                showAlert('ยังไม่ได้เลือกรายการ', 'กรุณาเลือกรายการรายรับ กสศ. ที่ต้องการจ่าย', 'warning');
                return;
            }
            const selectedTx = eefIncomeTransactions.find((t: any) => t.id === selectedEefIncomeId);
            if (!selectedTx) {
                showAlert('ข้อผิดพลาด', 'ไม่พบรายการที่เลือก', 'error');
                return;
            }
            const amt = parseFloat(customExpenseAmount);
            if (isNaN(amt) || amt <= 0) {
                showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกจำนวนเงินที่ต้องการจ่าย', 'warning');
                return;
            }
            const fundBalance = transactions
                .filter((t: any) => t.fundType === 'fund-eef' && t.date <= addDate)
                .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
            if (amt > fundBalance) {

            }
            const baseDesc = selectedTx.description || 'เงิน กสศ.';
            const cleanDesc = extractFundName(baseDesc);
            const expenseDesc = `จ่ายเงิน${cleanDesc}`;
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

            onClose();
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
                showAlert('กรุณากรอกข้อมูล', 'กรุณากรอกที่เอกสาร', 'warning');
                return;
            }
            if (isStateManualMode) {
                const amt = parseFloat(stateManualAmount);
                if (!stateManualDesc || isNaN(amt) || amt <= 0) {
                    showAlert('กรุณากรอกข้อมูล', 'กรุณากรอกรายละเอียดและจำนวนเงิน', 'warning');
                    return;
                }
                const fundBalance = transactions
                    .filter((t: any) => t.fundType?.startsWith('fund-state') && t.date <= addDate)
                    .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
                if (amt > fundBalance) {

                }
                addTransaction({
                    id: Date.now(),
                    date: addDate,
                    docNo: addDocNo,
                    description: `ส่ง ดอกเบี้ยเงินอุดหนุน`,
                    fundType: addFundType || 'fund-state-subsidy-interest',
                    income: 0,
                    expense: amt,
                    payer: '',
                    payee: stateManualDesc,
                    bankId: addBankId || undefined,
                });
            } else {
                if (!selectedStateIncomeId) {
                    showAlert('กรุณากรอกข้อมูล', 'กรุณาเลือกรายการรายรับเงินรายได้แผ่นดินที่ต้องการจ่าย', 'warning');
                    return;
                }
                const selectedTx = stateIncomeTransactions.find((t: any) => t.id === selectedStateIncomeId);
                if (!selectedTx) {
                    showAlert('ข้อผิดพลาด', 'ไม่พบรายการที่เลือก', 'error');
                    return;
                }
                const amt = parseFloat(customExpenseAmount);
                if (isNaN(amt) || amt <= 0) {
                    showAlert('กรุณากรอกข้อมูล', 'กรุณากรอกจำนวนเงินที่ต้องการจ่าย', 'warning');
                    return;
                }
                const fundBalance = transactions
                    .filter((t: any) => t.fundType?.startsWith('fund-state') && t.date <= addDate)
                    .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
                if (amt > fundBalance) {

                }
                addTransaction({
                    id: Date.now(),
                    date: addDate,
                    docNo: addDocNo,
                    description: `ส่ง ดอกเบี้ยเงินอุดหนุน`,
                    fundType: selectedTx.fundType || 'fund-state-subsidy-interest',
                    income: 0,
                    expense: amt,
                    payer: '',
                    payee: selectedTx.description || selectedTx.payer || '',
                    incomeRefId: selectedTx.id,
                    bankId: selectedTx.bankId || undefined,
                });
            }

            onClose();
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
        const dataItems = subItems.filter(s => {
            const amt = parseFloat(s.amount);
            return amt > 0 && !isNaN(amt) && s.description;
        });
        const headerItem = subItems.find(s => s.description && (!s.amount || parseFloat(s.amount) === 0 || isNaN(parseFloat(s.amount))));
        const headerTitle = headerItem?.description || '';

        if (dataItems.length === 0 || !addDocNo) {
            showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกที่เอกสาร และรายการย่อยอย่างน้อย 1 รายการ (ชื่อรายการ + จำนวนเงิน)', 'warning');
            return;
        }

        const isInterestMode = addTransactionType === 'income' && addFundType === 'fund-state';

        if (addTransactionType === 'expense') {
            if (!addPayeeType) {
                showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกประเภทผู้รับเงิน (นิติบุคคล หรือ บุคคลธรรมดา)', 'warning');
                return;
            }
            const isTaxBorrowBypass = headerTitle.includes('ยืมจาก เงินภาษี 1%') || dataItems.some(d => d.description.includes('ยืมจาก เงินภาษี 1%'));
            if (!isTaxBorrowBypass) {
                const fundBalance = transactions
                    .filter((t: any) => t.fundType === addFundType && t.date <= addDate)
                    .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
            }
        }

        let invalidStateIncome = false;
        let missingBankTarget = false;

        for (let idx = 0; idx < dataItems.length; idx++) {
            const s = dataItems[idx];
            const amt = parseFloat(s.amount);

            let finalFundType = addFundType;
            let finalBankId = addBankId || undefined;
            const descMatch = (s.description || '').toLowerCase();

            if (addTransactionType === 'expense') {
                if (descMatch.includes('เบิกดอกเบี้ยบัญชีเงินอุดหนุนส่งเขต')) {
                    finalFundType = 'fund-state-subsidy-interest';
                    finalBankId = schoolSettings.bankAccounts?.find((b: any) => b.name.includes('อุดหนุน') || b.fundTypes.includes('fund-subsidy'))?.id || finalBankId;
                } else if (descMatch.includes('เบิกดอกเบี้ยบัญชีเงินอาหารกลางวันส่งเขต')) {
                    finalFundType = 'fund-state-lunch-interest';
                    finalBankId = schoolSettings.bankAccounts?.find((b: any) => b.name.includes('อาหารกลางวัน') || b.fundTypes.includes('fund-lunch'))?.id || finalBankId;
                }
            } else if (addTransactionType === 'income') {
                if (descMatch.includes('ดอกเบี้ยอาหารกลางวัน') || descMatch.includes('ดอกเบี้ยเงินอาหารกลางวัน')) {
                    finalFundType = 'fund-state-lunch-interest';
                    finalBankId = schoolSettings.bankAccounts?.find((b: any) => b.name.includes('อาหารกลางวัน') || b.fundTypes.includes('fund-lunch'))?.id || finalBankId;
                } else if (descMatch.includes('ดอกเบี้ยเงินอุดหนุน')) {
                    finalFundType = 'fund-state-subsidy-interest';
                    finalBankId = schoolSettings.bankAccounts?.find((b: any) => b.name.includes('อุดหนุน') || b.fundTypes.includes('fund-subsidy'))?.id || finalBankId;
                } else if (descMatch.includes('ดอกเบี้ย กสศ') || descMatch.includes('รับเงินดอกเบี้ยบัญชี กสศ')) {
                    finalFundType = 'fund-eef';
                    finalBankId = schoolSettings.bankAccounts?.find((b: any) => b.name.includes('กสศ') || b.fundTypes.includes('fund-eef'))?.id || finalBankId;
                } else if (descMatch.includes('ดอกเบี้ยรายได้สถานศึกษา') || descMatch.includes('รับดอกเบี้ยบช รายได้สถานศึกษา')) {
                    finalFundType = 'fund-school-income';
                    finalBankId = schoolSettings.bankAccounts?.find((b: any) => b.name.includes('รายได้สถานศึกษา') || b.fundTypes.includes('fund-school-income'))?.id || finalBankId;
                }
            }

            if (finalFundType?.startsWith('fund-state')) {
                const isAllowed = descMatch.includes('ดอกเบี้ยเงินอุดหนุน') || descMatch.includes('ดอกเบี้ยอาหารกลางวัน') || descMatch.includes('ดอกเบี้ยเงินอาหารกลางวัน') || descMatch.includes('เบิกดอกเบี้ย');
                if (!isAllowed) {
                    showAlert('ข้อผิดพลาด', `หมวดเงินรายได้แผ่นดิน อนุญาตให้บันทึกเฉพาะ "ดอกเบี้ยเงินอุดหนุน" และ "ดอกเบี้ยอาหารกลางวัน" เท่านั้น\nพบรายการที่ไม่สอดคล้อง: ${s.description}`, 'error');
                    invalidStateIncome = true;
                }
            }

            if (finalFundType?.startsWith('fund-state') && !finalBankId && addTransactionType !== 'expense') {
                showAlert('ข้อความแจ้งเตือน', `กรุณาเลือกหรือตรวจสอบบัญชีธนาคารสำหรับรายการ '${s.description}' (หมวดเงินรายได้แผ่นดิน)`, 'warning');
                missingBankTarget = true;
            }

            if (invalidStateIncome || missingBankTarget) {
                return; // Stop processing and return if validation fails
            }

            const baseId = Date.now();
            const itemDesc = addProject.trim() ? `[${addProject.trim()}] ${s.description}` : s.description;

            addTransaction({
                id: baseId + (idx * 2000), // Ensure spread if multiple
                date: addDate,
                docNo: addDocNo,
                description: itemDesc,
                fundType: finalFundType,
                income: addTransactionType === 'income' ? amt : 0,
                expense: addTransactionType === 'expense' ? amt : 0,
                payer: addTransactionType === 'income' ? headerTitle : '',
                payee: addTransactionType === 'expense' ? headerTitle : '',
                recipientType: addTransactionType === 'expense' ? (addPayeeType === 'legal' ? 'juristic' : 'individual') : undefined,
                bankId: finalBankId,
            });
        }

        onClose();
        setSubItems([createSubItem()]);
        setAddDate(new Date().toISOString().slice(0, 10));
        setAddProject('');
        setAddDocNo('');
        setAddPayeeType(null);
        setSelectedTaxIncomeId(null);
        setTaxPayerName('');
        setTaxAmount('');
        setAddFundSearch('');
        setAddBankId('');
    };

    const renderBorrowSection = () => {
        if (borrowSubmitted) {
            return (
                <div className="flex flex-col items-center justify-center py-12 px-6 bg-emerald-50/50 rounded-[32px] border-2 border-dashed border-emerald-200 animate-fade-in">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">บันทึกสัญญายืมเงินสำเร็จ!</h3>
                    <p className="text-slate-500 font-medium text-center max-w-md">ระบบได้บันทึกรายการยืมเงินและสร้างเอกสารสัญญาเรียบร้อยแล้ว ท่านสามารถดาวน์โหลดไฟล์ PDF ได้จากปุ่มด้านล่าง</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">โครงการ / วัตถุประสงค์การยืม</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">description</span>
                            <input
                                type="text" value={borrowPurpose} onChange={(e) => setBorrowPurpose(e.target.value)}
                                placeholder="เช่น เพื่อจัดซื้อวัตถุดิบอาหารกลางวัน..."
                                className="modern-input pl-12"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ยืมจากกองทุน</label>
                        <select
                            value={borrowFromFund} onChange={(e) => setBorrowFromFund(e.target.value)}
                            className="modern-input font-bold"
                        >
                            <option value="">-- เลือกกองทุนต้นทาง --</option>
                            {FUND_TYPE_OPTIONS.filter(f => !f.value.includes('loan') && f.value !== borrowPurpose).map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="glass-card p-8 flex flex-col justify-center items-center gap-4 bg-primary/5 border-primary/20">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary">จำนวนเงินที่ต้องการยืม</label>
                    <div className="flex items-baseline gap-3">
                        <span className="text-slate-400 font-black text-2xl">฿</span>
                        <input
                            type="number" value={borrowAmount} onChange={(e) => setBorrowAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-5xl font-black text-slate-800 outline-none w-48 text-center placeholder:text-slate-200"
                        />
                    </div>
                    {borrowFromFund && (
                        <div className="px-4 py-2 rounded-full bg-white/50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 mt-2">
                            คงเหลือในกองทุน: <span className="text-primary font-black">{fundBalance.toLocaleString()} บาท</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderMainItemsSection = () => {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">list_alt</span>
                            รายการรายละเอียด
                        </h3>
                        <p className="text-xs text-slate-400 font-medium tracking-tight">เพิ่มรายการย่อยสำหรับใบสำคัญนี้</p>
                    </div>
                    <button
                        type="button" onClick={addSubItem}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-300 text-sm font-black"
                    >
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        เพิ่มรายการ
                    </button>
                </div>

                <div className="space-y-4">
                    {subItems.map((item, idx) => (
                        <div key={item.id} className="group relative glass-card p-5 border-white/40 hover:border-primary/30 transition-all duration-500 animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                            <div className="flex flex-col md:flex-row gap-5">
                                <div className="flex-1 space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">ชื่อรายการ / รายละเอียด</label>
                                    <input
                                        type="text" value={item.description} onChange={(e) => updateSub(item.id, 'description', e.target.value)}
                                        placeholder="เช่น ค่าวัสดุอุปกรณ์สำนักงาน..."
                                        className="modern-input font-bold"
                                    />
                                </div>
                                <div className="w-full md:w-48 space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">จำนวนเงิน (บาท)</label>
                                    <div className="relative">
                                        <input
                                            type="number" value={item.amount} onChange={(e) => updateSub(item.id, 'amount', e.target.value)}
                                            placeholder="0.00"
                                            className={`modern-input text-right font-black ${addTransactionType === 'income' ? 'text-blue-600' : 'text-red-500'}`}
                                        />
                                    </div>
                                </div>
                                {subItems.length > 1 && (
                                    <button
                                        type="button" onClick={() => removeSubItem(item.id)}
                                        className="absolute -right-3 -top-3 w-8 h-8 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-white/10 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center scale-90 hover:scale-100"
                                    >
                                        <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between items-center p-6 bg-slate-100 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">ยอดรวมทั้งสิ้น (Total)</div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                        <span className="text-sm font-bold text-slate-400 mr-2">฿</span>
                        {subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>

                {addTransactionType === 'expense' && (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5 animate-fade-in">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block text-center mb-4">เลือกประเภทผู้รับเงิน</label>
                        <div className="flex gap-4 max-w-md mx-auto">
                            <button
                                type="button" onClick={() => setAddPayeeType('legal')}
                                className={`flex-1 py-4 rounded-2xl border-2 transition-all duration-300 font-bold flex flex-col items-center gap-2 ${addPayeeType === 'legal' ? 'bg-primary/5 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/5 text-slate-400 hover:border-slate-300'}`}
                            >
                                <span className="material-symbols-outlined text-2xl">account_balance</span>
                                <span className="text-xs">นิติบุคคล</span>
                            </button>
                            <button
                                type="button" onClick={() => setAddPayeeType('person')}
                                className={`flex-1 py-4 rounded-2xl border-2 transition-all duration-300 font-bold flex flex-col items-center gap-2 ${addPayeeType === 'person' ? 'bg-primary/5 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/5 text-slate-400 hover:border-slate-300'}`}
                            >
                                <span className="material-symbols-outlined text-2xl">person</span>
                                <span className="text-xs">บุคคลธรรมดา</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            {/* Background Decorative Blobs */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-400/20 rounded-full blur-[120px] pointer-events-none"></div>

            <form onSubmit={handleAddSubmit}
                className="glass-card w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up border-white/40 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)]">

                {/* Modal Header */}
                <div className="px-8 py-6 shrink-0 flex justify-between items-center border-b border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
                    <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center shadow-inner ${showBorrowMode ? 'bg-primary/20 text-primary' : addTransactionType === 'income' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600'}`}>
                            <span className="material-symbols-outlined text-3xl font-black">
                                {showBorrowMode ? 'currency_exchange' : addTransactionType === 'income' ? 'add_card' : 'payments'}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">
                                {showBorrowMode ? 'ขอยืมเงิน (Loan Request)' : 'บันทึกรายการใหม่'}
                            </h2>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-1">Cash Management System • FY {currentFiscalYear}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {!showBorrowMode && (
                            <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-white/20 backdrop-blur-sm">
                                <button
                                    type="button" onClick={() => setIsGroupMode(false)}
                                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all duration-300 ${!isGroupMode ? 'bg-white dark:bg-slate-700 text-primary shadow-lg shadow-primary/10' : 'text-slate-400 hover:text-slate-600'}`}
                                >เดี่ยว</button>
                                <button
                                    type="button" onClick={() => setIsGroupMode(true)}
                                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all duration-300 ${isGroupMode ? 'bg-white dark:bg-slate-700 text-primary shadow-lg shadow-primary/10' : 'text-slate-400 hover:text-slate-600'}`}
                                >กลุ่ม</button>
                            </div>
                        )}
                        <button type="button" onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/20 dark:bg-slate-800/20 text-slate-400 hover:bg-rose-500 hover:text-white transition-all duration-300 border border-white/40 group">
                            <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform duration-500">close</span>
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                    {/* Top Section: Fund / Bank (Row 1) */}
                    {/* Section 1: Core Information */}
                    {!showBorrowMode && (
                        <div className="space-y-8 animate-fade-in mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* 1. หมวดเงิน */}
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-primary">category</span>
                                        1. หมวดเงิน / เลือกประเภทเงิน
                                    </label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsFundDropdownOpen(!isFundDropdownOpen)}
                                            className={`w-full px-5 py-3.5 rounded-2xl border-2 bg-white dark:bg-slate-800 text-sm font-bold transition-all duration-300 flex justify-between items-center text-left ${isFundDropdownOpen ? 'border-primary shadow-lg shadow-primary/10' : 'border-slate-100 dark:border-white/10 hover:border-slate-300'}`}
                                        >
                                            <span className="truncate text-slate-700 dark:text-slate-200">
                                                {FUND_TYPE_OPTIONS.find(o => o.value === addFundType)?.label || 'คลิกที่นี่เพื่อเลือกหมวดเงิน'}
                                            </span>
                                            <span className={`material-symbols-outlined text-slate-300 transition-transform duration-300 ${isFundDropdownOpen ? 'rotate-180 text-primary' : ''}`}>expand_more</span>
                                        </button>
                                        {isFundDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-[60]" onClick={() => setIsFundDropdownOpen(false)}></div>
                                                <div className="absolute top-full left-0 mt-3 w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-3xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] z-[70] max-h-[400px] flex flex-col overflow-hidden animate-slide-up backdrop-blur-2xl">
                                                    <div className="p-4 border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/50">
                                                        <div className="relative">
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                                                            <input
                                                                type="text" autoFocus placeholder="ค้นหาหมวดเงิน..."
                                                                value={addFundSearch}
                                                                onChange={e => setAddFundSearch(e.target.value)}
                                                                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-white/10 rounded-2xl text-sm font-black outline-none focus:border-primary transition-all shadow-inner"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="overflow-y-auto py-3 custom-scrollbar">
                                                        {Array.from(new Set(FUND_TYPE_OPTIONS.map(o => o.group))).map(group => {
                                                            const filteredOpts = FUND_TYPE_OPTIONS.filter(opt => opt.group === group && opt.label.toLowerCase().includes(addFundSearch.toLowerCase()));
                                                            if (filteredOpts.length === 0) return null;
                                                            return (
                                                                <div key={group} className="mb-4 last:mb-0">
                                                                    <div className="px-5 py-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50 dark:bg-white/5 border-y border-slate-100 dark:border-white/5">
                                                                        {group}
                                                                    </div>
                                                                    {filteredOpts.map(opt => (
                                                                        <button
                                                                            key={opt.value}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setAddFundType(opt.value);
                                                                                setIsFundDropdownOpen(false);
                                                                                setIsEditingFund(false);
                                                                                setAddFundSearch('');
                                                                                const autoBank = schoolSettings.bankAccounts?.find(b => b.fundTypes.includes(opt.value));
                                                                                if (autoBank) setAddBankId(autoBank.id);
                                                                            }}
                                                                            className={`w-full text-left px-6 py-3.5 text-sm font-bold transition-all duration-200 flex items-center justify-between ${addFundType === opt.value ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                                                        >
                                                                            <span>{opt.label}</span>
                                                                            {addFundType === opt.value && <span className="material-symbols-outlined text-xl">check_circle</span>}
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

                                {/* 2. บัญชีธนาคาร */}
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-emerald-500">account_balance</span>
                                        2. บัญชีธนาคาร
                                    </label>
                                    <select
                                        value={addBankId}
                                        onChange={e => setAddBankId(e.target.value)}
                                        className="modern-input font-bold"
                                    >
                                        <option value="">-- คลิกเลือกบัญชี --</option>
                                        {schoolSettings.bankAccounts?.map(acc => (
                                            <option key={acc.id} value={acc.id}>{fmtBankShort(acc.name)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* 3. โครงการ / กิจกรรม */}
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-blue-500">assignment</span>
                                        3. โครงการ / กิจกรรม
                                    </label>
                                    <input
                                        type="text"
                                        value={addProject}
                                        onChange={e => setAddProject(e.target.value)}
                                        className="modern-input font-bold"
                                        placeholder="เช่น กิจกรรมพัฒนาคุณภาพผู้เรียน..."
                                    />
                                </div>

                                {/* 4. วันที่ และ ที่เอกสาร */}
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">4. วันที่</label>
                                        <ThaiDatePicker value={addDate} onChange={(val: string) => setAddDate(val)} />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">5. ที่เอกสาร</label>
                                        <input
                                            type="text" value={addDocNo}
                                            onChange={e => setAddDocNo(e.target.value)}
                                            className="modern-input font-black"
                                            placeholder="เลขอ้างอิง..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 2: Special Modes (Tax, Poor, EEF, State) */}
                    <div className="mb-10">
                        {showBorrowMode ? renderBorrowSection() : isGroupMode ? (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center justify-center p-10 bg-blue-500/5 rounded-[32px] border-2 border-dashed border-blue-500/20">
                                    <span className="material-symbols-outlined text-5xl text-blue-500/50 mb-4 animate-pulse">group_work</span>
                                    <p className="text-slate-500 font-bold text-center">ขณะนี้กำลังอยู่ในโหมด "บันทึกเป็นกลุ่ม"<br /><span className="text-[11px] text-slate-400 font-medium">ทุกรายการจะแชร์ข้อมูลโครงการและวันที่ร่วมกัน</span></p>
                                </div>
                                {renderMainItemsSection()}
                            </div>
                        ) : (
                            <>

                                {/* === โหมดภาษี 1% - รับ === */}
                                {addFundType === 'fund-tax' && addTransactionType === 'income' && (
                                    <div className="space-y-4 mt-2 animate-scale-up">
                                        <div className="bg-amber-500/10 dark:bg-amber-500/5 rounded-[28px] border-2 border-amber-500/20 p-8">
                                            <label className="text-xs font-black text-amber-600 dark:text-amber-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                                <span className="material-symbols-outlined">storefront</span>
                                                รับภาษี 1% จากใคร?
                                            </label>
                                            <input
                                                type="text"
                                                value={taxPayerName}
                                                onChange={e => setTaxPayerName(e.target.value)}
                                                className="w-full px-6 py-4 rounded-[18px] border-2 border-amber-500/10 dark:border-white/5 bg-white dark:bg-slate-800 text-lg font-bold outline-none focus:border-amber-500 transition-all shadow-inner placeholder:text-slate-300"
                                                placeholder="เช่น ร้านเกรซ, ร้านวินัย..."
                                            />
                                            <div className="mt-8">
                                                <label className="text-xs font-black text-amber-600 dark:text-amber-400 mb-2 block uppercase tracking-widest">จำนวนเงินภาษี</label>
                                                <div className={`flex items-center rounded-[18px] px-6 py-4 border-2 transition-all duration-300 ${parseFloat(taxAmount) > 0 ? 'bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-500/5' : 'bg-white dark:bg-slate-800 border-amber-500/10 dark:border-white/5'}`}>
                                                    <input
                                                        type="number" step="0.01"
                                                        value={taxAmount}
                                                        onChange={e => setTaxAmount(e.target.value)}
                                                        className={`w-full text-2xl font-black text-right outline-none bg-transparent ${parseFloat(taxAmount) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
                                                        placeholder="0.00"
                                                    />
                                                    <span className="text-lg font-black text-slate-400 ml-3">฿</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* === โหมดภาษี 1% - จ่าย === */}
                                {addFundType === 'fund-tax' && addTransactionType === 'expense' && (
                                    <div className="mt-2 animate-scale-up">
                                        <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-white/20">
                                            <button
                                                type="button"
                                                onClick={() => { setIsTaxManualMode(false); setTaxManualDesc(''); setTaxManualAmount(''); }}
                                                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 ${!isTaxManualMode ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <span className="material-symbols-outlined text-sm">receipt_long</span>
                                                เลือกจากรายการรับ
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setIsTaxManualMode(true); setSelectedTaxIncomeId(null); }}
                                                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 ${isTaxManualMode ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <span className="material-symbols-outlined text-sm">edit_note</span>
                                                กรอกเอง (ยอดยกมา)
                                            </button>
                                        </div>

                                        {!isTaxManualMode ? (
                                            <div className="space-y-4">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center justify-between">
                                                    <span>เลือกรายการที่ต้องการนำส่ง</span>
                                                    {!selectedTaxIncomeId && <span className="text-rose-500 animate-pulse low-power-pulse font-medium">--- กรุณาเลือก ---</span>}
                                                </label>
                                                <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {taxIncomeTransactions.length === 0 ? (
                                                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border-2 border-dashed border-slate-200">
                                                            <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">inbox</span>
                                                            <p className="text-slate-400 font-bold">ไม่พบรายการรายรับภาษี 1%</p>
                                                        </div>
                                                    ) : taxIncomeTransactions.map((tx: any) => {
                                                        const isSelected = selectedTaxIncomeId === tx.id;
                                                        return (
                                                            <button key={tx.id} type="button" onClick={() => setSelectedTaxIncomeId(isSelected ? null : tx.id)}
                                                                className={`text-left p-5 rounded-[24px] transition-all duration-300 border-2 group flex justify-between items-center ${isSelected ? 'bg-amber-500/10 border-amber-500 shadow-xl shadow-amber-500/10' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/5 hover:border-amber-200'}`}>
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner ${isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                                        <span className="material-symbols-outlined text-xl">{isSelected ? 'check' : 'receipt'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <p className={`font-black tracking-tight ${isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>{tx.description || tx.payer || 'ไม่มีชื่อรายการ'}</p>
                                                                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">{fmtShort(tx.date)} • {tx.docNo || 'ไม่มีเลขที่'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xl font-black text-emerald-600">{fmtMoney(tx.income)} ฿</p>
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Tax Amount</p>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-amber-500/10 dark:bg-amber-500/5 rounded-[28px] border-2 border-amber-500/20 p-8 space-y-6">
                                                <div className="space-y-3">
                                                    <label className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">รายละเอียดการนำส่ง</label>
                                                    <input type="text" value={taxManualDesc} onChange={e => setTaxManualDesc(e.target.value)}
                                                        className="w-full px-6 py-4 rounded-[18px] border-2 border-amber-500/10 dark:border-white/5 bg-white dark:bg-slate-800 text-lg font-bold outline-none focus:border-amber-500 transition-all"
                                                        placeholder="เช่น นำส่งภาษี 1% จากร้านค้า..." />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest text-right block">จำนวนเงิน</label>
                                                    <div className={`flex items-center rounded-[18px] px-6 py-4 border-2 transition-all duration-300 ${parseFloat(taxManualAmount) > 0 ? 'bg-rose-500/5 border-rose-500/20 shadow-lg shadow-rose-500/5' : 'bg-white dark:bg-slate-800 border-amber-500/10 dark:border-white/5'}`}>
                                                        <input type="number" step="0.01" value={taxManualAmount} onChange={e => setTaxManualAmount(e.target.value)}
                                                            className={`w-full text-2xl font-black text-right outline-none bg-transparent ${parseFloat(taxManualAmount) > 0 ? 'text-rose-600' : 'text-slate-400'}`}
                                                            placeholder="0.00" />
                                                        <span className="text-lg font-black text-slate-400 ml-3">฿</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* === โหมดเงินปัจจัยยากจน - จ่าย === */}
                                {addFundType === 'fund-poor' && addTransactionType === 'expense' && (
                                    <div className="mt-2 animate-scale-up space-y-6">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center justify-between">
                                            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-purple-500 text-sm">volunteer_activism</span>เลือกรายการรายรับปัจจัยยากจน</span>
                                            {!selectedPoorIncomeId && <span className="text-rose-500 animate-pulse font-medium">--- กรุณาเลือก ---</span>}
                                        </label>
                                        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {poorIncomeTransactions.length === 0 ? (
                                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border-2 border-dashed border-slate-200">
                                                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">inbox</span>
                                                    <p className="text-slate-400 font-bold">ไม่พบรายการรายรับปัจจัยยากจน</p>
                                                </div>
                                            ) : poorIncomeTransactions.map((tx: any) => {
                                                const isSelected = selectedPoorIncomeId === tx.id;
                                                return (
                                                    <button key={tx.id} type="button" onClick={() => setSelectedPoorIncomeId(isSelected ? null : tx.id)}
                                                        className={`text-left p-5 rounded-[24px] transition-all duration-300 border-2 flex justify-between items-center ${isSelected ? 'bg-purple-500/10 border-purple-500 shadow-xl shadow-purple-500/10' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/5 hover:border-purple-200'}`}>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isSelected ? 'bg-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                                <span className="material-symbols-outlined text-xl">{isSelected ? 'check' : 'person'}</span>
                                                            </div>
                                                            <div>
                                                                <p className={`font-black tracking-tight ${isSelected ? 'text-purple-700 dark:text-purple-400' : 'text-slate-700 dark:text-slate-200'}`}>{tx.description || tx.payer || 'ไม่มีชื่อรายการ'}</p>
                                                                <p className="text-[11px] font-bold text-slate-400 mt-0.5">{fmtShort(tx.date)} • {tx.docNo || 'ไม่มีเลขที่'}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xl font-black text-emerald-600">{fmtMoney(tx.income)} ฿</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {selectedPoorIncomeId && (
                                            <div className="bg-purple-500/10 dark:bg-purple-500/5 rounded-[28px] border-2 border-purple-200 p-8 animate-slide-up">
                                                <label className="text-xs font-black text-purple-700 dark:text-purple-400 mb-2 block uppercase tracking-widest">จำนวนเงินที่จ่าย (บาท)</label>
                                                <div className="flex items-center rounded-[18px] px-6 py-4 bg-white dark:bg-slate-800 border-2 border-purple-500/10 shadow-inner">
                                                    <input type="number" step="0.01" value={customExpenseAmount} onChange={e => setCustomExpenseAmount(e.target.value)}
                                                        className="w-full text-2xl font-black text-right outline-none bg-transparent text-rose-600"
                                                        placeholder="0.00" />
                                                    <span className="text-lg font-black text-slate-400 ml-3">฿</span>
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-400 mt-3 text-center">ยอดรับมา: {fmtMoney(poorIncomeTransactions.find((t: any) => t.id === selectedPoorIncomeId)?.income || 0)} บาท</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* === โหมดเงิน กสศ. - จ่าย === */}
                                {addFundType === 'fund-eef' && addTransactionType === 'expense' && (
                                    <div className="mt-2 animate-scale-up space-y-6">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center justify-between">
                                            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-teal-500 text-sm">volunteer_activism</span>เลือกรายการรายรับ กสศ.</span>
                                            {!selectedEefIncomeId && <span className="text-rose-500 animate-pulse font-medium">--- กรุณาเลือก ---</span>}
                                        </label>
                                        <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {eefIncomeTransactions.length === 0 ? (
                                                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border-2 border-dashed border-slate-200">
                                                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">inbox</span>
                                                    <p className="text-slate-400 font-bold">ไม่พบรายการรายรับ กสศ.</p>
                                                </div>
                                            ) : eefIncomeTransactions.map((tx: any) => {
                                                const isSelected = selectedEefIncomeId === tx.id;
                                                return (
                                                    <button key={tx.id} type="button" onClick={() => setSelectedEefIncomeId(isSelected ? null : tx.id)}
                                                        className={`text-left p-5 rounded-[24px] transition-all duration-300 border-2 flex justify-between items-center ${isSelected ? 'bg-teal-500/10 border-teal-500 shadow-xl shadow-teal-500/10' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/5 hover:border-teal-200'}`}>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isSelected ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                                <span className="material-symbols-outlined text-xl">{isSelected ? 'check' : 'group_add'}</span>
                                                            </div>
                                                            <div>
                                                                <p className={`font-black tracking-tight ${isSelected ? 'text-teal-700 dark:text-teal-400' : 'text-slate-700 dark:text-slate-200'}`}>{tx.description || tx.payer || 'ไม่มีชื่อรายการ'}</p>
                                                                <p className="text-[11px] font-bold text-slate-400 mt-0.5">{fmtShort(tx.date)} • {tx.docNo || 'ไม่มีเลขที่'}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xl font-black text-emerald-600">{fmtMoney(tx.income)} ฿</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {selectedEefIncomeId && (
                                            <div className="bg-teal-500/10 dark:bg-teal-500/5 rounded-[28px] border-2 border-teal-200 p-8 animate-slide-up">
                                                <label className="text-xs font-black text-teal-700 dark:text-teal-400 mb-2 block uppercase tracking-widest">จำนวนเงินที่จ่าย (บาท)</label>
                                                <div className="flex items-center rounded-[18px] px-6 py-4 bg-white dark:bg-slate-800 border-2 border-teal-500/10 shadow-inner">
                                                    <input type="number" step="0.01" value={customExpenseAmount} onChange={e => setCustomExpenseAmount(e.target.value)}
                                                        className="w-full text-2xl font-black text-right outline-none bg-transparent text-rose-600"
                                                        placeholder="0.00" />
                                                    <span className="text-lg font-black text-slate-400 ml-3">฿</span>
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-400 mt-3 text-center">ยอดรับมา: {fmtMoney(eefIncomeTransactions.find((t: any) => t.id === selectedEefIncomeId)?.income || 0)} บาท</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* === โหมดเงินรายได้แผ่นดิน - จ่าย === */}
                                {addFundType?.startsWith('fund-state') && addTransactionType === 'expense' && (
                                    <div className="mt-2 animate-scale-up">
                                        <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-white/20">
                                            <button
                                                type="button"
                                                onClick={() => { setIsStateManualMode(false); setStateManualDesc(''); setStateManualAmount(''); }}
                                                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 ${!isStateManualMode ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                                                เลือกจากรายการรับ
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setIsStateManualMode(true); setSelectedStateIncomeId(null); }}
                                                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all duration-300 flex items-center justify-center gap-2 ${isStateManualMode ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                <span className="material-symbols-outlined text-sm">edit_note</span>
                                                กรอกเอง (ยอดยกมา)
                                            </button>
                                        </div>

                                        {!isStateManualMode ? (
                                            <div className="space-y-4">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center justify-between">
                                                    <span>เลือกดอกเบี้ยที่ต้องการนำส่งแผ่นดิน</span>
                                                    {!selectedStateIncomeId && <span className="text-rose-500 animate-pulse font-medium">--- กรุณาเลือก ---</span>}
                                                </label>
                                                <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {stateIncomeTransactions.length === 0 ? (
                                                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border-2 border-dashed border-slate-200">
                                                            <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">inbox</span>
                                                            <p className="text-slate-400 font-bold">ไม่พบรายการรายรับเงินรายได้แผ่นดิน</p>
                                                        </div>
                                                    ) : stateIncomeTransactions.map((tx: any) => {
                                                        const isSelected = selectedStateIncomeId === tx.id;
                                                        return (
                                                            <button key={tx.id} type="button" onClick={() => setSelectedStateIncomeId(isSelected ? null : tx.id)}
                                                                className={`text-left p-5 rounded-[24px] transition-all duration-300 border-2 flex justify-between items-center ${isSelected ? 'bg-primary/10 border-primary shadow-xl shadow-primary/10' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/5 hover:border-primary/20'}`}>
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                                        <span className="material-symbols-outlined text-xl">{isSelected ? 'check' : 'savings'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <p className={`font-black tracking-tight ${isSelected ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>{tx.description || tx.payer || 'ไม่มีชื่อรายการ'}</p>
                                                                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">{fmtShort(tx.date)} • {tx.docNo || 'ไม่มีเลขที่'}</p>
                                                                    </div>
                                                                </div>
                                                                <p className="text-xl font-black text-emerald-600">{fmtMoney(tx.income)} ฿</p>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-primary/10 dark:bg-primary/5 rounded-[28px] border-2 border-primary/20 p-8 space-y-6">
                                                <div className="space-y-3">
                                                    <label className="text-xs font-black text-primary uppercase tracking-widest">รายละเอียดการนำส่ง</label>
                                                    <input type="text" value={stateManualDesc} onChange={e => setStateManualDesc(e.target.value)}
                                                        className="w-full px-6 py-4 rounded-[18px] border-2 border-primary/10 dark:border-white/5 bg-white dark:bg-slate-800 text-lg font-bold outline-none focus:border-primary transition-all shadow-inner"
                                                        placeholder="เช่น ส่งดอกเบี้ยเงินฝากธนาคาร..." />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-xs font-black text-primary uppercase tracking-widest text-right block">จำนวนเงิน</label>
                                                    <div className="flex items-center rounded-[18px] px-6 py-4 bg-white dark:bg-slate-800 border-2 border-primary/10 shadow-inner group-focus-within:border-primary transition-all">
                                                        <input type="number" step="0.01" value={stateManualAmount} onChange={e => setStateManualAmount(e.target.value)}
                                                            className="w-full text-2xl font-black text-right outline-none bg-transparent text-rose-600"
                                                            placeholder="0.00" />
                                                        <span className="text-lg font-black text-slate-400 ml-3">฿</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Sub-items Section */}
                                <div className="flex items-center justify-between py-6 border-t-2 border-slate-100/50 mt-8 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-inner">
                                            <span className="material-symbols-outlined text-xl">list_alt</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">TRANSACTION ITEMS</p>
                                            <p className="text-[11px] font-bold text-slate-300">{subItems.length} รายการที่บันทึก</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={addSubItem}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-[18px] bg-primary text-white text-xs font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 group">
                                        <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">add_circle</span>
                                        เพิ่มรายการย่อย
                                    </button>
                                </div>

                                <div className="space-y-4 pb-8">
                                    {subItems.map((s, idx) => {
                                        const hasAmount = s.amount && parseFloat(s.amount) > 0;
                                        const isHeader = !isGroupMode && !hasAmount && s.description;
                                        return (
                                            <div key={s.id} className={`group rounded-[28px] transition-all duration-300 border-2 ${isHeader
                                                ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 shadow-sm'
                                                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5'
                                                }`}>
                                                <div className="flex items-center gap-4 px-6 py-5">
                                                    {subItems.length > 1 ? (
                                                        <button type="button" onClick={() => removeSubItem(s.id)}
                                                            className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 hover:bg-rose-500 hover:text-white transition-all scale-95 opacity-0 group-hover:opacity-100 border border-rose-100 dark:border-rose-500/20">
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    ) : (
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${addTransactionType === 'income' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500'}`}>
                                                            <span className="material-symbols-outlined text-lg font-black">{addTransactionType === 'income' ? 'add' : 'remove'}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <input type="text" value={s.description}
                                                            onChange={e => updateSub(s.id, 'description', e.target.value)}
                                                            className={`w-full py-1 text-xl outline-none placeholder:text-slate-300 bg-transparent transition-all border-b-2 border-transparent focus:border-primary/20 ${isHeader ? 'font-black text-slate-800 dark:text-slate-100' : 'font-bold text-slate-700 dark:text-slate-200'}`}
                                                            placeholder={isGroupMode ? `ชื่อรายการ...` : (!s.amount ? 'หัวข้อหรือรายการ...' : `ชื่อรายการ...`)} />
                                                    </div>
                                                    <div className={`flex items-center rounded-2xl px-5 py-3 border-2 transition-all shadow-inner ${hasAmount
                                                        ? addTransactionType === 'income' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
                                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-white/5'
                                                        }`}>
                                                        <input type="number" step="0.01" value={s.amount}
                                                            onChange={e => updateSub(s.id, 'amount', e.target.value)}
                                                            className={`w-32 text-2xl font-black text-right outline-none bg-transparent ${hasAmount
                                                                ? addTransactionType === 'income' ? 'text-emerald-600' : 'text-rose-600'
                                                                : 'text-slate-400'
                                                                }`}
                                                            placeholder="0.00" />
                                                        <span className="ml-2 text-sm font-black text-slate-300">฿</span>
                                                    </div>
                                                </div>
                                                {isGroupMode && (
                                                    <div className="px-8 pb-6 pt-0 grid grid-cols-2 gap-4 animate-slide-up">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">ประเภทเงิน</label>
                                                            <select
                                                                value={s.fundType || 'fund-subsidy'}
                                                                onChange={e => updateSub(s.id, 'fundType', e.target.value)}
                                                                className="w-full px-5 py-3 rounded-xl border-2 border-slate-100 dark:border-white/5 text-[13px] font-black outline-none focus:border-primary/30 bg-slate-50/50 dark:bg-slate-800 transition-all text-slate-600 dark:text-slate-300"
                                                            >
                                                                {FUND_TYPE_OPTIONS.map(opt => (
                                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">บัญชีธนาคาร</label>
                                                            <select
                                                                value={s.bankId || ''}
                                                                onChange={e => updateSub(s.id, 'bankId', e.target.value)}
                                                                className="w-full px-5 py-3 rounded-xl border-2 border-slate-100 dark:border-white/5 text-[13px] font-black outline-none focus:border-primary/30 bg-slate-50/50 dark:bg-slate-800 transition-all text-slate-600 dark:text-slate-300"
                                                            >
                                                                <option value="">-- ไม่ระบุ (เงินสด) --</option>
                                                                {schoolSettings.bankAccounts?.sort((a, b) => a.id === 'ba-other' ? 1 : b.id === 'ba-other' ? -1 : 0).map(acc => (
                                                                    <option key={acc.id} value={acc.id}>{fmtBankShort(acc.name)}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Payee Type Section */}
                                {addTransactionType === 'expense' && !isGroupMode && (
                                    <div className="mt-12 mb-8 pt-10 border-t-2 border-slate-100/50">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] block mb-6 text-center">
                                            ประเภทผู้รับเงิน (Payee Type)
                                            {!addPayeeType && (
                                                <span className="text-rose-500 ml-3 animate-pulse font-bold underline decoration-wavy transition-all">กรุณาเลือก</span>
                                            )}
                                        </label>
                                        <div className="flex gap-4 max-w-[420px] mx-auto bg-slate-100 dark:bg-slate-800 p-2 rounded-[24px] border border-slate-200 dark:border-white/5 shadow-inner">
                                            <button
                                                type="button"
                                                onClick={() => setAddPayeeType('legal')}
                                                className={`flex-1 py-4 rounded-[18px] text-lg font-black transition-all duration-300 flex items-center justify-center gap-3 ${addPayeeType === 'legal' ? 'bg-white dark:bg-slate-700 text-primary shadow-xl shadow-primary/10 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                <span className="material-symbols-outlined">corporate_fare</span>
                                                นิติบุคคล
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAddPayeeType('person')}
                                                className={`flex-1 py-4 rounded-[18px] text-lg font-black transition-all duration-300 flex items-center justify-center gap-3 ${addPayeeType === 'person' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xl shadow-emerald-500/10 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                <span className="material-symbols-outlined">person</span>
                                                บุคคลธรรมดา
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Footer Section (Sticky) */}
                <div className="p-8 border-t border-slate-100 dark:border-white/5 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0_-12px_40px_rgba(0,0,0,0.06)] flex justify-between items-center z-10">
                    <div className="text-left animate-slide-up">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">ยอดรวมสุทธิ (TOTAL NET AMOUNT)</p>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-5xl font-black tracking-tighter transition-all duration-500 ${addTransactionType === 'income' ? 'text-emerald-600 drop-shadow-sm' : 'text-rose-600 drop-shadow-sm'}`}>
                                {addTransactionType === 'income' ? '+' : '-'} {fmtMoney(subTotal || parseFloat(taxAmount) || parseFloat(taxManualAmount) || parseFloat(customExpenseAmount) || parseFloat(stateManualAmount) || 0)}
                            </span>
                            <span className="text-lg font-black text-slate-400">บาท</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose}
                            className="px-8 py-4 rounded-[22px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 uppercase tracking-widest border border-slate-200 dark:border-white/10">
                            ยกเลิก
                        </button>
                        <button type="submit"
                            className={`px-10 py-4 rounded-[22px] font-black text-white text-sm shadow-2xl transition-all active:scale-95 group flex items-center gap-3 uppercase tracking-[0.1em] ${addTransactionType === 'income' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'}`}>
                            <span className="material-symbols-outlined text-xl group-hover:scale-125 transition-transform duration-300">save</span>
                            {showBorrowMode ? 'สร้างสัญญายืมเงิน' : 'บันทึกรายการลงสมุด'}
                        </button>
                    </div>
                </div>
            </form>

            <BankDetailModal
                isOpen={isBankDetailOpen}
                onClose={() => setIsBankDetailOpen(false)}
                bankId={selectedBankDetailId || ''}
                schoolSettings={schoolSettings}
                transactions={transactions}
            />

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                onConfirm={() => {
                    if (modalConfig.onConfirm) modalConfig.onConfirm();
                    setModalConfig({ ...modalConfig, isOpen: false });
                }}
                onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                showCancel={!!modalConfig.onConfirm}
            />

            <DeleteConfirmModal
                isOpen={deleteModalConfig.isOpen}
                title={deleteModalConfig.title}
                message={deleteModalConfig.message}
                onCancel={() => setDeleteModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={(reason) => {
                    deleteModalConfig.onConfirm(reason);
                    setDeleteModalConfig(prev => ({ ...prev, isOpen: false }));
                }}
            />
        </div>
    );
};

export default CashBookAddModal;
