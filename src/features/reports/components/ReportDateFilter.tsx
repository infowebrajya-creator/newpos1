'use client';

import React from 'react';
import { DateRange, DatePreset } from '@/types/reports';
import { Calendar, Globe } from 'lucide-react';

interface ReportDateFilterProps {
  range: DateRange;
  onChangePreset: (preset: DatePreset, customStart?: string, customEnd?: string) => void;
  customStart: string;
  customEnd: string;
  setCustomStart: (val: string) => void;
  setCustomEnd: (val: string) => void;
}

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last_7_days', label: 'Last 7 Days' },
  { key: 'last_30_days', label: 'Last 30 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'custom', label: 'Custom' },
];

export function ReportDateFilter({
  range,
  onChangePreset,
  customStart,
  customEnd,
  setCustomStart,
  setCustomEnd,
}: ReportDateFilterProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
      {/* Preset Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => onChangePreset(p.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              range.preset === p.key
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom Date Pickers & Timezone Indicator */}
      <div className="flex items-center space-x-3">
        {range.preset === 'custom' && (
          <div className="flex items-center space-x-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                onChangePreset('custom', e.target.value, customEnd);
              }}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-red-500 text-xs font-medium"
            />
            <span className="text-slate-500 font-medium">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                onChangePreset('custom', customStart, e.target.value);
              }}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-red-500 text-xs font-medium"
            />
          </div>
        )}

        <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md font-medium shrink-0">
          <Globe className="w-3.5 h-3.5 text-red-600" />
          <span>Asia/Kolkata (IST)</span>
        </div>
      </div>
    </div>
  );
}
