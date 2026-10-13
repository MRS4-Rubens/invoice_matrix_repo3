import ExcelJS from 'exceljs';
import type { ItrExportData } from '@/lib/actions/reports/get-itr-data';
import { paiseToRupees } from '@/lib/money';

const currencyFormat = '#,##0.00';

export async function buildItrReportWorkbook(data: ItrExportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bill Matrix';
  workbook.created = new Date();

  // Color constants matching the user's screenshot
  const HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2B5797' } // Classic dark blue / indigo header
  };

  const TOTAL_ROW_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' } // Soft ice-blue total row
  };

  const GRAND_TOTAL_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB9C' } // Soft gold / yellow highlight
  };

  const THIN_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
  };

  const supportedRates = (data.supportedRates && data.supportedRates.length > 0)
    ? data.supportedRates
    : [0, 5, 12, 18, 28];
  const invoicesList = data.invoices || [];
  const rateTotals = data.rateTotals || {};

  // ---------------------------------------------------------
  // SHEET 1: ITR Report (Exact replica of user's father's sheet)
  // ---------------------------------------------------------
  const sheet1Title = data.isAnnual ? 'Rate-Wise Sales Register' : 'ITR Report';
  const sheet1 = workbook.addWorksheet(sheet1Title, {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  // Dynamic columns: 4 fixed info columns + each supported rate column
  const fixedColumns = [
    { header: 'Invoice No', key: 'invoice_number', width: 22 },
    { header: 'Date', key: 'invoice_date', width: 14 },
    { header: 'Buyer Name', key: 'customer_name', width: 32 },
    { header: 'Buyer GSTIN', key: 'customer_gstin', width: 20 },
  ];

  const rateColumns = supportedRates.map((r) => ({
    header: `${r}% GST`,
    key: `rate_${r}`,
    width: 14,
    style: { numFmt: currencyFormat }
  }));

  const allColumns = [...fixedColumns, ...rateColumns];
  sheet1.columns = allColumns;

  // Style Header Row (Row 1)
  const headerRow = sheet1.getRow(1);
  headerRow.height = 26;
  headerRow.values = allColumns.map((c) => c.header);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 10.5 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Populate Invoices
  let currentRowNum = 2;
  for (const inv of invoicesList) {
    const row = sheet1.getRow(currentRowNum++);
    row.height = 20;

    const rowValues: Record<string, ExcelJS.CellValue> = {
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date || '',
      customer_name: inv.customer_name || 'Cash Customer',
      customer_gstin: inv.customer_gstin || 'Unregistered'
    };

    // Slot amounts into matching rate columns (blank if 0, matching user's screenshot)
    for (const r of supportedRates) {
      const taxablePaise = (inv.rates && inv.rates[r]) || 0;
      if (taxablePaise > 0) {
        rowValues[`rate_${r}`] = paiseToRupees(taxablePaise);
      } else {
        rowValues[`rate_${r}`] = null;
      }
    }

    row.values = rowValues;
    row.eachCell((cell, colNumber) => {
      cell.border = THIN_BORDER;
      cell.font = { name: 'Arial', size: 10 };
      if (colNumber > 4) {
        cell.numFmt = currencyFormat;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (colNumber === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  }

  // TOTAL Row
  const totalRow = sheet1.getRow(currentRowNum);
  totalRow.height = 22;

  const totalValues: Record<string, ExcelJS.CellValue> = {
    invoice_number: 'TOTAL',
    invoice_date: '',
    customer_name: '',
    customer_gstin: ''
  };

  for (const r of supportedRates) {
    const sumPaise = (rateTotals && rateTotals[r]) || 0;
    totalValues[`rate_${r}`] = sumPaise > 0 ? paiseToRupees(sumPaise) : 0;
  }

  totalRow.values = totalValues;
  totalRow.eachCell((cell, colNumber) => {
    cell.fill = TOTAL_ROW_FILL;
    cell.font = { name: 'Arial', bold: true, size: 10.5 };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF8EA9DB' } },
      bottom: { style: 'medium', color: { argb: 'FF8EA9DB' } }
    };
    if (colNumber > 4) {
      cell.numFmt = currencyFormat;
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    }
  });

  // Summary Box (Rows 6-12 style from screenshot)
  currentRowNum += 2; // Add spacer row

  for (const r of supportedRates) {
    const sumPaise = (rateTotals && rateTotals[r]) || 0;
    const summaryRow = sheet1.getRow(currentRowNum++);
    summaryRow.height = 20;

    // Label cell in Col C
    const labelCell = summaryRow.getCell(3);
    labelCell.value = `${r}% GST Total sales =`;
    labelCell.font = { name: 'Arial', bold: false, size: 10 };
    labelCell.alignment = { vertical: 'middle', horizontal: 'right' };

    // Value cell in Col D
    const valCell = summaryRow.getCell(4);
    valCell.value = paiseToRupees(sumPaise);
    valCell.numFmt = currencyFormat;
    valCell.font = { name: 'Arial', bold: sumPaise > 0, size: 10 };
    valCell.alignment = { vertical: 'middle', horizontal: 'right' };
  }

  currentRowNum++; // Spacer row before Grand Total

  // Grand Total Sales Row (Row 12 highlighted in yellow)
  const grandTotalRow = sheet1.getRow(currentRowNum);
  grandTotalRow.height = 24;

  const gtLabelCell = grandTotalRow.getCell(3);
  gtLabelCell.value = 'Grand Total Sales';
  gtLabelCell.font = { name: 'Arial', bold: true, size: 11 };
  gtLabelCell.fill = GRAND_TOTAL_FILL;
  gtLabelCell.alignment = { vertical: 'middle', horizontal: 'center' };
  gtLabelCell.border = {
    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin', color: { argb: 'FFD9D9D9' } }
  };

  const gtValCell = grandTotalRow.getCell(4);
  gtValCell.value = paiseToRupees(data.totalSalesTaxablePaise);
  gtValCell.numFmt = currencyFormat;
  gtValCell.font = { name: 'Arial', bold: true, size: 11.5 };
  gtValCell.fill = GRAND_TOTAL_FILL;
  gtValCell.alignment = { vertical: 'middle', horizontal: 'right' };
  gtValCell.border = {
    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
  };

  // ---------------------------------------------------------
  // ANNUAL SUPPORT: Sheets 2 & 3 if full Financial Year
  // ---------------------------------------------------------
  if (data.isAnnual && data.monthlySummary.length > 0) {
    // Sheet 2: Month-wise ITR Turnover Schedule
    const sheet2 = workbook.addWorksheet('Month-wise ITR Schedule');
    sheet2.views = [{ state: 'frozen', ySplit: 2 }];

    sheet2.mergeCells('A1:H1');
    const s2Title = sheet2.getCell('A1');
    s2Title.value = `${data.business.legal_name} — Month-wise Turnover Schedule (${data.label})`;
    s2Title.font = { name: 'Arial', bold: true, size: 13 };
    s2Title.alignment = { vertical: 'middle' };
    sheet2.getRow(1).height = 26;

    const s2Headers = [
      { header: 'Month', key: 'month', width: 16 },
      { header: 'Quarter', key: 'quarter', width: 15 },
      { header: 'Invoices', key: 'count', width: 12 },
      ...supportedRates.map((r) => ({
        header: `${r}% Sales`,
        key: `r_${r}`,
        width: 14,
        style: { numFmt: currencyFormat }
      })),
      { header: 'Taxable Turnover', key: 'turnover', width: 18, style: { numFmt: currencyFormat } },
      { header: 'Total GST', key: 'gst', width: 15, style: { numFmt: currencyFormat } },
      { header: 'Gross Value', key: 'gross', width: 18, style: { numFmt: currencyFormat } }
    ];

    sheet2.getRow(2).height = 24;
    sheet2.getRow(2).values = s2Headers.map((h) => h.header);
    sheet2.getRow(2).eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet2.columns = s2Headers;

    let s2Row = 3;
    for (const m of (data.monthlySummary || [])) {
      const row = sheet2.getRow(s2Row++);
      row.height = 20;
      const values: Record<string, ExcelJS.CellValue> = {
        month: m.monthLabel,
        quarter: m.quarterLabel,
        count: m.invoiceCount,
        turnover: paiseToRupees(m.subtotal_paise),
        gst: paiseToRupees(m.total_tax_paise),
        gross: paiseToRupees(m.grand_total_paise)
      };
      for (const r of supportedRates) {
        values[`r_${r}`] = paiseToRupees((m.rates && m.rates[r]) || 0);
      }
      row.values = values;
      row.eachCell((cell, colNum) => {
        cell.border = THIN_BORDER;
        cell.font = { name: 'Arial', size: 10 };
        if (colNum >= 4) cell.numFmt = currencyFormat;
      });
    }

    // Annual Totals Row on Sheet 2
    const s2TotalRow = sheet2.getRow(s2Row);
    s2TotalRow.height = 22;
    const s2TotalVals: Record<string, ExcelJS.CellValue> = {
      month: 'ANNUAL TOTAL',
      quarter: '',
      count: (data.invoices || []).length,
      turnover: paiseToRupees(data.totalSalesTaxablePaise || 0),
      gst: paiseToRupees(data.totalTaxPaise || 0),
      gross: paiseToRupees(data.grandTotalSalesPaise || 0)
    };
    for (const r of supportedRates) {
      s2TotalVals[`r_${r}`] = paiseToRupees((rateTotals && rateTotals[r]) || 0);
    }
    s2TotalRow.values = s2TotalVals;
    s2TotalRow.eachCell((cell, colNum) => {
      cell.fill = TOTAL_ROW_FILL;
      cell.font = { name: 'Arial', bold: true, size: 10.5 };
      if (colNum >= 4) cell.numFmt = currencyFormat;
    });

    // Sheet 3: Section 44AD Presumptive Tax Calculation
    const sheet3 = workbook.addWorksheet('44AD Presumptive Tax');
    sheet3.getColumn(1).width = 38;
    sheet3.getColumn(2).width = 24;

    sheet3.mergeCells('A1:B1');
    const s3Title = sheet3.getCell('A1');
    s3Title.value = 'Income Tax Section 44AD — Presumptive Profit Computation';
    s3Title.font = { name: 'Arial', bold: true, size: 13 };
    sheet3.getRow(1).height = 26;

    const p44 = data.turnover44Ad || {
      totalTurnoverPaise: 0,
      digitalReceiptsPaise: 0,
      cashReceiptsPaise: 0,
      unpaidReceivablesPaise: 0,
      presumptiveDigitalProfitPaise: 0,
      presumptiveCashProfitPaise: 0,
      totalPresumptiveProfitPaise: 0
    };
    const s3Data = [
      ['Financial Year / Assessment Window', data.label],
      ['Total Taxable Turnover (Excl. GST)', paiseToRupees(p44.totalTurnoverPaise)],
      ['Digital Receipts (UPI / Bank / Card / Cheque)', paiseToRupees(p44.digitalReceiptsPaise)],
      ['Cash Receipts & Unpaid Balance', paiseToRupees(p44.cashReceiptsPaise + p44.unpaidReceivablesPaise)],
      ['----------------------------------------', '----------------------'],
      ['Presumptive Profit on Digital @ 6% (Sec 44AD)', paiseToRupees(p44.presumptiveDigitalProfitPaise)],
      ['Presumptive Profit on Cash @ 8% (Sec 44AD)', paiseToRupees(p44.presumptiveCashProfitPaise)],
      ['Total Minimum Deemed Business Income for ITR-4', paiseToRupees(p44.totalPresumptiveProfitPaise)],
    ];

    let s3Row = 3;
    for (const [desc, val] of s3Data) {
      const row = sheet3.getRow(s3Row++);
      row.height = 22;
      row.getCell(1).value = desc;
      row.getCell(1).font = { name: 'Arial', bold: true, size: 10 };
      row.getCell(2).value = val;
      row.getCell(2).font = { name: 'Arial', bold: true, size: 10.5 };
      if (typeof val === 'number') {
        row.getCell(2).numFmt = currencyFormat;
        row.getCell(2).alignment = { horizontal: 'right' };
      }
    }

    // Highlight deemed income row
    const deemedRow = sheet3.getRow(s3Row - 1);
    deemedRow.getCell(1).fill = GRAND_TOTAL_FILL;
    deemedRow.getCell(2).fill = GRAND_TOTAL_FILL;
  }

  return workbook;
}
