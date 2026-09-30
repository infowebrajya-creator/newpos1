import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { tableId } = await req.json();

    if (!tableId) {
      return NextResponse.json({ error: 'Table ID is required.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Close active sessions for this table
    await supabase
      .from('table_sessions')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('table_id', tableId)
      .in('status', ['active', 'open']);

    // 2. Reset restaurant_table status to 'available'
    const { error: tableErr } = await supabase
      .from('restaurant_tables')
      .update({ status: 'available', updated_at: new Date().toISOString() })
      .eq('id', tableId);

    if (tableErr) {
      return NextResponse.json({ error: tableErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Table marked as blank (available).' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reset table.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
