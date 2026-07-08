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
    <div className="max-w-2xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Product/Service</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update catalogue details
          </p>
        </div>
        <ProductActions product={product} />
      </div>

      {!product.is_active && (
        <div className="mb-6 rounded-lg bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
          This product is currently inactive and will not appear in dropdowns when creating invoices.
        </div>
      )}

      <ProductForm product={product} taxRates={taxRatesResult.data} />
    </div>
  );
}
