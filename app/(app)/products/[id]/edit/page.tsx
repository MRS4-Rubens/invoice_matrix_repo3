import { getCurrentAppUser } from '@/lib/auth/session';
import { redirect, notFound } from 'next/navigation';
import { listTaxRates } from '@/lib/actions/products/list-tax-rates';
import { db } from '@/lib/db/client';
import { products } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { ProductForm } from '@/components/app/products/product-form';
import { ProductActions } from '@/components/app/products/product-actions';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect('/login');
  }

  if (!appUser.business_id) {
    redirect('/settings/business');
  }

  const [product, taxRatesResult] = await Promise.all([
    db.query.products.findFirst({
      where: and(
        eq(products.id, id),
        eq(products.business_id, appUser.business_id)
      )
    }),
    listTaxRates({})
  ]);

  if (!product) {
    notFound();
  }

  if (!taxRatesResult.success) {
    throw new Error(taxRatesResult.error.message || 'Failed to fetch tax rates');
  }

  return (
    <div className="w-full space-y-6">
      <ProductForm 
        product={product} 
        taxRates={taxRatesResult.data} 
        headerActions={<ProductActions product={product} />}
      />
    </div>
  );
}
