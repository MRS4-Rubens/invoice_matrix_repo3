'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { products } from '@/lib/db/schema';
import { deactivateProduct } from '@/lib/actions/products/deactivate-product';
import { reactivateProduct } from '@/lib/actions/products/reactivate-product';

export function ProductActions({ product }: { product: typeof products.$inferSelect }) {
  const [isPending, setIsPending] = useState(false);

  const handleToggleActive = async () => {
    setIsPending(true);
    try {
      if (product.is_active) {
        const res = await deactivateProduct({ id: product.id });
        if (!res.success) {
          alert(res.error.message);
        }
      } else {
        const res = await reactivateProduct({ id: product.id });
        if (!res.success) {
          alert(res.error.message);
        }
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      variant={product.is_active ? 'destructive' : 'outline'}
      onClick={handleToggleActive}
      disabled={isPending}
    >
      {isPending ? 'Updating...' : product.is_active ? 'Deactivate Product' : 'Reactivate Product'}
    </Button>
  );
}
