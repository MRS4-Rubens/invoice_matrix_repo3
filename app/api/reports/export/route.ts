import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { users, businesses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { exportLimiter, checkRateLimit } from '@/lib/rate-limit/upstash';
import { getExportData } from '@/lib/actions/reports/get-export-data';
import { buildSalesRegisterWorkbook } from '@/lib/excel/build-sales-register';
import { getItrExportData } from '@/lib/actions/reports/get-itr-data';
import { buildItrReportWorkbook } from '@/lib/excel/build-itr-report';
import { getGstr1ExportData } from '@/lib/actions/reports/get-gstr1-data';
import { buildGstr1Workbook } from '@/lib/excel/build-gstr1-report';
import { buildHsnWorkbook } from '@/lib/excel/build-hsn-report';
import { canExportStatutoryReport } from '@/lib/subscriptions/entitlements';

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

  if (!appUser.business_id) {
    return new Response('No business profile linked to user.', { status: 400 });
  }

  // 2. Entitlement check for statutory Excel reports
  const bizResult = await db
    .select({
      subscription_plan: businesses.subscription_plan,
      subscription_status: businesses.subscription_status,
      trial_ends_at: businesses.trial_ends_at,
      subscription_ends_at: businesses.subscription_ends_at,
    })
    .from(businesses)
    .where(eq(businesses.id, appUser.business_id))
    .limit(1);

  if (bizResult.length === 0) {
    return new Response('Business profile not found.', { status: 404 });
  }

  const exportCheck = canExportStatutoryReport(bizResult[0]);
  if (!exportCheck.allowed) {
    return new Response(
      JSON.stringify({ error: exportCheck.reason, code: exportCheck.code }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

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
  const type = searchParams.get('type') || 'sales_register';

  if (!startDate || !endDate || !label) {
    return new Response('Missing required parameters: startDate, endDate, label', { status: 400 });
  }

  const sanitizedLabel = label.replace(/[\/\s]/g, '-');

  // 3. Dispatch based on report type
  if (type === 'gstr1') {
    const gstr1DataRes = await getGstr1ExportData({ startDate, endDate, label });
    if (!gstr1DataRes.success) {
      return new Response(gstr1DataRes.error.message, { status: 500 });
    }

    const workbook = await buildGstr1Workbook(gstr1DataRes.data);
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="GSTR1-${sanitizedLabel}.xlsx"`
      }
    });
  }

  if (type === 'itr_report') {
    const itrDataRes = await getItrExportData({ startDate, endDate, label });
    if (!itrDataRes.success) {
      return new Response(itrDataRes.error.message, { status: 500 });
    }

    const workbook = await buildItrReportWorkbook(itrDataRes.data);
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="ITR-Report-${sanitizedLabel}.xlsx"`
      }
    });
  }

  if (type === 'hsn_summary') {
    const gstr1DataRes = await getGstr1ExportData({ startDate, endDate, label });
    if (!gstr1DataRes.success) {
      return new Response(gstr1DataRes.error.message, { status: 500 });
    }

    const workbook = await buildHsnWorkbook(gstr1DataRes.data);
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="HSN-Summary-${sanitizedLabel}.xlsx"`
      }
    });
  }

  // Default / Legacy fallback: Sales Register
  const exportDataRes = await getExportData({ startDate, endDate, label });
  if (!exportDataRes.success) {
    return new Response(exportDataRes.error.message, { status: 500 });
  }

  const workbook = await buildSalesRegisterWorkbook(exportDataRes.data);
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Sales-Register-${sanitizedLabel}.xlsx"`
    }
  });
}

