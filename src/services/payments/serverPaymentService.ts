import { createClient } from '@/lib/supabase/server';
import { EnrichedPayment, PaymentSummaryStats } from '@/types/payments';
import { PaymentMethod, PaymentStatus, Bill } from '@/types/billing';

/**
 * Server-side helper to fetch payments and summary metrics
 */
export async function getServerPayments(): Promise<{ payments: EnrichedPayment[]; summary: PaymentSummaryStats }> {
  const supabase = await createClient();

  const [paymentsRes, billsRes, sessionsRes, tablesRes, customersRes, ordersRes] = await Promise.all([
    supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('bills').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('table_sessions').select('*'),
    supabase.from('restaurant_tables').select('id, table_number'),
    supabase.from('customers').select('id, name, phone'),
    supabase.from('orders').select('id, order_number, type'),
  ]);

  const rawPayments = (paymentsRes.data || []) as any[];
  const rawBills = (billsRes.data || []) as Bill[];

  const sessionsMap = new Map<string, any>();
  (sessionsRes.data || []).forEach((s: any) => sessionsMap.set(s.id, s));

  const tablesMap = new Map<string, string>();
  (tablesRes.data || []).forEach((t: any) => tablesMap.set(t.id, t.table_number));

  const customersMap = new Map<string, any>();
  (customersRes.data || []).forEach((c: any) => customersMap.set(c.id, c));

  const ordersMap = new Map<string, any>();
  (ordersRes.data || []).forEach((o: any) => ordersMap.set(o.id, o));

  const billMap = new Map<string, Bill>();
  rawBills.forEach((b) => billMap.set(b.id, b));

  const billPaymentsGroupMap = new Map<string, Array<any>>();
  rawPayments.forEach((p) => {
    if (!billPaymentsGroupMap.has(p.bill_id)) {
      billPaymentsGroupMap.set(p.bill_id, []);
    }
    billPaymentsGroupMap.get(p.bill_id)!.push({
      id: p.id,
      method: (p.method || p.payment_method || 'cash') as PaymentMethod,
      amount: Number(p.amount || 0),
      reference_number: p.reference_number || null,
      status: (p.status || 'completed') as PaymentStatus,
      created_at: p.created_at,
    });
  });

  const isDateToday = (dateStr?: string | null): boolean => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const summary: PaymentSummaryStats = {
    totalCount: 0,
    totalCollected: 0,
    cashTotal: 0,
    upiTotal: 0,
    cardTotal: 0,
    creditTotal: 0,
    otherTotal: 0,
    pendingDueTotal: 0,
  };

  rawPayments.forEach((p) => {
    const isToday = isDateToday(p.created_at);
    const amount = Number(p.amount || 0);
    const method = (p.method || p.payment_method || 'cash').toLowerCase();

    if (isToday) {
      summary.totalCount++;
      summary.totalCollected += amount;

      if (method === 'cash') summary.cashTotal += amount;
      else if (method === 'upi') summary.upiTotal += amount;
      else if (method === 'card') summary.cardTotal += amount;
      else if (method === 'credit') summary.creditTotal += amount;
      else summary.otherTotal += amount;
    }
  });

  rawBills.forEach((b) => {
    const isToday = isDateToday(b.created_at);
    if (isToday && (b.status === 'issued' || b.status === 'partially_paid' || b.status === 'draft')) {
      summary.pendingDueTotal += Number(b.balance_amount || 0);
    }
  });

  const enrichedPayments: EnrichedPayment[] = rawPayments.map((p) => {
    const method = (p.method || p.payment_method || 'cash') as PaymentMethod;
    const status = (p.status || 'completed') as PaymentStatus;
    const bill = billMap.get(p.bill_id);

    let tableNumber = 'T-';
    let customerName: string | null = null;
    let customerPhone: string | null = null;
    let orderNumber: string | null = null;
    let orderType: string | null = null;

    if (bill) {
      if (bill.table_session_id) {
        const session = sessionsMap.get(bill.table_session_id);
        if (session) {
          if (session.table_id) {
            tableNumber = tablesMap.get(session.table_id) || 'T-';
          }
          if (session.customer_id) {
            const cust = customersMap.get(session.customer_id);
            if (cust) {
              customerName = cust.name;
              customerPhone = cust.phone;
            }
          }
        }
      }

      if (bill.order_id) {
        const order = ordersMap.get(bill.order_id);
        if (order) {
          orderNumber = order.order_number || null;
          orderType = order.type || null;
        }
      }
    }

    const allPaymentsOnBill = billPaymentsGroupMap.get(p.bill_id) || [];

    return {
      id: p.id,
      bill_id: p.bill_id,
      bill_number: bill ? bill.bill_number : 'Bill',
      table_session_id: bill?.table_session_id || null,
      table_number: tableNumber,
      order_id: bill?.order_id || null,
      order_number: orderNumber,
      order_type: orderType,
      customer_name: customerName,
      customer_phone: customerPhone,
      amount: Number(p.amount || 0),
      method,
      status,
      reference_number: p.reference_number || null,
      created_at: p.created_at,
      bill_grand_total: bill ? Number(bill.grand_total) : Number(p.amount),
      bill_paid_amount: bill ? Number(bill.paid_amount) : Number(p.amount),
      bill_balance_amount: bill ? Number(bill.balance_amount) : 0,
      bill_status: bill?.status || 'paid',
      all_bill_payments: allPaymentsOnBill,
    };
  });

  return { payments: enrichedPayments, summary };
}
