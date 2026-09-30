import { createClient } from '@/lib/supabase/client';
import { KOTStatus, KitchenOrderView, KOTItem } from '@/types/kitchen';

/**
 * Submit an order round batch to the kitchen using public.submit_round_to_kitchen RPC, with direct table fallback
 */
export async function submitRoundToKitchen(roundId: string): Promise<string> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('submit_round_to_kitchen', {
      p_round_id: roundId,
    });

    if (!error && data) {
      return data as string;
    }
  } catch {
    // RPC failed or missing
  }

  // Fallback direct table insertion
  const { data: round } = await supabase
    .from('order_rounds')
    .select('order_id')
    .eq('id', roundId)
    .single();

  const orderId = round?.order_id;
  const kotId = crypto.randomUUID();

  const { error: kotErr } = await supabase.from('kots').insert({
    id: kotId,
    order_round_id: roundId,
    order_id: orderId,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (kotErr) {
    throw new Error(kotErr.message);
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('id, quantity, notes')
    .eq('order_round_id', roundId);

  if (items && items.length > 0) {
    const kotItemsToInsert = items.map((item) => ({
      id: crypto.randomUUID(),
      kot_id: kotId,
      order_item_id: item.id,
      quantity: item.quantity,
      notes: item.notes,
      status: 'pending',
    }));

    await supabase.from('kot_items').insert(kotItemsToInsert);
  }

  if (orderId) {
    await supabase.from('orders').update({ status: 'in_kitchen' }).eq('id', orderId);
  }

  return kotId;
}

/**
 * Update KOT status using public.kitchen_update_status RPC
 */
export async function updateKitchenStatus(kotId: string, status: KOTStatus): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('kitchen_update_status', {
    p_kot_id: kotId,
    p_status: status,
  });

  if (error) {
    throw new Error(error.message);
  }

  return !!data;
}

/**
 * Fetch all active and recent KOTs with table and item details (Client Side)
 */
export async function getKitchenOrders(): Promise<KitchenOrderView[]> {
  const supabase = createClient();

  const [kotsRes, kotItemsRes, orderItemsRes, roundsRes, ordersRes, sessionsRes, tablesRes] =
    await Promise.all([
      supabase.from('kots').select('*').order('created_at', { ascending: true }),
      supabase.from('kot_items').select('*'),
      supabase.from('order_items').select('*'),
      supabase.from('order_rounds').select('*'),
      supabase.from('orders').select('*'),
      supabase.from('table_sessions').select('*'),
      supabase.from('restaurant_tables').select('*'),
    ]);

  if (kotsRes.error || !kotsRes.data) {
    return [];
  }

  const kotItemsMap = new Map<string, any[]>();
  (kotItemsRes.data || []).forEach((ki) => {
    if (!kotItemsMap.has(ki.kot_id)) {
      kotItemsMap.set(ki.kot_id, []);
    }
    kotItemsMap.get(ki.kot_id)!.push(ki);
  });

  const orderItemMap = new Map<string, any>();
  (orderItemsRes.data || []).forEach((oi) => orderItemMap.set(oi.id, oi));

  const roundMap = new Map<string, any>();
  (roundsRes.data || []).forEach((r) => roundMap.set(r.id, r));

  const orderMap = new Map<string, any>();
  (ordersRes.data || []).forEach((o) => orderMap.set(o.id, o));

  const sessionMap = new Map<string, any>();
  (sessionsRes.data || []).forEach((s) => sessionMap.set(s.id, s));

  const tableMap = new Map<string, any>();
  (tablesRes.data || []).forEach((t) => tableMap.set(t.id, t));

  return (kotsRes.data || []).map((kot) => {
    const rawItems = kotItemsMap.get(kot.id) || [];
    const items: KOTItem[] = rawItems.map((ki) => {
      const oi = orderItemMap.get(ki.order_item_id) || {};
      return {
        id: ki.id,
        kot_id: ki.kot_id,
        order_item_id: ki.order_item_id,
        quantity: ki.quantity,
        created_at: ki.created_at,
        item_name: oi.item_name || oi.name || 'Item',
        item_note: oi.item_note || null,
        is_complimentary: !!oi.is_complimentary,
      };
    });

    const round = roundMap.get(kot.order_round_id) || {};
    const order = orderMap.get(kot.order_id) || {};
    const session = sessionMap.get(order.table_session_id) || {};
    const table = tableMap.get(session.table_id) || {};

    return {
      id: kot.id,
      order_id: kot.order_id,
      order_round_id: kot.order_round_id,
      kot_number: kot.kot_number || '1',
      status: (kot.status as KOTStatus) || 'new',
      created_at: kot.created_at,
      table_number: table.table_number || 'T-',
      session_number: session.session_number || '1',
      guest_count: session.guest_count || 1,
      order_number: order.order_number || '1',
      round_number: round.round_number || 1,
      items,
    };
  });
}
