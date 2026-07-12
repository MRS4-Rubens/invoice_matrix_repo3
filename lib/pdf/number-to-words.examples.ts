import { amountInWordsIndian } from './number-to-words';

function runExamples() {
  const examples = [
    { rupees: 3000, paise: 5, expected: "Three Thousand Rupees and Five Paise Only" },
    { rupees: 125000, paise: 0, expected: "One Lakh Twenty Five Thousand Rupees Only" },
    { rupees: 99, paise: 99, expected: "Ninety Nine Rupees and Ninety Nine Paise Only" },
    { rupees: 10000000, paise: 0, expected: "One Crore Rupees Only" },
    { rupees: 0, paise: 50, expected: "Zero Rupees and Fifty Paise Only" },
  ];

  let allPassed = true;

  console.log('--- NUMBER TO WORDS EXAMPLES ---');
  for (const { rupees, paise, expected } of examples) {
    const actual = amountInWordsIndian(rupees, paise);
    const pass = actual === expected;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] amountInWordsIndian(${rupees}, ${paise})`);
    if (!pass) {
      console.log(`  Expected: "${expected}"`);
      console.log(`  Actual:   "${actual}"`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    process.exit(1);
  }
}

runExamples();
