'use server'

import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

import { ensureAppUser } from '@/lib/auth/ensure-app-user'
import { headers } from 'next/headers'
import { authLimiter, checkRateLimit, getClientIp } from '@/lib/rate-limit/upstash'
import { getErrorMessage } from '@/lib/auth/get-error-message'

export async function loginAction(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  if (!email || !password) {
    return { error: 'Please enter both email and password.' };
  }

  const ip = getClientIp(await headers());
  const { allowed } = await checkRateLimit(authLimiter, `auth:${ip}`);
  if (!allowed) {
    return { error: 'Too many attempts. Please wait a moment and try again.' };
  }
  
  try {
    const signInResponse = await auth.signIn.email({ email, password });
    
    if (signInResponse && signInResponse.error) {
       return { error: signInResponse.error.message || 'Invalid credentials' };
    }

    if (signInResponse && signInResponse.data && signInResponse.data.user) {
      await ensureAppUser({
        authUserId: signInResponse.data.user.id,
        displayName: signInResponse.data.user.name || null,
        email: signInResponse.data.user.email || email,
      });
    }
  } catch (err) {
    return { error: getErrorMessage(err, 'An unexpected error occurred during login') };
  }
  
  redirect('/dashboard');
}
