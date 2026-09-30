'use client';

import React from 'react';
import { Purchase } from '@/types/purchases';
import { Button } from '@/components/ui/Button';
import { X, ShoppingBag, Calendar, FileText, Building2, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
}

export function PurchaseDetailsModal({
  isOpen,
  onClose,
  purchase,
}: PurchaseDetailsModalProps) {
  if (!isOpen || !purchase) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'ordered':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'partially_received':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'cancelled':
        return 'bg-red-50 border-red-200 text-red-800';
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
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">
                  {purchase.purchase_number}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(
                    purchase.status
                  )}`}
                >
                  {purchase.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Created on {new Date(purchase.created_at).toLocaleDateString()}
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
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-red-600" />
                <span>Supplier</span>
              </span>
              <p className="text-xs font-bold text-slate-900">{purchase.supplier_name}</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-red-600" />
                <span>Invoice Number</span>
              </span>
              <p className="text-xs font-bold text-slate-900 font-mono">
                {purchase.invoice_number || 'N/A'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-600" />
                <span>Purchase Date</span>
              </span>
              <p className="text-xs font-bold text-slate-900">
                {new Date(purchase.purchase_date).toLocaleDateString()}
              </p>
            </div>

            {purchase.received_at && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Received At</span>
                </span>
                <p className="text-xs font-bold text-slate-900">
                  {new Date(purchase.received_at).toLocaleString()}
                </p>
              </div>
            )}

            {purchase.cancelled_at && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                  <span>Cancelled At</span>
                </span>
                <p className="text-xs font-bold text-slate-900">
                  {new Date(purchase.cancelled_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Purchase Items Breakdown
            </h4>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase bg-slate-50">
                    <th className="py-2.5 px-3.5">Ingredient</th>
                    <th className="py-2.5 px-3.5 text-right">Quantity</th>
                    <th className="py-2.5 px-3.5 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {(purchase.items || []).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">
                        {item.ingredient_name || 'Ingredient'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-medium text-slate-700">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-medium text-slate-700">
                        ₹{item.unit_cost.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                        ₹{item.line_total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 max-w-xs ml-auto text-xs">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">₹{purchase.subtotal.toFixed(2)}</span>
            </div>

            {purchase.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount</span>
                <span className="font-bold">-₹{purchase.discount_amount.toFixed(2)}</span>
              </div>
            )}

            {purchase.tax_amount > 0 && (
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Tax</span>
                <span className="font-bold text-slate-900">+₹{purchase.tax_amount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-2">
              <span>Grand Total</span>
              <span className="text-red-600 font-bold">₹{purchase.grand_total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 bg-white">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
