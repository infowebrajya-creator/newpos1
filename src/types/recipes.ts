import { StockUnit } from '@/types/inventory';

export interface Recipe {
  id: string;
  menu_item_id: string;
  name: string;
  description?: string | null;
  yield_quantity: number;
  yield_unit: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  ingredient_name?: string;
  ingredient_cost_per_unit?: number;
  ingredient_stock_unit?: string;
  quantity: number;
  unit: StockUnit | string;
  wastage_percent: number;
  calculated_item_cost?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RecipeWithItems extends Recipe {
  menu_item_name?: string;
  menu_item_price?: number;
  items: RecipeItem[];
  recipe_cost?: number;
  food_cost_percent?: number;
  gross_margin?: number;
}

export interface InventoryConsumption {
  id: string;
  bill_id: string;
  status: 'completed' | 'failed' | string;
  consumed_by?: string | null;
  created_at: string;
}
