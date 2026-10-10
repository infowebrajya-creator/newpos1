-- Fix missing reference_number column in public.payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reference_number TEXT;

-- Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
