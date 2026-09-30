'use client';

import React from 'react';
import { AuditLogItem } from '@/services/audit/auditService';
import { X, ShieldCheck, Clock, User, Tag, FileText, Lock } from 'lucide-react';

interface AuditEventDetailsModalProps {
  event: AuditLogItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditEventDetailsModal({ event, isOpen, onClose }: AuditEventDetailsModalProps) {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-red-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Audit Event Details</h3>
              <p className="text-[11px] text-slate-500 font-mono">ID: {event.id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Timestamp (IST)</span>
              <span className="font-mono font-semibold text-slate-900">
                {new Date(event.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Performing User</span>
              <span className="font-semibold text-slate-900 truncate block">{event.user_email || 'System'}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Action Executed</span>
              <span className="font-mono font-bold text-red-600 uppercase">{event.action}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Module / Entity</span>
              <span className="font-bold text-slate-800 uppercase">{event.entity_type}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Target Entity ID</label>
            <div className="p-2 bg-slate-100 border border-slate-200 rounded font-mono text-slate-800 text-xs font-semibold">
              {event.entity_id || 'N/A'}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Event Reason / Details</label>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
              {event.reason || 'No description logged for this event.'}
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-500 flex items-center justify-between font-medium">
            <span className="flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Immutable Audit Trail</span>
            </span>
            <span className="font-mono">Read-Only</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-md cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
