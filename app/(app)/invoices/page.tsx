import { listInvoices } from '@/lib/actions/invoices/list-invoices';
import { InvoicesClient } from './client';
import { redirect } from 'next/navigation';

export default async function InvoicesPage() {
  const result = await listInvoices({});
  
  if (!result.success) {
    if (result.error.code === 'UNAUTHORIZED') {
      redirect('/login');
    }
    return <div className="p-4 text-destructive">Failed to load invoices.</div>;
  }

  return <InvoicesClient initialInvoices={result.data || []} />;
}
