'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { z } from 'zod';

/**
 * @deprecated Hard-deleting payment records is prohibited under MCA Rule 3 audit trail compliance and financial anti-fraud policies.
 * Use `voidPayment` from `@/lib/actions/payments/void-payment` instead.
 */
export const deletePayment = createAuthenticatedAction(
  z.object({ id: z.string().uuid() }),
  async () => {
    throw new ActionError(
      'Payment records cannot be hard deleted due to statutory audit trail requirements. Please void the payment instead.',
      { code: 'HARD_DELETE_PROHIBITED' }
    );
  },
  'delete-payment'
);
