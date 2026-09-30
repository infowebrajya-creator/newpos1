'use client';

import React from 'react';
import { SalesOverview, DailySalesTrendItem, HourlySalesItem } from '@/types/reports';
import { exportToCsv } from '@/lib/exportCsv';
import { Download, TrendingUp, Clock, DollarSign, Tag, Gift } from 'lucide-react';

interface SalesReportViewProps {
  overview: SalesOverview;
  dailyTrend: DailySalesTrendItem[];
  hourlySales: HourlySalesItem[];
}

export function SalesReportView({ overview, dailyTrend, hourlySales }: SalesReportViewProps) {
  const maxDailySales = Math.max(...dailyTrend.map((d) => d.total_sales), 1);
  const maxHourlySales = Math.max(...hourlySales.map((h) => h.total_sales), 1);

  const handleExportDaily = () => {
    exportToCsv('sales_daily_report', dailyTrend, {
      sales_date: 'Date',
      bill_count: 'Paid Bills',
      total_sales: 'Gross Sales (₹)',
      net_sales: 'Net Sales (₹)',
      total_discounts: 'Discounts (₹)',
    });
  };

  return (
    <div className="space-y-4">
      {/* Financial Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-slate-600 block mb-1">Gross Sales</span>
          <p className="text-xl font-black font-mono text-slate-900">
            ₹{overview.gross_sales.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Sum of bill subtotals</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-slate-600 block mb-1">Total Discounts</span>
          <p className="text-xl font-black font-mono text-amber-700">
            -₹{overview.total_discounts.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {overview.discounted_bills_count} bills discounted
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-slate-600 block mb-1">Net Revenue</span>
          <p className="text-xl font-black font-mono text-emerald-700">
            ₹{overview.net_sales.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Gross minus discounts</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-slate-600 block mb-1">Complimentary Value</span>
          <p className="text-xl font-black font-mono text-purple-700">
            ₹{overview.total_complimentary_value.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {overview.complimentary_items_count} items served free
          </span>
        </div>
      </div>

      {/* Daily Sales Trend Chart & Table */}
      <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">Daily Sales Trend</h3>
          </div>
          <button
            onClick={handleExportDaily}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Visual Bar Chart */}
        {dailyTrend.length > 0 ? (
          <div className="h-40 bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-end justify-between gap-1.5 overflow-x-auto">
            {dailyTrend.map((item, idx) => {
              const heightPercent = Math.max(5, Math.round((item.total_sales / maxDailySales) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center min-w-[28px] h-full justify-end group">
                  <div className="text-[9px] font-mono text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity mb-1 font-bold">
                    ₹{item.total_sales}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-red-600 group-hover:bg-red-700 rounded-t transition-all"
                  />
                  <span className="text-[9px] font-mono text-slate-600 truncate max-w-[40px] mt-1 font-medium">
                    {item.sales_date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs font-medium">
            No sales data available for this period.
          </div>
        )}

        {/* Table */}
        {dailyTrend.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase bg-slate-50">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-center">Paid Bills</th>
                  <th className="py-2.5 px-3 text-right">Discounts</th>
                  <th className="py-2.5 px-3 text-right">Net Sales</th>
                  <th className="py-2.5 px-3 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {dailyTrend.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                      {d.sales_date}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                      {d.bill_count}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-700 font-semibold">
                      ₹{d.total_discounts.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 font-semibold">
                      ₹{d.net_sales.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                      ₹{d.total_sales.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hourly Sales Distribution Chart */}
      <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-bold text-slate-900">Hourly Demand Distribution (IST)</h3>
        </div>

        <div className="h-32 bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-end justify-between gap-1 overflow-x-auto">
          {hourlySales.map((h) => {
            const heightPercent = Math.max(4, Math.round((h.total_sales / maxHourlySales) * 100));
            return (
              <div key={h.hour_of_day} className="flex-1 flex flex-col items-center min-w-[20px] h-full justify-end group">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full bg-slate-700 group-hover:bg-slate-900 rounded-t transition-all"
                  title={`${h.hour_of_day}:00 - ₹${h.total_sales} (${h.bill_count} bills)`}
                />
                <span className="text-[9px] font-mono text-slate-600 mt-1 font-medium">
                  {h.hour_of_day}h
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
