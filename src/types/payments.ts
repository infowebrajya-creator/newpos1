import { PaymentMethod, PaymentStatus, BillStatus, BillItem } from './billing';

export interface EnrichedPayment {
  id: string;
  bill_id: string;
  bill_number: string | number;
  table_session_id?: string | null;
  table_number?: string | null;
  order_id?: string | null;
  order_number?: string | null;
  order_type?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference_number?: string | null;
  created_at: string;
  bill_grand_total?: number;
  bill_paid_amount?: number;
  bill_balance_amount?: number;
  bill_status?: BillStatus;
  all_bill_payments?: Array<{
    id: string;
    method: PaymentMethod;
    amount: number;
    reference_number?: string | null;
    status: PaymentStatus;
    created_at: string;
  }>;
  items?: BillItem[];
}

export interface PaymentSummaryStats {
  totalCount: number;
  totalCollected: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  creditTotal: number;
  otherTotal: number;
  pendingDueTotal: number;
}
