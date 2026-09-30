export type KOTStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface KOT {
  id: string;
  order_id: string;
  order_round_id: string;
  kot_number: number | string;
  status: KOTStatus;
  printed_at?: string | null;
  created_at: string;
}

export interface KOTItem {
  id: string;
  kot_id: string;
  order_item_id: string;
  quantity: number;
  created_at?: string;
  item_name?: string;
  item_note?: string | null;
  is_complimentary?: boolean;
}

export interface KitchenOrderView {
  id: string;
  order_id: string;
  order_round_id: string;
  kot_number: number | string;
  status: KOTStatus;
  created_at: string;
  table_number: string;
  session_number: number | string;
  guest_count: number;
  order_number?: number | string;
  round_number?: number;
  items: KOTItem[];
}
