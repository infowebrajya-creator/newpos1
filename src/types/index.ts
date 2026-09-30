export type UserRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'cashier'
  | 'captain'
  | 'kitchen'
  | 'inventory'
  | 'accountant';

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  phone_number?: string | null;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  role?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface RestaurantSettings {
  id: string;
  name: string;
  legal_name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  fssai_license?: string | null;
  currency?: string;
  tax_rate?: number;
  service_charge_rate?: number;
  logo_url?: string | null;
  receipt_header?: string | null;
  receipt_footer?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}
