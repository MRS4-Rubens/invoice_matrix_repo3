// Throw this class specifically for expected, safe-to-show business errors (e.g. 'This invoice is already finalized').
// Its .message is shown to the user VERBATIM. Any other thrown error (a plain Error, a database error, a bug)
// is treated as unexpected and NEVER shown verbatim — see create-action.ts.
export class ActionError extends Error {
  code: string;
  fieldErrors?: Record<string, string[] | undefined>;
  constructor(message: string, options?: { code?: string; fieldErrors?: Record<string, string[] | undefined> }) {
    super(message);
    this.name = 'ActionError';
    this.code = options?.code ?? 'ACTION_ERROR';
    this.fieldErrors = options?.fieldErrors;
  }
}
