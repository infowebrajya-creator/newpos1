'use client';

import React from 'react';
import { TopSellingItem, CategorySalesItem } from '@/types/reports';
import { Utensils, Tag, Award } from 'lucide-react';

interface ItemPerformanceChartProps {
  topItems: TopSellingItem[];
  categorySales: CategorySalesItem[];
}

export function ItemPerformanceChart({ topItems, categorySales }: ItemPerformanceChartProps) {
  const maxRevenue = Math.max(...topItems.map((i) => i.total_revenue), 1);
  const maxCategoryRevenue = Math.max(...categorySales.map((c) => c.total_revenue), 1);

  return (
    <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
        <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
          <Utensils className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Menu & Category Performance</h3>
          <p className="text-[11px] text-slate-500">Item demand rank & category sales breakdown</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Items Ranking */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Top Performing Items</span>
          </h4>

          {topItems.length > 0 ? (
            <div className="space-y-2">
              {topItems.slice(0, 5).map((item, idx) => {
                const widthPercent = Math.max(10, Math.round((item.total_revenue / maxRevenue) * 100));
                return (
                  <div key={idx} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="w-4 h-4 rounded-full bg-slate-200 font-mono text-[10px] font-bold flex items-center justify-center text-slate-700 shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 truncate">{item.item_name}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded font-medium">
                          {item.category_name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-right shrink-0">
                        <span className="text-[11px] font-mono text-slate-600">{item.quantity_sold} sold</span>
                        <span className="font-mono font-bold text-slate-900">₹{item.total_revenue.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                      <div style={{ width: `${widthPercent}%` }} className="h-full bg-red-600 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs font-medium">
              No top selling item data.
            </div>
          )}
        </div>

        {/* Category Share Distribution */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-600" />
            <span>Category Volume Breakdown</span>
          </h4>

          {categorySales.length > 0 ? (
            <div className="space-y-2">
              {categorySales.slice(0, 5).map((cat) => {
                const widthPercent = Math.max(10, Math.round((cat.total_revenue / maxCategoryRevenue) * 100));
                return (
                  <div key={cat.category_name} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 truncate">{cat.category_name}</span>
                      <div className="flex items-center space-x-2 font-mono text-right">
                        <span className="text-[11px] text-slate-600">{cat.quantity_sold} qty</span>
                        <span className="font-bold text-slate-900">₹{cat.total_revenue.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                      <div style={{ width: `${widthPercent}%` }} className="h-full bg-slate-700 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs font-medium">
              No category sales data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
