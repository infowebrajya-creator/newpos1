'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { getPrinterConfig, savePrinterConfig } from '@/services/printing/printService';
import { getRestaurantSettings, updateRestaurantSettings } from '@/services/settings/settingsService';
import { formatEscposBill, formatEscposKot } from '@/services/printing/escpos/escposFormatter';
import { BillPrintDocument, KotPrintDocument } from '@/types/printing';
import { Receipt, Printer, Save, CheckCircle2, RefreshCw, Sliders, FileText } from 'lucide-react';

export function ReceiptFormatDesigner() {
  const [config, setConfig] = useState(getPrinterConfig());
  const [activePreviewTab, setActivePreviewTab] = useState<'bill' | 'kot'>('bill');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Editable receipt metadata fields
  const [restaurantName, setRestaurantName] = useState('WEBRAJYA RESTAURANT');
  const [legalName, setLegalName] = useState('');
  const [phone, setPhone] = useState('9630013483');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('24AAAAA0000A1Z5');
  const [fssaiLicense, setFssaiLicense] = useState('10020021000123');
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('THANK YOU! VISIT AGAIN');

  // Toggle options
  const [showGstin, setShowGstin] = useState(true);
  const [showFssai, setShowFssai] = useState(true);
  const [showReprintBadge, setShowReprintBadge] = useState(false);

  // Sync settings on mount
  useEffect(() => {
    async function loadSettings() {
      const s = await getRestaurantSettings();
      if (s) {
        if (s.name) setRestaurantName(s.name);
        if (s.legal_name !== undefined) setLegalName(s.legal_name || '');
        if (s.phone) setPhone(s.phone);
        if (s.address !== undefined) setAddress(s.address || '');
        if (s.gstin) setGstin(s.gstin);
        if (s.fssai_license) setFssaiLicense(s.fssai_license);
        if (s.receipt_header !== undefined) setReceiptHeader(s.receipt_header || '');
        if (s.receipt_footer) setReceiptFooter(s.receipt_footer);
        if (typeof s.show_gstin === 'boolean') setShowGstin(s.show_gstin);
        else if (typeof s.tax_enabled === 'boolean') setShowGstin(s.tax_enabled);
        if (typeof s.show_fssai === 'boolean') setShowFssai(s.show_fssai);
      }
    }
    loadSettings();
  }, []);

  // Handle Save
  const handleSave = async () => {
    savePrinterConfig(config);
    await updateRestaurantSettings('10000000-0000-0000-0000-000000000001', {
      name: restaurantName,
      legal_name: legalName,
      phone: phone,
      address: address,
      gstin: gstin,
      fssai_license: fssaiLicense,
      receipt_header: receiptHeader,
      receipt_footer: receiptFooter,
      show_gstin: showGstin,
      tax_enabled: showGstin,
      show_fssai: showFssai,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Demo Bill Document for live preview
  const demoBillDoc: BillPrintDocument = useMemo(() => {
    return {
      billId: 'DEMO-BILL-101',
      billNumber: '1042',
      tableNumber: 'Table T-04',
      guestCount: 2,
      date: new Date().toLocaleDateString('en-IN'),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      items: [
        { name: 'Paneer Butter Masala', quantity: 1, unitPrice: 280, lineTotal: 280 },
        { name: 'Butter Naan', quantity: 4, unitPrice: 45, lineTotal: 180 },
        { name: 'Jeera Rice', quantity: 1, unitPrice: 150, lineTotal: 150 },
        { name: 'Cold Drink (Complimentary)', quantity: 1, unitPrice: 0, lineTotal: 0, isComplimentary: true },
      ],
      subtotal: 610,
      discountAmount: 10,
      taxAmount: 0,
      roundingAmount: 0,
      grandTotal: 600,
      paidAmount: 600,
      paymentMethod: 'CASH',
      restaurantName: restaurantName || 'WEBRAJYA RESTAURANT',
      legalName: legalName,
      phone: phone,
      address: address,
      gstin: showGstin ? gstin : undefined,
      fssaiLicense: showFssai ? fssaiLicense : undefined,
      receiptHeader: receiptHeader,
      receiptFooter: receiptFooter,
      isReprint: showReprintBadge,
      taxEnabled: showGstin,
    };
  }, [
    restaurantName,
    legalName,
    phone,
    address,
    gstin,
    fssaiLicense,
    receiptHeader,
    receiptFooter,
    showGstin,
    showFssai,
    showReprintBadge,
  ]);

  // Demo KOT Document for live preview
  const demoKotDoc: KotPrintDocument = useMemo(() => {
    return {
      kotId: 'DEMO-KOT-201',
      kotNumber: '12',
      tableNumber: 'Table T-04',
      floorName: 'Main Dining Floor',
      roundNumber: 1,
      date: new Date().toLocaleDateString('en-IN'),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      items: [
        { name: 'Paneer Butter Masala', quantity: 1, itemNote: 'Extra Spicy, Less Butter' },
        { name: 'Butter Naan', quantity: 4, itemNote: 'Crispy Butter' },
        { name: 'Jeera Rice', quantity: 1 },
      ],
      notes: 'Customer requested fast serving',
      isReprint: showReprintBadge,
    };
  }, [showReprintBadge]);

  const liveBillText = useMemo(() => {
    return formatEscposBill(demoBillDoc, config);
  }, [demoBillDoc, config]);

  const liveKotText = useMemo(() => {
    return formatEscposKot(demoKotDoc, config);
  }, [demoKotDoc, config]);

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center space-x-2 text-emerald-800 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Receipt & KOT print template format saved successfully!</span>
        </div>
      )}

      {/* 2-COLUMN DESIGNER & PREVIEW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: INTERACTIVE FORMAT CUSTOMIZER (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-red-600" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Bill & KOT Format Designer
              </h2>
            </div>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Template Format</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. PAPER WIDTH CONFIG */}
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1.5">
                Receipt Paper Width
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, paperWidth: '80mm' })}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                    config.paperWidth === '80mm'
                      ? 'border-red-600 bg-red-50 text-red-700 shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-extrabold mb-0.5">80mm Standard POS (48 Chars)</div>
                  <div className="text-[10px] text-slate-500 font-medium">Wide thermal paper layout</div>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, paperWidth: '58mm' })}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                    config.paperWidth === '58mm'
                      ? 'border-red-600 bg-red-50 text-red-700 shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-extrabold mb-0.5">58mm Compact Mobile (32 Chars)</div>
                  <div className="text-[10px] text-slate-500 font-medium">Narrow handheld printer layout</div>
                </button>
              </div>
            </div>

            {/* 2. RESTAURANT HEADER FIELDS */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <span className="text-[11px] font-black uppercase text-slate-500 block">
                Header Branding & Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Restaurant Title
                  </label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Tagline / Sub-heading
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Address Line
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>
            </div>

            {/* 3. TAX & LEGAL COMPLIANCE LICENSES & GST ON/OFF TOGGLE */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <span className="text-[11px] font-black uppercase text-slate-500 block">
                GST Tax Calculation & Legal Compliance Licenses
              </span>

              {/* GST ON / OFF MASTER TOGGLE BUTTONS */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                <label className="block text-[11px] font-extrabold uppercase text-slate-700">
                  GST Tax Status (Enable / Disable GST Calculation on Bills)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGstin(true);
                    }}
                    className={`py-2.5 px-3 rounded-lg border text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                      showGstin
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span>🟢 GST TAX: ON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowGstin(false);
                    }}
                    className={`py-2.5 px-3 rounded-lg border text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                      !showGstin
                        ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span>🔴 GST TAX: OFF (0%)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600">GSTIN Number</label>
                    <span className={`text-[10px] font-bold uppercase ${showGstin ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {showGstin ? 'GST Active' : 'GST Disabled'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    disabled={!showGstin}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600 disabled:opacity-50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600">FSSAI License</label>
                    <label className="flex items-center space-x-1 cursor-pointer text-[10px]">
                      <input
                        type="checkbox"
                        checked={showFssai}
                        onChange={(e) => setShowFssai(e.target.checked)}
                        className="accent-red-600 rounded"
                      />
                      <span>Show</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={fssaiLicense}
                    onChange={(e) => setFssaiLicense(e.target.value)}
                    disabled={!showFssai}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* 4. RECEIPT HEADER & FOOTER MESSAGES */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <span className="text-[11px] font-black uppercase text-slate-500 block">
                Custom Welcome & Thank You Messages
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Welcome Message Header
                  </label>
                  <input
                    type="text"
                    value={receiptHeader}
                    onChange={(e) => setReceiptHeader(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Thank You Footer Note
                  </label>
                  <input
                    type="text"
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>
            </div>

            {/* 5. PREVIEW TOGGLE OPTIONS */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-slate-700 font-bold">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showReprintBadge}
                  onChange={(e) => setShowReprintBadge(e.target.checked)}
                  className="accent-red-600 rounded"
                />
                <span>Simulate REPRINT Header Badge</span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE REAL-TIME THERMAL SIMULATOR PANEL (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs sticky top-20">
          {/* PREVIEW TABS HEADER */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold w-full">
              <button
                type="button"
                onClick={() => setActivePreviewTab('bill')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition uppercase flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activePreviewTab === 'bill'
                    ? 'bg-red-600 text-white shadow-2xs font-black'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Bill Receipt Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePreviewTab('kot')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition uppercase flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activePreviewTab === 'kot'
                    ? 'bg-red-600 text-white shadow-2xs font-black'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>KOT Ticket Preview</span>
              </button>
            </div>
          </div>

          {/* REAL THERMAL PAPER SIMULATION BOX */}
          {activePreviewTab === 'bill' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>Live 80mm/58mm Thermal Print Simulation</span>
                <span className="font-mono text-[10px] uppercase font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">
                  {config.paperWidth} PAPER
                </span>
              </div>

              <div className="flex justify-center bg-slate-100/70 p-3 sm:p-4 rounded-2xl border border-slate-200">
                <div
                  className={`bg-[#fefce8] text-slate-900 border-2 border-dashed border-amber-300 rounded-xl p-4 font-mono text-xs shadow-md max-h-[520px] overflow-y-auto whitespace-pre leading-relaxed select-text font-semibold mx-auto ${
                    config.paperWidth === '58mm' ? 'w-[280px]' : 'w-[370px]'
                  }`}
                >
                  {liveBillText}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>Live Kitchen Order Ticket (KOT) Simulation</span>
                <span className="font-mono text-[10px] uppercase font-black bg-red-100 text-red-800 px-2 py-0.5 rounded border border-red-300">
                  {config.paperWidth} KOT TICKET
                </span>
              </div>

              <div className="flex justify-center bg-slate-100/70 p-3 sm:p-4 rounded-2xl border border-slate-200">
                <div
                  className={`bg-white text-slate-900 border-2 border-dashed border-red-400 rounded-xl p-4 font-mono text-xs shadow-md max-h-[520px] overflow-y-auto whitespace-pre leading-relaxed select-text font-semibold mx-auto ${
                    config.paperWidth === '58mm' ? 'w-[280px]' : 'w-[370px]'
                  }`}
                >
                  {liveKotText}
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>⚡ Changes update live in 0ms</span>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-2xs transition"
            >
              Save Format
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
