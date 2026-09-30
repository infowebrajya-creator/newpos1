export type OrderStatus =
  | 'pending'
  | 'active'
  | 'open'
  | 'completed'
  | 'cancelled'
  | 'paid';

export interface Order {
  id: string;
  table_session_id: string;
  order_number?: string | number;
  order_type?: string;
  status: OrderStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrderRound {
  id: string;
  order_id: string;
  round_number?: number;
  status?: string;
  created_at?: string;
}

export interface OrderItem {
  id: string;
  order_round_id: string;
  menu_item_id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  item_note?: string | null;
  is_complimentary?: boolean;
}
