import { BillPrintDocument, KotPrintDocument, PrinterConfig } from '@/types/printing';
import { numberToIndianRupees } from '@/utils/numberToWords';

/**
 * Get line width based on paper configuration:
 * 58mm = 32 chars
 * 80mm = 40 chars (or 48 chars)
 */
function getLineWidth(paperWidth: string): number {
  return paperWidth === '58mm' ? 32 : 40;
}

function padCenter(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const totalPad = width - text.length;
  const leftPad = Math.floor(totalPad / 2);
  const rightPad = totalPad - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}

function padRightLeft(left: string, right: string, width: number): string {
  const rightLen = right.length;
  const maxLeftLen = width - rightLen - 1;
  const truncatedLeft = left.length > maxLeftLen ? left.slice(0, maxLeftLen) : left;
  const spaces = width - truncatedLeft.length - rightLen;
  return truncatedLeft + ' '.repeat(Math.max(1, spaces)) + right;
}

/**
 * Format Customer Bill / Tax Invoice in Plain Text ESC/POS Monospaced Mode
 */
export function formatEscposBill(doc: BillPrintDocument, config: PrinterConfig): string {
  const width = getLineWidth(config.paperWidth);
  const borderDouble = '='.repeat(width);
  const borderDashed = '-'.repeat(width);

  const lines: string[] = [];

  // 1. Restaurant Branding Header
  if (doc.estdYear) {
    lines.push(padCenter(`ESTD. ${doc.estdYear}`, width));
  } else {
    lines.push(padCenter('ESTD. 1975', width));
  }

  lines.push(padCenter(doc.restaurantName.toUpperCase(), width));
  if (doc.legalName) {
    lines.push(padCenter(doc.legalName.toUpperCase(), width));
  }
  if (doc.address) {
    lines.push(padCenter(doc.address, width));
  }
  if (doc.phone) {
    lines.push(padCenter(`Phone: ${doc.phone}`, width));
  }
  if (doc.fssaiLicense) {
    lines.push(padCenter(`FSSAI No: ${doc.fssaiLicense}`, width));
  }
  if (doc.taxEnabled && doc.gstin) {
    lines.push(padCenter(`GSTIN: ${doc.gstin}`, width));
  }

  // Header Title Badge
  const badgeTitle = doc.isReprint
    ? '*** REPRINT INVOICE ***'
    : doc.taxEnabled
    ? '*** TAX INVOICE ***'
    : '*** BILL / RECEIPT ***';
  lines.push(padCenter(badgeTitle, width));
  lines.push(borderDashed);

  // 2. Metadata Lines
  const memoNum = doc.memoNumber || `SR-${doc.billNumber}`;
  const tableStr = doc.tableNumber ? doc.tableNumber : 'Table #01';

  // Format row 1: Memo#, Time, Date
  lines.push(padRightLeft(`Memo#: ${memoNum}  ${doc.time}`, doc.date, width));
  // Format row 2: User, Pax#, Table
  lines.push(padRightLeft(`User: ${doc.cashierName || 'Cashier'}  Pax#: ${doc.guestCount || 1}`, tableStr, width));
  // Format row 3: Order#, Cust
  lines.push(padRightLeft(`Order#: #${doc.orderNumber || doc.billNumber}`, `Cust: ${doc.customerName || 'Walk-in'}`, width));
  lines.push(borderDashed);

  // 3. Product Table Header
  if (width === 32) {
    // 58mm mode: ITEM (14) QTY (4) RATE (7) AMT (7)
    lines.push('ITEM          QTY   RATE     AMT');
  } else {
    // 80mm mode (40 cols): Sr  Product                  Qty     Rate      Amount
    lines.push('Sr  Product                  Qty     Rate      Amount');
  }
  lines.push(borderDashed);

  // 4. Product Table Rows
  let totalQty = 0;
  doc.items.forEach((item, idx) => {
    totalQty += item.quantity || 0;
    const sr = `${idx + 1}`.padEnd(2);
    const qtyStr = `${item.quantity}`.padStart(3);
    const rateStr = (item.isComplimentary ? 0 : item.unitPrice).toFixed(2).padStart(7);
    const amtStr = (item.isComplimentary ? 0 : item.lineTotal).toFixed(2).padStart(8);

    if (width === 32) {
      // 58mm string format
      const icon = item.isVeg !== false ? '□' : '▲';
      const nameStr = `${icon}${item.name}`;
      const truncName = nameStr.length > 12 ? nameStr.slice(0, 12) : nameStr.padEnd(12);
      lines.push(`${truncName} ${qtyStr} ${rateStr} ${amtStr}`);
    } else {
      // 80mm string format
      const icon = item.isVeg !== false ? '□' : '▲';
      const fullName = `${icon} ${item.name}`;
      const truncName = fullName.length > 20 ? fullName.slice(0, 20) : fullName.padEnd(20);
      lines.push(`${sr} ${truncName} ${qtyStr} ${rateStr} ${amtStr}`);
    }

    if (item.itemNote) {
      lines.push(`   + ${item.itemNote}`);
    }
  });

  // 5. Items Summary
  lines.push(borderDashed);
  lines.push(padRightLeft(`ITEMS QTY: ${totalQty}`, `TOTAL ITEMS: ${doc.items.length}`, width));
  lines.push(borderDashed);

  // 6. Financial Summary
  lines.push(padRightLeft('SUBTOTAL:', doc.subtotal.toFixed(2), width));
  if (doc.discountAmount > 0) {
    lines.push(padRightLeft('DISCOUNT:', `-${doc.discountAmount.toFixed(2)}`, width));
  }

  if (doc.taxEnabled && doc.taxAmount > 0) {
    const sgstRate = doc.sgstRate ?? 2.5;
    const cgstRate = doc.cgstRate ?? 2.5;
    const sgstAmt = doc.sgstAmount ?? (doc.taxAmount / 2);
    const cgstAmt = doc.cgstAmount ?? (doc.taxAmount / 2);

    lines.push(padRightLeft(`SGST (${sgstRate}%):`, sgstAmt.toFixed(2), width));
    lines.push(padRightLeft(`CGST (${cgstRate}%):`, cgstAmt.toFixed(2), width));
  }

  if (doc.roundingAmount !== 0) {
    const sign = doc.roundingAmount >= 0 ? '+' : '';
    lines.push(padRightLeft('ROUND OFF:', `${sign}${doc.roundingAmount.toFixed(2)}`, width));
  }

  lines.push(borderDouble);
  lines.push(padRightLeft('GRAND TOTAL:', `Rs. ${doc.grandTotal.toFixed(2)}`, width));
  lines.push(borderDouble);

  // 7. Amount in Words
  const words = numberToIndianRupees(doc.grandTotal);
  lines.push(`Amount in Words: ${words}`);
  lines.push(borderDashed);

  // 8. Payment Mode
  lines.push(padCenter(`PAYMENT MODE: ${(doc.paymentMethod || 'CASH').toUpperCase()} (PAID)`, width));
  lines.push(borderDashed);

  // 9. Footer Note
  lines.push(padCenter(doc.receiptHeader || 'Taste That Brings You Back!', width));
  lines.push(padCenter(doc.receiptFooter || 'Thank You! Visit Again', width));

  // 10. Thermal Feed Count (5 blank lines before paper cut)
  lines.push('\n\n\n\n\n');

  return lines.join('\n');
}

/**
 * Format KOT (Kitchen Order Ticket) in Plain Text ESC/POS Monospaced Mode
 */
export function formatEscposKot(doc: KotPrintDocument, config: PrinterConfig): string {
  const width = getLineWidth(config.paperWidth);
  const borderDouble = '='.repeat(width);
  const borderDashed = '-'.repeat(width);

  const lines: string[] = [];

  // 1. KOT Header
  const copyText = doc.copyIndex && doc.totalCopies
    ? ` (COPY ${doc.copyIndex} OF ${doc.totalCopies})`
    : '';
  lines.push(padCenter(`KOT: ${doc.kotNumber}${copyText}`, width));
  lines.push(borderDashed);

  // 2. Metadata Grid
  const tableDisplay = doc.tableNumber ? doc.tableNumber.replace(/^Table\s*/i, '') : '01';
  const orderNum = doc.orderNumber || doc.kotNumber;
  const queueToken = doc.queueToken || doc.orderNumber || doc.kotNumber;

  lines.push(padRightLeft(`Table: ${tableDisplay}`, `Order: #${orderNum}`, width));
  lines.push(padRightLeft(`Type: ${(doc.orderType || 'DINE-IN').toUpperCase()}`, `Captain: ${doc.captainName || 'Admin'}`, width));
  lines.push(padRightLeft(`Date: ${doc.date}`, `Time: ${doc.time}`, width));
  lines.push(borderDashed);

  // 3. Queue Token Highlight
  lines.push(padCenter('QUEUE TOKEN', width));
  lines.push(padCenter(`#${queueToken}`, width));
  lines.push(borderDashed);

  // 4. Badges
  if (doc.badges && doc.badges.length > 0) {
    lines.push(padCenter(`[ ${doc.badges.join(' ]   [ ')} ]`, width));
    lines.push(borderDashed);
  }

  // 5. Items Table Header
  lines.push(padRightLeft('QTY  KITCHEN PREP ITEM', '', width));
  lines.push(borderDashed);

  // 6. Items List
  doc.items.forEach((item) => {
    const isVeg = item.isVeg !== false;
    const symbolChar = isVeg ? '□' : '▲';
    const qtyStr = `${item.quantity}`.padStart(2);
    lines.push(`${qtyStr}   ${symbolChar} ${item.name}`);
    if (item.itemNote) {
      lines.push(`       + ${item.itemNote}`);
    }
  });

  lines.push(borderDashed);

  // 7. Special Kitchen Instructions
  if (doc.notes) {
    lines.push('KITCHEN INSTRUCTIONS:');
    lines.push(`"${doc.notes}"`);
    lines.push(borderDashed);
  }

  // 8. Footer
  const printedAtTime = doc.printedAt || doc.time;
  lines.push(padCenter(`KOT Printed At: ${printedAtTime}`, width));
  lines.push(padCenter(`KOT Print Count: ${doc.printCount || 1}`, width));
  lines.push(padCenter('*** KITCHEN COPY ONLY ***', width));

  // 9. Thermal Feed Count (3 blank lines before paper cut)
  lines.push('\n\n\n');

  return lines.join('\n');
}
