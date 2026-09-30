import { createClient } from '@/lib/supabase/server';
import {
  Ingredient,
  IngredientCategory,
  InventoryTransaction,
  InventorySummary,
  StockStatus,
} from '@/types/inventory';

/**
 * Fetch ingredient categories (Server Side)
 */
export async function getServerIngredientCategories(): Promise<IngredientCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ingredient_categories')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as IngredientCategory[];
}

/**
 * Fetch all ingredients with stock status (Server Side)
 */
export async function getServerIngredients(): Promise<Ingredient[]> {
  const supabase = await createClient();

  const [ingredientsRes, categoriesRes] = await Promise.all([
    supabase.from('ingredients').select('*').order('name', { ascending: true }),
    supabase.from('ingredient_categories').select('*'),
  ]);

  if (ingredientsRes.error || !ingredientsRes.data) {
    return [];
  }

  const categoryMap = new Map<string, string>();
  (categoriesRes.data || []).forEach((cat) => categoryMap.set(cat.id, cat.name));

  return (ingredientsRes.data as Ingredient[]).map((ing) => {
    let stockStatus: StockStatus = 'healthy';
    if (ing.current_stock <= 0) {
      stockStatus = 'out_of_stock';
    } else if (ing.current_stock <= ing.minimum_stock) {
      stockStatus = 'low_stock';
    }

    return {
      ...ing,
      category_name: ing.category_id ? categoryMap.get(ing.category_id) || null : null,
      stock_status: stockStatus,
    };
  });
}

/**
 * Fetch inventory transactions history (Server Side)
 */
export async function getServerInventoryTransactions(): Promise<InventoryTransaction[]> {
  const supabase = await createClient();

  const [txRes, ingRes] = await Promise.all([
    supabase.from('inventory_transactions').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('ingredients').select('id, name, unit'),
  ]);

  if (txRes.error || !txRes.data) {
    return [];
  }

  const ingMap = new Map<string, { name: string; unit: string }>();
  (ingRes.data || []).forEach((i) => ingMap.set(i.id, { name: i.name, unit: i.unit }));

  return (txRes.data as InventoryTransaction[]).map((tx) => {
    const ing = ingMap.get(tx.ingredient_id);
    return {
      ...tx,
      ingredient_name: ing?.name || 'Unknown Ingredient',
      unit: ing?.unit || 'unit',
    };
  });
}

/**
 * Get high-level inventory summary (Server Side)
 */
export async function getServerInventorySummary(): Promise<InventorySummary> {
  const ingredients = await getServerIngredients();

  const summary: InventorySummary = {
    totalIngredients: ingredients.length,
    healthyCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalValue: 0,
  };

  ingredients.forEach((ing) => {
    if (ing.is_active) {
      summary.totalValue += (ing.current_stock || 0) * (ing.cost_per_unit || 0);

      if (ing.current_stock <= 0) {
        summary.outOfStockCount++;
      } else if (ing.current_stock <= ing.minimum_stock) {
        summary.lowStockCount++;
      } else {
        summary.healthyCount++;
      }
    }
  });

  return summary;
}
