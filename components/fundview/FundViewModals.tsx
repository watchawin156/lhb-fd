import React from 'react';
import { formatThaiDate } from '../../utils';
import { Transaction } from '../../types';
import ThaiDatePicker from '../ThaiDatePicker';
import { parseDateInput } from './FundViewTypes';

interface FundViewModalsProps {
    // Detail modal
    isDetailModalOpen: boolean;
    selectedTx: Transaction | null;
    isEditing: boolean;
    isDeleting: boolean;
    deleteConfirmation: string;
    editFormData: Partial<Transaction>;
    onCloseDetail: () => void;
    onStartEdit: () => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onStartDelete: () => void;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
    onDeleteConfirmationChange: (v: string) => void;
    onEditChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onEditDateChange: (date: string) => void;
    // Export modal
    isExportModalOpen: boolean;
    exportFormat: 'pdf' | 'excel';
    exportDateInput: string;
    onCloseExport: () => void;
    onExportDateChange: (v: string) => void;
    onExportConfirm: () => void;
}

const FundViewModals: React.FC<FundViewModalsProps> = ({
    isDetailModalOpen, selectedTx, isEditing, isDeleting, deleteConfirmation,
    editFormData, onCloseDetail, onStartEdit, onSaveEdit, onCancelEdit,
    onStartDelete, onCancelDelete, onConfirmDelete,
    onDeleteConfirmationChange, onEditChange, onEditDateChange,
    isExportModalOpen, exportFormat, exportDateInput,
    onCloseExport, onExportDateChange, onExportConfirm
}) => {
    return (
        <>
            {/* Detail Modal */}
            {isDetailModalOpen && selectedTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-scale-in">
                        <div className="px-6 pt-5 pb-3 flex justify-between items-start">
                            <div>
                                <p className="text-xs text-gray-400">รายละเอียดรายการ</p>
                                <h2 className="text-lg font-bold text-gray-900">{isEditing ? 'แก้ไขรายการ' : (selectedTx.income > 0 ? 'รายรับ' : 'รายจ่าย')}</h2>
                            </div>
                            <button onClick={onCloseDetail} className="text-blue-500 hover:text-blue-700 text-sm font-semibold">ปิด</button>
                        </div>
                        {isEditing ? (
                            <div className="px-6 pb-4 space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">วันที่</label>
                                    <ThaiDatePicker value={editFormData.date || ''} onChange={onEditDateChange} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 block mb-1">ที่เอกสาร</label>
                                        <input type="text" name="docNo" value={editFormData.docNo} onChange={onEditChange}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 block mb-1">จำนวนเงิน</label>
                                        <input type="number" step="0.01"
                                            name={selectedTx.income > 0 ? 'income' : 'expense'}
                                            value={selectedTx.income > 0 ? editFormData.income : editFormData.expense}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                onEditChange({ target: { name: selectedTx.income > 0 ? 'income' : 'expense', value: val } } as any);
                                            }}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none text-right font-bold" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">รายการ</label>
                                    <input type="text" name="description" value={editFormData.description} onChange={onEditChange}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={onCancelEdit} className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200">ยกเลิก</button>
                                    <button onClick={onSaveEdit} className="flex-[2] py-2 rounded-xl text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600">บันทึก</button>
                                </div>
                            </div>
                        ) : !isDeleting ? (
                            <div className="px-6 pb-4">
                                <div className="space-y-2 mb-4">
                                    {[
                                        { label: 'วันที่', value: formatThaiDate(selectedTx.date) },
                                        { label: 'ที่เอกสาร', value: selectedTx.docNo || '-' },
                                        { label: 'รายการ', value: selectedTx.description },
                                        { label: selectedTx.income > 0 ? 'รับจาก' : 'จ่ายให้', value: (selectedTx.income > 0 ? selectedTx.payer : selectedTx.payee) || '-' },
                                        { label: selectedTx.income > 0 ? 'จำนวนรับ' : 'จำนวนจ่าย', value: `฿${(selectedTx.income || selectedTx.expense).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                                    ].map((item, i) => (
                                        <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                                            <span className="text-xs text-gray-400">{item.label}</span>
                                            <span className="text-sm font-medium text-gray-800">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={onStartEdit} className="flex-1 py-2 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-base">edit</span> แก้ไข
                                    </button>
                                    <button onClick={onStartDelete} className="flex-1 py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-base">delete</span> ลบ
                                    </button>
                                </div>
                            </div>
                        ) : null}
                        {isDeleting && !isEditing && (
                            <div className="px-6 pb-5 border-t border-gray-100 pt-4">
                                <p className="text-sm text-red-600 font-semibold mb-2">⚠️ ยืนยันการลบรายการ</p>
                                <p className="text-xs text-gray-500 mb-3">พิมพ์ <span className="font-bold text-red-600">"ยืนยัน"</span> เพื่อยืนยันการลบ</p>
                                <input type="text" value={deleteConfirmation} onChange={e => onDeleteConfirmationChange(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm outline-none focus:border-red-400 mb-3"
                                    placeholder='พิมพ์ "ยืนยัน"' />
                                <div className="flex gap-2">
                                    <button onClick={onCancelDelete} className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200">ยกเลิก</button>
                                    <button onClick={onConfirmDelete} disabled={deleteConfirmation !== 'ยืนยัน'}
                                        className={`flex-[2] py-2 rounded-xl text-sm font-semibold text-white transition-all ${deleteConfirmation === 'ยืนยัน' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 cursor-not-allowed'}`}>
                                        ลบรายการ
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Export Date Modal */}
            {isExportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                <span className={`material-symbols-outlined text-2xl ${exportFormat === 'pdf' ? 'text-red-600' : 'text-green-600'}`}>
                                    {exportFormat === 'pdf' ? 'picture_as_pdf' : 'table_view'}
                                </span>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                        ส่งออก {exportFormat === 'pdf' ? 'PDF' : 'Excel'}
                                    </h3>
                                    <p className="text-xs text-gray-500">ระบุวันที่ของรายงาน</p>
                                </div>
                            </div>
                            <button onClick={onCloseExport} className="text-text-muted hover:text-red-500 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">วันที่</label>
                                <input type="text" value={exportDateInput} onChange={e => onExportDateChange(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-gray-800"
                                    placeholder="16/5/2569 หรือ 16/5/2569 - 17/5/2569" autoFocus />
                                <p className="text-xs text-gray-400">
                                    วันเดียว: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">16/5/2569</span>
                                    {' '}หรือช่วง: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">16/5/2569 - 17/5/2569</span>
                                </p>
                                {exportDateInput && (() => {
                                    const parsed = parseDateInput(exportDateInput);
                                    if (!parsed) return <p className="text-xs text-red-400 flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span> รูปแบบไม่ถูกต้อง</p>;
                                    const fmt = (iso: string) => { const d = new Date(iso); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`; };
                                    return (
                                        <p className="text-xs text-green-600 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            {parsed.start === parsed.end ? `วันที่ ${fmt(parsed.start)}` : `${fmt(parsed.start)} ถึง ${fmt(parsed.end)}`}
                                        </p>
                                    );
                                })()}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={onCloseExport} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                                    ยกเลิก
                                </button>
                                <button onClick={onExportConfirm} disabled={!parseDateInput(exportDateInput)}
                                    className={`flex-[2] py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 ${exportFormat === 'pdf'
                                        ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
                                        : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'
                                        } disabled:cursor-not-allowed`}>
                                    <span className="material-symbols-outlined text-base">
                                        {exportFormat === 'pdf' ? 'picture_as_pdf' : 'table_view'}
                                    </span>
                                    สร้าง {exportFormat === 'pdf' ? 'PDF' : 'Excel'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FundViewModals;
