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

function calculateLineItem(
  item: TaxLineItemInput,
  supplyType: SupplyType,
  gstRateType: 'inclusive' | 'exclusive' = 'exclusive'
): TaxLineItemResult {
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

  // Calculate gross value (entered rate * quantity) in integer paise
  const grossPaise = Math.round(item.quantity * item.unitPricePaise);

  if (discountPaise > grossPaise) {
    throw new GstCalculationError("Discount cannot exceed the line item's gross value");
  }

  const rateBasisPoints = Math.round(item.taxRatePercentage * 100);
  let taxableValuePaise = 0;
  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;
  let lineTotalPaise = 0;

  if (gstRateType === 'inclusive') {
    // Case 3 (Inclusive Forward): Net line total including tax is computed directly from inclusive rate
    lineTotalPaise = grossPaise - discountPaise;
    
    // Extract base taxable value by backing out the tax: LineTotal / (1 + TaxRate/100)
    taxableValuePaise = Math.round((lineTotalPaise * 10000) / (10000 + rateBasisPoints));
    
    // Calculate taxes based on the extracted taxable value
    if (supplyType === 'intra_state') {
      cgstPaise = Math.round((taxableValuePaise * (rateBasisPoints / 2)) / 10000);
      sgstPaise = cgstPaise;
    } else {
      igstPaise = Math.round((taxableValuePaise * rateBasisPoints) / 10000);
    }
    
    // Adjust taxable value slightly so that TaxableValue + CGST + SGST (or IGST) matches LineTotal exactly (prevent rounding leakage)
    const calculatedTotalTaxPaise = cgstPaise + sgstPaise + igstPaise;
    taxableValuePaise = lineTotalPaise - calculatedTotalTaxPaise;
  } else {
    // Case 1 (Exclusive Forward): Base taxable value is computed, then tax is added on top
    taxableValuePaise = grossPaise - discountPaise;
    
    if (supplyType === 'intra_state') {
      cgstPaise = Math.round((taxableValuePaise * (rateBasisPoints / 2)) / 10000);
      sgstPaise = cgstPaise;
      lineTotalPaise = taxableValuePaise + cgstPaise + sgstPaise;
    } else {
      igstPaise = Math.round((taxableValuePaise * rateBasisPoints) / 10000);
      lineTotalPaise = taxableValuePaise + igstPaise;
    }
  }

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
  const gstRateType = input.gstRateType || 'exclusive';

  // Authoritatively calculate each line item with correct supply type and rate mode
  const lineItems: TaxLineItemResult[] = input.lineItems.map(item => calculateLineItem(item, supplyType, gstRateType));

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
    grandTotalPaise,
    gstRateType
  };
}
