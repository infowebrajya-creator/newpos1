import { createClient } from '@/lib/supabase/client';
import { Recipe, RecipeItem, RecipeWithItems } from '@/types/recipes';
import { Ingredient } from '@/types/inventory';
import { MenuItem } from '@/types/menu';

/**
 * Calculate unit conversion factor between recipe item unit and ingredient stock unit
 */
export function getUnitConversionFactor(recipeUnit: string, stockUnit: string): number {
  const rUnit = recipeUnit.toLowerCase();
  const sUnit = stockUnit.toLowerCase();

  if (rUnit === sUnit) return 1.0;

  if (rUnit === 'g' && sUnit === 'kg') return 0.001;
  if (rUnit === 'kg' && sUnit === 'g') return 1000.0;

  if (rUnit === 'ml' && sUnit === 'l') return 0.001;
  if (rUnit === 'l' && sUnit === 'ml') return 1000.0;

  // Unsafe conversion check
  throw new Error(`Incompatible units between recipe (${recipeUnit}) and ingredient stock (${stockUnit})`);
}

/**
 * Calculate recipe cost, food cost %, and gross margin
 */
export function calculateRecipeCosting(
  items: RecipeItem[],
  ingredientsMap: Map<string, Ingredient>,
  menuItemPrice: number = 0
): { recipeCost: number; foodCostPercent: number; grossMargin: number; itemsWithCost: RecipeItem[] } {
  let recipeCost = 0;

  const itemsWithCost = items.map((item) => {
    const ing = ingredientsMap.get(item.ingredient_id);
    const costPerUnit = ing?.cost_per_unit || 0;
    const stockUnit = ing?.unit || item.unit;

    let itemCost = 0;
    try {
      const factor = getUnitConversionFactor(item.unit, stockUnit);
      const effectiveQty = item.quantity * (1 + (item.wastage_percent || 0) / 100) * factor;
      itemCost = effectiveQty * costPerUnit;
    } catch {
      itemCost = 0;
    }

    recipeCost += itemCost;

    return {
      ...item,
      ingredient_name: ing?.name || item.ingredient_name || 'Ingredient',
      ingredient_cost_per_unit: costPerUnit,
      ingredient_stock_unit: stockUnit,
      calculated_item_cost: itemCost,
    };
  });

  const foodCostPercent = menuItemPrice > 0 ? (recipeCost / menuItemPrice) * 100 : 0;
  const grossMargin = menuItemPrice - recipeCost;

  return {
    recipeCost,
    foodCostPercent,
    grossMargin,
    itemsWithCost,
  };
}

/**
 * Fetch all configured recipes with recipe items and costing
 */
export async function getRecipes(): Promise<RecipeWithItems[]> {
  const supabase = createClient();

  const [recipesRes, recipeItemsRes, menuItemsRes, ingredientsRes] = await Promise.all([
    supabase.from('recipes').select('*').eq('is_active', true),
    supabase.from('recipe_items').select('*'),
    supabase.from('menu_items').select('*'),
    supabase.from('ingredients').select('*'),
  ]);

  if (recipesRes.error || !recipesRes.data) {
    return [];
  }

  const recipeItemsMap = new Map<string, RecipeItem[]>();
  (recipeItemsRes.data || []).forEach((ri) => {
    if (!recipeItemsMap.has(ri.recipe_id)) {
      recipeItemsMap.set(ri.recipe_id, []);
    }
    recipeItemsMap.get(ri.recipe_id)!.push(ri);
  });

  const menuItemMap = new Map<string, MenuItem>();
  (menuItemsRes.data || []).forEach((mi) => menuItemMap.set(mi.id, mi));

  const ingredientMap = new Map<string, Ingredient>();
  (ingredientsRes.data || []).forEach((ing) => ingredientMap.set(ing.id, ing));

  return (recipesRes.data as Recipe[]).map((recipe) => {
    const rawItems = recipeItemsMap.get(recipe.id) || [];
    const menuItem = menuItemMap.get(recipe.menu_item_id);

    const price = menuItem?.price || 0;
    const { recipeCost, foodCostPercent, grossMargin, itemsWithCost } = calculateRecipeCosting(
      rawItems,
      ingredientMap,
      price
    );

    return {
      ...recipe,
      menu_item_name: menuItem?.name || menuItem?.item_name || 'Menu Item',
      menu_item_price: price,
      items: itemsWithCost,
      recipe_cost: recipeCost,
      food_cost_percent: foodCostPercent,
      gross_margin: grossMargin,
    };
  });
}

/**
 * Fetch recipe for a specific menu item
 */
export async function getRecipeForMenuItem(menuItemId: string): Promise<RecipeWithItems | null> {
  const recipes = await getRecipes();
  return recipes.find((r) => r.menu_item_id === menuItemId) || null;
}

/**
 * Create or update a recipe with its ingredient items
 */
export async function saveRecipe(
  recipeData: Partial<Recipe>,
  items: Array<{ ingredient_id: string; quantity: number; unit: string; wastage_percent: number }>
): Promise<string> {
  const supabase = createClient();

  if (!recipeData.menu_item_id) {
    throw new Error('Menu item ID is required to create a recipe');
  }

  if (items.length === 0) {
    throw new Error('Recipe must contain at least one ingredient');
  }

  // Check if recipe already exists for menu item
  const { data: existing } = await supabase
    .from('recipes')
    .select('id')
    .eq('menu_item_id', recipeData.menu_item_id)
    .maybeSingle();

  let recipeId = existing?.id;

  if (recipeId) {
    await supabase
      .from('recipes')
      .update({
        name: recipeData.name?.trim(),
        description: recipeData.description?.trim() || null,
        yield_quantity: recipeData.yield_quantity || 1,
        yield_unit: recipeData.yield_unit || 'portion',
        is_active: recipeData.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recipeId);

    // Replace recipe items
    await supabase.from('recipe_items').delete().eq('recipe_id', recipeId);
  } else {
    const { data: newRecipe, error } = await supabase
      .from('recipes')
      .insert([
        {
          menu_item_id: recipeData.menu_item_id,
          name: recipeData.name?.trim() || 'Recipe',
          description: recipeData.description?.trim() || null,
          yield_quantity: recipeData.yield_quantity || 1,
          yield_unit: recipeData.yield_unit || 'portion',
          is_active: recipeData.is_active ?? true,
        },
      ])
      .select('id')
      .single();

    if (error || !newRecipe) {
      throw new Error(error?.message || 'Failed to create recipe');
    }
    recipeId = newRecipe.id;
  }

  // Insert recipe items
  const itemsToInsert = items.map((i) => ({
    recipe_id: recipeId,
    ingredient_id: i.ingredient_id,
    quantity: i.quantity,
    unit: i.unit,
    wastage_percent: i.wastage_percent || 0,
  }));

  const { error: itemsErr } = await supabase.from('recipe_items').insert(itemsToInsert);

  if (itemsErr) {
    throw new Error(itemsErr.message);
  }

  return recipeId;
}

/**
 * Process automatic inventory consumption for a paid bill using process_bill_inventory_consumption RPC
 */
export async function processBillInventoryConsumption(billId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('process_bill_inventory_consumption', {
    p_bill_id: billId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return !!data;
}
