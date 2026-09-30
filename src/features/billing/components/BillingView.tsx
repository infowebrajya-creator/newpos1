'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TableWithSession } from '@/types/tables';
import { DetailedBill, PaymentMethod } from '@/types/billing';
import {
  generateBill,
  recordPayment,
  closeTableSession,
  getBillForSession,
  getDetailedBill,
} from '@/services/billing/billingService';
import { getOrderDetailsForSession, SessionOrderDetails } from '@/services/orders/orderService';
import { Button } from '@/components/ui/Button';
import { BillPrintDocument } from '@/types/printing';
import { buildBillPrintDocument } from '@/services/printing/printDocumentService';
import { formatEscposBill, formatEscposKot } from '@/services/printing/escpos/escposFormatter';
import { getPrinterConfig } from '@/services/printing/printService';
import { PrintPreviewModal } from '@/features/printing/components/PrintPreviewModal';
import { PrinterSettingsModal } from '@/features/printing/components/PrinterSettingsModal';
import {
  FileText,
  CreditCard,
  Banknote,
  QrCode,
  Building2,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Printer,
  Receipt,
  UtensilsCrossed,
  CheckCheck,
  Split,
} from 'lucide-react';

const formatCurrency = (amount?: number): string => {
  if (amount == null) return '₹0';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

interface BillingViewProps {
  table: TableWithSession;
  initialBill?: DetailedBill | null;
  initialOrderDetails?: SessionOrderDetails | null;
}

export function BillingView({
  table,
  initialBill = null,
  initialOrderDetails = null,
}: BillingViewProps) {
  const session = table.active_session;
  const tableSessionId = session?.id || '';
  const tableNumber = table.table_number;
  const router = useRouter();

  // Core State
  const [bill, setBill] = useState<DetailedBill | null>(initialBill);
  const [orderDetails, setOrderDetails] = useState<SessionOrderDetails | null>(initialOrderDetails);
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [roundingInput, setRoundingInput] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [leftPanelTab, setLeftPanelTab] = useState<'edit' | 'bill_format' | 'kot_format'>('edit');

  const [isLoadingBill, setIsLoadingBill] = useState<boolean>(false);
  const [isLoadingPayment, setIsLoadingPayment] = useState<boolean>(false);
  const [isClosingSession, setIsClosingSession] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Printing state
  const [activePrintDoc, setActivePrintDoc] = useState<BillPrintDocument | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState<boolean>(false);

  const printerConfig = getPrinterConfig();

  // Live Thermal Bill ESC/POS Preview Generator
  const liveBillEscposText = useMemo(() => {
    if (!bill) return 'Official Bill Not Generated Yet.\nClick [GENERATE OFFICIAL BILL] or [1-TAP PAY] to create bill.';
    try {
      const doc = {
        billId: bill.id,
        billNumber: bill.bill_number.toString(),
        tableNumber: tableNumber,
        guestCount: session?.guest_count || 1,
        date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        items: bill.items.map((i) => ({
          name: i.item_name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          lineTotal: i.line_total,
          isComplimentary: i.is_complimentary,
        })),
        subtotal: bill.subtotal,
        discountAmount: bill.discount_amount,
        taxAmount: bill.tax_amount,
        roundingAmount: bill.rounding_amount,
        grandTotal: bill.grand_total,
        paidAmount: bill.paid_amount,
        paymentMethod: bill.paid_amount >= bill.grand_total ? paymentMethod : undefined,
        restaurantName: 'WEBRAJYA RESTAURANT',
        legalName: '',
        phone: '9630013483',
        address: '',
        receiptHeader: '',
        receiptFooter: 'THANK YOU! VISIT AGAIN',
        isReprint: false,
        taxEnabled: false,
      };
      return formatEscposBill(doc, printerConfig);
    } catch {
      return 'Receipt format preview generating...';
    }
  }, [bill, tableNumber, session, paymentMethod, printerConfig]);

  // Live Thermal KOT Ticket Preview Generator
  const liveKotEscposText = useMemo(() => {
    try {
      const allItems = (orderDetails?.rounds.flatMap((r) =>
        r.items.map((i) => ({
          name: i.item_name,
          quantity: i.quantity,
          itemNote: (i as any).notes || (i as any).item_note || undefined,
        }))
      ) || []);

      if (allItems.length === 0) {
        return 'No Kitchen Order Ticket items found for this session.';
      }

      const doc = {
        kotId: 'KOT-LIVE',
        kotNumber: '1',
        tableNumber: tableNumber,
        roundNumber: orderDetails?.rounds.length || 1,
        date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        items: allItems,
        notes: 'Dine-In Kitchen Ticket',
        isReprint: false,
      };
      return formatEscposKot(doc, printerConfig);
    } catch {
      return 'KOT format preview generating...';
    }
  }, [orderDetails, tableNumber, printerConfig]);

  // Refresh billing data for active table session
  const refreshBillingData = useCallback(async () => {
    if (!tableSessionId) return;

    try {
      const [orderData, existingBill] = await Promise.all([
        getOrderDetailsForSession(tableSessionId),
        getBillForSession(tableSessionId),
      ]);

      setOrderDetails(orderData);

      if (existingBill) {
        const fullBill = await getDetailedBill(existingBill.id);
        setBill(fullBill);
        if (fullBill) {
          const balance = Math.max(0, fullBill.grand_total - fullBill.paid_amount);
          setPaymentAmountInput(balance > 0 ? balance.toFixed(2) : '0');
        }
      }
    } catch {
      // Keep state
    }
  }, [tableSessionId]);

  useEffect(() => {
    if (!initialBill) {
      refreshBillingData();
    }
  }, [initialBill, refreshBillingData]);

  // Preview subtotal from order items before official bill generation
  const previewSubtotal = useMemo(() => {
    if (!orderDetails || !orderDetails.rounds) return 0;
    return orderDetails.rounds.reduce((total, round) => {
      return (
        total +
        round.items.reduce((roundTotal, item) => {
          const price = item.is_complimentary ? 0 : item.unit_price;
          return roundTotal + price * item.quantity;
        }, 0)
      );
    }, 0);
  }, [orderDetails]);

  // Handle Bill Generation via RPC generate_bill
  const handleGenerateBill = async () => {
    setError(null);
    setPrintError(null);
    setSuccessMsg(null);

    if (!tableSessionId) {
      setError('No active table session found.');
      return;
    }

    const discount = parseFloat(discountInput) || 0;
    const rounding = parseFloat(roundingInput) || 0;

    if (discount < 0 || discount > previewSubtotal) {
      setError(`Discount must be between ₹0 and Subtotal (${formatCurrency(previewSubtotal)}).`);
      return;
    }

    try {
      setIsLoadingBill(true);

      const existing = await getBillForSession(tableSessionId);
      let billId = existing?.id;

      if (!billId) {
        billId = await generateBill(tableSessionId, discount, rounding);
      }

      const fullBill = await getDetailedBill(billId);
      setBill(fullBill);

      if (fullBill) {
        const balance = Math.max(0, fullBill.grand_total - fullBill.paid_amount);
        setPaymentAmountInput(balance > 0 ? balance.toFixed(2) : '0');
      }

      setIsLoadingBill(false);
      setSuccessMsg(`Official bill generated successfully!`);
    } catch (err: unknown) {
      setIsLoadingBill(false);
      const msg = err instanceof Error ? err.message : '';
      setError(`Unable to generate bill: ${msg || 'Please try again.'}`);
    }
  };

  // Auto-fill payment amount if empty or 0
  useEffect(() => {
    const due = bill ? Math.max(0, bill.grand_total - bill.paid_amount) : previewSubtotal;
    if (due > 0 && (!paymentAmountInput || paymentAmountInput === '0' || paymentAmountInput === '0.00')) {
      setPaymentAmountInput(due.toFixed(2));
    }
  }, [bill, previewSubtotal, paymentAmountInput]);

  // Handle Payment Recording via RPC record_payment (Smart 1-Tap Handler)
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPrintError(null);
    setSuccessMsg(null);

    let currentBill = bill;

    // 1. Smart Auto-Bill Generation if not yet generated
    if (!currentBill) {
      if (!tableSessionId) {
        setError('No active table session found.');
        return;
      }

      try {
        setIsLoadingPayment(true);
        const discount = parseFloat(discountInput) || 0;
        const rounding = parseFloat(roundingInput) || 0;

        const existing = await getBillForSession(tableSessionId);
        let billId = existing?.id;

        if (!billId) {
          billId = await generateBill(tableSessionId, discount, rounding);
        }

        currentBill = await getDetailedBill(billId);
        setBill(currentBill);
      } catch (genErr: unknown) {
        setIsLoadingPayment(false);
        const msg = genErr instanceof Error ? genErr.message : '';
        setError(`Failed to auto-generate bill: ${msg || 'Please try again.'}`);
        return;
      }
    }

    if (!currentBill) {
      setIsLoadingPayment(false);
      setError('Bill generation failed. Please try again.');
      return;
    }

    const amount = parseFloat(paymentAmountInput) || Math.max(0, currentBill.grand_total - currentBill.paid_amount);
    const balanceDue = Math.max(0, currentBill.grand_total - currentBill.paid_amount);

    if (isNaN(amount) || amount <= 0) {
      setIsLoadingPayment(false);
      setError('Payment amount must be greater than ₹0.');
      return;
    }

    if (amount > balanceDue + 0.01) {
      setIsLoadingPayment(false);
      setError(`Payment amount (${formatCurrency(amount)}) cannot exceed remaining balance (${formatCurrency(balanceDue)}).`);
      return;
    }

    try {
      setIsLoadingPayment(true);
      await recordPayment(currentBill.id, paymentMethod, amount, referenceNumber);

      const updatedBill = await getDetailedBill(currentBill.id);
      setBill(updatedBill);

      const newBalance = updatedBill ? Math.max(0, updatedBill.grand_total - updatedBill.paid_amount) : 0;

      if (updatedBill) {
        setPaymentAmountInput(newBalance > 0 ? newBalance.toFixed(2) : '0');

        // Automatically close session, free table, and redirect to Tables View
        if (newBalance <= 0 && tableSessionId) {
          try {
            await closeTableSession(tableSessionId);
          } catch {
            // Non-blocking if session already closed
          }
          setSuccessMsg(`Payment completed! Table released. Redirecting to Table View...`);
          setTimeout(() => {
            router.push('/pos/tables');
            router.refresh();
          }, 800);
        }
      }

      setReferenceNumber('');
      setIsLoadingPayment(false);
      if (newBalance > 0) {
        setSuccessMsg(`Payment of ${formatCurrency(amount)} via ${paymentMethod.toUpperCase()} completed successfully!`);
      }
    } catch (err: unknown) {
      setIsLoadingPayment(false);
      const msg = err instanceof Error ? err.message : '';
      setError(`Payment failure: ${msg || 'Unable to record payment.'}`);
    }
  };

  // 1-Click Master Convenience Handler: Generate Bill + Complete Payment + Print Receipt + Release Table + Redirect
  const handleOneClickCheckout = async () => {
    setError(null);
    setPrintError(null);
    setSuccessMsg(null);

    let currentBill = bill;

    try {
      setIsLoadingPayment(true);

      // 1. Auto-generate bill if missing
      if (!currentBill) {
        if (!tableSessionId) {
          setError('No active table session found.');
          setIsLoadingPayment(false);
          return;
        }

        const discount = parseFloat(discountInput) || 0;
        const rounding = parseFloat(roundingInput) || 0;
        const existing = await getBillForSession(tableSessionId);
        let billId = existing?.id;

        if (!billId) {
          billId = await generateBill(tableSessionId, discount, rounding);
        }

        currentBill = await getDetailedBill(billId);
        setBill(currentBill);
      }

      if (!currentBill) {
        setIsLoadingPayment(false);
        setError('Bill generation failed. Please try again.');
        return;
      }

      // 2. Auto-record full payment
      const due = Math.max(0, currentBill.grand_total - currentBill.paid_amount);
      if (due > 0) {
        await recordPayment(currentBill.id, paymentMethod, due, referenceNumber);
        const updatedBill = await getDetailedBill(currentBill.id);
        setBill(updatedBill);
      }

      // 3. Auto-release table session
      if (tableSessionId) {
        try {
          await closeTableSession(tableSessionId);
        } catch {
          // Session already closed
        }
      }

      // 4. Auto-build print document
      try {
        const doc = await buildBillPrintDocument(currentBill.id, false);
        setActivePrintDoc(doc);
        setIsPrintModalOpen(true);
      } catch {
        // Continue if print preview unavailable
      }

      setIsLoadingPayment(false);
      setSuccessMsg('⚡ 1-Click Checkout Complete! Table released. Redirecting to Table View...');

      // 5. Auto-redirect to floor plan with blank table
      setTimeout(() => {
        router.push('/pos/tables');
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      setIsLoadingPayment(false);
      const msg = err instanceof Error ? err.message : '';
      setError(`1-Click Checkout Error: ${msg || 'Failed to complete 1-click checkout.'}`);
    }
  };

  // Handle Table Session Closure via RPC close_table_session
  const handleCloseSession = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!tableSessionId) {
      router.push('/pos/tables');
      return;
    }

    // Block closure only if there is an unpaid bill balance > 0
    const hasUnpaidBill = bill && bill.paid_amount < bill.grand_total;
    if (hasUnpaidBill && previewSubtotal > 0) {
      setError('Cannot close table session with an unpaid balance.');
      return;
    }

    try {
      setIsClosingSession(true);
      await closeTableSession(tableSessionId);
      setIsClosingSession(false);
      setSuccessMsg('Table session closed successfully! Redirecting to floor plan...');

      setTimeout(() => {
        router.push('/pos/tables');
        router.refresh();
      }, 800);
    } catch (err: unknown) {
      setIsClosingSession(false);
      const msg = err instanceof Error ? err.message : '';
      setError(`Closure failed: ${msg || 'Unable to close table session.'}`);
    }
  };

  // Trigger Bill Receipt Print
  const handleTriggerBillPrint = async (isReprint: boolean = false) => {
    if (!bill) return;
    setPrintError(null);
    try {
      const doc = await buildBillPrintDocument(bill.id, isReprint);
      setActivePrintDoc(doc);
      setIsPrintModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setPrintError(`Failed to prepare bill print: ${msg}`);
    }
  };

  const balanceDue = bill ? Math.max(0, bill.grand_total - bill.paid_amount) : previewSubtotal;
  const isFullyPaid = bill && bill.paid_amount >= bill.grand_total;

  // Split calculation helper buttons
  const applySplitPreset = (fraction: number) => {
    if (balanceDue <= 0) return;
    const splitVal = (balanceDue / fraction).toFixed(2);
    setPaymentAmountInput(splitVal);
  };

  const paymentMethodsList: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'cash', label: 'CASH', icon: <Banknote className="w-5 h-5" /> },
    { id: 'upi', label: 'UPI / QR', icon: <QrCode className="w-5 h-5" /> },
    { id: 'card', label: 'CARD', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'credit', label: 'CREDIT', icon: <Building2 className="w-5 h-5" /> },
    { id: 'other', label: 'OTHER', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-8">
      {/* Top Navigation & Context Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <Link
            href="/pos/tables"
            className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Billing & Checkout
              </h1>
              <span className="text-xs font-black text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded uppercase">
                TABLE {tableNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Session #{session?.session_number || '1'} • {session?.guest_count || 1} Guests
            </p>
          </div>
        </div>

        {bill && (
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <span className="text-xs font-bold text-slate-600">Bill Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-black uppercase border tracking-wider ${
                isFullyPaid
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : bill.paid_amount > 0
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}
            >
              {bill.status}
            </span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start space-x-3 text-red-700 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {printError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center justify-between text-red-700 text-xs sm:text-sm">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{printError}</span>
          </div>
          <button
            onClick={() => handleTriggerBillPrint(false)}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs transition"
          >
            Retry Print
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start space-x-3 text-emerald-800 text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* MAIN 2-COLUMN DIRECT CASHIER WORKFLOW LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: BILL ITEMS & CALCULATION BREAKDOWN / LIVE THERMAL PREVIEW (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
          {/* TAB BAR HEADER: EDIT ITEMS vs BILL FORMAT vs KOT FORMAT */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setLeftPanelTab('edit')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition uppercase flex items-center justify-center space-x-1 cursor-pointer ${
                leftPanelTab === 'edit'
                  ? 'bg-red-600 text-white shadow-2xs font-extrabold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Edit Items</span>
            </button>

            <button
              type="button"
              onClick={() => setLeftPanelTab('bill_format')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition uppercase flex items-center justify-center space-x-1 cursor-pointer ${
                leftPanelTab === 'bill_format'
                  ? 'bg-red-600 text-white shadow-2xs font-extrabold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Bill Format</span>
            </button>

            <button
              type="button"
              onClick={() => setLeftPanelTab('kot_format')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition uppercase flex items-center justify-center space-x-1 cursor-pointer ${
                leftPanelTab === 'kot_format'
                  ? 'bg-red-600 text-white shadow-2xs font-extrabold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>KOT Format</span>
            </button>
          </div>

          {/* TAB 1: EDIT ITEMS & BILL CALCULATION */}
          {leftPanelTab === 'edit' && (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-red-600" />
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">
                    {bill ? `BILL #${bill.bill_number}` : 'BILL PREVIEW'}
                  </h2>
                </div>
                {!bill && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase">
                    UNBILLED
                  </span>
                )}
              </div>

              {/* Itemized Bill Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Ordered Items Summary
                  </span>
                  <Link
                    href={`/pos/order?tableId=${table.id}`}
                    className="text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1"
                  >
                    + Add / Edit in POS
                  </Link>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {bill
                    ? bill.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200 last:border-none"
                        >
                          <div className="flex-1 pr-2">
                            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                              <span>{item.item_name}</span>
                              {item.is_complimentary && (
                                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1 rounded">
                                  COMP
                                </span>
                              )}
                            </div>
                            <span className="text-slate-500 text-[11px]">
                              {item.quantity} × {formatCurrency(item.unit_price)}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 text-right">
                            {item.is_complimentary ? (
                              <span className="text-amber-700">₹0</span>
                            ) : (
                              formatCurrency(item.line_total)
                            )}
                          </div>
                        </div>
                      ))
                    : orderDetails?.rounds.map((round) =>
                        round.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200 last:border-none"
                          >
                            <div className="flex-1 pr-2">
                              <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                                <span>{item.item_name}</span>
                                {item.is_complimentary && (
                                  <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1 rounded">
                                    COMP
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-500 text-[11px]">
                                {item.quantity} × {formatCurrency(item.unit_price)}
                              </span>
                            </div>
                            <div className="font-bold text-slate-900 text-right">
                              {item.is_complimentary ? (
                                <span className="text-amber-700">₹0</span>
                              ) : (
                                formatCurrency(item.unit_price * item.quantity)
                              )}
                            </div>
                          </div>
                        ))
                      )}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: LIVE ESC/POS BILL FORMAT PREVIEW */}
          {leftPanelTab === 'bill_format' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-red-600" />
                  <span>80mm Thermal Receipt Simulation</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">ESC/POS</span>
              </div>
              <div className="bg-amber-50/90 text-stone-900 border border-amber-200 rounded-lg p-3 font-mono text-xs shadow-inner max-h-96 overflow-y-auto whitespace-pre leading-relaxed select-text">
                {liveBillEscposText}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE ESC/POS KOT FORMAT PREVIEW */}
          {leftPanelTab === 'kot_format' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-slate-700" />
                  <span>Kitchen Order Ticket (KOT) Simulation</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">KOT Ticket</span>
              </div>
              <div className="bg-stone-900 text-amber-300 border border-stone-800 rounded-lg p-3 font-mono text-xs shadow-inner max-h-96 overflow-y-auto whitespace-pre leading-relaxed select-text">
                {liveKotEscposText}
              </div>
            </div>
          )}

          {/* Bill Calculation Totals */}
          <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(bill ? bill.subtotal : previewSubtotal)}
              </span>
            </div>

            {!bill && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Discount Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Rounding (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={roundingInput}
                    onChange={(e) => setRoundingInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            )}

            {bill && (
              <>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Discount</span>
                  <span className="font-bold text-red-600">
                    - {formatCurrency(bill.discount_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Tax (Configured 0%)</span>
                  <span className="font-bold text-slate-900">₹0</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Rounding Adjustment</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(bill.rounding_amount)}
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center text-base font-black text-slate-900 pt-2.5 border-t border-slate-200">
              <span>Grand Total</span>
              <span className="text-lg font-black text-red-700">
                {formatCurrency(bill ? bill.grand_total : previewSubtotal)}
              </span>
            </div>
          </div>

          {/* Generate / Print Bill Action Buttons */}
          {!bill ? (
            <button
              onClick={handleGenerateBill}
              disabled={isLoadingBill}
              className="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center space-x-2 shadow transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 fill-current" />
              <span>GENERATE OFFICIAL BILL</span>
            </button>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTriggerBillPrint(false)}
                  className="py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5 shadow transition cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerBillPrint(true)}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5 border border-slate-300 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Reprint</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsPrinterSettingsOpen(true)}
                className="w-full py-1 text-[11px] text-slate-500 hover:text-red-600 flex items-center justify-center gap-1 transition"
              >
                ⚙️ Thermal Printer Configuration
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DIRECT CASHIER PAYMENT PANEL (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Main Payment Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
            {/* Amount Due & Remaining Display */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Amount Due
                </span>
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  {formatCurrency(bill ? bill.grand_total : previewSubtotal)}
                </span>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 border-slate-200 pt-2 sm:pt-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Remaining Balance
                </span>
                <span
                  className={`text-xl font-black tracking-tight ${
                    balanceDue > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700'
                  }`}
                >
                  {formatCurrency(balanceDue)}
                </span>
              </div>
            </div>

            {/* LARGE PAYMENT METHOD TOUCH BUTTONS */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Select Payment Method
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {paymentMethodsList.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-2.5 px-2 rounded-lg border flex flex-col items-center justify-center space-y-1 text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === m.id
                        ? 'bg-red-600 border-red-700 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* SPLIT PAYMENT & QUICK PRESET CONTROLS */}
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Split className="w-4 h-4 text-slate-600" />
                    <span>Split / Custom Payment Amount</span>
                  </span>

                  {/* Split Presets */}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setPaymentAmountInput(balanceDue.toFixed(2))}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                    >
                      Full
                    </button>
                    <button
                      type="button"
                      onClick={() => applySplitPreset(2)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                    >
                      1/2
                    </button>
                    <button
                      type="button"
                      onClick={() => applySplitPreset(3)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                    >
                      1/3
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Paying Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={paymentAmountInput}
                      onChange={(e) => setPaymentAmountInput(e.target.value)}
                      disabled={isFullyPaid || isLoadingPayment}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-extrabold text-slate-900 focus:outline-none focus:border-red-500"
                      required
                    />
                  </div>

                  {paymentMethod !== 'cash' && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Ref / Txn ID (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="UPI txn #, Card ref..."
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        disabled={isFullyPaid || isLoadingPayment}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ⚡ 1-TAP CONVENIENCE MASTER BUTTON (Bill + Pay + Print + Release Table in 1 Click) */}
              <button
                type="button"
                onClick={handleOneClickCheckout}
                disabled={isFullyPaid || isLoadingPayment}
                className={`w-full py-4 px-4 font-black text-sm uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] cursor-pointer shadow-md ${
                  isFullyPaid
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>
                  {isFullyPaid
                    ? 'BILL FULLY SETTLED'
                    : `⚡ 1-TAP PAY, PRINT & CLEAR TABLE (${paymentMethod.toUpperCase()})`}
                </span>
              </button>

              {/* Standard Record Payment Option */}
              <button
                type="submit"
                disabled={isFullyPaid || isLoadingPayment}
                className="w-full py-2.5 px-4 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition cursor-pointer"
              >
                <span>Record Payment Only</span>
              </button>
            </form>

            {/* PAYMENT HISTORY & TRANSACTION LOG */}
            {bill && bill.payments && bill.payments.length > 0 && (
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-500 block">
                  Recorded Transactions History ({bill.payments.length})
                </span>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1 max-h-36 overflow-y-auto">
                  {bill.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-200 last:border-none"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-700 uppercase bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                          {p.method}
                        </span>
                        {p.reference_number && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Ref: {p.reference_number}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

            {/* TABLE SESSION CLOSURE BOX */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3 shadow-sm">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2.5">
                <UtensilsCrossed className="w-4 h-4 text-red-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Table Session Release
                </h3>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Release Table {tableNumber} to make it available (blank) for incoming dining guests.
              </p>

              <button
                disabled={(previewSubtotal > 0 && !isFullyPaid) || isClosingSession}
                onClick={handleCloseSession}
                className={`w-full py-3 px-4 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  isFullyPaid || previewSubtotal === 0 || !bill
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <CheckCheck className="w-4 h-4" />
                <span>
                  {isClosingSession
                    ? 'RELEASING TABLE...'
                    : isFullyPaid || previewSubtotal === 0 || !bill
                    ? 'RELEASE TABLE SESSION (MARK BLANK)'
                    : 'PAYMENT PENDING — UNABLE TO RELEASE'}
                </span>
              </button>
            </div>
        </div>
      </div>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          if (isFullyPaid || (bill && bill.paid_amount >= bill.grand_total)) {
            router.push('/pos/tables');
            router.refresh();
          }
        }}
        billDocument={activePrintDoc}
        onPrinted={(res) => {
          if (res.success) {
            setSuccessMsg(res.message);
            if (isFullyPaid || (bill && bill.paid_amount >= bill.grand_total)) {
              setTimeout(() => {
                router.push('/pos/tables');
                router.refresh();
              }, 800);
            }
          } else {
            setPrintError(res.message);
          }
        }}
      />

      {/* Printer Settings Modal */}
      <PrinterSettingsModal
        isOpen={isPrinterSettingsOpen}
        onClose={() => setIsPrinterSettingsOpen(false)}
      />
    </div>
  );
}
