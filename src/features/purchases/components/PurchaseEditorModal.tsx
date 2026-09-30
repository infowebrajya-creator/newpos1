'use client';

import React, { useState, useEffect } from 'react';
import { Supplier, CreatePurchaseInput, CreatePurchaseItemInput, PurchaseStatus } from '@/types/purchases';
import { Ingredient } from '@/types/inventory';
import { getSuppliers } from '@/services/suppliers/supplierService';
import { getIngredients } from '@/services/inventory/inventoryService';
import { createPurchase } from '@/services/purchases/purchaseService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Plus, Trash2, ShoppingBag, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PurchaseEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export function PurchaseEditorModal({
  isOpen,
  onClose,
  onSuccess,
}: PurchaseEditorModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);

  const [items, setItems] = useState<CreatePurchaseItemInput[]>([
    { ingredient_id: '', quantity: 1, unit: 'kg', unit_cost: 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [supData, ingData] = await Promise.all([
            getSuppliers(),
            getIngredients(),
          ]);
          const activeSuppliers = supData.filter((s) => s.is_active);
          const activeIngredients = ingData.filter((i) => i.is_active);
          setSuppliers(activeSuppliers);
          setIngredients(activeIngredients);

          if (activeSuppliers.length > 0) {
            setSupplierId(activeSuppliers[0].id);
          }
          if (activeIngredients.length > 0 && items[0].ingredient_id === '') {
            setItems([
              {
                ingredient_id: activeIngredients[0].id,
                quantity: 1,
                unit: activeIngredients[0].unit || 'kg',
                unit_cost: activeIngredients[0].cost_per_unit || 0,
              },
            ]);
          }
        } catch (err) {
          console.error('Failed to load purchase editor prerequisites:', err);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const firstIng = ingredients[0];
    setItems([
      ...items,
      {
        ingredient_id: firstIng?.id || '',
        quantity: 1,
        unit: firstIng?.unit || 'kg',
        unit_cost: firstIng?.cost_per_unit || 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof CreatePurchaseItemInput,
    value: string | number
  ) => {
    const updated = [...items];
    const current = { ...updated[index] };

    if (field === 'ingredient_id') {
      current.ingredient_id = value as string;
      const selectedIng = ingredients.find((i) => i.id === value);
      if (selectedIng) {
        current.unit = selectedIng.unit;
        current.unit_cost = selectedIng.cost_per_unit || 0;
      }
    } else if (field === 'quantity') {
      current.quantity = Math.max(0.001, Number(value) || 0);
    } else if (field === 'unit_cost') {
      current.unit_cost = Math.max(0, Number(value) || 0);
    } else if (field === 'unit') {
      current.unit = value as string;
    }

    updated[index] = current;
    setItems(updated);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_cost || 0),
    0
  );
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

  const handleSubmit = async (targetStatus: PurchaseStatus) => {
    if (!supplierId) {
      setError('Please select a supplier');
      return;
    }

    if (items.length === 0 || items.some((i) => !i.ingredient_id)) {
      setError('Please select an ingredient for every row');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: CreatePurchaseInput = {
        supplier_id: supplierId,
        invoice_number: invoiceNumber,
        purchase_date: purchaseDate,
        notes,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        status: targetStatus,
        items,
      };

      await createPurchase(payload);
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                New Purchase Order
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Create a draft or ordered purchase for raw ingredients
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
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier & Header info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Supplier <span className="text-red-600">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 font-medium"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Supplier Invoice / Ref #"
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-90412"
            />

            <Input
              label="Purchase Date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>

          {/* Items Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Raw Ingredients List ({items.length})
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ingredient Row</span>
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {items.map((item, index) => {
                const lineTotal = (item.quantity || 0) * (item.unit_cost || 0);
                return (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <div className="flex-1 w-full">
                      <select
                        value={item.ingredient_id}
                        onChange={(e) =>
                          handleItemChange(index, 'ingredient_id', e.target.value)
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500 font-medium"
                      >
                        <option value="" disabled>
                          Select Ingredient...
                        </option>
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full sm:w-28">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={item.quantity || ''}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', e.target.value)
                        }
                        placeholder="Qty"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 text-right font-medium"
                      />
                    </div>

                    <div className="w-full sm:w-24">
                      <select
                        value={item.unit}
                        onChange={(e) =>
                          handleItemChange(index, 'unit', e.target.value)
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 font-medium"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="l">l</option>
                        <option value="ml">ml</option>
                        <option value="pcs">pcs</option>
                        <option value="pack">pack</option>
                        <option value="box">box</option>
                      </select>
                    </div>

                    <div className="w-full sm:w-32">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unit_cost || ''}
                        onChange={(e) =>
                          handleItemChange(index, 'unit_cost', e.target.value)
                        }
                        placeholder="Cost (₹)"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 text-right font-medium"
                      />
                    </div>

                    <div className="w-full sm:w-28 text-right font-bold text-slate-900 py-1.5">
                      ₹{lineTotal.toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length <= 1}
                      className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Purchase Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions, delivery terms or supplier notes..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 font-medium resize-none"
              />
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Discount (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 bg-white border border-slate-300 rounded px-2 py-0.5 text-right font-bold text-emerald-700 text-xs"
                />
              </div>

              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Tax (₹)</span>
                <input
                  type="number"
                  min="0"
                  value={taxAmount || ''}
                  onChange={(e) => setTaxAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 bg-white border border-slate-300 rounded px-2 py-0.5 text-right font-bold text-slate-900 text-xs"
                />
              </div>

              <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-2">
                <span>Grand Total</span>
                <span className="text-red-600 font-bold">₹{grandTotal.toFixed(2)}</span>
              </div>
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
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSubmit('draft')}
            disabled={loading}
            className="bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200 text-xs font-bold"
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleSubmit('ordered')}
            isLoading={loading}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span>Mark as Ordered</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
