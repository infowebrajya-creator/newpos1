import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const {
      tableSessionId,
      cartItems = [],
      paymentMethod = 'cash',
      isPaid = false,
      notes,
    } = await req.json();

    if (!tableSessionId) {
      return NextResponse.json({ error: 'tableSessionId is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Robustly ensure validSessionId exists in table_sessions table to satisfy FK constraint
    let validSessionId: string | null = null;

    const { data: existingSession } = await supabase
      .from('table_sessions')
      .select('id')
      .eq('id', tableSessionId)
      .maybeSingle();

    if (existingSession?.id) {
      validSessionId = existingSession.id;
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
            guest_count: 2,
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
        return NextResponse.json({ error: createOrderErr.message }, { status: 500 });
      }
      order = createdOrder;
    }

    if (!order) {
      return NextResponse.json({ error: 'Failed to find or create order' }, { status: 500 });
    }

    // 2. If cartItems has items, save them into a new order round
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

      const orderItemsToInsert = cartItems.map((item: any) => ({
        id: crypto.randomUUID(),
        order_round_id: roundId,
        menu_item_id: item.menuItemId || null,
        quantity: item.quantity || 1,
        unit_price: item.unitPrice || 0,
        notes: item.itemNote?.trim() || null,
        is_complimentary: !!item.isComplimentary,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      await supabase.from('order_items').insert(orderItemsToInsert);
    }

    // 3. Fetch all order items across all rounds for this order
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

      // Resolve menu item names if item_name is missing
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

    // 4. Calculate Bill totals
    let subtotal = 0;
    allOrderItems.forEach((item: any) => {
      if (!item.is_complimentary) {
        subtotal += (item.unit_price || 0) * (item.quantity || 1);
      }
    });

    const grandTotal = subtotal; // 0.00% tax
    const paymentStatus = isPaid ? 'paid' : 'unpaid';
    const billStatus = isPaid ? 'paid' : 'issued';

    // 5. Create or Update Bill
    let { data: existingBill } = await supabase
      .from('bills')
      .select('*')
      .eq('order_id', order.id)
      .maybeSingle();

    let billId = existingBill?.id;
    if (!existingBill) {
      billId = crypto.randomUUID();
      const { error: billInsertErr } = await supabase.from('bills').insert({
        id: billId,
        order_id: order.id,
        table_session_id: tableSessionId,
        subtotal,
        discount_amount: 0,
        tax_amount: 0,
        service_charge_amount: 0,
        final_amount: grandTotal,
        payment_status: paymentStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (billInsertErr) {
        // Retry insert without table_session_id if schema doesn't have that column
        await supabase.from('bills').insert({
          id: billId,
          order_id: order.id,
          subtotal,
          discount_amount: 0,
          tax_amount: 0,
          service_charge_amount: 0,
          final_amount: grandTotal,
          payment_status: paymentStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      await supabase
        .from('bills')
        .update({
          subtotal,
          final_amount: grandTotal,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', billId);
    }

    // 6. Insert Bill Items
    if (billId && allOrderItems.length > 0) {
      await supabase.from('bill_items').delete().eq('bill_id', billId);
      const billItemsToInsert = allOrderItems.map((oi: any) => {
        const itemName = oi.item_name || oi.name || 'Item';
        const totalPrice = oi.is_complimentary ? 0 : (oi.unit_price || 0) * (oi.quantity || 1);
        return {
          id: crypto.randomUUID(),
          bill_id: billId,
          order_item_id: oi.id,
          item_name_snapshot: itemName,
          item_name: itemName,
          quantity: oi.quantity || 1,
          unit_price: oi.unit_price || 0,
          line_total: totalPrice,
          total_price: totalPrice,
        };
      });

      await supabase.from('bill_items').insert(billItemsToInsert);
    }

    // 7. If paid, record payment & update session / table
    if (isPaid && billId) {
      await supabase.from('payments').insert({
        id: crypto.randomUUID(),
        bill_id: billId,
        payment_method: paymentMethod || 'cash',
        amount: grandTotal,
        status: 'completed',
        created_at: new Date().toISOString(),
      });

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
    } else if (order.table_session_id) {
      // If billed but unpaid, mark order billed and table bill_requested
      await supabase
        .from('orders')
        .update({ status: 'billed', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      const { data: sessionData } = await supabase
        .from('table_sessions')
        .select('table_id')
        .eq('id', tableSessionId)
        .maybeSingle();

      if (sessionData?.table_id) {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'bill_requested', updated_at: new Date().toISOString() })
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

    return NextResponse.json({
      success: true,
      billId,
      orderId: order.id,
      tableId: resolvedTableId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to save and bill' }, { status: 500 });
  }
}
