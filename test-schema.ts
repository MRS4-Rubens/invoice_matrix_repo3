import { db } from './lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const res = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'`);
    console.log("Columns:", res.rows.map((r: any) => r.column_name));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
main();
