'use client';

import React from 'react';
import { HourlySalesItem } from '@/types/reports';
import { Clock, Sun, Moon } from 'lucide-react';

interface HourlyPatternChartProps {
  hourlySales: HourlySalesItem[];
}

export function HourlyPatternChart({ hourlySales }: HourlyPatternChartProps) {
  const maxSales = Math.max(...hourlySales.map((h) => h.total_sales), 1);
  const maxBills = Math.max(...hourlySales.map((h) => h.bill_count), 1);
  const totalHourlySales = hourlySales.reduce((sum, h) => sum + h.total_sales, 0);

  // Peak Hour calculation
  const peakHour = hourlySales.reduce(
    (max, h) => (h.total_sales > (max?.total_sales || 0) ? h : max),
    hourlySales[0] || null
  );

  return (
    <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Hourly Demand Pattern</h3>
            <p className="text-[11px] text-slate-500">24-hour distribution of sales volume & orders (IST)</p>
          </div>
        </div>

        {peakHour && peakHour.total_sales > 0 && (
          <div className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">Highest Volume Hour</span>
            <span className="font-mono font-bold text-slate-900">
              {peakHour.hour_of_day}:00 - {peakHour.hour_of_day + 1}:00 (₹{peakHour.total_sales.toFixed(2)})
            </span>
          </div>
        )}
      </div>

      {/* Visual 24-Hour Distribution Bar Chart */}
      <div className="h-36 bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-end justify-between gap-1 overflow-x-auto">
        {hourlySales.map((h) => {
          const heightPercent = Math.max(4, Math.round((h.total_sales / maxSales) * 100));
          const isPeak = peakHour && h.hour_of_day === peakHour.hour_of_day && h.total_sales > 0;
          return (
            <div key={h.hour_of_day} className="flex-1 flex flex-col items-center min-w-[22px] h-full justify-end group">
              <div className="text-[9px] font-mono text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-bold whitespace-nowrap">
                ₹{h.total_sales}
              </div>
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full rounded-t transition-all ${
                  isPeak ? 'bg-red-600 font-bold' : 'bg-slate-700 group-hover:bg-slate-900'
                }`}
                title={`${h.hour_of_day}:00 IST — ₹${h.total_sales} (${h.bill_count} bills)`}
              />
              <span className="text-[9px] font-mono text-slate-600 mt-1 font-medium">
                {h.hour_of_day}h
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
