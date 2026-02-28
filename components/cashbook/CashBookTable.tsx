import React from 'react';
import { FUND_TYPE_OPTIONS } from '../../utils';
import { fmtShort, fmtMoney } from './utils';
import { useSchoolData } from '../../context/SchoolContext';

interface CashBookTableProps {
    fyBE: number;
    cashBookFilter: string;
    setCashBookFilter: React.Dispatch<React.SetStateAction<string>>;
    sortOrder: 'desc' | 'asc';
    setSortOrder: React.Dispatch<React.SetStateAction<'desc' | 'asc'>>;
    dailyData: any[];
    prevCashStart: number;
    transactions: any[];
    setSelectedTx: (tx: any) => void;
    totalRecYear: { cash: number };
    totalPayYear: { cash: number };
    yodYokPaiEnd: number;
}

const CashBookTable: React.FC<CashBookTableProps> = ({
    fyBE,
    cashBookFilter,
    setCashBookFilter,
    sortOrder,
    setSortOrder,
    dailyData,
    prevCashStart,
    transactions,
    setSelectedTx,
    totalRecYear,
    totalPayYear,
    yodYokPaiEnd
}) => {
    const { schoolSettings } = useSchoolData();

    return (
        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 shrink-0">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <h3 className="font-bold text-slate-700 dark:text-white text-sm">รายการรับ - จ่าย ประจำปีงบประมาณ {fyBE}</h3>
                    <div className="flex items-center gap-3">
                        <select
                            value={cashBookFilter}
                            onChange={e => setCashBookFilter(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer min-w-[200px]"
                        >
                            <option value="all">ทุกประเภท</option>
                            {Array.from(new Set(FUND_TYPE_OPTIONS.map(o => o.group))).map(group => (
                                <optgroup key={group} label={group}>
                                    {FUND_TYPE_OPTIONS.filter(o => o.group === group).map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <button
                            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 shrink-0 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                            </span>
                            {sortOrder === 'desc' ? 'ใหม่-เก่า' : 'เก่า-ใหม่'}
                        </button>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{dailyData.length} วันที่มีการเคลื่อนไหว</span>
                    </div>
                </div>
            </div>
            <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-slate-500 font-semibold border-b sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap min-w-[100px]">วันที่</th>
                            <th className="px-4 py-3 whitespace-nowrap">ที่เอกสาร</th>
                            <th className="px-4 py-3 min-w-[140px]">ประเภท</th>
                            <th className="px-4 py-3 min-w-[140px]">บัญชีธนาคาร</th>
                            <th className="px-4 py-3 min-w-[180px]">รายการ</th>
                            <th className="px-4 py-3 text-right whitespace-nowrap text-green-600">รายรับ</th>
                            <th className="px-4 py-3 text-right whitespace-nowrap text-red-600">รายจ่าย</th>
                            <th className="px-4 py-3 text-right whitespace-nowrap text-blue-600">คงเหลือสะสม</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        <tr className="bg-blue-50/30 dark:bg-blue-900/10 font-medium">
                            <td colSpan={5} className="px-4 py-3 text-slate-600 text-right">ยอดยกมา {cashBookFilter === 'all' ? '(ทุกประเภท)' : ''}</td>
                            <td className="px-4 py-3 text-right"></td>
                            <td className="px-4 py-3 text-right"></td>
                            <td className="px-4 py-3 text-right text-blue-700 font-bold">{fmtMoney(prevCashStart)}</td>
                        </tr>

                        {(() => {
                            const fyCE = fyBE - 543;
                            const fyStartYear = fyCE - 1;
                            const fyStart = `${fyStartYear}-10-01`;
                            const fyEnd = `${fyCE}-09-30`;

                            let curTxs = transactions
                                .filter((t: any) => t.date >= fyStart && t.date <= fyEnd)
                                .sort((a: any, b: any) => {
                                    if (sortOrder === 'desc') {
                                        return new Date(b.date).getTime() - new Date(a.date).getTime() || (b.id - a.id);
                                    } else {
                                        return new Date(a.date).getTime() - new Date(b.date).getTime() || (a.id - b.id);
                                    }
                                });

                            // กรองตามหมวดเงิน
                            if (cashBookFilter !== 'all') {
                                curTxs = curTxs.filter((t: any) => t.fundType === cashBookFilter);
                            }

                            if (curTxs.length === 0) {
                                return (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">ไม่มีรายการในปีงบประมาณนี้</td>
                                    </tr>
                                );
                            }

                            const getFundLabel = (ft: string) => FUND_TYPE_OPTIONS.find(f => f.value === ft)?.label?.replace(/^\d+\.?\d*\s*/, '') || ft;

                            const getFundBadgeColor = (ft: string) => {
                                const group = FUND_TYPE_OPTIONS.find(f => f.value === ft)?.group || '';
                                if (group === 'เงินงบประมาณ') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
                                if (group === 'เงินรายได้แผ่นดิน') return 'bg-blue-100 text-blue-700 border border-blue-200';
                                if (ft === 'fund-lunch') return 'bg-orange-100 text-orange-700 border border-orange-200';
                                if (ft === 'fund-eef') return 'bg-teal-100 text-teal-700 border border-teal-200';
                                if (ft === 'fund-school-income') return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
                                if (ft === 'fund-tax') return 'bg-amber-100 text-amber-700 border border-amber-200';
                                return 'bg-slate-100 text-slate-600 border border-slate-200';
                            };

                            // คำนวณยอดสะสมจากเก่าไปใหม่เสมอ แล้วเก็บเป็น Map id→balance
                            const balanceMap = new Map<number | string, number>();
                            {
                                let runBal = prevCashStart;
                                const balBase = transactions
                                    .filter((t: any) => t.date >= fyStart && t.date <= fyEnd)
                                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime() || (a.id - b.id));
                                // ถ้ากรองตาม fund ด้วยให้ใช้ fund ที่กรองแล้วสำหรับ balance
                                const balFiltered = cashBookFilter !== 'all' ? balBase.filter((t: any) => t.fundType === cashBookFilter) : balBase;
                                balFiltered.forEach((t: any) => {
                                    runBal = runBal + (t.income || 0) - (t.expense || 0);
                                    balanceMap.set(t.id ?? t, runBal);
                                });
                            }

                            return curTxs.map((tx: any, idx: number) => {
                                const currentBal = balanceMap.get(tx.id ?? tx) ?? prevCashStart;
                                const isIncome = (tx.income || 0) > 0;
                                return (
                                    <tr key={tx.id || idx}
                                        onClick={() => setSelectedTx(tx)}
                                        className="hover:bg-blue-50/50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors">
                                        <td className="px-4 py-2 whitespace-nowrap">{fmtShort(tx.date)}</td>
                                        <td className="px-4 py-2 font-mono text-xs">{tx.docNo || '-'}</td>
                                        <td className="px-4 py-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${getFundBadgeColor(tx.fundType)}`}>
                                                {getFundLabel(tx.fundType)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600">
                                            {schoolSettings.bankAccounts?.find(b => b.id === tx.bankId)?.name || '-'}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                {tx.docNo?.includes('LN-') && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200" title="รายการที่เกี่ยวกับการยืมเงิน">
                                                        <span className="material-symbols-outlined text-sm">currency_exchange</span>
                                                        ยืม
                                                    </span>
                                                )}
                                                <span>{tx.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right text-green-600">{isIncome ? fmtMoney(tx.income) : '-'}</td>
                                        <td className="px-4 py-2 text-right text-red-600">{!isIncome && (tx.expense || 0) > 0 ? fmtMoney(tx.expense) : '-'}</td>
                                        <td className="px-4 py-2 text-right font-medium text-slate-700">{fmtMoney(currentBal)}</td>
                                    </tr>
                                );
                            });
                        })()}

                        <tr className="font-bold border-t border-slate-200 sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                            <td colSpan={5} className="px-4 py-4 text-right text-slate-700 bg-white">รวมรับ - จ่ายตลอดปีงบประมาณ</td>
                            <td className="px-4 py-4 text-right text-green-700 bg-green-50/30">{fmtMoney(totalRecYear.cash)}</td>
                            <td className="px-4 py-4 text-right text-red-700 bg-red-50/30">{fmtMoney(totalPayYear.cash)}</td>
                            <td className="px-4 py-4 text-right text-blue-700 bg-blue-50/30">{fmtMoney(yodYokPaiEnd)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CashBookTable;
