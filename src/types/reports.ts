export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'custom';

export interface DateRange {
  startDate: string; // ISO string or YYYY-MM-DD
  endDate: string;   // ISO string or YYYY-MM-DD
  preset: DatePreset;
}

export type ReportTab =
  | 'overview'
  | 'sales'
  | 'orders'
  | 'payments'
  | 'items'
  | 'inventory'
  | 'purchases'
  | 'customers'
  | 'reservations'
  | 'staff'
  | 'audit';

export interface SalesOverview {
  total_sales: number;
  paid_bills_count: number;
  average_bill_value: number;
  total_discounts: number;
  gross_sales: number;
  net_sales: number;
  tax_amount: number;
  rounding_amount: number;
  discounted_bills_count: number;
  total_complimentary_value: number;
  complimentary_items_count: number;
}

export interface DailySalesTrendItem {
  sales_date: string;
  bill_count: number;
  total_sales: number;
  net_sales: number;
  total_discounts: number;
}

export interface PaymentMethodBreakdownItem {
  payment_method: string;
  transaction_count: number;
  total_amount: number;
}

export interface TopSellingItem {
  item_name: string;
  category_name: string;
  quantity_sold: number;
  total_revenue: number;
  complimentary_quantity: number;
}

export interface CategorySalesItem {
  category_name: string;
  quantity_sold: number;
  total_revenue: number;
}

export interface HourlySalesItem {
  hour_of_day: number;
  bill_count: number;
  total_sales: number;
}

export interface TablePerformanceItem {
  table_number: string;
  sessions_count: number;
  total_guests: number;
  paid_bills_count: number;
  total_sales: number;
}

export interface OrderReportSummary {
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  open_orders: number;
  average_order_value: number;
  status_breakdown: Record<string, number>;
}

export interface InventoryReportSummary {
  total_ingredients: number;
  healthy_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_valuation: number;
}

export interface InventoryMovementItem {
  transaction_type: string;
  total_quantity: number;
  transaction_count: number;
}

export interface InventoryConsumptionItemReport {
  ingredient_name: string;
  unit: string;
  total_consumed_qty: number;
}

export interface PurchaseReportSummary {
  total_purchases_count: number;
  received_purchases_count: number;
  cancelled_purchases_count: number;
  total_purchase_amount: number;
}

export interface SupplierPurchaseAggregate {
  supplier_name: string;
  purchase_count: number;
  total_purchase_amount: number;
}

export interface ReservationReportSummary {
  total_reservations: number;
  confirmed_count: number;
  seated_count: number;
  completed_count: number;
  cancelled_count: number;
  no_show_count: number;
  seated_conversion_percent: number;
}

export interface CustomerReportSummary {
  total_customers: number;
  active_customers: number;
  customers_with_visits: number;
  customers_with_reservations: number;
}

export interface StaffActivityItem {
  user_id: string;
  user_name?: string;
  user_email?: string;
  action_count: number;
  last_activity: string;
}

export interface AuditLogReportItem {
  id: string;
  created_at: string;
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  reason?: string | null;
}
