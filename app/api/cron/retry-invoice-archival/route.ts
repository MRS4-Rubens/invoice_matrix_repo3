import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { invoices } from '@/lib/db/schema';
import { eq, inArray, lt, and, asc } from 'drizzle-orm';
import { archiveInvoicePdf } from '@/lib/storage/archive-invoice';

export async function GET(request: NextRequest) {
  // 1. Verify Vercel Cron Secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Query for up to 20 invoices pending/failed, max 5 attempts, oldest first
  const recordsToRetry = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        inArray(invoices.archival_status, ['pending', 'failed']),
        lt(invoices.archival_attempts, 5)
      )
    )
    .orderBy(asc(invoices.finalized_at))
    .limit(20);

  let succeeded = 0;
  let failed = 0;

  // 3. Process sequentially
  for (const record of recordsToRetry) {
    const result = await archiveInvoicePdf(record.id);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  // 4. Return summary
  return new Response(JSON.stringify({ 
    processed: recordsToRetry.length, 
    succeeded, 
    failed 
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
