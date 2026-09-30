import { createClient } from '@/lib/supabase/server';
import { Customer } from '@/types/customers';

/**
 * Server-side helper to fetch customers
 */
export async function getServerCustomers(): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as Customer[];
}
