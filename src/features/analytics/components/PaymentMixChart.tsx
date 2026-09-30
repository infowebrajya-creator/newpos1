'use client';

import React from 'react';
import { PaymentMethodBreakdownItem } from '@/types/reports';
import { CreditCard, Wallet, QrCode, Building2, Layers } from 'lucide-react';

interface PaymentMixChartProps {
  payments: PaymentMethodBreakdownItem[];
}

export function PaymentMixChart({ payments }: PaymentMixChartProps) {
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

  return (
    <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-2.5">
        <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
          <CreditCard className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Payment Collection Mix</h3>
          <p className="text-[11px] text-slate-500">Distribution across settlement channels</p>
        </div>
      </div>

      {/* Payment Mix Progress & List */}
      {payments.length > 0 ? (
        <div className="space-y-3">
          {/* Visual Stacked Progress Bar */}
          <div className="w-full h-3 bg-slate-100 rounded-md overflow-hidden flex shadow-inner">
            {payments.map((p, idx) => {
              const percent = totalAmount > 0 ? (p.total_amount / totalAmount) * 100 : 0;
              const colors = [
                'bg-red-600',
                'bg-emerald-600',
                'bg-purple-600',
                'bg-blue-600',
                'bg-amber-600',
              ];
              return (
                <div
                  key={p.payment_method}
                  style={{ width: `${percent}%` }}
                  className={`h-full ${colors[idx % colors.length]} transition-all`}
                  title={`${p.payment_method.toUpperCase()}: ₹${p.total_amount} (${percent.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          {/* Detailed Item List */}
          <div className="space-y-2 pt-1">
            {payments.map((p, idx) => {
              const Icon = getMethodIcon(p.payment_method);
              const percent = totalAmount > 0 ? ((p.total_amount / totalAmount) * 100).toFixed(1) : '0';
              const dotColors = [
                'bg-red-600',
                'bg-emerald-600',
                'bg-purple-600',
                'bg-blue-600',
                'bg-amber-600',
              ];
              return (
                <div key={p.payment_method} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
                    <Icon className="w-3.5 h-3.5 text-slate-600" />
                    <span className="font-bold text-slate-900 uppercase">{p.payment_method}</span>
                  </div>

                  <div className="flex items-center space-x-3 text-right">
                    <span className="text-slate-500 font-mono">{p.transaction_count} txns</span>
                    <span className="font-mono text-slate-600 font-semibold">{percent}%</span>
                    <span className="font-mono font-black text-slate-900 min-w-[70px]">
                      ₹{p.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs font-medium">
          No payment transaction data for this period.
        </div>
      )}
    </div>
  );
}
