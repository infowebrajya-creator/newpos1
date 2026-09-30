'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { EnrichedPayment, PaymentSummaryStats } from '@/types/payments';
import { PaymentMethod, PaymentStatus } from '@/types/billing';
import { getPayments } from '@/services/payments/paymentService';
import { printBill } from '@/services/printing/printService';
import { createClient } from '@/lib/supabase/client';
import { PaymentDetailsModal } from './PaymentDetailsModal';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import {
  CreditCard,
  Search,
  RefreshCw,
  Calendar,
  Eye,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  FileText,
  Printer,
  ExternalLink,
  Wallet,
  Clock,
  QrCode,
  Layers,
  UtensilsCrossed,
  User,
} from 'lucide-react';

interface PaymentsViewProps {
  initialPayments?: EnrichedPayment[];
  initialSummary?: PaymentSummaryStats | null;
}

export function PaymentsView({ initialPayments = [], initialSummary = null }: PaymentsViewProps) {
  const [payments, setPayments] = useState<EnrichedPayment[]>(initialPayments);
  const [summary, setSummary] = useState<PaymentSummaryStats | null>(initialSummary);

  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedPayment, setSelectedPayment] = useState<EnrichedPayment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [reprintingId, setReprintingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchPaymentData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const { payments: data, summary: stats } = await getPayments({
        methodFilter,
        statusFilter,
        searchQuery,
      });
      setPayments(data);
      setSummary(stats);
    } catch (err) {
      console.error('Failed to fetch payments data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [methodFilter, statusFilter, searchQuery]);

  useEffect(() => {
    if (initialPayments.length === 0) {
      fetchPaymentData();
    }
  }, [fetchPaymentData, initialPayments.length]);

  // Supabase Realtime Subscription for Payments & Bills
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('payments-workstation-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          fetchPaymentData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills' },
        () => {
          fetchPaymentData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPaymentData]);

  const handleOpenDetails = (p: EnrichedPayment) => {
    setSelectedPayment(p);
    setIsDetailsOpen(true);
  };

  const handleReprintRowReceipt = async (p: EnrichedPayment) => {
    if (!p.bill_id) return;
    try {
      setReprintingId(p.id);
      const { result } = await printBill(p.bill_id, true);
      showToast(result.message || `Receipt printed for Bill #${p.bill_number}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Print failed';
      showToast(`Print notice: ${msg}`);
    } finally {
      setReprintingId(null);
    }
  };

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatTime = (isoString?: string | null): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const utcTime = d.getTime();
      const istDate = new Date(utcTime + 5.5 * 60 * 60 * 1000);
      const day = istDate.getUTCDate().toString().padStart(2, '0');
      const month = MONTHS[istDate.getUTCMonth()];
      let hours = istDate.getUTCHours();
      const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${day} ${month} at ${hours}:${minutes} ${ampm}`;
    } catch {
      return '';
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'upi':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'card':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'credit':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      default:
        return 'bg-slate-100 border-slate-200 text-slate-700';
    }
  };

  const digitalTotal = (summary?.upiTotal || 0) + (summary?.cardTotal || 0);

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto pb-8">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-fadeIn border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Payments & Settlement
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Workstation
              </span>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Sync</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Track collected payments, settlement methods (Cash, UPI, Card, Credit), split transaction breakdowns, and receipt reprinting
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/pos/billing">
            <Button variant="outline" size="sm" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold">
              <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Billing & Cashier
            </Button>
          </Link>

          <Button variant="outline" size="sm" onClick={fetchPaymentData} isLoading={isRefreshing} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Today's Collections"
          value={`₹ ${(summary?.totalCollected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${summary?.totalCount || 0} completed payments today`}
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Cash Collections"
          value={`₹ ${(summary?.cashTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Physical cash in register"
          icon={<Wallet className="w-5 h-5 text-slate-700" />}
        />
        <StatCard
          title="Digital Payments"
          value={`₹ ${digitalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`UPI: ₹${(summary?.upiTotal || 0).toFixed(0)} • Card: ₹${(summary?.cardTotal || 0).toFixed(0)}`}
          icon={<QrCode className="w-5 h-5 text-purple-600" />}
        />
        <StatCard
          title="Pending / Due Balance"
          value={`₹ ${(summary?.pendingDueTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Unsettled/partially paid bills today"
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        {/* Method Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          {(['all', 'cash', 'upi', 'card', 'credit', 'other'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setMethodFilter(method)}
              className={`px-3.5 py-1.5 rounded-lg font-bold shrink-0 uppercase transition-all cursor-pointer ${
                methodFilter === method
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Bill #, Table, Ref ID, Customer..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 font-medium"
          />
        </div>
      </div>

      {/* Payment Workstation Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3">Bill #</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Table / Session</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Payment Method</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Reference / TX ID</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {payments.length > 0 ? (
                payments.map((p) => {
                  const isSplit = p.all_bill_payments && p.all_bill_payments.length > 1;
                  const methodBadge = getMethodBadge(p.method);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div className="flex items-center space-x-1">
                          <span>Bill #{p.bill_number}</span>
                          {isSplit && (
                            <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] px-1 py-0.2 rounded font-bold" title="Split Payment">
                              SPLIT
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 font-medium" suppressHydrationWarning>
                        {formatTime(p.created_at)}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {p.table_number || 'T-'} {p.order_type ? `(${p.order_type})` : ''}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {p.customer_name || <span className="text-slate-400 italic text-[11px]">Walk-in Guest</span>}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${methodBadge}`}>
                          {p.method}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        ₹ {p.amount.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                        {p.reference_number || <span className="text-slate-400 italic">—</span>}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                          {p.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenDetails(p)}
                            className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800 hover:bg-slate-200 transition-colors font-bold text-[11px] cursor-pointer"
                            title="View Payment Breakdown"
                          >
                            <Eye className="w-3.5 h-3.5 inline mr-1" />
                            View
                          </button>

                          <button
                            onClick={() => handleReprintRowReceipt(p)}
                            disabled={reprintingId === p.id}
                            className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-bold text-[11px] cursor-pointer"
                            title="Reprint Bill Receipt"
                          >
                            <Printer className={`w-3.5 h-3.5 inline mr-1 text-slate-600 ${reprintingId === p.id ? 'animate-spin' : ''}`} />
                            Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>No payment transactions found matching the filter criteria.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        payment={selectedPayment}
      />
    </div>
  );
}
