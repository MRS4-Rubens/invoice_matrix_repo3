import ExcelJS from 'exceljs';
import type { Gstr1ExportData } from '@/lib/actions/reports/get-gstr1-data';
import { paiseToRupees } from '@/lib/money';

const currencyFormat = '#,##0.00';

export async function buildGstr1Workbook(data: Gstr1ExportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bill Matrix';
  workbook.created = new Date();

  // Official GSTN Header Style (Clean, distinct dark blue fill with bold white text)
  const GSTN_HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E79' }
  };

  const SUMMARY_HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2B5797' }
  };

  const TOTAL_ROW_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };

  const THIN_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
  };

  const applyGstnHeaderStyle = (sheet: ExcelJS.Worksheet) => {
    const row = sheet.getRow(1);
    row.height = 24;
    row.eachCell((cell) => {
      cell.fill = GSTN_HEADER_FILL;
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  };

  // =========================================================================
  // SHEET 1: GSTR-1 Executive Summary (Human-readable for CA Verification)
  // =========================================================================
  const sheetSummary = workbook.addWorksheet('GSTR-1 Summary');
  sheetSummary.getColumn(1).width = 36;
  sheetSummary.getColumn(2).width = 18;
  sheetSummary.getColumn(3).width = 22;
  sheetSummary.getColumn(4).width = 22;

  // Title Block
  sheetSummary.mergeCells('A1:D1');
  const titleCell = sheetSummary.getCell('A1');
  titleCell.value = `${data.business.legal_name} — GSTR-1 Return Filing Statement`;
  titleCell.font = { name: 'Arial', bold: true, size: 14 };
  sheetSummary.getRow(1).height = 28;

  sheetSummary.mergeCells('A2:D2');
  const metaCell = sheetSummary.getCell('A2');
  metaCell.value = `GSTIN: ${data.business.gstin}  |  Period: ${data.label} (${data.startDate} to ${data.endDate})`;
  metaCell.font = { name: 'Arial', size: 10.5, color: { argb: 'FF595959' } };
  sheetSummary.getRow(2).height = 20;

  // Section Table Headers
  const sRow4 = sheetSummary.getRow(4);
  sRow4.height = 24;
  sRow4.values = ['GSTR-1 Table Section', 'Count', 'Taxable Value (₹)', 'Tax Amount (₹)'];
  sRow4.eachCell((cell) => {
    cell.fill = SUMMARY_HEADER_FILL;
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 10.5 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const sum = data.summary;
  const sections = [
    { name: 'Table 4: B2B Invoices (Registered)', count: sum.b2bCount, taxable: sum.b2bTaxablePaise, tax: sum.b2bTaxPaise },
    { name: 'Table 5: B2CL Invoices (Large Inter-State)', count: sum.b2clCount, taxable: sum.b2clTaxablePaise, tax: sum.b2clTaxPaise },
    { name: 'Table 7: B2CS Supplies (Small / Retail)', count: sum.b2csCount, taxable: sum.b2csTaxablePaise, tax: sum.b2csTaxPaise },
    { name: 'Table 9B: Credit / Debit Notes (CDNR)', count: sum.cdnrCount, taxable: sum.cdnrTaxablePaise, tax: sum.cdnrTaxPaise },
  ];

  let curRow = 5;
  for (const sec of sections) {
    const r = sheetSummary.getRow(curRow++);
    r.height = 20;
    r.values = [
      sec.name,
      sec.count,
      paiseToRupees(sec.taxable),
      paiseToRupees(sec.tax)
    ];
    r.getCell(1).font = { name: 'Arial', size: 10 };
    r.getCell(2).font = { name: 'Arial', size: 10 };
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(3).numFmt = currencyFormat;
    r.getCell(4).numFmt = currencyFormat;
    r.eachCell((c) => { c.border = THIN_BORDER; });
  }

  // Net Taxable Total Row
  const netRow = sheetSummary.getRow(curRow++);
  netRow.height = 24;
  netRow.values = [
    'NET OUTWARD SUPPLIES TOTAL',
    data.b2b.length + data.b2cl.length + sum.b2csCount,
    paiseToRupees(sum.totalTaxablePaise - sum.cdnrTaxablePaise),
    paiseToRupees(sum.totalTaxPaise - sum.cdnrTaxPaise)
  ];
  netRow.eachCell((cell, colIdx) => {
    cell.fill = TOTAL_ROW_FILL;
    cell.font = { name: 'Arial', bold: true, size: 11 };
    if (colIdx >= 3) cell.numFmt = currencyFormat;
  });

  // Tax Component Split (CGST, SGST, IGST)
  curRow += 2;
  sheetSummary.mergeCells(`A${curRow}:D${curRow}`);
  sheetSummary.getCell(`A${curRow}`).value = 'Tax Liability Breakdown (For GSTR-3B Payment)';
  sheetSummary.getCell(`A${curRow}`).font = { name: 'Arial', bold: true, size: 11.5 };
  curRow++;

  const taxBreakdown: [string, number][] = [
    ['Central Tax (CGST)', paiseToRupees(sum.totalCgstPaise)],
    ['State/UT Tax (SGST)', paiseToRupees(sum.totalSgstPaise)],
    ['Integrated Tax (IGST)', paiseToRupees(sum.totalIgstPaise)],
    ['Total Tax Liability', paiseToRupees(sum.totalTaxPaise)]
  ];

  for (const [title, amt] of taxBreakdown) {
    const r = sheetSummary.getRow(curRow++);
    r.height = 20;
    r.getCell(1).value = title;
    r.getCell(1).font = { name: 'Arial', bold: title.includes('Total') };
    r.getCell(2).value = amt;
    r.getCell(2).font = { name: 'Arial', bold: title.includes('Total') };
    r.getCell(2).numFmt = currencyFormat;
    r.getCell(2).alignment = { horizontal: 'right' };
    if (title.includes('Total')) {
      r.getCell(1).fill = TOTAL_ROW_FILL;
      r.getCell(2).fill = TOTAL_ROW_FILL;
    }
  }

  // =========================================================================
  // SHEET 2: b2b (Official Table 4: Taxable outward supplies to registered persons)
  // =========================================================================
  const sheetB2b = workbook.addWorksheet('b2b', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheetB2b.columns = [
    { header: 'GSTIN/UIN of Recipient', key: 'gstin', width: 22 },
    { header: 'Receiver Name', key: 'name', width: 30 },
    { header: 'Invoice Number', key: 'inv_no', width: 20 },
    { header: 'Invoice date', key: 'inv_date', width: 14 },
    { header: 'Invoice Value', key: 'inv_val', width: 16, style: { numFmt: currencyFormat } },
    { header: 'Place Of Supply', key: 'pos', width: 24 },
    { header: 'Reverse Charge', key: 'rc', width: 15 },
    { header: 'Applicable % of Tax Rate', key: 'app_rate', width: 22 },
    { header: 'Invoice Type', key: 'inv_type', width: 16 },
    { header: 'E-Commerce GSTIN', key: 'ecom_gstin', width: 20 },
    { header: 'Rate', key: 'rate', width: 10 },
    { header: 'Taxable Value', key: 'taxable', width: 16, style: { numFmt: currencyFormat } },
    { header: 'Cess Amount', key: 'cess', width: 14, style: { numFmt: currencyFormat } }
  ];
  applyGstnHeaderStyle(sheetB2b);

  for (const item of (data.b2b || [])) {
    sheetB2b.addRow({
      gstin: item.recipientGstin,
      name: item.receiverName,
      inv_no: item.invoiceNumber,
      inv_date: item.invoiceDate,
      inv_val: paiseToRupees(item.invoiceValuePaise),
      pos: item.placeOfSupply,
      rc: item.reverseCharge,
      app_rate: item.applicableTaxRatePercent,
      inv_type: item.invoiceType,
      ecom_gstin: item.eCommerceGstin,
      rate: item.ratePercentage,
      taxable: paiseToRupees(item.taxableValuePaise),
      cess: paiseToRupees(item.cessAmountPaise)
    });
  }

  // =========================================================================
  // SHEET 3: b2cl (Official Table 5: Taxable outward inter-State supplies to unregistered persons > 2.5L)
  // =========================================================================
  const sheetB2cl = workbook.addWorksheet('b2cl', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheetB2cl.columns = [
    { header: 'Invoice Number', key: 'inv_no', width: 20 },
    { header: 'Invoice date', key: 'inv_date', width: 14 },
    { header: 'Invoice Value', key: 'inv_val', width: 16, style: { numFmt: currencyFormat } },
    { header: 'Place Of Supply', key: 'pos', width: 24 },
    { header: 'Applicable % of Tax Rate', key: 'app_rate', width: 22 },
    { header: 'Rate', key: 'rate', width: 10 },
    { header: 'Taxable Value', key: 'taxable', width: 16, style: { numFmt: currencyFormat } },
    { header: 'Cess Amount', key: 'cess', width: 14, style: { numFmt: currencyFormat } },
    { header: 'E-Commerce GSTIN', key: 'ecom_gstin', width: 20 }
  ];
  applyGstnHeaderStyle(sheetB2cl);

  for (const item of (data.b2cl || [])) {
    sheetB2cl.addRow({
      inv_no: item.invoiceNumber,
      inv_date: item.invoiceDate,
      inv_val: paiseToRupees(item.invoiceValuePaise),
      pos: item.placeOfSupply,
      app_rate: item.applicableTaxRatePercent,
      rate: item.ratePercentage,
      taxable: paiseToRupees(item.taxableValuePaise),
      cess: paiseToRupees(item.cessAmountPaise),
      ecom_gstin: item.eCommerceGstin
    });
  }

  // =========================================================================
  // SHEET 4: b2cs (Official Table 7: Taxable supplies to unregistered persons other than Table 5)
  // =========================================================================
  const sheetB2cs = workbook.addWorksheet('b2cs', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheetB2cs.columns = [
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Place Of Supply', key: 'pos', width: 24 },
    { header: 'Applicable % of Tax Rate', key: 'app_rate', width: 22 },
    { header: 'Rate', key: 'rate', width: 10 },
    { header: 'Taxable Value', key: 'taxable', width: 16, style: { numFmt: currencyFormat } },
    { header: 'Cess Amount', key: 'cess', width: 14, style: { numFmt: currencyFormat } },
    { header: 'E-Commerce GSTIN', key: 'ecom_gstin', width: 20 }
  ];
  applyGstnHeaderStyle(sheetB2cs);

  for (const item of (data.b2cs || [])) {
    sheetB2cs.addRow({
      type: item.type,
      pos: item.placeOfSupply,
      app_rate: item.applicableTaxRatePercent,
      rate: item.ratePercentage,
      taxable: paiseToRupees(item.taxableValuePaise),
      cess: paiseToRupees(item.cessAmountPaise),
      ecom_gstin: item.eCommerceGstin
    });
  }

  // =========================================================================
  // SHEET 5: cdnr (Official Table 9B: Credit/Debit Notes to registered persons)
  // =========================================================================
  const sheetCdnr = workbook.addWorksheet('cdnr', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheetCdnr.columns = [
    { header: 'GSTIN/UIN of Recipient', key: 'gstin', width: 22 },
    { header: 'Receiver Name', key: 'name', width: 30 },
    { header: 'Note Number', key: 'note_no', width: 20 },
    { header: 'Note Date', key: 'note_date', width: 14 },
    { header: 'Note Type', key: 'note_type', width: 12 },
    { header: 'Place Of Supply', key: 'pos', width: 24 },
    { header: 'Reverse Charge', key: 'rc', width: 15 },
    { header: 'Note Supply Type', key: 'supply_type', width: 16 },
    { header: 'Note Value', key: 'note_val', width: 16, style: { numFmt: currencyFormat } },
    { header: 'Applicable % of Tax Rate', key: 'app_rate', width: 22 },
    { header: 'Rate', key: 'rate', width: 10 },
    { header: 'Taxable Value', key: 'taxable', width: 16, style: { numFmt: currencyFormat } },
    { header: 'Cess Amount', key: 'cess', width: 14, style: { numFmt: currencyFormat } }
  ];
  applyGstnHeaderStyle(sheetCdnr);

  for (const item of (data.cdnr || [])) {
    sheetCdnr.addRow({
      gstin: item.recipientGstin,
      name: item.receiverName,
      note_no: item.noteNumber,
      note_date: item.noteDate,
      note_type: item.noteType,
      pos: item.placeOfSupply,
      rc: item.reverseCharge,
      supply_type: item.noteSupplyType,
      note_val: paiseToRupees(item.noteValuePaise),
      app_rate: item.applicableTaxRatePercent,
      rate: item.ratePercentage,
      taxable: paiseToRupees(item.taxableValuePaise),
      cess: paiseToRupees(item.cessAmountPaise)
    });
  }

  // =========================================================================
  // SHEET 6: hsn (Official Table 12: HSN-wise summary of outward supplies)
  // =========================================================================
  const sheetHsn = workbook.addWorksheet('hsn', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheetHsn.columns = [
    { header: 'HSN', key: 'hsn', width: 15 },
    { header: 'Description', key: 'desc', width: 30 },
    { header: 'UQC', key: 'uqc', width: 10 },
    { header: 'Total Quantity', key: 'qty', width: 15 },
    { header: 'Total Value', key: 'val', width: 16, style: { numFmt: currencyFormat } },
    { header: 'Rate', key: 'rate', width: 10 },
    { header: 'Taxable Value', key: 'taxable', width: 16, style: { numFmt: currencyFormat } },
    { header: 'Integrated Tax Amount', key: 'igst', width: 20, style: { numFmt: currencyFormat } },
    { header: 'Central Tax Amount', key: 'cgst', width: 18, style: { numFmt: currencyFormat } },
    { header: 'State/UT Tax Amount', key: 'sgst', width: 18, style: { numFmt: currencyFormat } },
    { header: 'Cess Amount', key: 'cess', width: 14, style: { numFmt: currencyFormat } }
  ];
  applyGstnHeaderStyle(sheetHsn);

  for (const item of (data.hsn || [])) {
    sheetHsn.addRow({
      hsn: item.hsnSacCode,
      desc: item.description,
      uqc: item.uqc,
      qty: item.totalQuantity,
      val: paiseToRupees(item.totalValuePaise),
      rate: item.ratePercentage,
      taxable: paiseToRupees(item.taxableValuePaise),
      igst: paiseToRupees(item.integratedTaxPaise),
      cgst: paiseToRupees(item.centralTaxPaise),
      sgst: paiseToRupees(item.stateUtTaxPaise),
      cess: paiseToRupees(item.cessAmountPaise)
    });
  }

  // =========================================================================
  // SHEET 7: doc (Official Table 13: Documents issued during the tax period)
  // =========================================================================
  const sheetDoc = workbook.addWorksheet('doc', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheetDoc.columns = [
    { header: 'Nature of Document', key: 'nature', width: 32 },
    { header: 'Sr. No. From', key: 'from', width: 20 },
    { header: 'Sr. No. To', key: 'to', width: 20 },
    { header: 'Total Number', key: 'total', width: 15 },
    { header: 'Cancelled', key: 'cancelled', width: 15 },
    { header: 'Net Issued', key: 'net', width: 15 }
  ];
  applyGstnHeaderStyle(sheetDoc);

  for (const item of (data.docs || [])) {
    sheetDoc.addRow({
      nature: item.natureOfDocument,
      from: item.srNoFrom,
      to: item.srNoTo,
      total: item.totalNumber,
      cancelled: item.cancelled,
      net: item.netIssued
    });
  }

  return workbook;
}
