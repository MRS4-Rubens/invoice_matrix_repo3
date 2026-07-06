import { auth } from '@/lib/auth/server';

// REMINDER FOR FUTURE PHASES: this matcher is an explicit allowlist, not an auto-protect-everything rule. Any brand-new top-level page added under app/(app)/ or app/(admin)/ in a later phase must have its path prefix added to this array, or it will NOT be protected. This is a deliberate, documented trade-off — Neon Auth's middleware helper does not support a 'protect everything except public pages' mode.
export default auth.middleware({
  loginUrl: '/login',
});

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
