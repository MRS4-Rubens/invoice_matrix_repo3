import { INDIAN_GST_STATES } from './indian-states';
import { GstCalculationError } from './errors';
import { SupplyType, TaxLineItemInput, TaxLineItemResult, TaxCalculationInput, TaxCalculationResult } from './types';

export function getSupplyType(sellerStateCode: string, placeOfSupplyStateCode: string): SupplyType {
  const sellerState = INDIAN_GST_STATES.find(s => s.code === sellerStateCode);
  if (!sellerState) {
    throw new GstCalculationError(`Invalid sellerStateCode: ${sellerStateCode}`);
  }
  const posState = INDIAN_GST_STATES.find(s => s.code === placeOfSupplyStateCode);
  if (!posState) {
    throw new GstCalculationError(`Invalid placeOfSupplyStateCode: ${placeOfSupplyStateCode}`);
  }

  if (sellerStateCode === placeOfSupplyStateCode) {
    return 'intra_state';
  }
  return 'inter_state';
}

function calculateLineItem(item: TaxLineItemInput, supplyType: SupplyType): TaxLineItemResult {
  if (item.quantity <= 0) {
    throw new GstCalculationError('Quantity must be greater than 0');
  }
  if (item.unitPricePaise < 0) {
    throw new GstCalculationError('Unit price must be non-negative');
  }
  if (item.taxRatePercentage < 0 || item.taxRatePercentage > 100) {
    throw new GstCalculationError('Tax rate percentage must be between 0 and 100');
  }
  const discountPaise = item.discountPaise ?? 0;
  if (discountPaise < 0) {
    throw new GstCalculationError('Discount must be non-negative');
  }

  const grossPaise = Math.round(item.quantity * item.unitPricePaise);

  if (discountPaise > grossPaise) {
    throw new GstCalculationError("Discount cannot exceed the line item's gross value");
  }

  const taxableValuePaise = grossPaise - discountPaise;
  const rateBasisPoints = Math.round(item.taxRatePercentage * 100);
  const totalTaxPaise = Math.round((taxableValuePaise * rateBasisPoints) / 10000);

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (supplyType === 'intra_state') {
    // when total tax is an odd number of paise, CGST receives the smaller half and SGST receives the larger half; 
    // this is an arbitrary but fixed, deterministic rule chosen so results are always reproducible
    cgstPaise = Math.floor(totalTaxPaise / 2);
    sgstPaise = totalTaxPaise - cgstPaise;
  } else {
    igstPaise = totalTaxPaise;
  }

  const lineTotalPaise = taxableValuePaise + totalTaxPaise;

  return {
    quantity: item.quantity,
    unitPricePaise: item.unitPricePaise,
    discountPaise,
    taxableValuePaise,
    taxRatePercentage: item.taxRatePercentage,
    cgstPaise,
    sgstPaise,
    igstPaise,
    lineTotalPaise
  };
}

export function calculateInvoiceTax(input: TaxCalculationInput): TaxCalculationResult {
  if (!input.lineItems || input.lineItems.length === 0) {
    throw new GstCalculationError("At least one line item is required");
  }

  const supplyType = getSupplyType(input.sellerStateCode, input.placeOfSupplyStateCode);

  const lineItems: TaxLineItemResult[] = input.lineItems.map(item => calculateLineItem(item, supplyType));

  let subtotalPaise = 0;
  let totalCgstPaise = 0;
  let totalSgstPaise = 0;
  let totalIgstPaise = 0;

  for (const line of lineItems) {
    subtotalPaise += line.taxableValuePaise;
    totalCgstPaise += line.cgstPaise;
    totalSgstPaise += line.sgstPaise;
    totalIgstPaise += line.igstPaise;
  }

  const totalTaxPaise = totalCgstPaise + totalSgstPaise + totalIgstPaise;
  const grandTotalPaise = subtotalPaise + totalTaxPaise;

  return {
    supplyType,
    lineItems,
    subtotalPaise,
    totalCgstPaise,
    totalSgstPaise,
    totalIgstPaise,
    totalTaxPaise,
    grandTotalPaise
  };
}
