export interface MenuCategory {
  id: string;
  name: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MenuItem {
  id: string;
  category_id?: string | null;
  category?: string | null;
  name?: string | null;
  item_name?: string | null;
  description?: string | null;
  price: number;
  image_url?: string | null;
  image?: string | null;
  is_available: boolean;
  sort_order?: number;
  is_veg?: boolean | null;
  is_bestseller?: boolean | null;
  is_chef_special?: boolean | null;
  spiciness?: number | string | null;
  rating?: number | null;
  rating_count?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  menuItemId: string;
  itemName: string;
  name?: string;
  item_name?: string;
  unitPrice: number;
  quantity: number;
  itemNote?: string;
  isComplimentary?: boolean;
  isVeg?: boolean;
}

export interface BatchOrderItemInput {
  menu_item_id: string;
  quantity: number;
  item_note?: string | null;
  is_complimentary?: boolean;
}
