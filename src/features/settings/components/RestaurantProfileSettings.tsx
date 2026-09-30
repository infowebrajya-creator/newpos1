'use client';

import React, { useState, useEffect } from 'react';
import { RestaurantSettings } from '@/types';
import { updateRestaurantSettings } from '@/services/settings/settingsService';
import { Building2, Save, CheckCircle2, AlertTriangle, ShieldCheck, Receipt } from 'lucide-react';

interface RestaurantProfileSettingsProps {
  settings: RestaurantSettings | null;
  onRefresh: () => void;
  currentUserId?: string;
  canEdit: boolean;
}

export function RestaurantProfileSettings({
  settings,
  onRefresh,
  currentUserId,
  canEdit,
}: RestaurantProfileSettingsProps) {
  const [formData, setFormData] = useState({
    name: settings?.name || 'WEBRAJYA RESTAURANT',
    legal_name: settings?.legal_name ?? '',
    phone: settings?.phone || '9630013483',
    email: settings?.email || 'contact@restaurant.com',
    address: settings?.address ?? '',
    gstin: settings?.gstin || '24AAAAA0000A1Z5',
    fssai_license: settings?.fssai_license || '10020021000123',
    receipt_header: settings?.receipt_header ?? '',
    receipt_footer: settings?.receipt_footer || 'THANK YOU! VISIT AGAIN',
    tax_enabled: settings?.tax_enabled !== false,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name || 'WEBRAJYA RESTAURANT',
        legal_name: settings.legal_name ?? '',
        phone: settings.phone || '9630013483',
        email: settings.email || 'contact@restaurant.com',
        address: settings.address ?? '',
        gstin: settings.gstin || '24AAAAA0000A1Z5',
        fssai_license: settings.fssai_license || '10020021000123',
        receipt_header: settings.receipt_header ?? '',
        receipt_footer: settings.receipt_footer || 'THANK YOU! VISIT AGAIN',
        tax_enabled: settings.tax_enabled !== false,
      });
    }
  }, [settings]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setMessage(null);

    const targetId = settings?.id || '10000000-0000-0000-0000-000000000001';
    const res = await updateRestaurantSettings(targetId, formData, currentUserId);
    if (res.success) {
      setMessage({ type: 'success', text: 'Restaurant profile settings saved successfully!' });
      onRefresh();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to save settings.' });
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-md bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Restaurant Profile & Receipt Info</h3>
            <p className="text-xs text-slate-500">Legal business identity and customer receipt branding</p>
          </div>
        </div>

        {canEdit && (
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-md text-xs font-semibold flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Restaurant Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={!canEdit}
            required
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-medium focus:outline-none focus:border-red-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Legal Entity / Company Name</label>
          <input
            type="text"
            name="legal_name"
            value={formData.legal_name}
            onChange={handleChange}
            disabled={!canEdit}
            placeholder="WebRajya Foods Pvt Ltd"
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-medium focus:outline-none focus:border-red-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Contact Phone Number</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            disabled={!canEdit}
            placeholder="+91 9876543210"
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-medium focus:outline-none focus:border-red-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Contact Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={!canEdit}
            placeholder="contact@restaurant.com"
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-medium focus:outline-none focus:border-red-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">FSSAI License Number</label>
          <input
            type="text"
            name="fssai_license"
            value={formData.fssai_license}
            onChange={handleChange}
            disabled={!canEdit}
            placeholder="12345678901234"
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-mono font-medium focus:outline-none focus:border-red-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Tax Configuration Status</label>
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 font-medium flex items-center justify-between">
            <span className="font-bold text-slate-900">Tax Disabled (0%)</span>
            <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
              Standard POS Default
            </span>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block font-bold text-slate-700 mb-1">Physical Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            disabled={!canEdit}
            placeholder="Shop 12, Main Street, MG Road, City"
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-medium focus:outline-none focus:border-red-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Receipt Top Header Note</label>
          <input
            type="text"
            name="receipt_header"
            value={formData.receipt_header}
            onChange={handleChange}
            disabled={!canEdit}
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-medium focus:outline-none focus:border-red-500 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Receipt Bottom Footer Note</label>
          <input
            type="text"
            name="receipt_footer"
            value={formData.receipt_footer}
            onChange={handleChange}
            disabled={!canEdit}
            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-medium focus:outline-none focus:border-red-500 disabled:bg-slate-50"
          />
        </div>
      </div>
    </form>
  );
}
