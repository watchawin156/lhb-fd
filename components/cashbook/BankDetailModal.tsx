import React from 'react';
import { FUND_TYPE_OPTIONS } from '../../utils';
import { fmtShort } from './utils';

interface BankDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    bankId: string | null;
    schoolSettings: any;
    transactions: any[];
}

const BankDetailModal: React.FC<BankDetailModalProps> = ({
    isOpen,
    onClose,
    bankId,
    schoolSettings,
    transactions
}) => {
    if (!isOpen || !bankId) return null;

    const acc = (schoolSettings.bankAccounts || []).find((a: any) => a.id === bankId);
    if (!acc) return null;

    const accTxs = transactions
        .filter(t => acc.fundTypes.includes(t.fundType))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);

    const currentBalance = accTxs.reduce((sum, t) => sum + (t.income || 0) - (t.expense || 0), 0);

    const getBadgeColors = (c: string) => {
        if (c === 'green') return 'bg-green-100 text-green-700 border-green-200';
        if (c === 'purple') return 'bg-purple-100 text-purple-700 border-purple-200';
        if (c === 'orange') return 'bg-orange-100 text-orange-700 border-orange-200';
        if (c === 'red') return 'bg-red-100 text-red-700 border-red-200';
        if (c === 'gray') return 'bg-gray-100 text-gray-700 border-gray-200';
        return 'bg-blue-100 text-blue-700 border-blue-200';
    };

    let runBal = 0;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-scale-in">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-500 text-2xl">account_balance</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 text-navy dark:text-white">
                                {acc.name}
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeColors(acc.color)}`}>{acc.bankName}</span>
                            </h3>
                            <p className="text-sm text-gray-500 font-mono mt-0.5">เลขบัญชี: {acc.accountNo || '-'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-xs text-gray-400 font-semibold mb-1">ยอดเงินคงเหลือสุทธิ</p>
                            <p className="text-2xl font-bold text-blue-600">฿{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="h-10 w-px bg-gray-200"></div>
                        <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-white rounded-full shadow-sm hover:bg-red-50 flex items-center justify-center relative group">
                            <span className="material-symbols-outlined text-xl">close</span>
                            <span className="absolute -bottom-8 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">ด ย้อนกลับ</span>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {accTxs.length > 0 ? (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-semibold text-xs border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 whitespace-nowrap">วันที่</th>
                                        <th className="px-6 py-4 whitespace-nowrap min-w-[200px]">ประเภท / หมวดเงิน</th>
                                        <th className="px-6 py-4 w-full">รายการ</th>
                                        <th className="px-6 py-4 text-right whitespace-nowrap">รายรับ</th>
                                        <th className="px-6 py-4 text-right whitespace-nowrap">รายจ่าย</th>
                                        <th className="px-6 py-4 text-right whitespace-nowrap text-blue-600">คงเหลือ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {accTxs.slice().reverse().map(tx => {
                                        runBal += (tx.income || 0) - (tx.expense || 0);
                                        return { ...tx, runBal };
                                    }).reverse().map(tx => (
                                        <tr key={tx.id} className="hover:bg-blue-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{fmtShort(tx.date)}</td>
                                            <td className="px-6 py-4 text-xs font-medium min-w-[200px]">
                                                <span className="px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-600 border border-gray-200/60 inline-block" title={tx.fundType}>
                                                    {FUND_TYPE_OPTIONS.find(o => o.value === tx.fundType)?.label?.replace(/^\d+\.?\d*\s*/, '') || tx.fundType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-800 group-hover:text-blue-700 transition-colors">{tx.description}</td>
                                            <td className="px-6 py-4 text-right pr-6 font-medium text-green-600">{tx.income > 0 ? tx.income.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                                            <td className="px-6 py-4 text-right pr-6 font-medium text-red-600">{tx.expense > 0 ? tx.expense.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                                            <td className="px-6 py-4 text-right pr-6 font-bold text-blue-700">{tx.runBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">account_balance_wallet</span>
                                <p>ไม่มีรายการเคลื่อนไหวในบัญชีนี้</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BankDetailModal;
