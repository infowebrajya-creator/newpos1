import { getServerTablesWithActiveSessions } from '@/services/tables/serverTableService';
import { getServerBillForSession, getServerDetailedBill, getServerAllBills } from '@/services/billing/serverBillingService';
import { getServerOrderDetailsForSession } from '@/services/orders/serverOrderService';
import { BillingView } from '@/features/billing/components/BillingView';
import { BillHistoryView } from '@/features/billing/components/BillHistoryView';

export const metadata = {
  title: 'Billing & Payments - WebRajya POS',
  description: 'Generate bills, record split payments, and close table sessions',
};

interface PosBillingPageProps {
  searchParams: Promise<{ tableId?: string }>;
}

export default async function PosBillingPage({ searchParams }: PosBillingPageProps) {
  const resolvedParams = await searchParams;
  const tableId = resolvedParams.tableId;

  if (tableId) {
    const tables = await getServerTablesWithActiveSessions();
    const table = tables.find((t) => t.id === tableId);

    if (table && table.active_session) {
      const existingBill = await getServerBillForSession(table.active_session.id);
      const fullBill = existingBill ? await getServerDetailedBill(existingBill.id) : null;
      const orderDetails = await getServerOrderDetailsForSession(table.active_session.id);

      return (
        <BillingView
          table={table}
          initialBill={fullBill}
          initialOrderDetails={orderDetails}
        />
      );
    }
  }

  // Fallback to Bill History View if no tableId specified
  const bills = await getServerAllBills();
  return <BillHistoryView initialBills={bills} />;
}
