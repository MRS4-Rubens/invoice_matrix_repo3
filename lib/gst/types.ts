export type SupplyType = 'intra_state' | 'inter_state';

export interface TaxLineItemInput {
  quantity: number;
  unitPricePaise: number;
  discountPaise?: number;
  taxRatePercentage: number;
}

export interface TaxLineItemResult {
  quantity: number;
  unitPricePaise: number;
  discountPaise: number;
  taxableValuePaise: number;
  taxRatePercentage: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  lineTotalPaise: number;
}

/**
 * placeOfSupplyStateCode is deliberately named this way, not 'buyerStateCode' — under GST law, 
 * place of supply determines the tax treatment, and while it is normally the same as the customer's 
 * registered state for a retail sale, naming it precisely avoids future confusion if ship-to/bill-to 
 * logic is ever added.
 */
export interface TaxCalculationInput {
  sellerStateCode: string;
  placeOfSupplyStateCode: string;
  lineItems: TaxLineItemInput[];
}

export interface TaxCalculationResult {
  supplyType: SupplyType;
  lineItems: TaxLineItemResult[];
  subtotalPaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  totalIgstPaise: number;
  totalTaxPaise: number;
  grandTotalPaise: number;
}
