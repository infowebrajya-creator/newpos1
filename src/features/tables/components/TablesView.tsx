'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Floor, TableWithSession, TableStatus } from '@/types/tables';
import { getFloors, getTablesWithActiveSessions, openTableSession } from '@/services/tables/tableService';
import { TableCard } from '@/features/tables/components/TableCard';
import { QuickTableJumpModal } from '@/features/tables/components/QuickTableJumpModal';
import { RefreshCw, UtensilsCrossed, Search, Layers, X, CalendarCheck, Users, Clock, PlusCircle, Zap, Sparkles, QrCode, Smartphone, CheckCircle2, ArrowRight } from 'lucide-react';

interface TablesViewProps {
  initialFloors?: Floor[];
  initialTables?: TableWithSession[];
}

export function TablesView({ initialFloors = [], initialTables = [] }: TablesViewProps) {
  const router = useRouter();
  const [floors, setFloors] = useState<Floor[]>(initialFloors);
  const [tables, setTables] = useState<TableWithSession[]>(initialTables);
  const [selectedFloorId, setSelectedFloorId] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<TableStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTableForReservation, setSelectedTableForReservation] = useState<TableWithSession | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isJumpModalOpen, setIsJumpModalOpen] = useState<boolean>(false);
  const [isUpcomingModalOpen, setIsUpcomingModalOpen] = useState<boolean>(false);

  const fetchLatestTablesData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [latestFloors, latestTables] = await Promise.all([
        getFloors(),
        getTablesWithActiveSessions(),
      ]);
      setFloors(latestFloors);
      setTables(latestTables);
    } catch {
      // Keep existing state if error
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (initialTables.length === 0) {
      fetchLatestTablesData();
    }
  }, [initialTables.length, fetchLatestTablesData]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: tables.length,
      available: 0,
      occupied: 0,
      bill_requested: 0,
      payment_pending: 0,
      reserved: 0,
      out_of_service: 0,
    };

    tables.forEach((t) => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });

    return counts;
  }, [tables]);

  const filteredTables = useMemo(() => {
    const list = tables.filter((table) => {
      const matchFloor = selectedFloorId === 'all' || table.floor_id === selectedFloorId;
      const matchStatus = selectedStatus === 'all' || table.status === selectedStatus;

      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        table.table_number.toLowerCase().includes(q) ||
        (table.floor_name && table.floor_name.toLowerCase().includes(q));

      return matchFloor && matchStatus && matchSearch;
    });

    // Sort tables naturally in sequence (Table 1, Table 2, Table 3...)
    return list.sort((a, b) => {
      const numA = parseInt(a.table_number.replace(/[^0-9]/g, ''), 10);
      const numB = parseInt(b.table_number.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return a.table_number.localeCompare(b.table_number, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [tables, selectedFloorId, selectedStatus, searchQuery]);

  // Instant zero-lag table opening with optimistic UI + fast client router
  const handleDirectOpenTable = async (table: TableWithSession) => {
    try {
      // 1. Optimistic state update in 0 milliseconds
      setTables((prevTables) =>
        prevTables.map((t) => (t.id === table.id ? { ...t, status: 'occupied' } : t))
      );

      // 2. Open table session via fast API route
      const res = await fetch('/api/tables/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: table.id, guestCount: 2 }),
      });

      const data = await res.json();
      const sessionId = data?.sessionId || table.id;

      // 3. Fast client-side navigation without browser hard reload
      router.push(`/pos/order?tableId=${table.id}&sessionId=${sessionId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to open table.';
      alert(`Table opening error: ${msg}`);
      fetchLatestTablesData();
    }
  };

  const handleResetTable = async (table: TableWithSession) => {
    if (!confirm(`Are you sure you want to mark ${table.table_number} as Blank (clear active session)?`)) return;

    try {
      // 1. Optimistic update in 0 milliseconds
      setTables((prevTables) =>
        prevTables.map((t) =>
          t.id === table.id
            ? { ...t, status: 'available', active_session: null, active_order: null }
            : t
        )
      );

      // 2. Call server reset API
      await fetch('/api/tables/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: table.id }),
      });
    } catch {
      fetchLatestTablesData();
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 max-w-[1700px] mx-auto pb-6">
      {/* 1. TOP HEADER ROW: "Table View" Title + Top Right Actions (Refresh, Delivery, Take Away) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Table View
          </h1>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {tables.length} Total Tables
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold">
          <button
            onClick={fetchLatestTablesData}
            disabled={isRefreshing}
            className="p-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-full flex items-center justify-center transition cursor-pointer shadow-2xs"
            title="Refresh Floor Plan"
          >
            <RefreshCw className={`w-4 h-4 text-slate-700 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/pos/order?type=delivery"
            className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-2xs transition flex items-center justify-center cursor-pointer"
          >
            <span>Delivery</span>
          </Link>

          <Link
            href="/pos/order?type=pickup"
            className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-2xs transition flex items-center justify-center cursor-pointer"
          >
            <span>Take Away</span>
          </Link>
        </div>
      </div>

      {/* 2. SECOND TOOLBAR: Action Pills + Toggle + Status Legend + Floor Plan Dropdown */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs">
        {/* Left Action Pills */}
        <div className="flex items-center space-x-2 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setIsJumpModalOpen(true)}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold rounded-xl shadow-2xs flex items-center space-x-1.5 transition cursor-pointer border border-slate-800"
            title="Press T anytime on keyboard to jump to any table"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick Table Jump</span>
            <span className="ml-1 text-[9px] font-mono bg-slate-800 text-amber-300 px-1 py-0.2 rounded border border-slate-700">T</span>
          </button>

          <button
            type="button"
            onClick={() => setIsUpcomingModalOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500/10 to-amber-500/10 hover:from-orange-500/20 hover:to-amber-500/20 text-orange-950 font-extrabold rounded-xl shadow-2xs flex items-center space-x-1.5 transition cursor-pointer border border-orange-200/80 active:scale-95"
            title="Upcoming Feature: Guest Mobile QR Table Self-Ordering"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
            <span className="font-black text-slate-900">Contactless</span>
            <span className="px-1.5 py-0.2 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider shadow-2xs">
              UPCOMING
            </span>
          </button>
        </div>

        {/* Center Toggle & Visual Status Legend (Matching Image 1 Colors) */}
        <div className="flex items-center space-x-3 text-[11px] font-extrabold text-slate-800 overflow-x-auto scrollbar-none py-0.5">
          <div className="flex items-center space-x-1.5 bg-slate-200/80 px-2.5 py-1 rounded-full text-slate-700 shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-[#94a3b8]" />
            <span>Move KOT/ Items</span>
          </div>

          <span className="flex items-center space-x-1.5 shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-[#cbd5e1] border border-slate-400" />
            <span>Blank Table</span>
          </span>
          <span className="flex items-center space-x-1.5 shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-[#38bdf8] border border-[#0284c7]" />
            <span>Running Table</span>
          </span>
          <span className="flex items-center space-x-1.5 shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-[#4ade80] border border-[#16a34a]" />
            <span>Printed Table</span>
          </span>
          <span className="flex items-center space-x-1.5 shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-[#ffedd5] border-2 border-[#f97316]" />
            <span>Paid Table</span>
          </span>
          <span className="flex items-center space-x-1.5 shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-[#facc15] border border-[#ca8a04]" />
            <span>Running KOT Table</span>
          </span>
        </div>

        {/* Right Floor Plan Dropdown */}
        <div className="flex items-center space-x-2 text-xs font-bold shrink-0">
          <span className="text-slate-600 font-extrabold">Floor Plan</span>
          <select className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-extrabold focus:outline-none shadow-2xs cursor-pointer">
            <option>Default Layout</option>
            <option>Main Dining</option>
            <option>VIP Lounge</option>
          </select>
        </div>
      </div>

      {/* 3. DENSE FLOOR SECTIONS & RECTANGULAR TABLE BLOCKS */}
      {tables.length === 0 ? (
        /* Empty State Banner */
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3 my-6 shadow-2xs">
          <div className="w-16 h-16 bg-slate-50 text-slate-500 rounded-2xl flex items-center justify-center mx-auto border border-slate-200 shadow-2xs">
            <Layers className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-black text-slate-900">No Restaurant Tables Found</h3>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Your database currently has 0 active tables configured. Run the SQL initialization script in your Supabase SQL Editor to load your restaurant floor plan.
            </p>
          </div>
        </div>
      ) : floors.length > 0 ? (
        <div className="space-y-4 pt-1">
          {floors.map((floor) => {
            const floorTables = filteredTables.filter((t) => t.floor_id === floor.id);
            if (floorTables.length === 0 && selectedFloorId !== 'all') return null;

            return (
              <div key={floor.id} className="space-y-2 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                {/* Section Heading (e.g. Ground Floor, Basement, Party Hall) */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <span>{floor.name}</span>
                    <span className="text-xs font-bold text-slate-500">({floorTables.length} tables)</span>
                  </h3>
                </div>

                {/* Dense Grid of 1:1 Square Table Blocks (Petpooja Style) */}
                {floorTables.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-11 gap-2.5 sm:gap-3">
                    {floorTables.map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        onOpenTable={(t) => handleDirectOpenTable(t)}
                        onShowReservation={(t) => setSelectedTableForReservation(t)}
                        onResetTable={(t) => handleResetTable(t)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400 font-semibold italic">
                    No tables configured for this section.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Fallback if floors list is pending */
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-11 gap-2.5 sm:gap-3">
          {filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onOpenTable={(t) => handleDirectOpenTable(t)}
              onShowReservation={(t) => setSelectedTableForReservation(t)}
              onResetTable={(t) => handleResetTable(t)}
            />
          ))}
        </div>
      )}



      {/* Reservation Info Modal */}
      {selectedTableForReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <CalendarCheck className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-black text-slate-900">Reservation Info</h2>
              </div>
              <button onClick={() => setSelectedTableForReservation(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200 font-semibold">
                <span className="text-slate-500">Table Number:</span>
                <span className="font-extrabold text-slate-900">{selectedTableForReservation.table_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 font-semibold">
                <span className="text-slate-500">Floor:</span>
                <span className="text-slate-800">{selectedTableForReservation.floor_name || 'Main Floor'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 font-semibold">
                <span className="text-slate-500">Capacity:</span>
                <span className="text-slate-800">{selectedTableForReservation.capacity} Seats</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTableForReservation(null)}
              className="w-full py-2 bg-slate-100 text-slate-800 font-bold text-xs rounded-lg hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Quick Table Jump Modal */}
      <QuickTableJumpModal
        isOpen={isJumpModalOpen}
        onClose={() => setIsJumpModalOpen(false)}
      />

      {/* Contactless QR Ordering Upcoming Feature Modal */}
      {isUpcomingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 p-6 text-white relative">
              <button
                type="button"
                onClick={() => setIsUpcomingModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="inline-flex items-center space-x-1.5 bg-orange-500/20 border border-orange-400/30 text-orange-300 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase mb-3">
                <Sparkles className="w-3 h-3 text-orange-400" />
                <span>Upcoming Feature (v2.0)</span>
              </div>
              <h3 className="text-xl font-black text-white flex items-center space-x-2">
                <QrCode className="w-6 h-6 text-orange-400" />
                <span>Contactless QR Table Ordering</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Empower restaurant guests to scan table QR codes, browse menus, and place orders directly from their smartphone browsers.
              </p>
            </div>

            {/* Content body */}
            <div className="p-6 space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Zero-App Mobile Self-Ordering</h4>
                    <p className="text-[11px] text-slate-600">Guests scan table QR stickers with phone cameras to view dynamic web menus without installing apps.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Instant Cashier & Kitchen KOT Sync</h4>
                    <p className="text-[11px] text-slate-600">Submitted guest orders ping cashier screen immediately and auto-print to kitchen KOT printers.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Digital Pay-At-Table</h4>
                    <p className="text-[11px] text-slate-600">Built-in UPI QR code & card payments automatically clear and close table sessions.</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col space-y-2">
                <Link
                  href="/pos/settings"
                  onClick={() => setIsUpcomingModalOpen(false)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition cursor-pointer"
                >
                  <span>View Product Roadmap in Settings</span>
                  <ArrowRight className="w-4 h-4 text-orange-400" />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsUpcomingModalOpen(false)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
