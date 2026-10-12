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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        {/* Left Side: Heading & Justified Tagline */}
        <div className="flex flex-col gap-1 shrink-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading uppercase">
            PRODUCTS & SERVICES
          </h1>
          <p className="text-sm font-semibold text-muted-foreground leading-relaxed max-w-[315px]" style={{ textAlign: 'justify', textAlignLast: 'justify' }}>
            Effortlessly Track, Organize, Maintain, and <br />
            Manage Your Complete Product Catalogue
          </p>
        </div>

        {/* Right Side: Filter and Action Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between bg-card p-3 rounded-xl border border-border/70 shadow-[0_1px_3px_rgba(99,102,241,0.03),0_8px_16px_-8px_rgba(99,102,241,0.08)] flex-1 lg:max-w-4xl w-full">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm max-w-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or HSN/SAC..."
              className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button
              size="sm"
              nativeButton={false}
              render={
                <Link href="/products/new" className="flex items-center gap-1.5 font-bold">
                  <Plus className="size-4" />
                  Add Product
                </Link>
              }
              className="shadow-md bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-[15px] font-bold h-9 px-4 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:-translate-y-px active:translate-y-px"
            />

            <div className="h-5 w-px bg-border/60 hidden md:block" />

            <label className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded border-border/70 text-indigo-600 focus:ring-indigo-500/20 size-4 cursor-pointer"
              />
              Show inactive
            </label>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-3.5 flex gap-4 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'pb-1.5 text-sm uppercase tracking-wider font-bold transition-colors',
              activeTab === tab
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Product cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {filteredData.map(({ product, taxRate }) => {
          const isService = product.hsn_sac_code.startsWith('99')
          const codePrefix = isService ? 'SAC' : 'HSN'

          return (
            <Link 
              key={product.id} 
              href={`/products/${product.id}/edit`}
              className={cn(
                "group relative rounded-xl border border-border bg-card px-4 py-3.5 shadow-xs hover:shadow-md hover:border-indigo-500/30 transition-all duration-200 flex flex-col justify-between",
                !product.is_active && "opacity-60 bg-muted/20"
              )}
            >
              {/* Line 1: Name on Left, GST% on Complete Right */}
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold text-base sm:text-lg text-foreground group-hover:text-indigo-600 transition-colors truncate block leading-snug flex-1">
                  {product.name}
                </p>

                <div className="shrink-0 flex items-center gap-1.5">
                  {taxRate ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {taxRate.label} GST
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      No rate
                    </span>
                  )}
                  {!product.is_active && (
                    <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive border border-destructive/20">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Line 2 (below Line 1): Rate/Price + Unit + (HSN/SAC Code) on left, Stock docked on right */}
              <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between gap-1.5 text-sm overflow-hidden">
                <div className="flex items-baseline gap-1.5 shrink-0 whitespace-nowrap min-w-0">
                  <span className="text-base sm:text-lg font-extrabold text-foreground font-heading shrink-0">
                    {formatPaiseAsInr(product.default_sale_price_paise)}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground/80 shrink-0">
                    / {product.unit_of_measurement}
                  </span>
                  <span className="text-xs font-mono font-medium text-muted-foreground shrink-0">
                    ({codePrefix}: {product.hsn_sac_code})
                  </span>
                </div>

                {product.stock_quantity !== null && product.stock_quantity !== undefined && (
                  <span className="shrink-0 text-[11px] font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/40 ml-auto">
                    Stock: {product.stock_quantity}
                  </span>
                )}
              </div>
            </Link>
          )
        })}

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
