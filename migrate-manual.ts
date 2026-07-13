import { db } from './lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    // Phase 13 Migrations
    await db.execute(sql`ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "payment_due_days" integer NOT NULL DEFAULT 30;`);
    await db.execute(sql`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "due_date" date;`);

    console.log("Migration successful.");
  } catch (err: any) {
    console.error(err);
    process.exit(1);
  }
  process.exit(0);
}

main();
