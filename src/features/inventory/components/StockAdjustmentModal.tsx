'use client';

import React, { useState } from 'react';
import { Ingredient, InventoryTransactionType } from '@/types/inventory';
import { adjustStock } from '@/services/inventory/inventoryService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Package, AlertCircle, Plus, Minus, RefreshCw, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StockAdjustmentModalProps {
  ingredient: Ingredient | null;
  initialType?: InventoryTransactionType;
  onClose: () => void;
  onSuccess: () => void;
}

export function StockAdjustmentModal({
  ingredient,
  initialType = 'adjustment',
  onClose,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [txType, setTxType] = useState<InventoryTransactionType>(initialType);
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!ingredient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = parseFloat(quantityInput);
    if (isNaN(qty) || qty === 0) {
      setError('Please enter a valid non-zero quantity.');
      return;
    }

    // Determine final signed quantity based on transaction type convention
    // Positive = Stock Increases (opening_stock, purchase, transfer_in)
    // Negative = Stock Decreases (wastage, transfer_out, consumption)
    let finalQty = qty;
    if (txType === 'wastage' || txType === 'transfer_out' || txType === 'consumption') {
      finalQty = -Math.abs(qty);
    } else if (txType === 'opening_stock' || txType === 'purchase' || txType === 'transfer_in') {
      finalQty = Math.abs(qty);
    }

    // Check resulting stock does not drop below 0
    const resultingStock = ingredient.current_stock + finalQty;
    if (resultingStock < 0) {
      setError(
        `Adjustment would result in negative stock (${resultingStock.toFixed(2)} ${ingredient.unit}). Current stock is ${ingredient.current_stock.toFixed(2)} ${ingredient.unit}.`
      );
      return;
    }

    try {
      setIsLoading(true);
      await adjustStock(
        ingredient.id,
        finalQty,
        txType,
        reason || (txType === 'wastage' ? 'Wastage / damaged stock' : 'Stock Adjustment')
      );
      setIsLoading(false);
      onSuccess();
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : '';
      setError(`Stock adjustment failed: ${msg || 'Please check input.'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Stock Adjustment
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {ingredient.name} • Current: <span className="text-slate-900 font-bold">{ingredient.current_stock.toFixed(2)} {ingredient.unit}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start space-x-2 text-red-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTxType('adjustment')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  txType === 'adjustment'
                    ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Adjustment</span>
              </button>

              <button
                type="button"
                onClick={() => setTxType('wastage')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  txType === 'wastage'
                    ? 'bg-red-600 border-red-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wastage</span>
              </button>

              <button
                type="button"
                onClick={() => setTxType('purchase')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  txType === 'purchase'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Purchase Add</span>
              </button>

              <button
                type="button"
                onClick={() => setTxType('opening_stock')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  txType === 'opening_stock'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Opening Stock</span>
              </button>
            </div>
          </div>

          <Input
            label={`Quantity (${ingredient.unit})`}
            type="number"
            step="0.001"
            placeholder={txType === 'wastage' ? 'e.g. 2.0 (Amount to reduce)' : 'e.g. 5.0 (Positive add, Negative reduce)'}
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            required
          />

          <Input
            label="Reason / Notes"
            type="text"
            placeholder="e.g. Damaged stock, Routine count, Supplier arrival..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-1/2 bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="w-1/2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              isLoading={isLoading}
            >
              Save Adjustment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
