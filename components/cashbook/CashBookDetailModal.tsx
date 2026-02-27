import React, { useEffect, useMemo, useState } from 'react';
import { useSchoolData } from '../../context/SchoolContext';
import { FUND_TYPE_OPTIONS } from '../../utils';
import { buildLoanDocPDF, openBlob } from '../loanPdfBuilder';
import { fmtMoney, fmtShort } from './utils';

interface CashBookDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    txId: number | string | null;
}

type LoanLike = {
    id: string;
    requester: string;
    project: string;
    amount: number;
    dateBorrowed: string;
    dueDate: string;
    status: 'active' | 'overdue' | 'returned';
    fromFund?: string;
    toFund?: string;
    returnedAmount?: number;
};

type RepayRecord = {
    date: string;
    amount: number;
};

const CashBookDetailModal: React.FC<CashBookDetailModalProps> = ({ isOpen, onClose, txId }) => {
    const {
        transactions,
        editTransaction,
        deleteTransaction,
        loans,
        repayLoan,
        addTransaction,
        schoolSettings,
    } = useSchoolData();

    const [isEditingTx, setIsEditingTx] = useState(false);
    const [showDeletePrompt, setShowDeletePrompt] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [editTxData, setEditTxData] = useState({
        date: '',
        docNo: '',
        description: '',
        amount: '',
        fundType: '',
        payer: '',
        payee: '',
    });

    const [repayDate, setRepayDate] = useState(new Date().toISOString().slice(0, 10));
    const [repayAmount, setRepayAmount] = useState('');
    const [isRepaying, setIsRepaying] = useState(false);

    const selectedTx = useMemo(
        () => transactions.find((t: any) => String(t.id) === String(txId)),
        [transactions, txId]
    );

    const parseLoanIdFromDocNo = (docNo: string) => {
        const match = docNo.match(/(LN(?:-AUTO)?-[A-Za-z0-9-]+)/);
        return match ? match[1] : '';
    };

    const inferredLoan = useMemo<LoanLike | null>(() => {
        if (!selectedTx) return null;

        const description = String(selectedTx.description || '');
        const docNo = String(selectedTx.docNo || '');
        const isBorrowLike = Boolean(selectedTx.loanId) || docNo.includes('(ยืม)') || description.includes('ยืม');
        if (!isBorrowLike) return null;

        const amount = selectedTx.income > 0 ? selectedTx.income : selectedTx.expense;
        if (!amount || amount <= 0) return null;

        const groupTxs = transactions.filter((t: any) => t.date === selectedTx.date && t.docNo === selectedTx.docNo);
        const donorTx = groupTxs.find((t: any) => t.expense > 0 && String(t.description || '').includes('ยืม'));
        const receiverTx = groupTxs.find((t: any) => t.income > 0 && String(t.description || '').includes('ยืม'));

        const inferredId = selectedTx.loanId || parseLoanIdFromDocNo(docNo) || `AUTO-${selectedTx.date}-${selectedTx.id}`;

        const returnedAmount = transactions
            .filter((t: any) => {
                if ((t.expense || 0) <= 0) return false;
                if (!String(t.description || '').includes('คืนเงินยืม')) return false;
                return String(t.loanId || '') === inferredId
                    || String(t.description || '').includes(inferredId)
                    || String(t.docNo || '').includes(inferredId);
            })
            .reduce((sum: number, t: any) => sum + (t.expense || 0), 0);

        return {
            id: inferredId,
            requester: schoolSettings.financeOfficerName || 'เจ้าหน้าที่การเงิน',
            project: receiverTx?.fundType || selectedTx.fundType || 'เงินยืม',
            amount,
            dateBorrowed: selectedTx.date,
            dueDate: selectedTx.date,
            status: returnedAmount >= amount ? 'returned' : 'active',
            fromFund: donorTx?.fundType || (selectedTx.expense > 0 ? selectedTx.fundType : undefined),
            toFund: receiverTx?.fundType || (selectedTx.income > 0 ? selectedTx.fundType : undefined),
            returnedAmount,
        };
    }, [selectedTx, transactions, schoolSettings.financeOfficerName]);

    const linkedLoan = useMemo<LoanLike | null>(() => {
        if (!selectedTx) return null;

        const directLoanId = selectedTx.loanId || parseLoanIdFromDocNo(selectedTx.docNo || '');
        if (directLoanId) {
            const directLoan = loans.find(l => l.id === directLoanId);
            if (directLoan) return directLoan;
        }

        if (inferredLoan) return inferredLoan;

        const amount = selectedTx.income > 0 ? selectedTx.income : selectedTx.expense;
        if (!amount) return null;

        const fallback = loans
            .filter(l => Math.abs(l.amount - amount) < 0.0001)
            .filter(l => (
                (selectedTx.income > 0 && l.toFund === selectedTx.fundType)
                || (selectedTx.expense > 0 && l.fromFund === selectedTx.fundType)
            ))
            .sort((a, b) => String(b.dateBorrowed).localeCompare(String(a.dateBorrowed)));

        return fallback[0] || null;
    }, [selectedTx, loans, inferredLoan]);

    const repaymentRecords = useMemo<RepayRecord[]>(() => {
        if (!linkedLoan) return [];

        const keys = new Set<string>();
        if (linkedLoan.id) keys.add(linkedLoan.id);
        if (selectedTx?.loanId) keys.add(String(selectedTx.loanId));
        const docLoanId = parseLoanIdFromDocNo(String(selectedTx?.docNo || ''));
        if (docLoanId) keys.add(docLoanId);

        const keyArr = Array.from(keys).filter(Boolean);

        return transactions
            .filter((t: any) => {
                if ((t.expense || 0) <= 0) return false;
                if (!String(t.description || '').includes('คืนเงินยืม')) return false;

                if (t.loanId && keyArr.includes(String(t.loanId))) return true;
                return keyArr.some(k => String(t.description || '').includes(k) || String(t.docNo || '').includes(k));
            })
            .sort((a: any, b: any) => {
                const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
                if (byDate !== 0) return byDate;
                return Number(b.id || 0) - Number(a.id || 0);
            })
            .map((t: any) => ({ date: t.date, amount: Number(t.expense || 0) }));
    }, [linkedLoan, selectedTx, transactions]);

    const totalReturnedFromTx = repaymentRecords.reduce((sum, r) => sum + r.amount, 0);
    const returnedMerged = linkedLoan ? Math.max(linkedLoan.returnedAmount || 0, totalReturnedFromTx) : 0;
    const outstanding = linkedLoan ? Math.max(0, linkedLoan.amount - returnedMerged) : 0;
    const latestRepayment = repaymentRecords[0] || null;

    useEffect(() => {
        if (isOpen && selectedTx && !isEditingTx && !showDeletePrompt) {
            setEditTxData({
                date: selectedTx.date,
                docNo: selectedTx.docNo || '',
                description: selectedTx.description || '',
                amount: String(selectedTx.income > 0 ? selectedTx.income : selectedTx.expense),
                fundType: selectedTx.fundType || '',
                payer: selectedTx.payer || '',
                payee: selectedTx.payee || '',
            });
        }
    }, [isOpen, selectedTx, isEditingTx, showDeletePrompt]);

    useEffect(() => {
        if (isOpen) {
            setRepayDate(new Date().toISOString().slice(0, 10));
            setRepayAmount(outstanding > 0 ? String(outstanding) : '');
        }
    }, [isOpen, selectedTx?.id, linkedLoan?.id, outstanding]);

    if (!isOpen || !selectedTx) return null;

    const handleEditSave = async () => {
        const amt = parseFloat(editTxData.amount) || 0;
        await editTransaction(selectedTx.id, {
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
        onClose();
    };

    const handleDelete = async () => {
        await deleteTransaction(selectedTx.id, 'ลบรายการจากสมุดเงินสด');
        setShowDeletePrompt(false);
        setDeleteConfirm('');
        onClose();
    };

    const handleClose = () => {
        setIsEditingTx(false);
        setShowDeletePrompt(false);
        setDeleteConfirm('');
        onClose();
    };

    const handleOpenLoanPDF = async (isReturn: boolean, overrideAmount?: number, overrideDate?: string) => {
        if (!linkedLoan) {
            alert('ไม่พบสัญญายืมที่เกี่ยวข้อง');
            return;
        }

        const amountForDoc = overrideAmount ?? (isReturn ? (latestRepayment?.amount || 0) : linkedLoan.amount);
        if (isReturn && amountForDoc <= 0) {
            alert('ยังไม่มีข้อมูลการคืนเงินสำหรับพิมพ์เอกสาร');
            return;
        }

        const docDate = overrideDate
            || (isReturn ? latestRepayment?.date : linkedLoan.dateBorrowed)
            || new Date().toISOString().slice(0, 10);

        try {
            const pdfBytes = await buildLoanDocPDF(
                { ...linkedLoan, amount: amountForDoc },
                isReturn,
                schoolSettings,
                docDate
            );
            openBlob(pdfBytes);
        } catch (e) {
            console.warn('failed to generate loan pdf', e);
            alert('สร้างเอกสาร PDF ไม่สำเร็จ');
        }
    };

    const handleRepay = async () => {
        if (!linkedLoan) {
            alert('ไม่พบสัญญายืมที่เกี่ยวข้อง');
            return;
        }
        if (outstanding <= 0) {
            alert('สัญญานี้คืนครบแล้ว');
            return;
        }

        const repayAmountNum = parseFloat(repayAmount) || 0;
        if (repayAmountNum <= 0) {
            alert('กรุณากรอกจำนวนเงินคืนให้ถูกต้อง');
            return;
        }
        if (repayAmountNum > outstanding) {
            alert(`จำนวนเงินคืนเกินยอดคงเหลือ (${fmtMoney(outstanding)})`);
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(repayDate)) {
            alert('กรุณาระบุวันที่คืนเงิน');
            return;
        }

        setIsRepaying(true);
        try {
            const realLoan = loans.find(l => l.id === linkedLoan.id);

            if (realLoan) {
                await repayLoan(linkedLoan.id, repayAmountNum, repayDate);
            } else {
                if (!linkedLoan.fromFund || !linkedLoan.toFund) {
                    alert('ไม่พบหมวดต้นทาง/ปลายทางของการยืม จึงไม่สามารถคืนเงินอัตโนมัติได้');
                    return;
                }

                const loanIdForTx = selectedTx.loanId || linkedLoan.id;
                await addTransaction({
                    id: Date.now(),
                    date: repayDate,
                    docNo: `คืน-${linkedLoan.id}`,
                    description: `คืนเงินยืม ${linkedLoan.id}`,
                    fundType: linkedLoan.toFund,
                    income: 0,
                    expense: repayAmountNum,
                    loanId: loanIdForTx,
                    skipLoanCheck: true,
                });
                await addTransaction({
                    id: Date.now() + 1,
                    date: repayDate,
                    docNo: `คืน-${linkedLoan.id}`,
                    description: `คืนเงินยืม ${linkedLoan.id}`,
                    fundType: linkedLoan.fromFund,
                    income: repayAmountNum,
                    expense: 0,
                    loanId: loanIdForTx,
                    skipLoanCheck: true,
                });
            }

            await handleOpenLoanPDF(true, repayAmountNum, repayDate);
            setRepayAmount('');
        } finally {
            setIsRepaying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-scale-in">
                <div className="px-6 pt-5 pb-3 flex justify-between items-start">
                    <div>
                        <p className="text-xs text-gray-400">รายละเอียดรายการ</p>
                        <h2 className="text-lg font-bold text-gray-900">
                            {isEditingTx ? 'แก้ไขรายการ' : (selectedTx.income > 0 ? 'รายรับ' : 'รายจ่าย')}
                        </h2>
                    </div>
                    <button onClick={handleClose} className="text-blue-500 hover:text-blue-700 text-sm font-semibold">ปิด</button>
                </div>

                {isEditingTx ? (
                    <div className="px-6 pb-5 space-y-3">
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
                                        const be = parseInt(m[3], 10);
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

                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">ที่เอกสาร</label>
                            <input
                                type="text"
                                value={editTxData.docNo}
                                onChange={e => setEditTxData({ ...editTxData, docNo: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">ประเภทเงิน</label>
                            <select
                                value={editTxData.fundType}
                                onChange={e => setEditTxData({ ...editTxData, fundType: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white transition-colors"
                            >
                                {Array.from(new Set(FUND_TYPE_OPTIONS.map(o => o.group))).map(group => (
                                    <optgroup key={group} label={group}>
                                        {FUND_TYPE_OPTIONS.filter(o => o.group === group).map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">รายการ</label>
                            <input
                                type="text"
                                value={editTxData.description}
                                onChange={e => setEditTxData({ ...editTxData, description: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">
                                {selectedTx.income > 0 ? 'ผู้นำส่ง / หัวรายการ' : 'ผู้รับเงิน / หัวรายการ'}
                            </label>
                            <input
                                type="text"
                                value={selectedTx.income > 0 ? editTxData.payer : editTxData.payee}
                                onChange={e => {
                                    if (selectedTx.income > 0) setEditTxData({ ...editTxData, payer: e.target.value });
                                    else setEditTxData({ ...editTxData, payee: e.target.value });
                                }}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">
                                จำนวนเงิน ({selectedTx.income > 0 ? 'รับ' : 'จ่าย'})
                            </label>
                            <div className={`flex items-center rounded-xl px-4 py-3 border ${parseFloat(editTxData.amount) > 0 ? (selectedTx.income > 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300') : 'bg-gray-50 border-gray-200'}`}>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editTxData.amount}
                                    onChange={e => setEditTxData({ ...editTxData, amount: e.target.value })}
                                    className={`w-full text-base font-bold text-right outline-none bg-transparent ${parseFloat(editTxData.amount) > 0 ? (selectedTx.income > 0 ? 'text-green-700' : 'text-red-700') : 'text-gray-400'}`}
                                    placeholder="0.00"
                                />
                                <span className="text-sm text-gray-400 ml-2">บาท</span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => setIsEditingTx(false)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleEditSave}
                                className="flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                            >
                                บันทึกการแก้ไข
                            </button>
                        </div>
                    </div>
                ) : (
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

                        {linkedLoan && (
                            <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                                <p className="text-xs text-emerald-700">สัญญายืม: {linkedLoan.id}</p>
                                <p className="text-xs text-emerald-800 font-semibold">ยอดคงเหลือ: ฿{fmtMoney(outstanding)}</p>
                            </div>
                        )}

                        {linkedLoan && (
                            <div className="space-y-2 mb-3">
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleOpenLoanPDF(false)}
                                        className="flex-1 min-w-[48%] py-2 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-base">picture_as_pdf</span> PDF ขอยืม
                                    </button>
                                    {latestRepayment && (
                                        <button
                                            onClick={() => handleOpenLoanPDF(true)}
                                            className="flex-1 min-w-[48%] py-2 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 flex items-center justify-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-base">picture_as_pdf</span> PDF คืนเงิน
                                        </button>
                                    )}
                                </div>

                                <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-3 space-y-2">
                                    <p className="text-xs font-semibold text-green-900">ทำเรื่องคืนเงิน</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[11px] text-green-800 block mb-1">วันที่คืน</label>
                                            <input
                                                type="date"
                                                value={repayDate}
                                                onChange={(e) => setRepayDate(e.target.value)}
                                                className="w-full rounded-lg border border-green-300 px-2 py-1.5 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-green-800 block mb-1">จำนวนเงินคืน</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={repayAmount}
                                                onChange={(e) => setRepayAmount(e.target.value)}
                                                className="w-full rounded-lg border border-green-300 px-2 py-1.5 text-sm text-right"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleRepay}
                                        disabled={isRepaying || outstanding <= 0}
                                        className={`w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 ${outstanding > 0 && !isRepaying ? 'text-green-700 bg-green-100 hover:bg-green-200' : 'text-gray-400 bg-gray-100 cursor-not-allowed'}`}
                                    >
                                        <span className="material-symbols-outlined text-base">paid</span>
                                        {isRepaying ? 'กำลังบันทึกคืนเงิน...' : (outstanding > 0 ? 'บันทึกคืนเงิน' : 'คืนครบแล้ว')}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setIsEditingTx(true)}
                                className="flex-1 min-w-[48%] py-2 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-1"
                            >
                                <span className="material-symbols-outlined text-base">edit</span> แก้ไข
                            </button>
                            <button
                                onClick={() => setShowDeletePrompt(true)}
                                className="flex-1 min-w-[48%] py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-1"
                            >
                                <span className="material-symbols-outlined text-base">delete</span> ลบ
                            </button>
                        </div>
                    </div>
                )}

                {showDeletePrompt && !isEditingTx && (
                    <div className="px-6 pb-5 border-t border-gray-100 pt-4">
                        <p className="text-sm text-red-600 font-semibold mb-2">ยืนยันการลบรายการ</p>
                        <p className="text-xs text-gray-500 mb-3">พิมพ์ <span className="font-bold text-red-600">"ยืนยัน"</span> เพื่อยืนยันการลบ</p>
                        <input
                            type="text"
                            value={deleteConfirm}
                            onChange={e => setDeleteConfirm(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm outline-none focus:border-red-400 mb-3"
                            placeholder='พิมพ์ "ยืนยัน"'
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowDeletePrompt(false); setDeleteConfirm(''); }}
                                className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200"
                            >
                                ยกเลิก
                            </button>
                            <button
                                disabled={deleteConfirm !== 'ยืนยัน'}
                                onClick={handleDelete}
                                className={`flex-[2] py-2 rounded-xl text-sm font-semibold text-white transition-all ${deleteConfirm === 'ยืนยัน' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 cursor-not-allowed'}`}
                            >
                                ลบรายการ
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CashBookDetailModal;
