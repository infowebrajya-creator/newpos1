import { createClient } from '@/lib/supabase/server';
import { Supplier } from '@/types/purchases';

/**
 * Server-side helper to fetch all active suppliers
 */
export async function getServerSuppliers(): Promise<Supplier[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as Supplier[];
}
