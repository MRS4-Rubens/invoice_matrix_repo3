// TODO (Phase 18): replace the console.error body above with Sentry's logger. Keep this function's name and signature (scope, error, meta) unchanged so no calling code anywhere else needs to be touched when that happens.
export function logError(scope: string, error: unknown, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(JSON.stringify({ timestamp, scope, message, stack, meta }, null, 2));
}
