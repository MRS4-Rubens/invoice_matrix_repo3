'use server';

import { logError } from '@/lib/actions/_shared/logger';

export async function testServerAction() {
  try {
    throw new Error('This is a test Server Action error for Sentry verification');
  } catch (error) {
    logError('dev-sentry-test', error, { user: 'test' });
    throw error;
  }
}
