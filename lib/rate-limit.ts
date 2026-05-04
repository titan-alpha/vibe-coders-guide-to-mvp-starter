/**
 * Rate limits — Upstash Ratelimit with Vercel KV / Upstash Redis backing.
 *
 * Three dimensions per public endpoint (per SKILL.md security rule):
 * - per-IP: stop anonymous abuse
 * - per-user: cap individual users
 * - per-route global: backstop against viral spikes
 *
 * Wire into Route Handlers:
 *
 *   import { limiters, clientKey } from '@/lib/rate-limit';
 *
 *   export async function POST(req: Request) {
 *     const ip = await limiters.general.limit(clientKey(req));
 *     if (!ip.success) return Response.json({ error: 'rate_limited' }, { status: 429, headers: rateLimitHeaders(ip) });
 *     // ... handler
 *   }
 *
 * Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in .env.local. Without
 * them, the limiters fall back to in-memory (per-instance, fine for dev, bad
 * for serverless production — set the env vars before deploying).
 */

import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | undefined;
try {
  redis = Redis.fromEnv();
} catch {
  // Will throw at module load if env vars are missing; the limiters will
  // fall back to a process-local Map — fine for development.
  redis = undefined;
}

function makeLimiter(tokens: number, window: '1 m' | '1 h' | '1 d', prefix: string): Ratelimit {
  if (!redis) {
    // Process-local fallback (NOT for serverless production!)
    const buckets = new Map<string, { count: number; resetAt: number }>();
    const windowMs = window === '1 m' ? 60_000 : window === '1 h' ? 3_600_000 : 86_400_000;
    return {
      limit: async (key: string) => {
        const now = Date.now();
        const k = `${prefix}:${key}`;
        const b = buckets.get(k);
        if (!b || b.resetAt < now) {
          buckets.set(k, { count: 1, resetAt: now + windowMs });
          return { success: true, limit: tokens, remaining: tokens - 1, reset: now + windowMs, pending: Promise.resolve() };
        }
        b.count += 1;
        return { success: b.count <= tokens, limit: tokens, remaining: Math.max(0, tokens - b.count), reset: b.resetAt, pending: Promise.resolve() };
      },
    } as unknown as Ratelimit;
  }
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(tokens, window), prefix });
}

export const limiters = {
  auth: makeLimiter(10, '1 m', 'rl:auth'),
  aiPerUser: makeLimiter(30, '1 m', 'rl:ai-user'),
  aiGlobal: makeLimiter(1000, '1 m', 'rl:ai-global'),
  general: makeLimiter(60, '1 m', 'rl:general'),
};

export function clientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0].trim();
  return fwd ?? req.headers.get('x-real-ip') ?? 'anon';
}

export function rateLimitHeaders(r: { limit: number; remaining: number; reset: number }) {
  return {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(Math.ceil(r.reset / 1000)),
    'Retry-After': String(Math.ceil((r.reset - Date.now()) / 1000)),
  };
}
