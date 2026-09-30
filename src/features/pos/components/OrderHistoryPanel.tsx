'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getOrderDetailsForSession, SessionOrderDetails } from '@/services/orders/orderService';
import { KOTStatus } from '@/types/kitchen';
import { Receipt, Hash, Clock, CheckCircle2, Flame, AlertCircle, Layers } from 'lucide-react';

interface OrderHistoryPanelProps {
  tableSessionId: string;
  refreshTrigger?: number;
}

export function OrderHistoryPanel({ tableSessionId, refreshTrigger }: OrderHistoryPanelProps) {
  const [details, setDetails] = useState<SessionOrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchOrderHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getOrderDetailsForSession(tableSessionId);
      setDetails(data);
    } catch {
      // Keep state
    } finally {
      setIsLoading(false);
    }
  }, [tableSessionId]);

  useEffect(() => {
    fetchOrderHistory();
  }, [fetchOrderHistory, refreshTrigger]);

  const kotStatusConfig: Record<KOTStatus, { label: string; bg: string; text: string }> = {
    new: { label: 'NEW', bg: 'bg-blue-100 border-blue-300', text: 'text-blue-800' },
    preparing: { label: 'PREPARING', bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800' },
    ready: { label: 'READY', bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800' },
    completed: { label: 'COMPLETED', bg: 'bg-slate-100 border-slate-300', text: 'text-slate-800' },
    cancelled: { label: 'CANCELLED', bg: 'bg-red-100 border-red-300', text: 'text-red-800' },
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(isoString));
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-400">
        Loading order history...
      </div>
    );
  }

  if (!details?.order || details.rounds.length === 0) {
    return (
      <div className="p-4 bg-white border border-slate-200 rounded-xl text-center space-y-2 text-xs text-slate-400">
        <Receipt className="w-5 h-5 text-slate-400 mx-auto" />
        <p>No order rounds submitted yet for this session.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <Receipt className="w-4 h-4 text-red-600" />
          <h4 className="font-bold text-slate-900 text-sm">
            Order #{details.order.order_number || details.order.id.slice(0, 6)}
          </h4>
        </div>
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
          {details.rounds.length} {details.rounds.length === 1 ? 'Round' : 'Rounds'}
        </span>
      </div>

      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
        {details.rounds.map((round) => {
          const kot = round.kot;
          const status = (kot?.status as KOTStatus) || 'new';
          const badge = kotStatusConfig[status] || kotStatusConfig.new;

          return (
            <div
              key={round.id}
              className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-slate-900">
                  <Layers className="w-3.5 h-3.5 text-slate-600" />
                  <span>Round #{round.round_number || 1}</span>
                  {kot && (
                    <span className="text-[10px] text-slate-500 font-normal">
                      (KOT #{kot.kot_number})
                    </span>
                  )}
                </div>

                {kot ? (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg} ${badge.text}`}
                  >
                    {badge.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                    DRAFT
                  </span>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-1 pl-1">
                {round.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[11px] text-slate-800">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-red-700">×{item.quantity}</span>
                      <span>{item.item_name}</span>
                      {item.is_complimentary && (
                        <span className="text-[9px] text-amber-700 font-bold">(COMP)</span>
                      )}
                    </div>
                    {item.item_note && (
                      <span className="text-[10px] text-slate-500 italic">
                        {item.item_note}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {kot?.created_at && (
                <div className="flex items-center space-x-1 text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                  <Clock className="w-3 h-3" />
                  <span>Sent: {formatTime(kot.created_at)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
