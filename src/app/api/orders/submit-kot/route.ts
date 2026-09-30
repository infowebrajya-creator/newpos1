import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { tableSessionId, cartItems = [] } = await req.json();

    if (!tableSessionId) {
      return NextResponse.json({ error: 'tableSessionId is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Ensure tableSessionId exists in table_sessions table to satisfy FK constraint
    let validSessionId = tableSessionId;
    const { data: existingSession } = await supabase
      .from('table_sessions')
      .select('id')
      .eq('id', tableSessionId)
      .maybeSingle();

    if (!existingSession) {
      const { data: matchedTable } = await supabase
        .from('restaurant_tables')
        .select('id')
        .eq('id', tableSessionId)
        .maybeSingle();

      let targetTableId = matchedTable?.id;
      if (!targetTableId) {
        const { data: firstTable } = await supabase.from('restaurant_tables').select('id').limit(1).maybeSingle();
        targetTableId = firstTable?.id;
      }

      if (targetTableId) {
        const isUUID = typeof tableSessionId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tableSessionId);
        const newSessionId = isUUID ? tableSessionId : crypto.randomUUID();

        const { error: sessErr } = await supabase.from('table_sessions').insert({
          id: newSessionId,
          table_id: targetTableId,
          guest_count: 2,
          status: 'active',
          opened_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });

        if (!sessErr) {
          validSessionId = newSessionId;
        } else {
          const fallbackId = crypto.randomUUID();
          await supabase.from('table_sessions').insert({
            id: fallbackId,
            table_id: targetTableId,
            guest_count: 2,
            status: 'active',
            opened_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
          validSessionId = fallbackId;
        }
      }
    }

    // 2. Get or create active order for session
    let { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('table_session_id', validSessionId)
      .not('status', 'in', '("closed","cancelled","paid")')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!order) {
      const newOrderId = crypto.randomUUID();
      const { data: createdOrder, error: createOrderErr } = await supabase
        .from('orders')
        .insert({
          id: newOrderId,
          table_session_id: validSessionId,
          order_type: 'dine_in',
          status: 'open',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (createOrderErr) {
        return NextResponse.json({ error: createOrderErr.message }, { status: 500 });
      }
      order = createdOrder;
    }

    if (!order) {
      return NextResponse.json({ error: 'Failed to find or create order' }, { status: 500 });
    }

    // 2. Find next round_number
    const { data: rounds } = await supabase
      .from('order_rounds')
      .select('round_number')
      .eq('order_id', order.id)
      .order('round_number', { ascending: false })
      .limit(1);

    const nextRoundNum = rounds && rounds.length > 0 ? (rounds[0].round_number || 0) + 1 : 1;
    const roundId = crypto.randomUUID();

    const { error: roundErr } = await supabase.from('order_rounds').insert({
      id: roundId,
      order_id: order.id,
      round_number: nextRoundNum,
      created_at: new Date().toISOString(),
    });

    if (roundErr) {
      return NextResponse.json({ error: roundErr.message }, { status: 500 });
    }

    // 3. Insert order items if provided
    const createdItemIds: string[] = [];
    if (cartItems.length > 0) {
      const orderItemsToInsert = cartItems.map((item: any) => {
        const itemId = crypto.randomUUID();
        createdItemIds.push(itemId);
        return {
          id: itemId,
          order_round_id: roundId,
          menu_item_id: item.menuItemId || null,
          quantity: item.quantity || 1,
          unit_price: item.unitPrice || 0,
          notes: item.itemNote?.trim() || null,
          is_complimentary: !!item.isComplimentary,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsToInsert);
      if (itemsErr) {
        return NextResponse.json({ error: itemsErr.message }, { status: 500 });
      }
    }

    // 4. Create KOT and KOT items
    const kotId = crypto.randomUUID();
    const { error: kotErr } = await supabase.from('kots').insert({
      id: kotId,
      order_round_id: roundId,
      order_id: order.id,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (!kotErr && createdItemIds.length > 0) {
      const kotItemsToInsert = createdItemIds.map((itemId, idx) => ({
        id: crypto.randomUUID(),
        kot_id: kotId,
        order_item_id: itemId,
        quantity: cartItems[idx]?.quantity || 1,
        notes: cartItems[idx]?.itemNote?.trim() || null,
        status: 'pending',
      }));

      await supabase.from('kot_items').insert(kotItemsToInsert);
    }

    // 5. Update order and table statuses
    await supabase
      .from('orders')
      .update({ status: 'in_kitchen', updated_at: new Date().toISOString() })
      .eq('id', order.id);

    if (order.table_session_id) {
      const { data: session } = await supabase
        .from('table_sessions')
        .select('table_id')
        .eq('id', order.table_session_id)
        .maybeSingle();

      if (session?.table_id) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'occupied', updated_at: new Date().toISOString() })
          .eq('id', session.table_id);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      roundId,
      kotId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
