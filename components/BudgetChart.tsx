import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_DATA } from '../constants';

const BudgetChart: React.FC = () => {
  return (
    <div className="bg-surface dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-text dark:text-text-dark flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">bar_chart</span>
            เปรียบเทียบ รายรับ-รายจ่าย
          </h2>
          <p className="text-xs text-text-muted dark:text-text-muted-dark mt-1">ข้อมูลย้อนหลัง 6 เดือน (ปีการศึกษา 2566-2567)</p>
        </div>
        <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> รายรับ
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium">
                <div className="w-2 h-2 rounded-full bg-red-400"></div> รายจ่าย
            </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={CHART_DATA}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barSize={20}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}} 
                dy={10}
            />
            <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}}
                tickFormatter={(value) => `฿${value/1000}k`}
            />
            <Tooltip 
                cursor={{fill: '#f1f5f9'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="income" name="รายรับ" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="รายจ่าย" fill="#f87171" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BudgetChart;