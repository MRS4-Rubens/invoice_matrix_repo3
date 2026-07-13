import { db } from './lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    // 1. Create enum type
    await db.execute(sql`DO $$ BEGIN
      CREATE TYPE "archival_status" AS ENUM ('pending', 'archived', 'failed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`);

    // 2. Add columns to invoices
    await db.execute(sql`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "archival_status" "archival_status" NOT NULL DEFAULT 'pending';`);
    await db.execute(sql`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "archival_attempts" integer NOT NULL DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;`);
    
    // Create index
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "invoices_archival_status_idx" ON "invoices" ("archival_status");`);

    console.log("Migration successful.");
  } catch (err: any) {
    console.error(err);
    process.exit(1);
  }
  process.exit(0);
}

main();
