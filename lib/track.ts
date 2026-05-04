/**
 * Analytics event helper.
 *
 * Records events to the `events` table when FEATURE_ANALYTICS=true + DB is
 * configured. Otherwise logs to the server console in dev, no-ops in prod.
 *
 * Keep call sites minimal: track('signup') or track('ai_call', { tokens, cost }).
 */

import 'server-only';
import { randomUUID } from 'node:crypto';
import { features } from '@/lib/features';

type Properties = Record<string, string | number | boolean | null>;

export async function track(name: string, properties?: Properties): Promise<void> {
  if (!features.analytics) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[track] ${name}`, properties ?? {});
    }
    return;
  }

  try {
    const { db } = await import('@/lib/db');
    const { events } = await import('@/db/schema');
    await db.insert(events).values({
      id: randomUUID(),
      name,
      properties: properties ? (properties as unknown as string) : null,
    });
  } catch (err) {
    // Never let telemetry break the request path.
    console.error('[track] failed to record event', name, err);
  }
}
