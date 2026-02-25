
import React, { useState, useMemo, useEffect } from 'react';
import { formatThaiDate, formatThaiDateShort } from '../utils';
import { handleExportExcel as handleHelperExportExcel, handleExportPDF as handleHelperExportPDF } from './exportFundUtils';
import ThaiDatePicker from './ThaiDatePicker';
import { useSchoolData } from '../context/SchoolContext';
import { Transaction } from '../types';

interface FundViewProps {
    title: string;
    pageId: string;
}

const FundView: React.FC<FundViewProps> = ({ title, pageId }) => {
    const { transactions, addTransaction, editTransaction, deleteTransaction, schoolSettings } = useSchoolData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');

    // Detail Modal State
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');

    // Date input for export (single text input e.g. "16/5/2569" or "16/5/2569 - 17/5/2569")
    const today = new Date();
    const todayBE = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear() + 543}`;
    const [exportDateInput, setExportDateInput] = useState(todayBE);

    // Filter transactions for this page AND SORT DESCENDING (Latest First)
    const pageTransactions = useMemo(() => {
        return transactions
            .filter(t => t.fundType === pageId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, pageId]);

    // Payee History for Autocomplete
    const payeeHistory = useMemo(() => {
        const history: Record<string, 'individual' | 'juristic'> = {};
        transactions.forEach(t => {
            if (t.payee) {
                if (t.recipientType) {
                    history[t.payee] = t.recipientType;
                } else {
                    // Mark as existing but unknown type if strictly needed, 
                    // but typically we only care if we can auto-fill type.
                    // If not in map, just don't auto-fill type.
                }
            }
        });
        return history;
    }, [transactions]);

    const uniquePayees = useMemo(() => Object.keys(payeeHistory).sort(), [payeeHistory]);

    // Identify if this is a 15-Year fund (Expense Only in this view)
    const is15YFund = pageId.startsWith('fund-15y-');
    const isTaxFund = pageId === 'fund-tax';

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        docNo: '',
        description: '',
        transactionType: is15YFund ? 'expense' : 'expense', // Default
        amount: '',
        payer: '', // For income
        payee: '', // For expense
        recipientType: 'juristic' // 'juristic' | 'individual'
    });

    // Edit Form State
    const [editFormData, setEditFormData] = useState<Partial<Transaction>>({});

    // State for Tax Fund Expense Selection
    const [selectedTaxIds, setSelectedTaxIds] = useState<number[]>([]);

    // Effect to enforce expense only when modal opens for 15Y
    useEffect(() => {
        if (is15YFund) {
            setFormData(prev => ({ ...prev, transactionType: 'expense' }));
        }
    }, [is15YFund, isModalOpen]);

    // Effect for Tax Fund specific logic
    useEffect(() => {
        if (isTaxFund) {
            if (formData.transactionType === 'expense') {
                setFormData(prev => ({
                    ...prev,
                    payee: 'กรมสรรพากร',
                    description: 'นำส่งภาษีหัก ณ ที่จ่าย',
                    amount: '0'
                }));
                setSelectedTaxIds([]);
            } else {
                setFormData(prev => ({ ...prev, description: '', amount: '' }));
            }
        }
    }, [isTaxFund, formData.transactionType, isModalOpen]);

    // Effect to calculate tax expense amount based on selection
    useEffect(() => {
        if (isTaxFund && formData.transactionType === 'expense') {
            const taxIncomes = transactions.filter(t => t.fundType === 'fund-tax' && t.income > 0);
            const selected = taxIncomes.filter(t => selectedTaxIds.includes(t.id));
            const total = selected.reduce((sum, t) => sum + t.income, 0);

            setFormData(prev => ({
                ...prev,
                amount: total > 0 ? total.toString() : '',
                description: `นำส่งภาษีหัก ณ ที่จ่าย (${selected.length} รายการ)`
            }));
        }
    }, [selectedTaxIds, transactions, isTaxFund, formData.transactionType]);

    const type1Funds = [
        'fund-lunch', 'fund-15y-activity', 'fund-subsidy', 'fund-subsidy-teaching', 'fund-15y-supply',
        'fund-15y-uniform', 'fund-15y-book', 'fund-poor', 'fund-school-income',
        'fund-eef', 'fund-tax', 'fund-state-subsidy-interest', 'fund-state-lunch-interest',
        'fund-safekeeping'
    ];

    const taxTriggerFunds = [
        'fund-subsidy', 'fund-subsidy-teaching',
        'fund-15y-book', 'fund-15y-supply', 'fund-15y-uniform', 'fund-15y-activity',
        'fund-lunch',
        'fund-state-subsidy-interest', 'fund-state-lunch-interest'
    ];

    const isType1 = type1Funds.includes(pageId);
    const isTaxTriggerPage = taxTriggerFunds.includes(pageId);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePayeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData(prev => {
            const updates: any = { payee: val };
            // Auto-select recipient type if we remember this payee
            if (payeeHistory[val]) {
                updates.recipientType = payeeHistory[val];
            }
            return { ...prev, ...updates };
        });
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (date: string) => {
        setFormData(prev => ({ ...prev, date }));
    };

    const handleEditDateChange = (date: string) => {
        setEditFormData(prev => ({ ...prev, date }));
    };

    const toggleTaxSelection = (id: number) => {
        setSelectedTaxIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amountVal = parseFloat(formData.amount) || 0;

        if (amountVal <= 0) {
            alert("จำนวนเงินต้องมากกว่า 0");
            return;
        }

        const incomeAmount = formData.transactionType === 'income' ? amountVal : 0;
        const expenseAmount = formData.transactionType === 'expense' ? amountVal : 0;

        let taxAmount = 0;
        if (isTaxTriggerPage && expenseAmount > 0) {
            if (formData.recipientType === 'juristic' && expenseAmount >= 500) {
                taxAmount = expenseAmount * 0.01;
            } else if (formData.recipientType === 'individual' && expenseAmount >= 10000) {
                taxAmount = expenseAmount * 0.01;
            }
        }

        const newTransaction: Transaction = {
            id: Date.now(),
            fundType: pageId,
            date: formData.date,
            docNo: formData.docNo,
            description: formData.description,
            income: incomeAmount,
            expense: expenseAmount,
            payer: formData.transactionType === 'income' ? formData.payer : undefined,
            payee: formData.transactionType === 'expense' ? formData.payee : undefined,
            recipientType: formData.transactionType === 'expense' ? (formData.recipientType as any) : undefined
        };

        addTransaction(newTransaction);

        if (taxAmount > 0) {
            const cleanPageTitle = title.replace(/^[\d\.]+\s*/, '');
            const taxTransaction: Transaction = {
                id: Date.now() + 1,
                fundType: 'fund-tax',
                date: formData.date,
                docNo: formData.docNo,
                description: `หักภาษี ณ ที่จ่าย (${formData.recipientType === 'juristic' ? 'ภงด.53' : 'ภงด.3'}) - จาก${cleanPageTitle} - ${formData.description}`,
                income: taxAmount,
                expense: 0,
                payer: cleanPageTitle
            };
            addTransaction(taxTransaction);
            alert(`ระบบได้บันทึกการหักภาษี ณ ที่จ่าย จำนวน ${taxAmount.toLocaleString()} บาท \nไปยังบัญชี "7. เงินภาษี 1%" เรียบร้อยแล้ว (วันที่เดียวกัน)`);
        }

        setIsModalOpen(false);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            docNo: '',
            description: '',
            transactionType: is15YFund ? 'expense' : 'expense',
            amount: '',
            payer: '',
            payee: '',
            recipientType: 'juristic'
        });
        setSelectedTaxIds([]);
    };

    const handleRowClick = (tx: Transaction) => {
        setSelectedTx(tx);
        setIsDetailModalOpen(true);
        setIsEditing(false);
        setIsDeleting(false);
        setDeleteConfirmation('');
    };

    const startEdit = () => {
        if (!selectedTx) return;
        setEditFormData({
            date: selectedTx.date,
            docNo: selectedTx.docNo,
            description: selectedTx.description,
            income: selectedTx.income,
            expense: selectedTx.expense,
            payer: selectedTx.payer,
            payee: selectedTx.payee
        });
        setIsEditing(true);
    };

    const saveEdit = () => {
        if (!selectedTx) return;
        // Basic validation
        if (!editFormData.date || !editFormData.docNo || !editFormData.description) {
            alert("กรุณากรอกข้อมูลให้ครบ");
            return;
        }

        editTransaction(selectedTx.id, editFormData);
        setIsEditing(false);
        setIsDetailModalOpen(false);
    };

    const handleDelete = () => {
        if (!selectedTx) return;
        if (deleteConfirmation !== 'ยืนยัน') {
            alert('กรุณาพิมพ์คำว่า "ยืนยัน" ให้ถูกต้อง');
            return;
        }
        deleteTransaction(selectedTx.id, "ผู้ใช้ลบรายการ manual");
        setIsDetailModalOpen(false);
    };

    const getCleanTitle = (t: string) => {
        return t.replace(/^[\d\.]+\s*/, '');
    };

    // Parse Thai date string dd/mm/yyyy(BE) to ISO date string
    const parseThaiDate = (s: string): string | null => {
        const trimmed = s.trim();
        const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) return null;
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const yearBE = parseInt(m[3], 10);
        const yearCE = yearBE - 543;
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        return `${yearCE}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    // Parse export date input: auto-detect single date or range
    const parseDateInput = (input: string): { start: string; end: string } | null => {
        // Try range format: "dd/mm/yyyy - dd/mm/yyyy"
        if (input.includes('-') && input.split('-').length >= 2) {
            // Check for range separator " - " (with spaces)
            const rangeParts = input.split(/\s*-\s*/);
            // A range will have format like ["16/5/2569", "17/5/2569"]
            // But a single date like "16/5/2569" has no " - " separator
            // We need to distinguish "16/5/2569" from "16/5/2569 - 17/5/2569"
            // The key: a range has TWO parts that each look like dd/mm/yyyy
            if (rangeParts.length >= 2) {
                const startCandidate = rangeParts[0].trim();
                const endCandidate = rangeParts[rangeParts.length - 1].trim();
                const startISO = parseThaiDate(startCandidate);
                const endISO = parseThaiDate(endCandidate);
                if (startISO && endISO) {
                    return { start: startISO, end: endISO };
                }
            }
        }
        // Try single date
        const singleISO = parseThaiDate(input.trim());
        if (singleISO) {
            return { start: singleISO, end: singleISO };
        }
        return null;
    };

    const openExportModal = (format: 'pdf' | 'excel') => {
        setExportFormat(format);
        setIsExportModalOpen(true);
    };

    const handleExportConfirm = () => {
        const parsed = parseDateInput(exportDateInput);
        if (!parsed) {
            alert('รูปแบบวันที่ไม่ถูกต้อง\nตัวอย่าง: 16/5/2569 หรือ 16/5/2569 - 17/5/2569');
            return;
        }
        if (exportFormat === 'pdf') {
            handleHelperExportPDF(
                pageId, title, parsed.start, parsed.end, transactions, pageTransactions, schoolSettings
            ).then(() => setIsExportModalOpen(false))
                .catch(err => alert('เกิดข้อผิดพลาด: ' + String(err)));
        } else {
            handleHelperExportExcel(
                pageId, title, parsed.start, parsed.end, transactions, pageTransactions
            );
            setIsExportModalOpen(false);
        }
    };

    const totalIncome = pageTransactions.reduce((acc, t) => acc + (t.income || 0), 0);
    const totalExpense = pageTransactions.reduce((acc, t) => acc + (t.expense || 0), 0);
    const totalBalance = totalIncome - totalExpense;

    const availableTaxIncomes = useMemo(() => {
        if (!isTaxFund) return [];
        return transactions.filter(t => t.fundType === 'fund-tax' && t.income > 0).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, isTaxFund]);

    return (
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-background-dark p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-6 pb-10">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-text dark:text-text-dark flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary bg-blue-100 p-2 rounded-lg">account_balance_wallet</span>
                        {title}
                    </h2>
                    <div className="flex gap-2">
                        {/* Export Hover Dropdown */}
                        <div className="relative group/export z-30">
                            <button
                                className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 text-text-muted rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                                title="ส่งออกรายงาน"
                            >
                                <span className="material-symbols-outlined text-xl">download</span>
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover/export:opacity-100 group-hover/export:visible transition-all overflow-hidden transform origin-top-right scale-95 group-hover/export:scale-100">
                                <button onClick={() => openExportModal('pdf')}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 transition-colors">
                                    <span className="material-symbols-outlined text-red-600 text-lg">picture_as_pdf</span>
                                    PDF
                                </button>
                                <button onClick={() => openExportModal('excel')}
                                    className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/10 flex items-center gap-3 transition-colors">
                                    <span className="material-symbols-outlined text-green-600 text-lg">table_view</span>
                                    Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-text-muted">รายรับทั้งหมด</p>
                        <p className="text-xl font-bold text-blue-600">{totalIncome === 0 ? '-' : `฿${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</p>
                    </div>
                    <div className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-text-muted">รายจ่ายทั้งหมด</p>
                        <p className="text-xl font-bold text-red-500">{totalExpense === 0 ? '-' : `฿${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</p>
                    </div>
                    <div className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-text-muted">คงเหลือสุทธิ</p>
                        <p className="text-xl font-bold text-green-600">{totalBalance === 0 ? '-' : `฿${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</p>
                    </div>
                </div>

                {/* Transaction Table */}
                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[400px]">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-text dark:text-text-dark">รายการเคลื่อนไหว (Ledger)</h3>
                        <span className="text-xs text-text-muted">เรียงตามวันที่ล่าสุด</span>
                    </div>

                    {pageTransactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-text-muted font-semibold text-xs border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 whitespace-nowrap min-w-[110px]">ว/ด/ป</th>
                                        <th className="px-6 py-3 whitespace-nowrap">ที่เอกสาร</th>
                                        <th className="px-6 py-3 w-full">รายการ</th>
                                        <th className="px-6 py-3 whitespace-nowrap">รับจาก/จ่ายให้</th>
                                        <th className="px-6 py-3 text-right whitespace-nowrap">รายรับ</th>
                                        <th className="px-6 py-3 text-right whitespace-nowrap">รายจ่าย</th>
                                        <th className="px-6 py-3 text-right whitespace-nowrap">คงเหลือ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {pageTransactions.map((tx, index) => {
                                        // Calculate balance dynamically for display 
                                        // Let's compute balance for this specific transaction correctly
                                        // Filter all transactions <= this transaction date&ID
                                        const relevantTxs = transactions.filter(t => t.fundType === pageId && (new Date(t.date).getTime() < new Date(tx.date).getTime() || (new Date(t.date).getTime() === new Date(tx.date).getTime() && t.id <= tx.id)));
                                        const currentBalance = relevantTxs.reduce((acc, t) => acc + (t.income || 0) - (t.expense || 0), 0);

                                        return (
                                            <tr
                                                key={tx.id}
                                                onClick={() => handleRowClick(tx)}
                                                className="hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">{formatThaiDateShort(tx.date)}</td>
                                                <td className="px-6 py-4 font-mono text-xs">{tx.docNo}</td>
                                                <td className="px-6 py-4">{tx.description}</td>
                                                <td className="px-6 py-4 text-xs text-text-muted truncate max-w-[150px]">
                                                    {tx.income > 0 ? (tx.payer || '-') : (tx.payee || '-')}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-green-600">
                                                    {tx.income > 0 ? tx.income.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-red-600">
                                                    {tx.expense > 0 ? tx.expense.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-text dark:text-text-dark">
                                                    {currentBalance === 0 ? '-' : currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-text-muted opacity-60">
                            <span className="material-symbols-outlined text-5xl mb-2">history_edu</span>
                            <p>ยังไม่มีรายการบันทึก</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal - Clean card style matching CashBook */}
            {isDetailModalOpen && selectedTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-scale-in">
                        <div className="px-6 pt-5 pb-3 flex justify-between items-start">
                            <div>
                                <p className="text-xs text-gray-400">รายละเอียดรายการ</p>
                                <h2 className="text-lg font-bold text-gray-900">{isEditing ? 'แก้ไขรายการ' : (selectedTx.income > 0 ? 'รายรับ' : 'รายจ่าย')}</h2>
                            </div>
                            <button onClick={() => { setIsDetailModalOpen(false); setIsEditing(false); setIsDeleting(false); setDeleteConfirmation(''); }}
                                className="text-blue-500 hover:text-blue-700 text-sm font-semibold">ปิด</button>
                        </div>

                        {isEditing ? (
                            <div className="px-6 pb-4 space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">วันที่</label>
                                    <ThaiDatePicker value={editFormData.date || ''} onChange={handleEditDateChange} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 block mb-1">ที่เอกสาร</label>
                                        <input type="text" name="docNo" value={editFormData.docNo} onChange={handleEditChange}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 block mb-1">จำนวนเงิน</label>
                                        <input type="number" step="0.01"
                                            name={selectedTx.income > 0 ? 'income' : 'expense'}
                                            value={selectedTx.income > 0 ? editFormData.income : editFormData.expense}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setEditFormData(prev => ({
                                                    ...prev,
                                                    [selectedTx.income > 0 ? 'income' : 'expense']: val
                                                }))
                                            }}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none text-right font-bold" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">รายการ</label>
                                    <input type="text" name="description" value={editFormData.description} onChange={handleEditChange}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => setIsEditing(false)}
                                        className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200">ยกเลิก</button>
                                    <button onClick={saveEdit}
                                        className="flex-[2] py-2 rounded-xl text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600">บันทึก</button>
                                </div>
                            </div>
                        ) : !isDeleting ? (
                            <div className="px-6 pb-4">
                                <div className="space-y-2 mb-4">
                                    {[
                                        { label: 'วันที่', value: formatThaiDate(selectedTx.date) },
                                        { label: 'ที่เอกสาร', value: selectedTx.docNo || '-' },
                                        { label: 'รายการ', value: selectedTx.description },
                                        { label: selectedTx.income > 0 ? 'รับจาก' : 'จ่ายให้', value: (selectedTx.income > 0 ? selectedTx.payer : selectedTx.payee) || '-' },
                                        { label: selectedTx.income > 0 ? 'จำนวนรับ' : 'จำนวนจ่าย', value: `฿${(selectedTx.income || selectedTx.expense).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                                            <span className="text-xs text-gray-400">{item.label}</span>
                                            <span className="text-sm font-medium text-gray-800">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={startEdit}
                                        className="flex-1 py-2 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-base">edit</span> แก้ไข
                                    </button>
                                    <button onClick={() => setIsDeleting(true)}
                                        className="flex-1 py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-base">delete</span> ลบ
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {/* Delete confirmation */}
                        {isDeleting && !isEditing && (
                            <div className="px-6 pb-5 border-t border-gray-100 pt-4">
                                <p className="text-sm text-red-600 font-semibold mb-2">⚠️ ยืนยันการลบรายการ</p>
                                <p className="text-xs text-gray-500 mb-3">พิมพ์ <span className="font-bold text-red-600">"ยืนยัน"</span> เพื่อยืนยันการลบ</p>
                                <input type="text" value={deleteConfirmation}
                                    onChange={e => setDeleteConfirmation(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm outline-none focus:border-red-400 mb-3"
                                    placeholder='พิมพ์ "ยืนยัน"' />
                                <div className="flex gap-2">
                                    <button onClick={() => { setIsDeleting(false); setDeleteConfirmation(''); }}
                                        className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200">ยกเลิก</button>
                                    <button onClick={handleDelete}
                                        disabled={deleteConfirmation !== 'ยืนยัน'}
                                        className={`flex-[2] py-2 rounded-xl text-sm font-semibold text-white transition-all ${deleteConfirmation === 'ยืนยัน' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 cursor-not-allowed'}`}>
                                        ลบรายการ
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Export Date Modal */}
            {isExportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                <span className={`material-symbols-outlined text-2xl ${exportFormat === 'pdf' ? 'text-red-600' : 'text-green-600'}`}>
                                    {exportFormat === 'pdf' ? 'picture_as_pdf' : 'table_view'}
                                </span>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                        ส่งออก {exportFormat === 'pdf' ? 'PDF' : 'Excel'}
                                    </h3>
                                    <p className="text-xs text-gray-500">ระบุวันที่ของรายงาน</p>
                                </div>
                            </div>
                            <button onClick={() => setIsExportModalOpen(false)} className="text-text-muted hover:text-red-500 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">วันที่</label>
                                <input
                                    type="text"
                                    value={exportDateInput}
                                    onChange={e => setExportDateInput(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-800"
                                    placeholder="16/5/2569 หรือ 16/5/2569 - 17/5/2569"
                                    autoFocus
                                />
                                <p className="text-xs text-gray-400">
                                    วันเดียว: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">16/5/2569</span>
                                    {' '}หรือช่วง: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">16/5/2569 - 17/5/2569</span>
                                </p>
                                {/* Live preview */}
                                {exportDateInput && (() => {
                                    const parsed = parseDateInput(exportDateInput);
                                    if (!parsed) return <p className="text-xs text-red-400 flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span> รูปแบบไม่ถูกต้อง</p>;
                                    const fmt = (iso: string) => { const d = new Date(iso); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`; };
                                    return (
                                        <p className="text-xs text-green-600 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            {parsed.start === parsed.end ? `วันที่ ${fmt(parsed.start)}` : `${fmt(parsed.start)} ถึง ${fmt(parsed.end)}`}
                                        </p>
                                    );
                                })()}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setIsExportModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                                    ยกเลิก
                                </button>
                                <button onClick={handleExportConfirm}
                                    disabled={!parseDateInput(exportDateInput)}
                                    className={`flex-[2] py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 ${exportFormat === 'pdf'
                                        ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
                                        : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'
                                        } disabled:cursor-not-allowed`}>
                                    <span className="material-symbols-outlined text-base">
                                        {exportFormat === 'pdf' ? 'picture_as_pdf' : 'table_view'}
                                    </span>
                                    สร้าง {exportFormat === 'pdf' ? 'PDF' : 'Excel'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default FundView;
