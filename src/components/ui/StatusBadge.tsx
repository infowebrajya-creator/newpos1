import React from 'react';

export type POSStatusType =
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'payment_pending'
  | 'new'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'paid'
  | 'voided'
  | 'low_stock'
  | 'out_of_stock'
  | 'active'
  | 'inactive'
  | 'draft'
  | 'ordered'
  | 'received';

interface StatusBadgeProps {
  status: POSStatusType | string;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; border: string; text: string; dot: string }
> = {
  available: {
    label: 'AVAILABLE',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  occupied: {
    label: 'OCCUPIED',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  reserved: {
    label: 'RESERVED',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  bill_requested: {
    label: 'BILL REQUESTED',
    bg: 'bg-indigo-500/20',
    border: 'border-indigo-500/40',
    text: 'text-indigo-300',
    dot: 'bg-indigo-400',
  },
  out_of_service: {
    label: 'OUT OF SERVICE',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    text: 'text-rose-400',
    dot: 'bg-rose-500',
  },
  payment_pending: {
    label: 'PAYMENT PENDING',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    dot: 'bg-purple-400',
  },
  new: {
    label: 'NEW KOT',
    bg: 'bg-indigo-500/15',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    dot: 'bg-indigo-400',
  },
  preparing: {
    label: 'PREPARING',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  ready: {
    label: 'READY TO SERVE',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    dot: 'bg-cyan-400',
  },
  completed: {
    label: 'COMPLETED',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  paid: {
    label: 'PAID',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  cancelled: {
    label: 'CANCELLED',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
  },
  voided: {
    label: 'VOIDED',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
  },
  low_stock: {
    label: 'LOW STOCK',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  out_of_stock: {
    label: 'OUT OF STOCK',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
  },
  active: {
    label: 'ACTIVE',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  inactive: {
    label: 'INACTIVE',
    bg: 'bg-slate-800',
    border: 'border-slate-700',
    text: 'text-slate-400',
    dot: 'bg-slate-500',
  },
  draft: {
    label: 'DRAFT',
    bg: 'bg-slate-800',
    border: 'border-slate-700',
    text: 'text-slate-300',
    dot: 'bg-slate-400',
  },
  ordered: {
    label: 'ORDERED',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  received: {
    label: 'RECEIVED',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
};

export function StatusBadge({
  status,
  label,
  size = 'md',
  pulse = false,
  className = '',
}: StatusBadgeProps) {
  const normKey = (status || '').toString().toLowerCase();
  const config = STATUS_CONFIG[normKey] || {
    label: label || normKey.toUpperCase(),
    bg: 'bg-slate-800',
    border: 'border-slate-700',
    text: 'text-slate-300',
    dot: 'bg-slate-400',
  };

  const textLabel = label || config.label;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-extrabold tracking-wide uppercase border ${config.bg} ${config.border} ${config.text} ${sizeClasses} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.dot} ${pulse ? 'animate-pulse' : ''}`}
      />
      <span>{textLabel}</span>
    </span>
  );
}
