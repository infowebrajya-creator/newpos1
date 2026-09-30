import { BillPrintDocument, KotPrintDocument, PrintResult, PrinterConfig } from '@/types/printing';

/**
 * Provider-neutral printer adapter interface
 */
export interface PrinterAdapter {
  printBill(document: BillPrintDocument, config: PrinterConfig): Promise<PrintResult>;
  printKot(document: KotPrintDocument, config: PrinterConfig): Promise<PrintResult>;
  testConnection(config: PrinterConfig): Promise<PrintResult>;
}
