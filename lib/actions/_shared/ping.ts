'use server';

// This file is a living reference example for Phase 4's Server Action convention. It is not wired into any real product feature. Every future domain action (customers, products, invoices, etc.) should follow this exact same pattern — see ARCHITECTURE.md for the full explanation.

import { z } from 'zod';
import { createAction, createAuthenticatedAction } from './create-action';
import { ActionError } from './errors';

const pingSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(200, 'Message must be 200 characters or fewer'),
  forceError: z.enum(['none', 'business', 'system']).default('none'),
});

export const pingAction = createAction(pingSchema, async (input) => {
  if (input.forceError === 'business') {
    throw new ActionError(`This is a deliberate, safe business error for testing: you asked for "${input.message}" to fail.`, { code: 'DEMO_BUSINESS_ERROR' });
  }
  if (input.forceError === 'system') {
    throw new Error('This is a deliberate unhandled system error for testing — it must NEVER reach the user with this exact text.');
  }
  return { reply: `pong: ${input.message}`, timestamp: new Date().toISOString() };
}, 'ping');

export const pingAuthenticatedAction = createAuthenticatedAction(pingSchema, async (input, context) => {
  return { reply: `pong (authenticated as role: ${context.appUser.role}): ${input.message}`, timestamp: new Date().toISOString() };
}, 'ping-authenticated');
