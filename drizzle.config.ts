import { defineConfig } from 'drizzle-kit';
process.loadEnvFile('.env.local');

export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Drizzle Kit migrations should use the UNPOOLED/direct connection string to avoid transaction issues with PgBouncer.
    // We fall back to DATABASE_URL if the unpooled variable isn't set.
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '',
  },
  strict: true,
  verbose: true,
});
