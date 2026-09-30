export type TableStatus =
  | 'available'
  | 'occupied'
  | 'bill_requested'
  | 'payment_pending'
  | 'reserved'
  | 'out_of_service';

export interface Floor {
  id: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RestaurantTable {
  id: string;
  floor_id?: string | null;
  table_number: string;
  capacity: number;
  status: TableStatus;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TableSession {
  id: string;
  table_id: string;
  customer_id?: string | null;
  session_number?: number | string;
  guest_count: number;
  status: 'open' | 'closed' | string;
  opened_by?: string | null;
  opened_at: string;
  closed_by?: string | null;
  closed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ActiveOrderInfo {
  order_id: string;
  order_number?: string | number;
  total_amount?: number;
  items_count?: number;
}

export interface TableWithSession extends RestaurantTable {
  floor_name?: string | null;
  active_session?: TableSession | null;
  active_order?: ActiveOrderInfo | null;
}

export interface TableStats {
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  reservedTables: number;
  billRequestedTables: number;
  paymentPendingTables: number;
  outOfServiceTables: number;
}
