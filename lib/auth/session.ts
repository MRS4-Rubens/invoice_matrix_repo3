import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function requireSession() {
  const sessionResponse = await auth.getSession();
  if (!sessionResponse || !sessionResponse.data || !sessionResponse.data.user) {
    redirect('/login');
  }
  return sessionResponse.data;
}

// This function is how later phases (business profile, invoices, etc.) will get the current user's business_id and role.
export async function getCurrentAppUser() {
  const sessionData = await requireSession();
  const userRows = await db.select().from(users).where(eq(users.auth_user_id, sessionData.user.id));
  if (userRows.length === 0) {
    return null;
  }
  const appUser = userRows[0];
  if (!appUser.email && sessionData.user.email) {
    await db.update(users).set({ email: sessionData.user.email }).where(eq(users.id, appUser.id));
    appUser.email = sessionData.user.email;
  }
  return appUser;
}
