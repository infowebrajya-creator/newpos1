import { createClient } from '@/lib/supabase/client';
import { Purchase, PurchaseItem, CreatePurchaseInput, PurchaseStatus } from '@/types/purchases';

/**
 * Fetch all purchases with supplier names and optional filtering
 */
export async function getPurchases(statusFilter?: PurchaseStatus | 'all'): Promise<Purchase[]> {
  const supabase = createClient();

  let query = supabase.from('purchases').select('*').order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const [purchasesRes, suppliersRes] = await Promise.all([
    query,
    supabase.from('suppliers').select('id, name'),
  ]);

  if (purchasesRes.error || !purchasesRes.data) {
    return [];
  }

  const supplierMap = new Map<string, string>();
  (suppliersRes.data || []).forEach((sup) => supplierMap.set(sup.id, sup.name));

  return (purchasesRes.data as Purchase[]).map((p) => ({
    ...p,
    supplier_name: supplierMap.get(p.supplier_id) || 'Unknown Supplier',
  }));
}

/**
 * Fetch a detailed purchase by ID including purchase items and ingredient names
 */
export async function getPurchaseById(purchaseId: string): Promise<Purchase | null> {
  const supabase = createClient();

  const [purchaseRes, itemsRes, ingredientsRes, supplierRes] = await Promise.all([
    supabase.from('purchases').select('*').eq('id', purchaseId).single(),
    supabase.from('purchase_items').select('*').eq('purchase_id', purchaseId),
    supabase.from('ingredients').select('id, name'),
    supabase.from('suppliers').select('id, name'),
  ]);

  if (purchaseRes.error || !purchaseRes.data) {
    return null;
  }

  const purchase = purchaseRes.data as Purchase;
  const ingMap = new Map<string, string>();
  (ingredientsRes.data || []).forEach((i) => ingMap.set(i.id, i.name));

  const supplierMap = new Map<string, string>();
  (supplierRes.data || []).forEach((s) => supplierMap.set(s.id, s.name));

  const items: PurchaseItem[] = (itemsRes.data || []).map((item) => ({
    ...item,
    ingredient_name: ingMap.get(item.ingredient_id) || 'Unknown Ingredient',
  }));

  return {
    ...purchase,
    supplier_name: supplierMap.get(purchase.supplier_id) || 'Unknown Supplier',
    items,
  };
}

/**
 * Create a new purchase with items in draft or ordered state
 */
export async function createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
  const supabase = createClient();

  if (!input.supplier_id) {
    throw new Error('Supplier is required');
  }

  if (!input.items || input.items.length === 0) {
    throw new Error('Purchase must contain at least one item');
  }

  // Validate items
  let subtotal = 0;
  const processedItems = input.items.map((item) => {
    if (!item.ingredient_id) {
      throw new Error('All purchase items must reference a valid ingredient');
    }
    if (item.quantity <= 0) {
      throw new Error('Item quantity must be greater than 0');
    }
    if (item.unit_cost < 0) {
      throw new Error('Unit cost cannot be negative');
    }

    const line_total = Number((item.quantity * item.unit_cost).toFixed(2));
    subtotal += line_total;

    return {
      ingredient_id: item.ingredient_id,
      quantity: item.quantity,
      unit: item.unit,
      unit_cost: item.unit_cost,
      line_total,
    };
  });

  const discountAmount = input.discount_amount || 0;
  const taxAmount = input.tax_amount || 0;
  const roundingAmount = input.rounding_amount || 0;
  const grandTotal = Number((subtotal - discountAmount + taxAmount + roundingAmount).toFixed(2));

  // 1. Insert purchase header
  const { data: purchaseData, error: purchaseError } = await supabase
    .from('purchases')
    .insert([
      {
        supplier_id: input.supplier_id,
        invoice_number: input.invoice_number?.trim() || null,
        purchase_date: input.purchase_date || new Date().toISOString().split('T')[0],
        notes: input.notes?.trim() || null,
        status: input.status || 'draft',
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        rounding_amount: roundingAmount,
        grand_total: grandTotal,
      },
    ])
    .select()
    .single();

  if (purchaseError || !purchaseData) {
    throw new Error(purchaseError?.message || 'Failed to create purchase header');
  }

  // 2. Insert purchase items
  const itemsToInsert = processedItems.map((item) => ({
    purchase_id: purchaseData.id,
    ...item,
  }));

  const { error: itemsError } = await supabase.from('purchase_items').insert(itemsToInsert);

  if (itemsError) {
    // Attempt rollback of header if items insert fails
    await supabase.from('purchases').delete().eq('id', purchaseData.id);
    throw new Error(itemsError.message || 'Failed to create purchase items');
  }

  return getPurchaseById(purchaseData.id) as Promise<Purchase>;
}

/**
 * Update purchase status (e.g. from draft to ordered)
 */
export async function updatePurchaseStatus(
  purchaseId: string,
  newStatus: PurchaseStatus
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('purchases')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', purchaseId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

/**
 * Receive a purchase atomically via receive_purchase RPC
 */
export async function receivePurchase(purchaseId: string): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('receive_purchase', {
    p_purchase_id: purchaseId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return !!data;
}

/**
 * Cancel a purchase via cancel_purchase RPC
 */
export async function cancelPurchase(
  purchaseId: string,
  cancellationReason?: string
): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('cancel_purchase', {
    p_purchase_id: purchaseId,
    p_reason: cancellationReason?.trim() || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Audit Log Entry
  try {
    await supabase.from('audit_logs').insert({
      action: 'CANCEL_PURCHASE',
      entity_type: 'purchase',
      entity_id: purchaseId,
      reason: cancellationReason?.trim() || 'Purchase order cancelled',
      created_at: new Date().toISOString(),
    });
  } catch (auditErr) {
    // Non-blocking audit error
  }

  return !!data;
}
