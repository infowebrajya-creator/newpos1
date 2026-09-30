import { createClient } from '@/lib/supabase/client';
import {
  Reservation,
  CreateReservationInput,
  ReservationStatus,
} from '@/types/reservations';

/**
 * Fetch reservations with customer, table, and floor details
 */
export async function getReservations(
  selectedDate?: string,
  statusFilter?: ReservationStatus | 'all',
  searchQuery?: string
): Promise<Reservation[]> {
  const supabase = createClient();

  let query = supabase.from('reservations').select('*').order('start_time', { ascending: true });

  if (selectedDate) {
    query = query.eq('reservation_date', selectedDate);
  }

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const [resData, custData, tablesData, floorsData] = await Promise.all([
    query,
    supabase.from('customers').select('id, name, phone'),
    supabase.from('restaurant_tables').select('id, table_number, floor_id, capacity'),
    supabase.from('floors').select('id, name'),
  ]);

  if (resData.error || !resData.data) {
    return [];
  }

  const custMap = new Map<string, { name: string; phone: string | null }>();
  (custData.data || []).forEach((c) => custMap.set(c.id, { name: c.name, phone: c.phone }));

  const floorMap = new Map<string, string>();
  (floorsData.data || []).forEach((f) => floorMap.set(f.id, f.name));

  const tableMap = new Map<string, { number: string; floor_name: string | null }>();
  (tablesData.data || []).forEach((t) => {
    tableMap.set(t.id, {
      number: t.table_number,
      floor_name: t.floor_id ? floorMap.get(t.floor_id) || null : null,
    });
  });

  const rawList = (resData.data as Reservation[]).map((r) => {
    const cust = custMap.get(r.customer_id);
    const table = tableMap.get(r.table_id);
    return {
      ...r,
      customer_name: cust?.name || 'Unknown Customer',
      customer_phone: cust?.phone || null,
      table_number: table?.number || 'T-?',
      floor_name: table?.floor_name || null,
    };
  });

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    return rawList.filter(
      (r) =>
        r.reservation_number.toLowerCase().includes(q) ||
        (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
        (r.customer_phone && r.customer_phone.includes(q)) ||
        (r.table_number && r.table_number.toLowerCase().includes(q))
    );
  }

  return rawList;
}

/**
 * Create a new reservation via create_reservation RPC
 */
export async function createReservation(input: CreateReservationInput): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('create_reservation', {
    p_customer_id: input.customer_id,
    p_table_id: input.table_id,
    p_reservation_date: input.reservation_date,
    p_start_time: input.start_time,
    p_end_time: input.end_time,
    p_guest_count: input.guest_count,
    p_notes: input.notes?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

/**
 * Confirm a reservation via confirm_reservation RPC
 */
export async function confirmReservation(reservationId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('confirm_reservation', {
    p_reservation_id: reservationId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return !!data;
}

/**
 * Cancel a reservation via cancel_reservation RPC
 */
export async function cancelReservation(
  reservationId: string,
  cancellationReason?: string
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('cancel_reservation', {
    p_reservation_id: reservationId,
    p_reason: cancellationReason?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Audit Log Entry
  try {
    await supabase.from('audit_logs').insert({
      action: 'CANCEL_RESERVATION',
      entity_type: 'reservation',
      entity_id: reservationId,
      reason: cancellationReason?.trim() || 'Reservation cancelled',
      created_at: new Date().toISOString(),
    });
  } catch (auditErr) {
    // Non-blocking audit error
  }

  return !!data;
}

/**
 * Mark a reservation as no-show via mark_reservation_no_show RPC
 */
export async function markReservationNoShow(reservationId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('mark_reservation_no_show', {
    p_reservation_id: reservationId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return !!data;
}

/**
 * Atomically seat a customer and open a table session via seat_reservation RPC
 */
export async function seatReservation(reservationId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('seat_reservation', {
    p_reservation_id: reservationId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}
