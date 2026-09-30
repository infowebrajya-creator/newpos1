'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types';
import { getStaffMembers } from '@/services/staff/staffService';
import { getCurrentUserProfile } from '@/services/auth/authService';
import { StaffDetailModal } from './StaffDetailModal';
import {
  UserCheck,
  RefreshCw,
  Search,
  Filter,
  Shield,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

const ROLE_OPTIONS: { key: string; label: string }[] = [
  { key: 'all', label: 'All Roles' },
  { key: 'owner', label: 'Owner' },
  { key: 'admin', label: 'Admin' },
  { key: 'manager', label: 'Manager' },
  { key: 'cashier', label: 'Cashier' },
  { key: 'captain', label: 'Captain' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'accountant', label: 'Accountant' },
];

export function StaffDashboard() {
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Detail Modal State
  const [selectedStaff, setSelectedStaff] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [members, profile] = await Promise.all([
        getStaffMembers(),
        getCurrentUserProfile(),
      ]);
      setStaffList(members);
      setCurrentUser(profile);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDetail = (member: UserProfile) => {
    setSelectedStaff(member);
    setIsModalOpen(true);
  };

  // Filtered List
  const filteredStaff = staffList.filter((member) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (member.full_name && member.full_name.toLowerCase().includes(query)) ||
      (member.email && member.email.toLowerCase().includes(query)) ||
      (member.phone_number && member.phone_number.includes(query)) ||
      member.id.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && member.is_active) ||
      (statusFilter === 'inactive' && !member.is_active);

    const matchesRole = roleFilter === 'all' || member.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const activeCount = staffList.filter((s) => s.is_active).length;
  const inactiveCount = staffList.filter((s) => !s.is_active).length;

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'admin':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'manager':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'cashier':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'kitchen':
        return 'bg-orange-100 text-orange-900 border-orange-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Staff & Team Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Operational staff directory, permission assignments, and audit logging
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-slate-600 block mb-1">Total Registered Staff</span>
          <p className="text-xl font-black font-mono text-slate-900">{staffList.length}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Database user accounts</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-emerald-800 block mb-1">Active Accounts</span>
          <p className="text-xl font-black font-mono text-emerald-800">{activeCount}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Authorized for POS access</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-sm">
          <span className="text-xs font-bold text-red-800 block mb-1">Deactivated Accounts</span>
          <p className="text-xl font-black font-mono text-red-800">{inactiveCount}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Barred from system login</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, email, or phone..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-900 text-xs focus:outline-none focus:border-red-500 font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                statusFilter === 'active' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                statusFilter === 'inactive' ? 'bg-white text-red-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Role Filter Dropdown */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-900 font-bold text-xs focus:outline-none focus:border-red-500"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
            Loading staff directory...
          </div>
        ) : filteredStaff.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase bg-slate-50">
                  <th className="py-2.5 px-3">Staff Name</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Contact Email / Phone</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {member.full_name || 'Staff User'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[150px]">
                            {member.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getRoleBadgeStyle(
                          member.role
                        )}`}
                      >
                        {member.role}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 font-mono text-xs">
                      <div>{member.email || '—'}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{member.phone_number || ''}</div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center space-x-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                          member.is_active
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {member.is_active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-red-600" />
                            <span>Inactive</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleOpenDetail(member)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded transition-colors flex items-center space-x-1 cursor-pointer ml-auto shadow-xs"
                      >
                        <span>Inspect & Permissions</span>
                        <ChevronRight className="w-3 h-3 text-slate-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 text-xs font-medium">
            No staff members found matching your query or filter criteria.
          </div>
        )}
      </div>

      {/* Staff Detail Drawer / Modal */}
      <StaffDetailModal
        staff={selectedStaff}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={loadData}
        currentUserRole={currentUser?.role}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}
