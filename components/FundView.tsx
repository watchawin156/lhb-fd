import React, { useState, useMemo, useEffect } from 'react';
import { handleExportExcel as handleHelperExportExcel, handleExportPDF as handleHelperExportPDF } from './exportFundUtils';
import { useSchoolData } from '../context/SchoolContext';
import { Transaction } from '../types';
import FundViewTable from './fundview/FundViewTable';
import FundViewModals from './fundview/FundViewModals';
import { type1Funds, taxTriggerFunds, parseDateInput } from './fundview/FundViewTypes';

interface FundViewProps {
    title: string;
    pageId: string;
}

const FundView: React.FC<FundViewProps> = ({ title, pageId }) => {
    const { transactions, addTransaction, editTransaction, deleteTransaction, schoolSettings } = useSchoolData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');

    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [editFormData, setEditFormData] = useState<Partial<Transaction>>({});

    const today = new Date();
    const todayBE = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear() + 543}`;
    const [exportDateInput, setExportDateInput] = useState(todayBE);

    const pageTransactions = useMemo(() => {
        return transactions
            .filter(t => t.fundType === pageId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, pageId]);

    const payeeHistory = useMemo(() => {
        const history: Record<string, 'individual' | 'juristic'> = {};
        transactions.forEach(t => {
            if (t.payee && t.recipientType) {
                history[t.payee] = t.recipientType;
            }
        });
        return history;
    }, [transactions]);

    const is15YFund = pageId.startsWith('fund-15y-');
    const isTaxFund = pageId === 'fund-tax';
    const isType1 = type1Funds.includes(pageId);
    const isTaxTriggerPage = taxTriggerFunds.includes(pageId);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        docNo: '', description: '',
        transactionType: 'expense',
        amount: '', payer: '', payee: '', recipientType: 'juristic'
    });
    const [selectedTaxIds, setSelectedTaxIds] = useState<number[]>([]);

    useEffect(() => {
        if (is15YFund) setFormData(prev => ({ ...prev, transactionType: 'expense' }));
    }, [is15YFund, isModalOpen]);

    useEffect(() => {
        if (isTaxFund) {
            if (formData.transactionType === 'expense') {
                setFormData(prev => ({ ...prev, payee: 'กรมสรรพากร', description: 'นำส่งภาษีหัก ณ ที่จ่าย', amount: '0' }));
                setSelectedTaxIds([]);
            } else {
                setFormData(prev => ({ ...prev, description: '', amount: '' }));
            }
        }
    }, [isTaxFund, formData.transactionType, isModalOpen]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amountVal = parseFloat(formData.amount) || 0;
        if (amountVal <= 0) { alert("จำนวนเงินต้องมากกว่า 0"); return; }
        const incomeAmount = formData.transactionType === 'income' ? amountVal : 0;
        const expenseAmount = formData.transactionType === 'expense' ? amountVal : 0;
        let taxAmount = 0;
        if (isTaxTriggerPage && expenseAmount > 0) {
            if (formData.recipientType === 'juristic' && expenseAmount >= 500) taxAmount = expenseAmount * 0.01;
            else if (formData.recipientType === 'individual' && expenseAmount >= 10000) taxAmount = expenseAmount * 0.01;
        }
        const newTransaction: Transaction = {
            id: Date.now(), fundType: pageId, date: formData.date, docNo: formData.docNo,
            description: formData.description, income: incomeAmount, expense: expenseAmount,
            payer: formData.transactionType === 'income' ? formData.payer : undefined,
            payee: formData.transactionType === 'expense' ? formData.payee : undefined,
            recipientType: formData.transactionType === 'expense' ? (formData.recipientType as any) : undefined
        };
        addTransaction(newTransaction);
        if (taxAmount > 0) {
            const cleanPageTitle = title.replace(/^[\d\.]+\s*/, '');
            addTransaction({
                id: Date.now() + 1, fundType: 'fund-tax', date: formData.date, docNo: formData.docNo,
                description: `หักภาษี ณ ที่จ่าย (${formData.recipientType === 'juristic' ? 'ภงด.53' : 'ภงด.3'}) - จาก${cleanPageTitle} - ${formData.description}`,
                income: taxAmount, expense: 0, payer: cleanPageTitle
            });
            alert(`ระบบได้บันทึกการหักภาษี ณ ที่จ่าย จำนวน ${taxAmount.toLocaleString()} บาท\nไปยังบัญชี "7. เงินภาษี 1%" เรียบร้อยแล้ว`);
        }
        setIsModalOpen(false);
        setFormData({ date: new Date().toISOString().split('T')[0], docNo: '', description: '', transactionType: 'expense', amount: '', payer: '', payee: '', recipientType: 'juristic' });
        setSelectedTaxIds([]);
    };

    const handleRowClick = (tx: Transaction) => {
        setSelectedTx(tx); setIsDetailModalOpen(true);
        setIsEditing(false); setIsDeleting(false); setDeleteConfirmation('');
    };
    const startEdit = () => {
        if (!selectedTx) return;
        setEditFormData({ date: selectedTx.date, docNo: selectedTx.docNo, description: selectedTx.description, income: selectedTx.income, expense: selectedTx.expense, payer: selectedTx.payer, payee: selectedTx.payee });
        setIsEditing(true);
    };
    const saveEdit = () => {
        if (!selectedTx) return;
        if (!editFormData.date || !editFormData.docNo || !editFormData.description) { alert("กรุณากรอกข้อมูลให้ครบ"); return; }
        editTransaction(selectedTx.id, editFormData);
        setIsEditing(false); setIsDetailModalOpen(false);
    };
    const handleDelete = () => {
        if (!selectedTx) return;
        if (deleteConfirmation !== 'ยืนยัน') { alert('กรุณาพิมพ์คำว่า "ยืนยัน" ให้ถูกต้อง'); return; }
        deleteTransaction(selectedTx.id, "ผู้ใช้ลบรายการ manual");
        setIsDetailModalOpen(false);
    };

    const openExportModal = (format: 'pdf' | 'excel') => { setExportFormat(format); setIsExportModalOpen(true); };
    const handleExportConfirm = () => {
        const parsed = parseDateInput(exportDateInput);
        if (!parsed) { alert('รูปแบบวันที่ไม่ถูกต้อง\nตัวอย่าง: 16/5/2569 หรือ 16/5/2569 - 17/5/2569'); return; }
        if (exportFormat === 'pdf') {
            handleHelperExportPDF(pageId, title, parsed.start, parsed.end, transactions, pageTransactions, schoolSettings)
                .then(() => setIsExportModalOpen(false))
                .catch(err => alert('เกิดข้อผิดพลาด: ' + String(err)));
        } else {
            handleHelperExportExcel(pageId, title, parsed.start, parsed.end, transactions, pageTransactions);
            setIsExportModalOpen(false);
        }
    };

    const totalIncome = pageTransactions.reduce((acc, t) => acc + (t.income || 0), 0);
    const totalExpense = pageTransactions.reduce((acc, t) => acc + (t.expense || 0), 0);
    const totalBalance = totalIncome - totalExpense;

    return (
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-background-dark p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-6 pb-10">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-text dark:text-text-dark flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary bg-blue-100 p-2 rounded-lg">account_balance_wallet</span>
                        {title}
                    </h2>
                    <div className="flex gap-2">
                        <div className="relative group/export z-30">
                            <button className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 text-text-muted rounded-lg shadow-sm hover:bg-gray-50 transition-colors" title="ส่งออกรายงาน">
                                <span className="material-symbols-outlined text-xl">download</span>
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover/export:opacity-100 group-hover/export:visible transition-all overflow-hidden transform origin-top-right scale-95 group-hover/export:scale-100">
                                <button onClick={() => openExportModal('pdf')} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 transition-colors">
                                    <span className="material-symbols-outlined text-red-600 text-lg">picture_as_pdf</span> PDF
                                </button>
                                <button onClick={() => openExportModal('excel')} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/10 flex items-center gap-3 transition-colors">
                                    <span className="material-symbols-outlined text-green-600 text-lg">table_view</span> Excel
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
                    <FundViewTable pageId={pageId} pageTransactions={pageTransactions} transactions={transactions} onRowClick={handleRowClick} />
                </div>
            </div>

            <FundViewModals
                isDetailModalOpen={isDetailModalOpen} selectedTx={selectedTx}
                isEditing={isEditing} isDeleting={isDeleting}
                deleteConfirmation={deleteConfirmation} editFormData={editFormData}
                onCloseDetail={() => { setIsDetailModalOpen(false); setIsEditing(false); setIsDeleting(false); setDeleteConfirmation(''); }}
                onStartEdit={startEdit} onSaveEdit={saveEdit}
                onCancelEdit={() => setIsEditing(false)}
                onStartDelete={() => setIsDeleting(true)}
                onCancelDelete={() => { setIsDeleting(false); setDeleteConfirmation(''); }}
                onConfirmDelete={handleDelete}
                onDeleteConfirmationChange={setDeleteConfirmation}
                onEditChange={(e) => { const { name, value } = e.target; setEditFormData(prev => ({ ...prev, [name]: value })); }}
                onEditDateChange={(date) => setEditFormData(prev => ({ ...prev, date }))}
                isExportModalOpen={isExportModalOpen} exportFormat={exportFormat}
                exportDateInput={exportDateInput}
                onCloseExport={() => setIsExportModalOpen(false)}
                onExportDateChange={setExportDateInput}
                onExportConfirm={handleExportConfirm}
            />
        </div>
    );
};

export default FundView;
