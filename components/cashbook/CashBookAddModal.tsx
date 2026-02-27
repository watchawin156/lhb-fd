import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolContext';
import { FUND_TYPE_OPTIONS } from '../../utils';
import ThaiDatePicker from '../ThaiDatePicker';
import { fmtShort, fmtMoney } from './utils';
import { buildLoanDocPDF } from '../loanPdfBuilder';

interface CashBookAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaxWarning: (amount: number, payeeType: 'legal' | 'person') => void;
    initialTransactionType?: 'income' | 'expense';
}

const CashBookAddModal: React.FC<CashBookAddModalProps> = ({ isOpen, onClose, onTaxWarning, initialTransactionType = 'income' }) => {
    const { transactions, addTransaction, schoolSettings, addLoan } = useSchoolData();

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
    const [addFundType, setAddFundType] = useState('fund-subsidy');
    const [addFundSearch, setAddFundSearch] = useState('');
    const [isFundDropdownOpen, setIsFundDropdownOpen] = useState(false);
    const [addDocNo, setAddDocNo] = useState('');
    const [addBankId, setAddBankId] = useState<string>('');

    // Sub-items: description + amount (empty amount = header row)
    // โหมดกลุ่ม: แต่ละรายการมี fundType ของตัวเอง
    interface SubItem { id: number; description: string; amount: string; fundType?: string; }
    const createSubItem = (): SubItem => ({ id: Date.now() + Math.random(), description: '', amount: '', fundType: 'fund-subsidy' });
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
    const [isViewMode, setIsViewMode] = useState(false); // ดูรายการที่ยกครบแล้ว

    // Cash Book fund filter
    const [cashBookFilter, setCashBookFilter] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [pdfDateRange, setPdfDateRange] = useState(''); // e.g. "1/5/2568-9/5/2568"

    const updateSub = (id: number, field: 'description' | 'amount' | 'fundType', value: string) => {
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
            alert('กรุณาเลือกกองทุนต้นทาง');
            return;
        }
        
        if (!borrowAmountNum || borrowAmountNum <= 0) {
            alert('กรุณากรอกจำนวนเงิน');
            return;
        }
        
        if (!borrowPurpose) {
            alert('กรุณากรอกวัตถุประสงค์การยืม');
            return;
        }

        const loanId = `LN-${new Date().getFullYear() + 543}-${String(new Date().getTime()).slice(-6)}`;
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
            
            // Add loan to context
            addLoan(newLoan);

            // Create transaction for borrowed amount
            await addTransaction({
                id: Date.now(),
                date: today,
                docNo: loanId,
                description: `ยืมเงินจาก ${FUND_TYPE_OPTIONS.find(f => f.value === borrowFromFund)?.label || borrowFromFund} เพื่อ ${borrowPurpose}`,
                fundType: borrowFromFund,
                income: borrowAmountNum,
                expense: 0,
                loanId,
                skipLoanCheck: true,
            });

            // Generate PDF as blob
            const pdfBytes = await buildLoanDocPDF(newLoan, false, schoolSettings, today);
            const blob = new Blob([pdfBytes as unknown as Uint8Array], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfBlobUrl(url);
            setBorrowSubmitted(true);

            setIsGeneratingPDF(false);
        } catch (e) {
            console.warn('Error creating loan', e);
            setIsGeneratingPDF(false);
            alert('เกิดข้อผิดพลาดในการสร้างสัญญา: ' + String(e));
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
                alert('กรุณากรอกที่เอกสาร');
                return;
            }
            const dataItems = subItems.filter(s => {
                const amt = parseFloat(s.amount);
                return amt > 0 && !isNaN(amt) && s.description;
            });
            if (dataItems.length === 0) {
                alert('กรุณากรอกรายการย่อยอย่างน้อย 1 รายการ (ชื่อรายการ + จำนวนเงิน)');
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
        const isStateExpense = addFundType === 'fund-state' && addTransactionType === 'expense';
        const isEefExpense = addFundType === 'fund-eef' && addTransactionType === 'expense';

        // === โหมดภาษี 1% ===
        if (isTaxMode) {
            if (!addDocNo) {
                alert('กรุณากรอกที่เอกสาร');
                return;
            }

            if (addTransactionType === 'income') {
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
                if (isTaxManualMode) {
                    const amt = parseFloat(taxManualAmount);
                    if (!taxManualDesc || isNaN(amt) || amt <= 0) {
                        alert('กรุณากรอกรายละเอียดและจำนวนเงิน');
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
                alert('กรุณากรอกที่เอกสาร');
                return;
            }
            if (isStateManualMode) {
                const amt = parseFloat(stateManualAmount);
                if (!stateManualDesc || isNaN(amt) || amt <= 0) {
                    alert('กรุณากรอกรายละเอียดและจำนวนเงิน');
                    return;
                }
                const fundBalance = transactions
                    .filter((t: any) => t.fundType === 'fund-state' && t.date <= addDate)
                    .reduce((acc: number, t: any) => acc + (t.income || 0) - (t.expense || 0), 0);
                if (amt > fundBalance) {
                    
                }
                addTransaction({
                    id: Date.now(),
                    date: addDate,
                    docNo: addDocNo,
                    description: `ส่งดอกเบี้ย ${stateManualDesc}`,
                    fundType: 'fund-state',
                    income: 0,
                    expense: amt,
                    payer: '',
                    payee: stateManualDesc,
                });
            } else {
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
                    
                }
                addTransaction({
                    id: Date.now(),
                    date: addDate,
                    docNo: addDocNo,
                    description: `ส่งดอกเบี้ย ${extractFundName(selectedTx.description || 'เงินรายได้แผ่นดิน')}`,
                    fundType: 'fund-state',
                    income: 0,
                    expense: amt,
                    payer: '',
                    payee: selectedTx.description || selectedTx.payer || '',
                    incomeRefId: selectedTx.id,
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
                income: 0,
                expense: amt,
                payer: '',
                payee: headerTitle,
                recipientType: addPayeeType === 'legal' ? 'juristic' : 'individual',
                bankId: isInterestMode ? addBankId : undefined,
            });
        }
        }

        onClose();
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/80 backdrop-blur-sm animate-fade-in">
            <form onSubmit={handleAddSubmit}
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[94vh] min-h-[80vh] flex flex-col overflow-hidden animate-scale-in mx-4">

                {/* Top */}
                <div className="px-8 pt-6 pb-4 shrink-0">
                    <div className="flex justify-between items-center mb-2">
                        <div>
                            <p className="text-sm text-gray-400">สมุดเงินสด</p>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {showBorrowMode ? 'ยืมเงิน' : 'เพิ่มรายการ'}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Transaction Type Toggle or Borrow Toggle */}
                            {!showBorrowMode ? (
                                <>
                                    {/* สวิตช์ รายการเดียว/กลุ่ม */}
                                    <span className={`text-xs font-semibold ${!isGroupMode ? 'text-blue-600' : 'text-gray-300'}`}>เดี่ยว</span>
                                    <button type="button"
                                        onClick={() => setIsGroupMode(!isGroupMode)}
                                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isGroupMode ? 'bg-purple-500' : 'bg-blue-500'}`}>
                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isGroupMode ? 'translate-x-[22px]' : 'translate-x-0.5'}`}></div>
                                    </button>
                                    <span className={`text-xs font-semibold ${isGroupMode ? 'text-purple-600' : 'text-gray-300'}`}>กลุ่ม</span>
                                    <span className="mx-1 text-gray-200">|</span>
                                </>
                            ) : null}
                            
                            {/* Borrow Toggle Button */}
                            <button type="button" 
                                onClick={() => {
                                    if (showBorrowMode) {
                                        setShowBorrowMode(false);
                                        setBorrowAmount('');
                                        setBorrowPurpose('');
                                        setSelectedBankId('');
                                        setPdfBlobUrl(null);
                                        setBorrowSubmitted(false);
                                    } else {
                                        setShowBorrowMode(true);
                                    }
                                }}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                    showBorrowMode 
                                        ? 'bg-orange-500 text-white' 
                                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                }`}>
                                <span className="material-symbols-outlined text-sm">currency_exchange</span>
                                {showBorrowMode ? 'ยืมเงิน' : 'ยืม'}
                            </button>

                            <button type="button" onClick={onClose}
                                className="text-blue-500 hover:text-blue-700 text-sm font-semibold">ปิด</button>
                        </div>
                    </div>
                    {/* Expense Type Toggle */}
                    {!showBorrowMode && (
                    <div className="flex gap-2 mt-2">
                        <button type="button" onClick={() => setAddTransactionType('income')}
                            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border-2 flex items-center justify-center gap-1 ${addTransactionType === 'income'
                                ? 'bg-green-500 border-green-500 text-white shadow-sm'
                                : 'bg-white border-gray-200 text-gray-400 hover:border-green-300'}`}>
                            <span className="material-symbols-outlined text-base">arrow_downward</span> รายรับ
                        </button>
                        <button type="button" onClick={() => setAddTransactionType('expense')}
                            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border-2 flex items-center justify-center gap-1 ${addTransactionType === 'expense'
                                ? 'bg-red-500 border-red-500 text-white shadow-sm'
                                : 'bg-white border-gray-200 text-gray-400 hover:border-red-300'}`}>
                            <span className="material-symbols-outlined text-base">arrow_upward</span> รายจ่าย
                        </button>
                    </div>
                    )}
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-8">

                    {/* Borrow UI */}
                    {showBorrowMode && !borrowSubmitted && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500 mb-1 block">ยืมจากกองทุน</label>
                                    <select value={borrowFromFund} onChange={e => setBorrowFromFund(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-400 transition-colors">
                                        <option value="">-- เลือกกองทุนต้นทาง --</option>
                                        {FUND_TYPE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500 mb-1 block">ยอดคงเหลือ</label>
                                    <p className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200"><span className="font-semibold">฿{fmtMoney(fundBalance)}</span></p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500 mb-1 block">จำนวนเงินที่จะยืม</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
                                        <input type="number" value={borrowAmount} onChange={e => setBorrowAmount(e.target.value)}
                                            className="w-full pl-8 px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-400" placeholder="0.00" />
                                    </div>
                                    {borrowAmountNum > fundBalance && (
                                        <p className="text-xs text-amber-800 mt-1">ยอดขาด {fmtMoney(shortfallAmount)} บาท</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500 mb-1 block">วัตถุประสงค์</label>
                                    <input type="text" value={borrowPurpose} onChange={e => setBorrowPurpose(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-blue-400" placeholder="เหตุผล / โครงการ" />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowBorrowMode(false)}
                                    className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">ยกเลิก</button>
                                <button type="button" onClick={handleBorrowSubmit}
                                    className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold">ยืนยันยืม</button>
                            </div>
                            {isGeneratingPDF && <p className="text-center text-sm text-gray-500 mt-2">กำลังสร้างเอกสาร...</p>}
                        </div>
                    )}
                    {showBorrowMode && borrowSubmitted && (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                                <span className="material-symbols-outlined text-5xl text-green-600">check</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mt-4">สร้างเอกสารการยืมสำเร็จ</h3>
                            <p className="mt-2 text-gray-600">จำนวนเงิน: ฿{fmtMoney(borrowAmountNum)}</p>
                            <p className="text-gray-600">วัตถุประสงค์: {borrowPurpose}</p>
                            {borrowAmountNum > fundBalance && (
                                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mt-3">
                                    <p className="text-amber-900 text-sm">
                                        <span className="font-semibold">⚠️ จำนวนเงินที่ขาดไป:</span> {fmtMoney(shortfallAmount)} บาท
                                    </p>
                                </div>
                            )}
                            <div className="mt-6 flex gap-2 justify-center">
                                <button
                                    type="button"
                                    onClick={() => setShowBorrowMode(false)}
                                    className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700"
                                >ปิด</button>
                                <button
                                    type="button"
                                    onClick={handleDownloadBorrowPDF}
                                    className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                                >ดาวน์โหลด PDF</button>
                            </div>
                        </div>
                    )}
                    
                    {/* Shared fields */}
                    {/* Shared fields */}
                    <div className="space-y-4 mb-4">
                        {/* ประเภท/หมวดเงิน — ซ่อนเมื่อเป็นโหมดกลุ่ม (เพราะแต่ละรายการเลือกหมวดเอง) */}
                        {!isGroupMode && (
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
                        )}
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

                    {/* === โหมดปกติ + โหมดกลุ่ม (ไม่ใช่ภาษี 1%, ปัจจัยยากจน, กสศ., รายได้แผ่นดิน โหมดจ่าย) === */}
                    {!(addFundType === 'fund-tax' && !isGroupMode) && !(addFundType === 'fund-poor' && addTransactionType === 'expense' && !isGroupMode) && !(addFundType === 'fund-eef' && addTransactionType === 'expense' && !isGroupMode) && !(addFundType === 'fund-state' && addTransactionType === 'expense' && !isGroupMode) && (
                        <>
                            {/* Separator with count */}
                            <div className="flex items-center justify-between py-3 border-t border-gray-200 mt-2">
                                <span className="text-sm text-gray-400">
                                    {subItems.length} รายการ
                                    {!isGroupMode && <span className="text-gray-300 ml-1">• ไม่ใส่เงิน = หัวรายการ</span>}
                                    {isGroupMode && <span className="text-purple-400 ml-1">• โหมดกลุ่ม (เลือกหมวดเงินแต่ละรายการ)</span>}
                                </span>
                                <button type="button" onClick={addSubItem}
                                    className="text-sm text-blue-500 font-semibold hover:text-blue-700 transition-colors">+ เพิ่มรายการ</button>
                            </div>

                            {/* Sub-items list */}
                            <div className="space-y-2 pb-2">
                                {subItems.map((s, idx) => {
                                    const hasAmount = s.amount && parseFloat(s.amount) > 0;
                                    const isHeader = !isGroupMode && !hasAmount && s.description;
                                    return (
                                        <div key={s.id} className={`rounded-xl border transition-all ${isHeader
                                            ? 'bg-slate-50 border-slate-200'
                                            : 'bg-white border-gray-200 hover:border-blue-300'
                                            }`}>
                                            <div className="flex items-center gap-3 px-3 py-2.5">
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
                                                        placeholder={isGroupMode ? `รายการที่ ${idx + 1}` : (!s.amount ? 'ชื่อหัว/รายการ' : `รายการที่ ${idx + 1}`)} />
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
                                            {/* โหมดกลุ่ม: dropdown เลือกหมวดเงินแต่ละรายการ */}
                                            {isGroupMode && (
                                                <div className="px-3 pb-2.5 pt-0">
                                                    <select
                                                        value={s.fundType || 'fund-subsidy'}
                                                        onChange={e => updateSub(s.id, 'fundType', e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-purple-400 bg-gray-50 transition-colors"
                                                    >
                                                        {FUND_TYPE_OPTIONS.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Payee type selector - expense only (ไม่แสดงในโหมดกลุ่ม) */}
                            {addTransactionType === 'expense' && !isGroupMode && (
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
                    <button type="button" onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                        ยกเลิก
                    </button>
                    <button type="submit"
                        className={`px-8 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all ${addTransactionType === 'income' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                        บันทึก{addTransactionType === 'income' ? 'รายรับ' : 'รายจ่าย'}{isGroupMode ? ` (${subItems.filter(s => s.amount && parseFloat(s.amount) > 0).length} รายการ)` : ''}
                    </button>
                </div>
            </form>
        </div>
    );
};
export default CashBookAddModal;
