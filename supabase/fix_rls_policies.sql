-- ============================================================
-- WebRajya POS - Fix Row Level Security (RLS) & Permissions
-- Run this script in Supabase SQL Editor to resolve RLS errors.
-- ============================================================

-- 1. Disable RLS on all POS Tables
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

-- 2. Drop existing restrictive policies and create open policies if RLS gets re-enabled
DROP POLICY IF EXISTS "Allow anon orders" ON public.orders;
CREATE POLICY "Allow anon orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon order_rounds" ON public.order_rounds;
CREATE POLICY "Allow anon order_rounds" ON public.order_rounds FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon order_items" ON public.order_items;
CREATE POLICY "Allow anon order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon kots" ON public.kots;
CREATE POLICY "Allow anon kots" ON public.kots FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon kot_items" ON public.kot_items;
CREATE POLICY "Allow anon kot_items" ON public.kot_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon bills" ON public.bills;
CREATE POLICY "Allow anon bills" ON public.bills FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon bill_items" ON public.bill_items;
CREATE POLICY "Allow anon bill_items" ON public.bill_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon payments" ON public.payments;
CREATE POLICY "Allow anon payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon table_sessions" ON public.table_sessions;
CREATE POLICY "Allow anon table_sessions" ON public.table_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon restaurant_tables" ON public.restaurant_tables;
CREATE POLICY "Allow anon restaurant_tables" ON public.restaurant_tables FOR ALL USING (true) WITH CHECK (true);

-- 3. Grant full permissions to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
