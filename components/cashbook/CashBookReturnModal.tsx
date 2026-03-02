import React, { useState } from 'react';
import { useSchoolData } from '../../context/SchoolContext';
import { LoanContract } from '../../types';
import { fmtShort, fmtMoney } from './utils';
import ConfirmModal from '../ConfirmModal';

interface CashBookReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CashBookReturnModal: React.FC<CashBookReturnModalProps> = ({ isOpen, onClose }) => {
    const { loans, repayLoan } = useSchoolData();
    const [selectedLoanId, setSelectedLoanId] = useState<string>('');
    const [isReturning, setIsReturning] = useState(false);

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

    const showAlert = (title: string, message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info', onConfirm?: () => void) => {
        setModalConfig({ isOpen: true, title, message, type, onConfirm });
    };

    if (!isOpen) return null;

    // Filter active loans that still have an outstanding balance
    const activeLoans = loans.filter(l => l.status !== 'returned' && (l.amount - (l.returnedAmount || 0)) > 0);

    const handleReturnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedLoanId) {
            showAlert('กรุณาเลือกรายการ', 'กรุณาเลือกรายการยืมที่ต้องการคืนเงิน', 'warning');
            return;
        }

        const loan = activeLoans.find(l => l.id === selectedLoanId);
        if (!loan) return;

        const outstanding = loan.amount - (loan.returnedAmount || 0);

        showAlert('ยืนยันการคืนเงิน', `ยืนยันการคืนเงินเต็มจำนวนยอด ฿${fmtMoney(outstanding)} สำหรับสัญญา ${loan.id} หรือไม่?`, 'warning', async () => {
            setIsReturning(true);
            try {
                await repayLoan(loan.id, outstanding);
                showAlert('สำเร็จ', 'ทำการคืนเงินเรียบร้อยแล้ว', 'success', () => onClose());
            } catch (error) {
                showAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการคืนเงิน กรุณาลองใหม่อีกครั้ง', 'error');
                console.error(error);
            } finally {
                setIsReturning(false);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/80 backdrop-blur-sm animate-fade-in">
            <form onSubmit={handleReturnSubmit}
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden animate-scale-in mx-4">

                {/* Header */}
                <div className="px-8 pt-6 pb-4 shrink-0 border-b border-gray-100">
                    <div className="flex justify-between items-center bg-white">
                        <div>
                            <p className="text-sm text-gray-400">สมุดเงินสด</p>
                            <h2 className="text-2xl font-bold text-gray-900">
                                คืนเงิน
                            </h2>
                        </div>
                        <button type="button" onClick={onClose}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-white rounded-full shadow-sm hover:bg-red-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6 bg-gray-50/50">
                    {activeLoans.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl text-gray-400">task_alt</span>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">ไม่มีรายการค้างคืนเงิน</h3>
                            <p className="text-sm text-gray-500 mt-1">รายการยืมทั้งหมดถูกคืนเงินเรียบร้อยแล้ว</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 mb-2">เลือกรายการที่ต้องการคืนเงิน (จะทำการคืนเงินเต็มจำนวนที่ค้างชำระ)</p>

                            <div className="grid gap-3">
                                {activeLoans.map(loan => {
                                    const outstanding = loan.amount - (loan.returnedAmount || 0);
                                    const isSelected = selectedLoanId === loan.id;

                                    return (
                                        <div
                                            key={loan.id}
                                            onClick={() => setSelectedLoanId(loan.id)}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                                                ? 'border-blue-500 bg-blue-50/50'
                                                : 'border-gray-200 bg-white hover:border-blue-300'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-bold text-gray-900">{loan.id}</span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                                                            ยืมเมื่อ {fmtShort(loan.dateBorrowed)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 font-medium">{loan.project}</p>
                                                    <p className="text-xs text-gray-500 mt-1">ผู้ยืม: {loan.requester}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500 mb-0.5">ยอดค้างชำระ</p>
                                                    <p className="text-lg font-bold text-red-600">฿{fmtMoney(outstanding)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-white border-t border-gray-100 shrink-0 flex justify-end gap-3">
                    <button type="button" onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={!selectedLoanId || isReturning || activeLoans.length === 0}
                        className={`px-8 py-2.5 rounded-xl font-bold text-white transition-colors flex items-center gap-2 ${!selectedLoanId || isReturning || activeLoans.length === 0
                            ? 'bg-blue-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20'
                            }`}
                    >
                        {isReturning ? (
                            <>
                                <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                กำลังดำเนินการ...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-sm">payments</span>
                                คืนเงิน
                            </>
                        )}
                    </button>
                </div>
            </form>

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

export default CashBookReturnModal;
