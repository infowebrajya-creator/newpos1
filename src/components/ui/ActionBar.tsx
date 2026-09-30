import React from 'react';

interface ActionBarProps {
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  infoSummary?: React.ReactNode;
  position?: 'bottom' | 'top' | 'inline';
  className?: string;
}

export function ActionBar({
  primaryAction,
  secondaryActions,
  infoSummary,
  position = 'bottom',
  className = '',
}: ActionBarProps) {
  const positionClasses =
    position === 'bottom'
      ? 'sticky bottom-0 z-20 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl p-3'
      : position === 'top'
      ? 'sticky top-16 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-3 shadow-md'
      : 'bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md';

  return (
    <div className={`${positionClasses} flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
      {infoSummary && (
        <div className="flex items-center space-x-3 w-full sm:w-auto overflow-x-auto text-xs text-slate-300 font-medium">
          {infoSummary}
        </div>
      )}

      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
        {secondaryActions && (
          <div className="flex items-center space-x-2 shrink-0">{secondaryActions}</div>
        )}
        {primaryAction && <div className="shrink-0">{primaryAction}</div>}
      </div>
    </div>
  );
}
