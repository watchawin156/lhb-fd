import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolContext';
import { FUND_TYPE_OPTIONS } from '../../utils';
import { buildLoanDocPDF, openBlob } from '../loanPdfBuilder';
import { fmtMoney } from './utils';

interface BorrowModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedFundType?: string;
}

const BorrowModal: React.FC<BorrowModalProps> = ({ isOpen, onClose, selectedFundType = 'fund-subsidy' }) => {
    const { transactions, addLoan, addTransaction, schoolSettings } = useSchoolData();
    
    // Form state
    const [toBorrowFund, setToBorrowFund] = useState(selectedFundType);
    const [fromBorrowFund, setFromBorrowFund] = useState('fund-subsidy');
    const [borrowAmount, setBorrowAmount] = useState('');
    const [borrowPurpose, setBorrowPurpose] = useState('');
    const [autoFill, setAutoFill] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const getFundLabel = (ft: string) => {
        return FUND_TYPE_OPTIONS.find(o => o.value === ft)?.label?.replace(/^\d+\.?\d*\s*/, '') || ft;
    };

    // Calculate fund balances
    const fundBalances = useMemo(() => {
        const balances: Record<string, number> = {};
        transactions.forEach(t => {
            if (!balances[t.fundType]) balances[t.fundType] = 0;
            balances[t.fundType] += (t.income || 0) - (t.expense || 0);
        });
        return balances;
    }, [transactions]);

    const fromFundBalance = fundBalances[fromBorrowFund] || 0;
    const toBorrowBalance = fundBalances[toBorrowFund] || 0;
    const autoAmount = fromFundBalance > 0 ? fromFundBalance : 0;

    const handleAutoFill = () => {
        setBorrowAmount(autoAmount.toString());
        setAutoFill(true);
    };

    const handleCreateLoan = async () => {
        const amount = parseFloat(borrowAmount);
        if (!amount || amount <= 0) {
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
            amount: amount,
            dateBorrowed: today,
            dueDate: today,
            status: 'active' as const,
            fromFund: fromBorrowFund,
            toFund: toBorrowFund,
            returnedAmount: 0,
        };

        // Add loan to context
        addLoan(newLoan);

        // Create transactions for the borrowed amount
        // Deduct from source fund
        try {
            await addTransaction({
                id: Date.now(),
                date: today,
                docNo: loanId,
                description: `ยืมให้หมวด ${getFundLabel(toBorrowFund)}`,
                fundType: fromBorrowFund,
                income: 0,
                expense: amount,
                skipLoanCheck: true,
            });

            // Add to destination fund
            await addTransaction({
                id: Date.now() + 1,
                date: today,
                docNo: loanId,
                description: `ยืมจากหมวด ${getFundLabel(fromBorrowFund)}`,
                fundType: toBorrowFund,
                income: amount,
                expense: 0,
                skipLoanCheck: true,
            });
        } catch (e) {
            console.warn('Transaction creation error', e);
        }

        // Generate and print PDF
        try {
            await buildLoanDocPDF(newLoan, false, schoolSettings, today);
        } catch (e) {
            console.warn('PDF generation error (non-blocking)', e);
        }

        // Reset form
        setBorrowAmount('');
        setBorrowPurpose('');
        setAutoFill(false);
        onClose();

        alert(`สร้างสัญญายืมเงิน ${loanId} สำเร็จ และบันทึกรายการแล้ว`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-5 pb-3 flex justify-between items-start bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">ขอยืมเงินระหว่างกองทุน</h2>
                        <p className="text-xs text-gray-500 mt-1">เลือกกองทุนต้นทาง และกำหนดจำนวนเงิน</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* ยืมไปยังกองทุน */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                            🎯 ยืมไปยังกองทุน (ปลายทาง)
                        </label>
                        <select
                            value={toBorrowFund}
                            onChange={(e) => setToBorrowFund(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                        >
                            {FUND_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label} (คงเหลือ {fmtMoney(fundBalances[opt.value] || 0)} ฿)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* ยืมจากกองทุน */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                            ✈️ ยืมจากกองทุน (ต้นทาง)
                        </label>
                        <select
                            value={fromBorrowFund}
                            onChange={(e) => setFromBorrowFund(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                        >
                            {FUND_TYPE_OPTIONS.filter((opt) => opt.value !== toBorrowFund).map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label} (คงเหลือ {fmtMoney(fundBalances[opt.value] || 0)} ฿)
                                </option>
                            ))}
                        </select>
                        {fromFundBalance <= 0 && (
                            <p className="text-xs text-red-600 mt-2">⚠️ ยอดคงเหลือในกองทุนนี้อาจไม่เพียงพอ ระบบจะจัดการอัตโนมัติ</p>
                        )}
                    </div>

                    {/* จำนวนเงิน */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                            💰 จำนวนเงินที่ต้องการยืม
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                step="0.01"
                                value={borrowAmount}
                                onChange={(e) => {
                                    setBorrowAmount(e.target.value);
                                    setAutoFill(false);
                                }}
                                placeholder="0.00"
                                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-base font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-right"
                            />
                            <button
                                onClick={handleAutoFill}
                                type="button"
                                className="px-4 py-2.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold text-sm whitespace-nowrap transition-colors"
                            >
                                ใช้ยอดคงเหลือ ({fmtMoney(autoAmount)} ฿)
                            </button>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">บาท</span>
                    </div>

                    {/* วัตถุประสงค์ */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                            📝 วัตถุประสงค์การยืม
                        </label>
                        <textarea
                            value={borrowPurpose}
                            onChange={(e) => setBorrowPurpose(e.target.value)}
                            placeholder="เช่น จ่ายค่าโครงการ / จ่ายค่าสิ้นค้า / ฯลฯ"
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                        />
                    </div>

                    {/* Summary Info */}
                    {borrowAmount && parseFloat(borrowAmount) > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                            <p className="text-sm font-medium text-amber-900">📌 สรุปข้อมูลการยืม</p>
                            <div className="text-xs text-amber-800 space-y-1">
                                <p>ยืมจาก: <span className="font-semibold">{getFundLabel(fromBorrowFund)}</span></p>
                                <p>ยืมให้: <span className="font-semibold">{getFundLabel(toBorrowFund)}</span></p>
                                <p>จำนวนเงิน: <span className="font-semibold text-lg">{fmtMoney(parseFloat(borrowAmount))} บาท</span></p>
                                <p>วัตถุประสงค์: <span className="font-semibold">{borrowPurpose || '(ไม่ระบุ)'}</span></p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleCreateLoan}
                        disabled={!borrowAmount || parseFloat(borrowAmount) <= 0 || !borrowPurpose}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        สร้างสัญญายืม
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BorrowModal;
