import { BillPrintDocument, KotPrintDocument, PrinterConfig } from '@/types/printing';
import { numberToIndianRupees } from '@/utils/numberToWords';

/**
 * Generate pixel-perfect HTML for Kitchen Order Ticket (KOT) based on 80mm / 58mm specs
 */
export function generateKotHtml(doc: KotPrintDocument, config: PrinterConfig): string {
  const is58mm = config.paperWidth === '58mm';
  const widthPx = is58mm ? '210px' : '290px';
  const paddingPx = is58mm ? '4px' : '8px';
  const baseFontSize = is58mm ? '11px' : '13px';
  const lineHeight = is58mm ? '1.18' : '1.25';

  const copyText = doc.copyIndex && doc.totalCopies
    ? ` (COPY ${doc.copyIndex} OF ${doc.totalCopies})`
    : '';

  const tableDisplay = doc.tableNumber ? doc.tableNumber.replace(/^Table\s*/i, '') : '01';
  const orderNum = doc.orderNumber || doc.kotNumber;
  const queueToken = doc.queueToken || doc.orderNumber || doc.kotNumber;

  // Badges
  const badgesList = doc.badges && doc.badges.length > 0 ? doc.badges : [];
  let badgesHtml = '';
  if (badgesList.length > 0) {
    const badgeSpans = badgesList.map((b) => {
      let color = '#22c55e'; // Green default
      const uppercaseB = b.toUpperCase();
      if (uppercaseB.includes('RUSH') || uppercaseB.includes('URGENT')) color = '#ea580c';
      if (uppercaseB.includes('CHEF') || uppercaseB.includes('SPECIAL')) color = '#a855f7';
      return `<span style="border: 1px solid ${color}; color: ${color}; padding: 1px 4px; font-size: ${is58mm ? '9px' : '10px'}; font-weight: bold; border-radius: 2px;">${uppercaseB}</span>`;
    }).join(' ');
    badgesHtml = `<div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-bottom: 6px;">${badgeSpans}</div>`;
  }

  // Items
  const itemsHtml = doc.items.map((item) => {
    const isVeg = item.isVeg !== false;
    const symbolColor = isVeg ? '#22c55e' : '#ef4444';
    const symbolChar = isVeg ? '□' : '▲';

    const noteHtml = item.itemNote
      ? `<div style="font-size: ${is58mm ? '10px' : '11px'}; font-weight: bold; font-style: italic; color: #000000; margin-top: 2px; padding-left: 14px;">+ ${item.itemNote}</div>`
      : '';

    return `
      <tr style="border-bottom: 1px dotted #000000; font-size: ${is58mm ? '11px' : '13px'};">
        <td style="padding: 6px 0; text-align: center; font-size: ${is58mm ? '14px' : '16px'}; font-weight: 900; vertical-align: top;">${item.quantity}</td>
        <td style="padding: 6px 0; vertical-align: top; font-weight: bold;">
          <span style="border: 1.5px solid ${symbolColor}; display: inline-flex; justify-content: center; align-items: center; width: 10px; height: 10px; font-size: 7px; color: ${symbolColor}; font-weight: bold; margin-right: 4px; vertical-align: middle;">${symbolChar}</span>${item.name}
          ${noteHtml}
        </td>
      </tr>
    `;
  }).join('');

  // Special instructions
  const instructionsHtml = doc.notes ? `
    <div style="border: 1px solid #000000; padding: 5px; margin: 6px 0; background: #fafaf9; border-radius: 3px;">
      <b style="font-size: ${is58mm ? '10px' : '11px'}; display: block; margin-bottom: 2px;">KITCHEN INSTRUCTIONS:</b>
      <span style="font-size: ${is58mm ? '11px' : '12px'}; font-style: italic; color: #e11d48; font-weight: bold;">"${doc.notes}"</span>
    </div>
  ` : '';

  const printedAtTime = doc.printedAt || doc.time;

  return `
<div style="
  width: ${widthPx};
  background: #ffffff;
  color: #000000;
  padding: ${paddingPx};
  box-sizing: border-box;
  font-family: 'Courier New', Courier, monospace;
  font-size: ${baseFontSize};
  font-weight: bold;
  line-height: ${lineHeight};
  text-align: left;
  border: 1px solid #000000;
  margin: 0 auto;
">
  <!-- Header -->
  <div style="text-align: center; text-transform: uppercase;">
    <div style="font-size: ${is58mm ? '12.5px' : '14.3px'}; font-weight: bold; margin-top: 2px;">
      KOT: ${doc.kotNumber}${copyText}
    </div>
  </div>
  <div style="border-bottom: 1px dashed #000000; margin: 6px 0;"></div>
  <!-- Metadata -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: ${is58mm ? '10.5px' : '12px'};">
    <div><b>Table:</b> <span style="font-size: ${is58mm ? '14px' : '16px'}; font-weight: 900; background: #e5e5e5; padding: 1px 4px; border-radius: 2px;">${tableDisplay}</span></div>
    <div style="text-align: right;"><b>Order:</b> #${orderNum}</div>
    <div><b>Type:</b> ${(doc.orderType || 'DINE-IN').toUpperCase()}</div>
    <div style="text-align: right;"><b>Captain:</b> ${doc.captainName || 'Admin'}</div>
    <div><b>Date:</b> ${doc.date}</div>
    <div style="text-align: right;"><b>Time:</b> ${doc.time}</div>
  </div>
  <div style="border-bottom: 1px dashed #000000; margin: 6px 0;"></div>
  <!-- Queue Token -->
  <div style="text-align: center; margin: 8px 0; padding: 4px; background: #fafaf9; border: 1px dashed #000000;">
    <span style="font-size: ${is58mm ? '10px' : '11px'}; font-weight: bold; display: block; letter-spacing: 1px; color: #000000;">QUEUE TOKEN</span>
    <span style="font-size: ${is58mm ? '19px' : '23px'}; font-weight: 950; letter-spacing: 2px;">#${queueToken}</span>
  </div>
  ${badgesHtml}
  <div style="border-bottom: 1px dashed #000000; margin: 6px 0;"></div>
  <!-- Items Table -->
  <table style="width: 100%; border-collapse: collapse; text-align: left;">
    <thead>
      <tr style="border-bottom: 1px solid #000000; font-weight: bold; font-size: ${is58mm ? '10.5px' : '12px'};">
        <th style="padding: 3px 0; width: 15%; text-align: center;">QTY</th>
        <th style="padding: 3px 0; width: 85%;">KITCHEN PREP ITEM</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  <div style="border-bottom: 1px dashed #000000; margin: 6px 0;"></div>
  ${instructionsHtml}
  <!-- Footer -->
  <div style="text-align: center; font-size: ${is58mm ? '10px' : '11px'}; margin-top: 8px; color: #000000; font-weight: bold;">
    <div>KOT Printed At: ${printedAtTime}</div>
    <div>KOT Print Count: ${doc.printCount || 1}</div>
    <div style="font-weight: bold; margin-top: 4px; letter-spacing: 1px;">*** KITCHEN COPY ONLY ***</div>
  </div>
</div>
  `.trim();
}

/**
 * Generate pixel-perfect HTML for Customer Bill / Tax Invoice based on 80mm / 58mm specs
 */
export function generateBillHtml(doc: BillPrintDocument, config: PrinterConfig): string {
  const is58mm = config.paperWidth === '58mm';
  const widthPx = is58mm ? '210px' : '290px';
  const paddingPx = is58mm ? '4px' : '8px';
  const baseFontSize = is58mm ? '10.5px' : '12.5px';
  const lineHeight = is58mm ? '1.15' : '1.22';

  const totalQty = doc.items.reduce((acc, it) => acc + (it.quantity || 0), 0);
  const amountInWords = numberToIndianRupees(doc.grandTotal);

  // Tax calculations
  const totalTax = doc.taxAmount || 0;
  const sgstRate = doc.sgstRate ?? 2.5;
  const cgstRate = doc.cgstRate ?? 2.5;
  const sgstAmt = doc.sgstAmount ?? (totalTax / 2);
  const cgstAmt = doc.cgstAmount ?? (totalTax / 2);

  const memoNum = doc.memoNumber || `SR-${doc.billNumber}`;
  const tableDisplay = doc.tableNumber ? doc.tableNumber : 'Table #01';
  const orderNum = doc.orderNumber || doc.billNumber;

  const billItemsHtml = doc.items.map((item, idx) => {
    const isVeg = item.isVeg !== false;
    const symbolColor = isVeg ? '#22c55e' : '#ef4444';
    const symbolChar = isVeg ? '□' : '▲';

    const noteHtml = item.itemNote
      ? `<div style="font-size: ${is58mm ? '9px' : '10px'}; font-style: italic; color: #444; margin-top: 1px; padding-left: 10px;">+ ${item.itemNote}</div>`
      : '';

    const rateStr = item.isComplimentary ? '0.00' : item.unitPrice.toFixed(2);
    const amtStr = item.isComplimentary ? '0.00' : item.lineTotal.toFixed(2);

    return `
      <tr style="border-bottom: 1px dotted #000000; font-size: ${is58mm ? '10.5px' : '12.5px'};">
        <td style="padding: 4px 0; vertical-align: top; text-align: left;">${idx + 1}</td>
        <td style="padding: 4px 0; vertical-align: top; word-break: break-word; font-weight: bold;">
          <span style="border: 1.5px solid ${symbolColor}; display: inline-flex; justify-content: center; align-items: center; width: 8px; height: 8px; font-size: 6px; color: ${symbolColor}; font-weight: bold; margin-right: 3px; vertical-align: middle;">${symbolChar}</span>${item.name}
          ${noteHtml}
        </td>
        <td style="padding: 4px 0; vertical-align: top; text-align: right; font-weight: 900;">${item.quantity}</td>
        <td style="padding: 4px 0; vertical-align: top; text-align: right;">${rateStr}</td>
        <td style="padding: 4px 0; vertical-align: top; text-align: right; font-weight: 900;">${amtStr}</td>
      </tr>
    `;
  }).join('');

  const titleBadgeText = doc.isReprint
    ? '*** REPRINT INVOICE ***'
    : doc.taxEnabled
    ? '*** TAX INVOICE ***'
    : '*** BILL / RECEIPT ***';

  return `
<div style="
  width: ${widthPx};
  background: #ffffff;
  color: #000000;
  padding: ${paddingPx};
  box-sizing: border-box;
  font-family: 'Courier New', Courier, monospace;
  font-size: ${baseFontSize};
  font-weight: bold;
  line-height: ${lineHeight};
  text-align: left;
  border: 1px solid #000000;
  margin: 0 auto;
">
  <!-- Header -->
  <div style="text-align: center;">
    ${doc.estdYear ? `<div style="font-size: 10.6px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">ESTD. ${doc.estdYear}</div>` : ''}
    <div style="font-size: ${is58mm ? '15px' : '18.7px'}; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 1px;">${doc.restaurantName}</div>
    ${doc.legalName ? `<div style="font-size: 11.8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 1px;">${doc.legalName}</div>` : ''}
    ${doc.address ? `<div style="font-size: 10px; font-weight: 600; margin-top: 2px; line-height: 1.25;">${doc.address}</div>` : ''}
    ${doc.phone ? `<div style="font-size: 10.2px; font-weight: 700; margin-top: 2px;">Phone: ${doc.phone}</div>` : ''}
    ${doc.fssaiLicense ? `<div style="font-size: 10px; font-weight: 700; margin-top: 1px;">FSSAI No: ${doc.fssaiLicense}</div>` : ''}
    ${doc.taxEnabled && doc.gstin ? `<div style="font-size: 9.7px; font-weight: 700; margin-top: 1px;">GSTIN: ${doc.gstin}</div>` : ''}
    
    <div style="margin-top: 4px; display: inline-block; border: 1.5px solid #000000; padding: 2px 12px; font-size: 11.5px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; background: #f4f4f5;">
      ${titleBadgeText}
    </div>
  </div>
  <div style="border-bottom: 1.5px dashed #000000; margin: 6px 0;"></div>
  <!-- Order Info -->
  <div style="font-size: ${is58mm ? '10px' : '11.2px'}; font-weight: 700; line-height: 1.35;">
    <div style="display: flex; justify-content: space-between;">
      <span><b>Memo#:</b> ${memoNum}</span>
      <span><b>${doc.time}</b></span>
      <span><b>${doc.date}</b></span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-top: 2px;">
      <span><b>User:</b> ${doc.cashierName || 'Cashier'}</span>
      <span><b>Pax#:</b> ${doc.guestCount || 1}</span>
      <span><b>${tableDisplay}</b></span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-top: 2px;">
      <span><b>Order#:</b> #${orderNum}</span>
      <span><b>Cust:</b> ${doc.customerName || 'Walk-in'}</span>
    </div>
  </div>
  <div style="border-bottom: 1.5px dashed #000000; margin: 6px 0;"></div>
  <!-- Product Table -->
  <table style="width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed;">
    <thead>
      <tr style="border-bottom: 1.5px solid #000000; font-weight: 900; font-size: ${is58mm ? '10px' : '11.2px'}; text-transform: uppercase;">
        <th style="padding: 3px 0; width: 9%; text-align: left;">Sr</th>
        <th style="padding: 3px 0; width: 45%;">Product</th>
        <th style="padding: 3px 0; width: 14%; text-align: right;">Qty</th>
        <th style="padding: 3px 0; width: 16%; text-align: right;">Rate</th>
        <th style="padding: 3px 0; width: 16%; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${billItemsHtml}
    </tbody>
  </table>
  <!-- Items Summary -->
  <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; margin-top: 4px; padding: 2px 0;">
    <span>ITEMS QTY: ${totalQty}</span>
    <span>TOTAL ITEMS: ${doc.items.length}</span>
  </div>
  <div style="border-bottom: 1.5px dashed #000000; margin: 4px 0;"></div>
  <!-- Financial Summary -->
  <div style="font-size: ${is58mm ? '10px' : '11.2px'}; line-height: 1.35;">
    <div style="display: flex; justify-content: space-between;">
      <span>SUBTOTAL:</span>
      <span>${doc.subtotal.toFixed(2)}</span>
    </div>
    ${doc.discountAmount > 0 ? `
    <div style="display: flex; justify-content: space-between; color: #16a34a;">
      <span>DISCOUNT:</span>
      <span>-${doc.discountAmount.toFixed(2)}</span>
    </div>` : ''}
    ${doc.taxEnabled && totalTax > 0 ? `
    <div style="display: flex; justify-content: space-between;">
      <span>SGST (${sgstRate}%):</span>
      <span>${sgstAmt.toFixed(2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span>CGST (${cgstRate}%):</span>
      <span>${cgstAmt.toFixed(2)}</span>
    </div>` : ''}
    ${doc.roundingAmount !== 0 ? `
    <div style="display: flex; justify-content: space-between;">
      <span>ROUND OFF:</span>
      <span>${doc.roundingAmount >= 0 ? '+' : ''}${doc.roundingAmount.toFixed(2)}</span>
    </div>` : ''}
    <div style="border-bottom: 1.5px solid #000000; margin: 4px 0;"></div>
    <div style="display: flex; justify-content: space-between; font-size: ${is58mm ? '14px' : '16px'}; font-weight: 900; margin: 4px 0;">
      <span>GRAND TOTAL:</span>
      <span>Rs. ${doc.grandTotal.toFixed(2)}</span>
    </div>
  </div>
  <div style="border-bottom: 1.5px dashed #000000; margin: 4px 0;"></div>
  <!-- Amount in words -->
  <div style="font-size: 10px; font-style: italic; font-weight: 700; margin: 4px 0; line-height: 1.25;">
    <b>Amount in Words:</b> ${amountInWords}
  </div>
  <div style="border-bottom: 1.5px dashed #000000; margin: 4px 0;"></div>
  <!-- Payment Mode -->
  <div style="text-align: center; font-size: ${is58mm ? '11px' : '12.5px'}; font-weight: 900; margin: 6px 0;">
    PAYMENT MODE: ${(doc.paymentMethod || 'CASH').toUpperCase()} (PAID)
  </div>
  <div style="border-bottom: 1.5px dashed #000000; margin: 6px 0;"></div>
  <!-- Footer Note -->
  <div style="text-align: center; font-size: 10.5px; font-weight: bold; margin-top: 6px;">
    <div>${doc.receiptHeader || 'Taste That Brings You Back!'}</div>
    <div style="margin-top: 2px;">${doc.receiptFooter || 'Thank You! Visit Again'}</div>
  </div>
</div>
  `.trim();
}
