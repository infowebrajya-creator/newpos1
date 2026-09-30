'use client';

import React, { useState, useEffect } from 'react';
import { PrinterConfig, PrintResult } from '@/types/printing';
import { getPrinterConfig, savePrinterConfig, testPrinterConnection } from '@/services/printing/printService';
import { Printer, Save, CheckCircle2, AlertTriangle, Cpu, FileText, ChefHat, RefreshCw } from 'lucide-react';

import { autoDetectUsbPrinters } from '@/services/printing/universalPrinterAdapter';

interface PrinterConfigurationSectionProps {
  canEdit: boolean;
}

export function PrinterConfigurationSection({ canEdit }: PrinterConfigurationSectionProps) {
  const [config, setConfig] = useState<PrinterConfig>(getPrinterConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [isScanningUsb, setIsScanningUsb] = useState(false);
  const [testResult, setTestResult] = useState<PrintResult | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setConfig(getPrinterConfig());
  }, []);

  const handleSave = () => {
    if (!canEdit) return;
    savePrinterConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAutoDetectUsb = async () => {
    setIsScanningUsb(true);
    const res = await autoDetectUsbPrinters();
    setIsScanningUsb(false);
    if (res.success && res.deviceName) {
      const updated = {
        ...config,
        provider: 'browser_print' as const,
        billPrinterName: res.deviceName,
        kitchenPrinterName: `${res.deviceName} (Kitchen)`,
      };
      setConfig(updated);
      savePrinterConfig(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } else {
      alert(res.error || 'Failed to detect USB printer.');
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testPrinterConnection(config);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Printer test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Thermal Printer & KOT Hardware Configuration</h3>
            <p className="text-xs text-slate-500">Configure receipt ESC/POS printer routing, paper width & connection test</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleAutoDetectUsb}
            disabled={isScanningUsb}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Auto-Scan & Pair USB Thermal Printer"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{isScanningUsb ? 'Scanning USB...' : '🔍 Auto-Detect USB Printer'}</span>
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Printer Setup</span>
            </button>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Printer configuration saved to local workstation preferences!</span>
        </div>
      )}

      {/* Main Form Body */}
      <div className="space-y-4 text-xs">
        {/* Provider selection */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5">Printing Hardware Adapter Provider</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setConfig({ ...config, provider: 'browser_print' })}
              className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                config.provider === 'browser_print'
                  ? 'border-red-500 bg-red-50 text-red-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Universal Driver (100% Printers)</span>
                {config.provider === 'browser_print' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Auto-detects ALL USB, Bluetooth, Wi-Fi & Ethernet thermal printers (Epson, TVS, Xprinter, Everycom, Retsol, HOIN, Posiflex, etc.)</div>
            </button>

            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setConfig({ ...config, provider: 'local_service' })}
              className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                config.provider === 'local_service'
                  ? 'border-red-500 bg-red-50 text-red-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Local Print Service Daemon</span>
                {config.provider === 'local_service' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Connect to HTTP thermal print service daemon on localhost</div>
            </button>

            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setConfig({ ...config, provider: 'mock' })}
              className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                config.provider === 'mock'
                  ? 'border-red-500 bg-red-50 text-red-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Mock Adapter (Development)</span>
                {config.provider === 'mock' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">In-memory / console preview printer adapter for development</div>
            </button>
          </div>
        </div>

        {/* Local service URL */}
        {config.provider === 'local_service' && (
          <div>
            <label className="block font-bold text-slate-700 mb-1">Local Service Daemon URL</label>
            <input
              type="text"
              value={config.localServiceUrl}
              onChange={(e) => setConfig({ ...config, localServiceUrl: e.target.value })}
              disabled={!canEdit}
              placeholder="http://localhost:9100"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-mono text-xs focus:outline-none focus:border-red-500 disabled:bg-slate-50"
            />
          </div>
        )}

        {/* Paper Width */}
        <div>
          <label className="block font-bold text-slate-700 mb-1.5">Paper Receipt Roll Width</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setConfig({ ...config, paperWidth: '80mm' })}
              className={`p-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                config.paperWidth === '80mm'
                  ? 'border-red-500 bg-red-50 text-red-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              80mm (Standard POS Thermal Paper)
            </button>

            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setConfig({ ...config, paperWidth: '58mm' })}
              className={`p-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                config.paperWidth === '58mm'
                  ? 'border-red-500 bg-red-50 text-red-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              58mm (Compact Mobile Printer)
            </button>
          </div>
        </div>

        {/* Printer Names */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Bill Thermal Printer Name</span>
            </label>
            <input
              type="text"
              value={config.billPrinterName}
              onChange={(e) => setConfig({ ...config, billPrinterName: e.target.value })}
              disabled={!canEdit}
              placeholder="EPSON TM-T88VI or ReceiptPrinter"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-medium focus:outline-none focus:border-red-500 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <ChefHat className="w-3.5 h-3.5 text-slate-600" />
              <span>Kitchen KOT Printer Name</span>
            </label>
            <input
              type="text"
              value={config.kitchenPrinterName}
              onChange={(e) => setConfig({ ...config, kitchenPrinterName: e.target.value })}
              disabled={!canEdit}
              placeholder="KitchenPrinter1"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-medium focus:outline-none focus:border-red-500 disabled:bg-slate-50"
            />
          </div>
        </div>

        {/* Options: Copies & Auto Cut */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Default Copies</label>
            <input
              type="number"
              min="1"
              max="5"
              value={config.copies}
              onChange={(e) => setConfig({ ...config, copies: Math.max(1, parseInt(e.target.value) || 1) })}
              disabled={!canEdit}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-mono font-medium focus:outline-none focus:border-red-500 disabled:bg-slate-50"
            />
          </div>

          <div className="flex items-center space-x-2 pt-4">
            <input
              type="checkbox"
              id="autoCut"
              checked={config.autoCut}
              onChange={(e) => setConfig({ ...config, autoCut: e.target.checked })}
              disabled={!canEdit}
              className="w-4 h-4 accent-red-600 rounded border-slate-300 cursor-pointer"
            />
            <label htmlFor="autoCut" className="font-bold text-slate-800 cursor-pointer select-none">
              Auto-cut ESC/POS Paper Command
            </label>
          </div>
        </div>

        {/* Test Result Box */}
        {testResult && (
          <div
            className={`p-3 rounded-md text-xs font-semibold border ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
              <span>{testResult.message}</span>
            </div>
            {testResult.rawCommands && (
              <pre className="mt-2 p-2 bg-slate-900 text-slate-100 font-mono text-[10px] rounded overflow-x-auto max-h-32">
                {testResult.rawCommands}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
