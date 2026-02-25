
import React from 'react';
import { useSchoolData } from '../context/SchoolContext';
import { formatThaiDate } from '../utils';

interface ApprovalTableProps {
  isInteractive?: boolean;
}

const ApprovalTable: React.FC<ApprovalTableProps> = ({ isInteractive = true }) => {
  const { approvals, processApproval } = useSchoolData();
  
  // Only show pending items
  const pendingApprovals = approvals.filter(a => a.status === 'pending');

  const getStatusBadge = (type: string) => {
    switch(type) {
        case 'purchase': return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-medium border border-orange-200">จัดซื้อ (PR)</span>;
        case 'service': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-medium border border-purple-200">จัดจ้าง</span>;
        case 'loan': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium border border-blue-200">ยืมเงิน</span>;
        default: return null;
    }
  }

  if (pendingApprovals.length === 0) {
    return (
        <div className="bg-surface dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center flex flex-col items-center justify-center h-full">
            <div className="p-3 rounded-full bg-green-50 text-green-600 mb-3">
                <span className="material-symbols-outlined text-3xl">task_alt</span>
            </div>
            <h3 className="text-base font-bold text-text dark:text-text-dark">ไม่มีรายการรออนุมัติ</h3>
            <p className="text-sm text-text-muted dark:text-text-muted-dark mt-1">
                {isInteractive ? "คุณดำเนินการครบทุกรายการแล้ว" : "ไม่มีรายการที่รอการตรวจสอบ"}
            </p>
        </div>
    )
  }

  return (
    <div className="bg-surface dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full">
      <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div>
            <h3 className="text-lg font-bold text-text dark:text-text-dark flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-500">history_edu</span>
            รายการรออนุมัติ (Pending)
            </h3>
            <p className="text-xs text-text-muted mt-1">รายการล่าสุดที่รอการตรวจสอบจากผู้อำนวยการ</p>
        </div>
        <button className="text-primary hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            ดูทั้งหมด ({pendingApprovals.length})
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-background-light dark:bg-background-dark text-text-muted font-medium text-xs">
            <tr>
              <th className="px-5 py-3 font-semibold">รายการ / เลขที่เอกสาร</th>
              <th className="px-5 py-3 font-semibold">ผู้ขอเบิก / แผนก</th>
              <th className="px-5 py-3 font-semibold text-right">จำนวนเงิน</th>
              <th className="px-5 py-3 font-semibold text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {pendingApprovals.map((request) => (
              <tr key={request.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        {getStatusBadge(request.type)}
                        <span className="text-text dark:text-text-dark font-medium">{request.title}</span>
                    </div>
                    <span className="text-xs text-text-muted font-mono">{request.id} • {formatThaiDate(request.date)}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                    <p className="text-text dark:text-text-dark text-sm">{request.requester}</p>
                    <p className="text-xs text-text-muted">{request.department}</p>
                </td>
                <td className="px-5 py-4 text-right">
                    <span className="font-bold text-text dark:text-text-dark text-base">฿{request.amount.toLocaleString()}</span>
                </td>
                <td className="px-5 py-4 text-right">
                  {isInteractive ? (
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => processApproval(request.id, 'rejected')}
                        className="p-1.5 rounded-lg text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="ไม่อนุมัติ"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                      <button 
                        onClick={() => processApproval(request.id, 'approved')}
                        className="flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold shadow-sm transition-colors shadow-blue-500/20"
                      >
                        <span className="material-symbols-outlined text-[18px]">check</span>
                        อนุมัติ
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-orange-500 font-medium bg-orange-50 px-2 py-1 rounded">รออนุมัติ</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ApprovalTable;
