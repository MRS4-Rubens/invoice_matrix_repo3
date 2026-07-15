import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { exportLimiter, checkRateLimit } from '@/lib/rate-limit/upstash';
import { getExportData } from '@/lib/actions/reports/get-export-data';
import { buildSalesRegisterWorkbook } from '@/lib/excel/build-sales-register';

export async function GET(request: NextRequest) {
  // 1. Session Check (return 401 if unauthorized, no redirect)
  const sessionResponse = await auth.getSession();
  if (!sessionResponse || !sessionResponse.data || !sessionResponse.data.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Resolve the app user manually since requireSession redirects
  const userRows = await db.select().from(users).where(eq(users.auth_user_id, sessionResponse.data.user.id));
  if (userRows.length === 0) {
    return new Response('Unauthorized', { status: 401 });
  }
  const appUser = userRows[0];

  const { allowed, retryAfterSeconds } = await checkRateLimit(exportLimiter, `export:${appUser.id}`);
  if (!allowed) {
    return new Response(`Too Many Requests. Retry after ${retryAfterSeconds} seconds.`, {
      status: 429,
      headers: { 'Retry-After': retryAfterSeconds.toString() }
    });
  }

  // 2. Parse search params
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const label = searchParams.get('label');

  if (!startDate || !endDate || !label) {
    return new Response('Missing required parameters: startDate, endDate, label', { status: 400 });
  }

  // 3. Get Export Data
  const exportDataRes = await getExportData({ startDate, endDate, label });
  if (!exportDataRes.success) {
    return new Response(exportDataRes.error.message, { status: 500 });
  }

  // 4. Build Workbook
  const workbook = await buildSalesRegisterWorkbook(exportDataRes.data);

  // 5. Convert to buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // 6. Return response
  const sanitizedLabel = label.replace(/[\/\s]/g, '-');
  return new Response(buffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Sales-Register-${sanitizedLabel}.xlsx"`
    }
  });
}
