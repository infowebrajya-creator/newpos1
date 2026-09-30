import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  badge,
  actions,
  children,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4 ${className}`}
    >
      <div className="flex items-start sm:items-center space-x-3">
        {icon && (
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {(actions || children) && (
        <div className="flex items-center space-x-2.5 shrink-0 self-start sm:self-auto">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}

export function SectionHeader({
  title,
  count,
  action,
  className = '',
}: {
  title: string;
  count?: number | string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between py-2 border-b border-slate-800/80 mb-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          {title}
        </h3>
        {count !== undefined && (
          <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            {count}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
