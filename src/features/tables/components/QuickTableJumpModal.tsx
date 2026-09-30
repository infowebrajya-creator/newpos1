'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TableWithSession } from '@/types/tables';
import { getTablesWithActiveSessions } from '@/services/tables/tableService';
import {
  UtensilsCrossed,
  Search,
  X,
  ArrowRight,
  Zap,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface QuickTableJumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTable?: (table: TableWithSession) => void;
}

export function QuickTableJumpModal({ isOpen, onClose, onSelectTable }: QuickTableJumpModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tables, setTables] = useState<TableWithSession[]>([]);
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch tables when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      loadTables();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const loadTables = async () => {
    try {
      setLoading(true);
      const data = await getTablesWithActiveSessions();
      setTables(data);
    } catch (err) {
      console.error('Failed to fetch tables for quick jump:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter tables based on user search query (e.g., "1", "12", "Bar", "Main")
  const filteredTables = tables.filter((t) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    const num = t.table_number.toLowerCase();
    const floor = t.floor_name?.toLowerCase() || '';
    const status = t.status?.toLowerCase() || '';

    // Extract numeric part (e.g., T-01 -> 1, Table 12 -> 12)
    const cleanNum = num.replace(/[^0-9]/g, '');

    return (
      num.includes(q) ||
      cleanNum === q ||
      cleanNum.startsWith(q) ||
      floor.includes(q) ||
      status.includes(q)
    );
  });

  // Keep selected index valid
  useEffect(() => {
    if (selectedIndex >= filteredTables.length) {
      setSelectedIndex(Math.max(0, filteredTables.length - 1));
    }
  }, [filteredTables.length, selectedIndex]);

  const handleNavigateToTable = (table: TableWithSession) => {
    onClose();
    if (onSelectTable) {
      onSelectTable(table);
    } else {
      router.push(`/pos/order?tableId=${table.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredTables.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredTables.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTables[selectedIndex]) {
        handleNavigateToTable(filteredTables[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Top Header & Fast Input Bar */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 text-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-red-600 text-white shadow-xs">
                <UtensilsCrossed className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-black tracking-tight flex items-center space-x-2">
                  <span>Quick Table Jump</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold border border-red-500/30">
                    [T + Number]
                  </span>
                </h2>
                <p className="text-[11px] text-slate-300">
                  Type table # (e.g. 1, 12, Bar) & press Enter to open workstation
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type Table # (e.g., 1, 14, T-02, Bar)..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-inner"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400 animate-pulse flex items-center justify-center space-x-2">
              <Zap className="w-4 h-4 text-amber-500 animate-spin" />
              <span>Loading table floor plan...</span>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-1">
              <p className="text-xs font-bold">No tables found matching "{query}"</p>
              <p className="text-[11px] text-slate-400">Try entering digits like 1, 2, 5 or section names</p>
            </div>
          ) : (
            filteredTables.map((table, idx) => {
              const isSelected = idx === selectedIndex;
              const isOccupied = table.active_session || table.status === 'occupied';
              const cleanName = table.table_number.startsWith('T-')
                ? `Table ${table.table_number.replace(/^T-0*/i, '')}`
                : table.table_number;

              return (
                <div
                  key={table.id}
                  onClick={() => handleNavigateToTable(table)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'bg-red-50 border border-red-200 shadow-2xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shadow-2xs ${
                        isOccupied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}
                    >
                      {table.table_number.replace(/[^0-9]/g, '') || table.table_number}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {cleanName}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {table.floor_name || 'Main Hall'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] mt-0.5">
                        {isOccupied ? (
                          <span className="text-emerald-700 font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active Session ({table.active_session?.guest_count || 1} Guests)</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">
                            Vacant (Cap: {table.capacity || 4})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isSelected && (
                      <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-black rounded-lg flex items-center space-x-1 shadow-2xs">
                        <span>OPEN</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Hotkey Cheatsheet */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-bold">
          <div className="flex items-center space-x-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] shadow-2xs">↑↓</kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] shadow-2xs">↵ Enter</kbd>{' '}
              Select
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] shadow-2xs">Esc</kbd>{' '}
              Close
            </span>
          </div>

          <span className="text-slate-400 text-[10px]">WebRajya 0-Lag POS</span>
        </div>
      </div>
    </div>
  );
}
