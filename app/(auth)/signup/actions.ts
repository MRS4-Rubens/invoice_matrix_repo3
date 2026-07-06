'use server'

import { auth } from '@/lib/auth/server'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { redirect } from 'next/navigation'

import { ensureAppUser } from '@/lib/auth/ensure-app-user'

export async function signupAction(prevState: any, formData: FormData) {
  const name = formData.get('ownerName') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  
  if (!name || !email || !password || !confirmPassword) {
    return { error: 'Please fill in all required fields.' };
  }
  
  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }
  
  try {
    const signUpResponse = await auth.signUp.email({ email, password, name });
    
    // Better Auth (which Neon Auth wraps) usually returns data/error or throws.
    // We check for error property just in case.
    if (signUpResponse && signUpResponse.error) {
       return { error: signUpResponse.error.message || 'Signup failed' };
    }

    if (signUpResponse && signUpResponse.data && signUpResponse.data.user) {
      await ensureAppUser({
        authUserId: signUpResponse.data.user.id,
        displayName: name
      });
    }
  } catch (err: any) {
    return { error: err.body?.message || err.message || 'An unexpected error occurred during signup' };
  }
  
  redirect('/dashboard');
}
