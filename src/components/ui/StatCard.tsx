import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
}

export function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-sm hover:border-slate-700/80 transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-slate-800/70 border border-slate-700/50 flex items-center justify-center text-indigo-400">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="text-3xl font-extrabold tracking-tight text-white">{value}</div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-400 font-medium">{subtitle}</p>
        )}
        {trend && (
          <span className="mt-2 inline-block text-xs font-semibold text-emerald-400">
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
