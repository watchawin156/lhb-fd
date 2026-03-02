
import React, { useState } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import { formatThaiDate } from '../utils';
import { LoanContract } from '../types';
import ConfirmModal from './ConfirmModal';

const fmtMoney = (n: number) =>
    n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Loan: React.FC = () => {
    const { loans, addLoan, repayLoan } = useSchoolData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
    const [returnAmount, setReturnAmount] = useState('');

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

    // helper to render a simple print view for a loan contract
    const printLoanDoc = (loan: LoanContract) => {
        const html = `
        <html><head><title>สัญญายืมเงิน ${loan.id}</title></head><body>
        <h1>สัญญายืมเงิน</h1>
        <p>เลขที่สัญญา: ${loan.id}</p>
        <p>ผู้ยืม: ${loan.requester}</p>
        <p>โครงการ/หมวด: ${loan.project || '-'}</p>
        <p>จำนวนเงิน: ${loan.amount.toLocaleString()}</p>
        <p>วันที่ยืม: ${loan.dateBorrowed}</p>
        <p>กำหนดคืน: ${loan.dueDate}</p>
        <p>สถานะ: ${loan.status}</p>
        <p>จากหมวด: ${loan.fromFund || '-'}</p>
        <p>ถึงหมวด: ${loan.toFund || '-'}</p>
        <hr/>
        <p>ลงชื่อ ...................................</p>
        </body></html>`;
        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
            w.focus();
            w.print();
        }
    };

    // New Loan Form State
    const [formData, setFormData] = useState<Partial<LoanContract>>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    const handleCreateLoan = () => {
        if (!formData.requester || !formData.amount || !formData.dateBorrowed || !formData.dueDate) {
            showAlert("ข้อมูลไม่ครบถ้วน", "กรุณากรอกข้อมูลให้ครบ", "warning");
            return;
        }

        const newLoan: LoanContract = {
            id: `LN-66-${String(loans.length + 1).padStart(3, '0')}`,
            requester: formData.requester,
            project: formData.project || 'เงินยืมทั่วไป',
            amount: parseFloat(String(formData.amount)),
            dateBorrowed: formData.dateBorrowed,
            dueDate: formData.dueDate,
            status: 'active'
        };

        addLoan(newLoan);
        setIsModalOpen(false);
        setFormData({});
    };

    const handleReturnMoney = () => {
        if (!selectedLoanId) return;

        const loan = loans.find(l => l.id === selectedLoanId);
        if (!loan) return;

        const amount = parseFloat(returnAmount);
        const outstanding = loan.amount - (loan.returnedAmount || 0);

        if (!amount || amount <= 0) {
            showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกจำนวนเงิน', 'warning');
            return;
        }

        if (amount > outstanding) {
            showAlert('ข้อมูลไม่ถูกต้อง', `จำนวนเงินไม่ควรเกินยอดคงค้าง ${fmtMoney(outstanding)} บาท`, 'warning');
            return;
        }

        repayLoan(selectedLoanId, amount);
        setReturnModalOpen(false);
        setReturnAmount('');
        setSelectedLoanId(null);
        showAlert('สำเร็จ', `คืนเงินสำเร็จ ${fmtMoney(amount)} บาท`, 'success');
    };

    const activeLoansValue = loans.filter(l => l.status === 'active' || l.status === 'overdue').reduce((acc, l) => acc + l.amount, 0);
    const overdueCount = loans.filter(l => l.status === 'overdue').length;

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark p-4 md:p-6 scroll-smooth relative">
            <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-10">

                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-text dark:text-text-dark flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500 text-3xl">credit_score</span>
                            ระบบยืมเงินราชการ (Government Loans)
                        </h2>
                        <p className="text-text-muted text-sm mt-1">ติดตามลูกหนี้เงินยืมและสัญญายืมเงิน</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-navy text-white rounded-xl shadow-lg hover:bg-blue-900 transition-all text-sm font-medium flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">add</span> ทำสัญญายืมใหม่
                    </button>
                </div>

                {/* Dashboard Cards for Loans */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-surface dark:bg-surface-dark p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                            <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                        </div>
                        <div>
                            <p className="text-xs text-text-muted uppercase font-semibold">ยอดลูกหนี้คงค้าง</p>
                            <h3 className="text-xl font-bold text-text dark:text-text-dark">฿{activeLoansValue.toLocaleString()}</h3>
                        </div>
                    </div>
                    <div className={`bg-surface dark:bg-surface-dark p-5 rounded-xl shadow-sm border-l-4 ${overdueCount > 0 ? 'border-red-500' : 'border-gray-200'} flex items-center gap-4`}>
                        <div className={`p-3 rounded-lg ${overdueCount > 0 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                            <span className="material-symbols-outlined text-2xl">warning</span>
                        </div>
                        <div>
                            <p className="text-xs text-text-muted uppercase font-semibold">เกินกำหนด (Overdue)</p>
                            <h3 className={`text-xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-text'}`}>{overdueCount} รายการ</h3>
                        </div>
                    </div>
                    <div className="bg-surface dark:bg-surface-dark p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                            <span className="material-symbols-outlined text-2xl">history</span>
                        </div>
                        <div>
                            <p className="text-xs text-text-muted uppercase font-semibold">คืนเงินแล้วเดือนนี้</p>
                            <h3 className="text-xl font-bold text-text dark:text-text-dark">฿0.00</h3>
                        </div>
                    </div>
                </div>

                {/* Loan Table */}
                <div className="bg-surface dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-text dark:text-text-dark">รายการสัญญายืมเงิน (Loan Contracts)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-background-light dark:bg-background-dark text-text-muted font-medium text-xs uppercase">
                                <tr>
                                    <th className="px-5 py-3">เลขที่สัญญา</th>
                                    <th className="px-5 py-3">ผู้ยืม / โครงการ</th>
                                    <th className="px-5 py-3">วันที่ยืม</th>
                                    <th className="px-5 py-3">กำหนดคืน</th>
                                    <th className="px-5 py-3 text-right">จำนวนเงิน</th>
                                    <th className="px-5 py-3 text-center">สถานะ</th>
                                    <th className="px-5 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loans.map((loan) => (
                                    <tr key={loan.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${loan.status === 'overdue' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                        <td className="px-5 py-4 font-mono text-xs font-semibold">{loan.id}</td>
                                        <td className="px-5 py-4">
                                            <p className="font-medium text-text dark:text-text-dark">{loan.requester}</p>
                                            <p className="text-xs text-text-muted truncate max-w-[200px]">{loan.project}</p>
                                        </td>
                                        <td className="px-5 py-4 text-text-muted">{formatThaiDate(loan.dateBorrowed)}</td>
                                        <td className={`px-5 py-4 font-medium ${loan.status === 'overdue' ? 'text-red-600' : 'text-text-muted'}`}>
                                            {formatThaiDate(loan.dueDate)}
                                        </td>
                                        <td className="px-5 py-4 text-right font-bold text-text dark:text-text-dark">
                                            {loan.amount.toLocaleString()}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {loan.status === 'overdue' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span> เกินกำหนด
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                                    อยู่ระหว่างยืม
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => printLoanDoc(loan)}
                                                className="text-sm text-gray-700 hover:underline font-medium"
                                            >
                                                เอกสาร
                                            </button>
                                            {loan.status === 'active' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedLoanId(loan.id);
                                                        setReturnAmount('');
                                                        setReturnModalOpen(true);
                                                    }}
                                                    className="text-sm text-green-600 hover:underline font-medium"
                                                >
                                                    คืนเงิน
                                                </button>
                                            )}
                                            <button className="text-sm text-primary hover:underline font-medium">ติดตาม</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* New Loan Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-navy dark:text-white">สร้างสัญญายืมเงิน (New Loan)</h3>
                                <p className="text-xs text-text-muted">กรอกข้อมูลเพื่อทำเรื่องยืมเงินราชการ</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-red-500 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-text-muted">ชื่อผู้ยืม</label>
                                <input name="requester" onChange={handleInputChange} type="text" className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark outline-none focus:border-primary" placeholder="ชื่อ-นามสกุล ข้าราชการครู" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-text-muted">โครงการ</label>
                                <input name="project" onChange={handleInputChange} type="text" className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark outline-none focus:border-primary" placeholder="ระบุชื่อโครงการ" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-text-muted">จำนวนเงินที่ยืม</label>
                                    <input name="amount" onChange={handleInputChange} type="number" className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark outline-none focus:border-primary" placeholder="0.00" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-text-muted">วันที่ยืม</label>
                                    <input name="dateBorrowed" onChange={handleInputChange} type="date" className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark outline-none focus:border-primary" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-text-muted">กำหนดส่งใช้คืน</label>
                                    <input name="dueDate" onChange={handleInputChange} type="date" className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark outline-none focus:border-primary" />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-text-muted font-medium">ยกเลิก</button>
                                <button type="button" onClick={handleCreateLoan} className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold shadow-lg shadow-blue-500/30">บันทึกสัญญา</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Money Modal */}
            {returnModalOpen && selectedLoanId && (() => {
                const loan = loans.find(l => l.id === selectedLoanId);
                if (!loan) return null;
                const outstanding = loan.amount - (loan.returnedAmount || 0);
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-scale-in">
                            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-green-50 dark:bg-green-900/20 shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-green-700 dark:text-green-400">คืนเงิน</h3>
                                    <p className="text-xs text-text-muted">สัญญา {loan.id}</p>
                                </div>
                                <button onClick={() => setReturnModalOpen(false)} className="text-text-muted hover:text-red-500 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                                <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-text-muted">ผู้ยืม:</span>
                                        <span className="font-semibold text-text dark:text-text-dark">{loan.requester}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-text-muted">โครงการ:</span>
                                        <span className="font-semibold text-text dark:text-text-dark">{loan.project}</span>
                                    </div>
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
                                        <span className="text-xs text-text-muted">จำนวนยืมทั้งหมด:</span>
                                        <span className="font-bold text-lg text-text dark:text-text-dark">฿{loan.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-text-muted">คืนแล้ว:</span>
                                        <span className="font-semibold text-text dark:text-text-dark">฿{(loan.returnedAmount || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50 rounded-lg p-3 flex justify-between items-center">
                                        <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">ยอดคงค้าง:</span>
                                        <span className="font-bold text-2xl text-amber-700 dark:text-amber-300">฿{outstanding.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-text-muted">จำนวนเงินที่จะคืน</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-text-muted font-medium">฿</span>
                                        <input
                                            type="number"
                                            value={returnAmount}
                                            onChange={(e) => setReturnAmount(e.target.value)}
                                            max={outstanding}
                                            step="0.01"
                                            className="w-full p-3 pl-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-dark outline-none focus:border-green-500 text-2xl font-bold text-right"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="text-xs text-text-muted">สูงสุด: ฿{outstanding.toLocaleString()}</div>
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setReturnModalOpen(false)}
                                        className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-text-muted font-medium"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReturnMoney}
                                        className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-500/30"
                                    >
                                        ยืนยันคืนเงิน
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

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

export default Loan;
