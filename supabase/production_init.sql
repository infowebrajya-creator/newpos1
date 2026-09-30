-- WebRajya POS - Clean Production Database Initialization Script
-- Execute this script in Supabase SQL Editor for fresh Production setups.

BEGIN;

-- SECTION 1: CLEAN RESET
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
DROP TABLE IF EXISTS public.menu_items CASCADE;
DROP TABLE IF EXISTS public.menu_categories CASCADE;
DROP TABLE IF EXISTS public.table_sessions CASCADE;
DROP TABLE IF EXISTS public.restaurant_tables CASCADE;
DROP TABLE IF EXISTS public.floors CASCADE;
DROP TABLE IF EXISTS public.restaurant_settings CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- SECTION 2: DDL TABLE SCHEMAS
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier', 'waiter', 'kitchen')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'WebRajya Restaurant',
  legal_name TEXT,
  gstin TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  fssai_license TEXT,
  receipt_header TEXT,
  receipt_footer TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  is_tax_inclusive BOOLEAN NOT NULL DEFAULT false,
  service_charge_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID REFERENCES public.floors(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'bill_requested', 'payment_pending', 'reserved', 'out_of_service')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  opened_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  guest_count INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'merged')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(5, 2) DEFAULT 0.00,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_veg BOOLEAN NOT NULL DEFAULT true,
  is_bestseller BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number BIGINT GENERATED ALWAYS AS IDENTITY,
  table_session_id UUID REFERENCES public.table_sessions(id) ON DELETE SET NULL,
  order_type TEXT NOT NULL DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_kitchen', 'served', 'billed', 'paid', 'cancelled')),
  waiter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  round_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_round_id UUID NOT NULL REFERENCES public.order_rounds(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  is_complimentary BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cooking', 'ready', 'served', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.kots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kot_number BIGINT GENERATED ALWAYS AS IDENTITY,
  order_round_id UUID NOT NULL REFERENCES public.order_rounds(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.kot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kot_id UUID NOT NULL REFERENCES public.kots(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cooking', 'ready', 'cancelled'))
);

CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number BIGINT GENERATED ALWAYS AS IDENTITY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2) DEFAULT 0.00,
  discount_amount NUMERIC(10, 2) DEFAULT 0.00,
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  service_charge_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  final_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'net_banking', 'other')),
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  reference_number TEXT,
  received_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  transaction_ref TEXT,
  gateway_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT,
  address TEXT,
  gstin TEXT,
  total_visits INT DEFAULT 0,
  total_spent NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INT NOT NULL DEFAULT 2,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'seated', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  unit TEXT NOT NULL DEFAULT 'kg',
  current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  minimum_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  maximum_stock NUMERIC(12, 3) DEFAULT 0.000,
  cost_per_unit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'consumption', 'wastage', 'adjustment')),
  quantity NUMERIC(12, 3) NOT NULL,
  previous_stock NUMERIC(12, 3) NOT NULL,
  new_stock NUMERIC(12, 3) NOT NULL,
  reason TEXT,
  performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID UNIQUE NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  yield_quantity NUMERIC(8, 2) NOT NULL DEFAULT 1.0,
  yield_unit TEXT NOT NULL DEFAULT 'portion',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  unit TEXT NOT NULL DEFAULT 'g',
  wastage_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID UNIQUE NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  consumed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_consumption_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumption_id UUID NOT NULL REFERENCES public.inventory_consumptions(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL,
  unit TEXT NOT NULL
);

CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'received', 'cancelled')),
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DISABLE RLS FOR APPLICATION BROADCAST & DIRECT FRONTEND INTERACTION
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

-- STORED PROCEDURES
CREATE OR REPLACE FUNCTION public.seed_demo_floors_and_tables()
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.floors (id, name, display_order, sort_order, is_active) VALUES
    ('20000000-0000-0000-0000-000000000001', 'Ground Floor (Main Dining)', 1, 1, true),
    ('20000000-0000-0000-0000-000000000002', 'First Floor (VIP Lounge)', 2, 2, true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = true;

  INSERT INTO public.restaurant_tables (id, floor_id, table_number, capacity, status, is_active) VALUES
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'T-01', 2, 'available', true),
    ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'T-02', 4, 'available', true),
    ('30000000-0000-0000-0000-000000000001', 'T-03', 4, 'available', true),
    ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'T-04', 6, 'available', true),
    ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'T-05', 8, 'available', true),
    ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 'T-06', 2, 'available', true),
    ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', 'VIP-1', 4, 'available', true),
    ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', 'VIP-2', 6, 'available', true),
    ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002', 'VIP-3', 8, 'available', true),
    ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000002', 'VIP-4', 10, 'available', true)
  ON CONFLICT (id) DO UPDATE SET table_number = EXCLUDED.table_number, capacity = EXCLUDED.capacity, is_active = true;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECTION 3: ESSENTIAL MASTER DATA SETUP
INSERT INTO public.restaurant_settings (
  id, name, legal_name, phone, email, address, fssai_license, receipt_header, receipt_footer, currency, currency_symbol, tax_rate
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  'WebRajya POS',
  'WebRajya Hospitality Pvt Ltd',
  '+91 98765 43210',
  'contact@webrajya.com',
  'Main Street, City Center',
  '10022011004567',
  'Welcome to WebRajya POS',
  'Thank you for dining with us!',
  'INR',
  '₹',
  0.00
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.floors (id, name, display_order, sort_order, is_active) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Ground Floor (Main Dining)', 1, 1, true),
  ('20000000-0000-0000-0000-000000000002', 'First Floor (VIP Lounge)', 2, 2, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.restaurant_tables (id, floor_id, table_number, capacity, status, is_active) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'T-01', 2, 'available', true),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'T-02', 4, 'available', true),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'T-03', 4, 'available', true),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'T-04', 6, 'available', true),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'T-05', 8, 'available', true),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 'T-06', 2, 'available', true),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', 'VIP-1', 4, 'available', true),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', 'VIP-2', 6, 'available', true),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002', 'VIP-3', 8, 'available', true),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000002', 'VIP-4', 10, 'available', true)
ON CONFLICT (id) DO UPDATE SET table_number = EXCLUDED.table_number, capacity = EXCLUDED.capacity;

COMMIT;
