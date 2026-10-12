'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Users, Plus, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/app/empty-state';
import { listCustomers } from '@/lib/actions/customers/list-customers';
import { customers as customersSchema } from '@/lib/db/schema';
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states';

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
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        {/* Left Side: Heading & Justified Tagline */}
        <div className="flex flex-col gap-1 shrink-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading uppercase">
            CUSTOMERS
          </h1>
          <p className="text-sm font-semibold text-muted-foreground leading-relaxed max-w-[315px]" style={{ textAlign: 'justify', textAlignLast: 'justify' }}>
            Effortlessly Track, Organize, Maintain, and <br />
            Manage Your Complete Customer Directory
          </p>
        </div>

        {/* Right Side: Filter and Action Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between bg-card p-3 rounded-xl border border-border/70 shadow-[0_1px_3px_rgba(99,102,241,0.03),0_8px_16px_-8px_rgba(99,102,241,0.08)] flex-1 lg:max-w-4xl w-full">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm max-w-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, GSTIN, email or phone..."
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
                <Link href="/customers/new" className="flex items-center gap-1.5 font-bold">
                  <Plus className="size-4" />
                  Add Customer
                </Link>
              }
              className="shadow-md bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-[15px] font-bold h-9 px-4 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:-translate-y-px active:translate-y-px"
            />

            <div className="h-5 w-px bg-border/60 hidden md:block" />

            <label className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-slate-800 cursor-pointer select-none">
              <input 
                type="checkbox" 
                className="rounded border-border/70 text-indigo-600 focus:ring-indigo-500/20 size-4 cursor-pointer"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              Show inactive
            </label>
          </div>
        </div>
      </div>

      {loading && <div className="text-sm font-medium text-muted-foreground mb-4">Loading customers...</div>}

      {/* Customer cards */}
      {!loading && customers.length > 0 ? (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {customers.map((c) => {
            const state = INDIAN_GST_STATES.find((s) => s.code === c.state_code)
            const stateDisplay = state ? `${state.name} (${c.state_code})` : c.state_code
            const initials = c.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase() || c.name.substring(0, 2).toUpperCase()

            return (
              <div
                key={c.id}
                className={`group relative rounded-xl border border-border bg-card px-4 py-3.5 shadow-xs hover:shadow-md hover:border-indigo-500/30 transition-all duration-200 flex flex-col justify-between ${
                  !c.is_active ? 'opacity-60 bg-muted/20' : ''
                }`}
              >
                {/* Top Row: Avatar, Name & GSTIN, Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold border border-border/50 shadow-2xs">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/customers/${c.id}/edit`}
                        className="font-bold text-base sm:text-lg text-foreground group-hover:text-indigo-600 transition-colors truncate block leading-snug"
                      >
                        {c.name}
                      </Link>
                      <p className="mt-0.5 text-sm font-mono text-muted-foreground truncate">
                        {c.gstin ? (
                          <span>{c.gstin}</span>
                        ) : (
                          <span className="text-muted-foreground/70 font-sans italic text-xs">Unregistered</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Top Right Badges */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {!c.is_active ? (
                      <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive border border-destructive/20">
                        Inactive
                      </span>
                    ) : c.gstin ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck className="size-3.5 shrink-0" />
                        B2B
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-500/20">
                        Consumer
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: State Name on Left, Mobile Number on Right */}
                <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-sm text-muted-foreground font-medium gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <MapPin className="size-4 shrink-0 text-muted-foreground/80" />
                    <span className="truncate">{stateDisplay}</span>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 text-right font-medium">
                    {c.phone ? (
                      <>
                        <Phone className="size-3.5 text-muted-foreground/80 shrink-0" />
                        <span className="font-mono text-sm text-foreground font-bold">{c.phone}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">No phone</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
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
