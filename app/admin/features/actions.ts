/**
 * Server actions for the admin Features tab.
 *
 * All three actions revalidate the page and bust the `feature-flags` cache
 * tag so changes show up everywhere within a request — `flag()` reads in
 * other routes will pick up the new value on their next call.
 */

'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath, revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { featureFlags } from '@/db/schema';

function bust() {
  revalidatePath('/admin/features');
  revalidateTag('feature-flags');
}

export async function setFlagAction(formData: FormData): Promise<void> {
  const key = String(formData.get('key') ?? '').trim();
  if (!key) return;
  const enabled = formData.get('enabled') === 'on' || formData.get('enabled') === 'true';
  const rolloutRaw = formData.get('rolloutPct');
  const rolloutPct = Math.max(
    0,
    Math.min(100, Number.parseInt(String(rolloutRaw ?? '100'), 10) || 0),
  );

  await db
    .update(featureFlags)
    .set({ enabled, rolloutPct, updatedAt: new Date() })
    .where(eq(featureFlags.key, key));

  bust();
}

export async function scheduleFlagAction(formData: FormData): Promise<void> {
  const key = String(formData.get('key') ?? '').trim();
  if (!key) return;
  const raw = String(formData.get('scheduledActivation') ?? '').trim();
  const scheduledActivation = raw ? new Date(raw) : null;

  await db
    .update(featureFlags)
    .set({ scheduledActivation, updatedAt: new Date() })
    .where(eq(featureFlags.key, key));

  bust();
}

export async function deleteFlagAction(formData: FormData): Promise<void> {
  const key = String(formData.get('key') ?? '').trim();
  if (!key) return;
  await db.delete(featureFlags).where(eq(featureFlags.key, key));
  bust();
}
