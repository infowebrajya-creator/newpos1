'use client';

import React, { useState } from 'react';
import { Ingredient, IngredientCategory, StockUnit } from '@/types/inventory';
import { createIngredient, updateIngredient } from '@/services/inventory/inventoryService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Package, AlertCircle } from 'lucide-react';

interface IngredientModalProps {
  ingredient?: Ingredient | null;
  categories: IngredientCategory[];
  onClose: () => void;
  onSuccess: () => void;
}

export function IngredientModal({
  ingredient,
  categories,
  onClose,
  onSuccess,
}: IngredientModalProps) {
  const isEditing = !!ingredient;

  const [name, setName] = useState<string>(ingredient?.name || '');
  const [categoryId, setCategoryId] = useState<string>(ingredient?.category_id || '');
  const [unit, setUnit] = useState<StockUnit | string>(ingredient?.unit || 'kg');
  const [initialStock, setInitialStock] = useState<string>('0');
  const [minimumStock, setMinimumStock] = useState<string>(ingredient?.minimum_stock?.toString() || '0');
  const [maximumStock, setMaximumStock] = useState<string>(ingredient?.maximum_stock?.toString() || '0');
  const [costPerUnit, setCostPerUnit] = useState<string>(ingredient?.cost_per_unit?.toString() || '0');
  const [description, setDescription] = useState<string>(ingredient?.description || '');
  const [isActive, setIsActive] = useState<boolean>(ingredient?.is_active ?? true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Ingredient name is required.');
      return;
    }

    const minStock = parseFloat(minimumStock) || 0;
    const maxStock = parseFloat(maximumStock) || 0;
    const cost = parseFloat(costPerUnit) || 0;
    const initStock = parseFloat(initialStock) || 0;

    if (minStock < 0) {
      setError('Minimum stock cannot be negative.');
      return;
    }

    if (maxStock < minStock && maxStock > 0) {
      setError('Maximum stock must be greater than or equal to minimum stock.');
      return;
    }

    if (cost < 0) {
      setError('Cost per unit cannot be negative.');
      return;
    }

    try {
      setIsLoading(true);

      if (isEditing && ingredient) {
        await updateIngredient(ingredient.id, {
          name,
          category_id: categoryId || null,
          unit,
          minimum_stock: minStock,
          maximum_stock: maxStock,
          cost_per_unit: cost,
          description,
          is_active: isActive,
        });
      } else {
        await createIngredient({
          name,
          category_id: categoryId || null,
          unit,
          current_stock: initStock,
          minimum_stock: minStock,
          maximum_stock: maxStock,
          cost_per_unit: cost,
          description,
          is_active: isActive,
        });
      }

      setIsLoading(false);
      onSuccess();
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : '';
      setError(`Failed to save ingredient: ${msg || 'Please verify fields.'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {isEditing ? 'Edit Ingredient' : 'Add New Ingredient'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isEditing ? `Editing details for ${ingredient.name}` : 'Define new raw material stock item'}
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
          <Input
            label="Ingredient Name *"
            type="text"
            placeholder="e.g. Paneer, Onion, Cooking Oil..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 font-medium"
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Stock Unit *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as StockUnit)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-500 font-medium"
              >
                <option value="kg">kg (Kilograms)</option>
                <option value="g">g (Grams)</option>
                <option value="l">l (Litres)</option>
                <option value="ml">ml (Millilitres)</option>
                <option value="pcs">pcs (Pieces)</option>
                <option value="pack">pack (Packets)</option>
                <option value="box">box (Boxes)</option>
              </select>
            </div>
          </div>

          {!isEditing && (
            <Input
              label={`Initial Opening Stock (${unit})`}
              type="number"
              step="0.001"
              placeholder="0.00"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
            />
          )}

          {isEditing && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
              <span>Current Stock: </span>
              <span className="font-bold text-slate-900">{ingredient?.current_stock.toFixed(2)} {unit}</span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                To adjust current stock, use the <strong>Adjust Stock</strong> button from the inventory table.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Min Stock"
              type="number"
              step="0.01"
              value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
            />
            <Input
              label="Max Stock"
              type="number"
              step="0.01"
              value={maximumStock}
              onChange={(e) => setMaximumStock(e.target.value)}
            />
            <Input
              label="Cost / Unit (₹)"
              type="number"
              step="0.01"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
            />
          </div>

          <Input
            label="Description (Optional)"
            type="text"
            placeholder="e.g. Fresh dairy paneer blocks..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Active Ingredient
            </label>
          </div>

          <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
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
              {isEditing ? 'Save Changes' : 'Create Ingredient'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
