import { PrinterAdapter } from './printerAdapter';
import { BillPrintDocument, KotPrintDocument, PrintResult, PrinterConfig } from '@/types/printing';
import { formatEscposBill, formatEscposKot } from './escpos/escposFormatter';

/**
 * Local Print Service Adapter for production deployments (e.g. Vercel web app -> local receipt printer daemon).
 * Posts raw receipt text or formatted print jobs to a local print daemon (e.g., http://localhost:9100/print).
 */
export class LocalPrintServiceAdapter implements PrinterAdapter {
  async printBill(document: BillPrintDocument, config: PrinterConfig): Promise<PrintResult> {
    const rawText = formatEscposBill(document, config);

    try {
      const response = await fetch(`${config.localServiceUrl}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          printerName: config.billPrinterName,
          type: 'bill',
          copies: config.copies,
          autoCut: config.autoCut,
          documentId: document.billId,
          content: rawText,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          message: `Local print service error (${response.status}): ${errText || 'Printer rejected print job'}`,
          rawCommands: rawText,
        };
      }

      const resData = await response.json().catch(() => ({}));
      return {
        success: true,
        message: resData.message || `Bill #${document.billNumber} sent to printer '${config.billPrinterName}'.`,
        rawCommands: rawText,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Printer service unavailable at ${config.localServiceUrl}. Check local printer service daemon and try again.`,
        rawCommands: rawText,
      };
    }
  }

  async printKot(document: KotPrintDocument, config: PrinterConfig): Promise<PrintResult> {
    const rawText = formatEscposKot(document, config);

    try {
      const response = await fetch(`${config.localServiceUrl}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          printerName: config.kitchenPrinterName,
          type: 'kot',
          copies: config.copies,
          autoCut: config.autoCut,
          documentId: document.kotId,
          content: rawText,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          message: `Local print service error (${response.status}): ${errText || 'Kitchen printer rejected print job'}`,
          rawCommands: rawText,
        };
      }

      const resData = await response.json().catch(() => ({}));
      return {
        success: true,
        message: resData.message || `KOT #${document.kotNumber} sent to printer '${config.kitchenPrinterName}'.`,
        rawCommands: rawText,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Printer service unavailable at ${config.localServiceUrl}. Check local printer service daemon and try again.`,
        rawCommands: rawText,
      };
    }
  }

  async testConnection(config: PrinterConfig): Promise<PrintResult> {
    try {
      const response = await fetch(`${config.localServiceUrl}/status`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Local print service responded with error status ${response.status}`,
        };
      }

      return {
        success: true,
        message: `Connected to local print service at ${config.localServiceUrl}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Cannot reach local print service at ${config.localServiceUrl}. Ensure local printer service is running.`,
      };
    }
  }
}
