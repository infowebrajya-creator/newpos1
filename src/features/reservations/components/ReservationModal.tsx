'use client';

import React, { useState, useEffect } from 'react';
import { Customer } from '@/types/customers';
import { RestaurantTable } from '@/types/tables';
import { CreateReservationInput } from '@/types/reservations';
import { getCustomers } from '@/services/customers/customerService';
import { getTables } from '@/services/tables/tableService';
import { createReservation } from '@/services/reservations/reservationService';
import { X, Calendar, Clock, Users, UtensilsCrossed, AlertCircle, CheckCircle2, UserPlus, RefreshCw } from 'lucide-react';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onOpenCustomerModal?: () => void;
}

export function ReservationModal({
  isOpen,
  onClose,
  onSuccess,
  onOpenCustomerModal,
}: ReservationModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [tableId, setTableId] = useState('');
  const [reservationDate, setReservationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('20:00');
  const [guestCount, setGuestCount] = useState(2);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [custData, tableData] = await Promise.all([
            getCustomers(),
            getTables(),
          ]);
          const activeCust = custData.filter((c) => c.is_active);
          const activeTables = tableData.filter((t) => t.is_active);
          setCustomers(activeCust);
          setTables(activeTables);

          if (activeCust.length > 0 && !customerId) setCustomerId(activeCust[0].id);
          if (activeTables.length > 0 && !tableId) setTableId(activeTables[0].id);
        } catch (err) {
          console.error('Failed to load reservation prerequisites:', err);
        }
      };
      fetchData();
    }
  }, [isOpen, customerId, tableId]);

  if (!isOpen) return null;

  const selectedTable = tables.find((t) => t.id === tableId);
  const isCapacityExceeded = selectedTable && guestCount > selectedTable.capacity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer profile.');
      return;
    }
    if (!tableId) {
      setError('Please select a table.');
      return;
    }
    if (isCapacityExceeded) {
      setError(`Guest count (${guestCount}) exceeds selected table capacity (${selectedTable?.capacity}).`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: CreateReservationInput = {
        customer_id: customerId,
        table_id: tableId,
        reservation_date: reservationDate,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        guest_count: guestCount,
        notes: notes?.trim() || null,
      };

      await createReservation(payload);
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-fadeIn font-sans">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                New Table Reservation
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Book a restaurant table for a registered guest
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs text-slate-700">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800">
                Customer Profile <span className="text-red-500">*</span>
              </label>
              {onOpenCustomerModal && (
                <button
                  type="button"
                  onClick={onOpenCustomerModal}
                  className="text-[11px] font-extrabold text-red-600 hover:text-red-700 flex items-center space-x-1 cursor-pointer"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>+ New Customer</span>
                </button>
              )}
            </div>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Table & Guest Count Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center space-x-1">
                <UtensilsCrossed className="w-3.5 h-3.5 text-slate-400" />
                <span>Assign Table</span>
              </label>
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-red-500 cursor-pointer"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.table_number} (Cap: {t.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center space-x-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Guest Count</span>
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={guestCount}
                onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                value={reservationDate}
                onChange={(e) => setReservationDate(e.target.value)}
                className="w-full py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Start Time</span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>End Time</span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">Special Requests & Booking Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Birthday celebration, window table requested..."
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:border-red-500 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Book Reservation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
