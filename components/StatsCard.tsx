
import React from 'react';
import { KPICardProps } from '../types';

const StatsCard: React.FC<KPICardProps> = ({
  title,
  value,
  trend,
  trendDirection,
  trendLabel,
  icon,
  iconBgClass,
  iconColorClass,
  isAlert
}) => {
  const getTrendColor = () => {
    if (trendDirection === 'up') return 'text-green-600 dark:text-green-400';
    if (trendDirection === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-text-muted dark:text-text-muted-dark';
  };

  return (
    <div className="glass-card p-6 flex flex-col justify-between h-40 relative overflow-hidden group">
      {/* Decorative background icon */}
      <div className="absolute -right-6 -bottom-6 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform duration-700">
        <span className="material-symbols-outlined text-9xl text-primary">{icon}</span>
      </div>

      <div className="flex justify-between items-start z-10">
        <span className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">{title}</span>
        <div className={`p-3 rounded-2xl ${iconBgClass} ${iconColorClass} shadow-inner`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
      </div>

      <div className="z-10 mt-auto">
        <h2 className="text-3xl font-black tracking-tighter text-slate-800 dark:text-white mb-1">{value}</h2>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 ${getTrendColor()}`}>{trend}</span>
          {trendLabel && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{trendLabel}</span>}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
