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
                    {pageTransactions.map((tx) => {
                        const relevantTxs = transactions.filter(t =>
                            t.fundType === pageId &&
                            (new Date(t.date).getTime() < new Date(tx.date).getTime() ||
                                (new Date(t.date).getTime() === new Date(tx.date).getTime() && t.id <= tx.id))
                        );
                        const currentBalance = relevantTxs.reduce((acc, t) => acc + (t.income || 0) - (t.expense || 0), 0);
                        return (
                            <tr key={tx.id} onClick={() => onRowClick(tx)}
                                className="hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors">
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
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default FundViewTable;
