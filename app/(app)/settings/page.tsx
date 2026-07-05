'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────
const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors'
const labelClass = 'mb-1.5 block text-sm font-medium text-foreground'
const sectionClass = 'border-b border-border pb-8 mb-8 last:border-0 last:mb-0 last:pb-0'
const defaultTermsText =
  'Goods once sold will not be taken back.\nPayment to be made within 30 days from the date of invoice.\nInterest @ 24% per annum will be charged on overdue invoices until payment is received.'

const navItems = [
  'General',
  'Business Profile',
  'Invoice Settings',
  'Users & Roles',
  'Notifications',
  'Billing',
] as const

type NavItem = (typeof navItems)[number]

interface InvoiceSettings {
  discEnabled?: boolean
  defaultGst?: string
  invoicePrefix?: string
  dueDays?: string
  defaultTerms?: string
  showNextNo?: boolean
  showHsn?: boolean
  showSignatory?: boolean
}

function loadInvoiceSettings(): InvoiceSettings {
  if (typeof window === 'undefined') return {}

  try {
    const saved = localStorage.getItem('bm_invoice_settings')
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

// ── Toggle component ──────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  id: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        checked ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}

// ── Toast notification ─────────────────────────────────────────────────────────
function SavedToast({ show }: { show: boolean }) {
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 flex items-center gap-2 rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg transition-all duration-300',
        show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none',
      )}
    >
      <Check className="size-4 text-success" />
      Settings saved
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [initialSettings] = useState(loadInvoiceSettings)
  const [active, setActive] = useState<NavItem>('Invoice Settings')
  const [toast, setToast] = useState(false)

  // ── Invoice Settings state ────────────────────────────────────────────────
  const [discEnabled, setDiscEnabled] = useState(
    initialSettings.discEnabled ?? true,
  )
  const [defaultGst, setDefaultGst] = useState(initialSettings.defaultGst ?? '18')
  const [invoicePrefix, setInvoicePrefix] = useState(
    initialSettings.invoicePrefix ?? 'INV',
  )
  const [dueDays, setDueDays] = useState(initialSettings.dueDays ?? '30')
  const [defaultTerms, setDefaultTerms] = useState(
    initialSettings.defaultTerms ?? defaultTermsText,
  )
  const [showNextNo, setShowNextNo] = useState(initialSettings.showNextNo ?? true)
  const [showHsn, setShowHsn] = useState(initialSettings.showHsn ?? true)
  const [showSignatory, setShowSignatory] = useState(
    initialSettings.showSignatory ?? true,
  )

  function showToast() {
    setToast(true)
    setTimeout(() => setToast(false), 2500)
  }

  function saveInvoiceSettings() {
    const s = { discEnabled, defaultGst, invoicePrefix, dueDays, defaultTerms, showNextNo, showHsn, showSignatory }
    localStorage.setItem('bm_invoice_settings', JSON.stringify(s))
    // Dispatch event so New Invoice page can react without a full refresh
    window.dispatchEvent(new StorageEvent('storage', { key: 'bm_invoice_settings', newValue: JSON.stringify(s) }))
    showToast()
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="flex gap-6">
        {/* ── Settings nav ─────────────────────────────────────────────────── */}
        <aside className="hidden w-44 shrink-0 sm:block">
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActive(item)}
                className={cn(
                  'rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  active === item
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Content panel ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* ── INVOICE SETTINGS ──────────────────────────────────────────── */}
          {active === 'Invoice Settings' && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-1 text-lg font-semibold text-foreground">Invoice Settings</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Customise how invoices are created and displayed.
              </p>

              {/* ── Section: Invoice Number ─────────────────────────────── */}
              <div className={sectionClass}>
                <h3 className="mb-4 text-sm font-semibold text-foreground">Invoice Number</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="invPrefix">Invoice Prefix</label>
                    <input
                      id="invPrefix"
                      type="text"
                      className={inputClass}
                      value={invoicePrefix}
                      onChange={(e) => setInvoicePrefix(e.target.value)}
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Example: <span className="font-mono">{invoicePrefix}-27/06/26/001</span>
                    </p>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="dueDays">Default Due Days</label>
                    <select
                      id="dueDays"
                      className={inputClass}
                      value={dueDays}
                      onChange={(e) => setDueDays(e.target.value)}
                    >
                      {['7', '15', '30', '45', '60', '90'].map((d) => (
                        <option key={d} value={d}>{d} days</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Section: Line Item Columns ──────────────────────────── */}
              <div className={sectionClass}>
                <h3 className="mb-1 text-sm font-semibold text-foreground">Line Item Columns</h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  Choose which columns appear in the invoice items table when creating a new invoice.
                </p>

                <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
                  {/* HSN Code */}
                  <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">HSN / SAC Code</p>
                      <p className="text-xs text-muted-foreground">
                        Harmonised System of Nomenclature code for each item.
                      </p>
                    </div>
                    <Toggle checked={showHsn} onChange={setShowHsn} id="toggle-hsn" />
                  </div>

                  {/* Discount % — the main feature */}
                  <div className={cn(
                    'flex items-center justify-between gap-4 px-4 py-3.5 transition-colors',
                    discEnabled ? 'bg-success-subtle/30' : '',
                  )}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">Discount % Column</p>
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                          discEnabled ? 'bg-success-subtle text-success' : 'bg-muted text-muted-foreground',
                        )}>
                          {discEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Show a Disc% column in the New Invoice items table. Disable this if you bill at
                        flat rates with no per-item discounts.
                      </p>
                    </div>
                    <Toggle checked={discEnabled} onChange={setDiscEnabled} id="toggle-disc" />
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">How it works:</span>{' '}
                    When Discount % is <span className="font-medium text-success">enabled</span>, a Disc% input column
                    appears in New Invoice so you can apply a per-item percentage discount before GST is
                    calculated. When <span className="font-medium text-foreground">disabled</span>, the column is hidden
                    and GST is calculated directly on Qty x Rate.
                  </p>
                </div>
              </div>

              {/* ── Section: Print / PDF Options ───────────────────────── */}
              <div className={sectionClass}>
                <h3 className="mb-1 text-sm font-semibold text-foreground">Print / PDF Options</h3>
                <p className="mb-4 text-xs text-muted-foreground">
                  Control what appears on the printed or PDF invoice.
                </p>
                <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">Show Invoice Running Number</p>
                      <p className="text-xs text-muted-foreground">
                        Display the sequential invoice number on the printed document.
                      </p>
                    </div>
                    <Toggle checked={showNextNo} onChange={setShowNextNo} id="toggle-nextno" />
                  </div>
                  <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">Authorised Signatory Section</p>
                      <p className="text-xs text-muted-foreground">
                        Show a signature area at the bottom right of the invoice.
                      </p>
                    </div>
                    <Toggle checked={showSignatory} onChange={setShowSignatory} id="toggle-sig" />
                  </div>
                </div>
              </div>

              {/* ── Section: GST Default ───────────────────────────────── */}
              <div className={sectionClass}>
                <h3 className="mb-4 text-sm font-semibold text-foreground">GST Defaults</h3>
                <div className="sm:w-1/2">
                  <label className={labelClass} htmlFor="defaultGst">Default GST Rate</label>
                  <select
                    id="defaultGst"
                    className={inputClass}
                    value={defaultGst}
                    onChange={(e) => setDefaultGst(e.target.value)}
                  >
                    {['0', '5', '12', '18', '28'].map((r) => (
                      <option key={r} value={r}>{r}%</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Section: Default Terms ─────────────────────────────── */}
              <div className={sectionClass}>
                <h3 className="mb-4 text-sm font-semibold text-foreground">Default Terms &amp; Conditions</h3>
                <textarea
                  rows={5}
                  className={`${inputClass} resize-none`}
                  value={defaultTerms}
                  onChange={(e) => setDefaultTerms(e.target.value)}
                  placeholder="Enter default terms and conditions..."
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  These will be pre-filled on every new invoice. You can override per invoice.
                </p>
              </div>

              {/* ── Save button ────────────────────────────────────────── */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={saveInvoiceSettings}
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Save Invoice Settings
                </button>
              </div>
            </div>
          )}

          {/* ── GENERAL ───────────────────────────────────────────────────── */}
          {active === 'General' && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-1 text-lg font-semibold text-foreground">General</h2>
              <p className="mb-6 text-sm text-muted-foreground">Account-level preferences.</p>

              <div className={sectionClass}>
                <h3 className="mb-4 text-sm font-semibold text-foreground">Business Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Business Name</label>
                    <input type="text" className={inputClass} defaultValue="Acme Trading Co." />
                  </div>
                  <div>
                    <label className={labelClass}>GSTIN</label>
                    <input type="text" className={`${inputClass} font-mono`} defaultValue="29AABCU9603R1ZM" />
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input type="tel" className={inputClass} defaultValue="9876543210" />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" className={inputClass} defaultValue="hello@acmetrading.in" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Business Address</label>
                    <input type="text" className={inputClass} defaultValue="12, MG Road, Bengaluru" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={showToast}
                  className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Save changes
                </button>
              </div>

              <div>
                <h3 className="mb-4 text-sm font-semibold text-foreground">Danger Zone</h3>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm font-medium text-foreground">Delete Business Account</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Permanently delete this business and all its data. This cannot be undone.
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded-lg border border-destructive/50 px-4 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    Delete Business Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Other tabs — placeholder ───────────────────────────────────── */}
          {active !== 'Invoice Settings' && active !== 'General' && (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
              <div>
                <p className="text-sm font-medium text-foreground">{active}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This section will be available in a future update.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <SavedToast show={toast} />
    </div>
  )
}
