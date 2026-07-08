'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Plus, Search, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { listProducts } from '@/lib/actions/products/list-products';
import { products, taxRates } from '@/lib/db/schema';
import { formatPaiseAsInr } from '@/lib/money';

type ProductResult = {
  product: typeof products.$inferSelect;
  taxRate: typeof taxRates.$inferSelect | null;
};

const tabs = ['Products', 'Services'] as const;
type Tab = (typeof tabs)[number];

export function ProductsClient({ initialData }: { initialData: ProductResult[] }) {
  const [data, setData] = useState<ProductResult[]>(initialData);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>('Products');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    startTransition(async () => {
      const result = await listProducts({ search: debouncedSearch, includeInactive });
      if (result.success) {
        setData(result.data);
      }
    });
  }, [debouncedSearch, includeInactive]);

  const filteredData = data.filter((item) => {
    const isService = item.product.hsn_sac_code.startsWith('99');
    return activeTab === 'Services' ? isService : !isService;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products & Services</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your catalogue and pricing
          </p>
        </div>
        <Button
          nativeButton={false}
          render={
            <Link href="/products/new">
              <Plus className="mr-2 size-4" />
              Add Product
            </Link>
          }
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-4 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'pb-2 text-sm transition-colors',
              activeTab === tab
                ? 'border-b-2 border-primary font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground max-w-md">
          <Search className="size-4 shrink-0" />
          <input
            type="text"
            placeholder="Search by name or HSN/SAC..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary"
          />
          Show inactive
        </label>
      </div>

      {/* Product cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredData.map(({ product, taxRate }) => (
          <Link 
            key={product.id} 
            href={`/products/${product.id}/edit`}
            className={cn(
              "relative block rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent/5",
              !product.is_active && "opacity-60"
            )}
          >
            <p className="pr-14 font-semibold text-foreground truncate">{product.name}</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {activeTab === 'Services' ? 'SAC' : 'HSN'}: {product.hsn_sac_code}
            </p>

            <p className="mt-3 text-lg font-bold text-foreground">
              {formatPaiseAsInr(product.default_sale_price_paise)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {product.unit_of_measurement}
              </span>
            </p>

            <div className="mt-3 flex items-center gap-2">
              {taxRate ? (
                <span className="rounded-full bg-success-subtle px-2 py-0.5 text-xs font-medium text-success">
                  {taxRate.label} GST
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  No rate assigned
                </span>
              )}
              {!product.is_active && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Inactive
                </span>
              )}
            </div>
          </Link>
        ))}

        {filteredData.length === 0 && !isPending && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
            <PackageOpen className="mb-4 size-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              {data.length === 0 && !search && !includeInactive
                ? `No ${activeTab.toLowerCase()} added yet`
                : 'No matches found'}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {data.length === 0 && !search && !includeInactive
                ? `Add your first ${activeTab.slice(0, -1).toLowerCase()} to start building your catalogue.`
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
