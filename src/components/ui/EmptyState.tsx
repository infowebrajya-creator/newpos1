import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className = '',
}: EmptyStateProps) {
  const paddingClass = compact ? 'p-6 space-y-2' : 'p-10 space-y-4';

  return (
    <div
      className={`bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center text-center ${paddingClass} ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-sm font-extrabold text-slate-200">{title}</h3>
        {description && (
          <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
