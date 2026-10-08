import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hajnqorvkxuhlymyfrge.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_W2H5R2OV1qRM1UIVVB7XXQ_QM-5R-d3';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
