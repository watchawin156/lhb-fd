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

            // 1. Borrow In (รับเงินยืม) -> Lowest ID
            await addTransaction({
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
            });

            // 2. Lend Out (ขอยืม) -> Higher ID (+1)
            await addTransaction({
                id: baseId + 1,
                date: today,
                docNo: loanDocNo,
                description: `ขอยืมเพื่อ ${borrowPurpose}`,
                fundType: borrowFromFund,
                income: 0,
                expense: borrowAmountNum,
                loanId,
                skipLoanCheck: true,
                bankId: selectedBankId
            });

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] animate-fade-in p-4">
            <form onSubmit={handleAddSubmit}
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-scale-in border border-slate-200">

                {/* Header */}
                <div className="px-6 py-4 shrink-0 flex justify-between items-center border-b border-slate-50">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${addTransactionType === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                            <span className="material-symbols-outlined text-2xl font-black">
                                {showBorrowMode ? 'currency_exchange' : addTransactionType === 'income' ? 'add_circle' : 'do_not_disturb_on'}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">
                                {showBorrowMode ? 'ขอยืมเงิน' : 'เพิ่มรายการใหม่'}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">CASHBOOK ENTRY</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!showBorrowMode && (
                            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setIsGroupMode(false)}
                                    className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${!isGroupMode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                                >เดี่ยว</button>
                                <button
                                    type="button"
                                    onClick={() => setIsGroupMode(true)}
                                    className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${isGroupMode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                                >กลุ่ม</button>
                            </div>
                        )}
                        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-100">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar bg-slate-50/30">
                    {/* Top Section: Fund / Bank (Row 1) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* 1. หมวดเงิน */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                1. หมวดเงิน / เลือกประเภทเงิน
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsFundDropdownOpen(!isFundDropdownOpen)}
                                    className={`w-full px-4 py-2.5 rounded-xl border-2 bg-white text-sm font-bold transition-all flex justify-between items-center text-left ${isFundDropdownOpen ? 'border-blue-500 shadow-lg shadow-blue-50' : 'border-slate-100 hover:border-slate-300'}`}
                                >
                                    <span className="truncate text-slate-700">
                                        {FUND_TYPE_OPTIONS.find(o => o.value === addFundType)?.label || 'คลิกที่นี่เพื่อเลือกหมวดเงิน'}
                                    </span>
                                    <span className={`material-symbols-outlined text-slate-300 transition-transform ${isFundDropdownOpen ? 'rotate-180 text-blue-500' : ''}`}>expand_more</span>
                                </button>
                                {isFundDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[60]" onClick={() => setIsFundDropdownOpen(false)}></div>
                                        <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl z-[70] max-h-72 flex flex-col overflow-hidden animate-slide-up">
                                            <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-sm">search</span>
                                                    <input
                                                        type="text" autoFocus placeholder="ค้นหาหมวดเงิน..."
                                                        value={addFundSearch}
                                                        onChange={e => setAddFundSearch(e.target.value)}
                                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-400 focus:shadow-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="overflow-y-auto py-2">
                                                {Array.from(new Set(FUND_TYPE_OPTIONS.map(o => o.group))).map(group => {
                                                    const filteredOpts = FUND_TYPE_OPTIONS.filter(opt => opt.group === group && opt.label.toLowerCase().includes(addFundSearch.toLowerCase()));
                                                    if (filteredOpts.length === 0) return null;
                                                    return (
                                                        <div key={group}>
                                                            <div className="px-4 py-1.5 text-[10px] font-black text-slate-400 bg-slate-50/30 uppercase tracking-widest leading-none mt-2 first:mt-0">
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
                                                                    className={`w-full text-left px-5 py-2.5 text-xs font-semibold transition-colors flex items-center justify-between ${addFundType === opt.value ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                                                >
                                                                    {opt.label}
                                                                    {addFundType === opt.value && <span className="material-symbols-outlined text-sm">check_circle</span>}
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

                        {/* 2. เลือกบัญชีธนาคาร */}
                        <div className="space-y-1">
                            <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">
                                2. บัญชีธนาคาร
                            </label>
                            <select
                                value={addBankId}
                                onChange={e => setAddBankId(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-lg font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-400 focus:shadow-lg focus:shadow-emerald-50 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">-- คลิกเลือกบัญชี --</option>
                                {schoolSettings.bankAccounts?.map(acc => (
                                    <option key={acc.id} value={acc.id}>{fmtBankShort(acc.name)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* 3. โครงการ / กิจกรรม */}
                        <div className="space-y-1">
                            <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">
                                3. โครงการ / กิจกรรม
                            </label>
                            <input
                                type="text"
                                value={addProject}
                                onChange={e => setAddProject(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-lg font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400 transition-all placeholder:text-slate-300"
                                placeholder="เช่น กิจกรรมพัฒนาคุณภาพผู้เรียน"
                            />
                        </div>

                        {/* 4. วันที่ และ ที่เอกสาร */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">
                                    4. วันที่
                                </label>
                                <ThaiDatePicker value={addDate} onChange={(val: string) => setAddDate(val)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-black text-slate-400 uppercase tracking-widest ml-1">
                                    5. ที่เอกสาร
                                </label>
                                <input
                                    type="text" value={addDocNo}
                                    onChange={e => setAddDocNo(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-lg font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400 transition-all placeholder:text-slate-300"
                                    placeholder="เลขอ้างอิง"
                                />
                            </div>
                        </div>
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
                                                    นำส่งภาษี 1% ({extractFundName(sel.description || sel.payer || 'ไม่ระบุ')}) จำนวน {fmtMoney(sel.income)} บาท
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
                    {addFundType?.startsWith('fund-state') && addTransactionType === 'expense' && (
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

                    {/* Sub-items Section */}
                    <div className="flex items-center justify-between py-2 border-t border-slate-100 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500 text-sm">list_alt</span>
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                {subItems.length} รายการ
                            </span>
                        </div>
                        <button type="button" onClick={addSubItem}
                            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-blue-500 text-white text-sm font-black hover:bg-blue-600 transition-all shadow-md shadow-blue-100">
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            เพิ่มรายการ
                        </button>
                    </div>

                    <div className="space-y-2 pb-4">
                        {subItems.map((s, idx) => {
                            const hasAmount = s.amount && parseFloat(s.amount) > 0;
                            const isHeader = !isGroupMode && !hasAmount && s.description;
                            return (
                                <div key={s.id} className={`group rounded-xl border transition-all duration-200 ${isHeader
                                    ? 'bg-slate-100 border-slate-200 shadow-sm'
                                    : 'bg-white border-slate-100 hover:border-blue-100 hover:shadow-sm'
                                    }`}>
                                    <div className="flex items-center gap-3 px-3 py-2">
                                        {subItems.length > 1 ? (
                                            <button type="button" onClick={() => removeSubItem(s.id)}
                                                className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center shrink-0 hover:bg-red-500 hover:text-white transition-all scale-90 opacity-0 group-hover:opacity-100 border border-red-100">
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        ) : (
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${addTransactionType === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                                <span className="material-symbols-outlined text-sm font-black">check_circle</span>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <input type="text" value={s.description}
                                                onChange={e => updateSub(s.id, 'description', e.target.value)}
                                                className={`w-full py-1 text-lg outline-none placeholder:text-slate-300 bg-transparent ${isHeader ? 'font-black text-slate-800' : 'font-bold text-slate-700'}`}
                                                placeholder={isGroupMode ? `รายการ...` : (!s.amount ? 'เช่น บันทึกการรับเงิน...' : `รายการ...`)} />
                                        </div>
                                        <div className={`flex items-center rounded-lg px-2 py-1 border transition-all ${hasAmount
                                            ? addTransactionType === 'income' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
                                            : 'bg-slate-50 border-slate-50'
                                            }`}>
                                            <input type="number" step="0.01" value={s.amount}
                                                onChange={e => updateSub(s.id, 'amount', e.target.value)}
                                                className={`w-20 py-0.5 text-lg font-black text-right outline-none bg-transparent ${hasAmount
                                                    ? addTransactionType === 'income' ? 'text-emerald-700' : 'text-rose-700'
                                                    : 'text-slate-400'
                                                    }`}
                                                placeholder="0.00" />
                                        </div>
                                    </div>
                                    {isGroupMode && (
                                        <div className="px-4 pb-3 pt-0 grid grid-cols-2 gap-3">
                                            <select
                                                value={s.fundType || 'fund-subsidy'}
                                                onChange={e => updateSub(s.id, 'fundType', e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border-2 border-slate-50 text-[11px] font-bold outline-none focus:border-blue-200 bg-slate-50/50 transition-all text-slate-600"
                                            >
                                                {FUND_TYPE_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={s.bankId || ''}
                                                onChange={e => updateSub(s.id, 'bankId', e.target.value)}
                                                className="w-full px-3 py-2 rounded-xl border-2 border-slate-50 text-[11px] font-bold outline-none focus:border-blue-200 bg-slate-50/50 transition-all text-slate-600"
                                            >
                                                <option value="">-- บัญชีธนาคาร --</option>
                                                {schoolSettings.bankAccounts?.sort((a, b) => a.id === 'ba-other' ? 1 : b.id === 'ba-other' ? -1 : 0).map(acc => (
                                                    <option key={acc.id} value={acc.id}>{fmtBankShort(acc.name)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Payee Type Section */}
                    {addTransactionType === 'expense' && !isGroupMode && (
                        <div className="mt-8 mb-6 pt-6 border-t-2 border-slate-50">
                            <label className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] block mb-5 text-center">
                                ประเภทผู้รับเงิน
                                {!addPayeeType && (
                                    <span className="text-rose-500 ml-2 animate-pulse font-medium">--- กรุณาเลือก ---</span>
                                )}
                            </label>
                            <div className="flex gap-2 max-w-[360px] mx-auto bg-slate-100 p-1 rounded-2xl border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setAddPayeeType('legal')}
                                    className={`flex-1 py-3 rounded-xl text-lg font-black transition-all flex items-center justify-center gap-2 ${addPayeeType === 'legal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    นิติบุคคล
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAddPayeeType('person')}
                                    className={`flex-1 py-3 rounded-xl text-lg font-black transition-all flex items-center justify-center gap-2 ${addPayeeType === 'person' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    บุคคลธรรมดา
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Section (Sticky) */}
                <div className="p-6 border-t border-slate-100 shrink-0 bg-white shadow-[0_-8px_30px_rgb(0,0,0,0.04)] flex justify-between items-center">
                    <div className="text-left">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-0.5">TOTAL AMOUNT</p>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-4xl font-black tracking-tighter ${addTransactionType === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {addTransactionType === 'income' ? '+' : '-'} {fmtMoney(subTotal || parseFloat(taxAmount) || parseFloat(taxManualAmount) || parseFloat(customExpenseAmount) || parseFloat(stateManualAmount) || 0)}
                            </span>
                            <span className="text-xs font-bold text-slate-400">บาท</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose}
                            className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-500 font-black text-[11px] hover:bg-slate-50 transition-all active:scale-95 uppercase tracking-wider">
                            ยกเลิก
                        </button>
                        <button type="submit"
                            className={`px-8 py-3 rounded-xl font-black text-white text-sm shadow-lg transition-all active:scale-95 group flex items-center gap-2 uppercase tracking-wider ${addTransactionType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-50' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-50'}`}>
                            <span className="material-symbols-outlined text-lg font-black">save</span>
                            {showBorrowMode ? 'สร้างสัญญายืม' : 'บันทึกรายการ'}
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
