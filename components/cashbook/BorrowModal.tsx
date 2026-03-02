import React, { useState, useMemo } from 'react';
import { useSchoolData } from '../../context/SchoolContext';
import { FUND_TYPE_OPTIONS } from '../../utils';
import { buildLoanDocPDF, openBlob } from '../loanPdfBuilder';
import { fmtMoney } from './utils';
import ConfirmModal from '../ConfirmModal';

interface BorrowModalProps {
    isOpen: boolean;
    onClose: () => void;
    needAmount?: number; // จำนวนเงินที่ขาดไป
}

const BorrowModal: React.FC<BorrowModalProps> = ({ isOpen, onClose, needAmount = 0 }) => {
    const { transactions, addLoan, addTransaction, schoolSettings } = useSchoolData();

    // Form state
    const [selectedBankId, setSelectedBankId] = useState<string>('');
    const [borrowAmount, setBorrowAmount] = useState(needAmount.toString());
    const [borrowPurpose, setBorrowPurpose] = useState('');
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

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

    const showAlert = (title: string, message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info', onConfirm?: () => void) => {
        setModalConfig({ isOpen: true, title, message, type, onConfirm });
    };

    // Calculate bank account balances
    const bankBalances = useMemo(() => {
        const balances: Record<string, number> = {};

        schoolSettings.bankAccounts?.forEach(acc => {
            const balance = transactions
                .filter(t => acc.fundTypes.includes(t.fundType))
                .reduce((sum, t) => sum + (t.income || 0) - (t.expense || 0), 0);
            balances[acc.id] = balance;
        });

        return balances;
    }, [transactions, schoolSettings.bankAccounts]);

    const selectedBank = schoolSettings.bankAccounts?.find(b => b.id === selectedBankId);
    const selectedBankBalance = selectedBankId ? bankBalances[selectedBankId] || 0 : 0;
    const borrowAmountNum = parseFloat(borrowAmount) || 0;
    const shortfallAmount = Math.max(0, borrowAmountNum - selectedBankBalance);

    const handleCreateLoan = async () => {
        if (!selectedBankId) {
            showAlert('กรุณากรอกข้อมูล', 'กรุณาเลือกบัญชีเงินฝากที่ต้องการยืม', 'warning');
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
        const loanId = `${borrowPrefix}${new Date().getFullYear() + 543}-${String(new Date().getTime()).slice(-6)}`;
        const today = new Date().toISOString().slice(0, 10);

        const newLoan = {
            id: loanId,
            requester: schoolSettings.financeOfficerName || 'เจ้าหน้าที่การเงิน',
            project: borrowPurpose,
            amount: borrowAmountNum,
            dateBorrowed: today,
            dueDate: today,
            status: 'active' as const,
            fromFund: selectedBank?.name || selectedBankId,
            toFund: borrowPurpose,
            returnedAmount: 0,
            bankId: selectedBankId,
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
                description: `ยืมเงินจากบัญชี ${selectedBank?.name || 'ระบุเพิ่มเติม'} เพื่อ ${borrowPurpose}`,
                fundType: selectedBank?.fundTypes[0] || 'fund-subsidy',
                income: borrowAmountNum,
                expense: 0,
                loanId,
                bankId: selectedBankId,
                skipLoanCheck: true,
            });

            // Generate PDF as blob
            const pdfBytes = await buildLoanDocPDF(newLoan, false, schoolSettings, today);
            const blob = new Blob([new Uint8Array(pdfBytes as unknown as ArrayBuffer)], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfBlobUrl(url);

            setIsGeneratingPDF(false);
        } catch (e) {
            console.warn('Error creating loan', e);
            setIsGeneratingPDF(false);
            showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการสร้างสัญญา: ' + String(e), 'error');
        }
    };

    const handleDownloadPDF = () => {
        if (pdfBlobUrl) {
            const a = document.createElement('a');
            a.href = pdfBlobUrl;
            a.download = `loan-${new Date().toISOString().slice(0, 10)}.pdf`;
            a.click();

            // Reset and close
            setBorrowAmount(needAmount.toString());
            setBorrowPurpose('');
            setSelectedBankId('');
            setPdfBlobUrl(null);
            onClose();
        }
    };

    if (!isOpen) return null;

    // If PDF was generated, show download screen
    if (pdfBlobUrl) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                    <div className="px-6 pt-5 pb-3 flex justify-between items-start bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-600">check_circle</span>
                                สร้างเอกสารสำเร็จ
                            </h2>
                            <p className="text-xs text-gray-600 mt-1">เอกสารการยืมเงินพร้อมสำหรับดาวน์โหลด</p>
                        </div>
                    </div>

                    <div className="px-6 py-6 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                            <span className="material-symbols-outlined text-4xl text-green-600">check</span>
                        </div>
                        <div className="space-y-2">
                            <p className="text-lg font-bold text-gray-900">ยืมเงินสำเร็จ</p>
                            <p className="text-sm text-gray-600">จำนวนเงิน: <span className="font-bold text-lg text-green-600">{fmtMoney(borrowAmountNum)} บาท</span></p>
                            <p className="text-sm text-gray-600">วัตถุประสงค์: <span className="font-semibold">{borrowPurpose}</span></p>
                        </div>

                        {borrowAmountNum > selectedBankBalance && (
                            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                                <p className="text-sm text-amber-900">
                                    <span className="font-semibold">⚠️ จำนวนเงินที่ขาดไป:</span><br />
                                    {fmtMoney(shortfallAmount)} บาท
                                </p>
                            </div>
                        )}

                        <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                            <p className="text-xs text-gray-600">บัญชี: {selectedBank?.name}</p>
                            <p className="text-xs text-gray-600">วันที่: {new Date().toLocaleDateString('th-TH')}</p>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition-colors"
                        >
                            ปิด
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">download</span>
                            ดาวน์โหลด PDF
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-5 pb-3 flex justify-between items-start bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">ขอยืมเงิน</h2>
                        <p className="text-xs text-gray-600 mt-1">เลือกบัญชีและระบุจำนวนเงิน</p>
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
                    {/* Select Bank Account */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                            🏦 เลือกบัญชีเงินฝากที่มื่อให้ยืม
                        </label>
                        <select
                            value={selectedBankId}
                            onChange={(e) => setSelectedBankId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                        >
                            <option value="">-- เลือกบัญชี --</option>
                            {schoolSettings.bankAccounts?.map((bank) => (
                                <option key={bank.id} value={bank.id}>
                                    {bank.name} (คงเหลือ {fmtMoney(bankBalances[bank.id] || 0)} ฿)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Bank Details */}
                    {selectedBank && (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-semibold text-blue-900">บัญชี</p>
                                    <p className="text-xs text-blue-700">{selectedBank.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-blue-900">คงเหลือ</p>
                                    <p className="text-lg font-bold text-blue-700">{fmtMoney(selectedBankBalance)}</p>
                                </div>
                            </div>
                            <div className="text-xs text-blue-600">
                                <p>ธนาคาร: {selectedBank.bankName}</p>
                                <p>บัญชีเลขที่: {selectedBank.accountNo}</p>
                            </div>
                        </div>
                    )}

                    {/* Borrow Amount */}
                    <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                            💰 จำนวนเงินที่ต้องการยืม
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={borrowAmount}
                            onChange={(e) => setBorrowAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-base font-bold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-right"
                        />
                        <p className="text-xs text-gray-500 mt-2">บาท</p>
                    </div>

                    {/* Shortfall Warning */}
                    {borrowAmountNum > selectedBankBalance && selectedBank && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
                            <p className="text-sm font-semibold text-amber-900 mb-1">⚠️ จำนวนเงินที่ขาดไป</p>
                            <p className="text-lg font-bold text-amber-700">{fmtMoney(shortfallAmount)} บาท</p>
                            <p className="text-xs text-amber-600 mt-2">บัญชีนี้มีเงินคงเหลือไม่เพียงพอ</p>
                        </div>
                    )}

                    {/* Purpose */}
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

                    {/* Summary */}
                    {borrowAmountNum > 0 && selectedBank && (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
                            <p className="text-xs font-semibold text-gray-600 uppercase">สรุปการยืม</p>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">บัญชี:</span>
                                    <span className="font-semibold text-gray-900">{selectedBank.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">ยืมจำนวน:</span>
                                    <span className="font-bold text-lg text-blue-600">{fmtMoney(borrowAmountNum)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">วัตถุประสงค์:</span>
                                    <span className="font-semibold text-gray-900 text-right max-w-xs">{borrowPurpose || '-'}</span>
                                </div>
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
                        disabled={!selectedBankId || !borrowAmountNum || borrowAmountNum <= 0 || !borrowPurpose || isGeneratingPDF}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        {isGeneratingPDF ? (
                            <>
                                <span className="material-symbols-outlined text-base animate-spin">hourglass_empty</span>
                                กำลังสร้าง...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-base">check_circle</span>
                                ยืมเงิน
                            </>
                        )}
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                onConfirm={() => {
                    if (modalConfig.onConfirm) modalConfig.onConfirm();
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                showCancel={!!modalConfig.onConfirm}
            />
        </div>
    );
};

export default BorrowModal;
