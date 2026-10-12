import ExcelJS from 'exceljs';
import type { Gstr1ExportData } from '@/lib/actions/reports/get-gstr1-data';
import { paiseToRupees } from '@/lib/money';

const currencyFormat = '#,##0.00';

export async function buildHsnWorkbook(data: Gstr1ExportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bill Matrix';
  workbook.created = new Date();

  const HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD97706' } // Warm amber / statutory filing color matching card
  };

  const TOTAL_ROW_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEF3C7' } // Light amber / warm cream total row
  };

  const THIN_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
  };

  // ---------------------------------------------------------
  // SHEET 1: HSN / SAC Summary (Table 12 Standard)
  // ---------------------------------------------------------
  const sheet = workbook.addWorksheet('HSN Summary', {
    views: [{ state: 'frozen', ySplit: 6 }]
  });

  // Title Block
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = data.business.legal_name;
  titleCell.font = { name: 'Arial', bold: true, size: 14 };

  sheet.mergeCells('A2:F2');
  const gstinCell = sheet.getCell('A2');
  gstinCell.value = `GSTIN: ${data.business.gstin}`;
  gstinCell.font = { name: 'Arial', size: 10.5 };

  sheet.mergeCells('A3:F3');
  const periodCell = sheet.getCell('A3');
  periodCell.value = `HSN / SAC Outward Supplies Summary (Table 12) — ${data.label}`;
  periodCell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFB45309' } };

  sheet.mergeCells('A4:F4');
  const genCell = sheet.getCell('A4');
  genCell.value = `Generated on: ${new Date().toLocaleDateString('en-IN')}  |  Window: ${data.startDate} to ${data.endDate}`;
  genCell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF737373' } };

  // Columns definition
  const columns = [
    { header: 'S.No', key: 'sno', width: 8 },
    { header: 'HSN / SAC Code', key: 'hsn', width: 16 },
    { header: 'Description of Goods / Services', key: 'desc', width: 34 },
    { header: 'UQC', key: 'uqc', width: 14 },
    { header: 'Total Quantity', key: 'qty', width: 16 },
    { header: 'Tax Rate', key: 'rate', width: 12 },
    { header: 'Taxable Value (₹)', key: 'taxable', width: 18, style: { numFmt: currencyFormat } },
    { header: 'CGST (₹)', key: 'cgst', width: 16, style: { numFmt: currencyFormat } },
    { header: 'SGST (₹)', key: 'sgst', width: 16, style: { numFmt: currencyFormat } },
    { header: 'IGST (₹)', key: 'igst', width: 16, style: { numFmt: currencyFormat } },
    { header: 'Total Tax (₹)', key: 'tax', width: 16, style: { numFmt: currencyFormat } },
    { header: 'Total Value (₹)', key: 'total', width: 18, style: { numFmt: currencyFormat } },
  ];

  sheet.getRow(6).values = columns.map((c) => c.header);
  sheet.getRow(6).height = 25;
  sheet.getRow(6).eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  sheet.columns = columns;

  let rowCount = 7;
  let tQty = 0;
  let tTaxable = 0;
  let tCgst = 0;
  let tSgst = 0;
  let tIgst = 0;
  let tTax = 0;
  let tTotal = 0;

  data.hsn.forEach((item, index) => {
    const taxable = paiseToRupees(item.taxableValuePaise);
    const cgst = paiseToRupees(item.centralTaxPaise);
    const sgst = paiseToRupees(item.stateUtTaxPaise);
    const igst = paiseToRupees(item.integratedTaxPaise);
    const tax = cgst + sgst + igst;
    const total = paiseToRupees(item.totalValuePaise);

    tQty += item.totalQuantity;
    tTaxable += taxable;
    tCgst += cgst;
    tSgst += sgst;
    tIgst += igst;
    tTax += tax;
    tTotal += total;

    const row = sheet.getRow(rowCount++);
    row.height = 20;
    row.values = {
      sno: index + 1,
      hsn: item.hsnSacCode,
      desc: item.description,
      uqc: item.uqc,
      qty: item.totalQuantity,
      rate: `${item.ratePercentage}%`,
      taxable,
      cgst,
      sgst,
      igst,
      tax,
      total,
    };

    row.eachCell((cell, colNum) => {
      cell.border = THIN_BORDER;
      cell.font = { name: 'Arial', size: 10 };
      if (colNum >= 7) {
        cell.numFmt = currencyFormat;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (colNum === 1 || colNum === 4 || colNum === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  // TOTAL Row
  const totalRow = sheet.getRow(rowCount);
  totalRow.height = 24;
  totalRow.values = {
    sno: '',
    hsn: 'TOTAL',
    desc: `${data.hsn.length} Unique HSN/SAC Categories`,
    uqc: '',
    qty: tQty,
    rate: '',
    taxable: tTaxable,
    cgst: tCgst,
    sgst: tSgst,
    igst: tIgst,
    tax: tTax,
    total: tTotal,
  };

  totalRow.eachCell((cell, colNum) => {
    cell.fill = TOTAL_ROW_FILL;
    cell.font = { name: 'Arial', bold: true, size: 10.5 };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FFD97706' } },
      bottom: { style: 'medium', color: { argb: 'FFD97706' } }
    };
    if (colNum >= 7) {
      cell.numFmt = currencyFormat;
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else if (colNum === 5) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    }
  });

  return workbook;
}
