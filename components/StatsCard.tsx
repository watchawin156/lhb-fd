
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
    <div className={`bg-surface dark:bg-surface-dark p-5 rounded-xl shadow-sm border border-border-light dark:border-border-dark flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-md transition-all`}>
      {/* Decorative background icon */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.05] dark:opacity-[0.08] pointer-events-none">
        <span className="material-symbols-outlined text-8xl text-current">{icon}</span>
      </div>

      <div className="flex justify-between items-start z-10">
        <span className="text-text-muted dark:text-text-muted-dark font-medium text-sm">{title}</span>
        <div className={`p-2 rounded-lg ${iconBgClass} ${iconColorClass} ${isAlert ? 'animate-pulse' : ''}`}>
          <span className={`material-symbols-outlined text-xl ${isAlert ? 'animate-flash-red' : ''}`}>{icon}</span>
        </div>
      </div>
      
      <div className="z-10">
        <h2 className={`text-2xl font-bold tracking-tight mb-1 ${isAlert ? 'text-red-600 animate-flash-red' : 'text-text dark:text-text-dark'}`}>{value}</h2>
        <div className="flex items-center gap-2 text-xs">
             <span className={`font-medium ${getTrendColor()}`}>{trend}</span>
             {trendLabel && <span className="text-text-muted dark:text-text-muted-dark">• {trendLabel}</span>}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
