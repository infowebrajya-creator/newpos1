-- WebRajya POS Step 12: Read-Only Reports & Analytics Schema, Indexes, and RPCs

-- 1. Performance Indexes for Analytical Reporting Queries
CREATE INDEX IF NOT EXISTS idx_bills_status_created ON public.bills(status, created_at);
CREATE INDEX IF NOT EXISTS idx_bills_table_session_id ON public.bills(table_session_id);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_order_item_id ON public.bill_items(order_item_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON public.payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_method ON public.payment_transactions(method);

CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_round_id ON public.order_items(order_round_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_type_date ON public.inventory_transactions(transaction_type, created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_date_status ON public.purchases(purchase_date, status);
CREATE INDEX IF NOT EXISTS idx_reservations_date_status ON public.reservations(reservation_date, status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- 2. Sales Overview Reporting RPC
CREATE OR REPLACE FUNCTION public.get_sales_overview_report(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_sales', COALESCE(SUM(b.grand_total), 0),
    'paid_bills_count', COUNT(b.id),
    'average_bill_value', CASE WHEN COUNT(b.id) > 0 THEN COALESCE(SUM(b.grand_total), 0) / COUNT(b.id) ELSE 0 END,
    'total_discounts', COALESCE(SUM(b.discount_amount), 0),
    'gross_sales', COALESCE(SUM(b.subtotal), 0),
    'net_sales', COALESCE(SUM(b.subtotal - b.discount_amount), 0),
    'tax_amount', COALESCE(SUM(b.tax_amount), 0),
    'rounding_amount', COALESCE(SUM(b.rounding_amount), 0),
    'discounted_bills_count', COUNT(CASE WHEN b.discount_amount > 0 THEN 1 END)
  ) INTO v_result
  FROM public.bills b
  WHERE b.status = 'paid'
    AND b.created_at >= p_start_date
    AND b.created_at <= p_end_date;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 3. Daily Sales Trend Reporting RPC
CREATE OR REPLACE FUNCTION public.get_daily_sales_trend(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS TABLE (
  sales_date TEXT,
  bill_count INTEGER,
  total_sales NUMERIC(12, 2),
  net_sales NUMERIC(12, 2),
  total_discounts NUMERIC(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (created_at AT TIME ZONE 'Asia/Kolkata')::DATE::TEXT AS sales_date,
    COUNT(id)::INTEGER AS bill_count,
    COALESCE(SUM(grand_total), 0)::NUMERIC(12, 2) AS total_sales,
    COALESCE(SUM(subtotal - discount_amount), 0)::NUMERIC(12, 2) AS net_sales,
    COALESCE(SUM(discount_amount), 0)::NUMERIC(12, 2) AS total_discounts
  FROM public.bills
  WHERE status = 'paid'
    AND created_at >= p_start_date
    AND created_at <= p_end_date
  GROUP BY (created_at AT TIME ZONE 'Asia/Kolkata')::DATE
  ORDER BY sales_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 4. Payment Method Breakdown RPC
CREATE OR REPLACE FUNCTION public.get_payment_method_breakdown(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS TABLE (
  payment_method TEXT,
  transaction_count INTEGER,
  total_amount NUMERIC(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.method AS payment_method,
    COUNT(pt.id)::INTEGER AS transaction_count,
    COALESCE(SUM(pt.amount), 0)::NUMERIC(12, 2) AS total_amount
  FROM public.payment_transactions pt
  JOIN public.bills b ON b.id = pt.bill_id
  WHERE b.status = 'paid'
    AND pt.created_at >= p_start_date
    AND pt.created_at <= p_end_date
  GROUP BY pt.method
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 5. Top Selling Items RPC
CREATE OR REPLACE FUNCTION public.get_top_selling_items_report(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  item_name TEXT,
  category_name TEXT,
  quantity_sold NUMERIC(12, 3),
  total_revenue NUMERIC(12, 2),
  complimentary_quantity NUMERIC(12, 3)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bi.item_name_snapshot AS item_name,
    COALESCE(mc.name, 'Uncategorized') AS category_name,
    COALESCE(SUM(bi.quantity), 0)::NUMERIC(12, 3) AS quantity_sold,
    COALESCE(SUM(bi.line_total), 0)::NUMERIC(12, 2) AS total_revenue,
    COALESCE(SUM(CASE WHEN oi.is_complimentary THEN bi.quantity ELSE 0 END), 0)::NUMERIC(12, 3) AS complimentary_quantity
  FROM public.bill_items bi
  JOIN public.bills b ON b.id = bi.bill_id
  LEFT JOIN public.order_items oi ON oi.id = bi.order_item_id
  LEFT JOIN public.menu_items mi ON mi.id = oi.menu_item_id
  LEFT JOIN public.menu_categories mc ON mc.id = mi.category_id
  WHERE b.status = 'paid'
    AND b.created_at >= p_start_date
    AND b.created_at <= p_end_date
  GROUP BY bi.item_name_snapshot, mc.name
  ORDER BY quantity_sold DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 6. Hourly Sales Distribution RPC
CREATE OR REPLACE FUNCTION public.get_hourly_sales_distribution(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS TABLE (
  hour_of_day INTEGER,
  bill_count INTEGER,
  total_sales NUMERIC(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Kolkata')::INTEGER AS hour_of_day,
    COUNT(id)::INTEGER AS bill_count,
    COALESCE(SUM(grand_total), 0)::NUMERIC(12, 2) AS total_sales
  FROM public.bills
  WHERE status = 'paid'
    AND created_at >= p_start_date
    AND created_at <= p_end_date
  GROUP BY hour_of_day
  ORDER BY hour_of_day ASC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
