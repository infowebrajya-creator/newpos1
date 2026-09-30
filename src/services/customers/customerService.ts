import { createClient } from '@/lib/supabase/client';
import { Customer, CreateCustomerInput, CustomerVisitHistory } from '@/types/customers';

/**
 * Fetch all customers with calculated stats (reservation count, visit count, last visit date)
 */
export async function getCustomers(searchQuery?: string): Promise<Customer[]> {
  const supabase = createClient();

  let query = supabase.from('customers').select('*').order('name', { ascending: true });

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim();
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const [custRes, resRes, sessionsRes] = await Promise.all([
    query,
    supabase.from('reservations').select('id, customer_id, created_at'),
    supabase.from('table_sessions').select('id, customer_id, opened_at'),
  ]);

  if (custRes.error || !custRes.data) {
    return [];
  }

  const resCountMap = new Map<string, number>();
  (resRes.data || []).forEach((r) => {
    resCountMap.set(r.customer_id, (resCountMap.get(r.customer_id) || 0) + 1);
  });

  const visitStatsMap = new Map<string, { count: number; lastDate: string | null }>();
  (sessionsRes.data || []).forEach((s) => {
    if (s.customer_id) {
      const existing = visitStatsMap.get(s.customer_id) || { count: 0, lastDate: null };
      const newCount = existing.count + 1;
      let newLastDate = existing.lastDate;

      if (!newLastDate || new Date(s.opened_at) > new Date(newLastDate)) {
        newLastDate = s.opened_at;
      }

      visitStatsMap.set(s.customer_id, { count: newCount, lastDate: newLastDate });
    }
  });

  return (custRes.data as Customer[]).map((c) => {
    const visitStats = visitStatsMap.get(c.id) || { count: 0, lastDate: null };
    return {
      ...c,
      total_reservations_count: resCountMap.get(c.id) || 0,
      total_visits_count: visitStats.count,
      last_visit_date: visitStats.lastDate,
    };
  });
}

/**
 * Fetch customer by ID with full visit and reservation history
 */
export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Customer;
}

/**
 * Fetch customer visit & order history derived from table_sessions and bills
 */
export async function getCustomerVisitHistory(
  customerId: string
): Promise<CustomerVisitHistory[]> {
  const supabase = createClient();

  const [sessionsRes, tablesRes] = await Promise.all([
    supabase
      .from('table_sessions')
      .select('*')
      .eq('customer_id', customerId)
      .order('opened_at', { ascending: false }),
    supabase.from('restaurant_tables').select('id, table_number'),
  ]);

  if (sessionsRes.error || !sessionsRes.data) {
    return [];
  }

  const tableMap = new Map<string, string>();
  (tablesRes.data || []).forEach((t) => tableMap.set(t.id, t.table_number));

  const sessionIds = sessionsRes.data.map((s) => s.id);
  let billsMap = new Map<string, { bill_number: string | number; grand_total: number; status: string }>();

  if (sessionIds.length > 0) {
    const { data: billsData } = await supabase
      .from('bills')
      .select('table_session_id, bill_number, grand_total, status')
      .in('table_session_id', sessionIds);

    if (billsData) {
      billsData.forEach((b) => {
        billsMap.set(b.table_session_id, {
          bill_number: b.bill_number,
          grand_total: b.grand_total,
          status: b.status,
        });
      });
    }
  }

  return sessionsRes.data.map((s) => {
    const bill = billsMap.get(s.id);
    return {
      session_id: s.id,
      table_number: tableMap.get(s.table_id) || 'T-?',
      opened_at: s.opened_at,
      closed_at: s.closed_at,
      guest_count: s.guest_count,
      bill_number: bill?.bill_number || null,
      grand_total: bill?.grand_total || null,
      payment_status: bill?.status || null,
    };
  });
}

/**
 * Create a new customer record
 */
export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const supabase = createClient();

  if (!input.name || !input.name.trim()) {
    throw new Error('Customer name is required');
  }

  const trimmedPhone = input.phone?.trim() || null;
  const trimmedEmail = input.email?.trim() || null;

  // Check existing phone duplicate helper (warn or return existing if needed)
  if (trimmedPhone) {
    const { data: existingPhone } = await supabase
      .from('customers')
      .select('id, name')
      .eq('phone', trimmedPhone)
      .maybeSingle();

    if (existingPhone) {
      console.info(`Notice: Customer phone ${trimmedPhone} matches existing customer "${existingPhone.name}"`);
    }
  }

  const { data, error } = await supabase
    .from('customers')
    .insert([
      {
        name: input.name.trim(),
        phone: trimmedPhone,
        email: trimmedEmail,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        is_active: input.is_active ?? true,
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create customer');
  }

  return data as Customer;
}

/**
 * Update customer information or active status
 */
export async function updateCustomer(
  customerId: string,
  updates: Partial<CreateCustomerInput>
): Promise<Customer> {
  const supabase = createClient();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.phone !== undefined) updatePayload.phone = updates.phone?.trim() || null;
  if (updates.email !== undefined) updatePayload.email = updates.email?.trim() || null;
  if (updates.address !== undefined) updatePayload.address = updates.address?.trim() || null;
  if (updates.notes !== undefined) updatePayload.notes = updates.notes?.trim() || null;
  if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;

  const { data, error } = await supabase
    .from('customers')
    .update(updatePayload)
    .eq('id', customerId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update customer');
  }

  return data as Customer;
}
