import assert from 'node:assert';
import { calculateInvoiceTax } from './calculate';
import { TaxCalculationInput, TaxCalculationResult } from './types';

interface Example {
  description: string;
  input: TaxCalculationInput;
  expected: TaxCalculationResult;
}

export const examples: Example[] = [
  {
    description: "EXAMPLE A — Intra-state, single line item, evenly-divisible tax",
    input: {
      sellerStateCode: '27',
      placeOfSupplyStateCode: '27',
      lineItems: [{ quantity: 3, unitPricePaise: 15000, discountPaise: 0, taxRatePercentage: 18 }]
    },
    expected: {
      supplyType: 'intra_state',
      lineItems: [
        {
          quantity: 3,
          unitPricePaise: 15000,
          discountPaise: 0,
          taxableValuePaise: 45000,
          taxRatePercentage: 18,
          cgstPaise: 4050,
          sgstPaise: 4050,
          igstPaise: 0,
          lineTotalPaise: 53100
        }
      ],
      subtotalPaise: 45000,
      totalCgstPaise: 4050,
      totalSgstPaise: 4050,
      totalIgstPaise: 0,
      totalTaxPaise: 8100,
      grandTotalPaise: 53100,
      gstRateType: 'exclusive'
    }
  },
  {
    description: "EXAMPLE B — Inter-state, single line item requiring rounding",
    input: {
      sellerStateCode: '27',
      placeOfSupplyStateCode: '29',
      lineItems: [{ quantity: 1, unitPricePaise: 9999, discountPaise: 0, taxRatePercentage: 18 }]
    },
    expected: {
      supplyType: 'inter_state',
      lineItems: [
        {
          quantity: 1,
          unitPricePaise: 9999,
          discountPaise: 0,
          taxableValuePaise: 9999,
          taxRatePercentage: 18,
          cgstPaise: 0,
          sgstPaise: 0,
          igstPaise: 1800,
          lineTotalPaise: 11799
        }
      ],
      subtotalPaise: 9999,
      totalCgstPaise: 0,
      totalSgstPaise: 0,
      totalIgstPaise: 1800,
      totalTaxPaise: 1800,
      grandTotalPaise: 11799,
      gstRateType: 'exclusive'
    }
  },
  {
    description: "EXAMPLE C — Intra-state, odd-paise tax split (tests the CGST/SGST remainder rule)",
    input: {
      sellerStateCode: '07',
      placeOfSupplyStateCode: '07',
      lineItems: [{ quantity: 1, unitPricePaise: 101, discountPaise: 0, taxRatePercentage: 5 }]
    },
    expected: {
      supplyType: 'intra_state',
      lineItems: [
        {
          quantity: 1,
          unitPricePaise: 101,
          discountPaise: 0,
          taxableValuePaise: 101,
          taxRatePercentage: 5,
          cgstPaise: 3,
          sgstPaise: 3,
          igstPaise: 0,
          lineTotalPaise: 107
        }
      ],
      subtotalPaise: 101,
      totalCgstPaise: 3,
      totalSgstPaise: 3,
      totalIgstPaise: 0,
      totalTaxPaise: 6,
      grandTotalPaise: 107,
      gstRateType: 'exclusive'
    }
  },
  {
    description: "EXAMPLE D — Multi-line-item invoice, mixed rates, with a discount, intra-state",
    input: {
      sellerStateCode: '07',
      placeOfSupplyStateCode: '07',
      lineItems: [
        { quantity: 2, unitPricePaise: 50000, discountPaise: 0, taxRatePercentage: 12 },
        { quantity: 1, unitPricePaise: 25000, discountPaise: 2500, taxRatePercentage: 18 }
      ]
    },
    expected: {
      supplyType: 'intra_state',
      lineItems: [
        {
          quantity: 2,
          unitPricePaise: 50000,
          discountPaise: 0,
          taxableValuePaise: 100000,
          taxRatePercentage: 12,
          cgstPaise: 6000,
          sgstPaise: 6000,
          igstPaise: 0,
          lineTotalPaise: 112000
        },
        {
          quantity: 1,
          unitPricePaise: 25000,
          discountPaise: 2500,
          taxableValuePaise: 22500,
          taxRatePercentage: 18,
          cgstPaise: 2025,
          sgstPaise: 2025,
          igstPaise: 0,
          lineTotalPaise: 26550
        }
      ],
      subtotalPaise: 122500,
      totalCgstPaise: 8025,
      totalSgstPaise: 8025,
      totalIgstPaise: 0,
      totalTaxPaise: 16050,
      grandTotalPaise: 138550,
      gstRateType: 'exclusive'
    }
  },
  {
    description: "EXAMPLE E — Fractional quantity (tests the gross-paise rounding step)",
    input: {
      sellerStateCode: '19',
      placeOfSupplyStateCode: '19',
      lineItems: [{ quantity: 2.5, unitPricePaise: 199, discountPaise: 0, taxRatePercentage: 18 }]
    },
    expected: {
      supplyType: 'intra_state',
      lineItems: [
        {
          quantity: 2.5,
          unitPricePaise: 199,
          discountPaise: 0,
          taxableValuePaise: 498,
          taxRatePercentage: 18,
          cgstPaise: 45,
          sgstPaise: 45,
          igstPaise: 0,
          lineTotalPaise: 588
        }
      ],
      subtotalPaise: 498,
      totalCgstPaise: 45,
      totalSgstPaise: 45,
      totalIgstPaise: 0,
      totalTaxPaise: 90,
      grandTotalPaise: 588,
      gstRateType: 'exclusive'
    }
  },
  {
    description: "EXAMPLE F — GST-Inclusive, intra-state, single line item, evenly-divisible",
    input: {
      sellerStateCode: '27',
      placeOfSupplyStateCode: '27',
      gstRateType: 'inclusive',
      lineItems: [{ quantity: 5, unitPricePaise: 8000, discountPaise: 0, taxRatePercentage: 18 }]
    },
    expected: {
      supplyType: 'intra_state',
      lineItems: [
        {
          quantity: 5,
          unitPricePaise: 8000,
          discountPaise: 0,
          taxableValuePaise: 33898,
          taxRatePercentage: 18,
          cgstPaise: 3051,
          sgstPaise: 3051,
          igstPaise: 0,
          lineTotalPaise: 40000
        }
      ],
      subtotalPaise: 33898,
      totalCgstPaise: 3051,
      totalSgstPaise: 3051,
      totalIgstPaise: 0,
      totalTaxPaise: 6102,
      grandTotalPaise: 40000,
      gstRateType: 'inclusive'
    }
  },
  {
    description: "EXAMPLE G — GST-Inclusive, with 35% discount, intra-state (matches the Omega Roll-N-Draw Scale in Image 1)",
    input: {
      sellerStateCode: '27',
      placeOfSupplyStateCode: '27',
      gstRateType: 'inclusive',
      lineItems: [{ quantity: 5, unitPricePaise: 8000, discountPaise: 14000, taxRatePercentage: 18 }]
    },
    expected: {
      supplyType: 'intra_state',
      lineItems: [
        {
          quantity: 5,
          unitPricePaise: 8000,
          discountPaise: 14000,
          taxableValuePaise: 22034,
          taxRatePercentage: 18,
          cgstPaise: 1983,
          sgstPaise: 1983,
          igstPaise: 0,
          lineTotalPaise: 26000
        }
      ],
      subtotalPaise: 22034,
      totalCgstPaise: 1983,
      totalSgstPaise: 1983,
      totalIgstPaise: 0,
      totalTaxPaise: 3966,
      grandTotalPaise: 26000,
      gstRateType: 'inclusive'
    }
  }
];

async function runExamples() {
  let allPass = true;
  for (const example of examples) {
    try {
      const actual = calculateInvoiceTax(example.input);
      assert.deepStrictEqual(actual, example.expected);
      console.log(`[PASS] ${example.description}`);
    } catch (err: any) {
      allPass = false;
      console.error(`[FAIL] ${example.description}`);
      if (err instanceof assert.AssertionError) {
        console.error("Actual:");
        console.dir(err.actual, { depth: null });
        console.error("Expected:");
        console.dir(err.expected, { depth: null });
      } else {
        console.error(err);
      }
    }
  }

  if (!allPass) {
    process.exit(1);
  }
}

if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.replace(/\\\\/g, '/').endsWith('calculate.examples.ts'))) {
  runExamples().catch(console.error);
}
