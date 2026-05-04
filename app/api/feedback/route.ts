/**
 * POST /api/feedback
 *
 * Accepts user feedback from the in-app FeedbackModal. Rate-limited per IP
 * via `limiters.general`. Auth is optional — anonymous feedback is allowed
 * (userId is nullable on the column). When the user is signed in, the row
 * is associated with their account.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { feedback } from '@/db/schema';
import { auth } from '@/lib/auth';
import { limiters, clientKey, rateLimitHeaders } from '@/lib/rate-limit';
import { logFor } from '@/lib/log';

const Body = z.object({
  surface: z.string().min(1).max(80),
  category: z.enum(['bug', 'idea', 'praise', 'other']),
  body: z.string().min(10).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
  contextUrl: z.string().url().max(2000).optional(),
});

function readBody(form: FormData | null, json: unknown): unknown {
  if (form) {
    const ratingRaw = form.get('rating');
    const obj: Record<string, unknown> = {
      surface: form.get('surface') ?? undefined,
      category: form.get('category') ?? undefined,
      body: form.get('body') ?? undefined,
      contextUrl: form.get('contextUrl') ?? undefined,
    };
    if (ratingRaw != null && String(ratingRaw).length > 0) {
      const n = Number.parseInt(String(ratingRaw), 10);
      if (Number.isFinite(n)) obj.rating = n;
    }
    // Strip empty-string optionals so zod's .optional() works.
    if (obj.contextUrl === '') delete obj.contextUrl;
    return obj;
  }
  return json;
}

export async function POST(req: Request) {
  const rl = await limiters.general.limit(clientKey(req));
  if (!rl.success) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const reqLog = logFor(req, userId);

  const contentType = req.headers.get('content-type') ?? '';
  let raw: unknown;
  if (contentType.includes('application/json')) {
    raw = await req.json().catch(() => null);
    raw = readBody(null, raw);
  } else {
    const form = await req.formData().catch(() => null);
    raw = readBody(form, null);
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  await db.insert(feedback).values({
    id,
    userId,
    surface: parsed.data.surface,
    category: parsed.data.category,
    body: parsed.data.body,
    rating: parsed.data.rating ?? null,
    contextUrl: parsed.data.contextUrl ?? null,
  });

  reqLog.info({ event: 'feedback.created', id, category: parsed.data.category });

  return NextResponse.json({ ok: true });
}
