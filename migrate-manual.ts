import { db } from './lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log("Running template migrations...");
    await db.execute(sql`DO $$ BEGIN CREATE TYPE gst_rate_type AS ENUM('inclusive', 'exclusive'); EXCEPTION WHEN duplicate_object THEN null; END $$;`);
    await db.execute(sql`ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "default_gst_rate_type" gst_rate_type DEFAULT 'exclusive' NOT NULL;`);
    await db.execute(sql`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "gst_rate_type" gst_rate_type DEFAULT 'exclusive' NOT NULL;`);
    
    console.log("Running credit_notes void migration...");
    await db.execute(sql`
      ALTER TABLE "credit_notes" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;
      ALTER TABLE "credit_notes" ADD COLUMN IF NOT EXISTS "voided_at" timestamp with time zone;
      ALTER TABLE "credit_notes" ADD COLUMN IF NOT EXISTS "voided_by" uuid REFERENCES "users"("id");
      ALTER TABLE "credit_notes" ADD COLUMN IF NOT EXISTS "void_reason" text;
      ALTER TABLE "credit_notes" ADD COLUMN IF NOT EXISTS "void_notes" text;
      CREATE INDEX IF NOT EXISTS "credit_notes_status_idx" ON "credit_notes" ("status");
    `);
    console.log("Migration successful.");
  } catch (err: any) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
  process.exit(0);
}

main();
