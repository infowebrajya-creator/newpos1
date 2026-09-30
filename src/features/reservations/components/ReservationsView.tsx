'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Reservation, ReservationStatus } from '@/types/reservations';
import {
  getReservations,
  confirmReservation,
  cancelReservation,
  markReservationNoShow,
  seatReservation,
} from '@/services/reservations/reservationService';
import { createCustomer } from '@/services/customers/customerService';
import { ReservationModal } from './ReservationModal';
import { ReservationDetailsModal } from './ReservationDetailsModal';
import { CustomerModal } from '@/features/customers/components/CustomerModal';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar,
  Plus,
  Search,
  RefreshCw,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  Eye,
  UtensilsCrossed,
  User,
  Phone,
  LayoutGrid,
  List,
  AlertTriangle,
} from 'lucide-react';

type ViewMode = 'table' | 'grid';

export function ReservationsView() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const [isBookOpen, setIsBookOpen] = useState<boolean>(false);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchReservationsData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await getReservations(selectedDate, statusFilter, searchQuery);
      setReservations(data);
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedDate, statusFilter, searchQuery]);

  useEffect(() => {
    fetchReservationsData();

    // Supabase Realtime Subscription
    const supabase = createClient();
    const channel = supabase
      .channel('reservations-management-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          fetchReservationsData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReservationsData]);

  const handleDateShortcut = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleOpenDetails = (res: Reservation) => {
    setSelectedRes(res);
    setIsDetailsOpen(true);
  };

  const handleConfirm = async (res: Reservation) => {
    try {
      await confirmReservation(res.id);
      showToast(`Reservation #${res.reservation_number} confirmed.`);
      await fetchReservationsData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm reservation';
      showToast(`Unable to confirm: ${msg}`);
    }
  };

  const handleSeat = async (res: Reservation) => {
    try {
      await seatReservation(res.id);
      showToast(`Guest ${res.customer_name} seated at Table ${res.table_number}. Session opened!`);
      await fetchReservationsData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to seat guest';
      showToast(`Unable to seat guest: ${msg}`);
    }
  };

  const handleQuickAddCustomer = async (input: Parameters<typeof createCustomer>[0]) => {
    await createCustomer(input);
    showToast(`New customer "${input.name}" created.`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'seated':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'confirmed':
        return 'bg-emerald-100 border-emerald-300 text-emerald-800';
      case 'pending':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'completed':
        return 'bg-slate-100 border-slate-300 text-slate-700';
      case 'no_show':
        return 'bg-amber-100 border-amber-300 text-amber-800';
      case 'cancelled':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-slate-100 border-slate-300 text-slate-700';
    }
  };

  // Status Counts Map
  const statusCounts = useMemo(() => {
    const counts = {
      all: reservations.length,
      pending: 0,
      confirmed: 0,
      seated: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };
    reservations.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return counts;
  }, [reservations]);

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  return (
    <div className="space-y-3.5 max-w-[1700px] mx-auto pb-8 font-sans">
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center space-x-2 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP WORKSTATION HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Table Reservations
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
              Table booking schedule, atomic seating integration & guest arrival workflow
            </p>
          </div>
        </div>

        {/* Action Controls & Date Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Selector Shortcuts */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleDateShortcut(0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Today
            </button>

            <button
              onClick={() => handleDateShortcut(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDate === tomorrowStr
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Tomorrow
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-red-500 cursor-pointer"
            />
          </div>

          <button
            onClick={fetchReservationsData}
            className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-lg transition bg-white cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsBookOpen(true)}
            className="py-1.5 px-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Book Table</span>
          </button>
        </div>
      </div>

      {/* SEARCH & STATUS FILTER TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-xl shadow-xs">
        {/* Search Input */}
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reservation #, guest name, phone, table..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Status Filter Pills & View Switcher */}
        <div className="flex items-center space-x-2 text-xs font-bold">
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 overflow-x-auto scrollbar-none">
            {(['all', 'pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'] as const).map(
              (filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold capitalize whitespace-nowrap cursor-pointer transition ${
                    statusFilter === filter
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {filter.replace('_', ' ')} ({filter === 'all' ? statusCounts.all : statusCounts[filter]})
                </button>
              )
            )}
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
              title="Dense Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN RESERVATIONS LIST / TABLE */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600" />
          <span className="text-xs text-slate-500 font-medium">Loading table reservations...</span>
        </div>
      ) : reservations.length === 0 ? (
        /* EMPTY STATE */
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-2 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Reservations Found</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            {searchQuery
              ? `No bookings matched "${searchQuery}".`
              : 'No reservations scheduled for the selected date.'}
          </p>
          <button
            onClick={() => setIsBookOpen(true)}
            className="mt-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book Table</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* HIGH DENSITY WORKSTATION TABLE */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-600 tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Time Slot</th>
                  <th className="py-2.5 px-3">Reservation #</th>
                  <th className="py-2.5 px-3">Guest Name & Phone</th>
                  <th className="py-2.5 px-3">Table Assignment</th>
                  <th className="py-2.5 px-3 text-center">Party Size</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    {/* Time Slot */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-red-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {r.start_time.slice(0, 5)} - {r.end_time.slice(0, 5)}
                        </span>
                      </div>
                    </td>

                    {/* Reservation # */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-extrabold font-mono text-slate-900">
                      #{r.reservation_number}
                    </td>

                    {/* Guest Name & Phone */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <span className="font-extrabold text-slate-900 block">{r.customer_name}</span>
                          {r.customer_phone && (
                            <span className="text-[11px] text-slate-500 font-mono font-semibold block">
                              {r.customer_phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Table Assignment */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        Table {r.table_number}
                      </div>
                      {r.floor_name && (
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">
                          {r.floor_name}
                        </div>
                      )}
                    </td>

                    {/* Party Size */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap font-black text-slate-900 text-sm">
                      {r.guest_count}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(
                          r.status
                        )}`}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleOpenDetails(r)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition shadow-2xs"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>View</span>
                        </button>

                        {r.status === 'pending' && (
                          <button
                            onClick={() => handleConfirm(r)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition shadow-2xs"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Confirm</span>
                          </button>
                        )}

                        {r.status === 'confirmed' && (
                          <button
                            onClick={() => handleSeat(r)}
                            className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition shadow-2xs"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Seat Guest</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {reservations.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition-all shadow-xs"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="font-extrabold text-slate-900 text-sm block">
                    #{r.reservation_number}
                  </span>
                  <div className="flex items-center space-x-1 font-mono text-red-600 text-xs font-bold mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {r.start_time.slice(0, 5)} - {r.end_time.slice(0, 5)}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(
                    r.status
                  )}`}
                >
                  {r.status.replace('_', ' ')}
                </span>
              </div>

              {/* Guest & Table info */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Guest</span>
                  <span className="font-bold text-slate-900">{r.customer_name}</span>
                </div>
                {r.customer_phone && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold">Phone</span>
                    <span className="font-mono text-slate-700">{r.customer_phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-semibold">Table</span>
                  <span className="font-bold text-slate-900">Table {r.table_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Party Size</span>
                  <span className="font-black text-slate-900">{r.guest_count} Guests</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-1.5 text-xs pt-1 border-t border-slate-200">
                <button
                  onClick={() => handleOpenDetails(r)}
                  className="py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>View</span>
                </button>

                {r.status === 'pending' ? (
                  <button
                    onClick={() => handleConfirm(r)}
                    className="py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm</span>
                  </button>
                ) : r.status === 'confirmed' ? (
                  <button
                    onClick={() => handleSeat(r)}
                    className="py-1.5 px-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Seat</span>
                  </button>
                ) : (
                  <div className="py-1.5 px-2 bg-slate-100 text-slate-500 font-semibold rounded-lg text-center text-[11px]">
                    {r.status}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ReservationModal
        isOpen={isBookOpen}
        onClose={() => setIsBookOpen(false)}
        onSuccess={fetchReservationsData}
        onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
      />

      <ReservationDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onSuccess={fetchReservationsData}
        reservation={selectedRes}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleQuickAddCustomer}
      />
    </div>
  );
}
