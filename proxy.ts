import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

// REMINDER FOR FUTURE PHASES: this matcher is an explicit allowlist, not an auto-protect-everything rule. Any brand-new top-level page added under app/(app)/ or app/(admin)/ in a later phase must have its path prefix added to this array, or it will NOT be protected. This is a deliberate, documented trade-off — Neon Auth's middleware helper does not support a 'protect everything except public pages' mode.
const protectRoute = auth.middleware({ loginUrl: '/login' });

export default async function proxy(request: NextRequest) {
  // Server Action invocations (identified by the "next-action" header) are already
  // independently protected by createAuthenticatedAction's own session check
  // (see lib/actions/_shared/create-action.ts) inside the action itself. Running Neon
  // Auth's middleware AGAIN on these same requests causes it to rewrite the session
  // cookie mid-response, which corrupts the Server Action's response format and produces
  // "An unexpected response was received from the server" on the client. We deliberately
  // skip it here for this specific request type -- this does not weaken security, since
  // the action-level check still runs and still redirects/blocks unauthenticated access.
  if (request.headers.has('next-action')) {
    return NextResponse.next();
  }
  return protectRoute(request);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/invoices/:path*',
    '/customers/:path*',
    '/products/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
};
