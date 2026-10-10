'use client';

import React, { useState, useEffect } from 'react';
import { Link } from '@/lib/navigation';
import { RestaurantSettings, UserProfile } from '@/types';
import { getRestaurantSettings } from '@/services/settings/settingsService';
import { getCurrentUserProfile } from '@/services/auth/authService';
import { hasPermission } from '@/lib/permissions';
import { RestaurantProfileSettings } from './RestaurantProfileSettings';
import { PrinterConfigurationSection } from './PrinterConfigurationSection';
import { POSBillingPreferences } from './POSBillingPreferences';
import { ReceiptFormatDesigner } from './ReceiptFormatDesigner';
import { POSUserManual } from './POSUserManual';
import {
  Settings,
  RefreshCw,
  Building2,
  Printer,
  CreditCard,
  UtensilsCrossed,
  Package,
  Users,
  ShieldAlert,
  ChevronRight,
  BookOpen,
  PieChart,
  ShoppingBag,
  Truck,
  FileText,
  HelpCircle,
} from 'lucide-react';

export function SettingsDashboard() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'profile' | 'printing' | 'format_designer' | 'billing' | 'shortcuts' | 'manual'>('profile');

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, profile] = await Promise.all([
        getRestaurantSettings(),
        getCurrentUserProfile(),
      ]);
      setSettings(data);
      setUserProfile(profile);
    } catch (err) {
      console.error('Failed to load restaurant settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const userRole = userProfile?.role || 'owner';
  const canEdit = hasPermission(userRole, 'settings');

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Settings & System Configuration</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Restaurant profile, thermal printing hardware routing, billing defaults & module shortcuts
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Settings</span>
        </button>
      </div>

      {/* Permission Restriction Warning Banner */}
      {!canEdit && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-semibold flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Your user role (<strong className="uppercase">{userRole}</strong>) has read-only configuration access. System settings updates are restricted to authorized administrators.
          </span>
        </div>
      )}

      {/* Navigation Section Tabs */}
      <div className="flex items-center space-x-1.5 bg-white border border-slate-200 p-1.5 rounded-lg overflow-x-auto scrollbar-none shadow-sm">
        <button
          onClick={() => setActiveSection('profile')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSection === 'profile'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Restaurant Profile</span>
        </button>

        <button
          onClick={() => setActiveSection('printing')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSection === 'printing'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Thermal Hardware Routing</span>
        </button>

        <button
          onClick={() => setActiveSection('format_designer')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSection === 'format_designer'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Receipt & KOT Format Designer</span>
        </button>

        <button
          onClick={() => setActiveSection('billing')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSection === 'billing'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>POS & Billing Defaults</span>
        </button>

        <button
          onClick={() => setActiveSection('shortcuts')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSection === 'shortcuts'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Module Management Shortcuts</span>
        </button>

        <button
          onClick={() => setActiveSection('manual')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSection === 'manual'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>POS User Manual & Hotkeys</span>
        </button>
      </div>

      {/* Main Content Sections */}
      {loading ? (
        <div className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse flex items-center justify-center text-slate-400 text-xs">
          Loading system settings...
        </div>
      ) : (
        <div className="space-y-4">
          {activeSection === 'profile' && (
            <RestaurantProfileSettings
              settings={settings}
              onRefresh={loadData}
              currentUserId={userProfile?.id}
              canEdit={canEdit}
            />
          )}

          {activeSection === 'printing' && (
            <PrinterConfigurationSection canEdit={canEdit} />
          )}

          {activeSection === 'format_designer' && (
            <ReceiptFormatDesigner />
          )}

          {activeSection === 'billing' && (
            <POSBillingPreferences canEdit={canEdit} />
          )}

          {activeSection === 'manual' && (
            <POSUserManual />
          )}

          {activeSection === 'shortcuts' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Floor & Tables */}
              <Link
                href="/pos/tables"
                className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:border-red-400 transition group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                    <UtensilsCrossed className="w-4 h-4 text-red-600" />
                    <span>Table & Floor Layout</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-xs text-slate-500">Configure floor sections, table numbers & seating capacities</p>
              </Link>

              {/* Menu Items */}
              <Link
                href="/pos/menu"
                className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:border-red-400 transition group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                    <BookOpen className="w-4 h-4 text-red-600" />
                    <span>Menu & Categories</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-xs text-slate-500">Manage food categories, items, prices & availability</p>
              </Link>

              {/* Recipes */}
              <Link
                href="/pos/recipes"
                className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:border-red-400 transition group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                    <PieChart className="w-4 h-4 text-red-600" />
                    <span>Recipes & Costing</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-xs text-slate-500">Define recipe ingredient mappings & cost breakdown calculations</p>
              </Link>

              {/* Stock Inventory */}
              <Link
                href="/pos/inventory"
                className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:border-red-400 transition group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                    <Package className="w-4 h-4 text-red-600" />
                    <span>Inventory & Ingredients</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-xs text-slate-500">Track stock levels, minimum thresholds & ingredient valuation</p>
              </Link>

              {/* Purchases */}
              <Link
                href="/pos/purchases"
                className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:border-red-400 transition group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                    <ShoppingBag className="w-4 h-4 text-red-600" />
                    <span>Purchases & Procurement</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-xs text-slate-500">Manage purchase orders, stock receipts & supplier billing</p>
              </Link>

              {/* Suppliers */}
              <Link
                href="/pos/suppliers"
                className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:border-red-400 transition group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                    <Truck className="w-4 h-4 text-red-600" />
                    <span>Suppliers & Vendors</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-xs text-slate-500">Vendor directory, contact details & procurement history</p>
              </Link>

              {/* Staff Management */}
              <Link
                href="/pos/staff"
                className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:border-red-400 transition group space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                    <Users className="w-4 h-4 text-red-600" />
                    <span>Staff & Role Access</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-xs text-slate-500">User accounts, role assignments & security audit logging</p>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
