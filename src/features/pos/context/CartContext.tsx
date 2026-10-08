'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { CartItem, MenuItem } from '@/types/menu';

interface CartContextType {
  cartItems: CartItem[];
  addItem: (item: MenuItem) => void;
  updateQuantity: (menuItemId: string, delta: number) => void;
  removeItem: (menuItemId: string) => void;
  setItemNote: (menuItemId: string, note: string) => void;
  toggleComplimentary: (menuItemId: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addItem = (item: MenuItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.menuItemId === item.id);
      const name = item.name || item.item_name || (item as any).itemName || (item as any).title || 'Item';
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          itemName: name,
          name: name,
          item_name: name,
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          itemName: name,
          name: name,
          item_name: name,
          unitPrice: item.price || (item as any).unitPrice || 0,
          quantity: 1,
          itemNote: '',
          isComplimentary: false,
          isVeg: !!item.is_veg,
        },
      ];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.menuItemId === menuItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (menuItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const setItemNote = (menuItemId: string, note: string) => {
    setCartItems((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, itemNote: note } : i))
    );
  };

  const toggleComplimentary = (menuItemId: string) => {
    setCartItems((prev) =>
      prev.map((i) =>
        i.menuItemId === menuItemId ? { ...i, isComplimentary: !i.isComplimentary } : i
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + (item.isComplimentary ? 0 : item.unitPrice) * item.quantity,
        0
      ),
    [cartItems]
  );

  const total = subtotal;

  const contextValue = useMemo(
    () => ({
      cartItems,
      addItem,
      updateQuantity,
      removeItem,
      setItemNote,
      toggleComplimentary,
      clearCart,
      totalItems,
      subtotal,
      total,
    }),
    [cartItems, totalItems, subtotal, total]
  );

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
