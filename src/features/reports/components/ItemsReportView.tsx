'use client';

import React, { useState } from 'react';
import { TopSellingItem, CategorySalesItem } from '@/types/reports';
import { exportToCsv } from '@/lib/exportCsv';
import { Utensils, Download, PieChart, Layers } from 'lucide-react';

interface ItemsReportViewProps {
  topItems: TopSellingItem[];
  categorySales: CategorySalesItem[];
}

export function ItemsReportView({ topItems, categorySales }: ItemsReportViewProps) {
  const [sortBy, setSortBy] = useState<'quantity' | 'revenue'>('quantity');

  const sortedItems = [...topItems].sort((a, b) =>
    sortBy === 'quantity' ? b.quantity_sold - a.quantity_sold : b.total_revenue - a.total_revenue
  );

  const handleExportItems = () => {
    exportToCsv('top_selling_items_report', sortedItems, {
      item_name: 'Item Name',
      category_name: 'Category',
      quantity_sold: 'Quantity Sold',
      total_revenue: 'Total Revenue (₹)',
      complimentary_quantity: 'Complimentary Qty',
    });
  };

  return (
    <div className="space-y-4">
      {/* Category Breakdown Cards */}
      <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-red-600" />
          <h3 className="text-sm font-bold text-slate-900">Category Sales Breakdown</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categorySales.map((cat) => (
            <div key={cat.category_name} className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1">
              <span className="text-xs font-bold text-slate-900 block truncate">{cat.category_name}</span>
              <div className="flex justify-between items-baseline pt-0.5">
                <span className="text-[11px] text-slate-600 font-mono font-medium">{cat.quantity_sold} sold</span>
                <span className="text-xs font-mono font-bold text-slate-900">₹{cat.total_revenue.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Item Sales Table */}
      <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Utensils className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Menu Item Performance</h3>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 p-1 rounded-md text-xs">
              <span className="text-slate-600 text-[11px] px-2 font-semibold">Sort by:</span>
              <button
                onClick={() => setSortBy('quantity')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  sortBy === 'quantity' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Quantity
              </button>
              <button
                onClick={() => setSortBy('revenue')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  sortBy === 'revenue' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Revenue
              </button>
            </div>

            <button
              onClick={handleExportItems}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase bg-slate-50">
                <th className="py-2.5 px-3">Menu Item</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Quantity Sold</th>
                <th className="py-2.5 px-3 text-center">Complimentary Qty</th>
                <th className="py-2.5 px-3 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {sortedItems.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{item.item_name}</td>
                  <td className="py-2.5 px-3 text-slate-600 font-medium">{item.category_name}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-900">
                    {item.quantity_sold}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-purple-700 font-semibold">
                    {item.complimentary_quantity || 0}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                    ₹{item.total_revenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
