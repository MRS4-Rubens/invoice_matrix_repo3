'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Crown,
  Sparkles,
  X,
  CheckCircle2,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  featureName?: string;
  recommendedPlan?: 'essentials' | 'professional';
  highlights?: string[];
  ctaText?: string;
}

const ESSENTIALS_HIGHLIGHTS = [
  'Unlimited GST Invoices & Credit Notes',
  'All 4 Traditional & Book Depot Templates',
  'Custom Logo Upload & White-Label Branding',
  '1-Click WhatsApp Direct Share with Dynamic UPI Links',
  'Official GSTR-1 & ITR 44AD Excel Exports',
  'Custom Invoice Number Formats & Brand Prefixes',
];

const PROFESSIONAL_HIGHLIGHTS = [
  'Everything in Essentials Pro Plan',
  'Unlimited Invoices & Unlimited Team Users',
  'Dedicated Read-Only CA Accountant Portal',
  'Multiple Invoice Series & Custom Number Prefixes',
  'Bulk Data & Inventory Import Tools',
  '24/7 Priority SLA & Dedicated Account Manager',
];

export function UpgradePromptModal({
  isOpen,
  onClose,
  title,
  description,
  featureName,
  recommendedPlan = 'essentials',
  highlights,
  ctaText,
}: UpgradePromptModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'essentials' | 'professional'>(
    recommendedPlan === 'professional' ? 'professional' : 'essentials'
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedPlan(recommendedPlan === 'professional' ? 'professional' : 'essentials');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, recommendedPlan, onClose]);

  if (!mounted || !isOpen) return null;

  // Active highlights depend on user-selected plan
  const activeHighlights =
    selectedPlan === 'professional'
      ? PROFESSIONAL_HIGHLIGHTS
      : highlights && highlights.length > 0 && selectedPlan === recommendedPlan
      ? highlights
      : ESSENTIALS_HIGHLIGHTS;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg sm:max-w-[480px] rounded-2xl border border-indigo-100 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Gradient Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-4 sm:px-5 sm:py-4.5 text-white">
          <div className="absolute -top-12 -right-12 size-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 size-32 rounded-full bg-violet-400/20 blur-xl pointer-events-none" />

          {/* Close button with elevated z-index */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>

          {/* Feature Badge with right clearance to prevent collision with (X) button */}
          <div className="flex items-center gap-2 mb-2 pr-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-bold text-amber-300 border border-white/10 max-w-full">
              <Crown className="size-3.5 shrink-0" />
              <span className="truncate sm:whitespace-normal">
                {featureName ? `${featureName} is a Pro Feature` : 'Upgrade Required'}
              </span>
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight font-heading pr-8 sm:pr-0">
            {title}
          </h3>

          <p className="mt-1.5 text-xs sm:text-sm text-indigo-100/90 leading-relaxed pr-6 sm:pr-0">
            {description}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:px-3.5 sm:py-4 space-y-3">
          {/* Dual Tier Plan Comparison Cards */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                Choose Your Plan:
              </p>
              <span className="text-[10.5px] font-semibold text-slate-400 hidden sm:inline">
                Click a plan to compare details
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Card 1: Essentials Pro Plan */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPlan('essentials')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedPlan('essentials');
                  }
                }}
                className={cn(
                  "relative rounded-xl border px-2.5 py-1.5 sm:px-2.5 sm:py-2 cursor-pointer transition-all select-none text-left",
                  selectedPlan === 'essentials'
                    ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30 ring-2 ring-indigo-600/30 shadow-xs"
                    : "border-slate-200/90 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {/* Header: Heading and Popular badge with exact 7px gap */}
                <div className="flex items-center gap-[7px] mb-1">
                  <span className="text-xs sm:text-[12.5px] font-black tracking-tight text-slate-900 uppercase font-heading">
                    Essentials Pro
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9.5px] sm:text-[10px] font-black text-amber-700 dark:text-amber-300 shrink-0">
                    <Crown className="size-2.5 text-amber-600 dark:text-amber-400" />
                    Popular
                  </span>
                </div>

                {/* Rates side-by-side with 5px gap around '|', equal font size & full /month /year */}
                <div className="flex items-center border-t border-slate-200/70 pt-1 mb-0.5">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[15px] sm:text-base font-black text-slate-950 font-heading">₹399</span>
                    <span className="text-[10.5px] sm:text-[11px] font-semibold text-slate-500">/month</span>
                  </div>
                  <span className="text-slate-300 mx-[5px] text-xs font-light select-none">|</span>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[15px] sm:text-base font-black text-slate-950 font-heading">₹3,499</span>
                    <span className="text-[10.5px] sm:text-[11px] font-semibold text-slate-500">/year</span>
                  </div>
                </div>

                <div className="text-[10.5px] sm:text-[11px] font-bold text-emerald-600">
                  Save 27% on Annual (₹291/mo)
                </div>
              </div>

              {/* Card 2: Enterprise / CA Max */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedPlan('professional')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedPlan('professional');
                  }
                }}
                className={cn(
                  "relative rounded-xl border px-2.5 py-1.5 sm:px-2.5 sm:py-2 cursor-pointer transition-all select-none text-left",
                  selectedPlan === 'professional'
                    ? "border-violet-600 bg-violet-50/70 dark:bg-violet-950/30 ring-2 ring-violet-600/30 shadow-xs"
                    : "border-slate-200/90 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {/* Header: Heading and Scale badge with exact 7px gap */}
                <div className="flex items-center gap-[7px] mb-1">
                  <span className="text-xs sm:text-[12.5px] font-black tracking-tight text-slate-900 uppercase font-heading">
                    Enterprise / CA Max
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 px-1.5 py-0.2 text-[9.5px] sm:text-[10px] font-black text-violet-700 dark:text-violet-300 shrink-0">
                    <Zap className="size-2.5 text-violet-600 dark:text-violet-400" />
                    Scale
                  </span>
                </div>

                {/* Rates side-by-side with 5px gap around '|', equal font size & full /month /year */}
                <div className="flex items-center border-t border-slate-200/70 pt-1 mb-0.5">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[15px] sm:text-base font-black text-slate-950 font-heading">₹599</span>
                    <span className="text-[10.5px] sm:text-[11px] font-semibold text-slate-500">/month</span>
                  </div>
                  <span className="text-slate-300 mx-[5px] text-xs font-light select-none">|</span>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[15px] sm:text-base font-black text-slate-950 font-heading">₹4,999</span>
                    <span className="text-[10.5px] sm:text-[11px] font-semibold text-slate-500">/year</span>
                  </div>
                </div>

                <div className="text-[10.5px] sm:text-[11px] font-bold text-emerald-600">
                  Save 30% on Annual (₹416/mo)
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Feature Highlights */}
          <div className="space-y-1.5 pt-0.5">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
              {selectedPlan === 'professional'
                ? 'What you unlock with Enterprise / CA Max:'
                : 'What you unlock with Essentials Pro:'}
            </p>
            <ul className="space-y-1.5">
              {activeHighlights.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-700 font-medium">
                  <CheckCircle2 className={cn(
                    "size-3.5 sm:size-4 shrink-0 mt-0.5",
                    selectedPlan === 'professional' ? "text-violet-600" : "text-emerald-600"
                  )} />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action CTAs */}
          <div className="pt-1.5 flex flex-col sm:flex-row gap-2">
            <Link
              href={`/checkout?plan=${selectedPlan}`}
              className="flex-1 min-w-0"
              onClick={onClose}
            >
              <Button
                className={cn(
                  "w-full h-10 gap-2 text-white font-bold text-xs sm:text-[13px] shadow-md cursor-pointer rounded-xl transition-all px-3",
                  selectedPlan === 'professional'
                    ? "bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-700 hover:from-violet-500 hover:to-indigo-600"
                    : "bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600"
                )}
              >
                <Sparkles className="size-3.5 sm:size-4 text-amber-300 shrink-0" />
                <span className="truncate">
                  {selectedPlan === 'professional'
                    ? 'Upgrade to Enterprise / CA Max (₹599/mo)'
                    : 'Upgrade to Essentials Pro (₹399/mo)'}
                </span>
                <ArrowRight className="size-3.5 sm:size-4 shrink-0" />
              </Button>
            </Link>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-3 border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs sm:text-sm rounded-xl cursor-pointer shrink-0"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
