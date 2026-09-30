'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KitchenOrderView, KOTStatus } from '@/types/kitchen';
import { getKitchenOrders, updateKitchenStatus } from '@/services/kitchen/kitchenService';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { KotPrintDocument } from '@/types/printing';
import { buildKotPrintDocument } from '@/services/printing/printDocumentService';
import { PrintPreviewModal } from '@/features/printing/components/PrintPreviewModal';
import { PrinterSettingsModal } from '@/features/printing/components/PrinterSettingsModal';
import {
  ChefHat,
  Clock,
  RefreshCw,
  Play,
  CheckCircle2,
  CheckCheck,
  Printer,
  Radio,
  Sparkles,
  Columns,
  Grid,
} from 'lucide-react';

interface KitchenDisplayViewProps {
  initialOrders?: KitchenOrderView[];
}

export function KitchenDisplayView({ initialOrders = [] }: KitchenDisplayViewProps) {
  const [orders, setOrders] = useState<KitchenOrderView[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<KOTStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'board' | 'grid'>('board');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingKotId, setUpdatingKotId] = useState<string | null>(null);

  // Printing State
  const [activeKotDoc, setActiveKotDoc] = useState<KotPrintDocument | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  const handlePrintKot = async (kotId: string, isReprint: boolean = false) => {
    try {
      const doc = await buildKotPrintDocument(kotId, isReprint);
      setActiveKotDoc(doc);
      setIsPrintModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      alert(`Unable to prepare KOT print document: ${msg}`);
    }
  };

  const fetchKots = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await getKitchenOrders();
      setOrders(data);
    } catch {
      // Keep existing state if error
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Realtime Supabase listener
  useEffect(() => {
    if (initialOrders.length === 0) {
      fetchKots();
    }

    const supabase = createClient();
    const channel = supabase
      .channel('kots-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kots' },
        () => {
          fetchKots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchKots, initialOrders.length]);

  const handleStatusChange = async (kotId: string, nextStatus: KOTStatus) => {
    try {
      setUpdatingKotId(kotId);
      await updateKitchenStatus(kotId, nextStatus);
      await fetchKots();
    } catch {
      alert('Unable to update KOT status. Please try again.');
    } finally {
      setUpdatingKotId(null);
    }
  };

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

  // Group KOTs by status for 4-column Kitchen Board
  const kotsByStatus = useMemo(() => {
    const groups: Record<KOTStatus, KitchenOrderView[]> = {
      new: [],
      preparing: [],
      ready: [],
      completed: [],
      cancelled: [],
    };

    orders.forEach((o) => {
      if (groups[o.status]) {
        groups[o.status].push(o);
      } else {
        groups.new.push(o);
      }
    });

    return groups;
  }, [orders]);

  // Filtered KOTs for Grid mode
  const filteredGridKots = useMemo(() => {
    if (activeTab === 'all') {
      return orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
    }
    return orders.filter((o) => o.status === activeTab);
  }, [orders, activeTab]);

  // Render individual high-visibility KOT Ticket Card
  const renderKotTicketCard = (kot: KitchenOrderView) => {
    const isUpdating = updatingKotId === kot.id;

    return (
      <div
        key={kot.id}
        className={`bg-white border ${
          kot.status === 'new'
            ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20'
            : kot.status === 'preparing'
            ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20'
            : kot.status === 'ready'
            ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
            : 'border-slate-200'
        } rounded-xl overflow-hidden flex flex-col justify-between transition-all`}
      >
        {/* Ticket Header: KOT #, TABLE #, Time */}
        <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black text-slate-900 tracking-tight">
                KOT #{kot.kot_number}
              </span>
              <span className="text-xs font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded uppercase">
                TABLE {kot.table_number}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatTime(kot.created_at)}</span>
              <span>•</span>
              <span>Round #{kot.round_number || 1}</span>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => handlePrintKot(kot.id, false)}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition cursor-pointer"
              title="Print KOT Ticket"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ticket Items List: High Contrast & Large Readability */}
        <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-64 bg-white">
          {kot.items.map((item) => (
            <div
              key={item.id}
              className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-start space-x-2.5"
            >
              <div className="bg-slate-900 text-white font-black text-base px-2.5 py-0.5 rounded shrink-0 shadow-sm">
                {item.quantity}×
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="text-sm font-bold text-slate-900 leading-tight">
                  {item.item_name}
                </div>
                {item.item_note && (
                  <div className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-block">
                    Note: {item.item_note}
                  </div>
                )}
                {item.is_complimentary && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">
                    COMPLIMENTARY
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Button: Fast 1-Tap Status Change */}
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          {kot.status === 'new' && (
            <button
              disabled={isUpdating}
              onClick={() => handleStatusChange(kot.id, 'preparing')}
              className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1.5 shadow transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START PREPARING</span>
            </button>
          )}

          {kot.status === 'preparing' && (
            <button
              disabled={isUpdating}
              onClick={() => handleStatusChange(kot.id, 'ready')}
              className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1.5 shadow transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>MARK READY</span>
            </button>
          )}

          {kot.status === 'ready' && (
            <button
              disabled={isUpdating}
              onClick={() => handleStatusChange(kot.id, 'completed')}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1.5 shadow transition-all cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 stroke-[2.5]" />
              <span>MARK SERVED / DONE</span>
            </button>
          )}

          {kot.status === 'completed' && (
            <div className="w-full py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs uppercase tracking-wider rounded-lg text-center flex items-center justify-center space-x-1.5">
              <CheckCheck className="w-3.5 h-3.5" />
              <span>SERVED & COMPLETED</span>
            </div>
          )}

          {kot.status === 'cancelled' && (
            <div className="w-full py-2 bg-red-50 border border-red-200 text-red-700 font-bold text-xs uppercase tracking-wider rounded-lg text-center">
              CANCELLED TICKET
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 bg-white p-3.5 rounded-xl border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Kitchen Display System (KDS)
              </h1>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                <Radio className="w-3 h-3 animate-pulse text-emerald-600" />
                <span>REALTIME LIVE</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live KOT ticket workflow for kitchen staff & chefs
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-100 border border-slate-200 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                viewMode === 'board' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>4 Columns</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsModalOpen(true)}
            className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Printer
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchKots}
            isLoading={isRefreshing}
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* VIEW MODE 1: 4-COLUMN KITCHEN KANBAN BOARD (NEW, PREPARING, READY, COMPLETED) */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {/* Column 1: NEW KOTs */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 min-h-[600px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 px-1">
              <span className="text-xs font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                NEW TICKETS
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                {kotsByStatus.new.length}
              </span>
            </div>

            {kotsByStatus.new.length > 0 ? (
              <div className="space-y-3">
                {kotsByStatus.new.map((kot) => renderKotTicketCard(kot))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs font-medium italic border border-dashed border-slate-200 rounded-lg">
                No new KOT tickets
              </div>
            )}
          </div>

          {/* Column 2: PREPARING KOTs */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 min-h-[600px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 px-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                PREPARING
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                {kotsByStatus.preparing.length}
              </span>
            </div>

            {kotsByStatus.preparing.length > 0 ? (
              <div className="space-y-3">
                {kotsByStatus.preparing.map((kot) => renderKotTicketCard(kot))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs font-medium italic border border-dashed border-slate-200 rounded-lg">
                No preparing tickets
              </div>
            )}
          </div>

          {/* Column 3: READY KOTs */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 min-h-[600px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 px-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                READY TO SERVE
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                {kotsByStatus.ready.length}
              </span>
            </div>

            {kotsByStatus.ready.length > 0 ? (
              <div className="space-y-3">
                {kotsByStatus.ready.map((kot) => renderKotTicketCard(kot))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs font-medium italic border border-dashed border-slate-200 rounded-lg">
                No ready tickets
              </div>
            )}
          </div>

          {/* Column 4: COMPLETED KOTs */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 min-h-[600px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 px-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                COMPLETED
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800 border border-slate-300">
                {kotsByStatus.completed.length}
              </span>
            </div>

            {kotsByStatus.completed.length > 0 ? (
              <div className="space-y-3">
                {kotsByStatus.completed.slice(0, 10).map((kot) => renderKotTicketCard(kot))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-xs font-medium italic border border-dashed border-slate-200 rounded-lg">
                No completed tickets
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: TAB FILTERED GRID VIEW */
        <div className="space-y-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              ACTIVE ({kotsByStatus.new.length + kotsByStatus.preparing.length + kotsByStatus.ready.length})
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'new'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              NEW ({kotsByStatus.new.length})
            </button>
            <button
              onClick={() => setActiveTab('preparing')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'preparing'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              PREPARING ({kotsByStatus.preparing.length})
            </button>
            <button
              onClick={() => setActiveTab('ready')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'ready'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              READY ({kotsByStatus.ready.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              COMPLETED ({kotsByStatus.completed.length})
            </button>
          </div>

          {filteredGridKots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredGridKots.map((kot) => renderKotTicketCard(kot))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 font-medium italic">
              No KOT tickets found for selected status filter.
            </div>
          )}
        </div>
      )}

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        kotDocument={activeKotDoc}
        onPrinted={() => {}}
      />

      {/* Printer Settings Modal */}
      <PrinterSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}
