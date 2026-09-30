'use client';

import React, { useState, useEffect } from 'react';
import { Customer, CustomerVisitHistory } from '@/types/customers';
import { getCustomerVisitHistory } from '@/services/customers/customerService';
import { X, User, Phone, Mail, MapPin, Calendar, Clock, Utensils, Receipt, CheckCircle2, FileText } from 'lucide-react';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export function CustomerDetailsModal({
  isOpen,
  onClose,
  customer,
}: CustomerDetailsModalProps) {
  const [history, setHistory] = useState<CustomerVisitHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      const fetchHistory = async () => {
        try {
          setLoading(true);
          const data = await getCustomerVisitHistory(customer.id);
          setHistory(data);
        } catch (err) {
          console.error('Failed to load visit history:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

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

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  const formatCurrency = (amount?: number | null) => {
    if (amount == null) return '—';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-fadeIn font-sans">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center font-extrabold text-base shadow-2xs">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-slate-900">{customer.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    customer.is_active
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  {customer.is_active ? 'Active Profile' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Customer Record • Created {formatDate(customer.created_at)}
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

        {/* Scroll Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-700">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center space-x-1">
                <Utensils className="w-3.5 h-3.5 text-red-600" />
                <span>Total Visits</span>
              </span>
              <p className="text-base font-black text-slate-900">{customer.total_visits_count || 0} Visits</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-red-600" />
                <span>Reservations</span>
              </span>
              <p className="text-base font-black text-slate-900">{customer.total_reservations_count || 0} Bookings</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-red-600" />
                <span>Last Visit Date</span>
              </span>
              <p className="text-base font-black text-slate-900">
                {customer.last_visit_date ? formatDate(customer.last_visit_date) : 'No visits recorded'}
              </p>
            </div>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {customer.phone && (
              <div className="flex items-center space-x-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Phone Number</span>
                  <span className="text-slate-900 font-mono font-bold">{customer.phone}</span>
                </div>
              </div>
            )}

            {customer.email && (
              <div className="flex items-center space-x-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Email Address</span>
                  <span className="text-slate-900 font-bold truncate block">{customer.email}</span>
                </div>
              </div>
            )}

            {customer.address && (
              <div className="flex items-start space-x-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg sm:col-span-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Address</span>
                  <span className="text-slate-900 font-medium">{customer.address}</span>
                </div>
              </div>
            )}

            {customer.notes && (
              <div className="flex items-start space-x-2.5 p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg sm:col-span-2">
                <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">Preferences & Notes</span>
                  <span className="text-slate-900 font-medium">{customer.notes}</span>
                </div>
              </div>
            )}
          </div>

          {/* Dining Visit & Billing History Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Receipt className="w-4 h-4 text-red-600" />
              <span>Dining Sessions & Billing History</span>
            </h4>

            {loading ? (
              <div className="h-32 bg-slate-50 border border-slate-200 rounded-xl animate-pulse" />
            ) : history.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium">
                No past dining sessions recorded for this customer.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase bg-slate-100">
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Table</th>
                      <th className="py-2.5 px-3 text-center">Guests</th>
                      <th className="py-2.5 px-3">Bill #</th>
                      <th className="py-2.5 px-3 text-right">Grand Total</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                    {history.map((v) => (
                      <tr key={v.session_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-bold text-slate-900">{formatDate(v.opened_at)}</span>
                          <span className="text-[11px] text-slate-500 block">{formatTime(v.opened_at)}</span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-900">
                          Table {v.table_number}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap font-bold">
                          {v.guest_count}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-700">
                          {v.bill_number ? `#${v.bill_number}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-black text-slate-900">
                          {formatCurrency(v.grand_total)}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              v.payment_status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}
                          >
                            {v.payment_status || 'Open Session'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
