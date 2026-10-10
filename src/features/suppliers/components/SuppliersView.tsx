'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from '@/lib/navigation';
import { Supplier, CreateSupplierInput } from '@/types/purchases';
import { getSuppliers, createSupplier, updateSupplier } from '@/services/suppliers/supplierService';
import { createClient } from '@/lib/supabase/client';
import { SupplierModal } from './SupplierModal';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShoppingBag,
  UserCheck,
} from 'lucide-react';

interface SuppliersViewProps {
  initialSuppliers?: Supplier[];
}

export function SuppliersView({ initialSuppliers = [] }: SuppliersViewProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchSuppliers = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialSuppliers.length === 0) {
      fetchSuppliers();
    }
  }, [fetchSuppliers, initialSuppliers.length]);

  // Supabase Realtime Subscription for Live Updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('suppliers-workstation-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suppliers' },
        () => {
          fetchSuppliers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSuppliers]);

  const handleSaveSupplier = async (input: CreateSupplierInput) => {
    const isEditing = !!selectedSupplier;
    if (selectedSupplier) {
      await updateSupplier(selectedSupplier.id, input);
    } else {
      await createSupplier(input);
    }
    await fetchSuppliers();
    showToast(isEditing ? 'Supplier updated successfully' : 'New supplier added successfully');
  };

  const handleOpenEdit = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedSupplier(null);
    setIsModalOpen(true);
  };

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalCount = suppliers.length;
    let activeCount = 0;
    let inactiveCount = 0;
    let totalOrders = 0;

    suppliers.forEach((sup) => {
      if (sup.is_active) activeCount++;
      else inactiveCount++;
      totalOrders += sup.total_purchases_count || 0;
    });

    return {
      totalCount,
      activeCount,
      inactiveCount,
      totalOrders,
    };
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        sup.name.toLowerCase().includes(query) ||
        (sup.contact_person && sup.contact_person.toLowerCase().includes(query)) ||
        (sup.phone && sup.phone.includes(query)) ||
        (sup.email && sup.email.toLowerCase().includes(query)) ||
        (sup.gst_number && sup.gst_number.toLowerCase().includes(query));

      if (statusFilter === 'active') return matchesSearch && sup.is_active;
      if (statusFilter === 'inactive') return matchesSearch && !sup.is_active;
      return matchesSearch;
    });
  }, [suppliers, searchQuery, statusFilter]);

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
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Supplier Directory & Vendors
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
              Manage raw material vendors, master contacts, GST tax IDs, and procurement order history
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/pos/purchases">
            <Button variant="outline" size="sm" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold">
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Purchases
            </Button>
          </Link>

          <Button variant="outline" size="sm" onClick={fetchSuppliers} isLoading={isRefreshing} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="primary" size="sm" onClick={handleOpenCreate} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold">
            <Plus className="w-4 h-4 mr-1" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Suppliers"
          value={summaryMetrics.totalCount}
          subtitle="Master vendor directory"
          icon={<Building2 className="w-5 h-5 text-slate-700" />}
        />
        <StatCard
          title="Active Vendors"
          value={summaryMetrics.activeCount}
          subtitle="Available for PO placement"
          icon={<UserCheck className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Inactive Vendors"
          value={summaryMetrics.inactiveCount}
          subtitle="Archived/Deactivated"
          icon={<XCircle className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="Total POs Placed"
          value={summaryMetrics.totalOrders}
          subtitle="Across supplier base"
          icon={<ShoppingBag className="w-5 h-5 text-blue-600" />}
        />
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          {(['all', 'active', 'inactive'] as const).map((filter) => (
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
            placeholder="Search by supplier, contact, phone or GST..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 font-medium"
          />
        </div>
      </div>

      {/* Supplier Grid */}
      {filteredSuppliers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-md mx-auto shadow-sm">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900">No Suppliers Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            {searchQuery ? 'No suppliers matched your search query.' : 'Register your first vendor to start placing purchase orders.'}
          </p>
          {!searchQuery && (
            <Button onClick={handleOpenCreate} size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold">
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Supplier</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSuppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all flex flex-col justify-between shadow-sm space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-bold text-xs shrink-0">
                      {sup.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {sup.name}
                      </h3>
                      {sup.contact_person && (
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                          {sup.contact_person}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                      sup.is_active
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    {sup.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                {/* Details list */}
                <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                  {sup.phone && (
                    <div className="flex items-center space-x-2 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-900 font-medium">{sup.phone}</span>
                    </div>
                  )}

                  {sup.email && (
                    <div className="flex items-center space-x-2 text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-700 truncate">{sup.email}</span>
                    </div>
                  )}

                  {sup.gst_number && (
                    <div className="flex items-center space-x-2 text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500 font-medium">GST: </span>
                      <span className="text-slate-900 font-mono font-bold uppercase">
                        {sup.gst_number}
                      </span>
                    </div>
                  )}

                  {sup.address && (
                    <div className="flex items-start space-x-2 text-[11px] pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-slate-600 line-clamp-1 font-medium">{sup.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                <div className="flex items-center space-x-1.5 text-slate-600 font-medium text-[11px]">
                  <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-900">{sup.total_purchases_count || 0}</span>
                  <span>Orders</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(sup)}
                  className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-[11px] font-bold py-1 px-2.5"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSupplier}
        supplier={selectedSupplier}
      />
    </div>
  );
}
