import { createClient } from '@/lib/supabase/server';
import { Reservation } from '@/types/reservations';

/**
 * Server-side helper to fetch today's reservations
 */
export async function getServerTodayReservations(): Promise<Reservation[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('reservation_date', today)
    .order('start_time', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as Reservation[];
}
