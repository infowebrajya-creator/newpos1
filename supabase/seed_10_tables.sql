-- ==================================================
-- DEPLOY 2 FLOORS AND 10 TABLES FOR WEBRAJYA POS
-- ==================================================

BEGIN;

-- 1. DISABLE RLS ON FLOORS, TABLES & TABLE SESSIONS
ALTER TABLE public.floors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.floors TO anon, authenticated, service_role;
GRANT ALL ON public.restaurant_tables TO anon, authenticated, service_role;
GRANT ALL ON public.table_sessions TO anon, authenticated, service_role;

-- 2. CREATE OPEN TABLE SESSION PROCEDURE
CREATE OR REPLACE FUNCTION public.open_table_session(
  p_table_id UUID,
  p_guest_count INT
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_table_status TEXT;
BEGIN
  SELECT status INTO v_table_status
  FROM public.restaurant_tables
  WHERE id = p_table_id
  FOR UPDATE;

  IF v_table_status IS NULL THEN
    RAISE EXCEPTION 'Table not found';
  END IF;

  INSERT INTO public.table_sessions (
    table_id,
    guest_count,
    status,
    opened_at
  ) VALUES (
    p_table_id,
    p_guest_count,
    'active',
    now()
  ) RETURNING id INTO v_session_id;

  UPDATE public.restaurant_tables
  SET status = 'occupied',
      updated_at = now()
  WHERE id = p_table_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. INSERT 2 FLOORS
INSERT INTO public.floors (id, name, display_order, sort_order, is_active) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Ground Floor (Main Dining)', 1, 1, true),
  ('20000000-0000-0000-0000-000000000002', 'First Floor (VIP Lounge)', 2, 2, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true;

-- 4. INSERT 10 TABLES (6 GROUND FLOOR + 4 FIRST FLOOR)
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
ON CONFLICT (id) DO UPDATE SET
  table_number = EXCLUDED.table_number,
  capacity = EXCLUDED.capacity,
  status = EXCLUDED.status,
  is_active = true;

COMMIT;
