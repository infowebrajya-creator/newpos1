import { BillPrintDocument, KotPrintDocument, PrinterConfig } from '@/types/printing';

/**
 * Get line width based on paper configuration (32 chars for 58mm, 48 chars for 80mm)
 */
function getLineWidth(paperWidth: string): number {
  return paperWidth === '58mm' ? 32 : 48;
}

/**
 * Pad a string to fit exact width
 */
function padCenter(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const totalPad = width - text.length;
  const leftPad = Math.floor(totalPad / 2);
  const rightPad = totalPad - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}

function padRightLeft(left: string, right: string, width: number): string {
  const total = width;
  const rightLen = right.length;
  const maxLeftLen = total - rightLen - 1;
  const truncatedLeft = left.length > maxLeftLen ? left.slice(0, maxLeftLen) : left;
  const spaces = total - truncatedLeft.length - rightLen;
  return truncatedLeft + ' '.repeat(Math.max(1, spaces)) + right;
}

function padThreeColumns(col1: string, col2: string, col3: string, width: number): string {
  // e.g. 58mm (32 cols): 18 chars col1, 5 chars col2, 9 chars col3
  // e.g. 80mm (48 cols): 28 chars col1, 7 chars col2, 13 chars col3
  const col2Width = width === 32 ? 5 : 7;
  const col3Width = width === 32 ? 9 : 13;
  const col1Width = width - col2Width - col3Width;

  const c1 = col1.length > col1Width ? col1.slice(0, col1Width) : col1.padEnd(col1Width);
  const c2 = col2.padStart(col2Width);
  const c3 = col3.padStart(col3Width);

  return c1 + c2 + c3;
}

/**
 * Format a Bill document into clean thermal receipt text (ESC/POS preview text)
 */
export function formatEscposBill(doc: BillPrintDocument, config: PrinterConfig): string {
  const width = getLineWidth(config.paperWidth);
  const borderDouble = '='.repeat(width);
  const borderSingle = '-'.repeat(width);

  const lines: string[] = [];

  if (doc.isReprint) {
    lines.push(padCenter('*** REPRINT ***', width));
    lines.push(borderSingle);
  }

  // Restaurant Header
  lines.push(padCenter(doc.restaurantName.toUpperCase(), width));
  if (doc.legalName) lines.push(padCenter(doc.legalName, width));
  if (doc.address) lines.push(padCenter(doc.address, width));
  if (doc.phone) lines.push(padCenter(`Tel: ${doc.phone}`, width));
  if (doc.gstin && doc.taxEnabled) lines.push(padCenter(`GSTIN: ${doc.gstin}`, width));
  if (doc.fssaiLicense) lines.push(padCenter(`FSSAI: ${doc.fssaiLicense}`, width));
  if (doc.receiptHeader) lines.push(padCenter(doc.receiptHeader, width));

  lines.push(borderDouble);

  // Metadata
  lines.push(padRightLeft(`Bill No: ${doc.billNumber}`, `Table: ${doc.tableNumber}`, width));
  lines.push(padRightLeft(`Date: ${doc.date}`, `Time: ${doc.time}`, width));
  if (doc.guestCount > 0) {
    lines.push(`Guests: ${doc.guestCount}`);
  }

  lines.push(borderSingle);

  // Items Header
  lines.push(padThreeColumns('ITEM', 'QTY', 'AMOUNT', width));
  lines.push(borderSingle);

  // Item Lines
  doc.items.forEach((item) => {
    const qtyStr = item.quantity.toString();
    const amtStr = item.isComplimentary ? 'COMP' : `₹${item.lineTotal.toFixed(2)}`;
    lines.push(padThreeColumns(item.name, qtyStr, amtStr, width));
  });

  lines.push(borderSingle);

  // Financial Totals
  lines.push(padRightLeft('Subtotal', `₹${doc.subtotal.toFixed(2)}`, width));

  if (doc.discountAmount > 0) {
    lines.push(padRightLeft('Discount', `-₹${doc.discountAmount.toFixed(2)}`, width));
  }

  // Tax ONLY if tax is explicitly enabled in restaurant settings
  if (doc.taxEnabled && doc.taxAmount > 0) {
    lines.push(padRightLeft('Tax', `₹${doc.taxAmount.toFixed(2)}`, width));
  }

  if (doc.roundingAmount !== 0) {
    lines.push(padRightLeft('Rounding', `₹${doc.roundingAmount.toFixed(2)}`, width));
  }

  lines.push(borderDouble);
  lines.push(padRightLeft('GRAND TOTAL', `₹${doc.grandTotal.toFixed(2)}`, width));
  lines.push(borderDouble);

  // Payment method info if paid
  if (doc.paymentMethod) {
    lines.push(padRightLeft('Payment Method', doc.paymentMethod.toUpperCase(), width));
    if (doc.paidAmount != null) {
      lines.push(padRightLeft('Amount Paid', `₹${doc.paidAmount.toFixed(2)}`, width));
    }
    lines.push(borderSingle);
  }

  // Footer
  lines.push(padCenter(doc.receiptFooter || 'THANK YOU! VISIT AGAIN', width));
  lines.push('\n\n');

  return lines.join('\n');
}

/**
 * Format a KOT document into clean thermal receipt text
 */
export function formatEscposKot(doc: KotPrintDocument, config: PrinterConfig): string {
  const width = getLineWidth(config.paperWidth);
  const borderDouble = '='.repeat(width);
  const borderSingle = '-'.repeat(width);

  const lines: string[] = [];

  if (doc.isReprint) {
    lines.push(padCenter('*** KOT REPRINT ***', width));
    lines.push(borderSingle);
  }

  // KOT Header
  lines.push(padCenter('KITCHEN ORDER TICKET (KOT)', width));
  lines.push(borderDouble);

  lines.push(padRightLeft(`KOT No: ${doc.kotNumber}`, `Table: ${doc.tableNumber}`, width));
  lines.push(padRightLeft(`Date: ${doc.date}`, `Time: ${doc.time}`, width));
  if (doc.roundNumber) {
    lines.push(`Order Round: #${doc.roundNumber}`);
  }
  if (doc.floorName) {
    lines.push(`Floor: ${doc.floorName}`);
  }

  lines.push(borderSingle);

  // Items Header
  lines.push(padRightLeft('ITEM NAME', 'QTY', width));
  lines.push(borderSingle);

  // Items
  doc.items.forEach((item) => {
    lines.push(padRightLeft(item.name, `${item.quantity}`, width));
    if (item.itemNote) {
      lines.push(`  * Note: ${item.itemNote}`);
    }
  });

  lines.push(borderSingle);

  if (doc.notes) {
    lines.push(`Kitchen Notes: ${doc.notes}`);
    lines.push(borderSingle);
  }

  lines.push('\n\n');

  return lines.join('\n');
}
