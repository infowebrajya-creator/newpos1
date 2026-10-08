-- ============================================================
-- WebRajya POS - Enable Row Level Security (RLS) with Full Access Policies
-- Run this script in Supabase SQL Editor to enable RLS across all existing tables.
-- ============================================================

BEGIN;

DO $$
DECLARE
    tbl text;
BEGIN
    -- Loop through all existing tables in the 'public' schema
    FOR tbl IN
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        -- 1. Enable RLS on table
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

        -- 2. Drop old policy if exists and create full access policy
        EXECUTE format('DROP POLICY IF EXISTS "allow_full_access_%I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "allow_full_access_%I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- 3. Grant full permissions to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

COMMIT;

