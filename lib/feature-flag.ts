/**
 * Feature flags — DB-backed runtime toggles.
 *
 * Per docs/modules.md, every optional surface reads its on/off state via
 * `flag(key, userId?)`. The flag() helper auto-registers unknown keys so
 * adding new code that calls `flag('foo')` won't crash — the row appears in
 * the feature_flags table with `enabled: false` and the founder can flip it
 * on at runtime via /admin/features.
 *
 * Reads are cached for 30 seconds via unstable_cache; admin toggles invalidate
 * via revalidateTag('feature-flags'). So a flag flip propagates within ~30s
 * across all users without restart.
 */

import 'server-only';
import { unstable_cache } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { featureFlags } from '@/db/schema';

const getFlagRow = unstable_cache(
  async (key: string) => {
    try {
      const [row] = await db.select().from(featureFlags).where(eq(featureFlags.key, key));
      return row ?? null;
    } catch (err) {
      // Migrations not run yet (e.g. fresh `next build` against an empty DB).
      // Treat every flag as off so the build can prerender; founder runs
      // `npm run db:migrate` + `npm run setup-flags` before first deploy.
      if (isMissingTable(err)) return null;
      throw err;
    }
  },
  ['feature-flag'],
  { revalidate: 30, tags: ['feature-flags'] },
);

function isMissingTable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /no such table|does not exist/i.test(msg);
}

/**
 * Check whether a feature is enabled for a given user.
 *
 * Auto-registers the flag on first call so it appears in the admin Features tab.
 * Per-user rollout uses a stable hash so the same user gets a consistent answer.
 */
export async function flag(key: string, userId?: string | null, description?: string): Promise<boolean> {
  const row = await getFlagRow(key);
  if (!row) {
    try {
      await db
        .insert(featureFlags)
        .values({
          key,
          enabled: false,
          rolloutPct: 100,
          description: description ?? `Auto-registered on first flag() call`,
        })
        .onConflictDoNothing();
    } catch (err) {
      if (!isMissingTable(err)) throw err;
    }
    return false;
  }
  if (!row.enabled) return false;
  // Scheduled activation hasn't arrived yet → off until then.
  if (row.scheduledActivation && row.scheduledActivation.getTime() > Date.now()) return false;
  if (row.rolloutPct >= 100) return true;
  if (row.rolloutPct <= 0) return false;
  if (!userId) return Math.random() * 100 < row.rolloutPct;
  const hash = simpleHash(`${key}:${userId}`) % 100;
  return hash < row.rolloutPct;
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Convenience: check multiple flags at once. Returns a record of key → enabled.
 * Used by the admin layout to decide which tabs to show.
 */
export async function flags(...keys: string[]): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  await Promise.all(keys.map(async (k) => { result[k] = await flag(k); }));
  return result;
}
