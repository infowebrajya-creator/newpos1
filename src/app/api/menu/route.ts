import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const [catsRes, itemsRes] = await Promise.all([
      supabase.from('menu_categories').select('*'),
      supabase.from('menu_items').select('*'),
    ]);

    const categories = catsRes.data || [];
    const rawItems = itemsRes.data || [];

    const menuItems = rawItems.map((item: any) => ({
      ...item,
      name: item.name || item.item_name || 'Unnamed Item',
      price: Number(item.price || 0),
      is_available: item.is_available !== false,
      is_veg: item.is_veg !== false,
    }));

    return Response.json({ categories, menuItems });
  } catch (err: any) {
    return Response.json({ categories: [], menuItems: [], error: err?.message || 'Server error' }, { status: 500 });
  }
}
