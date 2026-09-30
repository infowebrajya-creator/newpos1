import { createClient } from '@/lib/supabase/server';
import { Recipe, RecipeItem, RecipeWithItems } from '@/types/recipes';
import { Ingredient } from '@/types/inventory';
import { MenuItem } from '@/types/menu';
import { calculateRecipeCosting } from '@/services/recipes/recipeService';

/**
 * Fetch all configured recipes with recipe items and costing (Server Side)
 */
export async function getServerRecipes(): Promise<RecipeWithItems[]> {
  const supabase = await createClient();

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
