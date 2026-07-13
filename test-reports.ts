import { db } from './lib/db/client';
import { businesses, invoices, payments, customers, invoiceLineItems, products } from './lib/db/schema';
import { eq, and, ne, between, desc, sql } from 'drizzle-orm';
import { getDisplayInvoiceStatus } from './lib/invoices/status';
import { formatPaiseAsInr } from './lib/money';

async function main() {
  const b = await db.select().from(businesses).limit(1);
  if (!b.length) {
    console.log('No business found');
    process.exit(0);
  }
  const businessId = b[0].id;
  
  // Outstanding Invoices
  const outstandingInvoices = await db.select({
    id: invoices.id,
    grand_total_paise: invoices.grand_total_paise,
    due_date: invoices.due_date,
    lifecycle_status: invoices.lifecycle_status,
    payment_status: invoices.payment_status,
    paid_amount: sql<number>`coalesce(sum(${payments.amount_paise}), 0)`.mapWith(Number)
  })
  .from(invoices)
  .leftJoin(payments, eq(invoices.id, payments.invoice_id))
  .where(and(
    eq(invoices.business_id, businessId),
    eq(invoices.lifecycle_status, 'finalized'),
    ne(invoices.payment_status, 'paid')
  ))
  .groupBy(invoices.id);

  let outstandingTotalPaise = 0;
  let overdueCount = 0;

  for (const inv of outstandingInvoices) {
    const balance = inv.grand_total_paise - inv.paid_amount;
    outstandingTotalPaise += balance;
    const status = getDisplayInvoiceStatus({
      lifecycle_status: inv.lifecycle_status,
      payment_status: inv.payment_status,
      due_date: inv.due_date
    });
    if (status === 'overdue') {
      overdueCount++;
    }
  }

  console.log('--- DASHBOARD CARDS ---');
  console.log(`Outstanding: ${formatPaiseAsInr(outstandingTotalPaise)}`);
  console.log(`Overdue Invoices: ${overdueCount}`);
  
  const draftResult = await db.select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(and(
      eq(invoices.business_id, businessId),
      eq(invoices.lifecycle_status, 'draft')
    ));
  
  const finalizedResult = await db.select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(and(
      eq(invoices.business_id, businessId),
      eq(invoices.lifecycle_status, 'finalized')
    ));
    
  console.log(`Total Finalized: ${finalizedResult[0].count}`);
  console.log(`Drafts: ${draftResult[0].count}`);
  
  // Sales by period (this month)
  const monthKey = sql<string>`to_char(${invoices.invoice_date}, 'YYYY-MM')`;
  const sales = await db.select({
    month: monthKey,
    grand_total: sql<number>`sum(${invoices.grand_total_paise})`,
    invoice_count: sql<number>`count(*)`
  })
  .from(invoices)
  .where(and(
    eq(invoices.business_id, businessId),
    eq(invoices.lifecycle_status, 'finalized')
  ))
  .groupBy(monthKey)
  .orderBy(monthKey);
  
  console.log('--- SALES BY PERIOD ---');
  console.log(sales);
  
  // Top Customers
  const topC = await db.select({
    name: customers.name,
    rev: sql<number>`sum(${invoices.grand_total_paise})`.mapWith(Number)
  })
  .from(invoices)
  .leftJoin(customers, eq(invoices.customer_id, customers.id))
  .where(and(eq(invoices.business_id, businessId), eq(invoices.lifecycle_status, 'finalized')))
  .groupBy(customers.name)
  .orderBy(desc(sql`sum(${invoices.grand_total_paise})`))
  .limit(5);
  
  console.log('--- TOP CUSTOMERS ---');
  console.log(topC);
  
  // Top Products
  const topP = await db.select({
    name: products.name,
    rev: sql<number>`sum(${invoiceLineItems.line_total_paise})`.mapWith(Number)
  })
  .from(invoiceLineItems)
  .innerJoin(invoices, eq(invoiceLineItems.invoice_id, invoices.id))
  .leftJoin(products, eq(invoiceLineItems.product_id, products.id))
  .where(and(eq(invoices.business_id, businessId), eq(invoices.lifecycle_status, 'finalized')))
  .groupBy(products.name)
  .orderBy(desc(sql`sum(${invoiceLineItems.line_total_paise})`))
  .limit(5);
  
  console.log('--- TOP PRODUCTS ---');
  console.log(topP);

  process.exit(0);
}

main().catch(console.error);
