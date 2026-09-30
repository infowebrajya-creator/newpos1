export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active: boolean;
  total_reservations_count?: number;
  total_visits_count?: number;
  last_visit_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface CustomerVisitHistory {
  session_id: string;
  table_number: string;
  opened_at: string;
  closed_at?: string | null;
  guest_count: number;
  bill_number?: string | number | null;
  grand_total?: number | null;
  payment_status?: string | null;
}
