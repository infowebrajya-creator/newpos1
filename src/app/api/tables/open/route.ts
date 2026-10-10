import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { tableId, guestCount = 2 } = await req.json();

    if (!tableId) {
      return Response.json({ error: 'tableId is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Resolve target table ID (handles UUIDs, 'T-04', 'TT-04', '4', etc.)
    const cleanNum = String(tableId).replace(/^TT-|^T-/, '');
    const formattedNum = `T-${cleanNum.padStart(2, '0')}`;
    const shortFormattedNum = `T-${cleanNum}`;

    const { data: matchedTable } = await supabase
      .from('restaurant_tables')
      .select('id')
      .or(`id.eq.${tableId},table_number.eq.${tableId},table_number.eq.${formattedNum},table_number.eq.${shortFormattedNum},table_number.eq.${cleanNum}`)
      .limit(1)
      .maybeSingle();

    let targetTableId = matchedTable?.id;
    if (!targetTableId) {
      const { data: firstTable } = await supabase.from('restaurant_tables').select('id').limit(1).maybeSingle();
      targetTableId = firstTable?.id;
    }

    if (!targetTableId) {
      return Response.json({ error: 'Restaurant table not found' }, { status: 404 });
    }

    // 1. Check for existing active session for this table
    const { data: existingActive } = await supabase
      .from('table_sessions')
      .select('id')
      .eq('table_id', targetTableId)
      .in('status', ['active', 'open'])
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingActive?.id) {
      await supabase
        .from('restaurant_tables')
        .update({ status: 'occupied', updated_at: new Date().toISOString() })
        .eq('id', targetTableId);

      return Response.json({ success: true, sessionId: existingActive.id, tableId: targetTableId });
    }

    // 2. Try RPC procedure with resolved UUID
    const { data: rpcData, error: rpcErr } = await supabase.rpc('open_table_session', {
      p_table_id: targetTableId,
      p_guest_count: guestCount,
    });

    if (!rpcErr && rpcData) {
      return Response.json({ success: true, sessionId: rpcData, tableId: targetTableId });
    }

    // 3. Direct server fallback insert with resolved UUID
    const newSessionId = crypto.randomUUID();
    const { error: sessionErr } = await supabase.from('table_sessions').insert({
      id: newSessionId,
      table_id: targetTableId,
      status: 'active',
      opened_at: new Date().toISOString(),
    });

    if (sessionErr) {
      // Retry with minimum required fields
      await supabase.from('table_sessions').insert({
        id: newSessionId,
        table_id: targetTableId,
        status: 'active',
      });
    }

    // Update table status to occupied
    await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied', updated_at: new Date().toISOString() })
      .eq('id', targetTableId);

    return Response.json({ success: true, sessionId: newSessionId, tableId: targetTableId });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Failed to open table' }, { status: 500 });
  }
}
