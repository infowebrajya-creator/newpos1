'use client';

import React, { useState } from 'react';
import { MenuItem } from '@/types/menu';
import { Ingredient } from '@/types/inventory';
import { RecipeWithItems } from '@/types/recipes';
import { saveRecipe, calculateRecipeCosting, getUnitConversionFactor } from '@/services/recipes/recipeService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, BookOpen, Plus, Trash2, AlertCircle, DollarSign, PieChart, TrendingUp } from 'lucide-react';

interface RecipeModalProps {
  menuItem: MenuItem;
  existingRecipe?: RecipeWithItems | null;
  ingredients: Ingredient[];
  onClose: () => void;
  onSuccess: () => void;
}

interface DraftRecipeItem {
  ingredient_id: string;
  quantity: number;
  unit: string;
  wastage_percent: number;
}

export function RecipeModal({
  menuItem,
  existingRecipe,
  ingredients,
  onClose,
  onSuccess,
}: RecipeModalProps) {
  const [recipeName, setRecipeName] = useState<string>(
    existingRecipe?.name || `Recipe for ${menuItem.name || menuItem.item_name}`
  );
  const [description, setDescription] = useState<string>(existingRecipe?.description || '');
  const [yieldQuantity, setYieldQuantity] = useState<string>(
    existingRecipe?.yield_quantity?.toString() || '1'
  );
  const [yieldUnit, setYieldUnit] = useState<string>(existingRecipe?.yield_unit || 'portion');

  const [items, setItems] = useState<DraftRecipeItem[]>(
    existingRecipe?.items.map((i) => ({
      ingredient_id: i.ingredient_id,
      quantity: i.quantity,
      unit: i.unit,
      wastage_percent: i.wastage_percent || 0,
    })) || []
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const menuItemName = menuItem.name || menuItem.item_name || 'Menu Item';
  const menuItemPrice = menuItem.price || 0;

  const ingMap = new Map<string, Ingredient>();
  ingredients.forEach((ing) => ingMap.set(ing.id, ing));

  // Live costing calculation
  const costing = calculateRecipeCosting(
    items.map((i) => ({
      id: '',
      recipe_id: '',
      ingredient_id: i.ingredient_id,
      quantity: i.quantity,
      unit: i.unit,
      wastage_percent: i.wastage_percent,
    })),
    ingMap,
    menuItemPrice
  );

  const handleAddItem = () => {
    if (ingredients.length === 0) return;
    const defaultIng = ingredients[0];
    setItems((prev) => [
      ...prev,
      {
        ingredient_id: defaultIng.id,
        quantity: 1,
        unit: defaultIng.unit || 'kg',
        wastage_percent: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (
    index: number,
    field: keyof DraftRecipeItem,
    value: string | number
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError('Recipe must contain at least one ingredient item.');
      return;
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.ingredient_id) {
        setError(`Item #${i + 1}: Please select an ingredient.`);
        return;
      }
      if (item.quantity <= 0) {
        setError(`Item #${i + 1}: Quantity must be greater than 0.`);
        return;
      }
      if (item.wastage_percent < 0 || item.wastage_percent >= 100) {
        setError(`Item #${i + 1}: Wastage percentage must be between 0% and 99%.`);
        return;
      }

      // Check unit compatibility
      const ing = ingMap.get(item.ingredient_id);
      if (ing) {
        try {
          getUnitConversionFactor(item.unit, ing.unit);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : '';
          setError(`Item #${i + 1} (${ing.name}): ${msg}`);
          return;
        }
      }
    }

    try {
      setIsLoading(true);
      await saveRecipe(
        {
          menu_item_id: menuItem.id,
          name: recipeName,
          description,
          yield_quantity: parseFloat(yieldQuantity) || 1,
          yield_unit: yieldUnit,
          is_active: true,
        },
        items
      );
      setIsLoading(false);
      onSuccess();
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : '';
      setError(`Failed to save recipe: ${msg || 'Please try again.'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Recipe Configuration
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Menu Item: <span className="text-slate-900 font-bold">{menuItemName}</span> (Price: ₹{menuItemPrice.toFixed(2)})
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

        {/* Live Costing Summary Cards */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold block">
              Estimated Recipe Cost
            </span>
            <span className="text-base font-bold text-slate-900">
              ₹ {costing.recipeCost.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold block">
              Food Cost %
            </span>
            <span className={`text-base font-bold ${costing.foodCostPercent > 35 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {costing.foodCostPercent.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-bold block">
              Gross Margin
            </span>
            <span className="text-base font-bold text-slate-900">
              ₹ {costing.grossMargin.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Recipe Name *"
              type="text"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              required
            />
            <Input
              label="Yield Quantity / Unit"
              type="text"
              placeholder="e.g. 1 portion"
              value={`${yieldQuantity} ${yieldUnit}`}
              onChange={(e) => {
                const parts = e.target.value.split(' ');
                setYieldQuantity(parts[0] || '1');
                setYieldUnit(parts[1] || 'portion');
              }}
            />
          </div>

          {/* Recipe Ingredients List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Recipe Ingredients ({items.length})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ingredient</span>
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const ing = ingMap.get(item.ingredient_id);
                const itemCost = costing.itemsWithCost[idx]?.calculated_item_cost || 0;

                return (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs"
                  >
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Ingredient</label>
                        <select
                          value={item.ingredient_id}
                          onChange={(e) => handleUpdateItem(idx, 'ingredient_id', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500 font-medium"
                        >
                          {ingredients.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name} ({g.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Qty & Unit</label>
                        <div className="flex space-x-1">
                          <input
                            type="number"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 font-medium"
                          />
                          <select
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                            className="w-16 bg-white border border-slate-300 rounded-lg px-1 py-1.5 text-xs text-slate-900 font-medium"
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
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Wastage %</label>
                        <input
                          type="number"
                          step="0.1"
                          value={item.wastage_percent}
                          onChange={(e) => handleUpdateItem(idx, 'wastage_percent', parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 font-medium"
                        />
                      </div>

                      <div className="col-span-2 flex items-center justify-end space-x-1.5 pt-4">
                        <span className="font-bold text-slate-900 text-xs">
                          ₹{itemCost.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
              Save Recipe
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
