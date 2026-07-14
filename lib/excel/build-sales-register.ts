import ExcelJS from 'exceljs';
import type { ExportData, ExportInvoice, ExportCreditNote } from '@/lib/actions/reports/get-export-data';
import { paiseToRupees } from '@/lib/money';
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states';

const getStateNameByCode = (code: string | null) => {
  if (!code) return '';
  const state = INDIAN_GST_STATES.find(s => s.code === code);
  return state ? `${code}-${state.name}` : code;
};

export async function buildSalesRegisterWorkbook(data: ExportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bill Matrix';
  workbook.created = new Date();

  // Reusable currency format (e.g. #,##0.00)
  const currencyFormat = '#,##0.00';

  const addHeaderBlock = (sheet: ExcelJS.Worksheet, title: string) => {
    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = data.business.legal_name;
    sheet.getCell('A1').font = { bold: true, size: 14 };

    sheet.mergeCells('A2:D2');
    sheet.getCell('A2').value = `GSTIN: ${data.business.gstin}`;

    sheet.mergeCells('A3:D3');
    sheet.getCell('A3').value = `${title} for: ${data.label}`;

    sheet.mergeCells('A4:D4');
    sheet.getCell('A4').value = `Generated on: ${new Date().toLocaleDateString('en-IN')}`;
  };

  // ---------------------------------------------------------
  // SHEET 1: Sales Register
  // ---------------------------------------------------------
  const sheet1 = workbook.addWorksheet('Sales Register', { views: [{ state: 'frozen', ySplit: 6 }] });
  addHeaderBlock(sheet1, 'Sales Register');

  const sheet1Columns = [
    { header: 'S.No', key: 'sno', width: 8 },
    { header: 'Invoice No', key: 'invoice_number', width: 20 },
    { header: 'Date', key: 'invoice_date', width: 15 },
    { header: 'Customer Name', key: 'customer_name', width: 30 },
    { header: 'Customer GSTIN', key: 'customer_gstin', width: 20 },
    { header: 'Place of Supply', key: 'pos', width: 25 },
    { header: 'Supply Type', key: 'supply_type', width: 15 },
    { header: 'Taxable Value', key: 'taxable', width: 15, style: { numFmt: currencyFormat } },
    { header: 'CGST', key: 'cgst', width: 15, style: { numFmt: currencyFormat } },
    { header: 'SGST', key: 'sgst', width: 15, style: { numFmt: currencyFormat } },
    { header: 'IGST', key: 'igst', width: 15, style: { numFmt: currencyFormat } },
    { header: 'Total Tax', key: 'tax', width: 15, style: { numFmt: currencyFormat } },
    { header: 'Invoice Total', key: 'total', width: 15, style: { numFmt: currencyFormat } },
    { header: 'Payment Status', key: 'payment_status', width: 15 },
  ];

  // Put columns on row 6
  sheet1.getRow(6).values = sheet1Columns.map(c => c.header);
  sheet1.getRow(6).font = { bold: true };
  sheet1.getRow(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
  sheet1.columns = sheet1Columns; // Set widths and keys

  let rowCount = 7;
  let t_taxable = 0, t_cgst = 0, t_sgst = 0, t_igst = 0, t_tax = 0, t_total = 0;

  data.invoices.forEach((inv: ExportInvoice, index: number) => {
    const supplyType = inv.total_igst_paise > 0 ? 'Inter-State' : 'Intra-State';
    const taxable = paiseToRupees(inv.subtotal_paise);
    const cgst = paiseToRupees(inv.total_cgst_paise);
    const sgst = paiseToRupees(inv.total_sgst_paise);
    const igst = paiseToRupees(inv.total_igst_paise);
    const tax = paiseToRupees(inv.total_tax_paise);
    const total = paiseToRupees(inv.grand_total_paise);

    t_taxable += taxable;
    t_cgst += cgst;
    t_sgst += sgst;
    t_igst += igst;
    t_tax += tax;
    t_total += total;

    const row = sheet1.getRow(rowCount++);
    row.values = {
      sno: index + 1,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      customer_name: inv.customer_name || 'Cash',
      customer_gstin: inv.customer_gstin || 'Unregistered',
      pos: getStateNameByCode(inv.place_of_supply_state_code),
      supply_type: supplyType,
      taxable,
      cgst,
      sgst,
      igst,
      tax,
      total,
      payment_status: inv.payment_status.toUpperCase(),
    };
  });

  const sheet1TotalsRow = sheet1.getRow(rowCount);
  sheet1TotalsRow.values = {
    supply_type: 'TOTAL',
    taxable: t_taxable,
    cgst: t_cgst,
    sgst: t_sgst,
    igst: t_igst,
    tax: t_tax,
    total: t_total,
  };
  sheet1TotalsRow.font = { bold: true };

  // ---------------------------------------------------------
  // SHEET 2: HSN Summary
  // ---------------------------------------------------------
  const sheet2 = workbook.addWorksheet('HSN Summary', { views: [{ state: 'frozen', ySplit: 6 }] });
  addHeaderBlock(sheet2, 'HSN Summary');

  const sheet2Columns = [
    { header: 'HSN/SAC Code', key: 'hsn', width: 15 },
    { header: 'Description', key: 'desc', width: 30 },
    { header: 'UQC', key: 'uqc', width: 10 },
    { header: 'Total Quantity', key: 'qty', width: 15 },
    { header: 'Taxable Value', key: 'taxable', width: 15, style: { numFmt: currencyFormat } },
    { header: 'CGST', key: 'cgst', width: 15, style: { numFmt: currencyFormat } },
    { header: 'SGST', key: 'sgst', width: 15, style: { numFmt: currencyFormat } },
    { header: 'IGST', key: 'igst', width: 15, style: { numFmt: currencyFormat } },
    { header: 'Total Tax', key: 'tax', width: 15, style: { numFmt: currencyFormat } },
    { header: 'Total Value', key: 'total', width: 15, style: { numFmt: currencyFormat } },
  ];

  sheet2.getRow(6).values = sheet2Columns.map(c => c.header);
  sheet2.getRow(6).font = { bold: true };
  sheet2.getRow(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
  sheet2.columns = sheet2Columns;

  rowCount = 7;
  let h_taxable = 0, h_cgst = 0, h_sgst = 0, h_igst = 0, h_tax = 0, h_total = 0;

  data.hsnSummary.forEach((hsn) => {
    const taxable = paiseToRupees(hsn.taxable_value_paise);
    const cgst = paiseToRupees(hsn.cgst_paise);
    const sgst = paiseToRupees(hsn.sgst_paise);
    const igst = paiseToRupees(hsn.igst_paise);
    const tax = paiseToRupees(hsn.total_tax_paise);
    const total = paiseToRupees(hsn.total_value_paise);

    h_taxable += taxable;
    h_cgst += cgst;
    h_sgst += sgst;
    h_igst += igst;
    h_tax += tax;
    h_total += total;

    const row = sheet2.getRow(rowCount++);
    row.values = {
      hsn: hsn.hsn_sac_code,
      desc: hsn.description,
      uqc: hsn.unit_of_measurement,
      qty: hsn.total_quantity,
      taxable,
      cgst,
      sgst,
      igst,
      tax,
      total,
    };
  });

  const sheet2TotalsRow = sheet2.getRow(rowCount);
  sheet2TotalsRow.values = {
    qty: 'TOTAL',
    taxable: h_taxable,
    cgst: h_cgst,
    sgst: h_sgst,
    igst: h_igst,
    tax: h_tax,
    total: h_total,
  };
  sheet2TotalsRow.font = { bold: true };

  // ---------------------------------------------------------
  // SHEET 3: Credit Notes
  // ---------------------------------------------------------
  const sheet3 = workbook.addWorksheet('Credit Notes', { views: [{ state: 'frozen', ySplit: 6 }] });
  addHeaderBlock(sheet3, 'Credit Notes');

  const sheet3Columns = [
    { header: 'S.No', key: 'sno', width: 8 },
    { header: 'Credit Note No', key: 'cn_number', width: 20 },
    { header: 'Date', key: 'cn_date', width: 15 },
    { header: 'Supply Type', key: 'supply_type', width: 15 },
    { header: 'Taxable Value', key: 'taxable', width: 15, style: { numFmt: currencyFormat } },
    { header: 'CGST', key: 'cgst', width: 15, style: { numFmt: currencyFormat } },
    { header: 'SGST', key: 'sgst', width: 15, style: { numFmt: currencyFormat } },
    { header: 'IGST', key: 'igst', width: 15, style: { numFmt: currencyFormat } },
    { header: 'Total Tax', key: 'tax', width: 15, style: { numFmt: currencyFormat } },
    { header: 'Total Value', key: 'total', width: 15, style: { numFmt: currencyFormat } },
  ];

  sheet3.getRow(6).values = sheet3Columns.map(c => c.header);
  sheet3.getRow(6).font = { bold: true };
  sheet3.getRow(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
  sheet3.columns = sheet3Columns;

  rowCount = 7;
  let c_taxable = 0, c_cgst = 0, c_sgst = 0, c_igst = 0, c_tax = 0, c_total = 0;

  data.creditNotes.forEach((cn: ExportCreditNote, index: number) => {
    const supplyType = cn.total_igst_paise > 0 ? 'Inter-State' : 'Intra-State';
    const taxable = paiseToRupees(cn.subtotal_paise);
    const cgst = paiseToRupees(cn.total_cgst_paise);
    const sgst = paiseToRupees(cn.total_sgst_paise);
    const igst = paiseToRupees(cn.total_igst_paise);
    const tax = paiseToRupees(cn.total_tax_paise);
    const total = paiseToRupees(cn.grand_total_paise);

    c_taxable += taxable;
    c_cgst += cgst;
    c_sgst += sgst;
    c_igst += igst;
    c_tax += tax;
    c_total += total;

    const row = sheet3.getRow(rowCount++);
    row.values = {
      sno: index + 1,
      cn_number: cn.credit_note_number,
      cn_date: cn.issue_date,
      supply_type: supplyType,
      taxable,
      cgst,
      sgst,
      igst,
      tax,
      total,
    };
  });

  const sheet3TotalsRow = sheet3.getRow(rowCount);
  sheet3TotalsRow.values = {
    supply_type: 'TOTAL',
    taxable: c_taxable,
    cgst: c_cgst,
    sgst: c_sgst,
    igst: c_igst,
    tax: c_tax,
    total: c_total,
  };
  sheet3TotalsRow.font = { bold: true };

  // ---------------------------------------------------------
  // SHEET 4: Summary
  // ---------------------------------------------------------
  const sheet4 = workbook.addWorksheet('Summary');

  sheet4.getColumn('A').width = 25;
  sheet4.getColumn('B').width = 20;

  sheet4.getCell('A1').value = 'Period Summary';
  sheet4.getCell('A1').font = { bold: true, size: 16 };

  sheet4.getCell('A3').value = 'Period';
  sheet4.getCell('B3').value = data.label;

  sheet4.getCell('A4').value = 'Total Invoices';
  sheet4.getCell('B4').value = data.periodTotals.totalInvoices;

  sheet4.getCell('A5').value = 'Total Taxable Value';
  sheet4.getCell('B5').value = paiseToRupees(data.periodTotals.totalTaxableValuePaise);
  sheet4.getCell('B5').numFmt = currencyFormat;

  sheet4.getCell('A6').value = 'Total CGST';
  sheet4.getCell('B6').value = paiseToRupees(data.periodTotals.totalCgstPaise);
  sheet4.getCell('B6').numFmt = currencyFormat;

  sheet4.getCell('A7').value = 'Total SGST';
  sheet4.getCell('B7').value = paiseToRupees(data.periodTotals.totalSgstPaise);
  sheet4.getCell('B7').numFmt = currencyFormat;

  sheet4.getCell('A8').value = 'Total IGST';
  sheet4.getCell('B8').value = paiseToRupees(data.periodTotals.totalIgstPaise);
  sheet4.getCell('B8').numFmt = currencyFormat;

  sheet4.getCell('A9').value = 'Total Tax';
  sheet4.getCell('B9').value = paiseToRupees(data.periodTotals.totalTaxPaise);
  sheet4.getCell('B9').numFmt = currencyFormat;

  sheet4.getCell('A10').value = 'Total Invoice Value';
  sheet4.getCell('B10').value = paiseToRupees(data.periodTotals.totalInvoiceValuePaise);
  sheet4.getCell('B10').numFmt = currencyFormat;

  // Make summary labels bold
  for (let i = 3; i <= 10; i++) {
    sheet4.getCell(`A${i}`).font = { bold: true };
  }

  return workbook;
}
