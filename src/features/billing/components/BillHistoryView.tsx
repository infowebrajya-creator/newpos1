'use client';

import React, { useState, useMemo } from 'react';
import { DetailedBill, BillStatus } from '@/types/billing';
import { BillPrintDocument } from '@/types/printing';
import { buildBillPrintDocument } from '@/services/printing/printDocumentService';
import { PrintPreviewModal } from '@/features/printing/components/PrintPreviewModal';
import { Search, Printer, CheckCircle2 } from 'lucide-react';

const formatCurrency = (amount?: number): string => {
  if (amount == null) return '₹0';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

interface BillHistoryViewProps {
  initialBills?: DetailedBill[];
}

function getNormalizedBillStatus(b: DetailedBill): BillStatus {
  const s = (b.status || '').toString().toLowerCase().trim();
  const grand = Number(b.grand_total) || 0;
  const paid = Number(b.paid_amount) || 0;

  if (s === 'voided' || s === 'cancelled' || s === 'refunded') {
    return 'voided';
  }
  if (s === 'paid' || s === 'completed' || s === 'closed' || (grand > 0 && paid >= grand - 0.5)) {
    return 'paid';
  }
  if (s === 'partially_paid' || s === 'partial' || (paid > 0 && paid < grand - 0.5)) {
    return 'partially_paid';
  }
  return 'issued';
}

export function BillHistoryView({ initialBills = [] }: BillHistoryViewProps) {
  const [bills] = useState<DetailedBill[]>(initialBills);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'all'>('all');

  const [activePrintDoc, setActivePrintDoc] = useState<BillPrintDocument | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printMsg, setPrintMsg] = useState<string | null>(null);

  // Status counts for filter pills
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: bills.length,
      issued: 0,
      partially_paid: 0,
      paid: 0,
      voided: 0,
    };

    bills.forEach((b) => {
      const norm = getNormalizedBillStatus(b);
      if (counts[norm] !== undefined) {
        counts[norm]++;
      }
    });

    return counts;
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const norm = getNormalizedBillStatus(b);
      const matchStatus = statusFilter === 'all' || norm === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        b.bill_number.toString().toLowerCase().includes(q) ||
        norm.toLowerCase().includes(q) ||
        (b.status && b.status.toLowerCase().includes(q));

      return matchStatus && matchSearch;
    });
  }, [bills, statusFilter, searchQuery]);

  const handleReprint = async (billId: string) => {
    try {
      const doc = await buildBillPrintDocument(billId, true);
      setActivePrintDoc(doc);
      setIsPrintModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      alert(`Unable to prepare bill reprint document: ${msg}`);
    }
  };

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formatTime = (isoString?: string | null): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const utcTime = d.getTime();
      const istDate = new Date(utcTime + 5.5 * 60 * 60 * 1000);
      const day = istDate.getUTCDate().toString().padStart(2, '0');
      const month = MONTHS[istDate.getUTCMonth()];
      let hours = istDate.getUTCHours();
      const minutes = istDate.getUTCMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${day} ${month} at ${hours}:${minutes} ${ampm}`;
    } catch {
      return '';
    }
  };

  const renderStatusBadge = (b: DetailedBill) => {
    const status = getNormalizedBillStatus(b);
    switch (status) {
      case 'paid':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
            PAID
          </span>
        );
      case 'partially_paid':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-300">
            PARTIAL
          </span>
        );
      case 'issued':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
            ISSUED
          </span>
        );
      case 'voided':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-300">
            VOIDED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 bg-white p-3.5 rounded-xl border">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Bill & Settlement History</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {bills.length} Bills Total
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit restaurant bills, payment settlements & thermal receipt reprints
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Bill #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({statusCounts.all})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Paid ({statusCounts.paid || 0})
          </button>
          <button
            onClick={() => setStatusFilter('partially_paid')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              statusFilter === 'partially_paid'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Partial ({statusCounts.partially_paid || 0})
          </button>
          <button
            onClick={() => setStatusFilter('issued')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              statusFilter === 'issued'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Issued ({statusCounts.issued || 0})
          </button>
          <button
            onClick={() => setStatusFilter('voided')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              statusFilter === 'voided'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Voided ({statusCounts.voided || 0})
          </button>
        </div>
      </div>

      {printMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{printMsg}</span>
        </div>
      )}

      {/* Bill History High-Density Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Bill #</th>
                <th className="py-3 px-4">Subtotal</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Grand Total</th>
                <th className="py-3 px-4">Paid Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredBills.length > 0 ? (
                filteredBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-black text-slate-900">
                      #{b.bill_number}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {formatCurrency(b.subtotal)}
                    </td>
                    <td className="py-3 px-4 text-red-600 font-semibold">
                      - {formatCurrency(b.discount_amount)}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900">
                      {formatCurrency(b.grand_total)}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-700">
                      {formatCurrency(b.paid_amount)}
                    </td>
                    <td className="py-3 px-4">
                      {renderStatusBadge(b)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium" suppressHydrationWarning>
                      {formatTime(b.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleReprint(b.id)}
                        className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>Reprint Bill</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No generated bills match your selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        billDocument={activePrintDoc}
        onPrinted={(res) => {
          if (res.success) {
            setPrintMsg(res.message);
          }
        }}
      />
    </div>
  );
}
