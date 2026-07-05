import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

// Required for the Pool class to work in a Node.js runtime (e.g. Next.js server actions / API routes in Node runtime).
// Not needed in edge/browser contexts.
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

// Create a Pool using the POOLED connection string — the running app should use this one, not the unpooled one
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
