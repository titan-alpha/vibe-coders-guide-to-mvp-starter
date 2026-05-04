/**
 * GET /api/notifications/recent?limit=10 → { items: [...] }
 *
 * Most recent notifications addressed to the current user, joined with the
 * notification body so the bell dropdown can render in one round-trip.
 * 401 when no session.
 */

import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notifications, notificationRecipients } from '@/db/schema';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(MAX_LIMIT, rawLimit))
    : DEFAULT_LIMIT;

  const items = await db
    .select({
      id: notifications.id,
      subject: notifications.subject,
      body: notifications.body,
      actionUrl: notifications.actionUrl,
      createdAt: notifications.createdAt,
      readAt: notificationRecipients.readAt,
    })
    .from(notificationRecipients)
    .innerJoin(notifications, eq(notifications.id, notificationRecipients.notificationId))
    .where(eq(notificationRecipients.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return NextResponse.json({ items });
}
