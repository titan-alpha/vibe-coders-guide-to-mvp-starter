/**
 * Server action for the admin Notifications tab — sends a new notification.
 *
 * Audience modes:
 *  - 'all'      → fan out to every active user (deactivatedAt IS NULL)
 *  - 'specific' → only the userIds provided in formData.getAll('userIds')
 *
 * Inserts one row in `notifications` plus one `notification_recipients` row
 * per recipient (so per-user read state is tracked).
 */

'use server';

import { isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { notifications, notificationRecipients, users } from '@/db/schema';
import { auth } from '@/lib/auth';

export async function sendNotificationAction(formData: FormData): Promise<void> {
  const session = await auth();
  const createdBy = session?.user?.email ?? session?.user?.id ?? 'admin';

  const subject = String(formData.get('subject') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const actionUrlRaw = String(formData.get('actionUrl') ?? '').trim();
  const actionUrl = actionUrlRaw.length > 0 ? actionUrlRaw : null;
  const audience = String(formData.get('audience') ?? 'all') === 'specific' ? 'specific' : 'all';

  if (!subject || !body) return;

  let recipientIds: string[] = [];
  if (audience === 'all') {
    const active = await db
      .select({ id: users.id })
      .from(users)
      .where(isNull(users.deactivatedAt));
    recipientIds = active.map((u) => u.id);
  } else {
    recipientIds = formData.getAll('userIds').map((v) => String(v)).filter(Boolean);
  }

  const id = crypto.randomUUID();
  await db.insert(notifications).values({
    id,
    subject,
    body,
    actionUrl,
    audience,
    createdBy,
  });

  if (recipientIds.length > 0) {
    await db.insert(notificationRecipients).values(
      recipientIds.map((userId) => ({ notificationId: id, userId })),
    );
  }

  revalidatePath('/admin/notifications');
}
