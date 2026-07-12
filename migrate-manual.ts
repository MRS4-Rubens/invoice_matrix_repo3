import { db } from './lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql`ALTER TABLE businesses ADD COLUMN invoice_terms text NOT NULL DEFAULT '1. Goods once sold will not be taken back.\n2. Payment to be made within 30 days from the date of invoice.\n3. Interest @ 24% per annum will be charged on overdue invoices until payment is received.'`);
    console.log("Migration successful.");
  } catch (err: any) {
    if (err.message.includes('already exists')) {
      console.log('Column already exists.');
    } else {
      console.error(err);
      process.exit(1);
    }
  }
  process.exit(0);
}

main();
