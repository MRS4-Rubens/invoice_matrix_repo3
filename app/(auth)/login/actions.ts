'use server'

import { auth } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

import { ensureAppUser } from '@/lib/auth/ensure-app-user'
import { headers } from 'next/headers'
import { authLimiter, checkRateLimit, getClientIp } from '@/lib/rate-limit/upstash'

export async function loginAction(prevState: any, formData: FormData) {
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
        displayName: null
      });
    }
  } catch (err: any) {
    return { error: err.body?.message || err.message || 'An unexpected error occurred during login' };
  }
  
  redirect('/dashboard');
}
