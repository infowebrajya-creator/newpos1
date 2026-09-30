import { PrinterAdapter } from './printerAdapter';
import { BillPrintDocument, KotPrintDocument, PrintResult, PrinterConfig } from '@/types/printing';
import { formatEscposBill, formatEscposKot } from './escpos/escposFormatter';

/**
 * Mock printer adapter for local development and testing.
 * Does not require any physical hardware or local service daemon.
 */
export class MockPrinterAdapter implements PrinterAdapter {
  async printBill(document: BillPrintDocument, config: PrinterConfig): Promise<PrintResult> {
    const rawText = formatEscposBill(document, config);
    console.log('[MOCK PRINTER - BILL PRINT]\n' + rawText);
    
    // Simulate short network latency
    await new Promise((resolve) => setTimeout(resolve, 400));

    return {
      success: true,
      message: `[Mock Printer] Bill #${document.billNumber} successfully sent to mock printer.`,
      rawCommands: rawText,
    };
  }

  async printKot(document: KotPrintDocument, config: PrinterConfig): Promise<PrintResult> {
    const rawText = formatEscposKot(document, config);
    console.log('[MOCK PRINTER - KOT PRINT]\n' + rawText);

    await new Promise((resolve) => setTimeout(resolve, 400));

    return {
      success: true,
      message: `[Mock Printer] KOT #${document.kotNumber} successfully sent to mock printer.`,
      rawCommands: rawText,
    };
  }

  async testConnection(config: PrinterConfig): Promise<PrintResult> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const testReceipt = [
      '================================',
      '        WEBRAJYA POS',
      '      TEST PRINT SUCCESS',
      '================================',
      `Provider: MOCK`,
      `Paper Width: ${config.paperWidth}`,
      `Auto Cut: ${config.autoCut ? 'Enabled' : 'Disabled'}`,
      `Timestamp: ${new Date().toLocaleString()}`,
      '================================',
    ].join('\n');

    console.log('[MOCK PRINTER - TEST CONNECTION]\n' + testReceipt);

    return {
      success: true,
      message: 'Mock printer connection verified successfully.',
      rawCommands: testReceipt,
    };
  }
}
