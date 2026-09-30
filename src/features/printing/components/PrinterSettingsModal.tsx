'use client';

import React, { useState, useEffect } from 'react';
import { PrinterConfig, PrintResult } from '@/types/printing';
import { getPrinterConfig, savePrinterConfig, testPrinterConnection } from '@/services/printing/printService';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<PrinterConfig>(getPrinterConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<PrintResult | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getPrinterConfig());
      setTestResult(null);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    savePrinterConfig(config);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  const handleTestConnection = async () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-stone-800">
          <div>
            <h3 className="text-lg font-bold text-amber-400">Thermal Printer Configuration</h3>
            <p className="text-xs text-stone-400">Configure receipt printer hardware routing and options</p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-100 text-xl font-bold p-1 rounded-lg hover:bg-stone-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Provider selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">Printing Provider</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfig({ ...config, provider: 'mock' })}
                className={`p-3 rounded-lg border text-xs font-medium text-left transition ${
                  config.provider === 'mock'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                    : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="font-bold mb-0.5">Mock Adapter (Development)</div>
                <div className="text-[10px] text-stone-500">In-memory / console preview printer adapter</div>
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, provider: 'local_service' })}
                className={`p-3 rounded-lg border text-xs font-medium text-left transition ${
                  config.provider === 'local_service'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                    : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="font-bold mb-0.5">Local Print Service</div>
                <div className="text-[10px] text-stone-500">Connect to local HTTP print service daemon</div>
              </button>
            </div>
          </div>

          {/* Local service URL if local_service */}
          {config.provider === 'local_service' && (
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Local Service URL</label>
              <input
                type="text"
                value={config.localServiceUrl}
                onChange={(e) => setConfig({ ...config, localServiceUrl: e.target.value })}
                placeholder="http://localhost:9100"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs font-mono text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Paper Width */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">Paper Receipt Width</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfig({ ...config, paperWidth: '80mm' })}
                className={`p-2.5 rounded-lg border text-xs font-medium transition ${
                  config.paperWidth === '80mm'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-bold'
                    : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                }`}
              >
                80mm (Standard POS)
              </button>

              <button
                type="button"
                onClick={() => setConfig({ ...config, paperWidth: '58mm' })}
                className={`p-2.5 rounded-lg border text-xs font-medium transition ${
                  config.paperWidth === '58mm'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-bold'
                    : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                }`}
              >
                58mm (Compact Mobile)
              </button>
            </div>
          </div>

          {/* Printer Names */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Bill Printer Name</label>
              <input
                type="text"
                value={config.billPrinterName}
                onChange={(e) => setConfig({ ...config, billPrinterName: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Kitchen Printer Name</label>
              <input
                type="text"
                value={config.kitchenPrinterName}
                onChange={(e) => setConfig({ ...config, kitchenPrinterName: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Options: Copies & Auto Cut */}
          <div className="grid grid-cols-2 gap-3 items-center pt-1">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Default Copies</label>
              <input
                type="number"
                min="1"
                max="5"
                value={config.copies}
                onChange={(e) => setConfig({ ...config, copies: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="autoCut"
                checked={config.autoCut}
                onChange={(e) => setConfig({ ...config, autoCut: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded bg-stone-950 border-stone-800"
              />
              <label htmlFor="autoCut" className="text-xs font-semibold text-stone-300 cursor-pointer">
                Auto-cut Paper
              </label>
            </div>
          </div>

          {/* Test connection output */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs font-medium border ${
                testResult.success
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-800 text-rose-300'
              }`}
            >
              <div>{testResult.message}</div>
              {testResult.rawCommands && (
                <pre className="mt-2 p-2 bg-stone-950 text-stone-300 font-mono text-[10px] rounded overflow-x-auto whitespace-pre">
                  {testResult.rawCommands}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-stone-800">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-3.5 py-2 text-xs font-semibold text-amber-300 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 rounded-lg transition flex items-center gap-2"
          >
            {isTesting ? 'Testing Connection...' : '🔌 Test Printer'}
          </button>

          <div className="flex items-center gap-2">
            {savedSuccess && <span className="text-xs font-bold text-emerald-400 animate-pulse">Saved!</span>}
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-lg shadow-amber-500/10 transition"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
