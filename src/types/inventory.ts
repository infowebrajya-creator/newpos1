export type StockUnit = 'kg' | 'g' | 'l' | 'ml' | 'pcs' | 'pack' | 'box';

export type InventoryTransactionType =
  | 'opening_stock'
  | 'purchase'
  | 'adjustment'
  | 'wastage'
  | 'transfer_in'
  | 'transfer_out'
  | 'consumption';

export type StockStatus = 'healthy' | 'low_stock' | 'out_of_stock';

export interface IngredientCategory {
  id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Ingredient {
  id: string;
  category_id?: string | null;
  category_name?: string | null;
  name: string;
  description?: string | null;
  unit: StockUnit | string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  cost_per_unit: number;
  is_active: boolean;
  stock_status?: StockStatus;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryTransaction {
  id: string;
  ingredient_id: string;
  ingredient_name?: string;
  unit?: string;
  transaction_type: InventoryTransactionType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason?: string | null;
  performed_by?: string | null;
  created_at: string;
}

export interface InventorySummary {
  totalIngredients: number;
  healthyCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
}
