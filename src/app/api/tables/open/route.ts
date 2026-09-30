import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { tableId, guestCount = 2 } = await req.json();

    if (!tableId) {
      return NextResponse.json({ error: 'tableId is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Try RPC procedure first
    const { data: rpcData, error: rpcErr } = await supabase.rpc('open_table_session', {
      p_table_id: tableId,
      p_guest_count: guestCount,
    });

    if (!rpcErr && rpcData) {
      return NextResponse.json({ success: true, sessionId: rpcData, tableId });
    }

    // 2. Direct server fallback insert
    const newSessionId = crypto.randomUUID();
    const { error: sessionErr } = await supabase.from('table_sessions').insert({
      id: newSessionId,
      table_id: tableId,
      guest_count: guestCount,
      status: 'active',
      opened_at: new Date().toISOString(),
    });

    if (sessionErr) {
      return NextResponse.json({ error: sessionErr.message }, { status: 500 });
    }

    // Update table status to occupied
    await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied', updated_at: new Date().toISOString() })
      .eq('id', tableId);

    return NextResponse.json({ success: true, sessionId: newSessionId, tableId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to open table' }, { status: 500 });
  }
}
