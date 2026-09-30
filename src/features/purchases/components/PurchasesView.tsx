'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Purchase, PurchaseStatus } from '@/types/purchases';
import { getPurchases, getPurchaseById, cancelPurchase } from '@/services/purchases/purchaseService';
import { createClient } from '@/lib/supabase/client';
import { PurchaseEditorModal } from './PurchaseEditorModal';
import { PurchaseDetailsModal } from './PurchaseDetailsModal';
import { ReceivePurchaseModal } from './ReceivePurchaseModal';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import {
  ShoppingBag,
  Plus,
  Search,
  RefreshCw,
  Building2,
  Calendar,
  Eye,
  PackageCheck,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Clock,
  Layers,
  FileText,
  UserCheck,
} from 'lucide-react';

interface PurchasesViewProps {
  initialPurchases?: Purchase[];
}

export function PurchasesView({ initialPurchases = [] }: PurchasesViewProps) {
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchPurchases = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await getPurchases(statusFilter);
      setPurchases(data);
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (initialPurchases.length === 0) {
      fetchPurchases();
    }
  }, [fetchPurchases, initialPurchases.length]);

  // Supabase Realtime Subscription for Live Updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('purchases-workstation-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchases' },
        () => {
          fetchPurchases();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_items' },
        () => {
          fetchPurchases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPurchases]);

  const handleOpenDetails = async (purchase: Purchase) => {
    try {
      const detailed = await getPurchaseById(purchase.id);
      setSelectedPurchase(detailed || purchase);
      setIsDetailsOpen(true);
    } catch {
      setSelectedPurchase(purchase);
      setIsDetailsOpen(true);
    }
  };

  const handleOpenReceive = async (purchase: Purchase) => {
    try {
      const detailed = await getPurchaseById(purchase.id);
      setSelectedPurchase(detailed || purchase);
      setIsReceiveOpen(true);
    } catch {
      setSelectedPurchase(purchase);
      setIsReceiveOpen(true);
    }
  };

  const handleCancelPurchase = async (purchase: Purchase) => {
    if (confirm(`Are you sure you want to cancel purchase order ${purchase.purchase_number}?`)) {
      try {
        await cancelPurchase(purchase.id, 'Cancelled from UI workstation');
        await fetchPurchases();
        showToast(`Purchase order ${purchase.purchase_number} cancelled`);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Failed to cancel purchase');
      }
    }
  };

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalCount = purchases.length;
    let draftCount = 0;
    let orderedCount = 0;
    let receivedCount = 0;
    let totalSpend = 0;

    purchases.forEach((p) => {
      if (p.status === 'draft') draftCount++;
      if (p.status === 'ordered') orderedCount++;
      if (p.status === 'received') receivedCount++;
      if (p.status !== 'cancelled') totalSpend += p.grand_total || 0;
    });

    return {
      totalCount,
      draftCount,
      orderedCount,
      receivedCount,
      totalSpend,
    };
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        p.purchase_number.toLowerCase().includes(query) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(query)) ||
        (p.invoice_number && p.invoice_number.toLowerCase().includes(query));

      const matchStatus = statusFilter === 'all' || p.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [purchases, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'ordered':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'partially_received':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'cancelled':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-slate-100 border-slate-200 text-slate-700';
    }
  };

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
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Purchases & Procurement
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
              Manage raw material purchase orders, vendor invoices, atomic stock receiving, and supplier procurement
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/pos/suppliers">
            <Button variant="outline" size="sm" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Suppliers
            </Button>
          </Link>

          <Button variant="outline" size="sm" onClick={fetchPurchases} isLoading={isRefreshing} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold">
            <Plus className="w-4 h-4 mr-1" />
            New Purchase
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Purchase Orders"
          value={summaryMetrics.totalCount}
          subtitle="All created orders"
          icon={<ShoppingBag className="w-5 h-5 text-slate-700" />}
        />
        <StatCard
          title="Pending / Ordered"
          value={summaryMetrics.orderedCount}
          subtitle="Awaiting stock receiving"
          icon={<Clock className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Stock Received"
          value={summaryMetrics.receivedCount}
          subtitle="Credited to inventory"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Total Procurement Spend"
          value={`₹ ${summaryMetrics.totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Excludes cancelled orders"
          icon={<DollarSign className="w-5 h-5 text-red-600" />}
        />
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          {(['all', 'draft', 'ordered', 'received', 'cancelled'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3.5 py-1.5 rounded-lg font-bold shrink-0 capitalize transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter}
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
            placeholder="Search by PO #, supplier, or invoice ref..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 font-medium"
          />
        </div>
      </div>

      {/* Purchase Workstation Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3">Purchase #</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-3">Invoice Ref</th>
                <th className="py-2.5 px-3">Purchase Date</th>
                <th className="py-2.5 px-3">Grand Total</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredPurchases.length > 0 ? (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold font-mono text-slate-900">
                      {p.purchase_number}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div className="flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>{p.supplier_name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {p.invoice_number || <span className="text-slate-400 italic text-[11px]">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{new Date(p.purchase_date).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      ₹ {p.grand_total.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(
                          p.status
                        )}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenDetails(p)}
                          className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800 hover:bg-slate-200 transition-colors font-bold text-[11px] cursor-pointer"
                          title="View Purchase Details"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          View
                        </button>

                        {p.status !== 'received' && p.status !== 'cancelled' && (
                          <button
                            onClick={() => handleOpenReceive(p)}
                            className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors font-bold text-[11px] cursor-pointer"
                            title="Receive Stock"
                          >
                            <PackageCheck className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
                            Receive
                          </button>
                        )}

                        {p.status !== 'received' && p.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelPurchase(p)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Cancel Order"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>No purchase orders found matching the filter criteria.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <PurchaseEditorModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={async () => {
          await fetchPurchases();
          showToast('Purchase order created successfully');
        }}
      />

      <PurchaseDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        purchase={selectedPurchase}
      />

      <ReceivePurchaseModal
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
        onSuccess={async () => {
          await fetchPurchases();
          showToast('Purchase stock received and credited to inventory');
        }}
        purchase={selectedPurchase}
      />
    </div>
  );
}
