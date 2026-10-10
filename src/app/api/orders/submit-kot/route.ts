import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { tableSessionId, cartItems = [] } = await req.json();

    if (!tableSessionId) {
      return Response.json({ error: 'tableSessionId is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Robustly ensure validSessionId exists in table_sessions table to satisfy FK constraint
    let validSessionId: string | null = null;

    // Check if tableSessionId is already a valid id in table_sessions
    const { data: existingSession } = await supabase
      .from('table_sessions')
      .select('id, table_id')
      .eq('id', tableSessionId)
      .maybeSingle();

    if (existingSession?.id) {
      validSessionId = existingSession.id;
    } else {
      // Find matching table by ID or table_number variations (e.g. 'T-03', 'TT-03', '3')
      const cleanNum = String(tableSessionId).replace(/^TT-|^T-/, '');
      const formattedNum = `T-${cleanNum.padStart(2, '0')}`;
      const shortFormattedNum = `T-${cleanNum}`;

      const { data: matchedTable } = await supabase
        .from('restaurant_tables')
        .select('id')
        .or(`id.eq.${tableSessionId},table_number.eq.${tableSessionId},table_number.eq.${formattedNum},table_number.eq.${shortFormattedNum},table_number.eq.${cleanNum}`)
        .limit(1)
        .maybeSingle();

      let targetTableId = matchedTable?.id;
      if (!targetTableId) {
        const { data: firstTable } = await supabase.from('restaurant_tables').select('id').limit(1).maybeSingle();
        targetTableId = firstTable?.id;
      }

      if (targetTableId) {
        // Check if targetTableId already has an active session
        const { data: activeSessForTable } = await supabase
          .from('table_sessions')
          .select('id')
          .eq('table_id', targetTableId)
          .in('status', ['active', 'open'])
          .order('opened_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeSessForTable?.id) {
          validSessionId = activeSessForTable.id;
        } else {
          const freshSessionId = crypto.randomUUID();
          const { error: insertSessErr } = await supabase.from('table_sessions').insert({
            id: freshSessionId,
            table_id: targetTableId,
            status: 'active',
            opened_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });

          if (!insertSessErr) {
            validSessionId = freshSessionId;
          } else {
            // Re-fetch any session for table
            const { data: anySess } = await supabase
              .from('table_sessions')
              .select('id')
              .eq('table_id', targetTableId)
              .limit(1)
              .maybeSingle();
            validSessionId = anySess?.id || freshSessionId;
          }
        }

        await supabase
          .from('restaurant_tables')
          .update({ status: 'occupied', updated_at: new Date().toISOString() })
          .eq('id', targetTableId);
      }
    }

    // Ultimate safety check to ensure validSessionId is never invalid
    if (!validSessionId) {
      const { data: fallbackSess } = await supabase.from('table_sessions').select('id').limit(1).maybeSingle();
      if (fallbackSess?.id) {
        validSessionId = fallbackSess.id;
      } else {
        const emergencySessId = crypto.randomUUID();
        const { data: anyTable } = await supabase.from('restaurant_tables').select('id').limit(1).maybeSingle();
        await supabase.from('table_sessions').insert({
          id: emergencySessId,
          table_id: anyTable?.id || null,
          status: 'active',
          opened_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
        validSessionId = emergencySessId;
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
        return Response.json({ error: createOrderErr.message }, { status: 500 });
      }
      order = createdOrder;
    }

    if (!order) {
      return Response.json({ error: 'Failed to find or create order' }, { status: 500 });
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
      return Response.json({ error: roundErr.message }, { status: 500 });
    }

    // 3. Insert order items if provided
    const createdItemIds: string[] = [];
    if (cartItems.length > 0) {
      // Fetch valid menu_item_ids from database to satisfy FK constraint
      const inputMenuIds = cartItems.map((i: any) => i.menuItemId).filter(Boolean);
      let validMenuSet = new Set<string>();
      if (inputMenuIds.length > 0) {
        const { data: dbMenuItems } = await supabase
          .from('menu_items')
          .select('id')
          .in('id', inputMenuIds);
        validMenuSet = new Set((dbMenuItems || []).map((m: any) => m.id));
      }

      const orderItemsToInsert = cartItems.map((item: any) => {
        const itemId = crypto.randomUUID();
        createdItemIds.push(itemId);
        const resolvedMenuId = item.menuItemId && validMenuSet.has(item.menuItemId) ? item.menuItemId : null;
        return {
          id: itemId,
          order_round_id: roundId,
          menu_item_id: resolvedMenuId,
          item_name: item.itemName || item.name || 'Item',
          quantity: item.quantity || 1,
          unit_price: item.unitPrice || 0,
          notes: item.itemNote?.trim() || null,
          is_complimentary: !!item.isComplimentary,
          created_at: new Date().toISOString(),
        };
      });

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsToInsert);
      if (itemsErr) {
        return Response.json({ error: itemsErr.message }, { status: 500 });
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

    let tableNumStr = 'T-1';
    let floorNameStr = 'Main Floor';

    if (order.table_session_id) {
      const { data: session } = await supabase
        .from('table_sessions')
        .select('table_id')
        .eq('id', order.table_session_id)
        .maybeSingle();

      if (session?.table_id) {
        const { data: tableData } = await supabase
          .from('restaurant_tables')
          .select('table_number, floor_id')
          .eq('id', session.table_id)
          .maybeSingle();

        if (tableData) {
          tableNumStr = tableData.table_number ? (tableData.table_number.startsWith('T-') ? tableData.table_number : `T-${tableData.table_number}`) : 'T-1';
          if (tableData.floor_id) {
            const { data: floorData } = await supabase
              .from('floors')
              .select('name')
              .eq('id', tableData.floor_id)
              .maybeSingle();
            if (floorData?.name) {
              floorNameStr = floorData.name;
            }
          }
        }

        await supabase
          .from('restaurant_tables')
          .update({ status: 'occupied', updated_at: new Date().toISOString() })
          .eq('id', session.table_id);
      }
    }

    const kotDate = new Date();
    const kotDocument = {
      kotId,
      kotNumber: kotId.slice(0, 8),
      roundNumber: nextRoundNum,
      date: kotDate.toLocaleDateString('en-IN'),
      time: kotDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      tableNumber: tableNumStr,
      floorName: floorNameStr,
      items: cartItems.map((item: any) => ({
        name: item.itemName || 'Item',
        quantity: Number(item.quantity || 1),
        itemNote: item.itemNote?.trim() || null,
      })),
      notes: null,
      isReprint: false,
    };

    return Response.json({
      success: true,
      orderId: order.id,
      roundId,
      kotId,
      kotDocument,
    });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
