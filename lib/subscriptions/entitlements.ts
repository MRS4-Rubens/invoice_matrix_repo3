/**
 * Pure Entitlements & Subscription Engine for Bill Matrix
 * 
 * Central source of truth for:
 * 1. Plan tiers ('free', 'trial', 'essentials', 'professional')
 * 2. Subscription statuses ('trial', 'active', 'expired', 'suspended')
 * 3. Quotas (invoices/month, customers, products, team users)
 * 4. Feature permissions (templates, logo upload, statutory reports, WhatsApp dispatch, white-label branding)
 */

export type PlanTier = 'free' | 'trial' | 'essentials' | 'professional';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'suspended';
export type BillingCycle = 'monthly' | 'yearly';

export interface PlanPricing {
  monthlyPaise: number;
  yearlyPaise: number;
}

export const PLAN_PRICING: Record<'essentials' | 'professional', PlanPricing> = {
  essentials: {
    monthlyPaise: 39900,  // ₹399 / month
    yearlyPaise: 349900,  // ₹3,499 / year (~₹291/month, Save 27%)
  },
  professional: {
    monthlyPaise: 59900,  // ₹599 / month
    yearlyPaise: 499900,  // ₹4,999 / year (~₹416/month, Save 30%)
  },
};

export const FREE_TIER_LIMITS = {
  invoiceMonthlyLimit: 30, // Max 30 invoices per calendar month
  customerLimit: 30,       // Max 30 customer contacts
  productLimit: 30,        // Max 30 catalog products
  teamUserLimit: 1,        // Owner only
} as const;

export const ESSENTIALS_TIER_LIMITS = {
  invoiceMonthlyLimit: null, // Unlimited
  customerLimit: null,       // Unlimited
  productLimit: null,        // Unlimited
  teamUserLimit: 3,          // Owner + 2 Staff
} as const;

export const PROFESSIONAL_TIER_LIMITS = {
  invoiceMonthlyLimit: null, // Unlimited
  customerLimit: null,       // Unlimited
  productLimit: null,        // Unlimited
  teamUserLimit: null,       // Unlimited
} as const;

export interface BusinessSubscriptionSource {
  subscription_plan?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: Date | string | null;
  subscription_activated_at?: Date | string | null;
  subscription_ends_at?: Date | string | null;
}

export interface PlanEntitlements {
  tier: PlanTier;
  rawStatus: string;
  isActive: boolean;
  isTrial: boolean;
  isExpired: boolean;
  isSuspended: boolean;
  daysRemaining: number | null;
  targetExpiry: Date | null;

  // Quotas
  invoiceMonthlyLimit: number | null;
  customerLimit: number | null;
  productLimit: number | null;
  teamUserLimit: number | null;

  // Feature Flags
  canUseAllTemplates: boolean;
  canUploadLogo: boolean;
  hasWatermark: boolean;
  canDirectWhatsApp: boolean;
  canExportExcelReports: boolean;
  canFinalizeCreditNotes: boolean;
  canBulkImportCsv: boolean;
  canAccessCaPortal: boolean;
  hasPermanentPdfStorage: boolean;
  canCustomizeInvoiceFormat: boolean;
}

/**
 * Resolves dates safely from Date instances or ISO strings
 */
function toDate(val?: Date | string | null): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Evaluates the authoritative plan tier and status for a business
 */
export function resolveBusinessPlan(business?: BusinessSubscriptionSource | null): {
  tier: PlanTier;
  effectiveStatus: SubscriptionStatus;
  daysRemaining: number | null;
  targetExpiry: Date | null;
} {
  if (!business) {
    return {
      tier: 'free',
      effectiveStatus: 'active',
      daysRemaining: null,
      targetExpiry: null,
    };
  }

  const rawStatus = (business.subscription_status || 'trial').toLowerCase() as SubscriptionStatus;
  const rawPlan = (business.subscription_plan || 'trial').toLowerCase();
  const now = Date.now();

  const trialEnd = toDate(business.trial_ends_at);
  const subEnd = toDate(business.subscription_ends_at);

  // Explicit suspension takes top precedence
  if (rawStatus === 'suspended') {
    return {
      tier: 'free',
      effectiveStatus: 'suspended',
      daysRemaining: 0,
      targetExpiry: subEnd || trialEnd,
    };
  }

  // Active paid subscription
  if (rawStatus === 'active') {
    if (subEnd) {
      const remainingMs = subEnd.getTime() - now;
      const days = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      if (days <= 0) {
        // Expired paid subscription -> falls back to Free tier
        return {
          tier: 'free',
          effectiveStatus: 'expired',
          daysRemaining: 0,
          targetExpiry: subEnd,
        };
      }
      const tier: PlanTier = rawPlan === 'professional' ? 'professional' : 'essentials';
      return {
        tier,
        effectiveStatus: 'active',
        daysRemaining: days,
        targetExpiry: subEnd,
      };
    }

    // Active with no end date (continuous active)
    const tier: PlanTier = rawPlan === 'professional' ? 'professional' : 'essentials';
    return {
      tier,
      effectiveStatus: 'active',
      daysRemaining: null,
      targetExpiry: null,
    };
  }

  // Trial evaluation
  if (rawStatus === 'trial' || rawPlan === 'trial') {
    if (trialEnd) {
      const remainingMs = trialEnd.getTime() - now;
      const days = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      if (days <= 0) {
        // Trial expired -> falls back to Free tier
        return {
          tier: 'free',
          effectiveStatus: 'expired',
          daysRemaining: 0,
          targetExpiry: trialEnd,
        };
      }
      return {
        tier: 'trial',
        effectiveStatus: 'trial',
        daysRemaining: days,
        targetExpiry: trialEnd,
      };
    }

    // Default 14-day trial if no timestamp set
    return {
      tier: 'trial',
      effectiveStatus: 'trial',
      daysRemaining: 14,
      targetExpiry: null,
    };
  }

  // Free Tier fallback
  return {
    tier: 'free',
    effectiveStatus: 'active',
    daysRemaining: null,
    targetExpiry: null,
  };
}

/**
 * Returns complete entitlement flags for a given business
 */
export function getPlanEntitlements(business?: BusinessSubscriptionSource | null): PlanEntitlements {
  const { tier, effectiveStatus, daysRemaining, targetExpiry } = resolveBusinessPlan(business);

  const isActive = effectiveStatus === 'active';
  const isTrial = effectiveStatus === 'trial';
  const isExpired = effectiveStatus === 'expired';
  const isSuspended = effectiveStatus === 'suspended';

  // In active trial, users get all Essentials Pro features to explore freely
  const isProLevel = tier === 'essentials' || tier === 'professional' || (isTrial && !isExpired);
  const isEnterpriseLevel = tier === 'professional';

  return {
    tier,
    rawStatus: effectiveStatus,
    isActive,
    isTrial,
    isExpired,
    isSuspended,
    daysRemaining,
    targetExpiry,

    // Quotas
    invoiceMonthlyLimit: isProLevel ? null : FREE_TIER_LIMITS.invoiceMonthlyLimit,
    customerLimit: isProLevel ? null : FREE_TIER_LIMITS.customerLimit,
    productLimit: isProLevel ? null : FREE_TIER_LIMITS.productLimit,
    teamUserLimit: isEnterpriseLevel
      ? PROFESSIONAL_TIER_LIMITS.teamUserLimit
      : isProLevel
      ? ESSENTIALS_TIER_LIMITS.teamUserLimit
      : FREE_TIER_LIMITS.teamUserLimit,

    // Feature Flags
    canUseAllTemplates: isProLevel,
    canUploadLogo: isProLevel,
    hasWatermark: !isProLevel,
    canDirectWhatsApp: isProLevel,
    canExportExcelReports: isProLevel,
    canFinalizeCreditNotes: isProLevel,
    canBulkImportCsv: isProLevel,
    canAccessCaPortal: isEnterpriseLevel,
    hasPermanentPdfStorage: isProLevel,
    canCustomizeInvoiceFormat: isProLevel,
  };
}

export const resolveSubscriptionPlan = getPlanEntitlements;

/**
 * Evaluates whether an invoice can be created or finalized
 */
export function canCreateInvoice(
  business: BusinessSubscriptionSource | null | undefined,
  currentMonthInvoiceCount: number
): { allowed: boolean; reason?: string; code?: string } {
  const entitlements = getPlanEntitlements(business);

  if (entitlements.isSuspended) {
    return {
      allowed: false,
      reason: 'Your account has been suspended. Please contact platform support.',
      code: 'ACCOUNT_SUSPENDED',
    };
  }

  if (entitlements.invoiceMonthlyLimit !== null && currentMonthInvoiceCount >= entitlements.invoiceMonthlyLimit) {
    return {
      allowed: false,
      reason: `You have reached the free limit of ${entitlements.invoiceMonthlyLimit} invoices for this month. Upgrade to Essentials Pro for unlimited invoices.`,
      code: 'INVOICE_QUOTA_EXCEEDED',
    };
  }

  return { allowed: true };
}

/**
 * Evaluates whether a new customer can be added
 */
export function canAddCustomer(
  business: BusinessSubscriptionSource | null | undefined,
  currentCustomerCount: number
): { allowed: boolean; reason?: string; code?: string } {
  const entitlements = getPlanEntitlements(business);

  if (entitlements.customerLimit !== null && currentCustomerCount >= entitlements.customerLimit) {
    return {
      allowed: false,
      reason: `You have reached the free limit of ${entitlements.customerLimit} customers. Upgrade to Essentials Pro for unlimited customer accounts.`,
      code: 'CUSTOMER_QUOTA_EXCEEDED',
    };
  }

  return { allowed: true };
}

/**
 * Evaluates whether a new product can be added
 */
export function canAddProduct(
  business: BusinessSubscriptionSource | null | undefined,
  currentProductCount: number
): { allowed: boolean; reason?: string; code?: string } {
  const entitlements = getPlanEntitlements(business);

  if (entitlements.productLimit !== null && currentProductCount >= entitlements.productLimit) {
    return {
      allowed: false,
      reason: `You have reached the free limit of ${entitlements.productLimit} products. Upgrade to Essentials Pro for unlimited product catalog.`,
      code: 'PRODUCT_QUOTA_EXCEEDED',
    };
  }

  return { allowed: true };
}

/**
 * Checks whether an invoice template is allowed for this business
 */
export function canUseTemplate(
  business: BusinessSubscriptionSource | null | undefined,
  templateId: string
): { allowed: boolean; reason?: string; code?: string } {
  const entitlements = getPlanEntitlements(business);

  // Template 1 (Classic Slate) is free for all
  if (templateId === 'template_1') {
    return { allowed: true };
  }

  if (!entitlements.canUseAllTemplates) {
    return {
      allowed: false,
      reason: 'Traditional, Carbon Pad, and Book Depot templates are exclusive to Essentials Pro. Upgrade to unlock all 4 premium templates.',
      code: 'TEMPLATE_LOCKED',
    };
  }

  return { allowed: true };
}

/**
 * Checks if the business can upload a custom logo
 */
export function canUploadBusinessLogo(
  business: BusinessSubscriptionSource | null | undefined
): { allowed: boolean; reason?: string; code?: string } {
  const entitlements = getPlanEntitlements(business);

  if (!entitlements.canUploadLogo) {
    return {
      allowed: false,
      reason: 'Custom logo branding is an Essentials Pro feature. Upgrade to personalize your invoices with your company logo.',
      code: 'LOGO_UPLOAD_LOCKED',
    };
  }

  return { allowed: true };
}

/**
 * Checks if statutory Excel exports (GSTR-1, ITR 44AD, HSN) are allowed
 */
export function canExportStatutoryReport(
  business: BusinessSubscriptionSource | null | undefined
): { allowed: boolean; reason?: string; code?: string } {
  const entitlements = getPlanEntitlements(business);

  if (!entitlements.canExportExcelReports) {
    return {
      allowed: false,
      reason: 'Official GSTR-1 and ITR 44AD Excel exports are exclusive to paid plans. Upgrade to Essentials Pro to export filing-ready workbooks.',
      code: 'REPORT_EXPORT_LOCKED',
    };
  }

  return { allowed: true };
}

/**
 * Checks if the business can customize invoice numbering format and brand prefix
 */
export function canCustomizeInvoiceNumberFormat(
  business: BusinessSubscriptionSource | null | undefined
): { allowed: boolean; reason?: string; code?: string } {
  const entitlements = getPlanEntitlements(business);

  if (!entitlements.canCustomizeInvoiceFormat) {
    return {
      allowed: false,
      reason: 'Custom invoice numbering formats, brand initials (e.g. MBS), and daily/monthly series are exclusive to paid plans. Upgrade to Essentials Pro to customize your invoice format.',
      code: 'INVOICE_FORMAT_LOCKED',
    };
  }

  return { allowed: true };
}
