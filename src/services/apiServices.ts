import { createClient } from '@/lib/supabase/client';

export interface SaveAndBillParams {
  tableSessionId: string;
  cartItems?: any[];
  paymentMethod?: string;
  isPaid?: boolean;
  notes?: string;
}

export async function saveAndBill({
  tableSessionId,
  cartItems = [],
  paymentMethod = 'cash',
  isPaid = false,
  notes,
}: SaveAndBillParams) {
  const supabase = createClient();

  // 1. Ensure validSessionId exists in table_sessions
  let validSessionId: string | null = null;

  if (tableSessionId) {
    const { data: existingSession } = await supabase
      .from('table_sessions')
      .select('id')
      .eq('id', tableSessionId)
      .maybeSingle();

    if (existingSession?.id) {
      validSessionId = existingSession.id;
    }
  } else {
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
          const { data: anySess } = await supabase
            .from('table_sessions')
            .select('id')
            .eq('table_id', targetTableId)
            .limit(1)
            .maybeSingle();
          validSessionId = anySess?.id || freshSessionId;
        }
      }
    }
  }

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
        notes: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (createOrderErr) {
      throw new Error(createOrderErr.message);
    }
    order = createdOrder;
  }

  if (!order) {
    throw new Error('Failed to find or create order');
  }

  // 3. Save items into order_rounds if cartItems present
  if (cartItems.length > 0) {
    const { data: rounds } = await supabase
      .from('order_rounds')
      .select('round_number')
      .eq('order_id', order.id)
      .order('round_number', { ascending: false })
      .limit(1);

    const nextRoundNum = rounds && rounds.length > 0 ? (rounds[0].round_number || 0) + 1 : 1;
    const roundId = crypto.randomUUID();

    await supabase.from('order_rounds').insert({
      id: roundId,
      order_id: order.id,
      round_number: nextRoundNum,
      created_at: new Date().toISOString(),
    });

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
      const resolvedMenuId = item.menuItemId && validMenuSet.has(item.menuItemId) ? item.menuItemId : null;
      return {
        id: crypto.randomUUID(),
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

    await supabase.from('order_items').insert(orderItemsToInsert);
  }

  // 4. Fetch all order items across all rounds for this order
  const { data: allRounds } = await supabase
    .from('order_rounds')
    .select('id')
    .eq('order_id', order.id);

  const roundIds = (allRounds || []).map((r: any) => r.id);
  let allOrderItems: any[] = [];
  if (roundIds.length > 0) {
    const { data: fetchedItems } = await supabase
      .from('order_items')
      .select('*')
      .in('order_round_id', roundIds);
    allOrderItems = fetchedItems || [];

    const menuItemIds = Array.from(new Set(allOrderItems.map((oi: any) => oi.menu_item_id).filter(Boolean)));
    if (menuItemIds.length > 0) {
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('id, name, item_name')
        .in('id', menuItemIds);
      const menuMap = new Map((menuData || []).map((m: any) => [m.id, m.name || m.item_name]));
      allOrderItems = allOrderItems.map((oi: any) => ({
        ...oi,
        item_name: oi.item_name || oi.name || menuMap.get(oi.menu_item_id) || 'Item',
      }));
    }
  }

  // 5. Calculate Bill totals
  let subtotal = 0;
  allOrderItems.forEach((item: any) => {
    if (!item.is_complimentary) {
      subtotal += (item.unit_price || 0) * (item.quantity || 1);
    }
  });

  const grandTotal = subtotal;
  const paymentStatus = isPaid ? 'paid' : 'unpaid';
  const billStatus = isPaid ? 'paid' : 'issued';

  // 6. Create or Update Bill
  let { data: existingBill } = await supabase
    .from('bills')
    .select('*')
    .eq('table_session_id', validSessionId)
    .not('status', 'eq', 'voided')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let billId = existingBill?.id;
  if (!existingBill) {
    billId = crypto.randomUUID();
    const insertPayload: any = {
      id: billId,
      table_session_id: validSessionId,
      subtotal,
      discount_amount: 0,
      tax_amount: 0,
      grand_total: grandTotal,
      payment_status: paymentStatus,
      status: billStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: billInsertErr } = await supabase.from('bills').insert(insertPayload);
    if (billInsertErr) {
      await supabase.from('bills').insert({
        id: billId,
        table_session_id: validSessionId,
        subtotal,
        grand_total: grandTotal,
        payment_status: paymentStatus,
        created_at: new Date().toISOString(),
      });
    }
  } else {
    await supabase
      .from('bills')
      .update({
        subtotal,
        grand_total: grandTotal,
        payment_status: paymentStatus,
        status: billStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', billId);
  }

  // 7. Insert Bill Items
  if (billId && allOrderItems.length > 0) {
    await supabase.from('bill_items').delete().eq('bill_id', billId);
    for (const oi of allOrderItems) {
      const itemName = oi.item_name || oi.name || 'Item';
      const totalPrice = oi.is_complimentary ? 0 : (oi.unit_price || 0) * (oi.quantity || 1);

      const { error: itemInsertErr } = await supabase.from('bill_items').insert({
        id: crypto.randomUUID(),
        bill_id: billId,
        order_item_id: oi.id,
        item_name_snapshot: itemName,
        item_name: itemName,
        quantity: oi.quantity || 1,
        unit_price: oi.unit_price || 0,
        line_total: totalPrice,
        total_price: totalPrice,
      });

      if (itemInsertErr) {
        await supabase.from('bill_items').insert({
          id: crypto.randomUUID(),
          bill_id: billId,
          order_item_id: oi.id,
          quantity: oi.quantity || 1,
          unit_price: oi.unit_price || 0,
          total_price: totalPrice,
        });
      }
    }
  }

  // 8. If paid, record payment & update session / table
  if (isPaid && billId) {
    const { error: payErr } = await supabase.from('payments').insert({
      id: crypto.randomUUID(),
      bill_id: billId,
      payment_method: paymentMethod || 'cash',
      amount: grandTotal,
      created_at: new Date().toISOString(),
    });
    if (payErr) {
      await supabase.from('payments').insert({
        id: crypto.randomUUID(),
        bill_id: billId,
        amount: grandTotal,
      });
    }

    await supabase
      .from('orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', order.id);

    await supabase
      .from('table_sessions')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', tableSessionId);

    const { data: sessionData } = await supabase
      .from('table_sessions')
      .select('table_id')
      .eq('id', tableSessionId)
      .maybeSingle();

    if (sessionData?.table_id) {
      await supabase
        .from('restaurant_tables')
        .update({ status: 'available', updated_at: new Date().toISOString() })
        .eq('id', sessionData.table_id);
    }
  }

  let resolvedTableId: string | null = null;
  if (order.table_session_id) {
    const { data: sessionData } = await supabase
      .from('table_sessions')
      .select('table_id')
      .eq('id', order.table_session_id)
      .maybeSingle();
    if (sessionData?.table_id) {
      resolvedTableId = sessionData.table_id;
    }
  }

  return {
    success: true,
    billId,
    orderId: order.id,
    tableId: resolvedTableId,
  };
}

export async function submitKot({ tableSessionId, cartItems = [] }: { tableSessionId?: string; cartItems?: any[] }) {
  const supabase = createClient();
  let validSessionId: string | null = null;

  if (tableSessionId) {
    const { data: existingSession } = await supabase
      .from('table_sessions')
      .select('id, table_id')
      .eq('id', tableSessionId)
      .maybeSingle();

    if (existingSession?.id) {
      validSessionId = existingSession.id;
    }
  } else {
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
      throw new Error(createOrderErr.message);
    }
    order = createdOrder;
  }

  if (!order) {
    throw new Error('Failed to find or create order');
  }

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
    throw new Error(roundErr.message);
  }

  const createdItemIds: string[] = [];
  if (cartItems.length > 0) {
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
      throw new Error(itemsErr.message);
    }
  }

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

  return {
    success: true,
    orderId: order.id,
    roundId,
    kotId,
    kotDocument,
  };
}

export async function openTable({ tableId, guestCount = 2 }: { tableId: string; guestCount?: number }) {
  if (!tableId) {
    throw new Error('tableId is required');
  }

  const supabase = createClient();
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
    throw new Error('Restaurant table not found');
  }

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

    return { success: true, sessionId: existingActive.id, tableId: targetTableId };
  }

  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('open_table_session', {
      p_table_id: targetTableId,
      p_guest_count: guestCount,
    });

    if (!rpcErr && rpcData) {
      return { success: true, sessionId: rpcData, tableId: targetTableId };
    }
  } catch {
    // Fallback
  }

  const newSessionId = crypto.randomUUID();
  const { error: sessionErr } = await supabase.from('table_sessions').insert({
    id: newSessionId,
    table_id: targetTableId,
    status: 'active',
    opened_at: new Date().toISOString(),
  });

  if (sessionErr) {
    await supabase.from('table_sessions').insert({
      id: newSessionId,
      table_id: targetTableId,
      status: 'active',
    });
  }

  await supabase
    .from('restaurant_tables')
    .update({ status: 'occupied', updated_at: new Date().toISOString() })
    .eq('id', targetTableId);

  return { success: true, sessionId: newSessionId, tableId: targetTableId };
}

export async function resetTable({ tableId }: { tableId: string }) {
  if (!tableId) {
    throw new Error('Table ID is required');
  }

  const supabase = createClient();

  await supabase
    .from('table_sessions')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('table_id', tableId)
    .in('status', ['active', 'open']);

  const { error: tableErr } = await supabase
    .from('restaurant_tables')
    .update({ status: 'available', updated_at: new Date().toISOString() })
    .eq('id', tableId);

  if (tableErr) {
    throw new Error(tableErr.message);
  }

  return { success: true, message: 'Table marked as blank (available).' };
}

let menuCache: { categories: any[]; menuItems: any[]; timestamp: number } | null = null;

export async function fetchMenu(forceRefresh: boolean = false) {
  const now = Date.now();
  // Return cached menu instantly if available within 60s cache window unless forceRefresh is set
  if (!forceRefresh && menuCache && now - menuCache.timestamp < 60000) {
    return { categories: menuCache.categories, menuItems: menuCache.menuItems };
  }

  const supabase = createClient();
  const [catsRes, itemsRes] = await Promise.all([
    supabase.from('menu_categories').select('*'),
    supabase.from('menu_items').select('*'),
  ]);

  const categories = catsRes.data || [];
  const rawItems = itemsRes.data || [];

  const menuItems = rawItems.map((item: any) => ({
    ...item,
    name: item.name || item.item_name || 'Unnamed Item',
    price: Number(item.price || 0),
    is_available: item.is_available !== false,
    is_veg: item.is_veg !== false,
  }));

  menuCache = { categories, menuItems, timestamp: now };
  return { categories, menuItems };
}
