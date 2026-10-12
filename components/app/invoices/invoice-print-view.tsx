import { InvoiceTemplateProps, InvoiceTemplate1 } from './templates/template-1';
import { InvoiceTemplate2 } from './templates/template-2';
import { InvoiceTemplate3 } from './templates/template-3';
import { InvoiceTemplate4 } from './templates/template-4';
import { resolveSubscriptionPlan } from '@/lib/subscriptions/entitlements';

export interface InvoicePrintViewProps {
  invoice: {
    id: string;
    business_name: string;
    city: string | null;
    seller_gstin_snapshot: string | null;
    phone: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_ifsc: string | null;
    invoice_terms: string | null;
    invoice_number: string;
    invoice_date: string | Date | null;
    billing_name_snapshot: string | null;
    billing_gstin_snapshot: string | null;
    billing_address_snapshot: string | null;
    place_of_supply_state_code: string | null;
    subtotal_paise: number;
    total_cgst_paise: number;
    total_sgst_paise: number;
    total_igst_paise: number;
    total_tax_paise: number;
    grand_total_paise: number;
    invoice_template?: string | null;
    gst_rate_type?: string | null;
    nature_of_business?: string | null;
    alternate_phone?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    pincode?: string | null;
    business_id?: string;
    logo_storage_key?: string | null;
    logo_url?: string | null;
    logo_base64?: string | null;
    has_watermark?: boolean;
    subscription_plan?: string | null;
    subscription_status?: string | null;
    trial_ends_at?: Date | string | null;
    customer?: {
      phone?: string | null;
    } | null;
    lineItems: any[];
    [key: string]: unknown;
  };
  businessStateCode: string;
  printSize?: 'A4' | 'A5';
  hasWatermark?: boolean;
}

export function InvoicePrintView({ invoice, businessStateCode, printSize = 'A4', hasWatermark }: InvoicePrintViewProps) {
  const templateId = invoice.invoice_template || 'template_1';

  const logoUrl = invoice.logo_url 
    ?? (invoice.business_id && invoice.logo_storage_key ? `/api/business/${invoice.business_id}/logo` : null);

  const effectiveHasWatermark = (() => {
    if (hasWatermark !== undefined) return hasWatermark;
    if (invoice.has_watermark !== undefined) return invoice.has_watermark;
    if (invoice.subscription_plan) {
      const plan = resolveSubscriptionPlan({
        subscription_plan: invoice.subscription_plan,
        subscription_status: invoice.subscription_status,
        trial_ends_at: invoice.trial_ends_at,
      });
      return plan.hasWatermark;
    }
    return false;
  })();

  // Format arguments to fit InvoiceTemplateProps cleanly
  const templateProps: InvoiceTemplateProps = {
    invoice: {
      ...invoice,
      city: invoice.city || null,
      phone: invoice.phone || null,
      bank_name: invoice.bank_name || null,
      bank_account_number: invoice.bank_account_number || null,
      bank_ifsc: invoice.bank_ifsc?.toUpperCase() || null,
      invoice_terms: invoice.invoice_terms || null,
      seller_gstin_snapshot: invoice.seller_gstin_snapshot?.toUpperCase() || null,
      billing_name_snapshot: invoice.billing_name_snapshot || null,
      billing_gstin_snapshot: invoice.billing_gstin_snapshot?.toUpperCase() || null,
      place_of_supply_state_code: invoice.place_of_supply_state_code || null,
      nature_of_business: invoice.nature_of_business || null,
      alternate_phone: invoice.alternate_phone || null,
      address_line1: invoice.address_line1 || null,
      address_line2: invoice.address_line2 || null,
      pincode: invoice.pincode || null,
      logo_url: logoUrl,
      logo_base64: invoice.logo_base64 || null,
    },
    businessStateCode,
    printSize,
    hasWatermark: effectiveHasWatermark,
  };

  switch (templateId) {
    case 'template_2':
      return <InvoiceTemplate2 {...templateProps} />;
    case 'template_3':
      return <InvoiceTemplate3 {...templateProps} />;
    case 'template_4':
      return <InvoiceTemplate4 {...templateProps} />;
    case 'template_1':
    default:
      return <InvoiceTemplate1 {...templateProps} />;
  }
}
