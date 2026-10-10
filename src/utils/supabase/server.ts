import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  "https://hajnqorvkxuhlymyfrge.supabase.co";

const supabaseKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_W2H5R2OV1qRM1UIVVB7XXQ_QM-5R-d3";

export const createClient = () => {
  return createSupabaseClient(
    supabaseUrl,
    supabaseKey,
  );
};
