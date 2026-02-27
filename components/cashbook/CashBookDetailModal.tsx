import React, { useState, useEffect } from 'react';
import { useSchoolData } from '../../context/SchoolContext';
import { FUND_TYPE_OPTIONS } from '../../utils';
import { fmtShort, fmtMoney } from './utils';

interface CashBookDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    txId: number | string | null;
}

const CashBookDetailModal: React.FC<CashBookDetailModalProps> = ({ isOpen, onClose, txId }) => {
    const { transactions, editTransaction, deleteTransaction } = useSchoolData();
    const [isEditingTx, setIsEditingTx] = useState(false);
    const [showDeletePrompt, setShowDeletePrompt] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [editTxData, setEditTxData] = useState({ date: '', docNo: '', description: '', amount: '', fundType: '', payer: '', payee: '' });

    const selectedTx = transactions.find((t: any) => t.id === txId);

    // Reset state when opened with a new tx
    useEffect(() => {
        if (isOpen && selectedTx && !isEditingTx && !showDeletePrompt) {
            setEditTxData({
                date: selectedTx.date,
                docNo: selectedTx.docNo || '',
                description: selectedTx.description || '',
                amount: String(selectedTx.income > 0 ? selectedTx.income : selectedTx.expense),
                fundType: selectedTx.fundType || '',
                payer: selectedTx.payer || '',
                payee: selectedTx.payee || '',
            });
        }
    }, [isOpen, selectedTx, isEditingTx, showDeletePrompt]);

    if (!isOpen || !selectedTx) return null;

    const handleEditSave = () => {
        const amt = parseFloat(editTxData.amount) || 0;
        editTransaction(selectedTx.id, {
            date: editTxData.date,
            docNo: editTxData.docNo,
            description: editTxData.description,
            fundType: editTxData.fundType,
            income: selectedTx.income > 0 ? amt : 0,
            expense: selectedTx.expense > 0 ? amt : 0,
            payer: editTxData.payer,
            payee: editTxData.payee,
        });
        setIsEditingTx(false);
        onClose();
    };

    const handleDelete = () => {
        deleteTransaction(selectedTx.id, 'ลบรายการจากสมุดเงินสด');
        setShowDeletePrompt(false);
        setDeleteConfirm('');
        onClose();
    };

    const handleClose = () => {
        setIsEditingTx(false);
        setShowDeletePrompt(false);
        setDeleteConfirm('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-scale-in">
                <div className="px-6 pt-5 pb-3 flex justify-between items-start">
                    <div>
                        <p className="text-xs text-gray-400">รายละเอียดรายการ</p>
                        <h2 className="text-lg font-bold text-gray-900">{isEditingTx ? 'แก้ไขรายการ' : (selectedTx.income > 0 ? 'รายรับ' : 'รายจ่าย')}</h2>
                    </div>
                    <button onClick={handleClose}
                        className="text-blue-500 hover:text-blue-700 text-sm font-semibold">ปิด</button>
                </div>

                {isEditingTx ? (
                    /* Edit form */
                    <div className="px-6 pb-5 space-y-3">
                        {/* วันที่ */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">วันที่</label>
                            <input
                                type="text"
                                value={(() => {
                                    const d = new Date(editTxData.date);
                                    if (isNaN(d.getTime())) return editTxData.date;
                                    const day = d.getDate();
                                    const month = d.getMonth() + 1;
                                    const year = d.getFullYear() + 543;
                                    return `${day}/${month}/${year}`;
                                })()}
                                onChange={e => {
                                    const v = e.target.value;
                                    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                                    if (m) {
                                        const be = parseInt(m[3]);
                                        const yr = be > 2400 ? be - 543 : be;
                                        const iso = `${yr}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
                                        setEditTxData({ ...editTxData, date: iso });
                                    } else {
                                        setEditTxData({ ...editTxData, date: v });
                                    }
                                }}
                                placeholder="วว/ดด/ปปปป เช่น 1/10/2568"
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
                            />
                        </div>

                        {/* ที่เอกสาร */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">ที่เอกสาร</label>
                            <input type="text" value={editTxData.docNo}
                                onChange={e => setEditTxData({ ...editTxData, docNo: e.target.value })}
                                placeholder="เลขที่เอกสาร"
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors" />
                        </div>

                        {/* ประเภทเงิน */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">ประเภทเงิน</label>
                            <select value={editTxData.fundType}
                                onChange={e => setEditTxData({ ...editTxData, fundType: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white transition-colors">
                                {Array.from(new Set(FUND_TYPE_OPTIONS.map(o => o.group))).map(group => (
                                    <optgroup key={group} label={group}>
                                        {FUND_TYPE_OPTIONS.filter(o => o.group === group).map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        {/* รายการ */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">รายการ</label>
                            <input type="text" value={editTxData.description}
                                onChange={e => setEditTxData({ ...editTxData, description: e.target.value })}
                                placeholder="รายละเอียดรายการ"
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors" />
                        </div>

                        {/* ผู้รับ / ผู้จ่าย */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">
                                {selectedTx.income > 0 ? 'ผู้นำส่ง / หัวรายการ' : 'ผู้รับเงิน / หัวรายการ'}
                            </label>
                            <input type="text"
                                value={selectedTx.income > 0 ? editTxData.payer : editTxData.payee}
                                onChange={e => {
                                    if (selectedTx.income > 0) setEditTxData({ ...editTxData, payer: e.target.value });
                                    else setEditTxData({ ...editTxData, payee: e.target.value });
                                }}
                                placeholder="ชื่อหัวรายการ (ไม่บังคับ)"
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors" />
                        </div>

                        {/* จำนวนเงิน */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 block mb-1">
                                จำนวนเงิน ({selectedTx.income > 0 ? 'รับ' : 'จ่าย'})
                            </label>
                            <div className={`flex items-center rounded-xl px-4 py-3 border ${parseFloat(editTxData.amount) > 0 ? (selectedTx.income > 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300') : 'bg-gray-50 border-gray-200'}`}>
                                <input type="number" step="0.01" value={editTxData.amount}
                                    onChange={e => setEditTxData({ ...editTxData, amount: e.target.value })}
                                    className={`w-full text-base font-bold text-right outline-none bg-transparent ${parseFloat(editTxData.amount) > 0 ? (selectedTx.income > 0 ? 'text-green-700' : 'text-red-700') : 'text-gray-400'}`}
                                    placeholder="0.00" />
                                <span className="text-sm text-gray-400 ml-2">บาท</span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button onClick={() => setIsEditingTx(false)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">ยกเลิก</button>
                            <button onClick={handleEditSave}
                                className="flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-colors">บันทึกการแก้ไข</button>
                        </div>
                    </div>
                ) : deleteConfirm !== null && deleteConfirm !== '' ? null : (
                    /* View mode */
                    <div className="px-6 pb-4">
                        <div className="space-y-2 mb-4">
                            {[
                                { label: 'วันที่', value: fmtShort(selectedTx.date) },
                                { label: 'ที่เอกสาร', value: selectedTx.docNo || '-' },
                                { label: 'รายการ', value: selectedTx.description },
                                { label: 'ประเภท', value: FUND_TYPE_OPTIONS.find(o => o.value === selectedTx.fundType)?.label || selectedTx.fundType },
                                { label: selectedTx.income > 0 ? 'จำนวนรับ' : 'จำนวนจ่าย', value: `฿${fmtMoney(selectedTx.income > 0 ? selectedTx.income : selectedTx.expense)}` },
                                { label: 'ชื่อหัวรายการ', value: (selectedTx.payer || selectedTx.payee || '-') },
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                                    <span className="text-xs text-gray-400">{item.label}</span>
                                    <span className="text-sm font-medium text-gray-800">{item.value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsEditingTx(true)}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-base">edit</span> แก้ไข
                            </button>
                            <button onClick={() => setShowDeletePrompt(true)}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-base">delete</span> ลบ
                            </button>
                        </div>
                    </div>
                )}

                {/* Delete confirmation */}
                {showDeletePrompt && !isEditingTx && (
                    <div className="px-6 pb-5 border-t border-gray-100 pt-4">
                        <p className="text-sm text-red-600 font-semibold mb-2">⚠️ ยืนยันการลบรายการ</p>
                        <p className="text-xs text-gray-500 mb-3">พิมพ์ <span className="font-bold text-red-600">"ยืนยัน"</span> เพื่อยืนยันการลบ</p>
                        <input type="text" value={deleteConfirm}
                            onChange={e => setDeleteConfirm(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm outline-none focus:border-red-400 mb-3"
                            placeholder='พิมพ์ "ยืนยัน"' />
                        <div className="flex gap-2">
                            <button onClick={() => { setShowDeletePrompt(false); setDeleteConfirm(''); }}
                                className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200">ยกเลิก</button>
                            <button
                                disabled={deleteConfirm !== 'ยืนยัน'}
                                onClick={handleDelete}
                                className={`flex-[2] py-2 rounded-xl text-sm font-semibold text-white transition-all ${deleteConfirm === 'ยืนยัน' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 cursor-not-allowed'}`}>
                                ลบรายการ
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CashBookDetailModal;
