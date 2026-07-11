import { InvoiceForm } from '@/components/app/invoices/invoice-form';
import { db } from '@/lib/db/client';
import { businesses, customers, products, taxRates, financialYears } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/auth/session';
import { resolveInvoiceNumber } from '@/lib/invoices/number-format';
import { getIndianFinancialYearForDate } from '@/lib/invoices/financial-year';

export default async function NewInvoicePage() {
  const appUser = await getCurrentAppUser();
  if (!appUser?.business_id) {
    redirect('/settings');
  }

  const businessResult = await db.select().from(businesses).where(eq(businesses.id, appUser.business_id));
  const business = businessResult[0];

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

  const allCustomers = await db.select().from(customers).where(eq(customers.business_id, appUser.business_id));
  const allProducts = await db.select().from(products).where(eq(products.business_id, appUser.business_id));
  const allTaxRates = await db.select().from(taxRates).where(eq(taxRates.is_active, true));

  return (
    <InvoiceForm 
      customers={allCustomers}
      products={allProducts}
      taxRates={allTaxRates}
      businessStateCode={business.state_code}
      invoiceNumberFormatPreview={invoiceNumberFormatPreview}
      isDraft={false}
    />
  );
}
