'use client';

import React from 'react';
import { PurchaseReportSummary, SupplierPurchaseAggregate } from '@/types/reports';
import { exportToCsv } from '@/lib/exportCsv';
import { ShoppingBag, Download, Building2, CheckCircle2, XCircle } from 'lucide-react';

interface PurchasesReportViewProps {
  summary: PurchaseReportSummary;
  suppliers: SupplierPurchaseAggregate[];
}

export function PurchasesReportView({ summary, suppliers }: PurchasesReportViewProps) {
  const handleExportSuppliers = () => {
    exportToCsv('supplier_purchases_report', suppliers, {
      supplier_name: 'Supplier Name',
      purchase_count: 'Purchase Order Count',
      total_purchase_amount: 'Total Amount (₹)',
    });
  };

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-slate-600 block mb-1">Total Purchases</span>
          <p className="text-xl font-black font-mono text-slate-900">{summary.total_purchases_count}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Purchase orders created</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-emerald-800 block mb-1">Received POs</span>
          <p className="text-xl font-black font-mono text-emerald-800">{summary.received_purchases_count}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Stock credited</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-red-800 block mb-1">Cancelled POs</span>
          <p className="text-xl font-black font-mono text-red-800">{summary.cancelled_purchases_count}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Cancelled before receipt</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-slate-600 block mb-1">Total Spend</span>
          <p className="text-xl font-black font-mono text-slate-900">
            ₹{summary.total_purchase_amount.toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Sum of received PO totals</span>
        </div>
      </div>

      {/* Supplier Aggregates Table */}
      <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">Supplier Procurement Aggregates</h3>
          </div>
          <button
            onClick={handleExportSuppliers}
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
                <th className="py-2.5 px-3">Supplier Name</th>
                <th className="py-2.5 px-3 text-center">Purchase Count</th>
                <th className="py-2.5 px-3 text-right">Total Amount Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {suppliers.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{s.supplier_name}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-700 font-semibold">
                    {s.purchase_count}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                    ₹{s.total_purchase_amount.toFixed(2)}
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
