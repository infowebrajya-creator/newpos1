import { createClient } from '@/lib/supabase/client';
import { RestaurantSettings } from '@/types';

const STORAGE_KEY = 'webrajya_pos_restaurant_settings';

export const DEFAULT_RESTAURANT_SETTINGS: RestaurantSettings = {
  id: '10000000-0000-0000-0000-000000000001',
  name: 'WEBRAJYA RESTAURANT',
  legal_name: '',
  phone: '9630013483',
  email: 'contact@restaurant.com',
  address: '',
  gstin: '24AAAAA0000A1Z5',
  fssai_license: '10020021000123',
  receipt_header: '',
  receipt_footer: 'THANK YOU! VISIT AGAIN',
  tax_rate: 5.0,
  tax_enabled: true,
  show_gstin: true,
  show_fssai: true,
  logo_url: '/logo.png',
  currency: 'INR',
  currency_symbol: '₹',
};

/**
 * Retrieve the single restaurant settings record (Client Side)
 * Merges localStorage cache with Supabase DB record so offline/refreshes keep saved data 100% intact.
 */
export async function getRestaurantSettings(): Promise<RestaurantSettings> {
  let cached: Partial<RestaurantSettings> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        cached = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse cached restaurant settings:', e);
    }
  }

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const merged = { ...DEFAULT_RESTAURANT_SETTINGS, ...cached, ...data };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
      return merged as RestaurantSettings;
    }
  } catch (err) {
    console.error('Failed to fetch restaurant settings from Supabase:', err);
  }

  const fallback = { ...DEFAULT_RESTAURANT_SETTINGS, ...cached };
  return fallback as RestaurantSettings;
}

/**
 * Update restaurant settings in public.restaurant_settings and localStorage
 */
export async function updateRestaurantSettings(
  id: string,
  updates: Partial<RestaurantSettings>,
  performingUserId?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Immediately update LocalStorage for instant 0ms persistence
  let currentSettings = { ...DEFAULT_RESTAURANT_SETTINGS };
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) currentSettings = { ...currentSettings, ...JSON.parse(stored) };
      const merged = { ...currentSettings, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error('Failed to update local storage settings:', e);
    }
  }

  // 2. Persist to Supabase DB
  const supabase = createClient();
  const targetId = id || currentSettings.id || '10000000-0000-0000-0000-000000000001';

  const payload = {
    id: targetId,
    name: updates.name ?? currentSettings.name,
    legal_name: updates.legal_name ?? currentSettings.legal_name,
    phone: updates.phone ?? currentSettings.phone,
    email: updates.email ?? currentSettings.email,
    address: updates.address ?? currentSettings.address,
    gstin: updates.gstin ?? currentSettings.gstin,
    fssai_license: updates.fssai_license ?? currentSettings.fssai_license,
    receipt_header: updates.receipt_header ?? currentSettings.receipt_header,
    receipt_footer: updates.receipt_footer ?? currentSettings.receipt_footer,
    tax_rate: updates.tax_rate ?? currentSettings.tax_rate,
    tax_enabled: updates.tax_enabled ?? currentSettings.tax_enabled,
    show_gstin: updates.show_gstin ?? currentSettings.show_gstin,
    show_fssai: updates.show_fssai ?? currentSettings.show_fssai,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from('restaurant_settings')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase update warning (saved to localStorage):', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase network error during settings update (saved to localStorage):', err.message);
  }

  // Audit Log Entry
  try {
    await supabase.from('audit_logs').insert({
      user_id: performingUserId || null,
      action: 'UPDATE_RESTAURANT_SETTINGS',
      entity_type: 'restaurant_settings',
      entity_id: targetId,
      reason: `Updated configuration: ${Object.keys(updates).join(', ')}`,
      created_at: new Date().toISOString(),
    });
  } catch (auditErr) {
    // Non-blocking audit error
  }

  return { success: true };
}

