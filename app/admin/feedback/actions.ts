/**
 * Server action for the Feedback admin tab — change a feedback row's status.
 *
 * Statuses: 'new' | 'seen' | 'resolved' | 'wontfix'.
 * Sets `resolvedAt` + `resolvedBy` when transitioning to a terminal state.
 */

'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { feedback } from '@/db/schema';
import { auth } from '@/lib/auth';

const ALLOWED_STATUSES = new Set(['new', 'seen', 'resolved', 'wontfix']);
const TERMINAL_STATUSES = new Set(['resolved', 'wontfix']);

export async function markStatusAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  if (!id || !ALLOWED_STATUSES.has(status)) return;

  const session = await auth();
  const actor = session?.user?.email ?? session?.user?.id ?? 'admin';

  const isTerminal = TERMINAL_STATUSES.has(status);

  await db
    .update(feedback)
    .set({
      status,
      resolvedAt: isTerminal ? new Date() : null,
      resolvedBy: isTerminal ? actor : null,
    })
    .where(eq(feedback.id, id));

  revalidatePath('/admin/feedback');
}
