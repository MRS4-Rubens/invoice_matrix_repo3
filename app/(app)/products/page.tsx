import { getCurrentAppUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { listProducts } from '@/lib/actions/products/list-products';
import { ProductsClient } from '@/components/app/products/products-client';

export default async function ProductsPage() {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    redirect('/login');
  }

  if (!appUser.business_id) {
    redirect('/settings/business');
  }

  const result = await listProducts({});
  
  if (!result.success) {
    throw new Error(result.error.message || 'Failed to fetch products');
  }

  return <ProductsClient initialData={result.data} />;
}
