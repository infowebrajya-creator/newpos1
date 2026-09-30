'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavItemKey, hasPermission } from '@/lib/permissions';
import { UserRole } from '@/types';
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  Receipt,
  ChefHat,
  FileText,
  CreditCard,
  BookOpen,
  Users,
  Calendar,
  Package,
  ShoppingBag,
  Truck,
  BarChart3,
  LineChart,
  ShieldCheck,
  UserCheck,
  Settings,
  X,
  Lock,
  PieChart,
  ChevronRight,
  ChevronLeft,
  Store,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: UserRole | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavGroup {
  title: string;
  items: {
    key: NavItemKey;
    label: string;
    href: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'POS OPERATIONS',
    items: [
      { key: 'dashboard', label: 'Dashboard', href: '/pos', icon: LayoutDashboard },
      { key: 'pos', label: 'POS Terminal', href: '/pos/order', icon: ShoppingCart },
      { key: 'tables', label: 'Tables & Floor', href: '/pos/tables', icon: UtensilsCrossed },
      { key: 'orders', label: 'Order History', href: '/pos/orders', icon: Receipt },
      { key: 'kitchen', label: 'Kitchen (KOT)', href: '/pos/kitchen', icon: ChefHat },
      { key: 'billing', label: 'Billing & Cash', href: '/pos/billing', icon: FileText },
      { key: 'payments', label: 'Payments', href: '/pos/payments', icon: CreditCard },
    ],
  },
  {
    title: 'MENU & STOCK',
    items: [
      { key: 'menu', label: 'Menu Items', href: '/pos/menu', icon: BookOpen },
      { key: 'recipes', label: 'Recipes & Costing', href: '/pos/recipes', icon: PieChart },
      { key: 'inventory', label: 'Stock & Inventory', href: '/pos/inventory', icon: Package },
      { key: 'purchases', label: 'Purchases', href: '/pos/purchases', icon: ShoppingBag },
      { key: 'suppliers', label: 'Suppliers', href: '/pos/suppliers', icon: Truck },
    ],
  },
  {
    title: 'CRM & REPORTS',
    items: [
      { key: 'customers', label: 'Customers', href: '/pos/customers', icon: Users },
      { key: 'reports', label: 'Reports', href: '/pos/reports', icon: BarChart3 },
      { key: 'analytics', label: 'Analytics BI', href: '/pos/analytics', icon: LineChart },
      { key: 'audit', label: 'Audit Log', href: '/pos/audit-log', icon: ShieldCheck },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { key: 'staff', label: 'Staff Management', href: '/pos/staff', icon: UserCheck },
      { key: 'settings', label: 'Settings & Printers', href: '/pos/settings', icon: Settings },
    ],
  },
];

export function Sidebar({
  isOpen,
  onClose,
  userRole,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar Component */}
      <aside
        className={`fixed top-0 left-0 bottom-0 bg-slate-900 border-r border-slate-800/90 z-50 flex flex-col transition-all duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'w-20' : 'w-60'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/90 shrink-0">
          <Link href="/pos" className="flex items-center space-x-3 overflow-hidden group">
            <img
              src="/logo.png"
              alt="WebRajya Logo"
              className="w-10 h-10 object-contain rounded-full bg-white p-0.5 border border-amber-400/50 shadow-md shadow-amber-400/20 group-hover:scale-105 transition-transform shrink-0"
            />
            {!collapsed && (
              <div className="truncate">
                <h1 className="font-extrabold text-white text-sm tracking-tight leading-none uppercase">
                  WebRajya <span className="text-amber-400 font-black">POS</span>
                </h1>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mt-1">
                  Restaurant System
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {NAV_GROUPS.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!collapsed && (
                <h3 className="px-3 text-[10px] font-extrabold tracking-wider uppercase text-slate-500 mb-1">
                  {group.title}
                </h3>
              )}

              {group.items.map((item) => {
                const isAllowed = userRole ? hasPermission(userRole, item.key) : true;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/pos' && pathname?.startsWith(item.href));
                const Icon = item.icon;

                if (!isAllowed) {
                  return (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-slate-600 cursor-not-allowed opacity-40 select-none text-xs font-semibold ${
                        collapsed ? 'justify-center' : ''
                      }`}
                      title="Access restricted for your role"
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-4 h-4 text-slate-600 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {!collapsed && <Lock className="w-3 h-3 text-slate-600 shrink-0" />}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all relative group ${
                      isActive
                        ? 'bg-amber-400/15 text-amber-300 border border-amber-500/30 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    {/* Active Bar Indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-amber-400 rounded-r" />
                    )}

                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />

                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer Info */}
        <div className="p-3 border-t border-slate-800/90 bg-slate-950/60 shrink-0">
          {!collapsed ? (
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>WebRajya POS v1.0</span>
              </div>
              <span className="text-[10px] text-amber-400 font-extrabold uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                POS ACTIVE
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="System Active" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
