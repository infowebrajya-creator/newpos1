import { createClient } from '@/lib/supabase/client';
import { Floor, RestaurantTable, TableSession, TableWithSession, TableStats } from '@/types/tables';

/**
 * Fetch all active floors
 */
export async function getFloors(): Promise<Floor[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('floors').select('*');

  if (error || !data) {
    return [];
  }

  return (data as Floor[]).filter((f) => f.is_active !== false);
}

/**
 * Fetch all active restaurant tables
 */
export async function getTables(): Promise<RestaurantTable[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('restaurant_tables').select('*');

  if (error || !data) {
    return [];
  }

  return (data as RestaurantTable[]).filter((t) => t.is_active !== false);
}

/**
 * Fetch active session for a specific table
 */
export async function getActiveTableSession(tableId: string): Promise<TableSession | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('table_sessions')
    .select('*')
    .eq('table_id', tableId)
    .in('status', ['active', 'open'])
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as TableSession;
}

/**
 * Fetch all tables with their active open sessions and floor details
 */
export async function getTablesWithActiveSessions(): Promise<TableWithSession[]> {
  const supabase = createClient();

  // Robust parallel queries with fallbacks
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

  // Filter active tables
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
      // Ignore order calculation error if tables query succeeds
    }
  }

  return tablesData
    .map((table) => {
      const session = sessionMap.get(table.id) || null;
      const activeOrder = session ? activeOrderMap.get(session.id) || null : null;
      const effectiveStatus = session && table.status === 'available' ? 'occupied' : table.status;
      return {
        ...table,
        status: effectiveStatus as any,
        floor_name: table.floor_id ? floorMap.get(table.floor_id) || null : null,
        active_session: session,
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
 * Open a new table session using public.open_table_session RPC
 */
export async function openTableSession(tableId: string, guestCount: number = 2): Promise<string> {
  // 1. Try server API route endpoint first (bypasses RLS completely)
  try {
    const res = await fetch('/api/tables/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId, guestCount }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.sessionId) return json.sessionId;
    }
  } catch {
    // Fallback to client SDK
  }

  const supabase = createClient();

  // 2. Try calling stored RPC procedure
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('open_table_session', {
      p_table_id: tableId,
      p_guest_count: guestCount,
    });

    if (!rpcErr && rpcData) {
      return rpcData as string;
    }
  } catch {
    // Ignore RPC error
  }

  // 3. Direct client fallback insert into table_sessions & update restaurant_tables status
  const newSessionId = crypto.randomUUID();
  try {
    await supabase.from('table_sessions').insert({
      id: newSessionId,
      table_id: tableId,
      guest_count: guestCount,
      status: 'active',
      opened_at: new Date().toISOString(),
    });
  } catch {
    // Ignore RLS insert exception
  }

  // Update table status to occupied
  try {
    await supabase
      .from('restaurant_tables')
      .update({ status: 'occupied', updated_at: new Date().toISOString() })
      .eq('id', tableId);
  } catch {
    // Ignore update exception
  }

  return newSessionId;
}

/**
 * Get real-time table statistics for dashboard stat cards
 */
export async function getTableStats(): Promise<TableStats> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('status')
    .eq('is_active', true);

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

  const stats: TableStats = {
    totalTables: data.length,
    availableTables: 0,
    occupiedTables: 0,
    reservedTables: 0,
    billRequestedTables: 0,
    paymentPendingTables: 0,
    outOfServiceTables: 0,
  };

  data.forEach((row) => {
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

/**
 * Automatically deploy default demo floors & tables directly to Supabase
 */
export async function seedDefaultTables(): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // 1. First try calling SECURITY DEFINER RPC procedure to bypass client RLS policies
  try {
    const { error: rpcErr } = await supabase.rpc('seed_demo_floors_and_tables');
    if (!rpcErr) {
      return { success: true };
    }
  } catch {
    // Fallback to direct client upsert
  }

  // 2. Direct client upsert fallback
  const floorsToInsert = [
    { id: '20000000-0000-0000-0000-000000000001', name: 'Ground Floor (Main Dining)', sort_order: 1, is_active: true },
    { id: '20000000-0000-0000-0000-000000000002', name: 'First Floor (VIP Lounge)', sort_order: 2, is_active: true },
  ];

  const { error: floorErr } = await supabase.from('floors').upsert(floorsToInsert);
  if (floorErr) {
    console.error('Error seeding floors:', floorErr);
    return {
      success: false,
      error: `${floorErr.message}. Please run the seed_demo_data.sql script once in Supabase SQL Editor.`,
    };
  }

  const tablesToInsert = [
    // Ground Floor (6 Tables)
    { id: '30000000-0000-0000-0000-000000000001', floor_id: '20000000-0000-0000-0000-000000000001', table_number: 'T-01', capacity: 2, status: 'available', is_active: true },
    { id: '30000000-0000-0000-0000-000000000002', floor_id: '20000000-0000-0000-0000-000000000001', table_number: 'T-02', capacity: 4, status: 'available', is_active: true },
    { id: '30000000-0000-0000-0000-000000000003', floor_id: '20000000-0000-0000-0000-000000000001', table_number: 'T-03', capacity: 4, status: 'available', is_active: true },
    { id: '30000000-0000-0000-0000-000000000004', floor_id: '20000000-0000-0000-0000-000000000001', table_number: 'T-04', capacity: 6, status: 'available', is_active: true },
    { id: '30000000-0000-0000-0000-000000000005', floor_id: '20000000-0000-0000-0000-000000000001', table_number: 'T-05', capacity: 8, status: 'available', is_active: true },
    { id: '30000000-0000-0000-0000-000000000006', floor_id: '20000000-0000-0000-0000-000000000001', table_number: 'T-06', capacity: 2, status: 'available', is_active: true },
    // First Floor (4 Tables)
    { id: '30000000-0000-0000-0000-000000000007', floor_id: '20000000-0000-0000-0000-000000000002', table_number: 'VIP-1', capacity: 4, status: 'available', is_active: true },
    { id: '30000000-0000-0000-0000-000000000008', floor_id: '20000000-0000-0000-0000-000000000002', table_number: 'VIP-2', capacity: 6, status: 'available', is_active: true },
    { id: '30000000-0000-0000-0000-000000000009', floor_id: '20000000-0000-0000-0000-000000000002', table_number: 'VIP-3', capacity: 8, status: 'available', is_active: true },
    { id: '30000000-0000-0000-0000-000000000010', floor_id: '20000000-0000-0000-0000-000000000002', table_number: 'VIP-4', capacity: 10, status: 'available', is_active: true },
  ];

  const { error: tableErr } = await supabase.from('restaurant_tables').upsert(tablesToInsert);
  if (tableErr) {
    console.error('Error seeding tables:', tableErr);
    return {
      success: false,
      error: `${tableErr.message}. Please run the seed_demo_data.sql script once in Supabase SQL Editor.`,
    };
  }

  return { success: true };
}
