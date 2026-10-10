'use client';

import React, { useState } from 'react';
import { Link, useRouter } from '@/lib/navigation';
import { useCart } from '@/features/pos/context/CartContext';
import { submitKot, saveAndBill } from '@/services/apiServices';
import { enqueueOfflineOrder } from '@/services/offline/offlineStorageService';
import { getActiveOrderForSession, createOrder, addOrderRoundBatch } from '@/services/orders/orderService';
import { submitRoundToKitchen } from '@/services/kitchen/kitchenService';
import { buildKotPrintDocument, buildBillPrintDocument } from '@/services/printing/printDocumentService';
import { printKot } from '@/services/printing/printService';
import { PrintPreviewModal } from '@/features/printing/components/PrintPreviewModal';
import { KotPrintDocument, BillPrintDocument } from '@/types/printing';
import { usePOSHotkeys } from '@/hooks/usePOSHotkeys';
import { getPOSPreferences } from '@/features/settings/components/POSBillingPreferences';
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  FileText,
  Gift,
  Send,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  Users,
  Printer,
  Receipt,
  Save,
  Split,
  Percent,
} from 'lucide-react';

interface CartPanelProps {
  tableSessionId: string;
  tableNumber: string;
  tableId?: string;
  onOrderSubmitted?: () => void;
}

export function CartPanel({ tableSessionId, tableNumber, tableId, onOrderSubmitted }: CartPanelProps) {
  const router = useRouter();
  const {
    cartItems,
    updateQuantity,
    removeItem,
    setItemNote,
    toggleComplimentary,
    clearCart,
    totalItems,
    subtotal,
    total,
  } = useCart();

  const [activeNoteItemId, setActiveNoteItemId] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'dine_in' | 'delivery' | 'pickup'>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'due' | 'other' | 'part'>('cash');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [isLoyalty, setIsLoyalty] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [failedRoundId, setFailedRoundId] = useState<string | null>(null);

  // Prefetch routes for zero-lag instant transitions
  React.useEffect(() => {
    router.prefetch('/pos/billing');
    router.prefetch('/pos/tables');
    if (tableId) {
      router.prefetch(`/pos/billing?tableId=${tableId}`);
    }
  }, [router, tableId]);

  // Sync saved POS workstation preferences (Default Order Type)
  React.useEffect(() => {
    const prefs = getPOSPreferences();
    if (prefs.defaultOrderType === 'takeaway') {
      setOrderType('pickup');
    } else if (prefs.defaultOrderType === 'delivery') {
      setOrderType('delivery');
    } else {
      setOrderType('dine_in');
    }
  }, []);

  // Printing state
  const [activeKotDoc, setActiveKotDoc] = useState<KotPrintDocument | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Bind Cashier Hotkeys (K: KOT, B: Save & Bill)
  usePOSHotkeys({
    onDispatchKOT: () => handleSendToKitchen(true),
    onSaveAndBill: () => handleSaveAndBill(),
  });

  // KOT Submission Workflow
  const handleSendToKitchen = async (shouldPrintInput?: boolean) => {
    setError(null);
    setSuccessMsg(null);
    setFailedRoundId(null);

    const prefs = getPOSPreferences();
    const shouldPrint = shouldPrintInput ?? prefs.autoPrintKOT;
    setError(null);
    setSuccessMsg(null);
    setFailedRoundId(null);

    if (cartItems.length === 0) {
      setError('Your cart is empty. Click menu items to add them.');
      return;
    }

    // Offline check: queue locally if navigator is offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineOrder({
        tableSessionId,
        cartItems,
        type: 'kot',
      });
      clearCart();
      setIsLoading(false);
      setSuccessMsg(`📶 Offline Mode: KOT queued locally! Auto-syncing when Wi-Fi connects.`);
      if (onOrderSubmitted) onOrderSubmitted();
      return;
    }

    try {
      setIsLoading(true);

      const data = await submitKot({
        tableSessionId,
        cartItems: cartItems.map((item) => ({
          menuItemId: item.menuItemId,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          itemNote: item.itemNote,
          isComplimentary: item.isComplimentary,
        })),
      });

      if (!data.success) {
        throw new Error('Unable to send order round to kitchen.');
      }

      if (shouldPrint && (data.kotId || data.roundId || data.kotDocument)) {
        try {
          const targetKotId = data.kotId || data.roundId;
          if (targetKotId) {
            await printKot(targetKotId, false);
          }
        } catch {
          // Direct print error handled gracefully
        }
      }

      clearCart();
      setIsLoading(false);
      setSuccessMsg(`KOT round dispatched for Table ${tableNumber}!`);

      if (onOrderSubmitted) {
        onOrderSubmitted();
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : '';
      
      // Fallback to offline queue if network fails
      enqueueOfflineOrder({
        tableSessionId,
        cartItems,
        type: 'kot',
      });
      clearCart();
      setSuccessMsg(`📶 Network disruption: Order saved offline! Will sync automatically.`);
    }
  };

  // Save & Bill Workflow -> Instant 0ms Optimistic Redirect
  const handleSaveAndBill = async () => {
    setError(null);
    setSuccessMsg(null);

    if (cartItems.length === 0) return;

    const targetTableId = tableId || tableSessionId;
    const currentCartSnapshot = [...cartItems];

    // 1. Instant 0ms local state update & cart clear
    clearCart();

    // 2. Instant zero-delay client navigation
    if (targetTableId) {
      router.push(`/pos/billing?tableId=${targetTableId}`);
    } else {
      router.push('/pos/billing');
    }

    // 3. Asynchronous background persistence call with offline fallback
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueOfflineOrder({
          tableSessionId,
          cartItems: currentCartSnapshot,
          paymentMethod,
          isPaid,
          type: 'save_and_bill',
        });
        return;
      }

      saveAndBill({
        tableSessionId,
        cartItems: currentCartSnapshot.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          itemNote: item.itemNote,
          isComplimentary: item.isComplimentary,
        })),
        paymentMethod,
        isPaid,
      }).catch(() => {
        enqueueOfflineOrder({
          tableSessionId,
          cartItems: currentCartSnapshot,
          paymentMethod,
          isPaid,
          type: 'save_and_bill',
        });
      });
    } catch {
      enqueueOfflineOrder({
        tableSessionId,
        cartItems: currentCartSnapshot,
        paymentMethod,
        isPaid,
        type: 'save_and_bill',
      });
    }
  };

  const formatPrice = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* 1. TOP ORDER TYPE TABS (Dine In / Delivery / Pick Up) */}
      <div className="grid grid-cols-3 bg-slate-100 border-b border-slate-200 p-1 text-xs font-black shrink-0">
        <button
          type="button"
          onClick={() => setOrderType('dine_in')}
          className={`py-1.5 rounded transition uppercase cursor-pointer ${orderType === 'dine_in' ? 'bg-red-600 text-white shadow-2xs font-black' : 'text-slate-700 hover:text-slate-900'
            }`}
        >
          DINE IN
        </button>
        <button
          type="button"
          onClick={() => setOrderType('delivery')}
          className={`py-1.5 rounded transition uppercase cursor-pointer ${orderType === 'delivery' ? 'bg-red-600 text-white shadow-2xs font-black' : 'text-slate-700 hover:text-slate-900'
            }`}
        >
          DELIVERY
        </button>
        <button
          type="button"
          onClick={() => setOrderType('pickup')}
          className={`py-1.5 rounded transition uppercase cursor-pointer ${orderType === 'pickup' ? 'bg-red-600 text-white shadow-2xs font-black' : 'text-slate-700 hover:text-slate-900'
            }`}
        >
          PICK UP
        </button>
      </div>

      {/* 2. ORDER TOOLBAR CONTEXT (Table #, Guests, Items count) */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold shrink-0">
        <div className="flex items-center space-x-2">
          <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[11px] font-black uppercase">
            T{tableNumber}
          </span>
          <span className="text-slate-700 font-extrabold">TABLE {tableNumber}</span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-semibold">
          <span className="flex items-center space-x-1">
            <Users className="w-3 h-3 text-slate-400" />
            <span>Guests</span>
          </span>
          <span>•</span>
          <span className="text-slate-900 font-bold">{totalItems} items</span>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-50 border-b border-rose-200 p-2 flex items-center justify-between text-rose-700 text-xs shrink-0">
          <div className="flex items-start space-x-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          {failedRoundId && (
            <button
              onClick={() => handleSendToKitchen(false)}
              className="px-2 py-0.5 bg-rose-600 text-white font-bold rounded text-[10px]"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border-b border-emerald-200 p-2 flex items-center space-x-1.5 text-emerald-700 text-xs shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 3. ORDER TABLE HEADER */}
      <div className="grid grid-cols-12 px-3 py-1 bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600 shrink-0">
        <div className="col-span-6">ITEMS</div>
        <div className="col-span-3 text-center">QTY.</div>
        <div className="col-span-3 text-right">PRICE</div>
      </div>

      {/* 4. ACTIVE CART ITEMS LIST (INDEPENDENT SCROLL) */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
        {cartItems.length > 0 ? (
          cartItems.map((item) => {
            const lineTotal = (item.isComplimentary ? 0 : item.unitPrice) * item.quantity;
            const isNoteOpen = activeNoteItemId === item.menuItemId;

            return (
              <div
                key={item.menuItemId}
                className="bg-white border border-slate-200 rounded-lg p-1.5 space-y-1 text-xs transition hover:border-slate-300"
              >
                <div className="grid grid-cols-12 items-center">
                  {/* Left: Remove [X] + Item Name */}
                  <div className="col-span-6 flex items-center space-x-1.5 pr-1">
                    <button
                      type="button"
                      onClick={() => removeItem(item.menuItemId)}
                      className="w-4 h-4 rounded bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center text-[10px] font-bold shrink-0 transition"
                      title="Remove Item"
                    >
                      ✕
                    </button>
                    <div className="truncate">
                      <span className="font-extrabold text-slate-900 text-xs">{item.itemName}</span>
                      {item.isComplimentary && (
                        <span className="ml-1 text-[9px] font-black text-amber-800 bg-amber-100 px-1 rounded uppercase">
                          COMP
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Center: Qty Stepper [-][1][+] */}
                  <div className="col-span-3 flex items-center justify-center space-x-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.menuItemId, -1)}
                      className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="font-black text-slate-900 text-xs min-w-[14px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.menuItemId, 1)}
                      className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 text-slate-900 flex items-center justify-center font-black text-xs"
                    >
                      +
                    </button>
                  </div>

                  {/* Right: Line Price */}
                  <div className="col-span-3 text-right font-black text-slate-900 text-xs">
                    {item.isComplimentary ? (
                      <span className="text-amber-700">₹0</span>
                    ) : (
                      formatPrice(lineTotal)
                    )}
                  </div>
                </div>

                {/* Sub-Actions: Note & Comp */}
                <div className="flex items-center justify-between pt-0.5 border-t border-slate-100 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setActiveNoteItemId(isNoteOpen ? null : item.menuItemId)}
                    className="text-slate-500 hover:text-indigo-600 font-semibold flex items-center space-x-0.5"
                  >
                    <FileText className="w-2.5 h-2.5" />
                    <span>{item.itemNote ? `Note: ${item.itemNote}` : '+ Note'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleComplimentary(item.menuItemId)}
                    className={`font-semibold ${item.isComplimentary ? 'text-amber-700 font-bold' : 'text-slate-400 hover:text-slate-700'
                      }`}
                  >
                    {item.isComplimentary ? 'Complimentary' : '+ Comp'}
                  </button>
                </div>

                {/* Inline Note Box */}
                {isNoteOpen && (
                  <div className="pt-1 flex items-center space-x-1">
                    <input
                      type="text"
                      placeholder="e.g. Less spicy..."
                      value={item.itemNote || ''}
                      onChange={(e) => setItemNote(item.menuItemId, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveNoteItemId(null)}
                      className="text-slate-400 hover:text-slate-700 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-1 text-slate-400">
            <ShoppingCart className="w-7 h-7 text-slate-300" />
            <p className="text-xs font-bold text-slate-700">Cart is empty</p>
            <p className="text-[11px] text-slate-400 max-w-[180px]">
              Click menu items to build an order round.
            </p>
          </div>
        )}
      </div>

      {/* 5. DARK LOWER SETTLEMENT AREA (PETPOOJA GEOMETRY) */}
      <div className="bg-slate-900 text-white p-2.5 space-y-2 shrink-0 border-t border-slate-800">
        {/* Row 1: BOGO / SPLIT / COMP & TOTAL */}
        <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-2">
          <div className="flex items-center space-x-1">
            <Link
              href={`/pos/billing?tableId=${tableSessionId}`}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold uppercase transition"
            >
              SPLIT
            </Link>
            <button
              type="button"
              onClick={clearCart}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold uppercase transition cursor-pointer"
            >
              CLEAR
            </button>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">Total Amount</span>
            <span className="text-base sm:text-lg font-black text-red-500">{formatPrice(total)}</span>
          </div>
        </div>

        {/* Row 2: Payment Methods Pointers (Cash, Card, Due, Other, Part) */}
        <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-300">
          <span className="text-[10px] text-slate-400 uppercase">Pay:</span>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="radio"
                name="payMethod"
                checked={paymentMethod === 'cash'}
                onChange={() => setPaymentMethod('cash')}
                className="accent-red-600"
              />
              <span>Cash</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="radio"
                name="payMethod"
                checked={paymentMethod === 'card'}
                onChange={() => setPaymentMethod('card')}
                className="accent-red-600"
              />
              <span>Card</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="radio"
                name="payMethod"
                checked={paymentMethod === 'due'}
                onChange={() => setPaymentMethod('due')}
                className="accent-red-600"
              />
              <span>Due</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="radio"
                name="payMethod"
                checked={paymentMethod === 'other'}
                onChange={() => setPaymentMethod('other')}
                className="accent-red-600"
              />
              <span>Other</span>
            </label>
          </div>
        </div>

        {/* Row 3: Paid / Loyalty Checkboxes */}
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 border-t border-slate-800 pt-1.5">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
            <span>It's Paid</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isLoyalty}
              onChange={(e) => setIsLoyalty(e.target.checked)}
              className="accent-red-600 rounded"
            />
            <span>Loyalty</span>
          </label>
        </div>

        {/* Row 4: MAIN WORKSTATION BOTTOM ACTION BUTTONS ROW */}
        <div className="grid grid-cols-3 gap-1 pt-1">
          <button
            type="button"
            disabled={cartItems.length === 0 || isLoading}
            onClick={() => handleSendToKitchen(false)}
            className="py-2 px-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs uppercase rounded transition cursor-pointer flex items-center justify-center space-x-1 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>KOT</span>
          </button>

          <button
            type="button"
            disabled={cartItems.length === 0 || isLoading}
            onClick={() => handleSendToKitchen(true)}
            className="py-2 px-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-black text-[11px] uppercase rounded transition cursor-pointer flex items-center justify-center space-x-1 border border-slate-700"
            title="Hotkey: Press [K] or [F4]"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>KOT & PRINT</span>
            <span className="ml-1 text-[9px] font-mono bg-slate-900 text-amber-400 px-1 py-0.2 rounded border border-slate-700">K</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleSaveAndBill}
            className="py-2 px-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase rounded transition cursor-pointer flex items-center justify-center space-x-1 shadow-xs"
            title="Hotkey: Press [B] or [F2]"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Receipt className="w-3.5 h-3.5" />
            )}
            <span>SAVE & BILL</span>
            <span className="ml-1 text-[9px] font-mono bg-emerald-800 text-white px-1 py-0.2 rounded border border-emerald-500">B</span>
          </button>
        </div>
      </div>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        kotDocument={activeKotDoc}
        onPrinted={() => { }}
      />
    </div>
  );
}
