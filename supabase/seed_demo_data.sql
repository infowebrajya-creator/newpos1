-- WebRajya POS Master Setup & Demo Data Script
-- Running this single script in Supabase SQL Editor deploys ALL tables, RLS policies, RPC stored procedures, and 2 Floors with 10 Tables.

BEGIN;

-- ==================================================
-- SECTION 1: CLEAN RESET (DROP EXISTING TABLES)
-- ==================================================
DROP TABLE IF EXISTS public.inventory_consumption_items CASCADE;
DROP TABLE IF EXISTS public.inventory_consumptions CASCADE;
DROP TABLE IF EXISTS public.recipe_items CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;
DROP TABLE IF EXISTS public.inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.ingredients CASCADE;
DROP TABLE IF EXISTS public.ingredient_categories CASCADE;
DROP TABLE IF EXISTS public.purchase_items CASCADE;
DROP TABLE IF EXISTS public.purchases CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.payment_transactions CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.bill_items CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.kot_items CASCADE;
DROP TABLE IF EXISTS public.kots CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.order_rounds CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.table_sessions CASCADE;
DROP TABLE IF EXISTS public.restaurant_tables CASCADE;
DROP TABLE IF EXISTS public.floors CASCADE;
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.menu_categories CASCADE;
DROP TABLE IF EXISTS public.restaurant_settings CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ==================================================
-- SECTION 2: CREATE TABLES
-- ==================================================

-- 1. Public Users / Staff
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'cashier',
  is_active BOOLEAN NOT NULL DEFAULT true,
  phone_number TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Restaurant Settings
CREATE TABLE public.restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'WebRajya Restaurant',
  legal_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  fssai_license TEXT,
  currency TEXT NOT NULL DEFAULT '₹',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  service_charge_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  logo_url TEXT,
  receipt_header TEXT,
  receipt_footer TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Floors
CREATE TABLE public.floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Restaurant Tables
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL,
  table_number TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'available',
  shape TEXT NOT NULL DEFAULT 'square',
  x_position INTEGER NOT NULL DEFAULT 0,
  y_position INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Table Sessions
CREATE TABLE public.table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  customer_id UUID,
  customer_name TEXT,
  party_size INTEGER NOT NULL DEFAULT 2,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Menu Categories
CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Menu Items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_veg BOOLEAN NOT NULL DEFAULT true,
  is_bestseller BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_session_id UUID REFERENCES public.table_sessions(id) ON DELETE SET NULL,
  order_number TEXT,
  order_type TEXT NOT NULL DEFAULT 'dine_in',
  status TEXT NOT NULL DEFAULT 'open',
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Order Rounds
CREATE TABLE public.order_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'sent_to_kitchen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Order Items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_round_id UUID REFERENCES public.order_rounds(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  notes TEXT,
  is_complimentary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. KOTs (Kitchen Order Tokens)
CREATE TABLE public.kots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_round_id UUID REFERENCES public.order_rounds(id) ON DELETE CASCADE,
  kot_number TEXT,
  table_number TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. KOT Items
CREATE TABLE public.kot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kot_id UUID NOT NULL REFERENCES public.kots(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Bills
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_session_id UUID REFERENCES public.table_sessions(id) ON DELETE SET NULL,
  bill_number TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  rounding_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Bill Items
CREATE TABLE public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  item_name_snapshot TEXT,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Payments & Payment Transactions
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  transaction_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  method TEXT NOT NULL DEFAULT 'cash',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  reference_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Audit Logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Ingredient Categories & Ingredients
CREATE TABLE public.ingredient_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.ingredient_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'kg',
  current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  minimum_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  maximum_stock NUMERIC(12, 3) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity NUMERIC(12, 3) NOT NULL,
  previous_stock NUMERIC(12, 3) NOT NULL,
  new_stock NUMERIC(12, 3) NOT NULL,
  reason TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Recipes & Recipe Items
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  yield_quantity NUMERIC(12, 3) NOT NULL DEFAULT 1.0,
  yield_unit TEXT NOT NULL DEFAULT 'portion',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_active_menu_item_recipe UNIQUE (menu_item_id)
);

CREATE TABLE public.recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  wastage_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_recipe_ingredient UNIQUE (recipe_id, ingredient_id)
);

CREATE TABLE public.inventory_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed',
  consumed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_bill_consumption UNIQUE (bill_id)
);

CREATE TABLE public.inventory_consumption_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumption_id UUID NOT NULL REFERENCES public.inventory_consumptions(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. Suppliers & Purchases
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.purchase_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION public.generate_purchase_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'PUR-' || nextval('public.purchase_number_seq')::TEXT;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number TEXT UNIQUE DEFAULT public.generate_purchase_number(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'received',
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  rounding_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  notes TEXT,
  created_by UUID,
  received_at TIMESTAMPTZ,
  received_by UUID,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 1.0,
  received_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.0,
  unit TEXT NOT NULL DEFAULT 'kg',
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. Customers & Reservations
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.reservation_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION public.generate_reservation_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'RES-' || nextval('public.reservation_number_seq')::TEXT;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_number TEXT UNIQUE DEFAULT public.generate_reservation_number(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL DEFAULT '19:00:00',
  start_time TIME DEFAULT '19:00:00',
  end_time TIME DEFAULT '20:30:00',
  party_size INTEGER NOT NULL DEFAULT 2,
  guest_count INTEGER DEFAULT 2,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  confirmed_at TIMESTAMPTZ,
  seated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DISABLE RLS ON ALL PUBLIC TABLES FOR UNRESTRICTED APPLICATION ACCESS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_rounds DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kots DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kot_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_consumptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_consumption_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations DISABLE ROW LEVEL SECURITY;


-- ==================================================
-- SECTION 3: STORED PROCEDURES (RPCS)
-- ==================================================

-- Seed 10 Tables across 2 Floors RPC
CREATE OR REPLACE FUNCTION public.seed_demo_floors_and_tables()
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert 2 Floors
  INSERT INTO public.floors (id, name, display_order, sort_order, is_active) VALUES
    ('20000000-0000-0000-0000-000000000001', 'Ground Floor (Main Dining)', 1, 1, true),
    ('20000000-0000-0000-0000-000000000002', 'First Floor (VIP Lounge)', 2, 2, true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = true;

  -- Insert 10 Tables (6 on Ground Floor, 4 on First Floor)
  INSERT INTO public.restaurant_tables (id, floor_id, table_number, capacity, status, is_active) VALUES
    -- Ground Floor (6 Tables)
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'T-01', 2, 'available', true),
    ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'T-02', 4, 'available', true),
    ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'T-03', 4, 'available', true),
    ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'T-04', 6, 'available', true),
    ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'T-05', 8, 'available', true),
    ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 'T-06', 2, 'available', true),
    -- First Floor VIP Lounge (4 Tables)
    ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', 'VIP-1', 4, 'available', true),
    ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', 'VIP-2', 6, 'available', true),
    ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002', 'VIP-3', 8, 'available', true),
    ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000002', 'VIP-4', 10, 'available', true)
  ON CONFLICT (id) DO UPDATE SET table_number = EXCLUDED.table_number, capacity = EXCLUDED.capacity, is_active = true;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Stock Adjustment
CREATE OR REPLACE FUNCTION public.adjust_ingredient_stock(
  p_ingredient_id UUID,
  p_quantity NUMERIC,
  p_transaction_type TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_prev_stock NUMERIC;
  v_new_stock NUMERIC;
  v_tx_id UUID;
BEGIN
  SELECT current_stock INTO v_prev_stock
  FROM public.ingredients
  WHERE id = p_ingredient_id
  FOR UPDATE;

  IF v_prev_stock IS NULL THEN
    RAISE EXCEPTION 'Ingredient not found';
  END IF;

  v_new_stock := v_prev_stock + p_quantity;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Resulting stock cannot be negative (Current: %, Adjustment: %)', v_prev_stock, p_quantity;
  END IF;

  UPDATE public.ingredients
  SET current_stock = v_new_stock,
      updated_at = now()
  WHERE id = p_ingredient_id;

  INSERT INTO public.inventory_transactions (
    ingredient_id,
    transaction_type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    performed_by
  ) VALUES (
    p_ingredient_id,
    p_transaction_type,
    p_quantity,
    v_prev_stock,
    v_new_stock,
    p_reason,
    auth.uid()
  ) RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;


-- Process Bill Inventory Consumption
CREATE OR REPLACE FUNCTION public.process_bill_inventory_consumption(
  p_bill_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_bill_status TEXT;
  v_existing_id UUID;
  v_consumption_id UUID;
  v_bill_item RECORD;
  v_recipe_id UUID;
  v_recipe_item RECORD;
  v_ing_unit TEXT;
  v_unit_factor NUMERIC;
  v_required_qty NUMERIC;
  v_bill_number TEXT;
  v_reason TEXT;
  v_check_item RECORD;
BEGIN
  SELECT id INTO v_existing_id
  FROM public.inventory_consumptions
  WHERE bill_id = p_bill_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN true;
  END IF;

  SELECT payment_status, bill_number INTO v_bill_status, v_bill_number
  FROM public.bills
  WHERE id = p_bill_id;

  IF v_bill_status IS NULL THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  IF v_bill_status != 'paid' THEN
    RETURN true;
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS temp_bill_consumption (
    ingredient_id UUID PRIMARY KEY,
    required_qty NUMERIC(12, 3) DEFAULT 0,
    unit TEXT NOT NULL
  ) ON COMMIT DROP;

  DELETE FROM temp_bill_consumption;

  FOR v_bill_item IN
    SELECT oi.menu_item_id, bi.quantity, COALESCE(oi.is_complimentary, false) AS is_complimentary
    FROM public.bill_items bi
    JOIN public.order_items oi ON oi.id = bi.order_item_id
    WHERE bi.bill_id = p_bill_id
      AND (oi.is_complimentary IS NOT TRUE)
      AND oi.menu_item_id IS NOT NULL
  LOOP
    SELECT id INTO v_recipe_id
    FROM public.recipes
    WHERE menu_item_id = v_bill_item.menu_item_id AND is_active = true;

    IF v_recipe_id IS NOT NULL THEN
      FOR v_recipe_item IN
        SELECT ingredient_id, quantity, unit, wastage_percent
        FROM public.recipe_items
        WHERE recipe_id = v_recipe_id
      LOOP
        SELECT unit INTO v_ing_unit
        FROM public.ingredients
        WHERE id = v_recipe_item.ingredient_id AND is_active = true;

        IF v_ing_unit IS NOT NULL THEN
          v_unit_factor := 1.0;
          IF v_recipe_item.unit = 'g' AND v_ing_unit = 'kg' THEN
            v_unit_factor := 0.001;
          ELSIF v_recipe_item.unit = 'kg' AND v_ing_unit = 'g' THEN
            v_unit_factor := 1000.0;
          ELSIF v_recipe_item.unit = 'ml' AND v_ing_unit = 'l' THEN
            v_unit_factor := 0.001;
          ELSIF v_recipe_item.unit = 'l' AND v_ing_unit = 'ml' THEN
            v_unit_factor := 1000.0;
          END IF;

          v_required_qty := v_bill_item.quantity * (v_recipe_item.quantity * (1.0 + (v_recipe_item.wastage_percent / 100.0))) * v_unit_factor;

          INSERT INTO temp_bill_consumption (ingredient_id, required_qty, unit)
          VALUES (v_recipe_item.ingredient_id, v_required_qty, v_ing_unit)
          ON CONFLICT (ingredient_id)
          DO UPDATE SET required_qty = temp_bill_consumption.required_qty + EXCLUDED.required_qty;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  INSERT INTO public.inventory_consumptions (bill_id, status, consumed_by)
  VALUES (p_bill_id, 'completed', auth.uid())
  ON CONFLICT (bill_id) DO NOTHING
  RETURNING id INTO v_consumption_id;

  IF v_consumption_id IS NULL THEN
    RETURN true;
  END IF;

  v_reason := 'Automatic consumption for Bill #' || COALESCE(v_bill_number, p_bill_id::text);

  FOR v_check_item IN
    SELECT ingredient_id, required_qty, unit
    FROM temp_bill_consumption
  LOOP
    INSERT INTO public.inventory_consumption_items (consumption_id, ingredient_id, quantity, unit)
    VALUES (v_consumption_id, v_check_item.ingredient_id, v_check_item.required_qty, v_check_item.unit);

    PERFORM public.adjust_ingredient_stock(
      v_check_item.ingredient_id,
      -v_check_item.required_qty,
      'consumption',
      v_reason
    );
  END LOOP;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;


-- ==================================================
-- SECTION 4: SEED DEMO DATA
-- ==================================================

-- 1. RESTAURANT SETTINGS
INSERT INTO public.restaurant_settings (
  id,
  name,
  legal_name,
  phone,
  email,
  address,
  fssai_license,
  receipt_header,
  receipt_footer,
  currency,
  currency_symbol,
  tax_rate
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  'WebRajya Fine Dining',
  'WebRajya Foods & Hospitality Pvt Ltd',
  '+91 98765 43210',
  'contact@webrajya.com',
  '123 Connaught Place, Inner Circle, New Delhi - 110001',
  '10022011004567',
  'Welcome to WebRajya Fine Dining & Bar',
  'Thank you for dining with us! Please visit again.',
  'INR',
  '₹',
  0.00
);

-- 2. FLOORS (2 Floors)
INSERT INTO public.floors (id, name, display_order, sort_order) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Ground Floor (Main Dining)', 1, 1),
  ('20000000-0000-0000-0000-000000000002', 'First Floor (VIP Lounge)', 2, 2);

-- 3. RESTAURANT TABLES (10 Tables Total: 6 Ground Floor + 4 First Floor)
INSERT INTO public.restaurant_tables (id, floor_id, table_number, capacity, status) VALUES
  -- Ground Floor (6 Tables)
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'T-01', 2, 'available'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'T-02', 4, 'available'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'T-03', 4, 'available'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'T-04', 6, 'available'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'T-05', 8, 'available'),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 'T-06', 2, 'available'),
  -- First Floor (4 Tables)
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', 'VIP-1', 4, 'available'),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', 'VIP-2', 6, 'available'),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002', 'VIP-3', 8, 'available'),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000002', 'VIP-4', 10, 'available');

COMMIT;
