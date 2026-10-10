import { createClient } from '@/lib/supabase/client';
import { fetchMenu } from '@/services/apiServices';
import { BillPrintDocument, KotPrintDocument, BillPrintItem, KotPrintItem } from '@/types/printing';
import { getRestaurantSettings } from '@/services/settings/settingsService';

let cachedMenuMap: Map<string, string> | null = null;

async function getUniversalMenuMap(): Promise<Map<string, string>> {
  if (cachedMenuMap && cachedMenuMap.size > 0) {
    return cachedMenuMap;
  }

  const map = new Map<string, string>();
  const supabase = createClient();

  try {
    const { data } = await supabase.from('menu_items').select('id, name, item_name');
    if (data && data.length > 0) {
      data.forEach((m: any) => {
        if (m.id) {
          map.set(m.id, m.name || m.item_name || 'Item');
        }
      });
    }
  } catch {
    // Ignore error
  }

  if (map.size === 0) {
    try {
      const json = await fetchMenu();
      const list = json.menuItems || [];
      list.forEach((m: any) => {
        if (m.id) {
          map.set(m.id, m.name || m.item_name || 'Item');
        }
      });
    } catch {
      // Ignore fetch error
    }
  }

  if (map.size > 0) {
    cachedMenuMap = map;
  }
  return map;
}

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

  // 2. Fetch Session & Table & Customer Info
  let tableNumber = 'T-01';
  let guestCount = 1;
  let customerName = 'Walk-in Customer';
  let orderNumber = bill.bill_number || bill.id.slice(0, 8);
  let cashierName = 'Cashier';

  if (bill.table_session_id) {
    const { data: session } = await supabase
      .from('table_sessions')
      .select('guest_count, table_id, customer_id')
      .eq('id', bill.table_session_id)
      .single();

    if (session) {
      guestCount = session.guest_count || 1;
      if (session.table_id) {
        const { data: table } = await supabase
          .from('restaurant_tables')
          .select('table_number')
          .eq('id', session.table_id)
          .single();

        if (table) {
          tableNumber = table.table_number;
        }
      }
      if (session.customer_id) {
        const { data: cust } = await supabase
          .from('customers')
          .select('name, full_name')
          .eq('id', session.customer_id)
          .single();
        if (cust) {
          customerName = cust.name || cust.full_name || customerName;
        }
      }
    }
  }

  if (bill.order_id) {
    const { data: ord } = await supabase
      .from('orders')
      .select('order_number')
      .eq('id', bill.order_id)
      .single();
    if (ord && ord.order_number) {
      orderNumber = ord.order_number;
    }
  }

  // 3. Map Items using stored historical snapshots or fallback to order_items & menu_items
  const orderItemIds = rawItems.map((i: any) => i.order_item_id).filter(Boolean);
  let orderItemsMap = new Map<string, any>();
  const universalMenuMap = await getUniversalMenuMap();

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

  let items: BillPrintItem[] = rawItems.map((item: any) => {
    const oi = item.order_item_id ? orderItemsMap.get(item.order_item_id) : null;
    const menuItemId = item.menu_item_id || oi?.menu_item_id;
    const menuItemName = menuItemId ? universalMenuMap.get(menuItemId) : null;

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

    // Detect veg status from name
    const isVeg = !/chicken|mutton|fish|egg|pork|beef|prawn|meat|tikka biryani/i.test(name);

    return {
      name,
      quantity,
      unitPrice,
      lineTotal,
      isComplimentary: item.is_complimentary ?? oi?.is_complimentary ?? (unitPrice === 0),
      isVeg,
      itemNote: item.notes || oi?.notes || null,
    };
  });

  if (items.length === 0 && orderItemsList.length > 0) {
    items = orderItemsList.map((oi: any) => {
      const menuItemName = oi.menu_item_id ? universalMenuMap.get(oi.menu_item_id) : null;
      const name = oi.item_name || oi.name || menuItemName || 'Item';
      const quantity = Number(oi.quantity || 1);
      const unitPrice = Number(oi.unit_price || 0);
      const lineTotal = oi.is_complimentary ? 0 : unitPrice * quantity;
      const isVeg = !/chicken|mutton|fish|egg|pork|beef|prawn|meat|tikka biryani/i.test(name);
      return {
        name,
        quantity,
        unitPrice,
        lineTotal,
        isComplimentary: !!oi.is_complimentary,
        isVeg,
        itemNote: oi.notes || null,
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

  const taxAmount = Number(bill.tax_amount || 0);
  const taxEnabled = settings.tax_enabled === true || settings.show_gstin === true;

  return {
    billId: bill.id,
    billNumber: bill.bill_number || bill.id.slice(0, 8),
    memoNumber: `SR-${bill.bill_number || bill.id.slice(0, 8)}`,
    date: billDate.toLocaleDateString('en-IN'),
    time: billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    tableNumber,
    guestCount,
    restaurantName: (settings as any).restaurant_name || settings.name || 'WEBRAJYA POS RESTO',
    legalName: settings.legal_name || 'L N FOODS',
    estdYear: (settings as any).estd_year || '1975',
    address: settings.address || 'B-10, Central MIDC Road, Hingna Industrial Area, Nagpur',
    phone: settings.phone || '+91 7020796007',
    gstin: settings.gstin || '27AAAAA0000A1Z5',
    fssaiLicense: settings.fssai_license || '11520056000020',
    receiptHeader: settings.receipt_header || 'Taste That Brings You Back!',
    receiptFooter: settings.receipt_footer || 'Thank You! Visit Again',
    items,
    subtotal: Number(bill.subtotal || 0),
    discountAmount: Number(bill.discount_amount || 0),
    taxAmount,
    cgstRate: 2.5,
    cgstAmount: taxAmount / 2,
    sgstRate: 2.5,
    sgstAmount: taxAmount / 2,
    roundingAmount: Number(bill.rounding_amount || 0),
    grandTotal: Number(bill.grand_total || 0),
    paymentMethod,
    paidAmount,
    customerName,
    orderNumber,
    cashierName,
    isReprint,
    taxEnabled,
  };
}

/**
 * Build a clean KotPrintDocument from historical Supabase records.
 */
export async function buildKotPrintDocument(
  kotId: string,
  isReprint: boolean = false,
  fallbackCartItems?: any[]
): Promise<KotPrintDocument> {
  const supabase = createClient();
  const universalMenuMap = await getUniversalMenuMap();

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
    // Try querying order_items directly by order_round_id
    const { data: directItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_round_id', kotId);

    let fallbackItems: KotPrintItem[] = [];
    if (directItems && directItems.length > 0) {
      fallbackItems = directItems.map((di: any, idx: number) => {
        const miName = di.menu_item_id ? universalMenuMap.get(di.menu_item_id) : null;
        const fbByItemId = di.menu_item_id ? fallbackCartItems?.find((c: any) => (c.menuItemId || c.id) === di.menu_item_id) : null;
        const fbByIdx = fallbackCartItems && fallbackCartItems[idx] ? fallbackCartItems[idx] : null;
        const fb = fbByItemId || fbByIdx;

        const name =
          (di.item_name_snapshot && di.item_name_snapshot !== 'Item' ? di.item_name_snapshot : null) ||
          (di.item_name && di.item_name !== 'Item' ? di.item_name : null) ||
          (di.name && di.name !== 'Item' ? di.name : null) ||
          (miName && miName !== 'Item' ? miName : null) ||
          fb?.itemName ||
          fb?.name ||
          'Item';

        return {
          name,
          quantity: Number(di.quantity || fb?.quantity || 1),
          itemNote: di.notes || di.item_note || fb?.itemNote || null,
        };
      });
    }

    if (fallbackCartItems && fallbackCartItems.length > 0) {
      const hasValidNames = fallbackItems.some((fi) => fi.name && fi.name !== 'Item');
      if (!hasValidNames) {
        fallbackItems = fallbackCartItems.map((ci: any) => ({
          name: ci.itemName || ci.name || 'Item',
          quantity: Number(ci.quantity || 1),
          itemNote: ci.itemNote || ci.notes || null,
        }));
      }
    }

    return {
      kotId,
      kotNumber: kotId.slice(0, 8),
      roundNumber: 1,
      date: new Date().toLocaleDateString('en-IN'),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      tableNumber: 'T-1',
      floorName: 'Main Floor',
      items: fallbackItems,
      notes: null,
      isReprint,
    };
  }

  // 2. Fetch KOT items & Order Items
  let { data: kotItems } = await supabase
    .from('kot_items')
    .select('*')
    .eq('kot_id', kot.id);

  let orderItemsMap = new Map<string, any>();

  if (kotItems && kotItems.length > 0) {
    const orderItemIds = kotItems.map((ki: any) => ki.order_item_id).filter(Boolean);
    if (orderItemIds.length > 0) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .in('id', orderItemIds);
      (orderItems || []).forEach((oi: any) => orderItemsMap.set(oi.id, oi));
    }
  } else if (kot.order_round_id) {
    const { data: directOrderItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_round_id', kot.order_round_id);

    if (directOrderItems && directOrderItems.length > 0) {
      kotItems = directOrderItems.map((oi: any) => ({
        id: oi.id,
        kot_id: kot.id,
        order_item_id: oi.id,
        quantity: oi.quantity,
        notes: oi.notes,
      }));
      directOrderItems.forEach((oi: any) => orderItemsMap.set(oi.id, oi));
    }
  }

  // 3. Fetch Order, Round, Session, Table & Floor Info
  let tableNumber = kot.table_number || 'T-01';
  let floorName: string | null = null;
  let roundNumber: number | null = null;
  let orderNumber: string = kot.kot_number || kot.id.slice(0, 8);
  let orderType = 'DINE-IN';
  let captainName = 'Admin';
  let queueToken = orderNumber;

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
      .select('table_session_id, order_number, order_type')
      .eq('id', kot.order_id)
      .single();

    if (order) {
      if (order.order_number) {
        orderNumber = order.order_number;
        queueToken = order.order_number;
      }
      if (order.order_type) {
        orderType = order.order_type;
      }

      if (order.table_session_id) {
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
  }

  // 4. Map Items
  let items: KotPrintItem[] = (kotItems || []).map((ki: any, idx: number) => {
    const oi = orderItemsMap.get(ki.order_item_id) || {};
    const menuItemId = oi.menu_item_id || ki.menu_item_id;
    const miName = menuItemId ? universalMenuMap.get(menuItemId) : null;
    const fbByItemId = menuItemId ? fallbackCartItems?.find((c: any) => (c.menuItemId || c.id) === menuItemId) : null;
    const fbByIdx = fallbackCartItems && fallbackCartItems[idx] ? fallbackCartItems[idx] : null;
    const fb = fbByItemId || fbByIdx;

    const name =
      (oi.item_name_snapshot && oi.item_name_snapshot !== 'Item' ? oi.item_name_snapshot : null) ||
      (oi.item_name && oi.item_name !== 'Item' ? oi.item_name : null) ||
      (oi.name && oi.name !== 'Item' ? oi.name : null) ||
      (miName && miName !== 'Item' ? miName : null) ||
      fb?.itemName ||
      fb?.name ||
      'Item';

    const isVeg = !/chicken|mutton|fish|egg|pork|beef|prawn|meat|tikka biryani/i.test(name);

    return {
      name,
      quantity: Number(ki.quantity || oi.quantity || fb?.quantity || 1),
      itemNote: ki.notes || oi.notes || oi.item_note || fb?.itemNote || null,
      isVeg,
    };
  });

  if (fallbackCartItems && fallbackCartItems.length > 0) {
    const hasValidNames = items.some((it) => it.name && it.name !== 'Item');
    if (!hasValidNames) {
      items = fallbackCartItems.map((ci: any) => {
        const name = ci.itemName || ci.name || 'Item';
        const isVeg = !/chicken|mutton|fish|egg|pork|beef|prawn|meat|tikka biryani/i.test(name);
        return {
          name,
          quantity: Number(ci.quantity || 1),
          itemNote: ci.itemNote || ci.notes || null,
          isVeg,
        };
      });
    }
  }

  const hasVeg = items.some((it) => it.isVeg);
  const badges: string[] = [];
  if (hasVeg) badges.push('PURE VEG');

  const kotDate = kot.created_at ? new Date(kot.created_at) : new Date();

  return {
    kotId: kot.id,
    kotNumber: kot.kot_number || kot.id.slice(0, 8),
    copyIndex: 1,
    totalCopies: 1,
    roundNumber,
    date: kotDate.toLocaleDateString('en-IN'),
    time: kotDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    tableNumber,
    orderNumber,
    orderType,
    captainName,
    queueToken: `#${queueToken.replace(/^#/, '')}`,
    badges,
    floorName,
    items,
    notes: kot.notes || null,
    printedAt: kotDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    printCount: (kot.print_count || 0) + 1,
    isReprint,
  };
}

