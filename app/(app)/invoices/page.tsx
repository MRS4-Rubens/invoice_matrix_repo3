import { listInvoices } from '@/lib/actions/invoices/list-invoices';
import { listCreditNotes } from '@/lib/actions/credit-notes/list-credit-notes';
import { InvoicesClient } from './client';
import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { businesses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function InvoicesPage() {
  const appUser = await getCurrentAppUser();
  if (!appUser?.business_id) {
    redirect('/settings');
  }

  const businessResult = await db
    .select({ state_code: businesses.state_code })
    .from(businesses)
    .where(eq(businesses.id, appUser.business_id))
    .limit(1);
  const businessStateCode = businessResult[0]?.state_code || '';

  const [result, cnResult] = await Promise.all([
    listInvoices({}),
    listCreditNotes({})
  ]);
  
  if (!result.success) {
    if (result.error.code === 'UNAUTHORIZED') {
      redirect('/login');
    }
    return <div className="p-4 text-destructive">Failed to load invoices.</div>;
  }

  return (
    <InvoicesClient 
      initialInvoices={result.data || []} 
      initialCreditNotes={cnResult.success ? cnResult.data : []}
      businessStateCode={businessStateCode} 
    />
  );
}
