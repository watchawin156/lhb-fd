import React from 'react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, title, onConfirm, onCancel }) => {
    const [confirmText, setConfirmText] = React.useState('');

    if (!isOpen) return null;

    const isConfirmed = confirmText === 'ยืนยัน';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm scale-in-center bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden">
                {/* Header */}
                <div className="bg-red-50 px-6 py-4 flex items-center gap-3 border-b border-red-100">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-red-800">{title}</h3>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-red-600 text-center">
                                พิมพ์คำว่า "ยืนยัน" เพื่อทำการลบ
                            </label>
                            <input
                                type="text"
                                autoFocus
                                className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all font-bold text-center text-lg ${isConfirmed ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 focus:border-red-400'
                                    }`}
                                placeholder="ยืนยัน"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && isConfirmed) {
                                        onConfirm("ลบโดยผู้ใช้");
                                        setConfirmText('');
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
                    <button
                        onClick={() => {
                            setConfirmText('');
                            onCancel();
                        }}
                        className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        disabled={!isConfirmed}
                        onClick={() => {
                            onConfirm("ลบโดยผู้ใช้");
                            setConfirmText('');
                        }}
                        className={`px-8 py-2.5 rounded-xl font-semibold text-white shadow-lg transition-all ${isConfirmed
                            ? 'bg-red-600 hover:bg-red-700 active:scale-95 shadow-red-200'
                            : 'bg-gray-300 cursor-not-allowed grayscale shadow-none'
                            }`}
                    >
                        ลบรายการ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;
