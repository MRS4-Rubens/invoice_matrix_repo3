export function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { body?: { message?: unknown }; message?: unknown };
    if (typeof e.body?.message === 'string' && e.body.message) return e.body.message;
    if (typeof e.message === 'string' && e.message) return e.message;
  }
  return fallback;
}
