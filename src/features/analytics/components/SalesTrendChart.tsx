'use client';

import React from 'react';
import { DailySalesTrendItem } from '@/types/reports';
import { TrendingUp, ArrowUpRight, Calendar } from 'lucide-react';

interface SalesTrendChartProps {
  dailyTrend: DailySalesTrendItem[];
}

export function SalesTrendChart({ dailyTrend }: SalesTrendChartProps) {
  const maxSales = Math.max(...dailyTrend.map((d) => d.total_sales), 1);
  const totalPeriodSales = dailyTrend.reduce((sum, d) => sum + d.total_sales, 0);
  const avgDailySales = dailyTrend.length > 0 ? totalPeriodSales / dailyTrend.length : 0;
  
  // Find peak day
  const peakDay = dailyTrend.reduce(
    (max, d) => (d.total_sales > (max?.total_sales || 0) ? d : max),
    dailyTrend[0] || null
  );

  return (
    <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-3">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Revenue & Sales Trend</h3>
            <p className="text-[11px] text-slate-500">Daily sales trajectory across the selected period</p>
          </div>
        </div>

        {dailyTrend.length > 0 && peakDay && (
          <div className="flex items-center space-x-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Avg Daily</span>
              <span className="font-mono font-bold text-slate-900">₹{avgDailySales.toFixed(2)}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
              <span className="text-emerald-800 text-[10px] uppercase font-bold block">Peak Day ({peakDay.sales_date.slice(5)})</span>
              <span className="font-mono font-bold text-emerald-800">₹{peakDay.total_sales.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Time Series Bar Chart */}
      {dailyTrend.length > 0 ? (
        <div className="space-y-2">
          <div className="h-44 bg-slate-50 border border-slate-200 p-3.5 rounded-lg flex items-end justify-between gap-1.5 overflow-x-auto">
            {dailyTrend.map((item, idx) => {
              const heightPercent = Math.max(6, Math.round((item.total_sales / maxSales) * 100));
              const isPeak = peakDay && item.sales_date === peakDay.sales_date && item.total_sales > 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center min-w-[32px] h-full justify-end group">
                  <div className="text-[9px] font-mono text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-bold whitespace-nowrap">
                    ₹{item.total_sales}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t transition-all ${
                      isPeak
                        ? 'bg-emerald-600 group-hover:bg-emerald-700 shadow-sm'
                        : 'bg-red-600 group-hover:bg-red-700'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-600 truncate max-w-[42px] mt-1 font-medium">
                    {item.sales_date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
            <div className="bg-slate-50 border border-slate-200 p-2 rounded-md">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Period Sales</span>
              <span className="font-mono font-black text-slate-900">₹{totalPeriodSales.toFixed(2)}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2 rounded-md">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Paid Bills</span>
              <span className="font-mono font-black text-slate-900">
                {dailyTrend.reduce((sum, d) => sum + d.bill_count, 0)}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2 rounded-md">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Net Revenue</span>
              <span className="font-mono font-black text-emerald-700">
                ₹{dailyTrend.reduce((sum, d) => sum + d.net_sales, 0).toFixed(2)}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-2 rounded-md">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Discounts</span>
              <span className="font-mono font-black text-amber-700">
                ₹{dailyTrend.reduce((sum, d) => sum + d.total_discounts, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs font-medium">
          No sales trend data available for this period.
        </div>
      )}
    </div>
  );
}
