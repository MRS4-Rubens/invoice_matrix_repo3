
import { db } from './lib/db/client';
import { invoices, businesses } from './lib/db/schema';
import { eq, and, between, sql } from 'drizzle-orm';
import { paiseToRupees } from './lib/money';
import { getExportData } from './lib/actions/reports/get-export-data';
import { buildSalesRegisterWorkbook } from './lib/excel/build-sales-register';
import * as authSession from './lib/auth/session';

async function verify() {
  const allBusinesses = await db.select().from(businesses);
  if (allBusinesses.length === 0) {
    console.log("No businesses found");
    return;
  }
  const business = allBusinesses[0];
  const businessId = business.id;
  
  // Find a period with finalized invoices
  const invs = await db.select({ date: invoices.invoice_date }).from(invoices).where(eq(invoices.lifecycle_status, 'finalized')).limit(1);
  if (invs.length === 0) {
    console.log("No finalized invoices found");
    return;
  }
  
  const d = new Date(invs[0].date!);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const startDate = `${y}-${m}-01`;
  const endDate = `${y}-${m}-31`; // Approx
  
  console.log(`Checking period ${startDate} to ${endDate} for business ${businessId}`);
  
  const rawSums = await db.select({
    subtotal: sql<number>`sum(${invoices.subtotal_paise})`,
    cgst: sql<number>`sum(${invoices.total_cgst_paise})`,
    sgst: sql<number>`sum(${invoices.total_sgst_paise})`,
    igst: sql<number>`sum(${invoices.total_igst_paise})`,
    tax: sql<number>`sum(${invoices.total_tax_paise})`,
    total: sql<number>`sum(${invoices.grand_total_paise})`
  }).from(invoices)
  .where(and(
    eq(invoices.business_id, businessId),
    eq(invoices.lifecycle_status, 'finalized'),
    between(invoices.invoice_date, startDate, endDate)
  ));
  
  const expectedDb = {
    subtotal: paiseToRupees(Number(rawSums[0].subtotal || 0)),
    cgst: paiseToRupees(Number(rawSums[0].cgst || 0)),
    sgst: paiseToRupees(Number(rawSums[0].sgst || 0)),
    igst: paiseToRupees(Number(rawSums[0].igst || 0)),
    tax: paiseToRupees(Number(rawSums[0].tax || 0)),
    total: paiseToRupees(Number(rawSums[0].total || 0)),
  };
  
  // Mock getExportData directly instead of session, but it uses db anyway.
  // Actually, let's just duplicate the internal logic of getExportData to get exportResult.data
  const rawInvoices = await db.select().from(invoices).where(and(eq(invoices.business_id, businessId), eq(invoices.lifecycle_status, 'finalized'), between(invoices.invoice_date, startDate, endDate)));
  
  // We already have the raw sums from the DB query above to compare with
  const hsnMap = new Map();
  let totalTaxableValuePaise = 0, totalCgstPaise = 0, totalSgstPaise = 0, totalIgstPaise = 0, totalTaxPaise = 0, totalInvoiceValuePaise = 0;
  
  for (const inv of rawInvoices) {
    totalTaxableValuePaise += inv.subtotal_paise;
    totalCgstPaise += inv.total_cgst_paise;
    totalSgstPaise += inv.total_sgst_paise;
    totalIgstPaise += inv.total_igst_paise;
    totalTaxPaise += inv.total_tax_paise;
    totalInvoiceValuePaise += inv.grand_total_paise;
  }
  
  const periodTotals = {
    totalInvoices: rawInvoices.length,
    totalTaxableValuePaise,
    totalCgstPaise,
    totalSgstPaise,
    totalIgstPaise,
    totalTaxPaise,
    totalInvoiceValuePaise
  };
  
  const invoiceIds = rawInvoices.map((inv) => inv.id);
  const { invoiceLineItems } = require('./lib/db/schema');
  const { inArray } = require('drizzle-orm');
  const rawLineItems = invoiceIds.length > 0 
    ? await db.select().from(invoiceLineItems).where(inArray(invoiceLineItems.invoice_id, invoiceIds))
    : [];
    
  for (const item of rawLineItems) {
    const key = `${item.hsn_sac_code}_${item.unit_of_measurement}_${item.tax_rate_percentage}`;
    
    if (!hsnMap.has(key)) {
      hsnMap.set(key, {
        hsn_sac_code: item.hsn_sac_code,
        description: item.description,
        unit_of_measurement: item.unit_of_measurement,
        total_quantity: 0,
        taxable_value_paise: 0,
        tax_rate_percentage: Number(item.tax_rate_percentage),
        cgst_paise: 0,
        sgst_paise: 0,
        igst_paise: 0,
        total_tax_paise: 0,
        total_value_paise: 0
      });
    }

    const group = hsnMap.get(key);
    group.total_quantity += Number(item.quantity);
    group.taxable_value_paise += item.taxable_value_paise;
    group.cgst_paise += item.cgst_paise;
    group.sgst_paise += item.sgst_paise;
    group.igst_paise += item.igst_paise;
    const itemTotalTax = item.cgst_paise + item.sgst_paise + item.igst_paise;
    group.total_tax_paise += itemTotalTax;
    group.total_value_paise += item.taxable_value_paise + itemTotalTax;
  }

  const hsnSummary = Array.from(hsnMap.values());

  const data = {
    business: { legal_name: business.legal_name, gstin: business.gstin },
    label: 'Test Label',
    invoices: rawInvoices.map((inv: any) => ({
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      customer_name: inv.billing_name_snapshot,
      customer_gstin: inv.billing_gstin_snapshot,
      place_of_supply_state_code: inv.place_of_supply_state_code,
      subtotal_paise: inv.subtotal_paise,
      total_cgst_paise: inv.total_cgst_paise,
      total_sgst_paise: inv.total_sgst_paise,
      total_igst_paise: inv.total_igst_paise,
      total_tax_paise: inv.total_tax_paise,
      grand_total_paise: inv.grand_total_paise,
      payment_status: inv.payment_status
    })),
    creditNotes: [],
    hsnSummary: hsnSummary,
    periodTotals
  };
  
  try {
    const wb = await buildSalesRegisterWorkbook(data as any);
    const sheet1 = wb.getWorksheet('Sales Register');
    // Read the last row (Totals)
    const rowCount = sheet1!.rowCount;
    const totalsRow = sheet1!.getRow(rowCount);
    
    const sheet1Totals = {
      subtotal: totalsRow.getCell('taxable').value,
      cgst: totalsRow.getCell('cgst').value,
      sgst: totalsRow.getCell('sgst').value,
      igst: totalsRow.getCell('igst').value,
      tax: totalsRow.getCell('tax').value,
      total: totalsRow.getCell('total').value,
    };
    
    console.log('\n--- VERIFICATION ---');
    console.log('1. DB Sums vs Sheet 1 Totals Row');
    console.log('Metric      | Expected DB       | Sheet 1');
    console.log(`Subtotal    | ${expectedDb.subtotal}           | ${sheet1Totals.subtotal}`);
    console.log(`CGST        | ${expectedDb.cgst}           | ${sheet1Totals.cgst}`);
    console.log(`SGST        | ${expectedDb.sgst}           | ${sheet1Totals.sgst}`);
    console.log(`IGST        | ${expectedDb.igst}           | ${sheet1Totals.igst}`);
    console.log(`Total Tax   | ${expectedDb.tax}           | ${sheet1Totals.tax}`);
    console.log(`Grand Total | ${expectedDb.total}           | ${sheet1Totals.total}`);
    
    // HSN Summary total tax check
    const sheet2 = wb.getWorksheet('HSN Summary');
    const hsnTotalsRow = sheet2!.getRow(sheet2!.rowCount);
    const hsnTotalTax = hsnTotalsRow.getCell('tax').value;
    console.log('\n2. HSN Summary total tax match:', hsnTotalTax === expectedDb.tax ? 'YES' : 'NO', `(${hsnTotalTax} vs ${expectedDb.tax})`);
    
    const sheet3 = wb.getWorksheet('Credit Notes');
    console.log('\n3. Credit Notes Sheet exists:', !!sheet3);
    console.log('Credit Notes Totals row count:', sheet3!.rowCount); // Should be header + empty totals row
    
    console.log('\nAll done.');
  } finally {
  }
}

verify().catch(console.error);
