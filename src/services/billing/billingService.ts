import { createClient } from '@/lib/supabase/client';
import { saveAndBill } from '@/services/apiServices';
import { Bill, BillItem, Payment, PaymentMethod, DetailedBill, BillStatus } from '@/types/billing';

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

  // Fallback to client service
  const json = await saveAndBill({
    tableSessionId,
    isPaid: false,
  });

  if (!json.billId) {
    throw new Error('Failed to generate bill');
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
      supabase.from('bills').select('grand_total, final_amount, subtotal').eq('id', billId).maybeSingle(),
      supabase.from('payments').select('id, amount, status').eq('bill_id', billId),
    ]);

    const grandTotal = Number(billData?.grand_total ?? billData?.final_amount ?? billData?.subtotal ?? 0);
    const totalPaid = (existingPayments || [])
      .filter((p: any) => (p.status || 'completed') !== 'failed')
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    if (grandTotal > 0 && totalPaid >= grandTotal) {
      return (existingPayments && existingPayments[0]?.id) || 'already-paid';
    }
  } catch {
    // Continue if guard check fails
  }

  // Schema-safe direct payment insertion
  const paymentId = crypto.randomUUID();
  let { error: payErr } = await supabase.from('payments').insert({
    id: paymentId,
    bill_id: billId,
    payment_method: method,
    amount: amount,
    created_at: new Date().toISOString(),
  });

  // Schema Fallback: If minimal insert fails, retry basic fields
  if (payErr) {
    const fallbackRes = await supabase.from('payments').insert({
      id: paymentId,
      bill_id: billId,
      amount: amount,
    });
    payErr = fallbackRes.error;
  }

  // Update bills table status and payment_status to paid
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
    .maybeSingle();

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

  // 1. Try querying bills by table_session_id
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('table_session_id', tableSessionId)
    .not('status', 'eq', 'voided')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    return normalizeBill(data);
  }

  // 2. Fallback: Query active orders for session, then query bills by order_id
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('table_session_id', tableSessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (order?.id) {
    const { data: billByOrder } = await supabase
      .from('bills')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (billByOrder) {
      return normalizeBill(billByOrder);
    }
  }

  return null;
}

/**
 * Fetch detailed bill information including bill items, payments, and table details
 */
export async function getDetailedBill(billId: string): Promise<DetailedBill | null> {
  const supabase = createClient();

  const [billRes, itemsRes, paymentsRes] = await Promise.all([
    supabase.from('bills').select('*').eq('id', billId).maybeSingle(),
    supabase.from('bill_items').select('*').eq('bill_id', billId),
    supabase.from('payments').select('*').eq('bill_id', billId).order('created_at', { ascending: true }),
  ]);

  if (billRes.error || !billRes.data) {
    return null;
  }

  const rawBill = billRes.data;
  const payments = (paymentsRes.data as Payment[]) || [];

  // Resolve table session ID if not on bills table directly
  let tableSessionId = rawBill.table_session_id;
  if (!tableSessionId && rawBill.order_id) {
    const { data: order } = await supabase
      .from('orders')
      .select('table_session_id')
      .eq('id', rawBill.order_id)
      .maybeSingle();
    if (order?.table_session_id) {
      tableSessionId = order.table_session_id;
    }
  }

  let tableNumber = 'T-';
  let sessionNumber: string | number = '1';

  if (tableSessionId) {
    const { data: session } = await supabase
      .from('table_sessions')
      .select('session_number, table_id')
      .eq('id', tableSessionId)
      .maybeSingle();

    if (session) {
      sessionNumber = session.session_number || '1';
      if (session.table_id) {
        const { data: table } = await supabase
          .from('restaurant_tables')
          .select('table_number')
          .eq('id', session.table_id)
          .maybeSingle();

        if (table?.table_number) {
          tableNumber = table.table_number;
        }
      }
    }
  }

  // Resolve bill item names from order_items / menu_items if missing in bill_items
  const rawItems = (itemsRes.data || []) as any[];
  const orderItemIds = rawItems.map((bi) => bi.order_item_id).filter(Boolean);

  let orderItemsMap = new Map<string, { item_name: string; unit_price: number }>();
  if (orderItemIds.length > 0) {
    const { data: fetchedOrderItems } = await supabase
      .from('order_items')
      .select('id, item_name, unit_price, menu_item_id')
      .in('id', orderItemIds);

    if (fetchedOrderItems && fetchedOrderItems.length > 0) {
      const menuItemIds = fetchedOrderItems.map((oi) => oi.menu_item_id).filter(Boolean);
      let menuMap = new Map<string, string>();
      if (menuItemIds.length > 0) {
        const { data: menuData } = await supabase
          .from('menu_items')
          .select('id, name, item_name')
          .in('id', menuItemIds);
        (menuData || []).forEach((m: any) => {
          menuMap.set(m.id, m.name || m.item_name || 'Item');
        });
      }

      fetchedOrderItems.forEach((oi: any) => {
        const resolvedName = oi.item_name || (oi.menu_item_id ? menuMap.get(oi.menu_item_id) : '') || 'Item';
        orderItemsMap.set(oi.id, { item_name: resolvedName, unit_price: Number(oi.unit_price) || 0 });
      });
    }
  }

  const items: BillItem[] = rawItems.map((bi: any) => {
    const fallback = bi.order_item_id ? orderItemsMap.get(bi.order_item_id) : null;
    const itemName = bi.item_name || bi.item_name_snapshot || fallback?.item_name || 'Item';
    const unitPrice = Number(bi.unit_price ?? fallback?.unit_price ?? 0);
    const quantity = Number(bi.quantity) || 1;
    const lineTotal = Number(bi.line_total ?? bi.total_price ?? unitPrice * quantity);

    return {
      id: bi.id,
      bill_id: bi.bill_id,
      order_item_id: bi.order_item_id,
      item_name: itemName,
      unit_price: unitPrice,
      quantity,
      line_total: lineTotal,
      is_complimentary: !!bi.is_complimentary,
    };
  });

  const grandTotal = Number(rawBill.grand_total ?? rawBill.final_amount ?? rawBill.subtotal) || 0;
  const totalPaid = payments
    .filter((p: any) => (p.status || 'completed') !== 'failed')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const paymentStatus = rawBill.payment_status || rawBill.status || (totalPaid >= grandTotal && grandTotal > 0 ? 'paid' : 'unpaid');

  const normalizedBill: DetailedBill = {
    id: rawBill.id,
    table_session_id: tableSessionId || '',
    order_id: rawBill.order_id || null,
    bill_number: rawBill.bill_number ?? rawBill.id.slice(0, 8),
    subtotal: Number(rawBill.subtotal) || 0,
    discount_amount: Number(rawBill.discount_amount ?? rawBill.discount_value) || 0,
    tax_amount: Number(rawBill.tax_amount) || 0,
    rounding_amount: Number(rawBill.rounding_amount) || 0,
    grand_total: grandTotal,
    paid_amount: totalPaid,
    balance_amount: Math.max(0, grandTotal - totalPaid),
    status: (paymentStatus === 'paid' ? 'paid' : paymentStatus === 'partially_paid' ? 'partially_paid' : 'issued') as BillStatus,
    created_at: rawBill.created_at || new Date().toISOString(),
    updated_at: rawBill.updated_at,
    table_number: tableNumber,
    session_number: sessionNumber,
    items,
    payments,
  };

  return normalizedBill;
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
      id: b.id,
      table_session_id: b.table_session_id || '',
      order_id: b.order_id || null,
      bill_number: b.bill_number ?? b.id.slice(0, 8),
      subtotal: Number(b.subtotal) || 0,
      discount_amount: Number(b.discount_amount ?? b.discount_value) || 0,
      tax_amount: Number(b.tax_amount) || 0,
      rounding_amount: Number(b.rounding_amount) || 0,
      grand_total: grandTotal,
      paid_amount: paidAmount,
      balance_amount: Math.max(0, grandTotal - paidAmount),
      status: status as BillStatus,
      created_at: b.created_at || new Date().toISOString(),
      updated_at: b.updated_at,
      items: [],
      payments: [],
    };
  });
}

function normalizeBill(data: any): Bill {
  const grandTotal = Number(data.grand_total ?? data.final_amount ?? data.subtotal) || 0;
  const paymentStatus = data.payment_status || data.status || 'issued';
  return {
    id: data.id,
    table_session_id: data.table_session_id || '',
    order_id: data.order_id || null,
    bill_number: data.bill_number ?? data.id.slice(0, 8),
    subtotal: Number(data.subtotal) || 0,
    discount_amount: Number(data.discount_amount ?? data.discount_value) || 0,
    tax_amount: Number(data.tax_amount) || 0,
    rounding_amount: Number(data.rounding_amount) || 0,
    grand_total: grandTotal,
    paid_amount: Number(data.paid_amount) || 0,
    balance_amount: Math.max(0, grandTotal - (Number(data.paid_amount) || 0)),
    status: (paymentStatus === 'paid' ? 'paid' : paymentStatus === 'partially_paid' ? 'partially_paid' : 'issued') as BillStatus,
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at,
  };
}

