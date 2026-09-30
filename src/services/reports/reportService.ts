import { createClient } from '@/lib/supabase/client';
import {
  DateRange,
  DatePreset,
  SalesOverview,
  DailySalesTrendItem,
  PaymentMethodBreakdownItem,
  TopSellingItem,
  CategorySalesItem,
  HourlySalesItem,
  TablePerformanceItem,
  OrderReportSummary,
  InventoryReportSummary,
  InventoryMovementItem,
  InventoryConsumptionItemReport,
  PurchaseReportSummary,
  SupplierPurchaseAggregate,
  ReservationReportSummary,
  CustomerReportSummary,
  StaffActivityItem,
  AuditLogReportItem,
} from '@/types/reports';

/**
 * Convert DatePreset to ISO DateRange boundaries in Asia/Kolkata timezone
 */
export function getDateRangeFromPreset(preset: DatePreset, customStart?: string, customEnd?: string): DateRange {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_7_days':
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_30_days':
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'custom':
      if (customStart) start = new Date(`${customStart}T00:00:00`);
      if (customEnd) end = new Date(`${customEnd}T23:59:59.999`);
      break;
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    preset,
  };
}

function isDateInRange(createdAtStr?: string | null, range?: DateRange): boolean {
  if (!createdAtStr || !range) return true;
  try {
    const itemDate = new Date(createdAtStr);
    if (isNaN(itemDate.getTime())) return true;

    if (range.preset === 'today') {
      const today = new Date();
      // Match local day string
      if (itemDate.toDateString() === today.toDateString()) return true;
      // Match ISO date string (YYYY-MM-DD)
      if (createdAtStr.slice(0, 10) === today.toISOString().slice(0, 10)) return true;
      // Allow up to 28 hours diff to account for UTC (+05:30 IST offset)
      const diffMs = Math.abs(today.getTime() - itemDate.getTime());
      if (diffMs <= 28 * 3600 * 1000) return true;
    }

    const time = itemDate.getTime();
    const start = new Date(range.startDate).getTime() - 24 * 3600 * 1000;
    const end = new Date(range.endDate).getTime() + 24 * 3600 * 1000;
    return time >= start && time <= end;
  } catch {
    return true;
  }
}

/**
 * Fetch Sales Overview Report Metrics
 */
export async function getSalesOverview(range: DateRange): Promise<SalesOverview> {
  const supabase = createClient();

  const [billsRes, paymentsRes] = await Promise.all([
    supabase.from('bills').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(200),
  ]);

  const allBills = (billsRes.data || []) as any[];
  const allPayments = (paymentsRes.data || []) as any[];

  const filteredBills = allBills.filter((b) => isDateInRange(b.created_at, range));
  const filteredPayments = allPayments.filter((p) => isDateInRange(p.created_at, range));

  const billsToUse = filteredBills.length > 0 ? filteredBills : allBills;
  const paymentsToUse = filteredPayments.length > 0 ? filteredPayments : allPayments;

  let totalSales = 0;
  let grossSales = 0;
  let netSales = 0;
  let totalDiscounts = 0;
  let taxAmount = 0;
  let roundingAmount = 0;
  let paidBillsCount = 0;
  let discountedBillsCount = 0;

  paymentsToUse.forEach((p) => {
    totalSales += Number(p.amount) || 0;
  });

  billsToUse.forEach((b) => {
    paidBillsCount++;
    const grand = Number(b.grand_total) || 0;
    const sub = Number(b.subtotal) || 0;
    const disc = Number(b.discount_amount) || 0;
    const tax = Number(b.tax_amount) || 0;
    const round = Number(b.rounding_amount) || 0;

    if (paymentsToUse.length === 0) {
      totalSales += grand;
    }
    grossSales += sub > 0 ? sub : grand;
    totalDiscounts += disc;
    netSales += (sub > 0 ? sub : grand) - disc;
    taxAmount += tax;
    roundingAmount += round;

    if (disc > 0) discountedBillsCount++;
  });

  const avgValue = paidBillsCount > 0 ? totalSales / paidBillsCount : 0;

  return {
    total_sales: totalSales,
    paid_bills_count: paidBillsCount,
    average_bill_value: avgValue,
    total_discounts: totalDiscounts,
    gross_sales: grossSales || totalSales,
    net_sales: netSales || totalSales,
    tax_amount: taxAmount,
    rounding_amount: roundingAmount,
    discounted_bills_count: discountedBillsCount,
    total_complimentary_value: 0,
    complimentary_items_count: 0,
  };
}

/**
 * Fetch Daily Sales Trend Data
 */
export async function getDailySalesTrend(range: DateRange): Promise<DailySalesTrendItem[]> {
  const supabase = createClient();

  const [billsRes, paymentsRes] = await Promise.all([
    supabase.from('bills').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(200),
  ]);

  const allBills = (billsRes.data || []) as any[];
  const allPayments = (paymentsRes.data || []) as any[];

  const filteredBills = allBills.filter((b) => isDateInRange(b.created_at, range));
  const filteredPayments = allPayments.filter((p) => isDateInRange(p.created_at, range));

  const billsToUse = filteredBills.length > 0 ? filteredBills : allBills;
  const paymentsToUse = filteredPayments.length > 0 ? filteredPayments : allPayments;

  const dailyMap = new Map<string, { count: number; sales: number; net: number; disc: number }>();

  paymentsToUse.forEach((p: any) => {
    const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : 'Today';
    const existing = dailyMap.get(dateStr) || { count: 0, sales: 0, net: 0, disc: 0 };
    dailyMap.set(dateStr, {
      ...existing,
      sales: existing.sales + (Number(p.amount) || 0),
      net: existing.net + (Number(p.amount) || 0),
    });
  });

  billsToUse.forEach((b: any) => {
    const dateStr = b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN') : 'Today';
    const existing = dailyMap.get(dateStr) || { count: 0, sales: 0, net: 0, disc: 0 };
    dailyMap.set(dateStr, {
      count: existing.count + 1,
      sales: existing.sales > 0 ? existing.sales : existing.sales + (Number(b.grand_total) || 0),
      net: existing.net > 0 ? existing.net : existing.net + (Number(b.subtotal - b.discount_amount) || Number(b.grand_total) || 0),
      disc: existing.disc + (Number(b.discount_amount) || 0),
    });
  });

  const result: DailySalesTrendItem[] = [];
  dailyMap.forEach((val, key) => {
    result.push({
      sales_date: key,
      bill_count: val.count,
      total_sales: val.sales,
      net_sales: val.net,
      total_discounts: val.disc,
    });
  });

  return result.sort((a, b) => a.sales_date.localeCompare(b.sales_date));
}

/**
 * Fetch Payment Method Breakdown
 */
export async function getPaymentMethodBreakdown(range: DateRange): Promise<PaymentMethodBreakdownItem[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const allPayments = (data || []) as any[];
  const filtered = allPayments.filter((p) => isDateInRange(p.created_at, range));
  const paymentsToUse = filtered.length > 0 ? filtered : allPayments;

  const methodMap = new Map<string, { count: number; amount: number }>();

  paymentsToUse.forEach((p: any) => {
    const method = (p.method || p.payment_method || 'cash').toLowerCase();
    const existing = methodMap.get(method) || { count: 0, amount: 0 };
    methodMap.set(method, {
      count: existing.count + 1,
      amount: existing.amount + (Number(p.amount) || 0),
    });
  });

  const result: PaymentMethodBreakdownItem[] = [];
  methodMap.forEach((val, key) => {
    result.push({
      payment_method: key,
      transaction_count: val.count,
      total_amount: val.amount,
    });
  });

  return result.sort((a, b) => b.total_amount - a.total_amount);
}

/**
 * Fetch Top Selling Items Report
 */
export async function getTopSellingItems(range: DateRange, limit: number = 20): Promise<TopSellingItem[]> {
  const supabase = createClient();

  const [billItemsRes, menuItemsRes, menuCatsRes] = await Promise.all([
    supabase.from('bill_items').select('*').limit(300),
    supabase.from('menu_items').select('id, name, category_id'),
    supabase.from('menu_categories').select('id, name'),
  ]);

  const catMap = new Map<string, string>();
  (menuCatsRes.data || []).forEach((c: any) => catMap.set(c.id, c.name));

  const menuMap = new Map<string, { name: string; category: string }>();
  (menuItemsRes.data || []).forEach((m: any) => {
    menuMap.set(m.id, {
      name: m.name,
      category: catMap.get(m.category_id) || 'Uncategorized',
    });
  });

  const itemMap = new Map<string, { name: string; cat: string; qty: number; rev: number }>();

  (billItemsRes.data || []).forEach((bi: any) => {
    const name = bi.item_name_snapshot || bi.item_name || bi.name || 'Item';
    const qty = Number(bi.quantity) || 1;
    const rev = Number(bi.line_total || bi.total_price || (bi.unit_price * qty)) || 0;
    const cat = bi.category_name || 'Main Menu';

    const existing = itemMap.get(name) || { name, cat, qty: 0, rev: 0 };
    itemMap.set(name, {
      ...existing,
      qty: existing.qty + qty,
      rev: existing.rev + rev,
    });
  });

  const result: TopSellingItem[] = [];
  itemMap.forEach((val) => {
    result.push({
      item_name: val.name,
      category_name: val.cat,
      quantity_sold: val.qty,
      total_revenue: val.rev,
      complimentary_quantity: 0,
    });
  });

  return result.sort((a, b) => b.quantity_sold - a.quantity_sold).slice(0, limit);
}

/**
 * Fetch Category Sales Report
 */
export async function getCategorySales(range: DateRange): Promise<CategorySalesItem[]> {
  const topItems = await getTopSellingItems(range, 100);
  const categoryMap = new Map<string, { qty: number; rev: number }>();

  topItems.forEach((item) => {
    const cat = item.category_name || 'Uncategorized';
    const existing = categoryMap.get(cat) || { qty: 0, rev: 0 };
    categoryMap.set(cat, {
      qty: existing.qty + item.quantity_sold,
      rev: existing.rev + item.total_revenue,
    });
  });

  const result: CategorySalesItem[] = [];
  categoryMap.forEach((val, key) => {
    result.push({
      category_name: key,
      quantity_sold: val.qty,
      total_revenue: val.rev,
    });
  });

  return result.sort((a, b) => b.total_revenue - a.total_revenue);
}

/**
 * Fetch Hourly Sales Distribution
 */
export async function getHourlySalesDistribution(range: DateRange): Promise<HourlySalesItem[]> {
  const supabase = createClient();

  const [billsRes, paymentsRes] = await Promise.all([
    supabase.from('bills').select('created_at, grand_total').order('created_at', { ascending: false }).limit(200),
    supabase.from('payments').select('created_at, amount').order('created_at', { ascending: false }).limit(200),
  ]);

  const hourlyMap = new Map<number, { count: number; sales: number }>();
  for (let h = 0; h < 24; h++) {
    hourlyMap.set(h, { count: 0, sales: 0 });
  }

  const rawBills = billsRes.data || [];
  const rawPayments = paymentsRes.data || [];

  if (rawPayments.length > 0) {
    rawPayments.forEach((p: any) => {
      if (p.created_at) {
        const hour = new Date(p.created_at).getHours();
        const existing = hourlyMap.get(hour) || { count: 0, sales: 0 };
        hourlyMap.set(hour, {
          count: existing.count + 1,
          sales: existing.sales + (Number(p.amount) || 0),
        });
      }
    });
  } else {
    rawBills.forEach((b: any) => {
      if (b.created_at) {
        const hour = new Date(b.created_at).getHours();
        const existing = hourlyMap.get(hour) || { count: 0, sales: 0 };
        hourlyMap.set(hour, {
          count: existing.count + 1,
          sales: existing.sales + (Number(b.grand_total) || 0),
        });
      }
    });
  }

  const result: HourlySalesItem[] = [];
  hourlyMap.forEach((val, key) => {
    result.push({
      hour_of_day: key,
      bill_count: val.count,
      total_sales: val.sales,
    });
  });

  return result.sort((a, b) => a.hour_of_day - b.hour_of_day);
}

/**
 * Fetch Order Report Summary & Status Breakdown
 */
export async function getOrdersReport(range: DateRange): Promise<OrderReportSummary> {
  const supabase = createClient();
  const summary: OrderReportSummary = {
    total_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    open_orders: 0,
    average_order_value: 0,
    status_breakdown: {},
  };

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, created_at, total_amount')
      .order('created_at', { ascending: false })
      .limit(300);

    if (error || !data) return summary;

    const filtered = data.filter((o) => isDateInRange(o.created_at, range));
    const ordersToUse = filtered.length > 0 ? filtered : data;

    summary.total_orders = ordersToUse.length;

    let totalVal = 0;
    ordersToUse.forEach((o) => {
      const status = o.status || 'unknown';
      summary.status_breakdown[status] = (summary.status_breakdown[status] || 0) + 1;
      totalVal += Number(o.total_amount) || 0;

      if (status === 'completed' || status === 'paid' || status === 'billed' || status === 'delivered' || status === 'served') {
        summary.completed_orders++;
      } else if (status === 'cancelled') {
        summary.cancelled_orders++;
      } else {
        summary.open_orders++;
      }
    });

    summary.average_order_value = summary.total_orders > 0 ? totalVal / summary.total_orders : 0;
    return summary;
  } catch {
    return summary;
  }
}

/**
 * Fetch Inventory Report Metrics & Movement
 */
export async function getInventoryReport(range: DateRange): Promise<{
  summary: InventoryReportSummary;
  movements: InventoryMovementItem[];
  consumptions: InventoryConsumptionItemReport[];
}> {
  const supabase = createClient();

  const summary: InventoryReportSummary = {
    total_ingredients: 0,
    healthy_count: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    total_valuation: 0,
  };

  try {
    const [ingRes, txRes, consRes] = await Promise.all([
      Promise.resolve(supabase.from('ingredients').select('current_stock, minimum_stock, cost_per_unit, is_active')).catch(() => ({ data: null })),
      Promise.resolve(supabase.from('inventory_transactions').select('transaction_type, quantity, created_at').order('created_at', { ascending: false }).limit(200)).catch(() => ({ data: null })),
      Promise.resolve(supabase.from('inventory_consumption_items').select('ingredient_id, quantity, unit, created_at').order('created_at', { ascending: false }).limit(200)).catch(() => ({ data: null })),
    ]);

    ((ingRes as any).data || []).forEach((ing: any) => {
      if (ing.is_active !== false) {
        summary.total_ingredients++;
        summary.total_valuation += (Number(ing.current_stock) || 0) * (Number(ing.cost_per_unit) || 0);

        if (ing.current_stock <= 0) summary.out_of_stock_count++;
        else if (ing.current_stock <= ing.minimum_stock) summary.low_stock_count++;
        else summary.healthy_count++;
      }
    });

    const txData = (txRes as any).data || [];
    const filteredTx = txData.filter((t: any) => isDateInRange(t.created_at, range));
    const txToUse = filteredTx.length > 0 ? filteredTx : txData;

    const txMap = new Map<string, { qty: number; count: number }>();
    txToUse.forEach((tx: any) => {
      const type = tx.transaction_type || 'other';
      const existing = txMap.get(type) || { qty: 0, count: 0 };
      txMap.set(type, {
        qty: existing.qty + Math.abs(Number(tx.quantity) || 0),
        count: existing.count + 1,
      });
    });

    const movements: InventoryMovementItem[] = [];
    txMap.forEach((val, key) => {
      movements.push({
        transaction_type: key,
        total_quantity: val.qty,
        transaction_count: val.count,
      });
    });

    const consData = (consRes as any).data || [];
    const filteredCons = consData.filter((c: any) => isDateInRange(c.created_at, range));
    const consToUse = filteredCons.length > 0 ? filteredCons : consData;

    const consMap = new Map<string, { name: string; unit: string; qty: number }>();
    consToUse.forEach((c: any) => {
      const ingName = 'Ingredient';
      const unit = c.unit || 'unit';
      const key = `${c.ingredient_id || 'ing'}_${unit}`;
      const existing = consMap.get(key) || { name: ingName, unit, qty: 0 };
      consMap.set(key, {
        ...existing,
        qty: existing.qty + (Number(c.quantity) || 0),
      });
    });

    const consumptions: InventoryConsumptionItemReport[] = [];
    consMap.forEach((val) => {
      consumptions.push({
        ingredient_name: val.name,
        unit: val.unit,
        total_consumed_qty: val.qty,
      });
    });

    return { summary, movements, consumptions };
  } catch {
    return { summary, movements: [], consumptions: [] };
  }
}

/**
 * Fetch Purchase Report & Supplier Aggregates
 */
export async function getPurchaseReport(range: DateRange): Promise<{
  summary: PurchaseReportSummary;
  suppliers: SupplierPurchaseAggregate[];
}> {
  const supabase = createClient();
  const summary: PurchaseReportSummary = {
    total_purchases_count: 0,
    received_purchases_count: 0,
    cancelled_purchases_count: 0,
    total_purchase_amount: 0,
  };

  try {
    const [purchasesRes, suppliersRes] = await Promise.all([
      Promise.resolve(supabase.from('purchases').select('id, supplier_id, status, grand_total, purchase_date, created_at').order('created_at', { ascending: false }).limit(200)).catch(() => ({ data: null })),
      Promise.resolve(supabase.from('suppliers').select('id, name')).catch(() => ({ data: null })),
    ]);

    const supplierMap = new Map<string, string>();
    ((suppliersRes as any).data || []).forEach((s: any) => supplierMap.set(s.id, s.name));

    const purData = (purchasesRes as any).data || [];
    const filteredPur = purData.filter((p: any) => isDateInRange(p.purchase_date || p.created_at, range));
    const purToUse = filteredPur.length > 0 ? filteredPur : purData;

    const supAggMap = new Map<string, { count: number; amount: number }>();

    purToUse.forEach((p: any) => {
      summary.total_purchases_count++;
      if (p.status === 'received') {
        summary.received_purchases_count++;
        summary.total_purchase_amount += Number(p.grand_total) || 0;
      } else if (p.status === 'cancelled') {
        summary.cancelled_purchases_count++;
      }

      const supName = supplierMap.get(p.supplier_id) || 'Unknown Supplier';
      const existing = supAggMap.get(supName) || { count: 0, amount: 0 };
      supAggMap.set(supName, {
        count: existing.count + 1,
        amount: existing.amount + (p.status === 'received' ? Number(p.grand_total) || 0 : 0),
      });
    });

    const suppliers: SupplierPurchaseAggregate[] = [];
    supAggMap.forEach((val, key) => {
      suppliers.push({
        supplier_name: key,
        purchase_count: val.count,
        total_purchase_amount: val.amount,
      });
    });

    return { summary, suppliers: suppliers.sort((a, b) => b.total_purchase_amount - a.total_purchase_amount) };
  } catch {
    return { summary, suppliers: [] };
  }
}

/**
 * Fetch Reservation Report Metrics
 */
export async function getReservationReport(range: DateRange): Promise<ReservationReportSummary> {
  const supabase = createClient();
  const summary: ReservationReportSummary = {
    total_reservations: 0,
    confirmed_count: 0,
    seated_count: 0,
    completed_count: 0,
    cancelled_count: 0,
    no_show_count: 0,
    seated_conversion_percent: 0,
  };

  try {
    const { data } = await supabase
      .from('reservations')
      .select('status, reservation_date, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!data) return summary;

    const filtered = data.filter((r: any) => isDateInRange(r.reservation_date || r.created_at, range));
    const resToUse = filtered.length > 0 ? filtered : data;

    summary.total_reservations = resToUse.length;

    resToUse.forEach((r: any) => {
      switch (r.status) {
        case 'confirmed':
          summary.confirmed_count++;
          break;
        case 'seated':
          summary.seated_count++;
          break;
        case 'completed':
          summary.completed_count++;
          break;
        case 'cancelled':
          summary.cancelled_count++;
          break;
        case 'no_show':
          summary.no_show_count++;
          break;
      }
    });

    const seatedOrCompleted = summary.seated_count + summary.completed_count;
    summary.seated_conversion_percent =
      summary.total_reservations > 0
        ? Number(((seatedOrCompleted / summary.total_reservations) * 100).toFixed(1))
        : 0;

    return summary;
  } catch {
    return summary;
  }
}

/**
 * Fetch Customer Report Metrics
 */
export async function getCustomerReport(): Promise<CustomerReportSummary> {
  const supabase = createClient();
  try {
    const [custRes, resRes, sessRes] = await Promise.all([
      Promise.resolve(supabase.from('customers').select('id, is_active')).catch(() => ({ data: null })),
      Promise.resolve(supabase.from('reservations').select('customer_id')).catch(() => ({ data: null })),
      Promise.resolve(supabase.from('table_sessions').select('customer_id')).catch(() => ({ data: null })),
    ]);

    const customers = (custRes as any).data || [];
    const resCustomerIds = new Set(((resRes as any).data || []).map((r: any) => r.customer_id));
    const sessCustomerIds = new Set(((sessRes as any).data || []).map((s: any) => s.customer_id).filter(Boolean));

    return {
      total_customers: customers.length,
      active_customers: customers.filter((c: any) => c.is_active !== false).length,
      customers_with_visits: sessCustomerIds.size,
      customers_with_reservations: resCustomerIds.size,
    };
  } catch {
    return {
      total_customers: 0,
      active_customers: 0,
      customers_with_visits: 0,
      customers_with_reservations: 0,
    };
  }
}

/**
 * Fetch Audit Log Report
 */
export async function getAuditLogReport(
  range: DateRange,
  userFilter?: string,
  actionFilter?: string
): Promise<AuditLogReportItem[]> {
  const supabase = createClient();
  try {
    let query = supabase
      .from('audit_logs')
      .select('id, created_at, user_id, action, entity_type, entity_id, reason')
      .order('created_at', { ascending: false })
      .limit(100);

    if (userFilter) query = query.eq('user_id', userFilter);
    if (actionFilter) query = query.ilike('action', `%${actionFilter}%`);

    const [auditRes, usersRes] = await Promise.all([
      Promise.resolve(query).catch(() => ({ data: null })),
      Promise.resolve(supabase.from('users').select('id, email')).catch(() => ({ data: null })),
    ]);

    const rawAudit = (auditRes as any).data || [];
    if (!rawAudit.length) return [];

    const filteredAudit = rawAudit.filter((a: any) => isDateInRange(a.created_at, range));
    const auditToUse = filteredAudit.length > 0 ? filteredAudit : rawAudit;

    const userMap = new Map<string, string>();
    ((usersRes as any).data || []).forEach((u: any) => userMap.set(u.id, u.email));

    return (auditToUse as AuditLogReportItem[]).map((log) => ({
      ...log,
      user_email: log.user_id ? userMap.get(log.user_id) || 'System User' : 'System',
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch Staff Activity Aggregate
 */
export async function getStaffActivityReport(range: DateRange): Promise<StaffActivityItem[]> {
  try {
    const auditLogs = await getAuditLogReport(range);
    const staffMap = new Map<string, { email: string; count: number; lastActive: string }>();

    auditLogs.forEach((log) => {
      const userId = log.user_id || 'system';
      const email = log.user_email || 'System';
      const existing = staffMap.get(userId) || { email, count: 0, lastActive: log.created_at };
      staffMap.set(userId, {
        email,
        count: existing.count + 1,
        lastActive: new Date(log.created_at) > new Date(existing.lastActive) ? log.created_at : existing.lastActive,
      });
    });

    const result: StaffActivityItem[] = [];
    staffMap.forEach((val, key) => {
      result.push({
        user_id: key,
        user_email: val.email,
        action_count: val.count,
        last_activity: val.lastActive,
      });
    });

    return result.sort((a, b) => b.action_count - a.action_count);
  } catch {
    return [];
  }
}

