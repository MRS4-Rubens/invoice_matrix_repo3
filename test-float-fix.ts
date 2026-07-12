import { amountInWordsIndian } from './lib/pdf/number-to-words';

function testFloatFix() {
  const testCases = [
    { paise: 300005, expected: "Three Thousand Rupees and Five Paise Only" }, // 3000.05
    { paise: 12500000, expected: "One Lakh Twenty Five Thousand Rupees Only" }, // 125000.00
    { paise: 9999, expected: "Ninety Nine Rupees and Ninety Nine Paise Only" }, // 99.99
    { paise: 1000000000, expected: "One Crore Rupees Only" }, // 10000000.00
    { paise: 50, expected: "Zero Rupees and Fifty Paise Only" }, // 0.50
    { paise: 123407, expected: "One Thousand Two Hundred Thirty Four Rupees and Seven Paise Only" } // 1234.07
  ];

  for (const { paise, expected } of testCases) {
    const rupeesPart = Math.floor(paise / 100);
    const paisePart = Math.floor(paise % 100); // Wait, prompt says: paise % 100
    const actual = amountInWordsIndian(rupeesPart, paisePart);
    if (actual !== expected) {
      console.log(`[FAIL] Expected: "${expected}", Actual: "${actual}"`);
    } else {
      console.log(`[PASS] ${paise} -> "${actual}"`);
    }
  }
}

testFloatFix();
