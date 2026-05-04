/**
 * GET /api/notifications/unread-count → { count }
 *
 * Returns how many notifications the current user has not yet read.
 * 401 when no session.
 */

import { NextResponse } from 'next/server';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notificationRecipients } from '@/db/schema';

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationRecipients)
    .where(
      and(
        eq(notificationRecipients.userId, userId),
        isNull(notificationRecipients.readAt),
      ),
    );

  return NextResponse.json({ count: row?.count ?? 0 });
}
