import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { creditNotes, creditNoteLineItems, invoices, businesses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyArchivalToken } from '@/lib/security/archival-token';
import { exportLimiter, checkRateLimit, getClientIp } from '@/lib/rate-limit/upstash';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToStaticMarkup } = require('react-dom/server');
import { CreditNotePrintView, CreditNotePrintViewProps } from '@/components/app/credit-notes/credit-note-print-view';
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

  const ip = getClientIp(request.headers);
  const { allowed, retryAfterSeconds } = await checkRateLimit(exportLimiter, `archival-render:${ip}`);
  if (!allowed) {
    return new Response(`Too Many Requests. Retry after ${retryAfterSeconds} seconds.`, {
      status: 429,
      headers: { 'Retry-After': retryAfterSeconds.toString() }
    });
  }

  // Fetch the credit note (verified finalized)
  const cnRows = await db.select().from(creditNotes).where(eq(creditNotes.id, id));
  if (cnRows.length === 0) return new Response('Not Found', { status: 404 });
  const creditNote = cnRows[0];

  if (creditNote.lifecycle_status !== 'finalized') {
    return new Response('Credit note not finalized', { status: 400 });
  }

  const bizRows = await db.select().from(businesses).where(eq(businesses.id, creditNote.business_id));
  if (bizRows.length === 0) return new Response('Business Not Found', { status: 404 });
  const business = bizRows[0];

  const invRows = await db.select().from(invoices).where(eq(invoices.id, creditNote.original_invoice_id));
  if (invRows.length === 0) return new Response('Original Invoice Not Found', { status: 404 });
  const originalInvoice = invRows[0];

  const lineItems = await db
    .select()
    .from(creditNoteLineItems)
    .where(eq(creditNoteLineItems.credit_note_id, id))
    .orderBy(creditNoteLineItems.sort_order);

  const printData = {
    ...creditNote,
    business,
    originalInvoice,
    lineItems
  };

  const css = getCompiledCss();
  const printViewElement = CreditNotePrintView({
    creditNote: printData as unknown as CreditNotePrintViewProps['creditNote'],
    printSize: 'A4'
  });
  const componentHtml = renderToStaticMarkup(printViewElement);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Credit Note ${creditNote.credit_note_number}</title>
  <style>
    ${css}
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>
  ${componentHtml}
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
