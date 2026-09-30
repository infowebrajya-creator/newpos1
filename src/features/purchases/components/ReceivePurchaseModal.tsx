'use client';

import React, { useState } from 'react';
import { Purchase } from '@/types/purchases';
import { receivePurchase } from '@/services/purchases/purchaseService';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, CheckCircle2, X, PackageCheck } from 'lucide-react';

interface ReceivePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  purchase: Purchase | null;
}

export function ReceivePurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  purchase,
}: ReceivePurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !purchase) return null;

  const handleConfirmReceive = async () => {
    try {
      setLoading(true);
      setError(null);
      await receivePurchase(purchase.id);
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to receive purchase stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Confirm Purchase Receiving
              </h2>
              <p className="text-xs text-amber-800 font-medium">
                Purchase Order {purchase.purchase_number}
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
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-red-800 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs">
            <p className="text-amber-900 font-bold flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>This action will permanently increase inventory stock.</span>
            </p>
            <p className="text-amber-800 font-medium">
              Receiving stock is atomic and idempotent. Ingredient balances will be credited immediately.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Items to receive:
            </h4>
            <div className="max-h-48 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200">
              {(purchase.items || []).map((item) => (
                <div key={item.id} className="p-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{item.ingredient_name || 'Ingredient'}</span>
                  <span className="font-bold text-emerald-700">
                    +{item.quantity} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 px-6 py-3 border-t border-slate-100 bg-white">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmReceive}
            isLoading={loading}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span>Receive Stock Now</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
