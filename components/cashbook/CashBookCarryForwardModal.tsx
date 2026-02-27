import React from 'react';
import { useSchoolData } from '../../context/SchoolContext';
import { FUND_TYPE_OPTIONS } from '../../utils';
import { fmtMoney } from './utils';

interface CashBookCarryForwardModalProps {
    isOpen: boolean;
    onClose: () => void;
    fyBE: number;
    prevFyBE: number;
    isViewMode: boolean;
    isManualMode: boolean;
    carryForwardItems: { fundType: string; label: string; balance: number }[];
    carriedFundTypes: Set<string>;
    setCarryForwardItems: React.Dispatch<React.SetStateAction<{ fundType: string; label: string; balance: number }[]>>;
    setIsManualMode: (m: boolean) => void;
    setIsViewMode: (v: boolean) => void;
    handleAddManualFund: () => void;
    handleCarryForwardConfirm: () => void;
}

const CashBookCarryForwardModal: React.FC<CashBookCarryForwardModalProps> = ({
    isOpen, onClose, fyBE, prevFyBE, isViewMode, isManualMode,
    carryForwardItems, carriedFundTypes, setCarryForwardItems,
    setIsManualMode, setIsViewMode, handleAddManualFund, handleCarryForwardConfirm
}) => {
    const orderPriority = [
        'fund-subsidy',
        'fund-subsidy-utility',
        'fund-15y-book',
        'fund-15y-supply',
        'fund-15y-uniform',
        'fund-15y-activity',
        'fund-poor',
        'fund-state',
        'fund-lunch',
        'fund-eef',
        'fund-school-income',
        'fund-tax',
        'fund-safekeeping',
    ];
    const sortedItems = isManualMode
        ? carryForwardItems
        : [...carryForwardItems].sort((a, b) => {
            const ia = orderPriority.indexOf(a.fundType);
            const ib = orderPriority.indexOf(b.fundType);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return a.label.localeCompare(b.label);
        });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-amber-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isViewMode ? 'bg-green-100' : 'bg-amber-100'}`}>
                            <span className={`material-symbols-outlined ${isViewMode ? 'text-green-700' : 'text-amber-700'}`}>
                                {isViewMode ? 'task_alt' : 'input'}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">
                                {isViewMode ? `รายการยกยอดมาปี ${fyBE}` : `ยกยอดคงเหลือจากปี ${prevFyBE}`}
                            </h3>
                            <p className={`text-xs ${isViewMode ? 'text-green-700' : 'text-amber-700'}`}>
                                {isViewMode ? `บันทึกแล้ว — ยอดรวม ${fmtMoney(sortedItems.reduce((s, i) => s + i.balance, 0))} บาท` : `เข้าปีงบประมาณ ${fyBE}`}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => { onClose(); setIsViewMode(false); }} className="text-gray-400 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {sortedItems.length === 0 && !isManualMode ? (
                        <div className="text-center py-8 text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">account_balance_wallet</span>
                            <p className="text-sm">ไม่พบยอดคงเหลือจากปี {prevFyBE}</p>
                            <p className="text-xs mt-1">คุณสามารถกรอกยอดด้วยตัวเองได้</p>
                        </div>
                    ) : (
                        sortedItems.map((item, idx) => {
                            const alreadyCarried = carriedFundTypes.has(item.fundType);
                            return (
                                <div key={item.fundType + idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${alreadyCarried
                                    ? 'border-green-200 bg-green-50/50 opacity-70'
                                    : 'border-gray-200 bg-gray-50/50 hover:border-amber-200'
                                    }`}>
                                    <div className="flex-1 min-w-0">
                                        {isManualMode && !alreadyCarried ? (
                                            <select
                                                value={item.fundType}
                                                onChange={e => {
                                                    const opt = FUND_TYPE_OPTIONS.find(o => o.value === e.target.value);
                                                    setCarryForwardItems(prev => prev.map((it, i) => i === idx ? { ...it, fundType: e.target.value, label: opt?.label || e.target.value } : it));
                                                }}
                                                className="w-full text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-amber-300"
                                            >
                                                {FUND_TYPE_OPTIONS.filter(o => !carriedFundTypes.has(o.value)).map(o => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-gray-700 truncate">{item.label}</p>
                                                {alreadyCarried && (
                                                    <span className="text-[10px] font-bold text-green-600 bg-green-100 border border-green-200 rounded-full px-2 py-0.5 whitespace-nowrap flex items-center gap-0.5">
                                                        <span className="material-symbols-outlined text-[11px]">check_circle</span>
                                                        นำเข้าแล้ว
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isManualMode && !alreadyCarried ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.balance || ''}
                                                onChange={e => setCarryForwardItems(prev => prev.map((it, i) => i === idx ? { ...it, balance: parseFloat(e.target.value) || 0 } : it))}
                                                className="w-32 px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-sm font-bold text-right text-amber-700 outline-none focus:border-amber-400"
                                                placeholder="0.00"
                                            />
                                        ) : (
                                            <span className={`text-sm font-bold px-3 py-1.5 rounded-lg border ${alreadyCarried
                                                ? 'text-green-700 bg-green-50 border-green-200'
                                                : 'text-amber-700 bg-amber-50 border-amber-200'
                                                }`}>
                                                {fmtMoney(item.balance)}
                                            </span>
                                        )}
                                        {isManualMode && !alreadyCarried && (
                                            <button
                                                type="button"
                                                onClick={() => setCarryForwardItems(prev => prev.filter((_, i) => i !== idx))}
                                                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {isManualMode && (
                        <button
                            type="button"
                            onClick={handleAddManualFund}
                            className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-400 hover:border-amber-300 hover:text-amber-600 transition-colors flex items-center justify-center gap-1"
                        >
                            <span className="material-symbols-outlined text-base">add</span>
                            เพิ่มหมวดเงิน
                        </button>
                    )}

                    {/* ยอดรวม */}
                    {sortedItems.length > 0 && (
                        <div className="flex justify-between items-center py-3 border-t border-gray-200 mt-2">
                            <span className="text-sm font-medium text-gray-500">ยอดรวมทั้งหมด</span>
                            <span className="text-lg font-bold text-amber-700">
                                {fmtMoney(carryForwardItems.reduce((s, i) => s + (i.balance || 0), 0))} บาท
                            </span>
                        </div>
                    )}
                </div>

                <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2 shrink-0 bg-gray-50/50">
                    {isViewMode ? (
                        <button
                            type="button"
                            onClick={() => { onClose(); setIsViewMode(false); }}
                            className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            ปิด
                        </button>
                    ) : (
                        <>
                            {!isManualMode && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsManualMode(true);
                                        if (carryForwardItems.length === 0) {
                                            handleAddManualFund();
                                        }
                                    }}
                                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-base">edit_note</span>
                                    กรอกยอดคงเหลือด้วยตัวเอง
                                </button>
                            )}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onClose()}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCarryForwardConfirm}
                                    disabled={carryForwardItems.filter(i => i.balance > 0).length === 0}
                                    className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-base">check</span>
                                    ยืนยันยกยอด
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CashBookCarryForwardModal;
