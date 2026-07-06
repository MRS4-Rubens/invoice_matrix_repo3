import { z } from 'zod';
import { ActionResult } from './types';
import { ActionError } from './errors';
import { logError } from './logger';
import { getCurrentAppUser } from '@/lib/auth/session';
import { users } from '@/lib/db/schema';

type AppUser = typeof users.$inferSelect;

const GENERIC_ERROR_MESSAGE = 'Something went wrong on our end. Please try again, and contact support if the problem continues.';

async function runValidatedHandler<TSchema extends z.ZodTypeAny, TOutput, TContext>(
  schema: TSchema,
  rawInput: unknown,
  scopeName: string,
  resolveContext: () => Promise<TContext>,
  handler: (parsedData: z.infer<TSchema>, context: TContext) => Promise<TOutput>
): Promise<ActionResult<TOutput>> {
  const parseResult = schema.safeParse(rawInput);

  if (!parseResult.success) {
    const flattened = z.flattenError(parseResult.error);
    return {
      success: false,
      error: {
        message: 'Please check the highlighted fields and try again.',
        code: 'VALIDATION_ERROR',
        fieldErrors: flattened.fieldErrors,
      },
    };
  }

  try {
    const context = await resolveContext();
    const result = await handler(parseResult.data, context);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ActionError) {
      logError(scopeName, error, { code: error.code, expected: true });
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          fieldErrors: error.fieldErrors,
        },
      };
    }

    logError(scopeName, error, { expected: false });
    return {
      success: false,
      error: { message: GENERIC_ERROR_MESSAGE, code: 'INTERNAL_ERROR' },
    };
  }
}

export function createAction<TSchema extends z.ZodTypeAny, TOutput>(
  schema: TSchema,
  handler: (parsedData: z.infer<TSchema>, context: undefined) => Promise<TOutput>,
  scopeName: string
) {
  return async (rawInput: unknown): Promise<ActionResult<TOutput>> => {
    return runValidatedHandler(schema, rawInput, scopeName, async () => undefined, handler);
  };
}

export function createAuthenticatedAction<TSchema extends z.ZodTypeAny, TOutput>(
  schema: TSchema,
  handler: (parsedData: z.infer<TSchema>, context: { appUser: AppUser }) => Promise<TOutput>,
  scopeName: string
) {
  return async (rawInput: unknown): Promise<ActionResult<TOutput>> => {
    return runValidatedHandler(schema, rawInput, scopeName, async () => {
      const appUser = await getCurrentAppUser();
      if (!appUser) {
        throw new ActionError('We could not find your account details. Please try logging out and back in.', { code: 'NO_APP_USER' });
      }
      return { appUser };
    }, handler);
  };
}
