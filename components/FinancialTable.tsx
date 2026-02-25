
import React from 'react';
import { FINANCIAL_RECORDS } from '../constants';

const FinancialTable: React.FC = () => {
  // Calculate totals
  const totalDebit = FINANCIAL_RECORDS.reduce((acc, curr) => acc + (curr.debit || 0), 0);
  const totalCredit = FINANCIAL_RECORDS.reduce((acc, curr) => acc + (curr.credit || 0), 0);
  
  const formatValue = (val: number | null) => {
    if (val === null) return '';
    if (val === 0) return '-';
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-surface dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark flex flex-col overflow-hidden">
      <div className="p-5 border-b border-border-light dark:border-border-dark">
        <h3 className="text-lg font-bold text-text dark:text-text-dark flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">account_balance</span>
          รายงานเงินคงเหลือประจำวัน (Daily Cash Flow)
        </h3>
        <p className="text-xs text-text-muted dark:text-text-muted-dark mt-1">ณ วันที่ 1 ตุลาคม 2566</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-background-light dark:bg-slate-800/50 text-text dark:text-text-dark font-bold text-xs uppercase tracking-wider border-b border-border-light dark:border-border-dark">
            <tr>
              <th className="px-6 py-4">รายการ (Items)</th>
              <th className="px-6 py-4 text-right">เดบิต (Debit)</th>
              <th className="px-6 py-4 text-right">เครดิต (Credit)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {FINANCIAL_RECORDS.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                <td className={`px-6 py-3 ${record.indent ? 'pl-10' : ''} ${record.isHeader ? 'font-bold text-text dark:text-text-dark' : 'text-text-muted dark:text-text-muted-dark'}`}>
                   {record.indent && <span className="inline-block w-2 h-2 mr-2 border-l border-b border-gray-300 dark:border-gray-600 rounded-bl-md"></span>}
                   {record.item}
                </td>
                <td className="px-6 py-3 text-right font-medium text-text dark:text-text-dark font-mono">
                  {formatValue(record.debit)}
                </td>
                <td className="px-6 py-3 text-right font-medium text-text dark:text-text-dark font-mono">
                  {formatValue(record.credit)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-slate-800/50 font-bold text-text dark:text-text-dark border-t-2 border-border-light dark:border-border-dark">
            <tr>
              <td className="px-6 py-4 text-right">รวมทั้งสิ้น</td>
              <td className="px-6 py-4 text-right underline decoration-double decoration-2 underline-offset-4 text-primary font-mono">
                {formatValue(totalDebit)}
              </td>
              <td className="px-6 py-4 text-right underline decoration-double decoration-2 underline-offset-4 text-primary font-mono">
                {formatValue(totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default FinancialTable;
