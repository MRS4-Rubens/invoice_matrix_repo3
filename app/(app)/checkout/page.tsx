import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { CheckoutForm } from './checkout-form';
import { getCurrentAppUser } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { businesses, subscriptionRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'Upgrade Subscription',
};

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string; cycle?: string; action?: string }>;
}) {
  const user = await getCurrentAppUser();
  if (!user) {
    redirect('/login');
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const initialPlan = resolvedParams?.plan;
  const initialCycle = resolvedParams?.cycle;
  const initialAction = resolvedParams?.action;

  // 1. Force business profile completion first
  if (!user.business_id) {
    redirect('/settings');
  }

  // 2. Fetch business profile
  const bizResult = await db.select().from(businesses).where(eq(businesses.id, user.business_id));
  if (bizResult.length === 0) {
    redirect('/settings');
  }
  const business = bizResult[0];

  // 3. Fetch any existing pending claim requests
  const pendingRequests = await db
    .select()
    .from(subscriptionRequests)
    .where(
      and(
        eq(subscriptionRequests.business_id, user.business_id),
        eq(subscriptionRequests.status, 'pending')
      )
    )
    .limit(1);

  const pending = pendingRequests.length > 0
    ? {
        id: pendingRequests[0].id,
        plan_name: pendingRequests[0].plan_name,
        billing_cycle: pendingRequests[0].billing_cycle,
        amount_paise: pendingRequests[0].amount_paise,
        payment_reference: pendingRequests[0].payment_reference,
        created_at: pendingRequests[0].created_at.toISOString(),
      }
    : null;

  // 4. Load payee payment details securely from server-side environment variables
  const upiConfig = {
    upiId: process.env.ADMIN_UPI_ID || 'admin@okaxis',
    upiName: process.env.ADMIN_UPI_NAME || 'Bill Matrix Billing',
    bankName: process.env.ADMIN_BANK_NAME || 'State Bank of India',
    accName: process.env.ADMIN_BANK_ACC_NAME || 'Bill Matrix Admin',
    accNo: process.env.ADMIN_BANK_ACC_NO || '12345678901',
    ifsc: process.env.ADMIN_BANK_IFSC || 'SBIN0001234',
  };

  const businessProp = {
    id: business.id,
    legal_name: business.legal_name,
    gstin: business.gstin,
    subscription_plan: business.subscription_plan,
    subscription_status: business.subscription_status,
    subscription_activated_at: business.subscription_activated_at
      ? business.subscription_activated_at.toISOString()
      : null,
    subscription_ends_at: business.subscription_ends_at
      ? business.subscription_ends_at.toISOString()
      : null,
    trial_ends_at: business.trial_ends_at
      ? business.trial_ends_at.toISOString()
      : null,
    active_utr_no: business.active_utr_no,
  };

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-1 border-b border-border/40 pb-3 mb-5">
        <span className="inline-flex w-fit items-center rounded-lg bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 text-sm font-bold text-indigo-700 shadow-xs">
          Billing & Plans
        </span>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground font-heading uppercase">
          Subscription Portal
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your plan, check active service status, or upgrade to unlock unlimited billing.
        </p>
      </div>

      <CheckoutForm
        business={businessProp}
        pendingRequest={pending}
        upiConfig={upiConfig}
        initialPlan={initialPlan}
        initialCycle={initialCycle}
        initialAction={initialAction}
      />
    </div>
  );
}
