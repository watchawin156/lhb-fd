
import React, { useMemo } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import { Transaction } from '../types';
import { fmtShort, fmtMoney } from './cashbook/utils';

interface DocRegistryProps {
    selectedFiscalYear: number;
}

const DocRegistry: React.FC<DocRegistryProps> = ({ selectedFiscalYear }) => {
    const { transactions } = useSchoolData();

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const d = new Date(t.date);
            const month = d.getMonth() + 1;
            const year = d.getFullYear();
            const fy = (month >= 10 ? year + 1 : year) + 543;
            return fy === selectedFiscalYear;
        });
    }, [transactions, selectedFiscalYear]);

    const incomeDocs = useMemo(() => {
        return filteredTransactions
            .filter(t => t.docNo?.startsWith('ร.'))
            .sort((a, b) => {
                const numA = parseInt(a.docNo.split('/')[0].replace('ร.', '')) || 0;
                const numB = parseInt(b.docNo.split('/')[0].replace('ร.', '')) || 0;
                return numA - numB;
            });
    }, [filteredTransactions]);

    const expenseDocs = useMemo(() => {
        return filteredTransactions
            .filter(t => t.docNo?.startsWith('จ.'))
            .sort((a, b) => {
                const numA = parseInt(a.docNo.split('/')[0].replace('จ.', '')) || 0;
                const numB = parseInt(b.docNo.split('/')[0].replace('จ.', '')) || 0;
                return numA - numB;
            });
    }, [filteredTransactions]);

    const borrowDocs = useMemo(() => {
        return filteredTransactions
            .filter(t => t.docNo?.startsWith('ขอยืมเงิน'))
            .sort((a, b) => {
                const numA = parseInt(a.docNo.split(' ')[1]?.split('/')[0]) || 0;
                const numB = parseInt(b.docNo.split(' ')[1]?.split('/')[0]) || 0;
                return numA - numB;
            });
    }, [filteredTransactions]);

    const renderTable = (title: string, data: Transaction[], icon: string, colorClass: string) => (
        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
            <div className={`px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-white`}>
                <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${colorClass}`}>{icon}</span>
                    <h3 className="font-bold text-slate-700">{title}</h3>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                    {data.length} รายการ
                </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm z-10">
                        <tr>
                            <th className="px-5 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">เลขที่เอกสาร</th>
                            <th className="px-5 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">วันที่</th>
                            <th className="px-5 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">รายการ</th>
                            <th className="px-5 py-2.5 text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 text-right">จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm italic">
                                    ยังไม่มีรายการที่รันเลขที่เอกสาร
                                </td>
                            </tr>
                        ) : (
                            data.map((t, idx) => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-5 py-3 text-sm font-black text-slate-700">
                                        <div className={`px-2 py-0.5 rounded-lg inline-block ${colorClass.replace('text-', 'bg-').replace('-500', '-50')} ${colorClass}`}>
                                            {t.docNo}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-500 font-medium">{fmtShort(t.date)}</td>
                                    <td className="px-5 py-3 text-sm text-slate-600 font-medium truncate max-w-[200px]" title={t.description}>
                                        {t.description}
                                    </td>
                                    <td className={`px-5 py-3 text-sm font-bold text-right ${t.income > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {fmtMoney(t.income || t.expense)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="flex-1 h-full overflow-hidden flex flex-col bg-slate-50/50 p-6 gap-6">
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100">
                        <span className="material-symbols-outlined text-blue-500 text-2xl">format_list_numbered</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">ทะเบียนคุมเลขที่เอกสาร</h2>
                        <p className="text-sm font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                            ปีงบประมาณ พ.ศ. {selectedFiscalYear}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {renderTable('ทะเบียนคุมรายรับ (ร.)', incomeDocs, 'input', 'text-emerald-500')}
                {renderTable('ทะเบียนคุมรายจ่าย (จ.)', expenseDocs, 'output', 'text-rose-500')}
                {renderTable('ทะเบียนคุมการยืมเงิน (ขอยืมเงิน)', borrowDocs, 'contract', 'text-blue-500')}
            </div>
        </div>
    );
};

export default DocRegistry;
