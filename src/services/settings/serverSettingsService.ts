import { createClient } from '@/lib/supabase/server';
import { RestaurantSettings } from '@/types';

/**
 * Retrieve the single restaurant settings record from public.restaurant_settings (Server Side)
 */
export async function getServerRestaurantSettings(): Promise<RestaurantSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('restaurant_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as RestaurantSettings;
}
