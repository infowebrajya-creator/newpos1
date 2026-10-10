import { createClient } from '@/lib/supabase/server';
import { Floor, RestaurantTable, TableSession, TableWithSession, TableStats } from '@/types/tables';

/**
 * Fetch all active floors (Server Side)
 */
export async function getServerFloors(): Promise<Floor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('floors').select('*');

  if (error || !data) {
    return [];
  }

  return (data as Floor[]).filter((f) => f.is_active !== false);
}

/**
 * Fetch all tables with active sessions and floor info (Server Side)
 */
export async function getServerTablesWithActiveSessions(): Promise<TableWithSession[]> {
  const supabase = await createClient();

  let tablesData: RestaurantTable[] = [];
  let floorsData: Floor[] = [];
  let activeSessions: TableSession[] = [];

  try {
    const [tablesRes, floorsRes, sessionsRes] = await Promise.all([
      supabase.from('restaurant_tables').select('*'),
      supabase.from('floors').select('*'),
      supabase.from('table_sessions').select('*').in('status', ['active', 'open']),
    ]);

    tablesData = (tablesRes.data as RestaurantTable[]) || [];
    floorsData = (floorsRes.data as Floor[]) || [];
    activeSessions = (sessionsRes.data as TableSession[]) || [];
  } catch {
    tablesData = [];
  }

  tablesData = tablesData.filter((t) => t.is_active !== false);
  floorsData = floorsData.filter((f) => f.is_active !== false);

  if (tablesData.length === 0) {
    return [];
  }

  const floorMap = new Map<string, string>();
  floorsData.forEach((f) => floorMap.set(f.id, f.name));

  const sessionMap = new Map<string, TableSession>();
  const sessionIds: string[] = [];
  activeSessions.forEach((s) => {
    sessionMap.set(s.table_id, s);
    sessionIds.push(s.id);
  });

  const activeOrderMap = new Map<string, { order_id: string; order_number?: string | number; total_amount?: number; items_count?: number }>();

  if (sessionIds.length > 0) {
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, table_session_id, order_number, status')
        .in('table_session_id', sessionIds)
        .not('status', 'in', '("closed","cancelled","paid")');

      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map((o) => o.id);
        const { data: roundsData } = await supabase
          .from('order_rounds')
          .select('id, order_id')
          .in('order_id', orderIds);

        const roundMap = new Map<string, string>();
        const roundIds: string[] = [];
        (roundsData || []).forEach((r) => {
          roundMap.set(r.id, r.order_id);
          roundIds.push(r.id);
        });

        const orderTotals = new Map<string, { total: number; count: number }>();
        if (roundIds.length > 0) {
          const { data: itemsData } = await supabase
            .from('order_items')
            .select('order_round_id, unit_price, quantity, is_complimentary')
            .in('order_round_id', roundIds);

          (itemsData || []).forEach((item) => {
            const orderId = roundMap.get(item.order_round_id);
            if (orderId) {
              const current = orderTotals.get(orderId) || { total: 0, count: 0 };
              const itemTotal = item.is_complimentary ? 0 : (item.unit_price || 0) * (item.quantity || 1);
              orderTotals.set(orderId, {
                total: current.total + itemTotal,
                count: current.count + (item.quantity || 1),
              });
            }
          });
        }

        ordersData.forEach((ord) => {
          const stats = orderTotals.get(ord.id) || { total: 0, count: 0 };
          activeOrderMap.set(ord.table_session_id, {
            order_id: ord.id,
            order_number: ord.order_number ?? undefined,
            total_amount: stats.total,
            items_count: stats.count,
          });
        });
      }
    } catch {
      // Ignore order calculation error
    }
  }

  return tablesData
    .map((table) => {
      const session = sessionMap.get(table.id) || null;
      const activeOrder = session ? activeOrderMap.get(session.id) || null : null;
      const effectiveStatus = activeOrder
        ? (table.status === 'available' ? 'occupied' : table.status)
        : 'available';
      return {
        ...table,
        status: effectiveStatus as any,
        floor_name: table.floor_id ? floorMap.get(table.floor_id) || null : null,
        active_session: activeOrder ? session : null,
        active_order: activeOrder,
      };
    })
    .sort((a, b) => {
      const numA = parseInt(a.table_number.replace(/[^0-9]/g, ''), 10);
      const numB = parseInt(b.table_number.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return a.table_number.localeCompare(b.table_number, undefined, { numeric: true, sensitivity: 'base' });
    });
}

/**
 * Get real-time table statistics for dashboard stat cards (Server Side)
 */
export async function getServerTableStats(): Promise<TableStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('restaurant_tables').select('status, is_active');

  if (error || !data) {
    return {
      totalTables: 0,
      availableTables: 0,
      occupiedTables: 0,
      reservedTables: 0,
      billRequestedTables: 0,
      paymentPendingTables: 0,
      outOfServiceTables: 0,
    };
  }

  const activeData = (data as { status: string; is_active?: boolean }[]).filter((row) => row.is_active !== false);

  const stats: TableStats = {
    totalTables: activeData.length,
    availableTables: 0,
    occupiedTables: 0,
    reservedTables: 0,
    billRequestedTables: 0,
    paymentPendingTables: 0,
    outOfServiceTables: 0,
  };

  activeData.forEach((row) => {
    switch (row.status) {
      case 'available':
        stats.availableTables++;
        break;
      case 'occupied':
        stats.occupiedTables++;
        break;
      case 'reserved':
        stats.reservedTables++;
        break;
      case 'bill_requested':
        stats.billRequestedTables++;
        break;
      case 'payment_pending':
        stats.paymentPendingTables++;
        break;
      case 'out_of_service':
        stats.outOfServiceTables++;
        break;
    }
  });

  return stats;
}
