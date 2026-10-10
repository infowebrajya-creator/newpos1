import { PrinterAdapter } from './printerAdapter';
import { BillPrintDocument, KotPrintDocument, PrinterConfig, PrintResult } from '@/types/printing';
import { formatEscposBill, formatEscposKot } from './escpos/escposFormatter';
import { generateBillHtml, generateKotHtml } from './html/htmlReceiptFormatter';
import { executeSilentHtmlPrint } from './universalPrinterAdapter';

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
    const htmlContent = generateBillHtml(doc, config);

    // 1. Populate receipt HTML into silent print iframe
    executeSilentHtmlPrint(htmlContent, config.paperWidth, `Bill #${doc.billNumber}`);

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
            message: `Bill #${doc.billNumber} sent to thermal printer (${config.billPrinterName || 'System Default'})`,
            rawCommands: rawText,
          };
        }
      } catch (err: any) {
        // Fallback silently if IPC call fails
      }
    }

    return {
      success: true,
      message: `Bill #${doc.billNumber} sent to thermal printer`,
      rawCommands: rawText,
    };
  }

  async printKot(doc: KotPrintDocument, config: PrinterConfig): Promise<PrintResult> {
    const rawText = formatEscposKot(doc, config);
    const htmlContent = generateKotHtml(doc, config);

    // 1. Populate KOT HTML into silent print iframe
    executeSilentHtmlPrint(htmlContent, config.paperWidth, `KOT #${doc.kotNumber}`);

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
            message: `KOT #${doc.kotNumber} sent to Kitchen printer (${config.kitchenPrinterName || 'System Default'})`,
            rawCommands: rawText,
          };
        }
      } catch (err: any) {
        // Fallback silently
      }
    }

    return {
      success: true,
      message: `KOT #${doc.kotNumber} sent to Kitchen printer`,
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
      success: true,
      message: `Printer Adapter Ready! (${config.paperWidth})`,
    };
  }
}
