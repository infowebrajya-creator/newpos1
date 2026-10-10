'use client';

import React, { useState } from 'react';
import { Link, usePathname } from '@/lib/navigation';
import { UserProfile } from '@/types';
import { Badge } from '@/components/ui/Badge';
import {
  ShoppingCart,
  UtensilsCrossed,
  Receipt,
  ChefHat,
  FileText,
  Package,
  PieChart,
  ShoppingBag,
  Users,
  Calendar,
  BarChart3,
  LineChart,
  ShieldCheck,
  Settings,
  LogOut,
  Store,
  Printer,
  ChevronDown,
  FlaskConical,
  Menu,
  X,
  LayoutDashboard,
  CreditCard,
} from 'lucide-react';
import { isTestSession } from '@/services/auth/testAuthHelper';
import { PrinterSettingsModal } from '@/features/printing/components/PrinterSettingsModal';
import { useNavHotkeys } from '@/hooks/useNavHotkeys';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface TopbarProps {
  title?: string;
  restaurantName?: string;
  userProfile?: UserProfile | null;
  onSignOut: () => Promise<void>;
}

export function Topbar({
  restaurantName = 'WebRajya Restaurant',
  userProfile,
  onSignOut,
}: TopbarProps) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOnline, setIsMenuOnline] = useState(true);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Enable Global Top Navigation Module Hotkeys (Alt+1..4 & [ / ])
  useNavHotkeys();
  const { isOnline, pendingQueueCount, isSyncing, syncPendingQueue } = useNetworkStatus();

  const isTest = isTestSession(userProfile);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await onSignOut();
  };

  const navCategories = [
    {
      category: 'Front Desk',
      icon: UtensilsCrossed,
      items: [
        { label: 'Dashboard', href: '/pos', icon: LayoutDashboard, exact: true, desc: 'Overview & daily stats' },
        { label: 'POS Terminal', href: '/pos/order', icon: ShoppingCart, desc: 'Take orders & send KOT' },
        { label: 'Tables & Floor', href: '/pos/tables', icon: UtensilsCrossed, desc: 'Floor plan & table status' },
      ],
    },
    {
      category: 'Sales & Billing',
      icon: Receipt,
      items: [
        { label: 'Orders Management', href: '/pos/orders', icon: Receipt, desc: 'Live & past orders' },
        { label: 'Bill History', href: '/pos/billing', icon: FileText, desc: 'Issued & draft bills' },
        { label: 'Payments & Settlement', href: '/pos/payments', icon: CreditCard, desc: 'Collections & cash flow' },
      ],
    },
    {
      category: 'Kitchen & Stock',
      icon: Package,
      items: [
        { label: 'Menu Catalog', href: '/pos/menu', icon: Store, desc: 'Food items & categories' },
        { label: 'Inventory Stock', href: '/pos/inventory', icon: Package, desc: 'Raw materials & alerts' },
        { label: 'Recipes & BOM', href: '/pos/recipes', icon: PieChart, desc: 'Ingredients & food cost' },
        { label: 'Purchases & POs', href: '/pos/purchases', icon: ShoppingBag, desc: 'Vendor orders & supplies' },
      ],
    },
    {
      category: 'Insights & Admin',
      icon: BarChart3,
      items: [
        { label: 'Customer CRM', href: '/pos/customers', icon: Users, desc: 'Guest profiles & history' },
        { label: 'Sales Reports', href: '/pos/reports', icon: BarChart3, desc: 'Daily & monthly revenue' },
        { label: 'Analytics', href: '/pos/analytics', icon: LineChart, desc: 'Business metrics & trends' },
        { label: 'Audit Log', href: '/pos/audit-log', icon: ShieldCheck, desc: 'System activity history' },
        { label: 'POS Settings', href: '/pos/settings', icon: Settings, desc: 'Store & tax configurations' },
      ],
    },
  ];

  const [activeCategoryDropdown, setActiveCategoryDropdown] = useState<string | null>(null);

  return (
    <>
      {/* Interactive Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-3 right-4 z-50 bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xl animate-fadeIn flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
        {/* Top Header Bar (Petpooja POS Style) */}
        <div className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-slate-100">
          {/* Brand & Left Quick Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/pos" className="flex items-center space-x-2">
              <img
                src="/logo.png"
                alt="WebRajya Logo"
                className="w-9 h-9 object-contain rounded-full bg-white p-0.5 border border-slate-200 shadow-2xs"
              />
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight leading-none uppercase">
                  WebRajya <span className="text-orange-600 font-black">POS</span>
                </span>
                <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-0.5">
                  {restaurantName}
                </span>
              </div>
            </Link>

            {/* Quick Workstation Button: + NEW ORDER */}
            <Link
              href="/pos/order"
              className="hidden sm:flex items-center space-x-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>+ New Order</span>
            </Link>

            {/* Bill No Search Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const q = formData.get('billQuery')?.toString().trim();
                if (q) window.location.href = `/pos/orders?search=${encodeURIComponent(q)}`;
              }}
              className="hidden md:flex items-center"
            >
              <input
                type="text"
                name="billQuery"
                placeholder="🔍 Bill No"
                className="w-28 xl:w-36 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white"
              />
            </form>
          </div>

          {/* Right Header Widgets & Customer Support Call Badge */}
          <div className="flex items-center space-x-3 text-xs font-bold text-slate-700">
            {/* Quick Action Badges Bar */}
            <div className="hidden xl:flex items-center space-x-3 text-[11px] font-bold border-r border-slate-200 pr-3">
              {/* Online / Offline Sync Badge */}
              <button
                type="button"
                onClick={syncPendingQueue}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
                }`}
                title={isOnline ? 'Online - Database Sync Active' : `${pendingQueueCount} orders waiting to sync`}
              >
                {isOnline ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>
                  {isOnline ? 'Online' : `Offline (${pendingQueueCount})`}
                </span>
                {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />}
              </button>

              {/* Thermal Printer Quick Config Button */}
              <button
                type="button"
                onClick={() => setIsPrinterModalOpen(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition"
                title="Configure Thermal Receipt Printer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-xs font-bold">Printer Setup</span>
              </button>
            </div>

            {/* Support Call Box: 🎧 Call for Support 9630013483 */}
            <button
              type="button"
              onClick={() => setIsSupportModalOpen(true)}
              className="hidden sm:flex items-center space-x-2 bg-white hover:bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-full shadow-2xs transition cursor-pointer text-left"
              title="Click to Open Customer Support Helpline"
            >
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-700 font-black text-xs">🎧</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Call for Support</span>
                <span className="text-xs font-black text-red-700 tracking-tight">9630013483</span>
              </div>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-1.5 p-1 rounded-lg hover:bg-slate-100 transition focus:outline-none cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                  {(userProfile?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline text-xs font-bold text-slate-800">
                  {userProfile?.full_name?.split(' ')[0] || 'Staff'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-20 text-xs">
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <p className="font-bold text-slate-900">{userProfile?.full_name || 'Staff User'}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{userProfile?.role || 'User'}</p>
                    </div>

                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-rose-600 hover:bg-rose-50 font-bold text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Modules Bar (Categorized Dropdowns) */}
        <nav className="hidden lg:flex items-center space-x-2 px-4 py-1.5 bg-slate-50 border-t border-slate-200 text-xs font-bold">
          {navCategories.map((group, idx) => {
            const isCategoryActive = group.items.some((item) =>
              item.exact ? pathname === item.href : pathname?.startsWith(item.href)
            );
            const isOpen = activeCategoryDropdown === group.category;
            const CategoryIcon = group.icon;
            const shortcutBadge = `Alt+${idx + 1}`;

            return (
              <div key={group.category} className="relative">
                <button
                  type="button"
                  onClick={() => setActiveCategoryDropdown(isOpen ? null : group.category)}
                  className={`px-3.5 py-1.5 rounded-xl flex items-center space-x-1.5 transition cursor-pointer ${
                    isCategoryActive
                      ? 'bg-slate-900 text-white font-black shadow-xs border border-slate-800'
                      : 'text-slate-800 hover:bg-slate-200/80 hover:text-slate-900 font-bold'
                  }`}
                >
                  <CategoryIcon className={`w-4 h-4 ${isCategoryActive ? 'text-amber-400' : 'text-slate-600'}`} />
                  <span>{group.category}</span>
                  <span
                    className={`ml-1 text-[9px] font-mono font-bold px-1 py-0.2 rounded ${
                      isCategoryActive
                        ? 'bg-slate-800 text-amber-300 border border-slate-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {shortcutBadge}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveCategoryDropdown(null)} />
                    <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-fadeIn space-y-0.5">
                      <div className="px-3.5 py-1 mb-1 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          {group.category}
                        </span>
                      </div>

                      {group.items.map((item) => {
                        const isItemActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
                        const ItemIcon = item.icon;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setActiveCategoryDropdown(null)}
                            className={`flex items-start space-x-2.5 px-3.5 py-2 transition ${
                              isItemActive
                                ? 'bg-orange-50 text-orange-700 font-extrabold border-l-4 border-orange-600'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <ItemIcon className={`w-4 h-4 mt-0.5 shrink-0 ${isItemActive ? 'text-orange-600' : 'text-slate-500'}`} />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold leading-tight">{item.label}</span>
                              <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                                {item.desc}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </nav>

        {/* Mobile Navigation Drawer (Grouped by Category) */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 px-3 py-3 space-y-4 text-xs font-bold shadow-lg max-h-[80vh] overflow-y-auto">
            {navCategories.map((group) => (
              <div key={group.category} className="space-y-1">
                <div className="text-[10px] font-extrabold uppercase text-slate-400 px-2 tracking-wider">
                  {group.category}
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {group.items.map((item) => {
                    const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
                    const ItemIcon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl transition ${
                          isActive
                            ? 'bg-red-700 text-white font-black shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <ItemIcon className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold leading-none">{item.label}</span>
                          <span className={`text-[10px] mt-0.5 ${isActive ? 'text-red-100' : 'text-slate-400'}`}>
                            {item.desc}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Global Printer Settings Modal */}
      <PrinterSettingsModal
        isOpen={isPrinterModalOpen}
        onClose={() => setIsPrinterModalOpen(false)}
      />

      {/* Customer Support Modal */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold flex items-center justify-center">
              🎧
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">WebRajya POS Support</h3>
              <p className="text-xs text-slate-500">24/7 Dedicated Support Helpline for Restaurants</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs font-bold">
              <a
                href="tel:9630013483"
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-300 text-red-700 transition"
              >
                <span>📞 Phone Helpline:</span>
                <span className="font-extrabold text-sm">+91 96300 13483</span>
              </a>
              <a
                href="https://wa.me/919630013483?text=Hi%20WebRajya%20POS%20Support"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 text-emerald-700 transition"
              >
                <span>💬 WhatsApp Support:</span>
                <span className="font-extrabold text-sm">+91 96300 13483</span>
              </a>
            </div>

            <button
              onClick={() => setIsSupportModalOpen(false)}
              className="w-full py-2 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
