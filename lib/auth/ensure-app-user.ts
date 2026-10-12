import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function ensureAppUser(input: {
  authUserId: string;
  displayName?: string | null;
  email?: string | null;
}) {
  try {
    // 1. Query db.users where auth_user_id = input.authUserId
    const existingUsers = await db.select().from(users).where(eq(users.auth_user_id, input.authUserId));
    
    // 2. If a row already exists, update email if previously missing, then return it
    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      if (input.email && !existing.email) {
        await db.update(users).set({ email: input.email }).where(eq(users.id, existing.id));
        existing.email = input.email;
      }
      return existing;
    }
    
    // 3. If no row exists, insert a new one
    const newUsers = await db.insert(users).values({
      auth_user_id: input.authUserId,
      email: input.email ?? null,
      role: 'owner',
      display_name: input.displayName ?? null,
      business_id: null
    }).returning();
    
    return newUsers[0];
  } catch (err) {
    // 4. Wrap the insert in try/catch and log the full error without rethrowing
    console.error('[ensureAppUser] Failed to link user:', err);
    return null; // The action will continue without breaking
  }
}
