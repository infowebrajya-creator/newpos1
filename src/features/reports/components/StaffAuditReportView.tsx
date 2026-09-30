'use client';

import React, { useState } from 'react';
import { StaffActivityItem, AuditLogReportItem } from '@/types/reports';
import { exportToCsv } from '@/lib/exportCsv';
import { UserCheck, ShieldCheck, Download, Search, FileText } from 'lucide-react';

interface StaffAuditReportViewProps {
  staff: StaffActivityItem[];
  auditLogs: AuditLogReportItem[];
}

export function StaffAuditReportView({ staff, auditLogs }: StaffAuditReportViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user_email && log.user_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportAudit = () => {
    exportToCsv('audit_log_report', filteredLogs, {
      created_at: 'Timestamp',
      user_email: 'User',
      action: 'Action',
      entity_type: 'Entity Type',
      entity_id: 'Entity ID',
      reason: 'Reason / Details',
    });
  };

  return (
    <div className="space-y-4">
      {/* Staff Activity Aggregates */}
      <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <UserCheck className="w-4 h-4 text-red-600" />
          <h3 className="text-sm font-bold text-slate-900">Staff Operational Activity Summaries</h3>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase bg-slate-50">
                <th className="py-2.5 px-3">User / Staff Member</th>
                <th className="py-2.5 px-3 text-center">Audit Actions Recorded</th>
                <th className="py-2.5 px-3 text-right">Last System Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {staff.map((s) => (
                <tr key={s.user_id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{s.user_email}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">
                    {s.action_count}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 font-medium font-mono text-[11px]">
                    {new Date(s.last_activity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Security Audit Log</h3>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by action or user..."
                className="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-md text-slate-900 text-xs focus:outline-none focus:border-red-500 placeholder:text-slate-400 font-medium"
              />
            </div>

            <button
              onClick={handleExportAudit}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase bg-slate-50">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity Type</th>
                <th className="py-2.5 px-3">Details / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{log.user_email}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{log.action}</td>
                  <td className="py-2.5 px-3 text-slate-700 capitalize font-medium">{log.entity_type}</td>
                  <td className="py-2.5 px-3 text-slate-600 truncate max-w-xs">{log.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
