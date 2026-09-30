export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Reservation {
  id: string;
  reservation_number: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string | null;
  table_id: string;
  table_number?: string;
  floor_name?: string | null;
  reservation_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  status: ReservationStatus;
  notes?: string | null;
  created_by?: string | null;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  seated_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateReservationInput {
  customer_id: string;
  table_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  notes?: string | null;
}

export interface UpdateReservationInput {
  customer_id?: string;
  table_id?: string;
  reservation_date?: string;
  start_time?: string;
  end_time?: string;
  guest_count?: number;
  notes?: string | null;
}
