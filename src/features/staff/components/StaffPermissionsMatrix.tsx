'use client';

import React from 'react';
import { UserRole } from '@/types';
import { ROLE_PERMISSIONS, NavItemKey } from '@/lib/permissions';
import { CheckCircle2, XCircle, Shield, ShoppingCart, ChefHat, Package, BarChart3, Settings } from 'lucide-react';

interface StaffPermissionsMatrixProps {
  role: UserRole;
}

const PERMISSION_GROUPS: {
  title: string;
  icon: React.ElementType;
  items: { key: NavItemKey; label: string }[];
}[] = [
  {
    title: 'POS Operations',
    icon: ShoppingCart,
    items: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'pos', label: 'POS Terminal' },
      { key: 'tables', label: 'Floor & Tables' },
      { key: 'orders', label: 'Order History' },
      { key: 'billing', label: 'Billing & Cash' },
      { key: 'payments', label: 'Payments' },
    ],
  },
  {
    title: 'Kitchen & Service',
    icon: ChefHat,
    items: [
      { key: 'kitchen', label: 'Kitchen KDS' },
      { key: 'reservations', label: 'Reservations' },
      { key: 'customers', label: 'Customer Directory' },
    ],
  },
  {
    title: 'Menu & Stock',
    icon: Package,
    items: [
      { key: 'menu', label: 'Menu Management' },
      { key: 'recipes', label: 'Recipes & Costing' },
      { key: 'inventory', label: 'Stock & Ingredients' },
      { key: 'purchases', label: 'Purchases' },
      { key: 'suppliers', label: 'Suppliers' },
    ],
  },
  {
    title: 'Business BI & Reports',
    icon: BarChart3,
    items: [
      { key: 'reports', label: 'Operational Reports' },
      { key: 'analytics', label: 'Analytics BI' },
    ],
  },
  {
    title: 'Administration',
    icon: Settings,
    items: [
      { key: 'staff', label: 'Staff Management' },
      { key: 'settings', label: 'System Settings' },
    ],
  },
];

export function StaffPermissionsMatrix({ role }: StaffPermissionsMatrixProps) {
  const allowedKeys = ROLE_PERMISSIONS[role] || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
        <Shield className="w-4 h-4 text-red-600" />
        <span>Permission Access Level: <span className="text-red-600 uppercase font-black">{role}</span></span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {PERMISSION_GROUPS.map((group, idx) => {
          const Icon = group.icon;
          return (
            <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 border-b border-slate-200/80 pb-1.5">
                <Icon className="w-3.5 h-3.5 text-slate-600" />
                <span>{group.title}</span>
              </div>

              <div className="grid grid-cols-1 gap-1 text-xs">
                {group.items.map((item) => {
                  const hasAccess = allowedKeys.includes(item.key);
                  return (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between px-2 py-1 rounded text-[11px] font-medium ${
                        hasAccess
                          ? 'bg-emerald-50/80 text-emerald-900 border border-emerald-200/60'
                          : 'bg-slate-100/60 text-slate-400 opacity-60'
                      }`}
                    >
                      <span>{item.label}</span>
                      {hasAccess ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
