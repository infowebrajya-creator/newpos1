import { createClient } from '@/lib/supabase/client';
import { MenuCategory, MenuItem } from '@/types/menu';

/**
 * Fetch active menu categories ordered by sort_order
 */
export async function getMenuCategories(): Promise<MenuCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('menu_categories').select('*');

  if (error || !data) {
    return [];
  }

  return data as MenuCategory[];
}

/**
 * Fetch all menu categories (including inactive)
 */
export async function getAllMenuCategories(): Promise<MenuCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('menu_categories').select('*');

  if (!error && data && data.length > 0) {
    return data as MenuCategory[];
  }

  // Fallback to server API endpoint
  try {
    const res = await fetch('/api/menu');
    if (res.ok) {
      const json = await res.json();
      if (json.categories && json.categories.length > 0) {
        return json.categories as MenuCategory[];
      }
    }
  } catch {
    // Ignore fetch error
  }

  return (data || []) as MenuCategory[];
}

/**
 * Fetch available menu items
 */
export async function getMenuItems(): Promise<MenuItem[]> {
  return getAllMenuItems();
}

/**
 * Fetch ALL menu items (including unavailable)
 */
export async function getAllMenuItems(): Promise<MenuItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('menu_items').select('*');

  if (!error && data && data.length > 0) {
    return data.map((item: any) => ({
      ...item,
      name: item.name || item.item_name || 'Unnamed Item',
      price: Number(item.price || 0),
      is_available: item.is_available !== false,
      is_veg: item.is_veg !== false,
    })) as MenuItem[];
  }

  // Fallback to server API endpoint
  try {
    const res = await fetch('/api/menu');
    if (res.ok) {
      const json = await res.json();
      if (json.menuItems && json.menuItems.length > 0) {
        return json.menuItems as MenuItem[];
      }
    }
  } catch {
    // Ignore fetch error
  }

  return (data || []).map((item: any) => ({
    ...item,
    name: item.name || item.item_name || 'Unnamed Item',
    price: Number(item.price || 0),
    is_available: item.is_available !== false,
    is_veg: item.is_veg !== false,
  })) as MenuItem[];
}

/**
 * Fetch available menu items by category ID
 */
export async function getMenuItemsByCategory(categoryId: string): Promise<MenuItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('category_id', categoryId);

  if (error || !data) {
    const all = await getAllMenuItems();
    return all.filter((i) => i.category_id === categoryId);
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
 * Toggle menu item availability
 */
export async function toggleMenuItemAvailability(
  itemId: string,
  isAvailable: boolean
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
    .eq('id', itemId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Create a new menu item
 */
export async function createMenuItem(
  item: Partial<MenuItem>
): Promise<MenuItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_items')
    .insert([
      {
        name: item.name || item.item_name || 'New Item',
        item_name: item.item_name || item.name || 'New Item',
        category_id: item.category_id || null,
        category: item.category || null,
        description: item.description || null,
        price: Number(item.price || 0),
        image_url: item.image_url || item.image || null,
        image: item.image || item.image_url || null,
        is_available: item.is_available !== false,
        is_veg: item.is_veg ?? true,
        is_bestseller: !!item.is_bestseller,
        is_chef_special: !!item.is_chef_special,
        spiciness: item.spiciness || 0,
        sort_order: item.sort_order || 0,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create menu item');
  }

  return data as MenuItem;
}

/**
 * Update an existing menu item
 */
export async function updateMenuItem(
  itemId: string,
  updates: Partial<MenuItem>
): Promise<MenuItem> {
  const supabase = createClient();
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    payload.name = updates.name;
    payload.item_name = updates.name;
  }
  if (updates.item_name !== undefined) {
    payload.item_name = updates.item_name;
    payload.name = updates.item_name;
  }
  if (updates.category_id !== undefined) payload.category_id = updates.category_id;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.price !== undefined) payload.price = Number(updates.price);
  if (updates.image_url !== undefined) {
    payload.image_url = updates.image_url;
    payload.image = updates.image_url;
  }
  if (updates.image !== undefined) {
    payload.image = updates.image;
    payload.image_url = updates.image;
  }
  if (updates.is_available !== undefined) payload.is_available = updates.is_available;
  if (updates.is_veg !== undefined) payload.is_veg = updates.is_veg;
  if (updates.is_bestseller !== undefined) payload.is_bestseller = updates.is_bestseller;
  if (updates.is_chef_special !== undefined) payload.is_chef_special = updates.is_chef_special;
  if (updates.spiciness !== undefined) payload.spiciness = updates.spiciness;
  if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;

  const { data, error } = await supabase
    .from('menu_items')
    .update(payload)
    .eq('id', itemId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update menu item');
  }

  return data as MenuItem;
}

/**
 * Delete / soft-disable a menu item
 */
export async function deleteMenuItem(itemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Create a new category
 */
export async function createMenuCategory(
  category: Partial<MenuCategory>
): Promise<MenuCategory> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_categories')
    .insert([
      {
        name: category.name || 'New Category',
        description: category.description || null,
        sort_order: category.sort_order || 0,
        is_active: category.is_active !== false,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create category');
  }

  return data as MenuCategory;
}

/**
 * Update an existing category
 */
export async function updateMenuCategory(
  categoryId: string,
  updates: Partial<MenuCategory>
): Promise<MenuCategory> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('menu_categories')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', categoryId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update category');
  }

  return data as MenuCategory;
}
