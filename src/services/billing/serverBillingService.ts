import { createClient } from '@/lib/supabase/server';
import { Bill, BillItem, Payment, DetailedBill } from '@/types/billing';

/**
 * Check if a bill exists for a table session (Server Side)
 */
export async function getServerBillForSession(tableSessionId: string): Promise<Bill | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('table_session_id', tableSessionId)
    .not('status', 'eq', 'voided')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Bill;
}

/**
 * Fetch detailed bill information (Server Side)
 */
export async function getServerDetailedBill(billId: string): Promise<DetailedBill | null> {
  const supabase = await createClient();

  const [billRes, itemsRes, paymentsRes] = await Promise.all([
    supabase.from('bills').select('*').eq('id', billId).single(),
    supabase.from('bill_items').select('*').eq('bill_id', billId),
    supabase.from('payments').select('*').eq('bill_id', billId).order('created_at', { ascending: true }),
  ]);

  if (billRes.error || !billRes.data) {
    return null;
  }

  const bill = billRes.data as Bill;
  const items = (itemsRes.data as BillItem[]) || [];
  const payments = (paymentsRes.data as Payment[]) || [];

  let tableNumber = 'T-';
  let sessionNumber: string | number = '1';

  if (bill.table_session_id) {
    const { data: session } = await supabase
      .from('table_sessions')
      .select('session_number, table_id')
      .eq('id', bill.table_session_id)
      .single();

    if (session) {
      sessionNumber = session.session_number || '1';
      const { data: table } = await supabase
        .from('restaurant_tables')
        .select('table_number')
        .eq('id', session.table_id)
        .single();

      if (table) {
        tableNumber = table.table_number;
      }
    }
  }

  return {
    ...bill,
    table_number: tableNumber,
    session_number: sessionNumber,
    items,
    payments,
  };
}

/**
 * Fetch all bills for bill history (Server Side)
 */
export async function getServerAllBills(): Promise<DetailedBill[]> {
  const supabase = await createClient();

  const [billsRes, paymentsRes] = await Promise.all([
    supabase.from('bills').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('payments').select('bill_id, amount, status'),
  ]);

  if (billsRes.error || !billsRes.data) {
    return [];
  }

  const paymentsMap = new Map<string, number>();
  (paymentsRes.data || []).forEach((p: any) => {
    if (p.bill_id && (p.status === 'completed' || !p.status)) {
      paymentsMap.set(p.bill_id, (paymentsMap.get(p.bill_id) || 0) + (Number(p.amount) || 0));
    }
  });

  return billsRes.data.map((b: any) => {
    const grandTotal = Number(b.grand_total ?? b.final_amount ?? b.subtotal) || 0;
    const rawPaid = paymentsMap.has(b.id)
      ? paymentsMap.get(b.id)!
      : (b.payment_status === 'paid' || b.status === 'paid' ? grandTotal : Number(b.paid_amount) || 0);
    const paidAmount = grandTotal > 0 && rawPaid > grandTotal ? grandTotal : rawPaid;

    let status = b.status || b.payment_status || 'issued';
    if (paidAmount >= grandTotal && grandTotal > 0) {
      status = 'paid';
    } else if (paidAmount > 0 && paidAmount < grandTotal) {
      status = 'partially_paid';
    }

    return {
      ...b,
      grand_total: grandTotal,
      paid_amount: paidAmount,
      status,
      items: [],
      payments: [],
    };
  });
}
