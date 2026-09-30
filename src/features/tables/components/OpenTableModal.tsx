'use client';

import React, { useState } from 'react';
import { TableWithSession } from '@/types/tables';
import { openTableSession } from '@/services/tables/tableService';
import { X, Users, Minus, Plus, AlertCircle, Play } from 'lucide-react';

interface OpenTableModalProps {
  table: TableWithSession | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function OpenTableModal({ table, onClose, onSuccess }: OpenTableModalProps) {
  const [guestCount, setGuestCount] = useState<number>(2);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!table) return null;

  const maxCapacity = table.capacity || 10;
  const quickGuestPresets = [1, 2, 3, 4, 6, 8].filter((num) => num <= maxCapacity);

  const handleDecrement = () => {
    if (guestCount > 1) {
      setGuestCount(guestCount - 1);
      setError(null);
    }
  };

  const handleIncrement = () => {
    if (guestCount < maxCapacity) {
      setGuestCount(guestCount + 1);
      setError(null);
    } else {
      setError(`Guest count cannot exceed table capacity (${maxCapacity} seats).`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (guestCount < 1 || guestCount > maxCapacity) {
      setError(`Guest count must be between 1 and ${maxCapacity}.`);
      return;
    }

    try {
      setIsLoading(true);
      await openTableSession(table.id, guestCount);
      setIsLoading(false);
      onSuccess();
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : '';

      if (msg.toLowerCase().includes('occupied') || msg.toLowerCase().includes('not available')) {
        setError('This table is no longer available. Please refresh status.');
      } else if (msg.toLowerCase().includes('guest') || msg.toLowerCase().includes('capacity')) {
        setError(`Guest count must be between 1 and ${maxCapacity}.`);
      } else {
        setError(msg || 'Unable to open table session. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-sm shadow-2xs">
              {table.table_number}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                Open Table {table.table_number}
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                {table.floor_name ? `${table.floor_name} • ` : ''}Capacity: <span className="text-slate-900 font-bold">{table.capacity} Seats</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start space-x-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 text-center">
              Select Number of Guests
            </label>

            {/* Quick Touch Preset Buttons */}
            {quickGuestPresets.length > 0 && (
              <div className="grid grid-cols-6 gap-1.5">
                {quickGuestPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setGuestCount(preset);
                      setError(null);
                    }}
                    className={`py-2 rounded-lg font-black text-sm transition cursor-pointer ${
                      guestCount === preset
                        ? 'bg-red-600 text-white shadow-2xs scale-[1.02]'
                        : 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}

            {/* Stepper Controls */}
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={guestCount <= 1 || isLoading}
                className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-slate-200 active:scale-95 disabled:opacity-40 transition"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="w-24 h-14 bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900">
                  {guestCount}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">
                  {guestCount === 1 ? 'Guest' : 'Guests'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleIncrement}
                disabled={guestCount >= maxCapacity || isLoading}
                className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-slate-200 active:scale-95 disabled:opacity-40 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-1/2 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1 shadow-2xs transition active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Session</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
