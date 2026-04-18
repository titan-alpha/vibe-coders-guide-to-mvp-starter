# 04 · AI Integration

Goal: get the right AI capability into the product without lock-in or runaway cost. Most modern MVPs benefit from at least one AI feature; this skill makes that integration boring, typed, and cheap.

## DIALOGUE — figure out what kind of AI fits

Frame the choice for the user with three paths. Pick one based on their answer.

1. **"I want to brainstorm."** — Ask about their product, audience, and the friction points they want to remove. Then suggest 2&ndash;3 concrete AI features that would meaningfully improve the MVP &mdash; e.g., draft generation, classification, summarization, conversational assist, smart search, content moderation. Pick one to build in v1.
2. **"I already have an idea."** — Ask three things: what the AI does, what input it gets, what the user expects to see. Confirm scope is achievable in v1: one feature, one schema, one prompt.
3. **"You decide."** — Re-read `PROJECT.md` (audience, MVP slice). Propose the single AI feature you'd build and why. Confirm before building.

If the product genuinely doesn't need AI, say so plainly and move on. Don't bolt AI on for novelty &mdash; an MVP without AI is a perfectly good MVP.

## AUTONOMOUS — set up the templated stack

We standardize on **OpenAI** with **`gpt-5-nano`**, **reasoning effort `minimal`**, and **Zod-typed structured output**. This is the cheapest, fastest, and most reliable shape for MVP-grade AI features. You can swap models later; the helper makes that a one-line change.

### 1. Get the API key (DIALOGUE inside AUTONOMOUS)

Walk the user through it &mdash; this is their first time and they will not know:

- "Open https://platform.openai.com/api-keys"
- "Sign in (create an account if you haven't)."
- "Click **Create new secret key**. Give it a name tied to the project. Copy it now &mdash; you won't see it again. Paste it here."

Before asking, run `grep -q '^OPENAI_API_KEY=' .env.local 2>/dev/null && echo found`. If you already have one, skip.

Append to `.env.local`:
```
OPENAI_API_KEY=sk-...
```
Confirm `.env.local` is gitignored.

### 2. Install dependencies

```bash
npm install openai zod
```

### 3. Create the templated AI helper

Create `lib/ai.ts`. This is the **single entry point** for every AI call in the project. Don't let `import OpenAI from 'openai'` appear anywhere else &mdash; centralization makes the cost story easy to read.

```ts
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { z } from 'zod';

const client = new OpenAI();

export type Effort = 'minimal' | 'low' | 'medium' | 'high';

/**
 * Single AI call returning a typed, schema-validated payload.
 * Defaults: gpt-5-nano + reasoning effort 'minimal' for cost and latency.
 *
 * Use this for every AI call. Bump `model` and `effort` only when you have
 * measured nano + minimal and confirmed it isn't enough.
 */
export async function aiCall<S extends z.ZodTypeAny>(args: {
  schema: S;
  schemaName: string;
  instructions: string;
  input: string;
  model?: string;
  effort?: Effort;
}): Promise<z.infer<S>> {
  const res = await client.responses.parse({
    model: args.model ?? 'gpt-5-nano',
    reasoning: { effort: args.effort ?? 'minimal' },
    instructions: args.instructions,
    input: args.input,
    text: {
      format: zodTextFormat(args.schema, args.schemaName),
    },
  });

  if (!res.output_parsed) {
    throw new Error('aiCall returned no parsed output');
  }
  return res.output_parsed;
}
```

### 4. Build the chosen feature

Wire the feature with a Server Action or Route Handler. **Always** validate inbound user input with Zod before passing it into `aiCall`.

Example: classify free-form user feedback into a category.

```ts
// app/api/classify/route.ts
import { z } from 'zod';
import { aiCall } from '@/lib/ai';

const Input = z.object({ text: z.string().min(1).max(2000) });

const Classification = z.object({
  category: z.enum(['question', 'feedback', 'bug_report', 'other']),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json());
  if (!parsed.success) return new Response('bad input', { status: 400 });

  const result = await aiCall({
    schema: Classification,
    schemaName: 'classification',
    instructions:
      'Classify the user input. Be conservative with confidence; ' +
      'use "other" if you are not sure.',
    input: parsed.data.text,
  });

  return Response.json(result);
}
```

### 5. UI

Build the smallest UI that exposes the feature. Show a loading state. On error, show a useful message ("AI is unavailable, try again in a moment") &mdash; never a stack trace. If the feature is interactive (chat-like), use streaming via the Responses API stream variant; otherwise the simple parse pattern above is enough.

### 6. Cost & abuse guardrails

- Rate-limit any public-facing AI route per IP and per user (sub-skill 09 covers headers + rate limits).
- For features users could spam, require auth.
- Log token counts and model used. Even a single line per call helps the founder watch spend.

## Anti-patterns to avoid

- **Reaching for a bigger model first.** Try nano + minimal. Measure. Then escalate only if needed.
- **Free-form text outputs.** A Zod schema makes the feature reliable and the UI trivial. Use schemas everywhere.
- **A general chatbot when a single-purpose feature would serve users better.** If the user genuinely wants a chatbot, that's sub-skill 05 &mdash; don't conflate the two.
- **Hardcoded prompts buried in components.** Keep instructions in the route/action so they're versionable.

## Exit criteria

- `OPENAI_API_KEY` is in `.env.local` and gitignored.
- `lib/ai.ts` exists and is the single entry point for every AI call.
- One AI feature is wired end-to-end and the user has tried it on `localhost`.
- A `# AI` line in `PROJECT.md` records: which feature, which schema, expected per-call cost.

Move on to `05-chatbot.md`.
