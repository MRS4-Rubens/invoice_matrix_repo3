import { redirect } from 'next/navigation';
import { getCreditNoteFormData } from '@/lib/actions/credit-notes/get-credit-note-form-data';
import { CreditNoteForm } from '@/components/app/credit-notes/credit-note-form';

export default async function NewCreditNotePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await getCreditNoteFormData({ invoiceId: id });

  if (!result.success) {
    if (result.error.code === 'UNAUTHORIZED') {
      redirect('/login');
    }
    return (
      <div className="space-y-4">
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm font-medium">
          <strong className="font-bold">Cannot Issue Credit Note:</strong> {result.error.message}
        </div>
      </div>
    );
  }

  const { invoice, previouslyCreditedPaise, business, lineItems, taxRates } = result.data;

  // Filter out any items that have 0 remaining creditable quantity
  const creditableItems = lineItems.map(item => ({
    product_id: item.product_id,
    description: item.description,
    hsn_sac_code: item.hsn_sac_code,
    unit_of_measurement: item.unit_of_measurement,
    unit_price: item.unit_price_rupees,
    discount: item.discount_percentage,
    tax_rate_id: item.tax_rate_id,
    tax_rate_percentage: item.tax_rate_percentage,
    original_quantity: item.original_quantity,
    remaining_creditable_quantity: item.remaining_creditable_quantity,
    quantity: item.remaining_creditable_quantity
  }));

  return (
    <CreditNoteForm
      originalInvoice={invoice}
      previouslyCreditedPaise={previouslyCreditedPaise}
      business={business}
      initialLineItems={creditableItems}
      taxRates={taxRates}
    />
  );
}
