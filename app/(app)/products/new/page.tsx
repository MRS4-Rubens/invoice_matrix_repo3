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
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Add Product/Service</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a product or service to your catalogue
        </p>
      </div>

      <ProductForm taxRates={taxRatesResult.data} />
    </div>
  );
}
