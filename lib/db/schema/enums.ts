import { pgEnum } from 'drizzle-orm/pg-core';

export const registrationTypeEnum = pgEnum('registration_type', ['regular', 'composition']);
export const roleEnum = pgEnum('role', ['owner', 'staff']);
export const invoiceTypeEnum = pgEnum('invoice_type', ['tax_invoice', 'bill_of_supply']);
export const lifecycleStatusEnum = pgEnum('lifecycle_status', ['draft', 'finalized']);
export const paymentStatusEnum = pgEnum('payment_status', ['unpaid', 'partially_paid', 'paid', 'overdue']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other']);
export const archivalStatusEnum = pgEnum('archival_status', ['pending', 'archived', 'failed']);
