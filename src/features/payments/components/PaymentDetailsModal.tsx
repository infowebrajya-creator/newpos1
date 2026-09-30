'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { EnrichedPayment } from '@/types/payments';
import { getPaymentDetails } from '@/services/payments/paymentService';
import { printBill } from '@/services/printing/printService';
import { Button } from '@/components/ui/Button';
import {
  X,
  CreditCard,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  Printer,
  ExternalLink,
  DollarSign,
  User,
  Phone,
  UtensilsCrossed,
  Receipt,
  AlertCircle,
  Layers,
} from 'lucide-react';

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: EnrichedPayment | null;
}

export function PaymentDetailsModal({ isOpen, onClose, payment }: PaymentDetailsModalProps) {
  const [detailedPayment, setDetailedPayment] = useState<EnrichedPayment | null>(payment);
  const [loading, setLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && payment) {
      setDetailedPayment(payment);
      const fetchExtra = async () => {
        try {
          setLoading(true);
          const extra = await getPaymentDetails(payment.id);
          if (extra) {
            setDetailedPayment(extra);
          }
        } catch {
          // Keep initial
        } finally {
          setLoading(false);
        }
      };
      fetchExtra();
    }
  }, [isOpen, payment]);

  if (!isOpen || !payment) return null;

  const currentData = detailedPayment || payment;

  const handleReprintReceipt = async () => {
    if (!currentData.bill_id) return;
    try {
      setIsPrinting(true);
      setPrintFeedback(null);
      const { result } = await printBill(currentData.bill_id, true);
      setPrintFeedback(result.message || 'Receipt sent to printer');
    } catch (err: unknown) {
      setPrintFeedback(err instanceof Error ? err.message : 'Print failed');
    } finally {
      setIsPrinting(false);
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'upi':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'card':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'credit':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      default:
        return 'bg-slate-100 border-slate-200 text-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">
                  Bill #{currentData.bill_number}
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getMethodBadge(currentData.method)}`}>
                  {currentData.method}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-emerald-50 text-emerald-800 border-emerald-200">
                  {currentData.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Recorded on {new Date(currentData.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {printFeedback && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center space-x-2 text-blue-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{printFeedback}</span>
            </div>
          )}

          {/* Amount Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">
                Payment Amount
              </span>
              <span className="text-base font-bold text-slate-900">
                ₹ {(Number(currentData.amount) || 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">
                Bill Total
              </span>
              <span className="text-base font-bold text-slate-900">
                ₹ {(Number(currentData.bill_grand_total || currentData.amount) || 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">
                Bill Balance / Due
              </span>
              <span className={`text-base font-bold ${(currentData.bill_balance_amount || 0) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                ₹ {(Number(currentData.bill_balance_amount) || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Metadata info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-red-600" />
                <span>Table & Session</span>
              </span>
              <p className="text-xs font-bold text-slate-900">
                {currentData.table_number || 'T-'} {currentData.order_type ? `• ${currentData.order_type.toUpperCase()}` : ''}
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-red-600" />
                <span>Customer</span>
              </span>
              <p className="text-xs font-bold text-slate-900">
                {currentData.customer_name || 'Walk-in Guest'} {currentData.customer_phone ? `(${currentData.customer_phone})` : ''}
              </p>
            </div>

            {currentData.reference_number && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 sm:col-span-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  <span>Reference / Transaction ID</span>
                </span>
                <p className="text-xs font-mono font-bold text-slate-900">
                  {currentData.reference_number}
                </p>
              </div>
            )}
          </div>

          {/* Split Payment Breakdown */}
          {currentData.all_bill_payments && currentData.all_bill_payments.length > 1 && (
            <div>
              <div className="flex items-center space-x-1.5 mb-2">
                <Layers className="w-3.5 h-3.5 text-slate-600" />
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Split Payment Breakdown ({currentData.all_bill_payments.length} Payments on Bill #{currentData.bill_number})
                </h4>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3">Reference</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {currentData.all_bill_payments.map((sp) => (
                      <tr key={sp.id} className={sp.id === currentData.id ? 'bg-red-50/40 font-bold' : ''}>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getMethodBadge(sp.method)}`}>
                            {sp.method}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">₹ {sp.amount.toFixed(2)}</td>
                        <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{sp.reference_number || '—'}</td>
                        <td className="py-2 px-3 text-emerald-800 font-bold uppercase text-[10px]">{sp.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bill Items Breakdown if loaded */}
          {currentData.items && currentData.items.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Bill Items ({currentData.items.length})
              </h4>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {currentData.items.map((it: any) => {
                      const itemName = it.item_name || it.name || 'Item';
                      const qty = Number(it.quantity) || 1;
                      const price = Number(it.unit_price) || 0;
                      const total = Number(it.line_total ?? it.total_price ?? (price * qty)) || 0;

                      return (
                        <tr key={it.id || Math.random()} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">{itemName}</td>
                          <td className="py-2 px-3 text-right text-slate-700">{qty}</td>
                          <td className="py-2 px-3 text-right text-slate-700">₹ {price.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">₹ {total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-white">
          <Link href="/pos/billing">
            <Button variant="outline" size="sm" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold">
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Open Billing
            </Button>
          </Link>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReprintReceipt}
              isLoading={isPrinting}
              className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-slate-600" />
              Reprint Receipt
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
