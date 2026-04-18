import { NextResponse } from 'next/server';
import { z } from 'zod';
import { aiCall } from '@/lib/ai';
import { features } from '@/lib/features';
import { track } from '@/lib/track';

/**
 * Demo AI endpoint — classifies a user message into a category.
 *
 * Replace with your actual AI feature in sub-skill 04-ai-integration.
 * Every AI call goes through `aiCall` (lib/ai.ts) for cost + schema consistency.
 */

const Input = z.object({
  text: z.string().min(1).max(2000),
});

const Classification = z.object({
  category: z.enum(['question', 'feedback', 'bug_report', 'other']),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export async function POST(req: Request) {
  if (!features.ai) {
    return NextResponse.json(
      { error: 'FEATURE_AI is disabled.' },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = Input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
  }

  const result = await aiCall({
    schema: Classification,
    schemaName: 'classification',
    instructions:
      'Classify the user input. Be conservative with confidence; use "other" if unsure.',
    input: parsed.data.text,
  });

  await track('ai_call', { endpoint: 'classify', category: result.category });

  return NextResponse.json(result);
}
