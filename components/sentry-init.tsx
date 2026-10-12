'use client';

import { useEffect } from 'react';

// This component exists specifically to work around an issue where
// Next.js 16 + Turbopack does not reliably auto-load instrumentation-client.ts.
// It dynamically imports the client init to force Sentry initialization on mount.
// Do not remove this unless the Turbopack auto-import issue is officially resolved.
export function SentryInit() {
  useEffect(() => {
    import('../instrumentation-client');
  }, []);

  return null;
}
