'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { subscriptionClaimSchema, SubscriptionClaimInput } from '@/lib/validations/subscription';
import { submitPaymentClaim } from '@/lib/actions/subscriptions/submit-payment-claim';
import { formatPaiseAsInr } from '@/lib/money';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  QrCode,
  Building,
  Copy,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileImage,
  Loader2,
  Crown,
  Sparkles,
  Clock,
  ArrowLeft,
  Check,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  ExternalLink,
  Smartphone,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Plan pricing definitions
const PLANS = [
  {
    id: 'essentials' as const,
    name: 'Essentials Pro Plan',
    tagline: 'Ideal for retailers, wholesalers & growing trade accounts',
    monthlyPricePaise: 39900,
    yearlyPricePaise: 349900,
    features: [
      'Unlimited GST Invoices & Credit Notes',
      'All 4 Traditional & Book Depot Templates',
      'Custom Logo Upload & White-Label Branding',
      '1-Click WhatsApp Direct Share with UPI Link',
      'Official GSTR-1 & ITR 44AD Excel Exports',
      'Custom Invoice Number Formats & Brand Prefixes',
      'Up to 3 Team Members',
    ],
    popular: true,
  },
  {
    id: 'professional' as const,
    name: 'Enterprise / CA Max',
    tagline: 'For high-volume traders & chartered accountant collaboration',
    monthlyPricePaise: 59900,
    yearlyPricePaise: 499900,
    features: [
      'Everything in Essentials Pro',
      'Unlimited Invoices & Unlimited Users',
      'Dedicated Read-Only CA Accountant Portal',
      'Multiple Invoice Series & Number Prefixes',
      'Bulk Data & Inventory Import',
      '24/7 Priority SLA & Dedicated Manager',
    ],
    popular: false,
  },
];

interface CheckoutFormProps {
  business: {
    id: string;
    legal_name: string;
    gstin?: string | null;
    subscription_plan: string;
    subscription_status: string;
    subscription_activated_at?: string | null;
    subscription_ends_at: string | null;
    trial_ends_at?: string | null;
    active_utr_no?: string | null;
  };
  pendingRequest: {
    id: string;
    plan_name: string;
    billing_cycle: string;
    amount_paise: number;
    payment_reference: string;
    created_at: string;
  } | null;
  upiConfig: {
    upiId: string;
    upiName: string;
    bankName: string;
    accName: string;
    accNo: string;
    ifsc: string;
  };
  initialPlan?: string;
  initialCycle?: string;
  initialAction?: string;
}

export function CheckoutForm({
  business,
  pendingRequest,
  upiConfig,
  initialPlan,
  initialCycle,
}: CheckoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const normalizedInitialPlan =
    initialPlan?.toLowerCase() === 'professional' ? 'professional' : 'essentials';
  const normalizedInitialCycle =
    initialCycle?.toLowerCase() === 'yearly' || initialCycle?.toLowerCase() === 'annual'
      ? 'yearly'
      : 'monthly';

  const [selectedPlan, setSelectedPlan] = useState<'essentials' | 'professional'>(normalizedInitialPlan);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(normalizedInitialCycle);
  const [paymentMethod, setPaymentMethod] = useState<'upi_qr' | 'upi_id' | 'bank_transfer'>('upi_qr');

  const [screenshotBase64, setScreenshotBase64] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [showUtrGuide, setShowUtrGuide] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<boolean>(false);

  // Expiration calculation
  const targetExpiry = business.subscription_ends_at || business.trial_ends_at;
  const daysRemaining = useMemo(() => {
    if (!targetExpiry) return null;
    return Math.ceil((new Date(targetExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  }, [targetExpiry]);
  const isExpired = daysRemaining !== null && daysRemaining <= 0;
  const isActive = business.subscription_status === 'active' && !isExpired;

  // Active pricing calculation
  const planDetails = PLANS.find((p) => p.id === selectedPlan)!;
  const activePricePaise =
    billingCycle === 'monthly' ? planDetails.monthlyPricePaise : planDetails.yearlyPricePaise;
  const activePriceRupees = activePricePaise / 100;

  // Calculate annual savings
  const annualSavingsPaise = planDetails.monthlyPricePaise * 12 - planDetails.yearlyPricePaise;

  // Projected validity extension
  const projectedExpiryString = useMemo(() => {
    const nowTime = new Date().getTime();
    const baseDate = targetExpiry && new Date(targetExpiry).getTime() > nowTime
      ? new Date(targetExpiry)
      : new Date();
    const futureDate = new Date(baseDate);
    if (billingCycle === 'yearly') {
      futureDate.setFullYear(futureDate.getFullYear() + 1);
    } else {
      futureDate.setMonth(futureDate.getMonth() + 1);
    }
    return futureDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [targetExpiry, billingCycle]);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SubscriptionClaimInput>({
    resolver: zodResolver(subscriptionClaimSchema),
    defaultValues: {
      plan_name: normalizedInitialPlan,
      billing_cycle: normalizedInitialCycle,
      amount_paise: activePricePaise,
      payment_method: 'upi_qr',
      payment_reference: '',
      screenshot_base64: '',
      screenshot_mime: '',
    },
  });

  // Handle plan and cycle changes
  const handlePlanChange = (planId: 'essentials' | 'professional') => {
    setSelectedPlan(planId);
    setValue('plan_name', planId);

    const targetPlan = PLANS.find((p) => p.id === planId)!;
    const price = billingCycle === 'monthly' ? targetPlan.monthlyPricePaise : targetPlan.yearlyPricePaise;
    setValue('amount_paise', price);
  };

  const handleCycleChange = (cycle: 'monthly' | 'yearly') => {
    setBillingCycle(cycle);
    setValue('billing_cycle', cycle);

    const price = cycle === 'monthly' ? planDetails.monthlyPricePaise : planDetails.yearlyPricePaise;
    setValue('amount_paise', price);
  };

  const handleMethodChange = (method: 'upi_qr' | 'upi_id' | 'bank_transfer') => {
    setPaymentMethod(method);
    setValue('payment_method', method);
  };

  // Clipboard copy helper
  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Convert uploaded image to base64
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setFormError('File size is too large. Maximum allowed size is 4MB.');
      return;
    }

    setFileName(file.name);
    setFileSizeStr(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
    setValue('screenshot_mime', file.type);
    setFormError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setScreenshotBase64(base64String);
      setValue('screenshot_base64', base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setFileName('');
    setFileSizeStr('');
    setScreenshotBase64('');
    setValue('screenshot_base64', '');
    setValue('screenshot_mime', '');
  };

  // Form submission handler
  const onSubmit = (data: SubscriptionClaimInput) => {
    setFormError(null);
    setFormSuccess(false);

    startTransition(async () => {
      const result = await submitPaymentClaim({
        ...data,
        amount_paise: activePricePaise, // enforce exact active price
      });

      if (!result.success) {
        setFormError(result.error?.message || 'Something went wrong. Please check fields.');
      } else {
        setFormSuccess(true);
        reset();
        setScreenshotBase64('');
        setFileName('');
        router.refresh();
      }
    });
  };

  // UPI URL construction
  const upiUrl = `upi://pay?pa=${upiConfig.upiId}&pn=${encodeURIComponent(
    upiConfig.accName || 'Bill Matrix'
  )}&am=${activePriceRupees}&cu=INR&tn=${encodeURIComponent(
    `BM Sub ${planDetails.name} ${billingCycle}`
  )}`;

  // Google QR Code service link
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}`;

  // ── Pending Verification Screen ──────────────────────────────────────────
  if (pendingRequest) {
    const pendingPlan = PLANS.find((p) => p.id === pendingRequest.plan_name);
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-amber-200/90 bg-white p-5 sm:p-7 shadow-md">
        <div className="flex flex-col items-center text-center space-y-3.5">
          <div className="size-13 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200 shadow-2xs">
            <Clock className="size-6 animate-pulse" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-xs font-bold text-amber-800 mb-1.5">
              Verification In Progress
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
              Payment Claim Under Review
            </h2>
            <div className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed text-center space-y-0.5">
              <p className="block">Your transaction reference has been logged. Our super administrators are verifying the bank statement.</p>
              <p className="block">Your subscription will activate automatically upon approval.</p>
            </div>
          </div>

          {/* 3-Step Verification Timeline (Expanded Horizontally) */}
          <div className="w-full max-w-2xl py-3 border-y border-slate-100 my-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex flex-col items-center gap-1 text-center shrink-0">
                <span className="size-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  <Check className="size-3.5" />
                </span>
                <span className="font-bold text-xs sm:text-sm text-slate-900 whitespace-nowrap">Claim Logged</span>
                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                  {new Date(pendingRequest.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="h-0.5 flex-1 bg-amber-300 mx-3 sm:mx-6" />

              <div className="flex flex-col items-center gap-1 text-center shrink-0">
                <span className="size-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs animate-pulse shadow-2xs">
                  2
                </span>
                <span className="font-bold text-xs sm:text-sm text-amber-800 whitespace-nowrap">Bank Reconciliation</span>
                <span className="text-[11px] text-slate-500 whitespace-nowrap">In progress</span>
              </div>

              <div className="h-0.5 flex-1 bg-slate-200 mx-3 sm:mx-6" />

              <div className="flex flex-col items-center gap-1 text-center shrink-0">
                <span className="size-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <span className="font-bold text-xs sm:text-sm text-slate-400 whitespace-nowrap">Activation</span>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">Instant</span>
              </div>
            </div>
          </div>

          {/* Claim Metadata Single Grid with Vertical Division (Format B Single-Line) */}
          <div className="w-full rounded-xl bg-slate-50 border border-slate-200/90 overflow-hidden shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-[1.35fr_0.85fr_1.1fr] divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs sm:text-sm">
              <div className="px-4 py-2.5 flex items-center justify-center gap-1.5 text-center whitespace-nowrap">
                <span className="text-slate-500 font-medium shrink-0">Selected Plan:</span>
                <span className="font-bold text-slate-900 capitalize shrink-0">
                  {pendingPlan?.name || pendingRequest.plan_name} ({pendingRequest.billing_cycle})
                </span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-center gap-1.5 text-center whitespace-nowrap">
                <span className="text-slate-500 font-medium shrink-0">Claimed Amount:</span>
                <span className="font-black text-slate-900 font-heading shrink-0">
                  {formatPaiseAsInr(pendingRequest.amount_paise)}
                </span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-center gap-1.5 text-center whitespace-nowrap">
                <span className="text-slate-500 font-medium shrink-0">Claimed UTR / Ref:</span>
                <span className="font-mono font-bold text-indigo-700 shrink-0">
                  {pendingRequest.payment_reference}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 whitespace-nowrap text-center">
            Verification typically takes 15–30 minutes during standard business hours. Feel free to continue using your account in the meantime.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-1">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="font-bold text-sm cursor-pointer h-9.5 px-5 border-slate-200"
            >
              Back to Dashboard
            </Button>
            <Link href="/settings?tab=Billing & Usage">
              <Button className="w-full sm:w-auto font-bold text-sm cursor-pointer h-9.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs">
                View Billing Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:gap-6 lg:grid-cols-12 w-full">
      {/* Column 1 & 2: Plan Selectors, Instructions, and Claim Form */}
      <div className="lg:col-span-8 space-y-4">
        {/* Top Active Status Notification */}
        {isActive && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-purple-50/30 to-white py-2.5 px-3.5 shadow-xs">
            <div className="flex items-center gap-3">
              <Crown className="size-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Active Subscription:{' '}
                  <span className="capitalize font-black text-indigo-700">{business.subscription_plan}</span>{' '}
                  ({daysRemaining} days left)
                </p>
                <p className="text-xs text-slate-500">
                  Submitting a claim below will extend your validity or switch your plan upon admin approval.
                </p>
              </div>
            </div>
            <Link href="/settings?tab=Billing & Usage">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-sm font-semibold gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer rounded-lg border-slate-200 bg-white hover:bg-slate-50"
              >
                <ArrowLeft className="size-4" />
                View Current Plan
              </Button>
            </Link>
          </div>
        )}

        {/* Expired Notice */}
        {isExpired && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 py-2.5 px-3.5 text-rose-800 shadow-xs">
            <AlertTriangle className="size-5 shrink-0 text-rose-500" />
            <div>
              <b className="text-sm font-bold block">Your Subscription Has Expired</b>
              <span className="text-xs mt-0.5 block text-rose-700">
                Your previous plan expired on{' '}
                {targetExpiry ? new Date(targetExpiry).toLocaleDateString('en-IN') : 'recently'}. Please select a plan and submit your payment claim to restore services.
              </span>
            </div>
          </div>
        )}

        {/* Free Trial Notice */}
        {business.subscription_status === 'trial' && !isExpired && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 py-2.5 px-3.5 text-amber-800 shadow-xs">
            <Clock className="size-5 shrink-0 text-amber-500" />
            <div>
              <b className="text-sm font-bold block">
                Free Trial Active ({daysRemaining ?? 14} Days Left)
              </b>
              <span className="text-xs mt-0.5 block text-amber-700">
                Upgrade to Essentials or Professional now to lock in continuous access and avoid feature interruption.
              </span>
            </div>
          </div>
        )}

        {/* Form Alerts */}
        {formSuccess && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 px-3.5 text-emerald-800 shadow-xs">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            <div>
              <b className="text-base font-bold block">Claim Submitted Successfully!</b>
              <span className="text-sm mt-1 block">
                Your transaction reference has been recorded. Our administrators will verify the bank clearance shortly.
              </span>
            </div>
          </div>
        )}

        {formError && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 py-2.5 px-3.5 text-rose-800 shadow-xs animate-shake">
            <AlertTriangle className="size-5 shrink-0 text-rose-500" />
            <div>
              <b className="text-base font-bold block">Submission Failed</b>
              <span className="text-sm mt-1 block">{formError}</span>
            </div>
          </div>
        )}

        {/* ── STEP 1: Plan Picker Card ────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-bold">
                  1
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 font-heading tracking-tight">
                  Select Your Subscription Tier
                </h2>
              </div>
              <p className="text-sm text-slate-500 mt-1 ml-8">
                Choose the plan that matches your business throughput.
              </p>
            </div>

            {/* Cycle Toggle with Annual Savings Pill */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleCycleChange('monthly')}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer',
                  billingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => handleCycleChange('yearly')}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  billingCycle === 'yearly'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                <span>Yearly</span>
                <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded text-xs font-extrabold">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>

          {/* Annual Savings Alert */}
          {billingCycle === 'yearly' && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-sm font-semibold text-emerald-900 shadow-2xs">
              <Sparkles className="size-4 text-emerald-600 shrink-0" />
              <span>
                You are saving <strong>{formatPaiseAsInr(annualSavingsPaise)}</strong> per year with annual billing (includes 2 months free)!
              </span>
            </div>
          )}

          {/* Pricing Grid */}
          <div className="mt-3.5 grid gap-4 sm:grid-cols-2">
            {PLANS.map((plan) => {
              const price = billingCycle === 'monthly' ? plan.monthlyPricePaise : plan.yearlyPricePaise;
              const isSelected = selectedPlan === plan.id;
              const isCurrent = business.subscription_plan.toLowerCase() === plan.id;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => handlePlanChange(plan.id)}
                  className={cn(
                    'flex flex-col justify-between text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden',
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-500/10 shadow-md bg-gradient-to-b from-white to-indigo-50/30'
                      : 'border-slate-200/80 hover:border-slate-300 bg-slate-50/40 hover:bg-white'
                  )}
                >
                  {/* Top Badges */}
                  <div className="w-full">
                    <div className="flex justify-between items-center w-full mb-1">
                      <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
                        {plan.name}
                      </span>
                      {isCurrent ? (
                        <span className="rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-0.5 text-xs font-extrabold shadow-2xs">
                          Current Tier
                        </span>
                      ) : plan.popular ? (
                        <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-0.5 text-xs font-extrabold shadow-2xs">
                          Most Popular
                        </span>
                      ) : null}
                    </div>

                    <p className="text-xs text-slate-500 leading-snug mb-1.5">
                      {plan.tagline}
                    </p>

                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black font-heading text-slate-900">
                        {formatPaiseAsInr(price)}
                      </span>
                      <span className="text-sm text-slate-500 font-semibold">
                        {billingCycle === 'monthly' ? '/ month' : '/ year'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 border-t border-dashed border-slate-200 pt-2 w-full space-y-1.5">
                    <ul className="space-y-1">
                      {plan.features.slice(0, 4).map((feat, i) => (
                        <li key={i} className="text-xs text-slate-800 flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STEP 2: Payment Method & Account Details ───────────────────── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 sm:p-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-bold">
                2
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 font-heading tracking-tight">
                Select Payment Mode & Transfer
              </h2>
            </div>
            <p className="text-sm text-slate-500 mt-1 ml-8">
              Transfer exact amount to our verified account via UPI QR, UPI ID, or Bank NEFT.
            </p>
          </div>

          {/* Mode Selector Tabs */}
          <div className="mt-3.5 grid grid-cols-3 gap-3">
            {[
              { id: 'upi_qr' as const, label: 'UPI QR Code', icon: QrCode, desc: 'Instant Scan' },
              { id: 'upi_id' as const, label: 'Direct UPI ID', icon: Smartphone, desc: 'Any UPI App' },
              { id: 'bank_transfer' as const, label: 'Bank Transfer', icon: Building, desc: 'NEFT / RTGS' },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMethodChange(m.id)}
                  className={cn(
                    'flex flex-col items-center text-center py-2 px-2 rounded-xl border font-bold text-sm tracking-wide transition-all cursor-pointer',
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                      : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
                  )}
                >
                  <Icon className="size-4 shrink-0 mb-1" />
                  <span className="font-extrabold">{m.label}</span>
                  <span className="text-xs font-normal text-slate-400 mt-0.5">
                    {m.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Mode Details */}
          <div className="mt-3.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-3 px-4 flex flex-col items-center justify-center">
            {paymentMethod === 'upi_qr' && (
              <div className="text-center flex flex-col items-center max-w-sm">
                <span className="text-sm text-slate-500 font-semibold">
                  Scan QR with GPay, PhonePe, Paytm, BHIM, or CRED
                </span>

                {/* QR Container */}
                <div className="mt-2.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrImageUrl} alt="UPI QR Code" className="size-40" />
                </div>

                <div className="mt-2.5 flex flex-col items-center gap-1">
                  <div className="text-sm font-bold text-slate-900">
                    Pay Amount:{' '}
                    <span className="text-indigo-600 font-extrabold text-base font-heading">
                      {formatPaiseAsInr(activePricePaise)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Payee: <strong>{upiConfig.accName}</strong>
                  </span>
                </div>

                {/* Mobile Intent Direct Link - Exact Image 3 Styling */}
                <a
                  href={upiUrl}
                  className="mt-2.5 inline-flex items-center gap-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 font-bold px-3.5 py-2 text-sm shadow-xs transition-all hover:shadow-sm"
                >
                  <Smartphone className="size-4" />
                  <span>Open directly in UPI App (Mobile)</span>
                  <ExternalLink className="size-4" />
                </a>
              </div>
            )}

            {paymentMethod === 'upi_id' && (
              <div className="w-full max-w-md space-y-3">
                <div className="flex justify-between items-center text-sm pb-1 border-b border-slate-200">
                  <span className="font-semibold text-slate-500">Payee Name:</span>
                  <span className="font-bold text-slate-900">{upiConfig.accName || 'Bill Matrix'}</span>
                </div>

                <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      UPI ID Address
                    </span>
                    <span className="text-sm font-mono font-bold text-indigo-700 select-all">
                      {upiConfig.upiId}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(upiConfig.upiId, 'upi')}
                    className="h-8 gap-1 text-sm font-semibold cursor-pointer text-slate-600 hover:text-slate-900"
                  >
                    {copiedField === 'upi' ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-bold">
                        <Check className="size-4" /> Copied
                      </span>
                    ) : (
                      <>
                        <Copy className="size-4 mr-1" /> Copy
                      </>
                    )}
                  </Button>
                </div>

                <div className="rounded-lg bg-slate-100 p-2.5 text-sm text-slate-600">
                  <p>
                    Open your UPI app (GPay/PhonePe), choose <strong>Pay to UPI ID</strong>, paste the address, enter{' '}
                    <strong className="text-slate-900">{formatPaiseAsInr(activePricePaise)}</strong>, and complete the transfer.
                  </p>
                </div>
              </div>
            )}

            {paymentMethod === 'bank_transfer' && (
              <div className="w-full max-w-md space-y-2.5">
                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-200 text-sm">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Bank Name
                    </span>
                    <span className="font-bold text-slate-900">{upiConfig.bankName}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Beneficiary Name
                    </span>
                    <span className="font-bold text-slate-900">{upiConfig.accName}</span>
                  </div>
                </div>

                {/* Account Number */}
                <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Account Number
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-900 select-all">
                      {upiConfig.accNo}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(upiConfig.accNo, 'acc')}
                    className="h-8 text-sm font-semibold cursor-pointer text-slate-600 hover:text-slate-900"
                  >
                    {copiedField === 'acc' ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-bold">
                        <Check className="size-4" /> Copied
                      </span>
                    ) : (
                      <>
                        <Copy className="size-4 mr-1" /> Copy
                      </>
                    )}
                  </Button>
                </div>

                {/* IFSC Code */}
                <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      IFSC Code
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-900 select-all">
                      {upiConfig.ifsc}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(upiConfig.ifsc, 'ifsc')}
                    className="h-8 text-sm font-semibold cursor-pointer text-slate-600 hover:text-slate-900"
                  >
                    {copiedField === 'ifsc' ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-bold">
                        <Check className="size-4" /> Copied
                      </span>
                    ) : (
                      <>
                        <Copy className="size-4 mr-1" /> Copy
                      </>
                    )}
                  </Button>
                </div>

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 font-medium">
                  <strong>Important:</strong> Please add your Business Name ({business.legal_name}) in the payment remarks/description so we can match your bank deposit instantly.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── STEP 3: Enter UTR Reference & Submit Claim ──────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 sm:p-5 shadow-xs space-y-3">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-bold">
                  3
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 font-heading tracking-tight">
                  Enter UTR & Submit Verification Claim
                </h2>
              </div>
              <p className="text-sm text-slate-500 mt-1 ml-8">
                Provide your 12-digit transaction reference number and optional receipt screenshot.
              </p>
            </div>

            <div className="space-y-3 pt-0.5">
              {/* UTR Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="payment_reference" className="text-sm font-bold text-slate-900">
                    Transaction UTR / Reference Number *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowUtrGuide(!showUtrGuide)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="size-4" />
                    <span>Where do I find my UTR?</span>
                  </button>
                </div>

                <input
                  id="payment_reference"
                  type="text"
                  placeholder="e.g. 423456789012 or UPI Ref / Transaction ID"
                  {...register('payment_reference')}
                  className={cn(
                    'h-10 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-base font-mono uppercase tracking-wider placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 shadow-xs outline-none transition-all focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/15',
                    errors.payment_reference && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10'
                  )}
                />

                {errors.payment_reference && (
                  <span className="text-xs font-semibold text-rose-500 mt-0.5">
                    {errors.payment_reference.message}
                  </span>
                )}

                {/* UTR Explainer Accordion */}
                {showUtrGuide && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-sm text-slate-700 space-y-1.5 mt-1">
                    <p className="font-bold text-slate-900">Where to look for your 12-digit Reference:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• <strong>Google Pay:</strong> Open transaction ➔ Copy the 12-digit &quot;UPI transaction ID&quot;.</li>
                      <li>• <strong>PhonePe:</strong> Open transaction history ➔ Look for &quot;UTR Number&quot;.</li>
                      <li>• <strong>Paytm:</strong> View payment details ➔ Copy the &quot;UPI Ref No.&quot;.</li>
                      <li>• <strong>NetBanking (NEFT/IMPS):</strong> Check statement ➔ Look for the alphanumeric &quot;UTR / Ref No.&quot;.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* File Uploader */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-900">
                  Upload Payment Screenshot (Optional but speeds up approval)
                </label>

                {!fileName ? (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/40 py-3.5 px-4 hover:bg-slate-50 hover:border-indigo-400 transition relative cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud className="size-7 text-slate-400 group-hover:text-indigo-600 transition-colors mb-1" />
                    <span className="text-sm font-bold text-slate-900">
                      Click to upload or drag & drop payment screenshot
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5">
                      JPEG, PNG, WebP up to 4MB
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/40 p-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {screenshotBase64 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={screenshotBase64}
                          alt="Screenshot preview"
                          className="size-10 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <FileImage className="size-7 text-indigo-600" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{fileName}</p>
                        <p className="text-xs text-slate-500">{fileSizeStr}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveScreenshot}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit CTA Button */}
            <Button
              type="submit"
              disabled={isPending}
              className="mt-3 w-full h-10 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 text-base"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Verifying & Submitting Claim...
                </>
              ) : (
                'Submit Payment Claim for Instant Review'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Column 2: Cart summary details and Trust FAQs */}
      <div className="lg:col-span-4 space-y-4">
        {/* Sticky Summary Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 sm:p-5 shadow-xs sticky top-5">
          <h2 className="text-lg font-extrabold text-slate-900 font-heading tracking-tight border-b border-slate-100 pb-2.5">
            Subscription Summary
          </h2>

          <div className="space-y-2.5 mt-3">
            {/* Business info */}
            <div className="flex justify-between items-center py-0.5">
              <span className="text-sm text-slate-500 font-semibold">Account:</span>
              <span className="text-sm font-bold text-slate-900 truncate max-w-44 text-right">
                {business.legal_name}
              </span>
            </div>

            {business.gstin && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-sm text-slate-500 font-semibold">GSTIN:</span>
                <span className="text-sm font-mono font-bold text-slate-900">{business.gstin}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-0.5 border-b border-dashed border-slate-200 pb-2">
              <span className="text-sm text-slate-500 font-semibold">Current Tier:</span>
              <span className="text-sm font-bold bg-slate-100 px-2.5 py-0.5 rounded capitalize text-slate-800">
                {business.subscription_plan}
              </span>
            </div>

            {/* Plan breakdown item */}
            <div className="pt-0">
              <div className="flex justify-between items-start">
                <div>
                  <b className="text-sm font-extrabold text-slate-900 block">{planDetails.name}</b>
                  <span className="text-xs text-slate-500 font-semibold block capitalize mt-0.5">
                    Billed {billingCycle}
                  </span>
                </div>
                <span className="text-sm font-black text-slate-900 font-heading">
                  {formatPaiseAsInr(activePricePaise)}
                </span>
              </div>
            </div>

            {/* Validity extension preview */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-sm space-y-1">
              <div className="flex justify-between items-center text-slate-500">
                <span>Coverage Period:</span>
                <span className="font-bold text-slate-900">
                  {billingCycle === 'yearly' ? '12 Months (1 Year)' : '1 Month'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Valid Until:</span>
                <span className="font-bold text-emerald-700">{projectedExpiryString}</span>
              </div>
            </div>

            <div className="-mx-5 border-t border-slate-100 my-2.5" />

            {/* Total Amount Due */}
            <div className="flex justify-between items-baseline">
              <span className="text-base font-bold text-slate-900">Total Amount Due:</span>
              <span className="text-2xl font-black text-indigo-700 font-heading">
                {formatPaiseAsInr(activePricePaise)}
              </span>
            </div>

            {/* Security Guarantee Badges */}
            <div className="mt-3 space-y-1.5 pt-1">
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>100% Tax Deductible — GST compliant tax invoice provided for input tax credit.</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <CheckCircle className="size-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Immediate plan activation on transaction verification.</span>
              </div>
            </div>

            {/* FAQ Accordion */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 space-y-1.5">
              <span className="text-sm font-bold text-slate-900 block uppercase tracking-wider mb-1.5">
                Frequently Asked Questions
              </span>

              {[
                {
                  q: 'How long does verification take?',
                  a: 'Admin verification usually takes 15–30 minutes during business hours. In rare cases of bank clearing delays, it can take up to 2 hours.',
                },
                {
                  q: 'Will my existing invoices be affected?',
                  a: 'Never. All your finalized invoices, customers, and product items remain 100% immutable and intact.',
                },
                {
                  q: 'Can I switch between monthly and annual plans?',
                  a: 'Yes, any new plan claim will automatically extend your subscription duration from your current renewal date.',
                },
              ].map((faq, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex justify-between items-center px-3 py-1.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? <ChevronUp className="size-4 shrink-0 text-slate-500" /> : <ChevronDown className="size-4 shrink-0 text-slate-500" />}
                  </button>
                  {openFaq === idx && (
                    <div className="px-3 pb-2 text-xs text-slate-500 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
