'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  RecentOrderOverview,
  getAllRecentOrders,
  cancelOrder,
  getOrderDetailsForSession,
  SessionOrderDetails,
} from '@/services/orders/orderService';
import { printKot, printBill } from '@/services/printing/printService';
import { getBillForSession } from '@/services/billing/billingService';
import { createClient } from '@/lib/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/Button';
import {
  Receipt,
  Search,
  RefreshCw,
  Eye,
  X,
  ChefHat,
  FileText,
  Ban,
  Clock,
  UtensilsCrossed,
  Printer,
  Plus,
  Lock,
  AlertTriangle,
  LayoutGrid,
  List,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface OrdersManagementViewProps {
  initialOrders?: RecentOrderOverview[];
}

type OrderFilterStatus = 'all' | 'open' | 'preparing' | 'ready' | 'served' | 'billed' | 'cancelled';
type ViewMode = 'table' | 'grid';

const CANCELLATION_REASONS = [
  'Customer Changed Mind',
  'Duplicate Order Created',
  'Kitchen Delay / Long Wait',
  'Wrong Items Ordered',
  'Payment / Billing Issue',
  'Other Reason',
];

export function OrdersManagementView({ initialOrders = [] }: OrdersManagementViewProps) {
  const { profile } = useCurrentUser();
  const [orders, setOrders] = useState<RecentOrderOverview[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<OrderFilterStatus>('all');
  const [selectedOrderType, setSelectedOrderType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<RecentOrderOverview | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<SessionOrderDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Cancellation Modal State
  const [cancelModalOrder, setCancelModalOrder] = useState<RecentOrderOverview | null>(null);
  const [cancelReason, setCancelReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [cancelCustomNotes, setCancelCustomNotes] = useState<string>('');
  const [cancelPin, setCancelPin] = useState<string>('');
  const [cancelError, setCancelError] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchOrders = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await getAllRecentOrders();
      setOrders(data);
    } catch {
      // Retain existing state if fetch fails
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Supabase Realtime Subscription
  useEffect(() => {
    fetchOrders();

    const supabase = createClient();
    const channel = supabase
      .channel('orders-management-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kots' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const handleViewOrder = async (order: RecentOrderOverview) => {
    setSelectedOrder(order);
    if (order.table_session_id) {
      try {
        setLoadingDetails(true);
        const details = await getOrderDetailsForSession(order.table_session_id);
        setSelectedOrderDetails(details);
      } catch {
        setSelectedOrderDetails(null);
      } finally {
        setLoadingDetails(false);
      }
    } else {
      setSelectedOrderDetails(null);
    }
  };

  const openCancelModal = (order: RecentOrderOverview) => {
    setCancelModalOrder(order);
    setCancelReason(CANCELLATION_REASONS[0]);
    setCancelCustomNotes('');
    setCancelPin('');
    setCancelError('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;

    // RBAC Authorization check for order cancellation
    const activeRole = profile?.role || 'owner';
    const isAuthorizedRole = ['owner', 'admin', 'manager'].includes(activeRole);

    if (!isAuthorizedRole && !cancelPin.trim()) {
      setCancelError('Order cancellation requires Manager, Admin, or Owner authorization.');
      return;
    }

    try {
      setIsSubmittingCancel(true);
      setCancelError('');
      const fullReason = `${cancelReason}${cancelCustomNotes.trim() ? ` - ${cancelCustomNotes.trim()}` : ''}`;
      await cancelOrder(cancelModalOrder.id, fullReason);
      
      showToast(`Order #${cancelModalOrder.order_number} cancelled successfully.`);
      setCancelModalOrder(null);

      if (selectedOrder?.id === cancelModalOrder.id) {
        setSelectedOrder(null);
      }

      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel order';
      setCancelError(`Unable to cancel order: ${msg}`);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleReprintKot = async (kotId: string, kotNumber: string | number) => {
    try {
      const { result } = await printKot(kotId, true);
      if (result.success) {
        showToast(`Reprinting KOT #${kotNumber} (${result.message})`);
      } else {
        showToast(`Print Warning: ${result.message}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Printing failed';
      showToast(`Unable to reprint KOT: ${msg}`);
    }
  };

  const handleReprintBillForOrder = async (order: RecentOrderOverview) => {
    if (!order.table_session_id) {
      showToast('No active bill for this order.');
      return;
    }
    try {
      const bill = await getBillForSession(order.table_session_id);
      if (!bill) {
        showToast(`No generated bill found for Order #${order.order_number}`);
        return;
      }
      const { result } = await printBill(bill.id, true);
      if (result.success) {
        showToast(`Reprinting Bill #${bill.bill_number || bill.id.slice(0, 8)}`);
      } else {
        showToast(`Print Warning: ${result.message}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Printing failed';
      showToast(`Unable to reprint Bill: ${msg}`);
    }
  };

  // Status mapping helper
  const mapOrderStatus = (order: RecentOrderOverview): OrderFilterStatus => {
    const st = (order.status || '').toLowerCase();
    const kotSt = (order.latest_kot_status || '').toLowerCase();

    if (st === 'cancelled') return 'cancelled';
    if (st === 'billed' || st === 'paid' || st === 'closed') return 'billed';

    if (kotSt === 'ready') return 'ready';
    if (kotSt === 'preparing') return 'preparing';
    if (kotSt === 'completed') return 'served';

    return 'open';
  };

  // Status counts for top filter buttons
  const statusCounts = useMemo(() => {
    const counts = {
      all: orders.length,
      open: 0,
      preparing: 0,
      ready: 0,
      served: 0,
      billed: 0,
      cancelled: 0,
    };

    orders.forEach((o) => {
      const statusKey = mapOrderStatus(o);
      if (counts[statusKey] !== undefined) {
        counts[statusKey]++;
      }
    });

    return counts;
  }, [orders]);

  // Total valid revenue (excluding cancelled orders)
  const totalValidRevenue = useMemo(() => {
    return orders
      .filter((o) => mapOrderStatus(o) !== 'cancelled')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0);
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const orderStatus = mapOrderStatus(o);
      const matchFilter = selectedFilter === 'all' || orderStatus === selectedFilter;

      // Order type filter
      const typeStr = (o.order_type || 'dine_in').toLowerCase();
      const matchType =
        selectedOrderType === 'all' ||
        (selectedOrderType === 'dine_in' && typeStr.includes('dine')) ||
        (selectedOrderType === 'takeaway' && (typeStr.includes('take') || typeStr.includes('pick'))) ||
        (selectedOrderType === 'delivery' && typeStr.includes('delivery'));

      // Date filter
      let matchDate = true;
      if (dateFilter === 'today' && o.created_at) {
        const orderDate = new Date(o.created_at).toDateString();
        const todayDate = new Date().toDateString();
        matchDate = orderDate === todayDate;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.order_number.toString().toLowerCase().includes(q) ||
        o.table_number.toLowerCase().includes(q) ||
        (o.items_summary && o.items_summary.toLowerCase().includes(q));

      return matchFilter && matchType && matchDate && matchSearch;
    });
  }, [orders, selectedFilter, selectedOrderType, dateFilter, searchQuery]);

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatTime = (isoString?: string | null): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const utcTime = d.getTime();
      const istDate = new Date(utcTime + 5.5 * 60 * 60 * 1000);
      let hours = istDate.getUTCHours();
      const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    } catch {
      return '';
    }
  };

  const formatCurrency = (amount?: number): string => {
    if (amount == null) return '₹0';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (order: RecentOrderOverview) => {
    const mapped = mapOrderStatus(order);
    switch (mapped) {
      case 'open':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">
            OPEN
          </span>
        );
      case 'preparing':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
            PREPARING
          </span>
        );
      case 'ready':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
            READY TO SERVE
          </span>
        );
      case 'served':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-300">
            SERVED
          </span>
        );
      case 'billed':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-300">
            BILLED
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-300">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-300">
            {order.status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-3.5 max-w-[1700px] mx-auto pb-8 font-sans">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center space-x-2 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER WORKSTATION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-xs">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Orders Management
              </h1>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                Workstation
              </span>
              <span className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Realtime Active</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live order tracking, round breakdowns, KOT reprinting & cancellation audit log
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Revenue Summary Chip */}
          <div className="hidden lg:flex flex-col items-end px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Sales</span>
            <span className="text-xs font-black text-slate-900">{formatCurrency(totalValidRevenue)}</span>
          </div>

          <button
            onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1.5 cursor-pointer ${
              dateFilter === 'today'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{dateFilter === 'today' ? "Today's Orders" : 'All Orders'}</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            isLoading={isRefreshing}
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Link
            href="/pos/tables"
            className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Order</span>
          </Link>
        </div>
      </div>

      {/* SEARCH, TYPE & STATUS FILTER TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-xl shadow-xs">
        {/* Left: Search Bar & Order Type Dropdown */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Order #, Table, Item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Order Type Selector */}
          <select
            value={selectedOrderType}
            onChange={(e) => setSelectedOrderType(e.target.value)}
            className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="all">All Order Types</option>
            <option value="dine_in">Dine In</option>
            <option value="takeaway">Take Away / Pick Up</option>
            <option value="delivery">Delivery</option>
          </select>

          {/* View Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1 rounded ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              title="Dense Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Status Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({statusCounts.all})
          </button>

          <button
            onClick={() => setSelectedFilter('open')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'open'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Open ({statusCounts.open})
          </button>

          <button
            onClick={() => setSelectedFilter('preparing')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'preparing'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Preparing ({statusCounts.preparing})
          </button>

          <button
            onClick={() => setSelectedFilter('ready')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'ready'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Ready ({statusCounts.ready})
          </button>

          <button
            onClick={() => setSelectedFilter('served')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'served'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Served ({statusCounts.served})
          </button>

          <button
            onClick={() => setSelectedFilter('billed')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'billed'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Billed ({statusCounts.billed})
          </button>

          <button
            onClick={() => setSelectedFilter('cancelled')}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
              selectedFilter === 'cancelled'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Cancelled ({statusCounts.cancelled})
          </button>
        </div>
      </div>

      {/* MAIN ORDERS WORKSTATION CONTENT */}
      {filteredOrders.length > 0 ? (
        viewMode === 'table' ? (
          /* HIGH-DENSITY WORKSTATION TABLE */
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-600 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Order # & Time</th>
                    <th className="py-2.5 px-3">Table / Session</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Items Breakdown</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {filteredOrders.map((order) => {
                    const mappedStatus = mapOrderStatus(order);
                    const isCancelled = mappedStatus === 'cancelled';

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isCancelled ? 'bg-red-50/40 text-slate-500' : ''
                        }`}
                      >
                        {/* Order # & Time */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-900 text-sm">
                              #{order.order_number}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatTime(order.created_at)}</span>
                          </div>
                        </td>

                        {/* Table / Session */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            Table {order.table_number}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Session #{order.session_number} • {order.rounds_count} Rounds
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3 whitespace-nowrap uppercase font-bold text-[10px]">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {order.order_type || 'dine_in'}
                          </span>
                        </td>

                        {/* Items Summary */}
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="line-clamp-1 font-medium text-slate-800 text-xs">
                            {order.items_summary || 'No items'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {order.total_items} total items
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {getStatusBadge(order)}
                        </td>

                        {/* Amount */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-black text-sm text-slate-900">
                          {isCancelled ? (
                            <span className="line-through text-slate-400 font-semibold">
                              {formatCurrency(order.total_amount)}
                            </span>
                          ) : (
                            formatCurrency(order.total_amount)
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleViewOrder(order)}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition shadow-2xs"
                              title="View Order Details"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>View</span>
                            </button>

                            {!isCancelled && (
                              <>
                                <button
                                  onClick={() => handleReprintBillForOrder(order)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition"
                                  title="Print Bill"
                                >
                                  <FileText className="w-3 h-3 text-slate-600" />
                                  <span>Bill</span>
                                </button>

                                <button
                                  onClick={() => openCancelModal(order)}
                                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition"
                                  title="Cancel Order"
                                >
                                  <Ban className="w-3 h-3 text-red-600" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* CARD GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredOrders.map((order) => {
              const mappedStatus = mapOrderStatus(order);
              const isCancelled = mappedStatus === 'cancelled';

              return (
                <div
                  key={order.id}
                  className={`bg-white border rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition-all shadow-xs ${
                    isCancelled
                      ? 'border-red-200 bg-red-50/30 text-slate-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Header: Order #, Table, Time, Status */}
                  <div className="flex items-start justify-between border-b border-slate-200 pb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-extrabold text-slate-900 tracking-tight">
                          Order #{order.order_number}
                        </span>
                        <span className="text-xs font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                          Table {order.table_number}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5 font-medium">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{formatTime(order.created_at)}</span>
                        <span>•</span>
                        <span>{order.rounds_count} Rounds</span>
                      </div>
                    </div>

                    {getStatusBadge(order)}
                  </div>

                  {/* Items Summary & Total Amount */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                    <div className="text-xs font-medium text-slate-700 line-clamp-2">
                      {order.items_summary || 'No items added'}
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-medium">Total Amount</span>
                      <span
                        className={`text-base font-black tracking-tight ${
                          isCancelled ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 border-t border-slate-200 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg flex items-center justify-center space-x-1 transition border border-slate-300 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>View</span>
                      </button>

                      {!isCancelled && mappedStatus !== 'billed' ? (
                        <Link
                          href={`/pos/order?tableId=${order.table_id}`}
                          className="py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1 transition shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Items</span>
                        </Link>
                      ) : (
                        <div className="py-1.5 px-2 bg-slate-100 text-slate-500 font-semibold text-xs rounded-lg flex items-center justify-center border border-slate-200">
                          {isCancelled ? 'Cancelled' : 'Billed'}
                        </div>
                      )}
                    </div>

                    {!isCancelled && (
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <button
                          onClick={() => handleReprintBillForOrder(order)}
                          className="py-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold rounded flex items-center justify-center space-x-1 transition text-[11px] cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-slate-600" />
                          <span>Print Bill</span>
                        </button>

                        <button
                          onClick={() => openCancelModal(order)}
                          className="py-1 px-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded flex items-center justify-center space-x-1 transition text-[11px] cursor-pointer"
                        >
                          <Ban className="w-3 h-3 text-red-600" />
                          <span>Cancel Order</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* EMPTY STATE */
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-2 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No orders match filter</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            {searchQuery
              ? `No orders match "${searchQuery}".`
              : 'There are currently no orders in this status category.'}
          </p>
        </div>
      )}

      {/* ORDER DETAIL DRAWER / MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-xl p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Order #{selectedOrder.order_number}
                    </h3>
                    {getStatusBadge(selectedOrder)}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Table {selectedOrder.table_number} • Session #{selectedOrder.session_number} • {formatTime(selectedOrder.created_at)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="space-y-3.5 overflow-y-auto flex-1 pr-1 text-xs text-slate-700">
              {/* Summary metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Order Type</span>
                  <span className="font-extrabold text-slate-900 uppercase">{selectedOrder.order_type || 'DINE IN'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Amount</span>
                  <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Time Created</span>
                  <span className="font-semibold text-slate-900">{formatTime(selectedOrder.created_at)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Order Rounds</span>
                  <span className="font-semibold text-slate-900">{selectedOrder.rounds_count} Rounds</span>
                </div>
              </div>

              {/* Rounds & Items Breakdown */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                    <ChefHat className="w-4 h-4 text-red-600" />
                    <span>Ordered Rounds & KOT Breakdown</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedOrderDetails?.rounds.length || 0} Rounds Total
                  </span>
                </div>

                {loadingDetails ? (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-red-600" />
                    <span>Loading round items breakdown...</span>
                  </div>
                ) : selectedOrderDetails && selectedOrderDetails.rounds.length > 0 ? (
                  selectedOrderDetails.rounds.map((round) => (
                    <div key={round.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 text-[11px]">
                        <span className="font-extrabold text-slate-900">
                          Round #{round.round_number || 1}
                        </span>
                        {round.kot ? (
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              KOT #{round.kot.kot_number} ({round.kot.status})
                            </span>
                            <button
                              onClick={() => handleReprintKot(round.kot!.id, round.kot!.kot_number)}
                              className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded text-[10px] flex items-center space-x-1 cursor-pointer transition shadow-2xs"
                              title="Reprint KOT"
                            >
                              <Printer className="w-3 h-3 text-slate-500" />
                              <span>Reprint KOT</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No KOT record</span>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-0.5">
                        {round.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs py-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-[11px]">
                                {item.quantity}×
                              </span>
                              <span className="font-bold text-slate-900">
                                {item.item_name || (item as any).item_name_snapshot || (item as any).name || 'Item'}
                              </span>
                              {item.is_complimentary && (
                                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1 rounded">
                                  COMP
                                </span>
                              )}
                              {item.item_note && (
                                <span className="text-[11px] text-slate-500 italic">({item.item_note})</span>
                              )}
                            </div>
                            <span className="font-black text-slate-900">
                              {item.is_complimentary ? '₹0' : formatCurrency(item.unit_price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-slate-200">
                    No item rounds recorded for this order.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="pt-3 border-t border-slate-200 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-slate-600" />
                <span>Close</span>
              </button>

              <button
                onClick={() => handleReprintBillForOrder(selectedOrder)}
                className="py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1 transition shadow-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Print Bill</span>
              </button>

              <Link
                href={`/pos/order?tableId=${selectedOrder.table_id}`}
                className="py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1 shadow-xs"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Open POS</span>
              </Link>

              {mapOrderStatus(selectedOrder) !== 'cancelled' && (
                <button
                  onClick={() => openCancelModal(selectedOrder)}
                  className="py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-lg flex items-center justify-center space-x-1 cursor-pointer transition"
                >
                  <Ban className="w-3.5 h-3.5 text-red-600" />
                  <span>Cancel Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION AUTHORIZATION MODAL */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl p-5 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2.5 text-red-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Cancel Order #{cancelModalOrder.order_number}
                </h3>
              </div>
              <button
                onClick={() => setCancelModalOrder(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Order #{cancelModalOrder.order_number} for Table {cancelModalOrder.table_number} will be cancelled.
              Cancelled orders remain in the history log but are excluded from revenue.
            </p>

            {cancelError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-2.5 rounded-lg font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            {/* Cancellation Reason Select */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-red-500"
              >
                {CANCELLATION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Additional Notes (Optional)</label>
              <input
                type="text"
                placeholder="Enter details..."
                value={cancelCustomNotes}
                onChange={(e) => setCancelCustomNotes(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Manager Authorization / Security Confirmation */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Manager Authorization / Security PIN</span>
              </label>
              <input
                type="password"
                placeholder="Enter Manager PIN / Authorization code..."
                value={cancelPin}
                onChange={(e) => setCancelPin(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Buttons */}
            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => setCancelModalOrder(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold"
              >
                Dismiss
              </Button>

              <button
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
                className="py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmittingCancel ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>Confirm Cancel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
