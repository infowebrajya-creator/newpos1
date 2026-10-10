/**
 * Convert a numeric amount to Indian Rupees words representation.
 * Example: 788 => "Seven Hundred Eighty-Eight Rupees Only."
 * Example: 788.50 => "Seven Hundred Eighty-Eight Rupees and Fifty Paise Only."
 */
export function numberToIndianRupees(amount: number): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '';
  }

  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  if (rupees === 0 && paise === 0) {
    return 'Zero Rupees Only.';
  }

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    const tensDigit = Math.floor(n / 10);
    const onesDigit = n % 10;
    return tens[tensDigit] + (onesDigit ? '-' + ones[onesDigit] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    let str = '';
    if (hundred > 0) {
      str += ones[hundred] + ' Hundred';
      if (remainder > 0) str += ' ';
    }
    if (remainder > 0) {
      str += convertTwoDigits(remainder);
    }
    return str;
  }

  function convertRupees(n: number): string {
    if (n === 0) return 'Zero';
    let str = '';

    const crore = Math.floor(n / 10000000);
    n %= 10000000;

    const lakh = Math.floor(n / 100000);
    n %= 100000;

    const thousand = Math.floor(n / 1000);
    n %= 1000;

    const remainder = n;

    if (crore > 0) {
      str += convertThreeDigits(crore) + ' Crore ';
    }
    if (lakh > 0) {
      str += convertTwoDigits(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
      str += convertTwoDigits(thousand) + ' Thousand ';
    }
    if (remainder > 0) {
      str += convertThreeDigits(remainder);
    }

    return str.trim();
  }

  let result = convertRupees(rupees) + ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertTwoDigits(paise) + ' Paise';
  }

  result += ' Only.';
  return result;
}
