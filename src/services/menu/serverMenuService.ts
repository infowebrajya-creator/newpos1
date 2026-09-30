import { createClient } from '@/lib/supabase/server';
import { MenuCategory, MenuItem } from '@/types/menu';

/**
 * Fetch active menu categories ordered by sort_order (Server Side)
 */
export async function getServerMenuCategories(): Promise<MenuCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('menu_categories').select('*');

  if (error || !data) {
    return [];
  }

  return data as MenuCategory[];
}

/**
 * Fetch available menu items (Server Side)
 */
export async function getServerMenuItems(): Promise<MenuItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('menu_items').select('*');

  if (error || !data) {
    return [];
  }

  return data.map((item: any) => ({
    ...item,
    name: item.name || item.item_name || 'Unnamed Item',
    price: Number(item.price || 0),
    is_available: item.is_available !== false,
    is_veg: item.is_veg !== false,
  })) as MenuItem[];
}

/**
 * Fetch all menu categories (Server Side)
 */
export async function getServerAllMenuCategories(): Promise<MenuCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('menu_categories').select('*');

  if (error || !data) {
    return [];
  }

  return data as MenuCategory[];
}

/**
 * Fetch all menu items (Server Side)
 */
export async function getServerAllMenuItems(): Promise<MenuItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('menu_items').select('*');

  if (error || !data) {
    return [];
  }

  return data.map((item: any) => ({
    ...item,
    name: item.name || item.item_name || 'Unnamed Item',
    price: Number(item.price || 0),
    is_available: item.is_available !== false,
    is_veg: item.is_veg !== false,
  })) as MenuItem[];
}
