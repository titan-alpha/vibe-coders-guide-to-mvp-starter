/**
 * POST /api/notifications/mark-read
 * Body: { notificationId: string } | { all: true }
 *
 * Marks the current user's recipient row(s) as read. 401 when no session.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notificationRecipients } from '@/db/schema';

const Body = z.union([
  z.object({ notificationId: z.string().min(1) }),
  z.object({ all: z.literal(true) }),
]);

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const now = new Date();
  if ('all' in parsed.data) {
    await db
      .update(notificationRecipients)
      .set({ readAt: now })
      .where(
        and(
          eq(notificationRecipients.userId, userId),
          isNull(notificationRecipients.readAt),
        ),
      );
  } else {
    await db
      .update(notificationRecipients)
      .set({ readAt: now })
      .where(
        and(
          eq(notificationRecipients.userId, userId),
          eq(notificationRecipients.notificationId, parsed.data.notificationId),
        ),
      );
  }

  return NextResponse.json({ ok: true });
}
