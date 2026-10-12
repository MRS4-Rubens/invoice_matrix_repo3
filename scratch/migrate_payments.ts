import { db } from '../lib/db/client';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Running payments table migration...');
  await db.execute(sql`
    ALTER TABLE payments 
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS voided_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS void_reason text,
    ADD COLUMN IF NOT EXISTS void_notes text;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
  `);

  console.log('Migration completed successfully!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
