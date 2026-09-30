'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types';
import { updateStaffRole, updateStaffStatus, getStaffAuditLogs } from '@/services/staff/staffService';
import { AuditLogReportItem } from '@/types/reports';
import { StaffPermissionsMatrix } from './StaffPermissionsMatrix';
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Save,
  Lock,
} from 'lucide-react';

interface StaffDetailModalProps {
  staff: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  currentUserRole?: UserRole | null;
  currentUserId?: string;
}

const ALL_ROLES: { key: UserRole; label: string; description: string }[] = [
  { key: 'owner', label: 'Owner', description: 'Full system access & settings' },
  { key: 'admin', label: 'Administrator', description: 'System administration without settings' },
  { key: 'manager', label: 'Store Manager', description: 'POS, Stock, Menu, Purchases & Reports' },
  { key: 'cashier', label: 'Cashier', description: 'POS Terminal, Orders, Billing & Payments' },
  { key: 'captain', label: 'Captain / Order Taker', description: 'POS Terminal, Floor & Tables' },
  { key: 'kitchen', label: 'Kitchen KDS', description: 'Kitchen Display Screen & KOT' },
  { key: 'inventory', label: 'Inventory Manager', description: 'Stock, Recipes, Purchases & Vendors' },
  { key: 'accountant', label: 'Accountant', description: 'Billing, Payments, Reports & Analytics' },
];

export function StaffDetailModal({
  staff,
  isOpen,
  onClose,
  onRefresh,
  currentUserRole,
  currentUserId,
}: StaffDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'permissions' | 'activity' | 'manage'>('permissions');
  const [selectedRole, setSelectedRole] = useState<UserRole>('cashier');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogReportItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (staff) {
      setSelectedRole(staff.role);
      setIsActive(staff.is_active);
      setMessage(null);
      loadLogs(staff.id);
    }
  }, [staff]);

  const loadLogs = async (userId: string) => {
    setLoadingLogs(true);
    const logs = await getStaffAuditLogs(userId);
    setAuditLogs(logs);
    setLoadingLogs(false);
  };

  if (!isOpen || !staff) return null;

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleSaveRole = async () => {
    if (!canEdit) return;
    setIsUpdating(true);
    setMessage(null);

    const res = await updateStaffRole(staff.id, selectedRole, currentUserId);
    if (res.success) {
      setMessage({ type: 'success', text: `Role updated to ${selectedRole} successfully.` });
      onRefresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update role.' });
    }
    setIsUpdating(false);
  };

  const handleToggleStatus = async () => {
    if (!canEdit) return;
    setIsUpdating(true);
    setMessage(null);

    const nextStatus = !isActive;
    const res = await updateStaffStatus(staff.id, nextStatus, currentUserId);
    if (res.success) {
      setIsActive(nextStatus);
      setMessage({
        type: 'success',
        text: `Staff member ${nextStatus ? 'reactivated' : 'deactivated'} successfully.`,
      });
      onRefresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update status.' });
    }
    setIsUpdating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 text-white font-black text-sm flex items-center justify-center shrink-0">
              {(staff.full_name || staff.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">{staff.full_name || 'Staff User'}</h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-800 border border-slate-300">
                  {staff.role}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                    staff.is_active
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {staff.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{staff.email || 'No email registered'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 px-4 pt-2 bg-white text-xs font-bold space-x-2">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`pb-2.5 px-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'permissions'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Permissions & Overview
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-2.5 px-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'activity'
                ? 'border-red-600 text-red-600 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit History ({auditLogs.length})
          </button>
          {canEdit && (
            <button
              onClick={() => setActiveTab('manage')}
              className={`pb-2.5 px-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'manage'
                  ? 'border-red-600 text-red-600 font-extrabold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Manage Role & Status
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {message && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold flex items-center space-x-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
              <span>{message.text}</span>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-4">
              {/* Profile Details Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] font-bold block uppercase">Phone</span>
                  <span className="font-mono font-medium text-slate-900">{staff.phone_number || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold block uppercase">User ID</span>
                  <span className="font-mono text-[10px] text-slate-700 truncate block">{staff.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold block uppercase">Account Registered</span>
                  <span className="font-mono font-medium text-slate-900">
                    {staff.created_at ? new Date(staff.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>

              {/* Grouped Permissions Matrix */}
              <StaffPermissionsMatrix role={selectedRole} />
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-slate-700" />
                <span>Recent Operational Audit Logs</span>
              </h4>

              {loadingLogs ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading audit history...</div>
              ) : auditLogs.length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase bg-slate-50">
                        <th className="py-2 px-3">Timestamp</th>
                        <th className="py-2 px-3">Action</th>
                        <th className="py-2 px-3">Details / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{log.action}</td>
                          <td className="py-2 px-3 text-slate-700">{log.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs">
                  No recorded audit history for this staff member.
                </div>
              )}
            </div>
          )}

          {activeTab === 'manage' && canEdit && (
            <div className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  Select Role Assignment:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_ROLES.map((r) => {
                    const isSelected = selectedRole === r.key;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setSelectedRole(r.key)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-50 border-red-500 text-red-900 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs uppercase">{r.label}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-red-600" />}
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">{r.description}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleSaveRole}
                  disabled={isUpdating || selectedRole === staff.role}
                  className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isUpdating ? 'Saving...' : 'Save Role Assignment'}</span>
                </button>
              </div>

              {/* Status Management */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  Staff Account Status:
                </label>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {isActive ? 'Account Active' : 'Account Deactivated'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isActive
                        ? 'Staff user can log in and execute authorized operations'
                        : 'Staff user is disabled and barred from POS operations'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    disabled={isUpdating}
                    className={`px-3.5 py-1.5 font-bold text-xs rounded-lg transition cursor-pointer ${
                      isActive
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isActive ? 'Deactivate Staff' : 'Reactivate Staff'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
