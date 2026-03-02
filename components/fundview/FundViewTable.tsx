import React from 'react';
import { formatThaiDateShort } from '../../utils';
import { Transaction } from '../../types';

interface FundViewTableProps {
    pageId: string;
    pageTransactions: Transaction[];
    transactions: Transaction[];
    onRowClick: (tx: Transaction) => void;
}

const FundViewTable: React.FC<FundViewTableProps> = ({ pageId, pageTransactions, transactions, onRowClick }) => {
    if (pageTransactions.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-text-muted opacity-60">
                <span className="material-symbols-outlined text-5xl mb-2">history_edu</span>
                <p>ยังไม่มีรายการบันทึก</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto nav-scroll">
            <table className="modern-table">
                <thead>
                    <tr>
                        <th className="w-[120px]">ว/ด/ป</th>
                        <th className="w-[150px]">ที่เอกสาร</th>
                        <th className="w-full min-w-[300px]">รายการ</th>
                        <th className="min-w-[150px]">รับจาก/จ่ายให้</th>
                        <th className="text-right w-[120px]">รายรับ</th>
                        <th className="text-right w-[120px]">รายจ่าย</th>
                        <th className="text-right w-[140px]">คงเหลือ</th>
                    </tr>
                </thead>
                <tbody>
                    {pageTransactions.map((tx) => {
                        const relevantTxs = transactions.filter(t =>
                            t.fundType === pageId &&
                            (new Date(t.date).getTime() < new Date(tx.date).getTime() ||
                                (new Date(t.date).getTime() === new Date(tx.date).getTime() && t.id <= tx.id))
                        );
                        const currentBalance = relevantTxs.reduce((acc, t) => acc + (t.income || 0) - (t.expense || 0), 0);
                        return (
                            <tr key={tx.id} onClick={() => onRowClick(tx)} className="group">
                                <td className="font-bold text-slate-500 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-xs text-primary/40">calendar_today</span>
                                        {formatThaiDateShort(tx.date)}
                                    </div>
                                </td>
                                <td className="font-black text-[11px] tracking-wider text-slate-400">
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                                        {tx.docNo || 'N/A'}
                                    </span>
                                </td>
                                <td className="font-bold text-slate-700 dark:text-slate-200">
                                    {tx.description}
                                </td>
                                <td className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                                    <div className="line-clamp-1">
                                        {tx.income > 0 ? (tx.payer || '-') : (tx.payee || '-')}
                                    </div>
                                </td>
                                <td className="text-right font-black text-green-600">
                                    {tx.income > 0 ? tx.income.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td className="text-right font-black text-red-500">
                                    {tx.expense > 0 ? tx.expense.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td className="text-right font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-white/5">
                                    {currentBalance === 0 ? '0.00' : currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default FundViewTable;
