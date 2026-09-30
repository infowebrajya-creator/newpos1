'use client';

import React from 'react';
import { PaymentMethodBreakdownItem } from '@/types/reports';
import { exportToCsv } from '@/lib/exportCsv';
import { CreditCard, Wallet, QrCode, Building2, Download, CheckCircle2 } from 'lucide-react';

interface PaymentsReportViewProps {
  payments: PaymentMethodBreakdownItem[];
}

export function PaymentsReportView({ payments }: PaymentsReportViewProps) {
  const totalAmount = payments.reduce((sum, p) => sum + p.total_amount, 0);

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return Wallet;
      case 'upi':
        return QrCode;
      case 'card':
        return CreditCard;
      default:
        return Building2;
    }
  };

  const handleExport = () => {
    exportToCsv('payment_methods_report', payments, {
      payment_method: 'Payment Method',
      transaction_count: 'Transaction Count',
      total_amount: 'Total Amount (₹)',
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Export */}
      <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Payment Methods Breakdown</h3>
          <p className="text-xs text-slate-500">
            Factual distribution of split and single payments recorded for paid bills
          </p>
        </div>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {payments.map((p) => {
          const Icon = getMethodIcon(p.payment_method);
          const percent = totalAmount > 0 ? ((p.total_amount / totalAmount) * 100).toFixed(1) : '0';
          return (
            <div key={p.payment_method} className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-md bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded uppercase">
                  {p.payment_method}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block font-medium">Total Received</span>
                <p className="text-xl font-black font-mono text-slate-900">₹{p.total_amount.toFixed(2)}</p>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-100">
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Transactions: {p.transaction_count}</span>
                  <span className="font-mono text-slate-900 font-bold">{percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div style={{ width: `${percent}%` }} className="h-full bg-red-600 rounded-full" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Payment Transactions Summary
        </h4>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase bg-slate-50">
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3 text-center">Transaction Count</th>
                <th className="py-2.5 px-3 text-right">Share (%)</th>
                <th className="py-2.5 px-3 text-right">Total Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {payments.map((p) => {
                const percent = totalAmount > 0 ? ((p.total_amount / totalAmount) * 100).toFixed(1) : '0';
                return (
                  <tr key={p.payment_method} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-bold uppercase text-slate-900">
                      {p.payment_method}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700 font-semibold">
                      {p.transaction_count}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-semibold">
                      {percent}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                      ₹{p.total_amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
