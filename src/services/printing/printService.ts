import { PrinterConfig, PrintResult, PrinterProviderType, BillPrintDocument, KotPrintDocument } from '@/types/printing';
import { PrinterAdapter } from './printerAdapter';
import { MockPrinterAdapter } from './mockPrinterAdapter';
import { LocalPrintServiceAdapter } from './localPrintServiceAdapter';
import { buildBillPrintDocument, buildKotPrintDocument } from './printDocumentService';
import { createClient } from '@/lib/supabase/client';

import { UniversalPrinterAdapter } from './universalPrinterAdapter';
import { ElectronPrinterAdapter } from './electronPrinterAdapter';

const PRINTER_CONFIG_KEY = 'webrajya_pos_printer_config';

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  provider: 'browser_print',
  localServiceUrl: 'http://localhost:9100',
  paperWidth: '80mm',
  autoCut: true,
  copies: 1,
  billPrinterName: 'Auto-Detected Universal Thermal Printer',
  kitchenPrinterName: 'Auto-Detected Universal Kitchen Printer',
};

/**
 * Retrieve current PrinterConfig from localStorage or defaults
 */
export function getPrinterConfig(): PrinterConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_PRINTER_CONFIG;
  }

  try {
    const stored = localStorage.getItem(PRINTER_CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(stored) };
    }
  } catch (err) {
    console.error('Failed to parse stored printer configuration:', err);
  }

  return DEFAULT_PRINTER_CONFIG;
}

/**
 * Save PrinterConfig to localStorage
 */
export function savePrinterConfig(config: PrinterConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRINTER_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save printer configuration:', err);
  }
}

/**
 * Instantiate appropriate PrinterAdapter
 */
export function getPrinterAdapter(provider?: PrinterProviderType): PrinterAdapter {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return new ElectronPrinterAdapter();
  }

  const activeProvider = provider || getPrinterConfig().provider;
  if (activeProvider === 'local_service') {
    return new LocalPrintServiceAdapter();
  }
  if (activeProvider === 'mock') {
    return new MockPrinterAdapter();
  }
  return new UniversalPrinterAdapter();
}

/**
 * Helper to record audit log for print events if audit_logs table exists
 */
async function logPrintAuditEvent(action: string, details: Record<string, any>) {
  try {
    const supabase = createClient();
    await supabase.from('audit_logs').insert({
      action,
      details,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Non-blocking audit log warning
  }
}

/**
 * Print a Bill by billId. Does NOT create or mutate business data.
 */
export async function printBill(
  billId: string,
  isReprint: boolean = false,
  overrideConfig?: PrinterConfig
): Promise<{ result: PrintResult; document: BillPrintDocument }> {
  const config = overrideConfig || getPrinterConfig();
  const adapter = getPrinterAdapter(config.provider);

  // 1. Build document from historical DB data
  const document = await buildBillPrintDocument(billId, isReprint);

  // 2. Send to adapter (handle multiple copies if configured)
  let lastResult: PrintResult = { success: false, message: 'Print initialization failed' };
  const numCopies = Math.max(1, config.copies);

  for (let i = 0; i < numCopies; i++) {
    lastResult = await adapter.printBill(document, config);
    if (!lastResult.success) break;
  }

  // 3. Log audit event
  logPrintAuditEvent(isReprint ? 'bill_reprinted' : 'bill_printed', {
    billId,
    billNumber: document.billNumber,
    success: lastResult.success,
    provider: config.provider,
  });

  return { result: lastResult, document };
}

/**
 * Print a KOT by kotId. Does NOT create or mutate business data.
 */
export async function printKot(
  kotId: string,
  isReprint: boolean = false,
  overrideConfig?: PrinterConfig
): Promise<{ result: PrintResult; document: KotPrintDocument }> {
  const config = overrideConfig || getPrinterConfig();
  const adapter = getPrinterAdapter(config.provider);

  // 1. Build document from historical DB data
  const document = await buildKotPrintDocument(kotId, isReprint);

  // 2. Send to adapter
  let lastResult: PrintResult = { success: false, message: 'Print initialization failed' };
  const numCopies = Math.max(1, config.copies);

  for (let i = 0; i < numCopies; i++) {
    lastResult = await adapter.printKot(document, config);
    if (!lastResult.success) break;
  }

  // 3. Log audit event
  logPrintAuditEvent(isReprint ? 'kot_reprinted' : 'kot_printed', {
    kotId,
    kotNumber: document.kotNumber,
    success: lastResult.success,
    provider: config.provider,
  });

  return { result: lastResult, document };
}

/**
 * Test printer connection safely without affecting business records
 */
export async function testPrinterConnection(overrideConfig?: PrinterConfig): Promise<PrintResult> {
  const config = overrideConfig || getPrinterConfig();
  const adapter = getPrinterAdapter(config.provider);
  return adapter.testConnection(config);
}
