import { createClient } from '@/lib/supabase/client';
import {
  Ingredient,
  IngredientCategory,
  InventoryTransaction,
  InventoryTransactionType,
  InventorySummary,
  StockStatus,
} from '@/types/inventory';

/**
 * Fetch ingredient categories
 */
export async function getIngredientCategories(): Promise<IngredientCategory[]> {
  const supabase = createClient();
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
 * Create an ingredient category
 */
export async function createIngredientCategory(
  category: Partial<IngredientCategory>
): Promise<IngredientCategory> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ingredient_categories')
    .insert([
      {
        name: category.name?.trim(),
        description: category.description?.trim() || null,
        is_active: category.is_active ?? true,
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create category');
  }

  return data as IngredientCategory;
}

/**
 * Fetch all active ingredients with calculated stock status
 */
export async function getIngredients(): Promise<Ingredient[]> {
  const supabase = createClient();

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
 * Create a new ingredient
 */
export async function createIngredient(ingredient: Partial<Ingredient>): Promise<Ingredient> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ingredients')
    .insert([
      {
        category_id: ingredient.category_id || null,
        name: ingredient.name?.trim(),
        description: ingredient.description?.trim() || null,
        unit: ingredient.unit || 'kg',
        current_stock: ingredient.current_stock || 0,
        minimum_stock: ingredient.minimum_stock || 0,
        maximum_stock: ingredient.maximum_stock || 0,
        cost_per_unit: ingredient.cost_per_unit || 0,
        is_active: ingredient.is_active ?? true,
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create ingredient');
  }

  // Record opening stock transaction if stock > 0
  if (ingredient.current_stock && ingredient.current_stock > 0) {
    try {
      await adjustStock(data.id, ingredient.current_stock, 'opening_stock', 'Initial Opening Stock');
    } catch {
      // Ignore if RPC missing during seed
    }
  }

  return data as Ingredient;
}

/**
 * Update an existing ingredient details (does not change current_stock directly)
 */
export async function updateIngredient(
  ingredientId: string,
  updates: Partial<Ingredient>
): Promise<Ingredient> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ingredients')
    .update({
      category_id: updates.category_id || null,
      name: updates.name?.trim(),
      description: updates.description?.trim() || null,
      unit: updates.unit,
      minimum_stock: updates.minimum_stock,
      maximum_stock: updates.maximum_stock,
      cost_per_unit: updates.cost_per_unit,
      is_active: updates.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ingredientId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update ingredient');
  }

  return data as Ingredient;
}

/**
 * Atomic stock adjustment via adjust_ingredient_stock RPC
 */
export async function adjustStock(
  ingredientId: string,
  quantity: number,
  transactionType: InventoryTransactionType,
  reason?: string
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('adjust_ingredient_stock', {
    p_ingredient_id: ingredientId,
    p_quantity: quantity,
    p_transaction_type: transactionType,
    p_reason: reason?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

/**
 * Fetch inventory transactions history
 */
export async function getInventoryTransactions(): Promise<InventoryTransaction[]> {
  const supabase = createClient();

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
 * Calculate high-level summary of inventory stock and valuation
 */
export async function getInventorySummary(): Promise<InventorySummary> {
  const ingredients = await getIngredients();

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
