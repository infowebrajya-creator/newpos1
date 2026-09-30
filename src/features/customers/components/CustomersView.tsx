'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Customer, CreateCustomerInput } from '@/types/customers';
import { getCustomers, createCustomer, updateCustomer } from '@/services/customers/customerService';
import { CustomerModal } from './CustomerModal';
import { CustomerDetailsModal } from './CustomerDetailsModal';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  Utensils,
  Edit2,
  Eye,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  X,
  LayoutGrid,
  List,
} from 'lucide-react';

type StatusFilter = 'all' | 'active' | 'inactive';
type ViewMode = 'table' | 'grid';

export function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchCustomersData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await getCustomers(searchQuery);
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchCustomersData();

    // Supabase Realtime Subscription
    const supabase = createClient();
    const channel = supabase
      .channel('customers-management-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        () => {
          fetchCustomersData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCustomersData]);

  const handleSaveCustomer = async (input: CreateCustomerInput) => {
    if (selectedCustomer) {
      await updateCustomer(selectedCustomer.id, input);
      showToast(`Customer profile "${input.name}" updated successfully.`);
    } else {
      await createCustomer(input);
      showToast(`New customer "${input.name}" created successfully.`);
    }
    await fetchCustomersData();
  };

  const handleToggleCustomerStatus = async (cust: Customer) => {
    const newStatus = !cust.is_active;
    // Optimistic UI update
    setCustomers((prev) =>
      prev.map((c) => (c.id === cust.id ? { ...c, is_active: newStatus } : c))
    );

    try {
      await updateCustomer(cust.id, { is_active: newStatus });
      showToast(`Customer "${cust.name}" profile set to ${newStatus ? 'ACTIVE' : 'INACTIVE'}.`);
    } catch (err: unknown) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === cust.id ? { ...c, is_active: !newStatus } : c))
      );
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      showToast(`Unable to update status: ${msg}`);
    }
  };

  const handleOpenEdit = (cust: Customer) => {
    setSelectedCustomer(cust);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenDetails = (cust: Customer) => {
    setSelectedCustomer(cust);
    setIsDetailsOpen(true);
  };

  // Status Counts
  const statusCounts = useMemo(() => {
    const active = customers.filter((c) => c.is_active).length;
    const inactive = customers.length - active;
    return { all: customers.length, active, inactive };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      if (statusFilter === 'active' && !cust.is_active) return false;
      if (statusFilter === 'inactive' && cust.is_active) return false;
      return true;
    });
  }, [customers, statusFilter]);

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
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Customer Directory
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
              Guest profile directory, visit analytics, reservation counts & dining history
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Stats Badges */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
            <span>{statusCounts.all} Total Guests</span>
            <span>•</span>
            <span className="text-emerald-700">{statusCounts.active} Active</span>
            <span>•</span>
            <span className="text-slate-500">{statusCounts.inactive} Inactive</span>
          </div>

          <button
            onClick={fetchCustomersData}
            className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-lg transition bg-white cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="py-1.5 px-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* SEARCH & FILTER TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-xl shadow-xs">
        {/* Search Bar */}
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone number, or email..."
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

        {/* Status Pills & View Mode Switcher */}
        <div className="flex items-center space-x-2 text-xs font-bold">
          {/* Status Filter Pills */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer transition ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              All ({statusCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer transition ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Active ({statusCounts.active})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer transition ${
                statusFilter === 'inactive'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Inactive ({statusCounts.inactive})
            </button>
          </div>

          {/* View Switcher */}
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

      {/* MAIN CUSTOMERS LIST / TABLE */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-600" />
          <span className="text-xs text-slate-500 font-medium">Loading customer profiles...</span>
        </div>
      ) : filteredCustomers.length > 0 ? (
        viewMode === 'table' ? (
          /* HIGH DENSITY WORKSTATION TABLE */
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-600 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3 text-center">Visits</th>
                    <th className="py-2.5 px-3 text-center">Reservations</th>
                    <th className="py-2.5 px-3">Last Visit</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                  {filteredCustomers.map((cust) => (
                    <tr
                      key={cust.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        !cust.is_active ? 'bg-slate-50/50 text-slate-400' : ''
                      }`}
                    >
                      {/* Name & Avatar Initial */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs">
                            {cust.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 text-sm block">
                              {cust.name}
                            </span>
                            {cust.notes && (
                              <span className="text-[10px] text-slate-500 font-medium line-clamp-1">
                                {cust.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-900">
                        {cust.phone || '—'}
                      </td>

                      {/* Email */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                        {cust.email || '—'}
                      </td>

                      {/* Total Visits */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-black text-slate-900 text-sm">
                        {cust.total_visits_count || 0}
                      </td>

                      {/* Total Reservations */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-bold text-slate-700">
                        {cust.total_reservations_count || 0}
                      </td>

                      {/* Last Visit */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                        {formatDate(cust.last_visit_date)}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleCustomerStatus(cust)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                            cust.is_active
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                          title="Click to toggle status"
                        >
                          {cust.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleOpenDetails(cust)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition"
                            title="View History & Bills"
                          >
                            <Eye className="w-3 h-3 text-slate-600" />
                            <span>History</span>
                          </button>

                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition shadow-2xs"
                            title="Edit Profile"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" />
                            <span>Edit</span>
                          </button>
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
            {filteredCustomers.map((cust) => (
              <div
                key={cust.id}
                className={`bg-white border rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition-all shadow-xs ${
                  !cust.is_active ? 'border-slate-200 bg-slate-50/50 opacity-70' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-lg bg-red-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                      {cust.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight line-clamp-1">
                        {cust.name}
                      </h3>
                      {cust.phone && (
                        <p className="text-xs font-mono font-bold text-slate-600 mt-0.5">
                          {cust.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleCustomerStatus(cust)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                      cust.is_active
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {cust.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {cust.email && (
                    <div className="flex items-center space-x-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{cust.email}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                    <span className="text-slate-500 font-semibold">Total Visits</span>
                    <span className="font-extrabold text-slate-900">{cust.total_visits_count || 0}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold">Reservations</span>
                    <span className="font-bold text-slate-800">{cust.total_reservations_count || 0}</span>
                  </div>

                  {cust.last_visit_date && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-semibold">Last Visit</span>
                      <span className="font-medium text-slate-700">{formatDate(cust.last_visit_date)}</span>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200 text-xs">
                  <button
                    onClick={() => handleOpenDetails(cust)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>History</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(cust)}
                    className="py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 rounded-lg flex items-center justify-center space-x-1 transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* EMPTY STATE */
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-2 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No customers found</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            {searchQuery
              ? `No guest profiles matched "${searchQuery}".`
              : 'Add your first customer profile to start tracking reservations and dining history.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCustomer}
        customer={selectedCustomer}
      />

      <CustomerDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        customer={selectedCustomer}
      />
    </div>
  );
}
