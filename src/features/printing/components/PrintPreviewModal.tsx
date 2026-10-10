'use client';

import React, { useState } from 'react';
import { BillPrintDocument, KotPrintDocument, PrintResult } from '@/types/printing';
import { formatEscposBill, formatEscposKot } from '@/services/printing/escpos/escposFormatter';
import { generateBillHtml, generateKotHtml } from '@/services/printing/html/htmlReceiptFormatter';
import { printBill, printKot, getPrinterConfig } from '@/services/printing/printService';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  billDocument?: BillPrintDocument | null;
  kotDocument?: KotPrintDocument | null;
  onPrinted?: (result: PrintResult) => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  billDocument,
  kotDocument,
  onPrinted,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<PrintResult | null>(null);
  const [viewMode, setViewMode] = useState<'html' | 'escpos'>('html');

  if (!isOpen || (!billDocument && !kotDocument)) {
    return null;
  }

  const config = getPrinterConfig();
  const rawPreviewText = billDocument
    ? formatEscposBill(billDocument, config)
    : kotDocument
    ? formatEscposKot(kotDocument, config)
    : '';

  const htmlPreviewText = billDocument
    ? generateBillHtml(billDocument, config)
    : kotDocument
    ? generateKotHtml(kotDocument, config)
    : '';

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatus(null);
    try {
      let res: { result: PrintResult };
      if (billDocument) {
        res = await printBill(billDocument.billId, billDocument.isReprint);
      } else if (kotDocument) {
        res = await printKot(kotDocument.kotId, kotDocument.isReprint);
      } else {
        return;
      }

      setPrintStatus(res.result);
      if (onPrinted) {
        onPrinted(res.result);
      }

      if (res.result.success) {
        onClose();
      }
    } catch (err: any) {
      setPrintStatus({
        success: false,
        message: err.message || 'An unexpected error occurred while printing.',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-xl max-w-md w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-stone-800">
          <div>
            <h3 className="text-lg font-bold text-amber-400">
              {billDocument
                ? billDocument.isReprint
                  ? 'Reprint Bill Preview'
                  : 'Bill Print Preview'
                : kotDocument?.isReprint
                ? 'Reprint KOT Preview'
                : 'KOT Print Preview'}
            </h3>
            <p className="text-xs text-stone-400">
              Provider: <span className="text-stone-200 font-mono uppercase">{config.provider}</span> ({config.paperWidth})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-100 text-xl font-bold p-1 rounded-lg hover:bg-stone-800 transition"
          >
            ✕
          </button>
        </div>

        {/* View Mode Toggle Tabs */}
        <div className="flex bg-stone-950 p-1 rounded-lg border border-stone-800 mt-3 text-xs font-bold">
          <button
            type="button"
            onClick={() => setViewMode('html')}
            className={`flex-1 py-1.5 rounded-md transition ${
              viewMode === 'html'
                ? 'bg-amber-400 text-stone-950 shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            HTML Thermal Preview
          </button>
          <button
            type="button"
            onClick={() => setViewMode('escpos')}
            className={`flex-1 py-1.5 rounded-md transition ${
              viewMode === 'escpos'
                ? 'bg-amber-400 text-stone-950 shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            ESC/POS Plain Text
          </button>
        </div>

        {/* Status Alert if any */}
        {printStatus && (
          <div
            className={`mt-3 p-3 rounded-lg text-xs font-medium border ${
              printStatus.success
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/50 border-rose-800 text-rose-300'
            }`}
          >
            {printStatus.message}
          </div>
        )}

        {/* Receipt Simulation View */}
        {viewMode === 'html' ? (
          <div className="my-4 flex-1 overflow-y-auto bg-stone-950 p-4 rounded-md flex justify-center shadow-inner border border-stone-800">
            <div
              className="bg-white text-black p-2 rounded shadow select-text"
              dangerouslySetInnerHTML={{ __html: htmlPreviewText }}
            />
          </div>
        ) : (
          <div className="my-4 flex-1 overflow-y-auto bg-stone-950 text-amber-200 p-4 rounded-md font-mono text-xs shadow-inner border border-stone-800 whitespace-pre leading-relaxed select-text">
            {rawPreviewText}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-stone-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-lg transition"
          >
            Close
          </button>

          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 active:scale-95 disabled:opacity-50 rounded-lg shadow-lg shadow-amber-500/10 transition flex items-center gap-2"
          >
            {isPrinting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-stone-950" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Sending to Printer...</span>
              </>
            ) : (
              <>
                <span>🖨️ Send to Printer</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
