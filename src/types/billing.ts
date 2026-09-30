export type BillStatus =
  | 'draft'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'voided'
  | 'refunded';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'credit' | 'other';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Bill {
  id: string;
  table_session_id: string;
  order_id?: string | null;
  bill_number: string | number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  rounding_amount: number;
  grand_total: number;
  paid_amount: number;
  balance_amount: number;
  status: BillStatus;
  created_at: string;
  updated_at?: string;
}

export interface BillItem {
  id: string;
  bill_id: string;
  menu_item_id?: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  is_complimentary?: boolean;
  created_at?: string;
}

export interface Payment {
  id: string;
  bill_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference_number?: string | null;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  payment_id?: string;
  bill_id: string;
  method: PaymentMethod;
  amount: number;
  reference_number?: string | null;
  status?: string;
  created_at: string;
}

export interface DetailedBill extends Bill {
  table_number?: string;
  session_number?: string | number;
  items: BillItem[];
  payments: Payment[];
}
