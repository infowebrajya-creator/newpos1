import { createClient } from '@/lib/supabase/client';
import { CartItem, BatchOrderItemInput } from '@/types/menu';
import { Order, OrderRound, OrderItem } from '@/types/orders';
import { KOT } from '@/types/kitchen';

export interface DetailedOrderRound extends OrderRound {
  items: OrderItem[];
  kot?: KOT | null;
}

export interface SessionOrderDetails {
  order: Order | null;
  rounds: DetailedOrderRound[];
}

export interface RecentOrderOverview {
  id: string;
  order_number: string | number;
  table_id?: string;
  table_number: string;
  table_session_id?: string;
  session_number: string | number;
  order_type: string;
  status: string;
  created_at: string;
  rounds_count: number;
  latest_kot_status?: string | null;
  total_amount?: number;
  total_items?: number;
  items_summary?: string;
}

/**
 * Check if an active (unclosed) order already exists for a table session
 */
export async function getActiveOrderForSession(tableSessionId: string): Promise<Order | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('table_session_id', tableSessionId)
    .not('status', 'in', '("closed","cancelled","paid")')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Order;
}

/**
 * Create a new order using public.create_order RPC, with fallback to direct table insertion
 */
export async function createOrder(tableSessionId: string, notes?: string): Promise<string> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('create_order', {
      p_table_session_id: tableSessionId,
      p_order_type: 'dine_in',
      p_notes: notes || null,
    });

    if (!error && data) {
      return data as string;
    }
  } catch {
    // RPC failed or function missing, fallback below
  }

  // Check if active order exists
  const activeOrder = await getActiveOrderForSession(tableSessionId);
  if (activeOrder) {
    return activeOrder.id;
  }

  // Direct table insert fallback
  const newOrderId = crypto.randomUUID();
  const { data: inserted, error: insertErr } = await supabase
    .from('orders')
    .insert({
      id: newOrderId,
      table_session_id: tableSessionId,
      order_type: 'dine_in',
      status: 'open',
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    throw new Error(insertErr?.message || 'Failed to create order');
  }

  return inserted.id;
}

/**
 * Add a new order round batch using public.add_order_round_batch RPC, with API route / direct table fallback
 */
export async function addOrderRoundBatch(
  orderId: string,
  cartItems: CartItem[]
): Promise<string> {
  const supabase = createClient();

  const formattedItems: BatchOrderItemInput[] = cartItems.map((item) => ({
    menu_item_id: item.menuItemId,
    quantity: item.quantity,
    item_note: item.itemNote?.trim() || null,
    is_complimentary: !!item.isComplimentary,
  }));

  try {
    const { data, error } = await supabase.rpc('add_order_round_batch', {
      p_order_id: orderId,
      p_items: formattedItems,
    });

    if (!error && data) {
      return data as string;
    }
  } catch {
    // RPC failed or missing
  }

  // Direct fallback insertion
  const { data: rounds } = await supabase
    .from('order_rounds')
    .select('round_number')
    .eq('order_id', orderId)
    .order('round_number', { ascending: false })
    .limit(1);

  const nextRoundNum = rounds && rounds.length > 0 ? (rounds[0].round_number || 0) + 1 : 1;
  const roundId = crypto.randomUUID();

  const { error: roundErr } = await supabase.from('order_rounds').insert({
    id: roundId,
    order_id: orderId,
    round_number: nextRoundNum,
    created_at: new Date().toISOString(),
  });

  if (roundErr) {
    throw new Error(roundErr.message);
  }

  if (cartItems.length > 0) {
    const itemsToInsert = cartItems.map((item) => ({
      id: crypto.randomUUID(),
      order_round_id: roundId,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      notes: item.itemNote?.trim() || null,
      is_complimentary: !!item.isComplimentary,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
    if (itemsErr) {
      throw new Error(itemsErr.message);
    }
  }

  return roundId;
}

/**
 * Fetch detailed order history for a table session (rounds, items, KOTs)
 */
export async function getOrderDetailsForSession(
  tableSessionId: string
): Promise<SessionOrderDetails> {
  const activeOrder = await getActiveOrderForSession(tableSessionId);
  if (!activeOrder) {
    return { order: null, rounds: [] };
  }

  const supabase = createClient();
  const [roundsRes, itemsRes, kotsRes, menuRes] = await Promise.all([
    supabase
      .from('order_rounds')
      .select('*')
      .eq('order_id', activeOrder.id)
      .order('round_number', { ascending: true }),
    supabase.from('order_items').select('*'),
    supabase.from('kots').select('*').eq('order_id', activeOrder.id),
    supabase.from('menu_items').select('id, name'),
  ]);

  const rawRounds = (roundsRes.data as OrderRound[]) || [];
  const rawItems = (itemsRes.data as any[]) || [];
  const rawKots = (kotsRes.data as KOT[]) || [];

  const menuMap = new Map<string, string>();
  (menuRes.data || []).forEach((m: any) => menuMap.set(m.id, m.name || m.item_name));

  const kotMap = new Map<string, KOT>();
  rawKots.forEach((k) => kotMap.set(k.order_round_id, k));

  const itemsByRound = new Map<string, OrderItem[]>();
  rawItems.forEach((item: any) => {
    if (!itemsByRound.has(item.order_round_id)) {
      itemsByRound.set(item.order_round_id, []);
    }
    const resolvedName =
      item.item_name ||
      item.item_name_snapshot ||
      item.name ||
      (item.menu_item_id ? menuMap.get(item.menu_item_id) : null) ||
      'Item';

    itemsByRound.get(item.order_round_id)!.push({
      ...item,
      item_name: resolvedName,
    });
  });

  const rounds: DetailedOrderRound[] = rawRounds.map((round) => ({
    ...round,
    items: itemsByRound.get(round.id) || [],
    kot: kotMap.get(round.id) || null,
  }));

  return { order: activeOrder, rounds };
}

/**
 * Fetch all recent orders for the Order Management screen
 */
export async function getAllRecentOrders(): Promise<RecentOrderOverview[]> {
  const supabase = createClient();

  const [ordersRes, roundsRes, itemsRes, kotsRes, sessionsRes, tablesRes, menuRes] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('order_rounds').select('*'),
    supabase.from('order_items').select('*'),
    supabase.from('kots').select('*'),
    supabase.from('table_sessions').select('*'),
    supabase.from('restaurant_tables').select('*'),
    supabase.from('menu_items').select('id, name'),
  ]);

  if (ordersRes.error || !ordersRes.data) {
    return [];
  }

  const menuMap = new Map<string, string>();
  (menuRes.data || []).forEach((m: any) => menuMap.set(m.id, m.name));

  const itemsByRoundMap = new Map<string, any[]>();
  (itemsRes.data || []).forEach((item) => {
    if (!itemsByRoundMap.has(item.order_round_id)) {
      itemsByRoundMap.set(item.order_round_id, []);
    }
    itemsByRoundMap.get(item.order_round_id)!.push(item);
  });

  const roundsMap = new Map<string, any[]>();
  (roundsRes.data || []).forEach((r) => {
    if (!roundsMap.has(r.order_id)) roundsMap.set(r.order_id, []);
    roundsMap.get(r.order_id)!.push(r);
  });

  const kotsMap = new Map<string, any[]>();
  (kotsRes.data || []).forEach((k) => {
    if (!kotsMap.has(k.order_id)) kotsMap.set(k.order_id, []);
    kotsMap.get(k.order_id)!.push(k);
  });

  const sessionMap = new Map<string, any>();
  (sessionsRes.data || []).forEach((s) => sessionMap.set(s.id, s));

  const tableMap = new Map<string, any>();
  (tablesRes.data || []).forEach((t) => tableMap.set(t.id, t));

  return (ordersRes.data || []).map((order) => {
    const rounds = roundsMap.get(order.id) || [];
    const kots = kotsMap.get(order.id) || [];
    const session = sessionMap.get(order.table_session_id) || {};
    const table = tableMap.get(session.table_id) || {};

    const latestKot = kots.length > 0 ? kots[kots.length - 1] : null;

    let totalAmount = 0;
    let totalItems = 0;
    const itemSummaries: string[] = [];

    rounds.forEach((rnd) => {
      const items = itemsByRoundMap.get(rnd.id) || [];
      items.forEach((item) => {
        totalItems += item.quantity || 1;
        if (!item.is_complimentary) {
          totalAmount += (item.unit_price || 0) * (item.quantity || 1);
        }
        const name = item.item_name_snapshot || item.item_name || item.name || menuMap.get(item.menu_item_id) || 'Item';
        itemSummaries.push(`${item.quantity || 1}× ${name}`);
      });
    });

    return {
      id: order.id,
      order_number: order.order_number || order.id.slice(0, 6),
      table_id: table.id || session.table_id || '',
      table_number: table.table_number || 'T-',
      table_session_id: order.table_session_id || '',
      session_number: session.session_number || '1',
      order_type: order.order_type || 'dine_in',
      status: order.status || 'open',
      created_at: order.created_at,
      rounds_count: rounds.length,
      latest_kot_status: latestKot?.status || null,
      total_amount: totalAmount,
      total_items: totalItems,
      items_summary: itemSummaries.length > 0 ? itemSummaries.slice(0, 3).join(', ') + (itemSummaries.length > 3 ? ` +${itemSummaries.length - 3} more` : '') : 'No items',
    };
  });
}

/**
 * Cancel an order using standard Supabase update
 */
export async function cancelOrder(orderId: string, reason?: string): Promise<void> {
  const supabase = createClient();
  const updatePayload: Record<string, any> = {
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  };
  if (reason) {
    updatePayload.notes = `CANCELLED: ${reason}`;
  }
  const { error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId);

  if (error) {
    throw new Error(error.message);
  }

  // Audit Log Entry
  try {
    await supabase.from('audit_logs').insert({
      action: 'CANCEL_ORDER',
      entity_type: 'order',
      entity_id: orderId,
      reason: reason || 'Order cancelled from POS workstation',
      created_at: new Date().toISOString(),
    });
  } catch (auditErr) {
    // Non-blocking audit log warning
  }
}
