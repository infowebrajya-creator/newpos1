import { getServerMenuItems } from '@/services/menu/serverMenuService';
import { getServerRecipes } from '@/services/recipes/serverRecipeService';
import { getServerIngredients } from '@/services/inventory/serverInventoryService';
import { RecipesView } from '@/features/recipes/components/RecipesView';

export const metadata = {
  title: 'Recipes & Costing - WebRajya POS',
  description: 'Manage menu item recipes, raw material ingredient mapping, and food cost analysis',
};

export default async function RecipesPage() {
  const [menuItems, recipes, ingredients] = await Promise.all([
    getServerMenuItems(),
    getServerRecipes(),
    getServerIngredients(),
  ]);

  return (
    <RecipesView
      menuItems={menuItems}
      recipes={recipes}
      ingredients={ingredients}
    />
  );
}
