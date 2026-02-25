
import React from 'react';
import { useSchoolData } from '../context/SchoolContext';
import { formatThaiDateShort } from '../utils';

interface AuditLogProps {
    onNavigate?: (page: string) => void;
}

const AuditLog: React.FC<AuditLogProps> = ({ onNavigate }) => {
    const { auditLogs } = useSchoolData();

    const getPageForModule = (module: string) => {
        // Now module stores the actual pageId we can navigate to, except for 'settings' (could map to 'settings-general')
        if (module === 'settings') return 'settings-general';
        return module;
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark p-6">
            <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-10">

                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-text dark:text-text-dark flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-3xl">history</span>
                        ประวัติการแก้ไข (Audit Log)
                    </h2>
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50">
                        <h3 className="font-bold text-text dark:text-text-dark">รายการเคลื่อนไหวระบบล่าสุด</h3>
                        <p className="text-xs text-text-muted">บันทึกการกระทำของผู้ใช้งานทั้งหมด</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 text-text-muted font-semibold text-xs border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 whitespace-nowrap w-32">วันเวลา</th>
                                    <th className="px-4 py-4 whitespace-nowrap w-32">การกระทำ</th>
                                    <th className="px-4 py-4 whitespace-nowrap w-48">เมนู / หน้า</th>
                                    <th className="px-4 py-4 min-w-[200px]">รายละเอียด</th>
                                    <th className="px-4 py-4 text-right whitespace-nowrap w-32">ยอดเงิน</th>
                                    <th className="px-4 py-4 w-16 text-center">ลิงก์</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {auditLogs.sort((a, b) => b.id - a.id).map((log) => {
                                    const date = new Date(log.timestamp);
                                    const timeStr = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                                    const targetPage = getPageForModule(log.module);

                                    // Parse Details
                                    let pageName = '-';
                                    let actionDesc = log.details;
                                    let amount = '-';

                                    const pageMatch = actionDesc.match(/^หน้า([^\s]+)\s+(.+)/);
                                    if (pageMatch) {
                                        pageName = pageMatch[1];
                                        actionDesc = pageMatch[2];
                                    } else if (actionDesc.startsWith('หน้า')) {
                                        const parts = actionDesc.split(' ');
                                        pageName = parts[0].substring(4); // Remove "หน้า"
                                        actionDesc = parts.slice(1).join(' ');
                                    }

                                    const amtMatch = actionDesc.match(/ยอดเงิน\s+([\d,.]+)/);
                                    if (amtMatch) {
                                        amount = amtMatch[1];
                                        actionDesc = actionDesc.replace(amtMatch[0], '').trim();
                                    }

                                    // Colors for action
                                    let actionColor = 'text-gray-700 font-bold bg-gray-100 border-gray-200';
                                    if (log.action.includes('เพิ่ม')) {
                                        actionColor = 'text-green-700 font-bold bg-green-50 border-green-200';
                                    } else if (log.action.includes('แก้ไข')) {
                                        actionColor = 'text-blue-700 font-bold bg-blue-50 border-blue-200';
                                    } else if (log.action.includes('ลบ')) {
                                        actionColor = 'text-red-700 font-bold bg-red-50 border-red-200';
                                    }

                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900 dark:text-gray-100">{formatThaiDateShort(log.timestamp)}</div>
                                                <div className="text-xs text-gray-500">{timeStr} น.</div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 text-xs rounded-full border ${actionColor}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded">
                                                    {pageName}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-700 font-medium">
                                                {actionDesc}
                                            </td>
                                            <td className="px-4 py-4 text-right whitespace-nowrap">
                                                {amount !== '-' && (
                                                    <span className="font-bold text-gray-900">฿{parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                )}
                                                {amount === '-' && <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {onNavigate && targetPage && (
                                                    <button
                                                        onClick={() => onNavigate(targetPage)}
                                                        className="text-blue-500 hover:text-white transition-colors p-1.5 rounded-lg border border-blue-200 hover:bg-blue-500 hover:border-blue-500 shadow-sm inline-flex items-center justify-center bg-blue-50"
                                                        title={`ไปยังหน้า ${pageName}`}
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLog;
