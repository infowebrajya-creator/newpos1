import {
  getServerIngredients,
  getServerIngredientCategories,
  getServerInventoryTransactions,
  getServerInventorySummary,
} from '@/services/inventory/serverInventoryService';
import { InventoryView } from '@/features/inventory/components/InventoryView';

export const metadata = {
  title: 'Inventory - WebRajya POS',
  description: 'Ingredient stock management, raw material control, and wastage tracking',
};

export default async function InventoryPage() {
  const [ingredients, categories, transactions, summary] = await Promise.all([
    getServerIngredients(),
    getServerIngredientCategories(),
    getServerInventoryTransactions(),
    getServerInventorySummary(),
  ]);

  return (
    <InventoryView
      initialIngredients={ingredients}
      initialCategories={categories}
      initialTransactions={transactions}
      initialSummary={summary}
    />
  );
}
