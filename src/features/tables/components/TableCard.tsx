'use client';

import React from 'react';
import { Link } from '@/lib/navigation';
import { TableWithSession, TableStatus } from '@/types/tables';
import { ShoppingCart, FileText, Printer, Eye, Info, RotateCcw } from 'lucide-react';

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

interface TableCardProps {
  table: TableWithSession;
  onOpenTable: (table: TableWithSession) => void;
  onShowReservation?: (table: TableWithSession) => void;
  onResetTable?: (table: TableWithSession) => void;
}

export const TableCard = React.memo(function TableCard({ table, onOpenTable, onShowReservation, onResetTable }: TableCardProps) {
  const { id, table_number, capacity, status, active_session, active_order } = table;

  // Derive robust effective status
  const rawStatus = (status as string) || '';
  const computedStatus: TableStatus =
    rawStatus === 'bill_requested' || rawStatus === 'printed'
      ? 'bill_requested'
      : rawStatus === 'payment_pending' || rawStatus === 'paid'
      ? 'payment_pending'
      : rawStatus === 'reserved'
      ? 'reserved'
      : active_session || rawStatus === 'occupied' || rawStatus === 'running'
      ? 'occupied'
      : 'available';

  // Exact status color mapping matching user legend image
  const statusStyles: Record<
    TableStatus,
    { bg: string; border: string; textColor: string }
  > = {
    available: {
      bg: 'bg-[#f1f5f9] hover:bg-slate-200',
      border: 'border-2 border-slate-300',
      textColor: 'text-slate-800',
    },
    occupied: {
      bg: 'bg-[#e0f2fe] hover:bg-[#bae6fd]',
      border: 'border-2 border-[#38bdf8]',
      textColor: 'text-slate-900',
    },
    bill_requested: {
      bg: 'bg-[#dcfce7] hover:bg-[#bbf7d0]',
      border: 'border-2 border-[#4ade80]',
      textColor: 'text-slate-900',
    },
    payment_pending: {
      bg: 'bg-[#ffedd5] hover:bg-[#fed7aa]',
      border: 'border-2 border-[#fb923c]',
      textColor: 'text-slate-900',
    },
    reserved: {
      bg: 'bg-[#fef9c3] hover:bg-[#fef08a]',
      border: 'border-2 border-[#facc15]',
      textColor: 'text-slate-900',
    },
    out_of_service: {
      bg: 'bg-slate-100',
      border: 'border-2 border-slate-300 opacity-60',
      textColor: 'text-slate-400',
    },
  };

  const style = statusStyles[computedStatus] || statusStyles.available;
  const orderAmount = active_order?.total_amount ?? 0;

  // Format table name cleanly like Petpooja (e.g. T-01 -> Table 1, VIP-1 -> Table VIP-1)
  const cleanName = table_number.startsWith('T-')
    ? `Table ${table_number.replace(/^T-0*/i, '')}`
    : table_number.startsWith('Table')
    ? table_number
    : `Table ${table_number}`;

  return (
    <div className="flex flex-col items-center w-full group">
      {/* 1:1 Squircle Table Tile (Petpooja Exact Style) */}
      <div
        onClick={() => {
          if (computedStatus === 'available') {
            onOpenTable(table);
          }
        }}
        className={`w-full aspect-square ${style.bg} ${style.border} rounded-2xl p-2 flex flex-col items-center justify-between text-center transition-all duration-150 cursor-pointer select-none relative shadow-2xs group-hover:shadow-xs group-hover:scale-[1.02] overflow-hidden`}
      >
        {/* Top Right Hotkey Badge (T+1, T+2) */}
        <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
          <span className="px-1.5 py-0.5 bg-slate-900 text-amber-300 font-mono text-[9px] font-black rounded-md border border-slate-800 shadow-2xs">
            T+{table_number.replace(/[^0-9]/g, '') || table_number}
          </span>
        </div>

        {/* Center Content Wrapper */}
        <div className="flex-1 w-full flex flex-col items-center justify-center pt-2">
          {/* Table Title (e.g. Table 1, Table 2, Table VIP-1) */}
          <span className={`text-xs sm:text-sm font-black tracking-tight ${style.textColor}`}>
            {cleanName}
          </span>

          {/* Sub-label Container (Order total or capacity or invisible spacer) */}
          <div className="h-4 flex items-center justify-center mt-1">
            {orderAmount > 0 ? (
              <div className="text-[10px] font-black text-slate-900 bg-white/90 px-1.5 py-0.2 rounded-md border border-slate-200 shadow-2xs">
                {formatCurrency(orderAmount)}
              </div>
            ) : capacity && computedStatus === 'available' ? (
              <span className="text-[10px] text-slate-500 font-bold">
                {capacity} Seats
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Floating Action Buttons Badge (Fixed h-7 Container for 100% Baseline Symmetry) */}
      <div className="h-7 flex items-center justify-center space-x-1 -mt-3.5 z-10">
        {computedStatus === 'occupied' ? (
          <div className="flex items-center space-x-1 bg-white border border-slate-200 shadow-xs rounded-lg p-0.5">
            <Link
              href={`/pos/order?tableId=${id}`}
              className="w-6 h-6 hover:bg-slate-100 text-slate-700 rounded-md transition-all flex items-center justify-center"
              title="Add Items / POS Order"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-slate-700" />
            </Link>
            <Link
              href={`/pos/billing?tableId=${id}`}
              className="w-6 h-6 hover:bg-slate-100 text-emerald-700 rounded-md transition-all flex items-center justify-center"
              title="Open Billing"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
            </Link>
            {onResetTable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onResetTable(table);
                }}
                className="w-6 h-6 hover:bg-rose-50 text-rose-600 rounded-md transition-all flex items-center justify-center cursor-pointer"
                title="Mark Table Blank (Clear Session)"
              >
                <RotateCcw className="w-3 h-3 text-rose-600" />
              </button>
            )}
          </div>
        ) : computedStatus === 'bill_requested' || computedStatus === 'payment_pending' ? (
          <div className="flex items-center space-x-1 bg-white border border-slate-200 shadow-xs rounded-lg p-0.5">
            <Link
              href={`/pos/billing?tableId=${id}`}
              className="w-6 h-6 hover:bg-slate-100 text-emerald-700 rounded-md transition-all flex items-center justify-center"
              title="Open Bill & Pay"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700" />
            </Link>
            <Link
              href={`/pos/order?tableId=${id}`}
              className="w-6 h-6 hover:bg-slate-100 text-slate-700 rounded-md transition-all flex items-center justify-center"
              title="View Order"
            >
              <Eye className="w-3.5 h-3.5 text-slate-700" />
            </Link>
          </div>
        ) : computedStatus === 'reserved' ? (
          <button
            type="button"
            onClick={() => onShowReservation?.(table)}
            className="w-7 h-7 bg-white hover:bg-slate-50 border border-blue-200 text-blue-700 rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center"
            title="Reservation Info"
          >
            <Info className="w-3.5 h-3.5 text-blue-600" />
          </button>
        ) : (
          /* Invisible placeholder reserving exact height so all cards align on exact baseline */
          <div className="w-7 h-7 opacity-0 pointer-events-none" />
        )}
      </div>
    </div>
  );
});
