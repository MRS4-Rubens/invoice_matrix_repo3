import { getCurrentAppUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { listTaxRates } from '@/lib/actions/products/list-tax-rates';
import { ProductForm } from '@/components/app/products/product-form';

export default async function NewProductPage() {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect('/login');
  }

  if (!appUser.business_id) {
    redirect('/settings/business');
  }

  const taxRatesResult = await listTaxRates({});
  
  if (!taxRatesResult.success) {
    throw new Error(taxRatesResult.error.message || 'Failed to fetch tax rates');
  }

  return (
    <div className="w-full space-y-6">
      <ProductForm taxRates={taxRatesResult.data} />
    </div>
  );
}
