import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { invoices, invoiceLineItems, businesses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyArchivalToken } from '@/lib/security/archival-token';
const { renderToStaticMarkup } = require('react-dom/server');
import { InvoicePrintView } from '@/components/app/invoices/invoice-print-view';
import fs from 'fs';
import path from 'path';

function getCompiledCss() {
  try {
    const cssDir = path.join(process.cwd(), '.next', 'static', 'css');
    if (!fs.existsSync(cssDir)) return '';
    const files = fs.readdirSync(cssDir);
    let css = '';
    for (const file of files) {
      if (file.endsWith('.css')) {
        css += fs.readFileSync(path.join(cssDir, file), 'utf8') + '\n';
      }
    }
    return css;
  } catch (e) {
    console.error('Failed to read compiled CSS', e);
    return '';
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { valid, invoiceId } = verifyArchivalToken(token);
  if (!valid || invoiceId !== id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Fetch the invoice (verified finalized)
  const existing = await db.select().from(invoices).where(eq(invoices.id, id));
  if (existing.length === 0) return new Response('Not Found', { status: 404 });
  const invoice = existing[0];
  
  if (invoice.lifecycle_status !== 'finalized') {
    return new Response('Invoice not finalized', { status: 400 });
  }

  const businessResult = await db.select().from(businesses).where(eq(businesses.id, invoice.business_id));
  if (businessResult.length === 0) return new Response('Business Not Found', { status: 404 });
  const business = businessResult[0];

  const lineItems = await db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoice_id, id)).orderBy(invoiceLineItems.sort_order);

  const invoiceData = {
    ...invoice,
    business_name: business.legal_name,
    city: business.city,
    phone: business.phone,
    bank_name: business.bank_name,
    bank_account_number: business.bank_account_number,
    bank_ifsc: business.bank_ifsc,
    invoice_terms: business.invoice_terms,
    lineItems
  };

  const css = getCompiledCss();

  const printViewElement = InvoicePrintView({
    invoice: invoiceData,
    businessStateCode: business.state_code
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    ${css}
    /* Force print styles for the standalone render to ensure we capture the print layout */
    @media all {
      body { background-color: white; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
      .print\\:hidden { display: none !important; }
      .print\\:block { display: block !important; }
      .print\\:p-0 { padding: 0 !important; }
      .print\\:border-none { border: none !important; }
      .print\\:shadow-none { box-shadow: none !important; }
      .print\\:rounded-none { border-radius: 0 !important; }
    }
  </style>
</head>
<body class="antialiased font-sans">
  ${renderToStaticMarkup(printViewElement)}
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}
