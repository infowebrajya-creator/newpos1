'use client';

import React from 'react';
import {
  InventoryReportSummary,
  InventoryMovementItem,
  InventoryConsumptionItemReport,
} from '@/types/reports';
import { exportToCsv } from '@/lib/exportCsv';
import { Package, Download, Activity, Flame, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface InventoryReportViewProps {
  summary: InventoryReportSummary;
  movements: InventoryMovementItem[];
  consumptions: InventoryConsumptionItemReport[];
}

export function InventoryReportView({
  summary,
  movements,
  consumptions,
}: InventoryReportViewProps) {
  const handleExportConsumptions = () => {
    exportToCsv('inventory_consumption_report', consumptions, {
      ingredient_name: 'Ingredient',
      total_consumed_qty: 'Consumed Quantity',
      unit: 'Unit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Valuation & Stock Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-slate-600 block mb-1">Stock Valuation</span>
          <p className="text-xl font-black font-mono text-slate-900">
            ₹{summary.total_valuation.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Current stock × cost per unit</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-emerald-800 block mb-1">Healthy Stock</span>
          <p className="text-xl font-black font-mono text-emerald-800">{summary.healthy_count}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Above minimum threshold</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-amber-800 block mb-1">Low Stock Warning</span>
          <p className="text-xl font-black font-mono text-amber-800">{summary.low_stock_count}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">At or below minimum</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-red-800 block mb-1">Out of Stock</span>
          <p className="text-xl font-black font-mono text-red-800">{summary.out_of_stock_count}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Zero remaining quantity</span>
        </div>
      </div>

      {/* Movement Breakdown */}
      <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-bold text-slate-900">Stock Movement Breakdown</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {movements.map((m) => (
            <div key={m.transaction_type} className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1">
              <span className="text-xs font-bold uppercase text-slate-700 block">
                {m.transaction_type.replace('_', ' ')}
              </span>
              <p className="text-sm font-mono font-bold text-slate-900">
                {m.total_quantity.toFixed(2)} units
              </p>
              <span className="text-[11px] text-slate-500 block font-medium">{m.transaction_count} transactions</span>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Consumption Snapshot Table */}
      <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">Recipe Inventory Consumptions</h3>
          </div>
          <button
            onClick={handleExportConsumptions}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase bg-slate-50">
                <th className="py-2.5 px-3">Ingredient Name</th>
                <th className="py-2.5 px-3 text-center">Unit</th>
                <th className="py-2.5 px-3 text-right">Total Consumed Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {consumptions.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{c.ingredient_name}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600 font-medium">{c.unit}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                    {c.total_consumed_qty.toFixed(3)}
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
