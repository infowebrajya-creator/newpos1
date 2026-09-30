'use client';

import React, { useState, useEffect } from 'react';
import { Supplier, CreateSupplierInput } from '@/types/purchases';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X, Building2, Phone, Mail, MapPin, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateSupplierInput) => Promise<void>;
  supplier?: Supplier | null;
}

export function SupplierModal({ isOpen, onClose, onSave, supplier }: SupplierModalProps) {
  const [formData, setFormData] = useState<CreateSupplierInput>({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    notes: '',
    is_active: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        gst_number: supplier.gst_number || '',
        notes: supplier.notes || '',
        is_active: supplier.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        gst_number: '',
        notes: '',
        is_active: true,
      });
    }
    setError(null);
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Supplier name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {supplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {supplier ? 'Update vendor contact details and settings' : 'Register a new raw material vendor'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Supplier Name *"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Royal Fresh Dairy & Foods"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Contact Person"
              type="text"
              value={formData.contact_person || ''}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              placeholder="e.g. Rajesh Kumar"
            />

            <Input
              label="Phone Number"
              type="text"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. +91 98765 43210"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. supplier@royaldairy.com"
            />

            <Input
              label="GST Number"
              type="text"
              value={formData.gst_number || ''}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
              placeholder="e.g. 27AAAAA0000A1Z5"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Address
            </label>
            <textarea
              rows={2}
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Plot 42, APMC Market, Vashi, Navi Mumbai"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 font-medium resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Notes & Additional Details
            </label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Delivers every Monday and Thursday morning."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 font-medium resize-none"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="supplierActive"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <label htmlFor="supplierActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Active Vendor
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 px-6 py-3 border-t border-slate-100 bg-white">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={loading}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span>{supplier ? 'Save Changes' : 'Create Supplier'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
