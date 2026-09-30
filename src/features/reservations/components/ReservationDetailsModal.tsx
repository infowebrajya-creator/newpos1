'use client';

import React, { useState } from 'react';
import { Reservation } from '@/types/reservations';
import {
  confirmReservation,
  cancelReservation,
  markReservationNoShow,
  seatReservation,
} from '@/services/reservations/reservationService';
import {
  X,
  Calendar,
  Clock,
  Users,
  UtensilsCrossed,
  CheckCircle2,
  XCircle,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  User,
  Phone,
  FileText,
} from 'lucide-react';

interface ReservationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  reservation: Reservation | null;
}

export function ReservationDetailsModal({
  isOpen,
  onClose,
  onSuccess,
  reservation,
}: ReservationDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !reservation) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      await confirmReservation(reservation.id);
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to confirm reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleSeat = async () => {
    try {
      setLoading(true);
      setError(null);
      await seatReservation(reservation.id);
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to seat guest');
    } finally {
      setLoading(false);
    }
  };

  const handleNoShow = async () => {
    try {
      setLoading(true);
      setError(null);
      await markReservationNoShow(reservation.id);
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to mark as no-show');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Enter cancellation reason:');
    if (reason !== null) {
      try {
        setLoading(true);
        setError(null);
        await cancelReservation(reservation.id, reason);
        await onSuccess();
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to cancel reservation');
      } finally {
        setLoading(false);
      }
    }
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

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-fadeIn font-sans">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  {reservation.reservation_number}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadge(
                    reservation.status
                  )}`}
                >
                  {reservation.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Booked for {reservation.customer_name}
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

        {/* Body */}
        <div className="p-5 space-y-3.5 text-xs text-slate-700">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Table</span>
              <span className="font-extrabold text-slate-900 text-sm">Table {reservation.table_number}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Party Size</span>
              <span className="font-extrabold text-slate-900 text-sm">{reservation.guest_count} Guests</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Date</span>
              <span className="font-bold text-slate-900">{formatDate(reservation.reservation_date)}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Time Slot</span>
              <span className="font-bold text-red-600 font-mono">
                {reservation.start_time.slice(0, 5)} - {reservation.end_time.slice(0, 5)}
              </span>
            </div>
          </div>

          {/* Customer Info Box */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Guest Details</span>
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span className="flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{reservation.customer_name}</span>
              </span>
              {reservation.customer_phone && (
                <span className="font-mono text-slate-600 text-xs flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{reservation.customer_phone}</span>
                </span>
              )}
            </div>
          </div>

          {reservation.notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Special Requests</span>
              <p className="font-medium text-slate-800">{reservation.notes}</p>
            </div>
          )}

          {reservation.cancellation_reason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-red-600 block">Cancellation Reason</span>
              <p className="font-medium">{reservation.cancellation_reason}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center space-x-1.5">
            {reservation.status === 'pending' && (
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm</span>
              </button>
            )}

            {reservation.status === 'confirmed' && (
              <button
                onClick={handleSeat}
                disabled={loading}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Seat Guest</span>
              </button>
            )}

            {reservation.status === 'confirmed' && (
              <button
                onClick={handleNoShow}
                disabled={loading}
                className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
              >
                No-Show
              </button>
            )}

            {reservation.status !== 'completed' &&
              reservation.status !== 'cancelled' &&
              reservation.status !== 'seated' && (
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
