import { UserRole } from '@/types';

export type NavItemKey =
  | 'dashboard'
  | 'pos'
  | 'tables'
  | 'orders'
  | 'kitchen'
  | 'billing'
  | 'payments'
  | 'recipes'
  | 'menu'
  | 'customers'
  | 'reservations'
  | 'inventory'
  | 'purchases'
  | 'suppliers'
  | 'reports'
  | 'analytics'
  | 'staff'
  | 'settings'
  | 'audit';

export const ROLE_PERMISSIONS: Record<UserRole, NavItemKey[]> = {
  owner: [
    'dashboard',
    'pos',
    'tables',
    'orders',
    'kitchen',
    'billing',
    'payments',
    'recipes',
    'menu',
    'customers',
    'reservations',
    'inventory',
    'purchases',
    'suppliers',
    'reports',
    'analytics',
    'staff',
    'settings',
    'audit',
  ],
  admin: [
    'dashboard',
    'pos',
    'tables',
    'orders',
    'kitchen',
    'billing',
    'payments',
    'recipes',
    'menu',
    'customers',
    'reservations',
    'inventory',
    'purchases',
    'suppliers',
    'reports',
    'analytics',
    'staff',
    'audit',
  ],
  manager: [
    'dashboard',
    'pos',
    'tables',
    'orders',
    'kitchen',
    'billing',
    'payments',
    'recipes',
    'menu',
    'customers',
    'reservations',
    'inventory',
    'purchases',
    'suppliers',
    'reports',
    'analytics',
    'audit',
  ],
  cashier: [
    'dashboard',
    'pos',
    'tables',
    'orders',
    'billing',
    'payments',
    'customers',
  ],
  captain: [
    'dashboard',
    'pos',
    'tables',
    'orders',
  ],
  kitchen: [
    'kitchen',
    'orders',
  ],
  inventory: [
    'inventory',
    'recipes',
    'purchases',
    'suppliers',
  ],
  accountant: [
    'dashboard',
    'billing',
    'payments',
    'reports',
    'analytics',
    'audit',
  ],
};

/**
 * Check if a specific user role has permission to access a nav module
 */
export function hasPermission(role: UserRole, itemKey: NavItemKey): boolean {
  const allowedItems = ROLE_PERMISSIONS[role];
  return allowedItems ? allowedItems.includes(itemKey) : false;
}
