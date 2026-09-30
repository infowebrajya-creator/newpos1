'use client';

import React, { useMemo } from 'react';
import { MenuCategory, MenuItem } from '@/types/menu';
import { useCart } from '@/features/pos/context/CartContext';
import { Search, Utensils, Star, Plus, Check } from 'lucide-react';

interface MenuPanelProps {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  selectedCategoryId: string;
  onSelectCategory: (catId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function MenuPanel({
  categories,
  menuItems,
  selectedCategoryId,
  onSelectCategory,
  searchQuery,
  onSearchChange,
}: MenuPanelProps) {
  const { cartItems, addItem } = useCart();

  // Pre-compute category item count map for zero-lag rendering
  const categoryCountMap = useMemo(() => {
    const map = new Map<string, number>();
    menuItems.forEach((m) => {
      if (m.category_id) {
        map.set(m.category_id, (map.get(m.category_id) || 0) + 1);
      }
    });
    return map;
  }, [menuItems]);

  // Filter menu items by selected category & search query
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const name = (item.name || item.item_name || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const search = searchQuery.trim().toLowerCase();

      const matchesSearch = !search || name.includes(search) || category.includes(search);
      const matchesCategory =
        selectedCategoryId === 'all' || item.category_id === selectedCategoryId;

      return matchesSearch && matchesCategory;
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  // Quantity map for cart indicators
  const cartQuantityMap = useMemo(() => {
    const map = new Map<string, number>();
    cartItems.forEach((ci) => map.set(ci.menuItemId, ci.quantity));
    return map;
  }, [cartItems]);

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Category Tabs & Search Bar Header */}
      <div className="p-2 border-b border-slate-200 bg-slate-50 space-y-2 shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
          <div className="relative sm:col-span-8">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Item (Paneer, Rice, Naan)..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600"
            />
          </div>
          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder="Short Code (e.g. 101)"
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600"
            />
          </div>
        </div>

        {/* Horizontal Category Quick Tabs for fast tapping */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-3 py-1 rounded-md font-extrabold uppercase transition cursor-pointer shrink-0 ${
              selectedCategoryId === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            ALL ITEMS ({menuItems.length})
          </button>

          {categories.map((cat) => {
            const count = categoryCountMap.get(cat.id) || 0;
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3 py-1 rounded-md font-extrabold uppercase transition cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{cat.name}</span>
                <span className="ml-1 text-[10px] text-slate-400 font-bold">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact Rectangular Menu POS Items Grid */}
      <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50">
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filteredItems.map((item) => {
              const itemName = item.name || item.item_name || 'Menu Item';
              const qtyInCart = cartQuantityMap.get(item.id) || 0;

              return (
                <div
                  key={item.id}
                  onClick={() => addItem(item)}
                  className={`relative bg-white border ${
                    qtyInCart > 0
                      ? 'border-red-600 ring-1 ring-red-600/30 bg-red-50/30'
                      : 'border-slate-200 hover:border-slate-400'
                  } rounded-lg p-2.5 flex flex-col justify-between transition active:scale-[0.97] cursor-pointer select-none shadow-2xs min-h-[95px]`}
                >
                  <div className="space-y-1">
                    {/* Top Badges: Veg/Non-Veg & Quantity */}
                    <div className="flex items-center justify-between">
                      {item.is_veg !== null && item.is_veg !== undefined && (
                        <span
                          className={`w-3.5 h-3.5 border flex items-center justify-center p-0.5 rounded ${
                            item.is_veg ? 'border-emerald-600' : 'border-rose-600'
                          }`}
                          title={item.is_veg ? 'Veg' : 'Non-Veg'}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                        </span>
                      )}

                      {qtyInCart > 0 && (
                        <span className="px-1.5 py-0.2 rounded-md text-[11px] font-black bg-red-600 text-white shadow-2xs">
                          ×{qtyInCart}
                        </span>
                      )}
                    </div>

                    {/* Item Name */}
                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight line-clamp-2">
                      {itemName}
                    </h4>
                  </div>

                  {/* Price & Add Button */}
                  <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-100">
                    <span className="font-black text-slate-900 text-xs sm:text-sm">
                      {formatPrice(item.price)}
                    </span>
                    <button
                      type="button"
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black transition ${
                        qtyInCart > 0 ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full border border-slate-200 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-1 text-slate-500">
            <Utensils className="w-6 h-6 text-slate-400" />
            <span className="text-xs font-bold text-slate-800">No items found</span>
            <span className="text-[11px] text-slate-500">
              {searchQuery ? `No menu item matching "${searchQuery}"` : 'No items in this category.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
