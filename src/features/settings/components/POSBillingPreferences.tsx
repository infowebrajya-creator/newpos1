'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Save, CheckCircle2, ShoppingBag, ShieldCheck } from 'lucide-react';

interface POSBillingPreferencesProps {
  canEdit: boolean;
}

export interface POSPreferences {
  defaultOrderType: 'dine_in' | 'takeaway' | 'delivery';
  roundBillAmount: boolean;
  autoOpenCashDrawer: boolean;
  requireTableForDineIn: boolean;
  autoPrintKOT: boolean;
}

const STORAGE_KEY = 'webrajya_pos_preferences';

export function getPOSPreferences(): POSPreferences {
  if (typeof window === 'undefined') {
    return {
      defaultOrderType: 'dine_in',
      roundBillAmount: true,
      autoOpenCashDrawer: false,
      requireTableForDineIn: true,
      autoPrintKOT: true,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    // fallback
  }
  return {
    defaultOrderType: 'dine_in',
    roundBillAmount: true,
    autoOpenCashDrawer: false,
    requireTableForDineIn: true,
    autoPrintKOT: true,
  };
}

export function savePOSPreferences(prefs: POSPreferences) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }
}

export function POSBillingPreferences({ canEdit }: POSBillingPreferencesProps) {
  const [prefs, setPrefs] = useState<POSPreferences>(getPOSPreferences());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setPrefs(getPOSPreferences());
  }, []);

  const handleSave = () => {
    if (!canEdit) return;
    savePOSPreferences(prefs);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">POS & Billing Workstation Defaults</h3>
            <p className="text-xs text-slate-500">Configure default order types, rounding & terminal behavior</p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        )}
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>POS & Billing preferences saved successfully!</span>
        </div>
      )}

      {/* Main Options Form */}
      <div className="space-y-4 text-xs">
        {/* Default Order Type */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5">Default New Order Type</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setPrefs({ ...prefs, defaultOrderType: 'dine_in' })}
              className={`p-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                prefs.defaultOrderType === 'dine_in'
                  ? 'border-red-500 bg-red-50 text-red-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              🍽️ Dine-In
            </button>

            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setPrefs({ ...prefs, defaultOrderType: 'takeaway' })}
              className={`p-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                prefs.defaultOrderType === 'takeaway'
                  ? 'border-red-500 bg-red-50 text-red-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              🛍️ Takeaway / Parcel
            </button>

            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setPrefs({ ...prefs, defaultOrderType: 'delivery' })}
              className={`p-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                prefs.defaultOrderType === 'delivery'
                  ? 'border-red-500 bg-red-50 text-red-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              🛵 Direct Delivery
            </button>
          </div>
        </div>

        {/* Checkbox Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="flex items-start space-x-2 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <input
              type="checkbox"
              id="roundBill"
              checked={prefs.roundBillAmount}
              onChange={(e) => setPrefs({ ...prefs, roundBillAmount: e.target.checked })}
              disabled={!canEdit}
              className="w-4 h-4 accent-red-600 rounded border-slate-300 mt-0.5 cursor-pointer"
            />
            <div>
              <label htmlFor="roundBill" className="font-bold text-slate-900 cursor-pointer block select-none">
                Round Final Bill Amount
              </label>
              <span className="text-[11px] text-slate-500 font-medium">Round bill totals to nearest integer during payment settlement</span>
            </div>
          </div>

          <div className="flex items-start space-x-2 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <input
              type="checkbox"
              id="autoKOT"
              checked={prefs.autoPrintKOT}
              onChange={(e) => setPrefs({ ...prefs, autoPrintKOT: e.target.checked })}
              disabled={!canEdit}
              className="w-4 h-4 accent-red-600 rounded border-slate-300 mt-0.5 cursor-pointer"
            />
            <div>
              <label htmlFor="autoKOT" className="font-bold text-slate-900 cursor-pointer block select-none">
                Auto-Trigger KOT Print
              </label>
              <span className="text-[11px] text-slate-500 font-medium">Automatically dispatch KOT to printer adapter on order submit</span>
            </div>
          </div>

          <div className="flex items-start space-x-2 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <input
              type="checkbox"
              id="requireTable"
              checked={prefs.requireTableForDineIn}
              onChange={(e) => setPrefs({ ...prefs, requireTableForDineIn: e.target.checked })}
              disabled={!canEdit}
              className="w-4 h-4 accent-red-600 rounded border-slate-300 mt-0.5 cursor-pointer"
            />
            <div>
              <label htmlFor="requireTable" className="font-bold text-slate-900 cursor-pointer block select-none">
                Enforce Table Selection
              </label>
              <span className="text-[11px] text-slate-500 font-medium">Require table assignment before starting a Dine-in check</span>
            </div>
          </div>

          <div className="flex items-start space-x-2 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <input
              type="checkbox"
              id="autoCashDrawer"
              checked={prefs.autoOpenCashDrawer}
              onChange={(e) => setPrefs({ ...prefs, autoOpenCashDrawer: e.target.checked })}
              disabled={!canEdit}
              className="w-4 h-4 accent-red-600 rounded border-slate-300 mt-0.5 cursor-pointer"
            />
            <div>
              <label htmlFor="autoCashDrawer" className="font-bold text-slate-900 cursor-pointer block select-none">
                Auto Open Cash Drawer Signal
              </label>
              <span className="text-[11px] text-slate-500 font-medium">Send ESC/POS pulse signal to cash drawer on cash settlement</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
