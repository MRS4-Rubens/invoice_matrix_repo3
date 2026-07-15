import { sql } from 'drizzle-orm';
import { db } from './lib/db/client';

async function migrate() {
  try {
    console.log('Adding emailed_at to invoices...');
    await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS emailed_at timestamp with time zone;`);
    console.log('Adding email_send_count to invoices...');
    await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS email_send_count integer NOT NULL DEFAULT 0;`);
    console.log('Done!');
  } catch (err) {
    console.error('Error running migrations:', err);
  }
}

migrate();
