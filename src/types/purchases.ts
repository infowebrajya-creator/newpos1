import { StockUnit } from './inventory';

export type PurchaseStatus =
  | 'draft'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'cancelled';

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
  notes?: string | null;
  is_active: boolean;
  total_purchases_count?: number;
  last_purchase_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  ingredient_id: string;
  ingredient_name?: string;
  quantity: number;
  unit: StockUnit | string;
  unit_cost: number;
  line_total: number;
  received_quantity: number;
  created_at?: string;
  updated_at?: string;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  supplier_name?: string;
  status: PurchaseStatus;
  invoice_number?: string | null;
  purchase_date: string;
  notes?: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  rounding_amount: number;
  grand_total: number;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
  received_at?: string | null;
  received_by?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  items?: PurchaseItem[];
}

export interface CreateSupplierInput {
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface CreatePurchaseItemInput {
  ingredient_id: string;
  quantity: number;
  unit: StockUnit | string;
  unit_cost: number;
}

export interface CreatePurchaseInput {
  supplier_id: string;
  invoice_number?: string | null;
  purchase_date?: string;
  notes?: string | null;
  discount_amount?: number;
  tax_amount?: number;
  rounding_amount?: number;
  status?: PurchaseStatus;
  items: CreatePurchaseItemInput[];
}
