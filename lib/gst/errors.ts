/**
 * A dedicated, lightweight error type for this module, kept separate from 
 * lib/actions/_shared/errors.ts's ActionError so lib/gst/ has zero dependency 
 * on the rest of the app and can be unit-tested (Phase 19) in complete isolation.
 */
export class GstCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GstCalculationError';
  }
}
