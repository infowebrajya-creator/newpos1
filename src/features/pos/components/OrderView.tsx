'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { TableWithSession } from '@/types/tables';
import { MenuCategory, MenuItem } from '@/types/menu';
import { CartProvider, useCart } from '@/features/pos/context/CartContext';
import { MenuPanel } from '@/features/pos/components/MenuPanel';
import { CartPanel } from '@/features/pos/components/CartPanel';
import { OrderHistoryPanel } from '@/features/pos/components/OrderHistoryPanel';
import {
  UtensilsCrossed,
  Users,
  Hash,
  ArrowLeft,
  Receipt,
  ShoppingCart,
  Send,
  Printer,
  Percent,
  FileText,
  Trash2,
  Save,
  CheckCircle2,
  X,
  ChevronUp,
} from 'lucide-react';

interface OrderViewProps {
  table: TableWithSession;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  initialOrderType?: 'dine_in' | 'takeaway' | 'delivery';
}

function OrderViewInner({ table, categories, menuItems, initialOrderType = 'dine_in' }: OrderViewProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'cart' | 'history'>('cart');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>(initialOrderType);
  const [historyTrigger, setHistoryTrigger] = useState<number>(0);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);

  const { cartItems, clearCart, totalItems, total } = useCart();

  const session = table.active_session;
  const tableNumber = table.table_number;
  const guestCount = session?.guest_count || 1;
  const sessionNumber = session?.session_number || '1';

  const handleOrderSubmitted = () => {
    setHistoryTrigger((prev) => prev + 1);
    setIsMobileCartOpen(false);
  };

  const formatPrice = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] max-w-[1700px] mx-auto space-y-2 relative pb-12 lg:pb-0">
      {/* 1. TOP CONTEXT HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Link
            href="/pos/tables"
            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            title="Back to Table Floor Plan"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              {tableNumber}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  TABLE {tableNumber}
                </span>
                {/* Order Type Toggle Buttons */}
                <div className="flex items-center space-x-0.5 bg-slate-100 p-0.5 rounded text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setOrderType('dine_in')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer uppercase ${
                      orderType === 'dine_in' ? 'bg-red-600 text-white font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    DINE IN
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('takeaway')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer uppercase ${
                      orderType === 'takeaway' ? 'bg-red-600 text-white font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    TAKEAWAY
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('delivery')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer uppercase ${
                      orderType === 'delivery' ? 'bg-red-600 text-white font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    DELIVERY
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-bold">
                <span>Session #{sessionNumber}</span>
                <span>•</span>
                <span>{guestCount} Guests</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Cart / Order History */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('cart');
              setIsMobileCartOpen(true);
            }}
            className={`px-3 py-1 rounded-md transition cursor-pointer ${
              activeTab === 'cart' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Cart ({totalItems})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 rounded-md transition cursor-pointer ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Order Rounds
          </button>
        </div>
      </div>

      {/* 2. MAIN POS WORKSTATION AREA */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
        
        {/* LEFT COLUMN: CATEGORIES LIST (2 cols on lg) */}
        <div className="hidden lg:flex lg:col-span-2 flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="p-2.5 border-b border-slate-200 bg-slate-50 font-black text-xs text-slate-900 uppercase tracking-wider">
            Categories
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-extrabold uppercase transition cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              ALL ITEMS ({menuItems.length})
            </button>

            {categories.map((cat) => {
              const count = menuItems.filter((m) => m.category_id === cat.id).length;
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-extrabold uppercase transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN: MENU ITEM POS BUTTONS GRID (6 cols on lg) */}
        <div className="lg:col-span-6 h-full overflow-hidden">
          <MenuPanel
            categories={categories}
            menuItems={menuItems}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* RIGHT COLUMN: DESKTOP ACTIVE ORDER / CART / HISTORY PANEL (4 cols on lg) */}
        <div className="hidden lg:block lg:col-span-4 h-full overflow-hidden">
          {activeTab === 'cart' ? (
            <CartPanel
              tableSessionId={table?.active_session?.id || ''}
              tableNumber={tableNumber}
              onOrderSubmitted={handleOrderSubmitted}
            />
          ) : (
            <OrderHistoryPanel
              tableSessionId={table?.active_session?.id || ''}
              refreshTrigger={historyTrigger}
            />
          )}
        </div>
      </div>

      {/* 3. MOBILE FLOATING CART BAR (Shown on small screens when items are added) */}
      <div className="lg:hidden fixed bottom-14 left-2 right-2 z-30">
        <button
          type="button"
          onClick={() => setIsMobileCartOpen(true)}
          className="w-full bg-slate-900 text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-800 active:scale-[0.98] transition cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-amber-400" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-black uppercase text-amber-400">
                Table {tableNumber} Cart ({totalItems})
              </span>
              <span className="text-xs font-extrabold text-white">
                {totalItems > 0 ? formatPrice(total) : 'Tap to open cart'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-black uppercase shadow-xs">
            <span>View Cart</span>
            <ChevronUp className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* 4. MOBILE SLIDE-UP CART DRAWER / SHEET */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
          <div className="bg-white rounded-t-3xl max-h-[90vh] h-[85vh] flex flex-col overflow-hidden shadow-2xl border-t border-slate-200">
            {/* Drawer Header */}
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-amber-400" />
                <span className="font-extrabold text-sm uppercase">Table {tableNumber} Order Cart</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cart Panel Content inside Drawer */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'cart' ? (
                <CartPanel
                  tableSessionId={table?.active_session?.id || ''}
                  tableNumber={tableNumber}
                  onOrderSubmitted={handleOrderSubmitted}
                />
              ) : (
                <OrderHistoryPanel
                  tableSessionId={table?.active_session?.id || ''}
                  refreshTrigger={historyTrigger}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. FIXED BOTTOM OPERATIONAL ACTION BAR (DESKTOP) */}
      <div className="hidden lg:flex bg-white border border-slate-200 rounded-xl p-2 items-center justify-between gap-2 shadow-xs shrink-0">
        <div className="flex items-center space-x-2">
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg flex items-center space-x-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>CLEAR</span>
            </button>
          )}

          <Link
            href={`/pos/billing?tableId=${table.id}`}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg flex items-center space-x-1.5 shadow-xs transition active:scale-[0.98]"
          >
            <FileText className="w-4 h-4" />
            <span>GO TO BILLING</span>
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href={`/pos/menu`}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>MENU CATALOG</span>
          </Link>

          <button
            onClick={() => setActiveTab('history')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>VIEW ROUNDS</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderView(props: OrderViewProps) {
  return (
    <CartProvider>
      <OrderViewInner {...props} />
    </CartProvider>
  );
}

