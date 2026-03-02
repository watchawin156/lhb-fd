import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success';
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    type = 'info',
    confirmLabel = 'ตกลง',
    cancelLabel = 'ยกเลิก',
    onConfirm,
    onCancel,
    showCancel = true
}) => {
    if (!isOpen) return null;

    const getTypeStyles = () => {
        switch (type) {
            case 'warning': return 'bg-amber-50 text-amber-600 border-amber-200';
            case 'error': return 'bg-red-50 text-red-600 border-red-200';
            case 'success': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            default: return 'bg-blue-50 text-blue-600 border-blue-200';
        }
    };

    const getButtonStyles = () => {
        switch (type) {
            case 'warning': return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500';
            case 'error': return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
            case 'success': return 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500';
            default: return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-scale-up border border-gray-100">
                <div className={`px-6 py-4 border-b flex items-center gap-3 ${getTypeStyles()}`}>
                    <span className="text-xl">
                        {type === 'warning' && '⚠️'}
                        {type === 'error' && '❌'}
                        {type === 'success' && '✅'}
                        {type === 'info' && 'ℹ️'}
                    </span>
                    <h3 className="font-bold text-lg">{title}</h3>
                </div>

                <div className="px-6 py-8 text-gray-700 text-center">
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{message}</p>
                </div>

                <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 border-t">
                    {showCancel && onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-white hover:shadow-sm transition-all"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        onClick={confirmModal => {
                            onConfirm();
                        }}
                        className={`px-6 py-2.5 rounded-xl text-white font-bold shadow-sm transition-all focus:outline-none focus:ring-4 ${getButtonStyles()}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
