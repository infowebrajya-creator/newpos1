import { PrinterAdapter } from './printerAdapter';
import { BillPrintDocument, KotPrintDocument, PrinterConfig, PrintResult } from '@/types/printing';
import { formatEscposBill, formatEscposKot } from './escpos/escposFormatter';

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      getPrinters: () => Promise<any[]>;
      printSilent: (options: { deviceName?: string; silent?: boolean; copies?: number }) => Promise<{ success: boolean; error?: string }>;
      openCashDrawer: () => Promise<{ success: boolean; message?: string }>;
      toggleFullscreen: () => Promise<boolean>;
    };
  }
}

export class ElectronPrinterAdapter implements PrinterAdapter {
  async printBill(doc: BillPrintDocument, config: PrinterConfig): Promise<PrintResult> {
    const rawText = formatEscposBill(doc, config);

    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.printSilent({
          deviceName: config.billPrinterName || '',
          silent: true,
          copies: config.copies || 1,
        });

        if (res.success) {
          return {
            success: true,
            message: `Bill #${doc.billNumber} printed silently on Electron thermal printer (${config.billPrinterName || 'Default'})`,
            rawCommands: rawText,
          };
        } else {
          return {
            success: false,
            message: `Electron silent print error: ${res.error || 'Unknown error'}`,
            rawCommands: rawText,
          };
        }
      } catch (err: any) {
        return {
          success: false,
          message: `Failed to communicate with Electron IPC printer: ${err.message}`,
          rawCommands: rawText,
        };
      }
    }

    return {
      success: false,
      message: 'Electron API is not available in non-Electron browser window.',
      rawCommands: rawText,
    };
  }

  async printKot(doc: KotPrintDocument, config: PrinterConfig): Promise<PrintResult> {
    const rawText = formatEscposKot(doc, config);

    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const res = await window.electronAPI.printSilent({
          deviceName: config.kitchenPrinterName || '',
          silent: true,
          copies: config.copies || 1,
        });

        if (res.success) {
          return {
            success: true,
            message: `KOT #${doc.kotNumber} printed silently on Kitchen thermal printer (${config.kitchenPrinterName || 'Default'})`,
            rawCommands: rawText,
          };
        } else {
          return {
            success: false,
            message: `Electron silent KOT print error: ${res.error || 'Unknown error'}`,
            rawCommands: rawText,
          };
        }
      } catch (err: any) {
        return {
          success: false,
          message: `Failed to communicate with Electron IPC printer: ${err.message}`,
          rawCommands: rawText,
        };
      }
    }

    return {
      success: false,
      message: 'Electron API is not available in non-Electron browser window.',
      rawCommands: rawText,
    };
  }

  async testConnection(config: PrinterConfig): Promise<PrintResult> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const printers = await window.electronAPI.getPrinters();
      return {
        success: true,
        message: `Electron Native Printer Adapter Ready! Found ${printers.length} local system printer(s).`,
        rawCommands: JSON.stringify(printers, null, 2),
      };
    }

    return {
      success: false,
      message: 'Electron API is not present.',
    };
  }
}
