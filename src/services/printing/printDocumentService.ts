import { createClient } from '@/lib/supabase/client';
import { BillPrintDocument, KotPrintDocument, BillPrintItem, KotPrintItem } from '@/types/printing';
import { getRestaurantSettings } from '@/services/settings/settingsService';

/**
 * Build a clean BillPrintDocument from historical Supabase records.
 */
export async function buildBillPrintDocument(
  billId: string,
  isReprint: boolean = false
): Promise<BillPrintDocument> {
  const supabase = createClient();

  // 1. Fetch Bill and Restaurant Settings
  const [billRes, settings, itemsRes, paymentsRes] = await Promise.all([
    supabase.from('bills').select('*').eq('id', billId).single(),
    getRestaurantSettings(),
    supabase.from('bill_items').select('*').eq('bill_id', billId),
    supabase.from('payments').select('*').eq('bill_id', billId).order('created_at', { ascending: true }),
  ]);

  let bill = billRes.data;
  if (!bill) {
    const { data: billByOrder } = await supabase
      .from('bills')
      .select('*')
      .eq('order_id', billId)
      .maybeSingle();
    bill = billByOrder;
  }

  if (!bill) {
    bill = {
      id: billId,
      bill_number: billId.slice(0, 8),
      created_at: new Date().toISOString(),
      subtotal: 0,
      discount_amount: 0,
      tax_amount: 0,
      rounding_amount: 0,
      grand_total: 0,
    };
  }
  const rawItems = itemsRes.data || [];
  const payments = paymentsRes.data || [];

  // 2. Fetch Session & Table Info
  let tableNumber = 'T-';
  let guestCount = 1;

  if (bill.table_session_id) {
    const { data: session } = await supabase
      .from('table_sessions')
      .select('guest_count, table_id')
      .eq('id', bill.table_session_id)
      .single();

    if (session) {
      guestCount = session.guest_count || 1;
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

  // 3. Map Items using stored historical snapshots or fallback to order_items & menu_items
  const orderItemIds = rawItems.map((i: any) => i.order_item_id).filter(Boolean);
  let orderItemsMap = new Map<string, any>();
  let menuItemsMap = new Map<string, any>();

  let orderItemsList: any[] = [];
  if (orderItemIds.length > 0) {
    const { data: fetchedOI } = await supabase
      .from('order_items')
      .select('*')
      .in('id', orderItemIds);
    orderItemsList = fetchedOI || [];
  } else if (bill.order_id) {
    const { data: rounds } = await supabase
      .from('order_rounds')
      .select('id')
      .eq('order_id', bill.order_id);
    const roundIds = (rounds || []).map((r: any) => r.id);
    if (roundIds.length > 0) {
      const { data: fetchedOI } = await supabase
        .from('order_items')
        .select('*')
        .in('order_round_id', roundIds);
      orderItemsList = fetchedOI || [];
    }
  }

  (orderItemsList || []).forEach((oi: any) => orderItemsMap.set(oi.id, oi));

  const menuItemIds = Array.from(
    new Set([
      ...rawItems.map((i: any) => i.menu_item_id),
      ...orderItemsList.map((oi: any) => oi.menu_item_id),
    ].filter(Boolean))
  );

  if (menuItemIds.length > 0) {
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('id, name')
      .in('id', menuItemIds);
    (menuItems || []).forEach((mi: any) => menuItemsMap.set(mi.id, mi.name));
  }

  let items: BillPrintItem[] = rawItems.map((item: any) => {
    const oi = item.order_item_id ? orderItemsMap.get(item.order_item_id) : null;
    const menuItemName = item.menu_item_id
      ? menuItemsMap.get(item.menu_item_id)
      : oi?.menu_item_id
      ? menuItemsMap.get(oi.menu_item_id)
      : null;

    const name =
      (item.item_name_snapshot && item.item_name_snapshot !== 'Item' ? item.item_name_snapshot : null) ||
      (item.item_name && item.item_name !== 'Item' ? item.item_name : null) ||
      (item.name && item.name !== 'Item' ? item.name : null) ||
      (oi?.item_name && oi.item_name !== 'Item' ? oi.item_name : null) ||
      (oi?.name && oi.name !== 'Item' ? oi.name : null) ||
      menuItemName ||
      'Item';

    const quantity = Number(item.quantity || oi?.quantity || 1);
    const unitPrice = Number(item.unit_price ?? oi?.unit_price ?? 0);
    const lineTotal = Number(
      item.line_total ??
      item.total_price ??
      (oi?.is_complimentary ? 0 : unitPrice * quantity)
    );

    return {
      name,
      quantity,
      unitPrice,
      lineTotal,
      isComplimentary: item.is_complimentary ?? oi?.is_complimentary ?? (unitPrice === 0),
    };
  });

  if (items.length === 0 && orderItemsList.length > 0) {
    items = orderItemsList.map((oi: any) => {
      const menuItemName = oi.menu_item_id ? menuItemsMap.get(oi.menu_item_id) : null;
      const name = oi.item_name || oi.name || menuItemName || 'Item';
      const quantity = Number(oi.quantity || 1);
      const unitPrice = Number(oi.unit_price || 0);
      const lineTotal = oi.is_complimentary ? 0 : unitPrice * quantity;
      return {
        name,
        quantity,
        unitPrice,
        lineTotal,
        isComplimentary: !!oi.is_complimentary,
      };
    });
  }

  // 4. Resolve Payment Details
  let paymentMethod: string | null = null;
  let paidAmount: number | null = null;

  if (payments.length > 0) {
    const methods = Array.from(new Set(payments.map((p: any) => p.payment_method || p.method)));
    paymentMethod = methods.join(', ');
    paidAmount = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
  } else if (bill.paid_amount > 0) {
    paidAmount = Number(bill.paid_amount);
  }

  const billDate = bill.created_at ? new Date(bill.created_at) : new Date();

  return {
    billId: bill.id,
    billNumber: bill.bill_number || bill.id.slice(0, 8),
    date: billDate.toLocaleDateString('en-IN'),
    time: billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    tableNumber,
    guestCount,
    restaurantName: (settings as any).restaurant_name || settings.name || 'WEBRAJYA RESTAURANT',
    legalName: settings.legal_name || null,
    address: settings.address || null,
    phone: settings.phone || null,
    gstin: settings.gstin || null,
    fssaiLicense: settings.fssai_license || null,
    receiptHeader: settings.receipt_header || null,
    receiptFooter: settings.receipt_footer || null,
    items,
    subtotal: Number(bill.subtotal || 0),
    discountAmount: Number(bill.discount_amount || 0),
    taxAmount: Number(bill.tax_amount || 0),
    roundingAmount: Number(bill.rounding_amount || 0),
    grandTotal: Number(bill.grand_total || 0),
    paymentMethod,
    paidAmount,
    isReprint,
    taxEnabled: settings.tax_enabled === true,
  };
}

/**
 * Build a clean KotPrintDocument from historical Supabase records.
 */
export async function buildKotPrintDocument(
  kotId: string,
  isReprint: boolean = false
): Promise<KotPrintDocument> {
  const supabase = createClient();

  // 1. Fetch KOT record
  let { data: kot, error: kotErr } = await supabase
    .from('kots')
    .select('*')
    .eq('id', kotId)
    .maybeSingle();

  if (!kot) {
    const { data: kotByRound } = await supabase
      .from('kots')
      .select('*')
      .eq('order_round_id', kotId)
      .maybeSingle();
    kot = kotByRound;
  }

  if (!kot) {
    // Construct fallback KOT document if DB query returned null
    return {
      kotId,
      kotNumber: kotId.slice(0, 8),
      roundNumber: 1,
      date: new Date().toLocaleDateString('en-IN'),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      tableNumber: 'T-1',
      floorName: 'Main Floor',
      items: [],
      notes: null,
      isReprint,
    };
  }

  // 2. Fetch KOT items & Order Items
  const { data: kotItems } = await supabase
    .from('kot_items')
    .select('*')
    .eq('kot_id', kotId);

  const orderItemIds = (kotItems || []).map((ki: any) => ki.order_item_id);

  let orderItemsMap = new Map<string, any>();
  if (orderItemIds.length > 0) {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*')
      .in('id', orderItemIds);

    (orderItems || []).forEach((oi: any) => orderItemsMap.set(oi.id, oi));
  }

  // 3. Fetch Order, Round, Session, Table & Floor Info
  let tableNumber = 'T-';
  let floorName: string | null = null;
  let roundNumber: number | null = null;

  if (kot.order_round_id) {
    const { data: round } = await supabase
      .from('order_rounds')
      .select('round_number')
      .eq('id', kot.order_round_id)
      .single();

    if (round) {
      roundNumber = round.round_number;
    }
  }

  if (kot.order_id) {
    const { data: order } = await supabase
      .from('orders')
      .select('table_session_id')
      .eq('id', kot.order_id)
      .single();

    if (order && order.table_session_id) {
      const { data: session } = await supabase
        .from('table_sessions')
        .select('table_id')
        .eq('id', order.table_session_id)
        .single();

      if (session && session.table_id) {
        const { data: table } = await supabase
          .from('restaurant_tables')
          .select('table_number, floor_id')
          .eq('id', session.table_id)
          .single();

        if (table) {
          tableNumber = table.table_number;
          if (table.floor_id) {
            const { data: floor } = await supabase
              .from('floors')
              .select('name')
              .eq('id', table.floor_id)
              .single();
            if (floor) {
              floorName = floor.name;
            }
          }
        }
      }
    }
  }

  // 4. Map Items
  const items: KotPrintItem[] = (kotItems || []).map((ki: any) => {
    const oi = orderItemsMap.get(ki.order_item_id) || {};
    return {
      name: oi.item_name_snapshot || oi.item_name || oi.name || 'Item',
      quantity: Number(ki.quantity || 1),
      itemNote: oi.item_note || null,
    };
  });

  const kotDate = kot.created_at ? new Date(kot.created_at) : new Date();

  return {
    kotId: kot.id,
    kotNumber: kot.kot_number || kot.id.slice(0, 8),
    roundNumber,
    date: kotDate.toLocaleDateString('en-IN'),
    time: kotDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    tableNumber,
    floorName,
    items,
    notes: kot.notes || null,
    isReprint,
  };
}
