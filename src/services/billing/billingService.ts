import { createClient } from '@/lib/supabase/client';
import { Bill, BillItem, Payment, PaymentMethod, DetailedBill } from '@/types/billing';
import { processBillInventoryConsumption } from '@/services/recipes/recipeService';

/**
 * Generate a bill for an active table session using public.generate_bill RPC or API route fallback
 */
export async function generateBill(
  tableSessionId: string,
  discountAmount: number = 0,
  roundingAmount: number = 0
): Promise<string> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('generate_bill', {
      p_table_session_id: tableSessionId,
      p_discount_amount: discountAmount,
      p_rounding_amount: roundingAmount,
    });

    if (!error && data) {
      return data as string;
    }
  } catch {
    // RPC failed or missing
  }

  // Fallback to API route
  const res = await fetch('/api/billing/save-and-bill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tableSessionId,
      isPaid: false,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.billId) {
    throw new Error(json.error || 'Failed to generate bill');
  }

  return json.billId;
}

/**
 * Record a payment transaction for a bill using public.record_payment RPC, with fallback
 */
export async function recordPayment(
  billId: string,
  method: PaymentMethod,
  amount: number,
  referenceNumber?: string | null
): Promise<string> {
  const supabase = createClient();

  // Guard: Check if bill is already fully paid to prevent duplicate payment insertions
  try {
    const [{ data: billData }, { data: existingPayments }] = await Promise.all([
      supabase.from('bills').select('grand_total, final_amount').eq('id', billId).maybeSingle(),
      supabase.from('payments').select('id, amount, status').eq('bill_id', billId),
    ]);

    const grandTotal = Number(billData?.grand_total ?? billData?.final_amount ?? 0);
    const totalPaid = (existingPayments || [])
      .filter((p: any) => (p.status || 'completed') !== 'failed')
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    if (grandTotal > 0 && totalPaid >= grandTotal) {
      return (existingPayments && existingPayments[0]?.id) || 'already-paid';
    }
  } catch {
    // Continue if guard check fails
  }

  try {
    const { data, error } = await supabase.rpc('record_payment', {
      p_bill_id: billId,
      p_method: method,
      p_amount: amount,
      p_reference_number: referenceNumber?.trim() || null,
    });

    if (!error && data) {
      return data as string;
    }
  } catch {
    // RPC failed or missing
  }

  // Direct table insert fallback
  const paymentId = crypto.randomUUID();
  const { error: payErr } = await supabase.from('payments').insert({
    id: paymentId,
    bill_id: billId,
    payment_method: method,
    amount: amount,
    status: 'completed',
    reference_number: referenceNumber?.trim() || null,
    created_at: new Date().toISOString(),
  });

  if (payErr) {
    throw new Error(payErr.message);
  }

  await supabase
    .from('bills')
    .update({ payment_status: 'paid', status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', billId);

  return paymentId;
}

/**
 * Close a table session after full payment using public.close_table_session RPC, with fallback
 */
export async function closeTableSession(tableSessionId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('close_table_session', {
      p_table_session_id: tableSessionId,
    });

    if (!error && data !== undefined) {
      return !!data;
    }
  } catch {
    // RPC failed or missing
  }

  // Direct table updates fallback
  await supabase
    .from('table_sessions')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', tableSessionId);

  const { data: session } = await supabase
    .from('table_sessions')
    .select('table_id')
    .eq('id', tableSessionId)
    .single();

  if (session?.table_id) {
    await supabase
      .from('restaurant_tables')
      .update({ status: 'available', updated_at: new Date().toISOString() })
      .eq('id', session.table_id);
  }

  return true;
}

/**
 * Check if a bill already exists for an active table session (Idempotency check)
 */
export async function getBillForSession(tableSessionId: string): Promise<Bill | null> {
  const supabase = createClient();
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
 * Fetch detailed bill information including bill items, payments, and table details
 */
export async function getDetailedBill(billId: string): Promise<DetailedBill | null> {
  const supabase = createClient();

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
 * Fetch all bills for bill history view
 */
export async function getAllBills(): Promise<DetailedBill[]> {
  const supabase = createClient();

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
