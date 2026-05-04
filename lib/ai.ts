/**
 * OpenAI helper — single entry point for every AI call.
 *
 * Defaults to gpt-5-nano + reasoning effort 'minimal' + Zod-typed structured output.
 * Keep `import OpenAI from 'openai'` in this file only. Centralization makes cost
 * visibility and model swaps trivial.
 *
 * Enabled when FEATURE_AI=true. Fails loudly if OPENAI_API_KEY is missing.
 */

import 'server-only';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { z } from 'zod';
import { features, requireEnv } from '@/lib/features';

let clientCache: OpenAI | null = null;

function client(): OpenAI {
  if (!features.ai) {
    throw new Error(
      'FEATURE_AI is disabled. Enable it in .env.local to make AI calls.',
    );
  }
  if (!clientCache) {
    clientCache = new OpenAI({
      apiKey: requireEnv('OPENAI_API_KEY', 'ai'),
    });
  }
  return clientCache;
}

export type Effort = 'minimal' | 'low' | 'medium' | 'high';

/**
 * Run a single AI call with a typed, schema-validated payload.
 *
 * @example
 *   const Classification = z.object({
 *     category: z.enum(['question', 'feedback', 'bug']),
 *     confidence: z.number().min(0).max(1),
 *   });
 *   const result = await aiCall({
 *     schema: Classification,
 *     schemaName: 'classification',
 *     instructions: 'Classify the user input.',
 *     input: userMessage,
 *   });
 */
export async function aiCall<S extends z.ZodTypeAny>(args: {
  schema: S;
  schemaName: string;
  instructions: string;
  input: string;
  model?: string;
  effort?: Effort;
}): Promise<z.infer<S>> {
  const res = await client().responses.parse({
    model: args.model ?? process.env.OPENAI_MODEL ?? 'gpt-5-nano',
    // 'minimal' is supported by gpt-5 family but not yet typed in the SDK.
    reasoning: { effort: (args.effort ?? 'minimal') as 'low' | 'medium' | 'high' },
    instructions: args.instructions,
    input: args.input,
    text: { format: zodTextFormat(args.schema, args.schemaName) },
  });

  if (!res.output_parsed) {
    throw new Error('aiCall returned no parsed output');
  }
  return res.output_parsed;
}
