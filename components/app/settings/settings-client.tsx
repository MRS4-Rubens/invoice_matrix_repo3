'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BusinessProfileForm } from './business-profile-form';
import { InvoiceSettingsForm } from './invoice-settings-form';
import { BillingTab, type SubscriptionHistoryItem } from './billing-tab';
import { LogoUploadCard } from './logo-upload-card';
import { UserFeedbackForm } from './user-feedback-form';
import { businesses, financialYears } from '@/lib/db/schema';

interface SettingsClientProps {
  business: typeof businesses.$inferSelect | null;
  currentFy: typeof financialYears.$inferSelect | null;
  initialTab?: string;
  initialSubscriptions?: SubscriptionHistoryItem[];
  usageStats?: {
    invoicesThisMonth: number;
    invoicesTotal: number;
    teamMembersCount: number;
    customersCount: number;
    productsCount: number;
    currentMonthLabel: string;
  };
}

const navItems = [
  'Business Profile',
  'Invoice Settings',
  'Users & Roles',
  'Billing & Usage',
  'User Feedback',
  'Notifications',
  'General',
] as const;

type NavItem = (typeof navItems)[number];

export function SettingsClient({
  business,
  currentFy,
  initialTab,
  initialSubscriptions,
  usageStats,
}: SettingsClientProps) {
  const resolveInitialTab = (): NavItem => {
    if (initialTab) {
      const normalized = initialTab.toLowerCase().trim();
      if (
        normalized === 'billing' ||
        normalized === 'billing & usage' ||
        normalized === 'billing and usage' ||
        normalized === 'billing-usage'
      ) {
        return 'Billing & Usage';
      }
      if (
        normalized === 'feedback' ||
        normalized === 'user feedback' ||
        normalized === 'user-feedback'
      ) {
        return 'User Feedback';
      }
      if (
        normalized === 'invoice' ||
        normalized === 'invoice settings' ||
        normalized === 'invoice-settings'
      ) {
        return 'Invoice Settings';
      }
      const match = navItems.find((t) => t.toLowerCase() === normalized);
      if (match) return match;
    }
    return 'Business Profile';
  };

  const [active, setActive] = useState<NavItem>(resolveInitialTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 shrink-0 mb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading uppercase">
          SETTINGS
        </h1>
        <p
          className="text-sm font-semibold text-muted-foreground leading-relaxed max-w-[315px]"
          style={{ textAlign: 'justify', textAlignLast: 'justify' }}
        >
          Effortlessly Track, Organize, Maintain, and <br />
          Manage Your Business Account Configurations
        </p>
      </div>

      <div className="flex gap-3 sm:gap-4">
        {/* -- Settings Navigation Sidebar ----------------------------------- */}
        <aside className="hidden w-[152px] shrink-0 sm:block">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActive(item)}
                className={cn(
                  'rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer',
                  active === item
                    ? 'bg-emerald-50/80 font-bold text-emerald-900 border-l-2 border-emerald-800 pl-2.5 shadow-xs'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground font-medium'
                )}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        {/* -- Content Panel -------------------------------------------------- */}
        <div className="flex-1 min-w-0">
          {/* -- INVOICE SETTINGS TAB ---------------------------------------- */}
          {active === 'Invoice Settings' && (
            <InvoiceSettingsForm business={business} currentFy={currentFy} />
          )}

          {/* -- BUSINESS PROFILE TAB ----------------------------------------- */}
          {active === 'Business Profile' && (
            <BusinessProfileForm
              business={business}
              currentFy={currentFy}
              onSwitchTab={(tab) => setActive(tab as NavItem)}
            />
          )}

          {/* -- GENERAL TAB ------------------------------------------------- */}
          {active === 'General' && (
            <div className="space-y-6">
              <LogoUploadCard business={business} />

              <div className="rounded-xl border border-border bg-card px-5 py-4 sm:px-6 sm:py-5">
                <h2 className="mb-1 text-xl font-bold font-heading text-foreground uppercase">General</h2>
                <p className="mb-4 text-sm sm:text-base text-muted-foreground font-medium">
                  Account-level preferences.
                </p>

                <div>
                  <h3 className="mb-2 text-base font-bold text-foreground uppercase tracking-wide">
                    Danger Zone
                  </h3>
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-base font-bold text-foreground">Delete Business Account</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Permanently delete this business and all its data. This cannot be undone.
                    </p>
                    <button
                      type="button"
                      className="mt-3 rounded-lg border border-destructive/50 px-4 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 cursor-pointer shadow-xs"
                    >
                      Delete Business Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -- BILLING & USAGE TAB ----------------------------------------- */}
          {active === 'Billing & Usage' && (
            <BillingTab
              business={business}
              initialSubscriptions={initialSubscriptions}
              usageStats={usageStats}
            />
          )}

          {/* -- USER FEEDBACK TAB ------------------------------------------- */}
          {active === 'User Feedback' && <UserFeedbackForm />}

          {/* -- PLACEHOLDER TABS ------------------------------------------- */}
          {active !== 'Invoice Settings' &&
            active !== 'General' &&
            active !== 'Business Profile' &&
            active !== 'Billing & Usage' &&
            active !== 'User Feedback' && (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
                <div>
                  <p className="text-base font-bold text-foreground">{active}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This section will be available in a future update.
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
