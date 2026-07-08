'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Users } from 'lucide-react';
import { EmptyState } from '@/components/app/empty-state';
import { listCustomers } from '@/lib/actions/customers/list-customers';
import { customers as customersSchema } from '@/lib/db/schema';

export function CustomersClient({ initialCustomers }: { initialCustomers: (typeof customersSchema.$inferSelect)[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const result = await listCustomers({ search, includeInactive });
      if (result.success && result.data) {
        setCustomers(result.data.customers);
      }
      setLoading(false);
    };

    const debounce = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [search, includeInactive]);

  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground max-w-md">
          <Search className="size-4 shrink-0" />
          <input
            type="text"
            placeholder="Search customers by name, GSTIN, email or phone..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input 
              type="checkbox" 
              className="rounded border-border text-primary focus:ring-primary"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>
      </div>

      {loading && <div className="text-sm text-muted-foreground mb-4">Loading customers...</div>}

      {/* Customer cards */}
      {!loading && customers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((c) => (
            <div key={c.id} className={`rounded-xl border border-border bg-card p-5 ${!c.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {c.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <Link href={`/customers/${c.id}/edit`} className="font-semibold text-foreground hover:underline">
                      {c.name}
                    </Link>
                    {c.gstin ? (
                      <p className="font-mono text-xs text-muted-foreground">
                        {c.gstin}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No GSTIN</p>
                    )}
                  </div>
                </div>
                {!c.is_active && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    Inactive
                  </span>
                )}
                {c.is_active && c.gstin && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    GST Registered
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {c.city ? `${c.city}, ` : ''}{c.state_code}
                </p>
                <Link href={`/customers/${c.id}/edit`} className="text-sm font-medium text-primary hover:underline">
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Empty state */}
      {!loading && customers.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={<Users className="size-5" />}
            title={search || includeInactive ? "No matching customers found" : "No customers yet"}
            description={search || includeInactive ? "Try adjusting your search or filters." : "Add your first customer to build your directory."}
            action={!search && !includeInactive ? { label: 'Add Customer', href: '/customers/new' } : undefined}
          />
        </div>
      )}
    </div>
  );
}
