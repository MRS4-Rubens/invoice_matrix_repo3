'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  Check,
  Copy,
  Hash,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { resolveInvoiceNumber } from '@/lib/invoices/number-format';

export interface InvoiceFormatGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (format: string) => void;
  currentFyLabel?: string;
  canCustomize?: boolean;
  onUpgradeClick?: () => void;
}

interface FormatPreset {
  id: string;
  name: string;
  format: string;
  cadence: 'Yearly' | 'Monthly' | 'Daily';
  bestFor: string;
  description: string;
}

const PRESETS: FormatPreset[] = [
  {
    id: 'standard-b2b',
    name: 'Standard B2B Series (Yearly)',
    format: 'INV/{FY}/{SEQ:4}',
    cadence: 'Yearly',
    bestFor: 'General wholesale, corporate B2B & professional services',
    description: 'Resets to 0001 on April 1 every Financial Year. Highly recommended default.',
  },
  {
    id: 'compact-yearly',
    name: 'Compact Dash Series (Yearly)',
    format: 'INV-{FY}-{SEQ:3}',
    cadence: 'Yearly',
    bestFor: 'Thermal POS receipts, compact printed labels & field billing',
    description: 'Ultra-compact 13-character footprint with annual financial year reset.',
  },
  {
    id: 'monthly-series',
    name: 'High-Volume Monthly Series',
    format: 'INV/{YY}{MM}/{SEQ:4}',
    cadence: 'Monthly',
    bestFor: 'E-commerce, fast dispatch units & monthly subscriptions',
    description: 'Resets to 0001 automatically on the 1st of every calendar month.',
  },
  {
    id: 'daily-retail',
    name: 'Retail Walk-In Daily Series',
    format: 'INV-{DD}/{MM}/{YY}/{SEQ:3}',
    cadence: 'Daily',
    bestFor: 'Supermarkets, restaurants, retail counters & walk-in sales',
    description: 'Resets to 001 every midnight. Exactly 16 characters (maximum legal capacity).',
  },
  {
    id: 'formal-audit',
    name: 'Full Financial Year Audit Series',
    format: 'INV/{FYYYY}/{SEQ:4}',
    cadence: 'Yearly',
    bestFor: 'Government tenders, PSU audits & large corporate enterprises',
    description: 'Features 4-digit start and end financial years (e.g. 2026-27). Exactly 16 characters.',
  },
];

const emptySubscribe = () => () => {};

export function InvoiceFormatGuideModal({
  isOpen,
  onClose,
  onSelectPreset,
  currentFyLabel = '2026-27',
  canCustomize = true,
  onUpgradeClick,
}: InvoiceFormatGuideModalProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isMounted || !isOpen) {
    return null;
  }

  const handleCopy = async (format: string) => {
    try {
      await navigator.clipboard.writeText(format);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const sampleDate = new Date();

  return createPortal(
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-format-guide-title"
    >
      <div
        ref={modalRef}
        className="relative flex flex-col w-full max-w-[850px] max-h-[90vh] bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-foreground"
      >
        {/* Sticky Header: Compact & balanced */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/80 bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-900 text-white shadow-xs">
              <Sparkles className="size-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="invoice-format-guide-title" className="text-sm sm:text-base font-bold text-foreground font-heading tracking-tight leading-tight">
                  Invoice Number Format Guide &amp; Presets
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-900 border border-blue-200/80 shrink-0">
                  <span className="text-blue-700/80">Active FY:</span>
                  <strong className="font-bold text-blue-950">{currentFyLabel}</strong>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-none mt-1">
                Statutory CGST Rule 46(b) compliance specifications and ready-to-use template series
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide modal"
            className="flex size-7 items-center justify-center rounded-lg border border-border/80 bg-background text-muted-foreground transition-all duration-150 hover:border-red-400 hover:bg-red-500/10 hover:text-red-500 hover:shadow-[0_0_8px_rgba(239,68,68,0.35)] active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Content Body: Consistent spacing */}
        <div className="flex-1 overflow-y-auto px-4 pt-2.5 pb-3.5 space-y-2.5">
          {/* SECTION 1: Statutory Indian GST Mandates (Rule 46(b)) */}
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-2.5 space-y-1">
            <div className="flex items-center gap-2 text-blue-950 font-bold text-xs">
              <ShieldCheck className="size-4 text-blue-900 shrink-0" />
              <span>Mandatory Statutory Rules under Indian CGST Rule 46(b)</span>
            </div>
            <ul className="text-[11px] text-blue-900/90 space-y-0.5 list-disc list-inside font-medium leading-relaxed pl-1">
              <li>
                <strong className="text-blue-950 font-semibold">Maximum 16 Characters:</strong> The resolved invoice number must not exceed 16 characters. Longer series are rejected on the GST Portal &amp; e-Invoicing NIC IRP.
              </li>
              <li>
                <strong className="text-blue-950 font-semibold">Strict Character Whitelist:</strong> Only uppercase letters (<code className="font-mono font-bold bg-blue-100/80 px-1 py-0.5 rounded text-blue-950">A-Z</code>), numbers (<code className="font-mono font-bold bg-blue-100/80 px-1 py-0.5 rounded text-blue-950">0-9</code>), hyphens (<code className="font-mono font-bold bg-blue-100/80 px-1 py-0.5 rounded text-blue-950">-</code>), and forward slashes (<code className="font-mono font-bold bg-blue-100/80 px-1 py-0.5 rounded text-blue-950">/</code>) are allowed.
              </li>
              <li>
                <strong className="text-blue-950 font-semibold">Illegal Characters:</strong> Spaces, dots, underscores (<code className="font-mono bg-blue-100/80 px-1 py-0.5 rounded text-blue-950">_</code>), hash signs (<code className="font-mono bg-blue-100/80 px-1 py-0.5 rounded text-blue-950">#</code>), and all other symbols are strictly forbidden by law.
              </li>
              <li>
                <strong className="text-blue-950 font-semibold">Sequential Running Counter:</strong> Every series must contain exactly one <code className="font-mono bg-blue-100/80 px-1 py-0.5 rounded text-blue-950">{'{SEQ:N}'}</code> placeholder to maintain unique consecutive numbering.
              </li>
            </ul>
          </div>

          {/* SECTION 2: Dynamic Format Tokens Reference Table (Exact 3px side and 4px column spacing) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Hash className="size-3.5 text-blue-900" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Available Format Tokens Reference
                </h3>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Placeholders are case-insensitive</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-100 shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="pb-1.5 pl-[3px] pr-1 whitespace-nowrap w-[78px]">Token</th>
                      <th className="pb-1.5 px-1 text-center whitespace-nowrap w-[44px]">Chars</th>
                      <th className="pb-1.5 px-1">Meaning &amp; Description</th>
                      <th className="pb-1.5 px-1 whitespace-nowrap w-[130px]">Reset Cadence</th>
                      <th className="pb-1.5 pl-1 pr-[3px] text-right whitespace-nowrap w-[54px]">Sample</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans text-[11px]">
                    {/* SEQ */}
                    <tr>
                      <td className="py-1 pl-[3px] pr-1 font-mono whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold bg-emerald-950 border border-emerald-700/80 text-emerald-300 text-[10px]">
                          {'{SEQ:N}'}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center text-slate-300 font-mono whitespace-nowrap">1 to 6</td>
                      <td className="py-1 px-1 text-slate-200">
                        Sequential running counter. <code className="text-emerald-400 font-mono font-bold">N</code> sets zero-padded digit width.
                      </td>
                      <td className="py-1 px-1 text-emerald-400 font-medium whitespace-nowrap">Per Series Rule</td>
                      <td className="py-1 pl-1 pr-[3px] text-right font-mono font-bold text-emerald-300 whitespace-nowrap">0001</td>
                    </tr>
                    {/* FY */}
                    <tr>
                      <td className="py-1 pl-[3px] pr-1 font-mono whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold bg-blue-950 border border-blue-700/80 text-blue-300 text-[10px]">
                          {'{FY}'}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center text-slate-300 font-mono whitespace-nowrap">5</td>
                      <td className="py-1 px-1 text-slate-200">Short financial year label. Standard Indian B2B format.</td>
                      <td className="py-1 px-1 text-blue-400 font-medium whitespace-nowrap">Annual (April 1)</td>
                      <td className="py-1 pl-1 pr-[3px] text-right font-mono font-bold text-blue-300 whitespace-nowrap">
                        {currentFyLabel.slice(2)}
                      </td>
                    </tr>
                    {/* FYYYY */}
                    <tr>
                      <td className="py-1 pl-[3px] pr-1 font-mono whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold bg-blue-950 border border-blue-700/80 text-blue-300 text-[10px]">
                          {'{FYYYY}'}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center text-slate-300 font-mono whitespace-nowrap">7</td>
                      <td className="py-1 px-1 text-slate-200">Full 4-digit financial year span for formal enterprise series.</td>
                      <td className="py-1 px-1 text-blue-400 font-medium whitespace-nowrap">Annual (April 1)</td>
                      <td className="py-1 pl-1 pr-[3px] text-right font-mono font-bold text-blue-300 whitespace-nowrap">
                        {currentFyLabel}
                      </td>
                    </tr>
                    {/* YY */}
                    <tr>
                      <td className="py-1 pl-[3px] pr-1 font-mono whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold bg-cyan-950 border border-cyan-700/80 text-cyan-300 text-[10px]">
                          {'{YY}'}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center text-slate-300 font-mono whitespace-nowrap">2</td>
                      <td className="py-1 px-1 text-slate-200">2-digit current calendar year.</td>
                      <td className="py-1 px-1 text-cyan-400 font-medium whitespace-nowrap">Annual (April 1)</td>
                      <td className="py-1 pl-1 pr-[3px] text-right font-mono font-bold text-cyan-300 whitespace-nowrap">
                        {String(sampleDate.getFullYear()).slice(-2)}
                      </td>
                    </tr>
                    {/* YYYY */}
                    <tr>
                      <td className="py-1 pl-[3px] pr-1 font-mono whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold bg-cyan-950 border border-cyan-700/80 text-cyan-300 text-[10px]">
                          {'{YYYY}'}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center text-slate-300 font-mono whitespace-nowrap">4</td>
                      <td className="py-1 px-1 text-slate-200">Full 4-digit calendar year.</td>
                      <td className="py-1 px-1 text-cyan-400 font-medium whitespace-nowrap">Annual (April 1)</td>
                      <td className="py-1 pl-1 pr-[3px] text-right font-mono font-bold text-cyan-300 whitespace-nowrap">
                        {sampleDate.getFullYear()}
                      </td>
                    </tr>
                    {/* MM */}
                    <tr>
                      <td className="py-1 pl-[3px] pr-1 font-mono whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold bg-amber-950 border border-amber-700/80 text-amber-300 text-[10px]">
                          {'{MM}'}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center text-slate-300 font-mono whitespace-nowrap">2</td>
                      <td className="py-1 px-1 text-slate-200">
                        2-digit calendar month (<code className="text-amber-400 font-mono">01-12</code>). Enables monthly sequence reset.
                      </td>
                      <td className="py-1 px-1 text-amber-400 font-medium whitespace-nowrap">Monthly (1st of month)</td>
                      <td className="py-1 pl-1 pr-[3px] text-right font-mono font-bold text-amber-300 whitespace-nowrap">
                        {String(sampleDate.getMonth() + 1).padStart(2, '0')}
                      </td>
                    </tr>
                    {/* DD */}
                    <tr>
                      <td className="py-1 pl-[3px] pr-1 font-mono whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold bg-orange-950 border border-orange-700/80 text-orange-300 text-[10px]">
                          {'{DD}'}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center text-slate-300 font-mono whitespace-nowrap">2</td>
                      <td className="py-1 px-1 text-slate-200">
                        2-digit day of month (<code className="text-orange-400 font-mono">01-31</code>). Enables daily sequence reset.
                      </td>
                      <td className="py-1 px-1 text-orange-400 font-medium whitespace-nowrap">Daily (Midnight)</td>
                      <td className="py-1 pl-1 pr-[3px] text-right font-mono font-bold text-orange-300 whitespace-nowrap">
                        {String(sampleDate.getDate()).padStart(2, '0')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 3: How Sequence Reset Cadence Operates */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-blue-900" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                How Automatic Sequence Resets Work
              </h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-2 space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <span className="size-2 rounded-full bg-blue-600"></span>
                  <span>1. Annual / FY Series</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  When neither <code className="font-mono text-foreground font-semibold">{'{MM}'}</code> nor <code className="font-mono text-foreground font-semibold">{'{DD}'}</code> is present, your sequence runs continuously from April 1 to March 31, restarting at 0001 every new Financial Year.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-2 space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <span className="size-2 rounded-full bg-amber-500"></span>
                  <span>2. Monthly Series</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Including <code className="font-mono text-foreground font-semibold">{'{MM}'}</code> instructs the billing engine to maintain a distinct counter for each month. At 00:00 on the 1st of every month, your counter starts from 0001.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-2 space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700">
                  <span className="size-2 rounded-full bg-orange-500"></span>
                  <span>3. Daily Retail Series</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Including <code className="font-mono text-foreground font-semibold">{'{DD}'}</code> causes the counter to reset every single midnight. Ideal for high-turnover walk-in stores needing fresh numbers like 001 daily.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: 100% Compliant Presets - Solution B True 3-Column Strip (Zero Wrapping, Zero Truncation) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-blue-900" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  100% CGST Compliant Format Presets
                </h3>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Click &quot;Use This Format&quot; to apply instantly</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-card overflow-hidden shadow-2xs divide-y divide-border/60">
              {PRESETS.map((preset) => {
                const effectiveFormat = !canCustomize && preset.id === 'standard-b2b'
                  ? 'BMA/{FY}/{SEQ:4}'
                  : preset.format;

                const effectiveDescription = !canCustomize && preset.id === 'standard-b2b'
                  ? 'Free tier default series with Bill Matrix Application (BMA) prefix. Resets to 0001 on April 1 every Financial Year.'
                  : preset.description;

                let sampleOutput = '';
                try {
                  sampleOutput = resolveInvoiceNumber(effectiveFormat, {
                    invoiceDate: sampleDate,
                    fyLabel: currentFyLabel,
                    sequenceValue: 1,
                  });
                } catch {
                  sampleOutput = effectiveFormat.startsWith('BMA') ? 'BMA/...' : 'INV/...';
                }

                const charCount = sampleOutput.length;
                const isCopied = copiedFormat === effectiveFormat;
                const isLocked = !canCustomize && preset.id !== 'standard-b2b';

                return (
                  <div
                    key={preset.id}
                    className="group p-2 sm:px-3 sm:py-2 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-start justify-between"
                  >
                    {/* Col 1: Series Name & Audience Target (Row 3 width + 5px = 232px, with 10px gap to Col 2) */}
                    <div className="w-full sm:w-[232px] shrink-0 mr-2.5">
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <h4 className="text-xs font-bold text-slate-900 leading-none whitespace-nowrap">{preset.name}</h4>
                        <span
                          className={`inline-flex items-center px-1.5 h-5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 leading-none border ${
                            preset.cadence === 'Daily'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : preset.cadence === 'Monthly'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}
                        >
                          {preset.cadence}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        {preset.bestFor}
                      </p>
                    </div>

                    {/* Col 2: Both Pills Strictly Side-by-Side + Full Lifecycle Description (Row 4 width + 2px = 412px, with 5px gap to Col 3) */}
                    <div className="w-full sm:w-[412px] shrink-0 mr-[5px]">
                      {/* Line 1: Interactive Pills (strictly side-by-side with flex-nowrap, matching height h-5 and pt-0.5) */}
                      <div className="flex items-center gap-1.5 flex-nowrap pt-0.5">
                        {/* Format Pill with embedded icon-only copy button */}
                        <div className="inline-flex items-center gap-1.5 bg-slate-900 text-slate-100 px-2 h-5 rounded-md font-mono text-[11px] border border-slate-800 shadow-2xs shrink-0 leading-none">
                          <span className="font-bold text-emerald-400">{effectiveFormat}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(effectiveFormat)}
                            className="p-0.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title={isCopied ? 'Copied!' : 'Copy format'}
                            aria-label={`Copy ${effectiveFormat}`}
                          >
                            {isCopied ? (
                              <Check className="size-3 text-emerald-400" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>

                        {/* Live Sample Pill */}
                        <div className="inline-flex items-center gap-1 bg-muted/70 text-foreground px-2 h-5 rounded-md font-mono text-[11px] border border-border shrink-0 leading-none">
                          <span className="text-slate-500 font-sans text-[10px]">Sample:</span>
                          <span className="font-bold text-blue-900">{sampleOutput}</span>
                          <span className="text-[10px] text-muted-foreground font-sans">({charCount}ch)</span>
                        </div>
                      </div>

                      {/* Line 2: Full Lifecycle description (zero truncation) */}
                      <p className="text-[10.5px] text-muted-foreground italic mt-1 leading-snug">
                        {effectiveDescription}
                      </p>
                    </div>

                    {/* Col 3: Action (w-[118px] with zero right-side clipping) */}
                    <div className="w-full sm:w-[118px] shrink-0 self-end sm:self-start pt-0.5">
                      {isLocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            if (onUpgradeClick) onUpgradeClick();
                          }}
                          className="flex flex-col items-center justify-center py-1 px-1.5 rounded-lg border border-[#dfd3be] bg-gradient-to-b from-[#fdfbf7] to-[#f4eedb] text-amber-950 dark:from-amber-950/20 dark:to-amber-950/40 dark:border-amber-800/40 dark:text-amber-300 hover:from-white hover:to-[#eee6d1] hover:border-amber-400/60 shadow-2xs transition-all cursor-pointer w-full text-center leading-tight min-h-[38px]"
                          title="Upgrade to Essentials Pro to unlock this invoice format"
                        >
                          <span className="text-[10px] font-semibold tracking-tight text-amber-900/90 dark:text-amber-200/90">
                            Unlock with
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-amber-800 dark:text-amber-300">
                            (<Lock className="size-2.5 text-amber-600 dark:text-amber-400 shrink-0" /> PRO)
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPreset(effectiveFormat);
                            onClose();
                          }}
                          className="inline-flex items-center justify-center gap-1 h-7 px-2 rounded-md bg-blue-900 text-[11px] font-bold text-white hover:bg-blue-800 shadow-xs transition-colors cursor-pointer whitespace-nowrap w-full"
                        >
                          <span>Use This Format</span>
                          <ArrowRight className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Tip Box: Sleek & compact */}
          <div className="rounded-xl border border-border bg-muted/40 px-3 py-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <HelpCircle className="size-3.5 text-blue-900 shrink-0" />
            <p className="text-[11px] leading-snug">
              <strong className="text-foreground font-semibold">Custom Formats:</strong>{' '}
              {canCustomize ? (
                <>You can combine custom letters or branch prefixes (e.g. <code className="font-mono font-bold text-foreground">MBS/{'{FY}'}/{'{SEQ:4}'}</code>) as long as total length is $\le 16$ characters with valid characters.</>
              ) : (
                <>Free Tier is locked to standard <code className="font-mono font-bold text-foreground">BMA/{'{FY}'}/{'{SEQ:4}'}</code>. Upgrade to Essentials Pro to use your own custom brand initials (e.g. <code className="font-mono font-bold text-foreground">MBS/{'{FY}'}/{'{SEQ:4}'}</code>), daily, and monthly series.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
