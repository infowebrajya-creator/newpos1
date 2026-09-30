'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Keyboard,
  Utensils,
  ShoppingBag,
  Printer,
  ShieldCheck,
  Search,
  Zap,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  FileText,
  CornerDownLeft,
  Command,
} from 'lucide-react';

export function POSUserManual() {
  const [activeTab, setActiveTab] = useState<'hotkeys' | 'dine_in' | 'counter' | 'printing' | 'settings' | 'upcoming'>('hotkeys');
  const [searchQuery, setSearchQuery] = useState('');

  const hotkeysList = [
    { key: 'Alt + 1..4', action: 'Switch POS Modules', description: 'Jump to Front Desk (Alt+1), Billing (Alt+2), Kitchen (Alt+3), Admin (Alt+4)', context: 'Global POS' },
    { key: '] / [', action: 'Cycle POS Modules', description: 'Cycle forward [ ] ] or backward [ [ ] through top navigation tabs', context: 'Global POS' },
    { key: 'T / ⌘T', action: 'Quick Table Jump', description: 'Opens Table Jump modal to instantly open Table 1, 12, Bar, etc.', context: 'Global POS' },
    { key: 'S / / / ⌘K', action: 'Focus Search Bar', description: 'Instantly jump cursor to menu item search bar', context: 'POS Order Screen' },
    { key: 'K / F4', action: 'Dispatch KOT to Kitchen', description: 'Sends current cart items to kitchen printers / KDS screen', context: 'Cart / Table View' },
    { key: 'B / F2', action: 'Save & Generate Bill', description: 'Opens payment checkout modal and generates final bill', context: 'Cart / Billing' },
    { key: 'P / F7', action: 'Reprint KOT / Bill', description: 'Triggers print command for current or last order receipt', context: 'Active Order / History' },
    { key: 'Space', action: 'Quick Cash Checkout', description: 'Fills exact order amount as cash and completes transaction', context: 'Checkout Modal' },
    { key: 'Esc', action: 'Cancel / Clear Focus', description: 'Unfocuses inputs, closes active modals, or resets active dialog', context: 'Global' },
    { key: '+ / =', action: 'Increase Item Quantity', description: 'Increments selected menu item quantity by +1 in active cart', context: 'Cart Item Row' },
    { key: '- (Minus)', action: 'Decrease Item Quantity', description: 'Decrements selected menu item quantity by -1 in active cart', context: 'Cart Item Row' },
    { key: 'X', action: 'Remove Selected Item', description: 'Deletes targeted item line from current active cart', context: 'Cart Item Row' },
  ];

  const filteredHotkeys = hotkeysList.filter(
    (hk) =>
      hk.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hk.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hk.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrintThermalHotkeys = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>WebRajya POS - Cashier Hotkeys Counter Sticker</title>
            <style>
              @page { size: auto; margin: 5mm; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 11px;
                color: #0f172a;
                padding: 10px;
                max-width: 380px;
                margin: 0 auto;
              }
              .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
              .header h2 { margin: 0; font-size: 16px; font-weight: 900; letter-spacing: -0.5px; }
              .header p { margin: 2px 0 0 0; font-size: 10px; color: #475569; font-weight: 700; text-transform: uppercase; }
              .badge { display: inline-block; background: #ea580c; color: #fff; font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; margin-top: 4px; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; }
              th { text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; }
              td { padding: 6px 0; border-bottom: 1px dashed #cbd5e1; vertical-align: top; }
              .key {
                display: inline-block;
                background: #0f172a;
                color: #fbbf24;
                font-family: monospace;
                font-size: 11px;
                font-weight: 900;
                padding: 2px 6px;
                border-radius: 4px;
                white-space: nowrap;
              }
              .action { font-weight: 800; font-size: 11px; color: #0f172a; }
              .desc { font-size: 9.5px; color: #64748b; line-height: 1.2; }
              .footer { text-align: center; margin-top: 14px; pt: 8px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #64748b; font-weight: 700; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>⚡ WEBRAJYA POS</h2>
              <p>Cashier 0-Lag Hotkey Counter Cheatsheet</p>
              <span class="badge">STICK AT POS BILLING COUNTER</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 35%;">Shortcut</th>
                  <th>Action & Scope</th>
                </tr>
              </thead>
              <tbody>
                ${hotkeysList
                  .map(
                    (hk) => `
                  <tr>
                    <td><span class="key">${hk.key}</span></td>
                    <td>
                      <div class="action">${hk.action}</div>
                      <div class="desc">${hk.description} (${hk.context})</div>
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
            <div class="footer">
              WebRajya Operating System • High-Speed Cashier Terminal • Press Esc to cancel
            </div>
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white p-6 rounded-2xl shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[11px] font-bold tracking-wider uppercase border border-red-500/30 flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>WebRajya Operating System</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              WebRajya POS User Manual & Hotkey Guide
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Complete operational handbook for restaurant cashiers, floor captains, and managers. Learn high-speed keyboard hotkeys, table management, KOT kitchen routing, and billing preferences.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handlePrintThermalHotkeys}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer border border-red-500"
              title="Print Cashier Counter Shortcut Sheet / Thermal Receipt"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Print Hotkey Sticker</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manual Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('hotkeys')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'hotkeys'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          <span>Keyboard Hotkeys</span>
        </button>

        <button
          onClick={() => setActiveTab('dine_in')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'dine_in'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Dine-In & Tables</span>
        </button>

        <button
          onClick={() => setActiveTab('counter')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'counter'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Takeaway & Fast Billing</span>
        </button>

        <button
          onClick={() => setActiveTab('printing')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'printing'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Thermal Printing Hardware</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>System Configuration</span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'upcoming'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-orange-600" />
          <span>Upcoming Features</span>
          <span className="px-1.5 py-0.2 bg-orange-600 text-white text-[9px] font-black rounded-full">3</span>
        </button>
      </div>

      {/* TAB 1: KEYBOARD HOTKEYS */}
      {activeTab === 'hotkeys' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Keyboard className="w-4 h-4 text-red-600" />
                <span>0-Lag Cashier Shortcuts (Mac & Windows Compatible)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Single-letter hotkeys are active when not typing inside input boxes. Press Esc to clear focus anytime.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrintThermalHotkeys}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs rounded-lg shadow-2xs transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap border border-slate-800"
                title="Print Hotkey Cheatsheet / Sticker"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Print Shortcuts</span>
              </button>

              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shortcuts..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredHotkeys.map((hk, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-red-300 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-slate-900 text-amber-400 font-mono text-xs font-extrabold rounded-md shadow-inner tracking-wider border border-slate-800">
                    {hk.key}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {hk.context}
                  </span>
                </div>
                <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{hk.action}</div>
                <p className="text-xs text-slate-500 leading-normal">{hk.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: DINE-IN & TABLES */}
      {activeTab === 'dine_in' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Utensils className="w-5 h-5 text-red-600" />
              <span>Dine-In Table Management & Order Rounds</span>
            </h3>
            <p className="text-xs text-slate-500">
              How to manage floor sections, seat guests, add multiple KOT rounds, and generate final bills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-xs text-slate-900">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Opening Table & Seating Guests</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                From the <strong>Table Floor Plan</strong>, click on any vacant table (grey). Select number of guests and assigned waiter to open a fresh session. The table turns active (emerald green).
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-xs text-slate-900">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">2</span>
                <span>Adding KOT Order Rounds</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click menu items to populate the active order cart. Press <strong className="text-slate-900">[K]</strong> or click <strong>Dispatch KOT</strong>. The items are sent directly to kitchen printers and the cart clears for subsequent rounds.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-xs text-slate-900">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">3</span>
                <span>Table Transfer & Bill Splitting</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                To move guests to another table, use the <strong>Shift Table</strong> option in table actions. For large parties wanting separate invoices, click <strong>Split Bill</strong> to partition items per guest.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-xs text-slate-900">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">4</span>
                <span>Final Billing & Settlement</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Press <strong className="text-slate-900">[B]</strong> or click <strong>Save & Bill</strong>. Choose payment method (Cash, UPI/QR, Card, Credit/Due). Completing payment closes the session and frees up the table.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TAKEAWAY & FAST BILLING */}
      {activeTab === 'counter' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-red-600" />
              <span>Takeaway Counter & Express Checkout</span>
            </h3>
            <p className="text-xs text-slate-500">
              Optimized 3-second counter billing for high-volume takeaway and delivery orders.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <Zap className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <div className="font-bold">Fast-Track Counter Billing Sequence:</div>
                <div className="font-mono text-[11px] text-amber-800">
                  [S] Search Item ➔ Select Item ➔ [Space] Quick Cash Pay ➔ [Enter] Print Thermal Receipt
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-xs text-slate-900">Direct Takeaway</div>
                <p className="text-xs text-slate-500">No table session required. Cart converts directly into a takeaway order token with sequence number.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-xs text-slate-900">Customer Attach</div>
                <p className="text-xs text-slate-500">Search customer mobile number to auto-apply loyalty points or send WhatsApp receipt link.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-xs text-slate-900">UPI Dynamic QR</div>
                <p className="text-xs text-slate-500">Displays dynamic customer-facing UPI QR code on checkout screen for instant PhonePe/GooglePay payment.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: THERMAL PRINTING & KDS */}
      {activeTab === 'printing' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Printer className="w-5 h-5 text-red-600" />
              <span>Thermal Printing Hardware & Dual KDS Routing</span>
            </h3>
            <p className="text-xs text-slate-500">
              How WebRajya routes KOTs to specific kitchen printers based on item categories (e.g. Bar vs Main Kitchen).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-xs text-slate-900 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Thermal Hardware Drivers</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                WebRajya supports ESC/POS thermal printers over USB, Serial, and Network Ethernet (TCP/IP 9100). Printers are managed under <strong>Settings ➔ Thermal Hardware Routing</strong>.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-xs text-slate-900 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Multi-Station Category Routing</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Items tagged as Beverages route automatically to the Bar Printer, while Food items print on the Kitchen Printer. Duplicate KOT tickets can be printed for supervisor review.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SYSTEM CONFIGURATION */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-red-600" />
              <span>System Settings, Tax & Security Roles</span>
            </h3>
            <p className="text-xs text-slate-500">
              Managing restaurant identity, tax rates (GST / VAT), service charges, and cashier permissions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-xs text-slate-900">Restaurant Profile</div>
              <p className="text-xs text-slate-500">Business name, FSSAI License number, address, contact phone, and tax GSTIN header on receipts.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-xs text-slate-900">Tax & Discounts</div>
              <p className="text-xs text-slate-500">Default CGST/SGST rates, discount capping rules, and optional service charge percentage.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-xs text-slate-900">User Access & Security</div>
              <p className="text-xs text-slate-500">Manager override authorization for bill cancellations, item discounts, and stock inventory edits.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: UPCOMING FEATURES */}
      {activeTab === 'upcoming' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-orange-600" />
              <span>WebRajya POS v2.0 — Upcoming Product Roadmap</span>
            </h3>
            <p className="text-xs text-slate-500">
              Features currently scheduled for release in upcoming software updates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2 relative overflow-hidden">
              <span className="px-2 py-0.5 bg-orange-600 text-white text-[9px] font-black uppercase rounded-full tracking-wider">
                COMING SOON
              </span>
              <h4 className="font-extrabold text-slate-900 text-sm">Contactless QR Table Ordering</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Guest mobile phone self-ordering. Guests scan dining table QR stickers to browse digital menus, customize food orders, and dispatch KOT rounds directly to kitchen printers.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="px-2 py-0.5 bg-slate-800 text-amber-300 text-[9px] font-black uppercase rounded-full tracking-wider">
                PLANNED
              </span>
              <h4 className="font-extrabold text-slate-900 text-sm">WhatsApp Paperless Receipts</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Send green, paperless digital invoices directly to customer mobile numbers via WhatsApp API with 1 click.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="px-2 py-0.5 bg-slate-800 text-amber-300 text-[9px] font-black uppercase rounded-full tracking-wider">
                PLANNED
              </span>
              <h4 className="font-extrabold text-slate-900 text-sm">Custom Item Preparation Modifiers</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Fast kitchen instruction pop-ups for spice levels (*Mild/Spicy*), dietary notes (*Jain/No Garlic*), and item add-ons (*Extra Cheese +₹30*).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
