import { createClient } from '@/lib/supabase/client';
import { Supplier, CreateSupplierInput } from '@/types/purchases';

/**
 * Fetch all suppliers with calculated purchase stats
 */
export async function getSuppliers(): Promise<Supplier[]> {
  const supabase = createClient();

  const [suppliersRes, purchasesRes] = await Promise.all([
    supabase.from('suppliers').select('*').order('name', { ascending: true }),
    supabase.from('purchases').select('id, supplier_id, created_at'),
  ]);

  if (suppliersRes.error || !suppliersRes.data) {
    return [];
  }

  const purchasesBySupplier = new Map<string, { count: number; lastDate: string | null }>();

  (purchasesRes.data || []).forEach((p) => {
    const existing = purchasesBySupplier.get(p.supplier_id) || { count: 0, lastDate: null };
    const newCount = existing.count + 1;
    let newLastDate = existing.lastDate;

    if (!newLastDate || new Date(p.created_at) > new Date(newLastDate)) {
      newLastDate = p.created_at;
    }

    purchasesBySupplier.set(p.supplier_id, { count: newCount, lastDate: newLastDate });
  });

  return (suppliersRes.data as Supplier[]).map((sup) => {
    const stats = purchasesBySupplier.get(sup.id) || { count: 0, lastDate: null };
    return {
      ...sup,
      total_purchases_count: stats.count,
      last_purchase_date: stats.lastDate,
    };
  });
}

/**
 * Create a new supplier
 */
export async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  const supabase = createClient();

  if (!input.name || !input.name.trim()) {
    throw new Error('Supplier name is required');
  }

  const { data, error } = await supabase
    .from('suppliers')
    .insert([
      {
        name: input.name.trim(),
        contact_person: input.contact_person?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        gst_number: input.gst_number?.trim() || null,
        notes: input.notes?.trim() || null,
        is_active: input.is_active ?? true,
      },
    ])
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create supplier');
  }

  return data as Supplier;
}

/**
 * Update supplier information or status
 */
export async function updateSupplier(
  supplierId: string,
  updates: Partial<CreateSupplierInput>
): Promise<Supplier> {
  const supabase = createClient();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.contact_person !== undefined) updatePayload.contact_person = updates.contact_person?.trim() || null;
  if (updates.phone !== undefined) updatePayload.phone = updates.phone?.trim() || null;
  if (updates.email !== undefined) updatePayload.email = updates.email?.trim() || null;
  if (updates.address !== undefined) updatePayload.address = updates.address?.trim() || null;
  if (updates.gst_number !== undefined) updatePayload.gst_number = updates.gst_number?.trim() || null;
  if (updates.notes !== undefined) updatePayload.notes = updates.notes?.trim() || null;
  if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;

  const { data, error } = await supabase
    .from('suppliers')
    .update(updatePayload)
    .eq('id', supplierId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update supplier');
  }

  return data as Supplier;
}
