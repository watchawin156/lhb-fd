
import React, { useMemo, useState } from 'react';
import { useSchoolData } from '../context/SchoolContext';
import { Transaction } from '../types';
import { fmtShort, fmtMoney } from './cashbook/utils';

interface DocRegistryProps {
    selectedFiscalYear: number;
}

const DocRegistry: React.FC<DocRegistryProps> = ({ selectedFiscalYear }) => {
    const { transactions, schoolSettings } = useSchoolData();
    const [activeType, setActiveType] = useState<'all' | 'income' | 'expense' | 'borrow' | 'return'>('all');

    const prefixes = schoolSettings?.docNumberSettings || {
        incomePrefix: 'ร.',
        expensePrefix: 'จ.',
        borrowPrefix: 'ขอยืมเงิน',
        returnPrefix: 'คืนเงินยืม'
    };

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
            .filter(t => t.docNo?.startsWith(prefixes.incomePrefix))
            .sort((a, b) => {
                const numA = parseInt(a.docNo.replace(prefixes.incomePrefix, '').split('/')[0]) || 0;
                const numB = parseInt(b.docNo.replace(prefixes.incomePrefix, '').split('/')[0]) || 0;
                return numA - numB;
            });
    }, [filteredTransactions, prefixes.incomePrefix]);

    const expenseDocs = useMemo(() => {
        return filteredTransactions
            .filter(t => t.docNo?.startsWith(prefixes.expensePrefix))
            .sort((a, b) => {
                const numA = parseInt(a.docNo.replace(prefixes.expensePrefix, '').split('/')[0]) || 0;
                const numB = parseInt(b.docNo.replace(prefixes.expensePrefix, '').split('/')[0]) || 0;
                return numA - numB;
            });
    }, [filteredTransactions, prefixes.expensePrefix]);

    const borrowDocs = useMemo(() => {
        return filteredTransactions
            .filter(t => t.docNo?.startsWith(prefixes.borrowPrefix))
            .sort((a, b) => {
                const numA = parseInt(a.docNo.replace(prefixes.borrowPrefix, '').trim().split('/')[0]) || 0;
                const numB = parseInt(b.docNo.replace(prefixes.borrowPrefix, '').trim().split('/')[0]) || 0;
                return numA - numB;
            });
    }, [filteredTransactions, prefixes.borrowPrefix]);

    const returnDocs = useMemo(() => {
        return filteredTransactions
            .filter(t => t.docNo?.startsWith(prefixes.returnPrefix))
            .sort((a, b) => {
                const numA = parseInt(a.docNo.replace(prefixes.returnPrefix, '').trim().split('/')[0]) || 0;
                const numB = parseInt(b.docNo.replace(prefixes.returnPrefix, '').trim().split('/')[0]) || 0;
                return numA - numB;
            });
    }, [filteredTransactions, prefixes.returnPrefix]);

    const renderTable = (title: string, data: Transaction[], icon: string, colorClass: string) => (
        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full min-h-[400px]">
            <div className={`px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-white`}>
                <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-3xl ${colorClass}`}>{icon}</span>
                    <h3 className="font-bold text-lg text-slate-800">{title}</h3>
                </div>
                <span className="text-sm font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                    {data.length} รายการ
                </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
                        <tr>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">เลขที่เอกสาร</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">วันที่</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">รายการ</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-16 text-center text-slate-400 text-base italic">
                                    ยังไม่มีรายการที่รันเลขที่เอกสารในหมวดนี้
                                </td>
                            </tr>
                        ) : (
                            data.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group border-transparent border-l-4 hover:border-l-blue-400">
                                    <td className="px-6 py-4 text-base font-black text-slate-800">
                                        <div className={`px-3 py-1 rounded-xl inline-block ${colorClass.replace('text-', 'bg-').replace('-500', '-50')} ${colorClass} border border-current/10 shadow-sm`}>
                                            {t.docNo}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 font-bold">{fmtShort(t.date)}</td>
                                    <td className="px-6 py-4 text-base text-slate-700 font-bold truncate max-w-[250px]" title={t.description}>
                                        {t.description}
                                    </td>
                                    <td className={`px-6 py-4 text-lg font-black text-right ${t.income > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
        <div className="flex-1 h-full overflow-hidden flex flex-col bg-slate-50/50 p-6 md:p-8 gap-6 md:gap-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[24px] bg-white shadow-md flex items-center justify-center border border-slate-100 rotate-3 group hover:rotate-0 transition-transform cursor-pointer">
                        <span className="material-symbols-outlined text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-600 text-3xl font-bold">format_list_numbered</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">ทะเบียนคุมเลขที่เอกสาร</h2>
                        <p className="text-base font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                            <span className="material-symbols-outlined text-lg text-blue-500">calendar_today</span>
                            ปีงบประมาณ พ.ศ. {selectedFiscalYear}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest hidden lg:block">ตัวกรอง:</label>
                    <select
                        value={activeType}
                        onChange={(e) => setActiveType(e.target.value as any)}
                        className="w-full sm:min-w-[260px] px-5 py-4 rounded-2xl border-2 border-white bg-white shadow-xl shadow-slate-200/50 text-base font-black text-slate-700 outline-none hover:border-blue-200 focus:border-blue-500 transition-all appearance-none cursor-pointer ring-4 ring-slate-100/50"
                    >
                        <option value="all">📁 ทะเบียนทั้งหมด</option>
                        <option value="income">🟢 ทะเบียนคุมรายรับ ({prefixes.incomePrefix})</option>
                        <option value="expense">🔴 ทะเบียนคุมรายจ่าย ({prefixes.expensePrefix})</option>
                        <option value="borrow">🔵 ทะเบียนขอยืมเงิน ({prefixes.borrowPrefix})</option>
                        <option value="return">🟣 ทะเบียนคืนเงินยืม ({prefixes.returnPrefix})</option>
                    </select>
                </div>
            </div>

            <div className={`flex-1 min-h-0 grid gap-6 md:gap-8 ${activeType === 'all' ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-2' : 'grid-cols-1'
                } overflow-y-auto pr-2 custom-scrollbar`}>
                {(activeType === 'all' || activeType === 'income') && renderTable(`ทะเบียนคุมรายรับ (${prefixes.incomePrefix})`, incomeDocs, 'input', 'text-emerald-500')}
                {(activeType === 'all' || activeType === 'expense') && renderTable(`ทะเบียนคุมรายจ่าย (${prefixes.expensePrefix})`, expenseDocs, 'output', 'text-rose-500')}
                {(activeType === 'all' || activeType === 'borrow') && renderTable(`ทะเบียนคุมการยืมเงิน (${prefixes.borrowPrefix})`, borrowDocs, 'contract', 'text-blue-500')}
                {(activeType === 'all' || activeType === 'return') && renderTable(`ทะเบียนคุมการคืนเงินยืม (${prefixes.returnPrefix})`, returnDocs, 'assignment_return', 'text-purple-500')}
            </div>
        </div>
    );
};


export default DocRegistry;
