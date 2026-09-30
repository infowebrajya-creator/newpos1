'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  UtensilsCrossed,
  Receipt,
  ChefHat,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
}

export function MobileBottomNav({ onOpenMobileMenu }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Order',
      href: '/pos/order',
      icon: ShoppingCart,
      isActive: pathname?.startsWith('/pos/order'),
    },
    {
      label: 'Tables',
      href: '/pos/tables',
      icon: UtensilsCrossed,
      isActive: pathname?.startsWith('/pos/tables'),
    },
    {
      label: 'Orders',
      href: '/pos/orders',
      icon: Receipt,
      isActive: pathname?.startsWith('/pos/orders'),
    },
    {
      label: 'Kitchen',
      href: '/pos/kitchen',
      icon: ChefHat,
      isActive: pathname?.startsWith('/pos/kitchen'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-white lg:hidden pb-safe shadow-2xl">
      <div className="grid grid-cols-5 h-14 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center space-y-0.5 h-full transition cursor-pointer ${
                item.isActive
                  ? 'text-amber-400 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${item.isActive ? 'text-amber-400 scale-110' : 'text-slate-400'}`} />
                {item.isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
                )}
              </div>
              <span className="text-[10px] font-bold tracking-tight leading-none">{item.label}</span>
            </Link>
          );
        })}

        {/* More Options / Drawer trigger button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center space-y-0.5 h-full text-slate-400 hover:text-white transition cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-bold tracking-tight leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}
