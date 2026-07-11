import { getInvoice } from '@/lib/actions/invoices/get-invoice';
import { InvoiceForm } from '@/components/app/invoices/invoice-form';
import { InvoiceDetail } from '@/components/app/invoices/invoice-detail';
import { db } from '@/lib/db/client';
import { businesses, customers, products, taxRates, financialYears } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/auth/session';
import { resolveInvoiceNumber } from '@/lib/invoices/number-format';
import { getIndianFinancialYearForDate } from '@/lib/invoices/financial-year';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const result = await getInvoice({ id });
  if (!result.success) {
    if (result.error.code === 'UNAUTHORIZED') redirect('/login');
    return <div className="p-4 text-destructive">Invoice not found or you do not have access.</div>;
  }
  
  const invoice = result.data;
  const appUser = await getCurrentAppUser();
  if (!appUser?.business_id) redirect('/settings');

  const businessResult = await db.select().from(businesses).where(eq(businesses.id, appUser.business_id));
  const business = businessResult[0];

  if (invoice?.lifecycle_status === 'draft') {
    const allCustomers = await db.select().from(customers).where(eq(customers.business_id, appUser.business_id));
    const allProducts = await db.select().from(products).where(eq(products.business_id, appUser.business_id));
    const allTaxRates = await db.select().from(taxRates).where(eq(taxRates.is_active, true));

    const activeFys = await db.select().from(financialYears).where(eq(financialYears.business_id, appUser.business_id));
    const currentLabel = getIndianFinancialYearForDate(new Date()).label;
    const activeFy = activeFys.find(fy => fy.label === currentLabel);
    
    let invoiceNumberFormatPreview = 'DRAFT';
    if (business) {
      try {
        invoiceNumberFormatPreview = resolveInvoiceNumber(business.invoice_number_format, {
          invoiceDate: new Date(),
          fyLabel: activeFy ? activeFy.label : currentLabel,
          sequenceValue: activeFy ? activeFy.invoice_sequence_counter + 1 : 1
        });
      } catch (e) {}
    }

    // Convert line items to Draft Input Format
    const initialData = {
      id: invoice.id,
      customer_id: invoice.customer_id,
      notes: invoice.notes || '',
      line_items: invoice.lineItems.map(li => ({
        product_id: li.product_id || '',
        description: li.description,
        hsn_sac_code: li.hsn_sac_code,
        quantity: Number(li.quantity),
        unit_of_measurement: li.unit_of_measurement,
        unit_price: li.unit_price_paise / 100,
        discount: li.discount_paise / 100,
        tax_rate_id: allTaxRates.find(tr => Number(tr.rate_percentage) === Number(li.tax_rate_percentage))?.id || allTaxRates[0]?.id
      }))
    };

    return (
      <InvoiceForm 
        initialData={initialData}
        customers={allCustomers}
        products={allProducts}
        taxRates={allTaxRates}
        businessStateCode={business.state_code}
        invoiceNumberFormatPreview={invoiceNumberFormatPreview}
        isDraft={true}
      />
    );
  }

  // Finalized
  return <InvoiceDetail invoice={{...invoice, business_name: business.legal_name}} />;
}
