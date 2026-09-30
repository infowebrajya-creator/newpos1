import { createClient } from '@/lib/supabase/server';
import { Purchase } from '@/types/purchases';

/**
 * Server-side helper to fetch recent purchases
 */
export async function getServerPurchases(): Promise<Purchase[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  return data as Purchase[];
}
