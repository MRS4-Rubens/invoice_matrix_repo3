export function amountInWordsIndian(rupees: number, paise: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertGroup(n: number): string {
    let str = '';
    if (n > 99) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  function getRupeesInWords(amount: number): string {
    if (amount === 0) return 'Zero';

    let result = '';
    
    const crore = Math.floor(amount / 10000000);
    amount %= 10000000;
    
    const lakh = Math.floor(amount / 100000);
    amount %= 100000;
    
    const thousand = Math.floor(amount / 1000);
    amount %= 1000;
    
    const hundred = amount;

    if (crore > 0) {
      result += convertGroup(crore) + ' Crore ';
    }
    if (lakh > 0) {
      result += convertGroup(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
      result += convertGroup(thousand) + ' Thousand ';
    }
    if (hundred > 0) {
      result += convertGroup(hundred);
    }

    return result.trim();
  }

  const rupeesWords = getRupeesInWords(Math.floor(rupees));
  
  if (paise === 0) {
    return `${rupeesWords} Rupees Only`;
  } else {
    const paiseWords = convertGroup(Math.floor(paise));
    return `${rupeesWords} Rupees and ${paiseWords} Paise Only`;
  }
}
