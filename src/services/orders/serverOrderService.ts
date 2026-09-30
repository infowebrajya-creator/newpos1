import { createClient } from '@/lib/supabase/server';
import { Order, OrderRound, OrderItem } from '@/types/orders';
import { KOT } from '@/types/kitchen';
import { DetailedOrderRound, SessionOrderDetails, RecentOrderOverview } from '@/services/orders/orderService';

/**
 * Check if an active order exists for a table session (Server Side)
 */
export async function getServerActiveOrderForSession(tableSessionId: string): Promise<Order | null> {
  const supabase = await createClient();
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
 * Fetch detailed order history for a table session (Server Side)
 */
export async function getServerOrderDetailsForSession(
  tableSessionId: string
): Promise<SessionOrderDetails> {
  const activeOrder = await getServerActiveOrderForSession(tableSessionId);
  if (!activeOrder) {
    return { order: null, rounds: [] };
  }

  const supabase = await createClient();
  const [roundsRes, itemsRes, kotsRes] = await Promise.all([
    supabase
      .from('order_rounds')
      .select('*')
      .eq('order_id', activeOrder.id)
      .order('round_number', { ascending: true }),
    supabase.from('order_items').select('*'),
    supabase.from('kots').select('*').eq('order_id', activeOrder.id),
  ]);

  const rawRounds = (roundsRes.data as OrderRound[]) || [];
  const rawItems = (itemsRes.data as OrderItem[]) || [];
  const rawKots = (kotsRes.data as KOT[]) || [];

  const kotMap = new Map<string, KOT>();
  rawKots.forEach((k) => kotMap.set(k.order_round_id, k));

  const itemsByRound = new Map<string, OrderItem[]>();
  rawItems.forEach((item) => {
    if (!itemsByRound.has(item.order_round_id)) {
      itemsByRound.set(item.order_round_id, []);
    }
    itemsByRound.get(item.order_round_id)!.push(item);
  });

  const rounds: DetailedOrderRound[] = rawRounds.map((round) => ({
    ...round,
    items: itemsByRound.get(round.id) || [],
    kot: kotMap.get(round.id) || null,
  }));

  return { order: activeOrder, rounds };
}

/**
 * Fetch all recent orders for the Order Management screen (Server Side)
 */
export async function getServerAllRecentOrders(): Promise<RecentOrderOverview[]> {
  const supabase = await createClient();

  const [ordersRes, roundsRes, itemsRes, kotsRes, sessionsRes, tablesRes] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('order_rounds').select('*'),
    supabase.from('order_items').select('*'),
    supabase.from('kots').select('*'),
    supabase.from('table_sessions').select('*'),
    supabase.from('restaurant_tables').select('*'),
  ]);

  if (ordersRes.error || !ordersRes.data) {
    return [];
  }

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
        itemSummaries.push(`${item.quantity || 1}× ${item.item_name}`);
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
