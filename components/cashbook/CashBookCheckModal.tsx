import React, { useState, useMemo } from 'react';
import { FUND_TYPE_OPTIONS } from '../../utils';
import { fmtShort, fmtMoney } from './utils';
import { useSchoolData } from '../../context/SchoolContext';
import ConfirmModal from '../ConfirmModal';

interface CashBookCheckModalProps {
    isOpen: boolean;
    onClose: () => void;
    fyBE: number;
}

const CashBookCheckModal: React.FC<CashBookCheckModalProps> = ({ isOpen, onClose, fyBE }) => {
    const { transactions, editTransaction } = useSchoolData();

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

    const { flaggedTxs, validCount } = useMemo(() => {
        const fyCE = fyBE - 543;
        const fyStartStr = `${fyCE - 1}-10-01`;
        const fyEndStr = `${fyCE}-09-30`;

        const curTxs = transactions.filter((t: any) => t.date >= fyStartStr && t.date <= fyEndStr);
        let valid = 0;
        const flagged: { tx: any, suggestFund: string, reason: string }[] = [];

        curTxs.forEach((t: any) => {
            const txt = (t.description + ' ' + (t.payer || '') + ' ' + (t.payee || '')).toLowerCase();
            let checkFlagged = false;

            if (txt.includes('ภาษี') && !txt.includes('ยืมจาก เงินภาษี 1%') && t.fundType !== 'fund-tax') {
                flagged.push({ tx: t, suggestFund: 'fund-tax', reason: 'พบคำว่า "ภาษี" แต่รายการไม่ได้อยู่ในหมวดเงินภาษี 1% (ยกเว้นการยืม)' });
                checkFlagged = true;
            } else if (txt.includes('ดอกเบี้ย') && t.fundType !== 'fund-state') {
                flagged.push({ tx: t, suggestFund: 'fund-state', reason: 'พบคำว่า "ดอกเบี้ย" แต่รายการไม่ได้อยู่ในหมวดเงินรายได้แผ่นดิน' });
                checkFlagged = true;
            } else if ((txt.includes('ค่าน้ำ') || txt.includes('ค่าไฟ') || txt.includes('โทรศัพท์') || txt.includes('ประปา') || txt.includes('สื่อสาร') || txt.includes('อินเทอร์เน็ต')) && t.fundType !== 'fund-subsidy') {
                flagged.push({ tx: t, suggestFund: 'fund-subsidy', reason: 'พบคำเกี่ยวกับ ค่าสาธารณูปโภค แต่รายการไม่ได้อยู่ในหมวดเงินอุดหนุน' });
                checkFlagged = true;
            }

            if (!checkFlagged) valid++;
        });

        return { flaggedTxs: flagged, validCount: valid };
    }, [transactions, fyBE]);

    const handleFix = (id: number, newFundType: string) => {
        const t = transactions.find((x: any) => x.id === id);
        if (t) {
            editTransaction(t.id, { ...t, fundType: newFundType });
        }
    };

    const handleFixAll = () => {
        flaggedTxs.forEach(f => {
            const t = transactions.find((x: any) => x.id === f.tx.id);
            if (t) {
                editTransaction(t.id, { ...t, fundType: f.suggestFund });
            }
        });
        showAlert('สำเร็จ', `แก้ไขอัตโนมัติ ${flaggedTxs.length} รายการสำเร็จ!`, 'success');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-100/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0 bg-blue-50/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">troubleshoot</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">ตัวช่วยตรวจสอบหมวดเงิน (ปีงบฯ {fyBE})</h2>
                            <p className="text-sm text-gray-500">ระบบ AI วิเคราะห์ข้อความและเสนอแนะหมวดเงินที่ถูกต้องตามระเบียบพัสดุ</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors bg-white border border-gray-200 shadow-sm hover:bg-red-50 p-2 rounded-full">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1 bg-white p-5 rounded-xl shadow-sm border border-green-100 flex items-center gap-4">
                            <span className="material-symbols-outlined text-green-500 text-4xl">check_circle</span>
                            <div>
                                <p className="text-xs text-gray-400 font-bold tracking-wide uppercase mb-1">สอดคล้องกับระเบียบ</p>
                                <p className="text-3xl font-bold text-green-600">{validCount} <span className="text-sm text-gray-500 font-medium ml-1">รายการ</span></p>
                            </div>
                        </div>
                        <div className="flex-1 bg-white p-5 rounded-xl shadow-sm border border-amber-200 flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full translate-x-1/2 -translate-y-1/2 opacity-50 blur-2xl"></div>
                            <span className="material-symbols-outlined text-amber-500 text-4xl relative z-10">warning</span>
                            <div className="relative z-10">
                                <p className="text-xs text-amber-600 font-bold tracking-wide uppercase mb-1">พบข้อสังเกต</p>
                                <p className="text-3xl font-bold text-amber-600 w-full">{flaggedTxs.length} <span className="text-sm text-gray-500 font-medium ml-1">รายการ</span></p>
                            </div>
                        </div>
                    </div>

                    {flaggedTxs.length > 0 ? (
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                            <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center bg-gray-50 gap-4">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-amber-500">error</span>
                                    รายการที่ควรพิจารณาแก้ไขหมวดเงิน
                                </h3>
                                <button onClick={handleFixAll} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors flex items-center gap-2 group">
                                    <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">auto_fix_high</span> แก้ไขอัตโนมัติตามข้อเสนอแนะทั้งหมด
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
                                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                                        <tr>
                                            <th className="px-5 py-3 w-[100px]">วันที่</th>
                                            <th className="px-5 py-3 hidden md:table-cell">รายการ</th>
                                            <th className="px-5 py-3 w-[200px]">หมวดเงินเดิม</th>
                                            <th className="px-5 py-3 min-w-[300px]">ข้อเสนอแนะ</th>
                                            <th className="px-5 py-3 w-[120px] text-right">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {flaggedTxs.map((f, i) => (
                                            <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                                                <td className="px-5 py-4 whitespace-nowrap text-gray-600">{fmtShort(f.tx.date)}</td>
                                                <td className="px-5 py-4 text-gray-800">
                                                    <div className="font-medium">{f.tx.description}</div>
                                                    <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                                        {(f.tx.income || 0) > 0 ? (
                                                            <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">รับ +{fmtMoney(f.tx.income)}</span>
                                                        ) : (
                                                            <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">จ่าย -{fmtMoney(f.tx.expense)}</span>
                                                        )}
                                                        {f.tx.payer && <span className="text-gray-400">จาก: {f.tx.payer}</span>}
                                                        {f.tx.payee && <span className="text-gray-400">ให้: {f.tx.payee}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="flex items-center gap-1.5 text-red-600 font-medium bg-red-50 px-2.5 py-1.5 rounded-lg text-[11px] border border-red-100 w-fit">
                                                        <span className="material-symbols-outlined text-[14px]">cancel</span>
                                                        {FUND_TYPE_OPTIONS.find(o => o.value === f.tx.fundType)?.label || f.tx.fundType}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col gap-1 items-start bg-green-50/50 p-2.5 rounded-lg border border-green-100/50 w-fit">
                                                        <div className="flex items-center gap-1.5 font-bold text-green-700 text-xs">
                                                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                            ย้ายไป: {FUND_TYPE_OPTIONS.find(o => o.value === f.suggestFund)?.label || f.suggestFund}
                                                        </div>
                                                        <span className="text-[11px] text-gray-500 leading-snug">
                                                            เหตุผล: {f.reason}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right align-middle">
                                                    <button onClick={() => handleFix(f.tx.id, f.suggestFund)} className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-200 transition-colors shadow-sm whitespace-nowrap">ย้ายไปหมวดนี้</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center flex flex-col items-center justify-center animate-fade-in mt-4">
                            <span className="material-symbols-outlined text-green-500 text-6xl mb-4 bg-green-50 w-24 h-24 flex items-center justify-center rounded-full">verified</span>
                            <h3 className="text-xl font-bold text-green-700">ไม่พบข้อสังเกตเพิ่มเติม ยอดเยี่ยมมาก!</h3>
                            <p className="text-gray-500 mt-2 max-w-md">รายการทั้งหมดลงบัญชีตรงตามเงื่อนไขพื้นฐานของระบบตรวจสอบแล้ว ไม่มีรายการใดที่คุณต้องแก้ไขหมวดเงินด้วยตัวเอง</p>
                        </div>
                    )}
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

export default CashBookCheckModal;
