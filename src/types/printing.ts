export type PrinterProviderType = 'browser_print' | 'web_usb' | 'local_service' | 'mock';

export type PaperWidth = '58mm' | '80mm';

export type PrintJobType = 'bill' | 'kot' | 'bill_reprint' | 'kot_reprint';

export type PrintJobStatus = 'queued' | 'printing' | 'printed' | 'failed' | 'cancelled';

export type PrinterRole = 'bill' | 'kitchen' | 'both';

export interface BillPrintItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isComplimentary?: boolean;
  isVeg?: boolean;
  itemNote?: string | null;
}

export interface BillPrintDocument {
  billId: string;
  billNumber: string;
  memoNumber?: string | null;
  date: string;
  time: string;
  tableNumber: string;
  guestCount: number;
  restaurantName: string;
  legalName?: string | null;
  estdYear?: string | null;
  address?: string | null;
  phone?: string | null;
  gstin?: string | null;
  fssaiLicense?: string | null;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  items: BillPrintItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  roundingAmount: number;
  grandTotal: number;
  paymentMethod?: string | null;
  paidAmount?: number | null;
  changeAmount?: number | null;
  customerName?: string | null;
  orderNumber?: string | null;
  cashierName?: string | null;
  isReprint: boolean;
  taxEnabled: boolean;
}

export interface KotPrintItem {
  name: string;
  quantity: number;
  itemNote?: string | null;
  isVeg?: boolean;
}

export interface KotPrintDocument {
  kotId: string;
  kotNumber: string;
  copyIndex?: number;
  totalCopies?: number;
  roundNumber?: number | null;
  date: string;
  time: string;
  tableNumber: string;
  orderNumber?: string | null;
  orderType?: string | null;
  captainName?: string | null;
  queueToken?: string | null;
  badges?: string[];
  floorName?: string | null;
  items: KotPrintItem[];
  notes?: string | null;
  printedAt?: string | null;
  printCount?: number;
  isReprint: boolean;
}

export interface PrintJob {
  id: string;
  type: PrintJobType;
  documentId: string;
  status: PrintJobStatus;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string | null;
}

export interface PrintResult {
  success: boolean;
  message: string;
  jobId?: string;
  rawCommands?: string;
}

export interface PrinterConfig {
  provider: PrinterProviderType;
  localServiceUrl: string;
  paperWidth: PaperWidth;
  autoCut: boolean;
  copies: number;
  billPrinterName: string;
  kitchenPrinterName: string;
}
