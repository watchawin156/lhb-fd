
import React from 'react';
import StatsCard from './StatsCard';
import { useSchoolData } from '../context/SchoolContext';
import { formatThaiDate } from '../utils';

interface DashboardProps {
  onNavigate: (page: string) => void;
  userRole?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { cashOnHand } = useSchoolData();

  const dynamicKPI = [
    {
      title: "เงินสดในมือวันนี้",
      value: `฿${cashOnHand.toLocaleString()}`,
      trend: `อัปเดตล่าสุด: ${formatThaiDate(new Date().toISOString())}`,
      trendDirection: "neutral" as const,
      trendLabel: "",
      icon: "payments",
      iconBgClass: "bg-green-100 dark:bg-green-900/20",
      iconColorClass: "text-green-700 dark:text-green-400"
    },
    {
      title: "เงินฝากธนาคาร (รวม)",
      value: `฿${(cashOnHand).toLocaleString()}`, // Removed mock +50000
      trend: "อุดหนุน+รายได้+นม",
      trendDirection: "up" as const,
      trendLabel: "",
      icon: "account_balance",
      iconBgClass: "bg-blue-100 dark:bg-blue-900/20",
      iconColorClass: "text-blue-700 dark:text-blue-400"
    },
    {
      title: "รายรับรอการจัดสรร",
      value: "฿0.00",
      trend: "ตรงกับยอดเงินฝาก",
      trendDirection: "neutral" as const,
      trendLabel: "สมดุล",
      icon: "pie_chart",
      iconBgClass: "bg-indigo-100 dark:bg-indigo-900/20",
      iconColorClass: "text-indigo-700 dark:text-indigo-400"
    },
    {
      title: "รวมรายจ่ายเดือนนี้",
      value: "฿0.00",
      trend: "งบอาหารกลางวัน",
      trendDirection: "neutral" as const,
      trendLabel: "",
      icon: "trending_down",
      iconBgClass: "bg-red-100 dark:bg-red-900/20",
      iconColorClass: "text-red-700 dark:text-red-400",
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 md:p-10 scroll-smooth">
      <div className="max-w-7xl mx-auto flex flex-col gap-10 pb-20 animate-fade-in">

        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">แผงควบคุมหลัก</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">ภาพรวมสถานะการเงินของโรงเรียนในวันนี้</p>
        </div>

        {/* Top KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {dynamicKPI.map((kpi, index) => (
            <StatsCard key={index} {...kpi} />
          ))}
        </div>

        {/* Placeholder for future charts or activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass-card p-8 h-[400px] flex items-center justify-center text-slate-400 italic">
            กราฟแสดงรายการเงินรายวัน (กำลังพัฒนา)
          </div>
          <div className="glass-card p-8 h-[400px] flex items-center justify-center text-slate-400 italic">
            รายการล่าสุด (กำลังพัฒนา)
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
