import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  badge?: number | string;
  icon?: React.ReactNode;
}

interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  variant?: 'pills' | 'underline';
  size?: 'sm' | 'md';
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  size = 'md',
  className = '',
}: TabsProps<T>) {
  const containerStyles =
    variant === 'pills'
      ? 'flex items-center space-x-1.5 bg-slate-950/70 border border-slate-800/80 p-1 rounded-2xl overflow-x-auto scrollbar-none'
      : 'flex items-center space-x-4 border-b border-slate-800 overflow-x-auto scrollbar-none';

  const sizePadding = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-xs sm:text-sm';

  return (
    <div className={`${containerStyles} ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        if (variant === 'underline') {
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center space-x-2 py-3 border-b-2 text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all ${
                isActive
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-md ${
                    isActive ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center space-x-2 rounded-xl font-extrabold whitespace-nowrap transition-all ${sizePadding} ${
              isActive
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-md ${
                  isActive ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
