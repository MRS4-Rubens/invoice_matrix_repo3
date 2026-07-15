import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// 1. Ensure required environment variables exist at startup
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Missing Upstash Redis environment variables: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set.');
}

// 2. Create the Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * All three limiters share one Redis instance but use independent prefixes/windows — 
 * tune the numeric limits here centrally if they prove too strict or too loose in real use; 
 * nothing else needs to change.
 */

// 3. Create the Ratelimit instances

// authLimiter: 5 requests per 60 seconds (for login/signup attempts)
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  prefix: '@upstash/ratelimit:auth',
});

// sensitiveActionLimiter: 20 requests per 60 seconds (for finalizing invoices, sending emails, recording payments)
export const sensitiveActionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '60 s'),
  prefix: '@upstash/ratelimit:sensitive',
});

// exportLimiter: 10 requests per 300 seconds (for Excel export and the archival-render route — heavier operations)
export const exportLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '300 s'),
  prefix: '@upstash/ratelimit:export',
});

/**
 * Helper to check rate limit and return retry-after in seconds
 */
export async function checkRateLimit(limiter: Ratelimit, identifier: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const { success, reset } = await limiter.limit(identifier);
  
  // Calculate how many seconds until the window resets
  const now = Date.now();
  const retryAfterSeconds = Math.max(1, Math.ceil((reset - now) / 1000));
  
  return {
    allowed: success,
    retryAfterSeconds,
  };
}

/**
 * Extracts the real client IP from the 'x-forwarded-for' header.
 * Falls back to 'unknown' if absent, never throws.
 */
export function getClientIp(headersList: Headers): string {
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    // Vercel appends proxy IPs after the real one, so we take the first address
    const ips = forwardedFor.split(',');
    return ips[0].trim();
  }
  return 'unknown';
}
