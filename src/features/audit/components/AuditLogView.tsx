'use client';

import React, { useState, useEffect } from 'react';
import { DatePreset } from '@/types/reports';
import {
  AuditLogItem,
  getAuditLogs,
  getDistinctAuditActions,
  getDistinctEntityTypes,
} from '@/services/audit/auditService';
import { getCurrentUserProfile } from '@/services/auth/authService';
import { hasPermission } from '@/lib/permissions';
import { UserProfile } from '@/types';
import { AuditEventDetailsModal } from './AuditEventDetailsModal';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Clock,
  Eye,
  Lock,
} from 'lucide-react';

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last_7_days', label: 'Last 7 Days' },
  { key: 'last_30_days', label: 'Last 30 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

export function AuditLogView() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [preset, setPreset] = useState<DatePreset>('today');
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  // Options
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [entityOptions, setEntityOptions] = useState<string[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modal State
  const [selectedEvent, setSelectedEvent] = useState<AuditLogItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profile, logRes, actions, entities] = await Promise.all([
        getCurrentUserProfile(),
        getAuditLogs({
          preset,
          customStart,
          customEnd,
          actionFilter,
          entityFilter,
          searchQuery,
          page,
          pageSize,
        }),
        getDistinctAuditActions(),
        getDistinctEntityTypes(),
      ]);

      setUserProfile(profile);
      setLogs(logRes.data);
      setTotalCount(logRes.totalCount);
      setActionOptions(actions);
      setEntityOptions(entities);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [preset, customStart, customEnd, actionFilter, entityFilter, page, pageSize]);

  // Handle Search submit / debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const userRole = userProfile?.role || 'owner';
  const canAccess = hasPermission(userRole, 'audit');

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CANCEL') || action.includes('DEACTIVATE')) {
      return 'bg-red-100 text-red-900 border-red-300';
    }
    if (action.includes('UPDATE') || action.includes('EDIT')) {
      return 'bg-amber-100 text-amber-900 border-amber-300';
    }
    if (action.includes('REACTIVATE') || action.includes('CREATE')) {
      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    }
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Audit Log / System Activity</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable operational audit trail, security events, cancellations & configuration history
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      {/* Access Restriction Warning Banner */}
      {!canAccess && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-semibold flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Access Restricted: Your role (<strong className="uppercase">{userRole}</strong>) does not have audit log viewing privileges. Contact system administrator for access.
          </span>
        </div>
      )}

      {/* Date Preset Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setPreset(p.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                preset === p.key
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center space-x-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-slate-900 font-medium text-xs focus:outline-none focus:border-red-500"
            />
            <span className="text-slate-500 font-medium">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-md text-slate-900 font-medium text-xs focus:outline-none focus:border-red-500"
            />
          </div>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, reason, entity ID or user..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 text-xs focus:outline-none focus:border-red-500 font-medium"
          />
        </form>

        {/* Action & Entity Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-bold text-xs focus:outline-none focus:border-red-500"
          >
            <option value="all">All Actions</option>
            {actionOptions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>

          {/* Entity Type Filter */}
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-bold text-xs focus:outline-none focus:border-red-500"
          >
            <option value="all">All Modules / Entities</option>
            {entityOptions.map((ent) => (
              <option key={ent} value={ent}>
                {ent.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Audit Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm space-y-0">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
            Loading operational audit history...
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase bg-slate-50">
                  <th className="py-2.5 px-3">Timestamp (IST)</th>
                  <th className="py-2.5 px-3">Staff / User</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Module</th>
                  <th className="py-2.5 px-3">Entity ID</th>
                  <th className="py-2.5 px-3">Event Reason / Details</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 font-semibold whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[150px]">
                      {log.user_email}
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border font-mono ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-bold text-slate-800 uppercase text-[11px]">
                      {log.entity_type}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 truncate max-w-[120px]">
                      {log.entity_id || '—'}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 truncate max-w-xs font-medium">
                      {log.reason || '—'}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedEvent(log);
                          setIsModalOpen(true);
                        }}
                        className="p-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded transition-colors cursor-pointer inline-flex items-center space-x-1 text-xs font-bold px-2 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 text-xs font-medium">
            No audit events found for the selected period or filter criteria.
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 font-medium">
            Showing <span className="font-bold text-slate-900">{logs.length}</span> of{' '}
            <span className="font-bold text-slate-900">{totalCount}</span> total audit records
          </div>

          <div className="flex items-center space-x-3 self-end sm:self-auto">
            {/* Page Size Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 text-[11px] font-semibold">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-bold text-xs"
              >
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Prev / Next buttons */}
            <div className="flex items-center space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-300 rounded font-bold text-slate-700 flex items-center space-x-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-2 font-mono font-bold text-slate-900">
                {page} / {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-300 rounded font-bold text-slate-700 flex items-center space-x-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Drawer / Modal */}
      <AuditEventDetailsModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
