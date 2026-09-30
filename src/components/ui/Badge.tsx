import React from 'react';
import { UserRole } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'role' | 'success' | 'warning' | 'danger';
  role?: UserRole;
  className?: string;
}

export function Badge({ children, variant = 'default', role, className = '' }: BadgeProps) {
  if (role) {
    const roleStyles: Record<UserRole, string> = {
      owner: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      admin: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      manager: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      cashier: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      captain: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      kitchen: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      inventory: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
      accountant: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
          roleStyles[role] || 'bg-slate-800 text-slate-300 border-slate-700'
        } ${className}`}
      >
        {children || role}
      </span>
    );
  }

  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    role: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
