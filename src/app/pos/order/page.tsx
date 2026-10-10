import { redirect, Link } from '@/lib/navigation';
import { getServerTablesWithActiveSessions } from '@/services/tables/serverTableService';
import { getServerMenuCategories, getServerMenuItems } from '@/services/menu/serverMenuService';
import { OrderView } from '@/features/pos/components/OrderView';
import { UtensilsCrossed, AlertCircle, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'POS Order - WebRajya POS',
  description: 'Take customer orders and send order rounds',
};

interface PosOrderPageProps {
  searchParams: Promise<{ tableId?: string; sessionId?: string; type?: string }>;
}

export default async function PosOrderPage({ searchParams }: PosOrderPageProps) {
  const resolvedParams = await searchParams;
  const tableId = resolvedParams.tableId;
  const typeParam = resolvedParams.type;

  const [tables, categories, menuItems] = await Promise.all([
    getServerTablesWithActiveSessions(),
    getServerMenuCategories(),
    getServerMenuItems(),
  ]);

  let targetTable = tableId ? tables.find((t) => t.id === tableId) : null;

  // If no tableId specified (e.g., Delivery or Take Away button clicked), pick an available table or create a virtual table
  if (!targetTable) {
    if (tables.length > 0) {
      targetTable = tables.find((t) => t.status === 'available') || tables[0];
    } else {
      targetTable = {
        id: 'virtual-table',
        table_number: typeParam === 'delivery' ? 'DEL' : typeParam === 'pickup' || typeParam === 'takeaway' ? 'TAKE' : 'Q1',
        capacity: 4,
        status: 'available',
        floor_id: null,
        floor_name: 'Quick Orders',
        active_session: null,
        active_order: null,
      };
    }
  }

  const activeSession = targetTable.active_session || {
    id: resolvedParams.sessionId || targetTable.id,
    table_id: targetTable.id,
    guest_count: 1,
    status: 'active',
    opened_at: new Date().toISOString(),
  };

  const tableWithSession = {
    ...targetTable,
    status: (targetTable.status === 'available' ? 'occupied' : targetTable.status) as any,
    active_session: activeSession,
  };

  const initialOrderType =
    typeParam === 'delivery'
      ? 'delivery'
      : typeParam === 'pickup' || typeParam === 'takeaway'
      ? 'takeaway'
      : 'dine_in';

  return (
    <OrderView
      table={tableWithSession}
      categories={categories}
      menuItems={menuItems}
      initialOrderType={initialOrderType}
    />
  );
}
