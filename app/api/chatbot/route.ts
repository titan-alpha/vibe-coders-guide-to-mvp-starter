import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { aiCall } from '@/lib/ai';
import { features } from '@/lib/features';

/**
 * Chatbot endpoint — two-call pattern.
 *
 * 1. Extract keyword search terms from the user message (structured output).
 * 2. Search a build-time content index for the top 5 matches.
 * 3. Respond using the top matches as grounded context.
 *
 * Run `npm run build-search-index` before deploying. When no index exists
 * yet, the assistant responds with a graceful fallback message.
 */

type Doc = { url: string; title: string; body: string };

const indexPath = path.join(process.cwd(), 'public/search-index.json');
const docs: Doc[] = fs.existsSync(indexPath)
  ? (JSON.parse(fs.readFileSync(indexPath, 'utf8')) as Doc[])
  : [];

const QuerySchema = z.object({
  keywords: z.array(z.string().min(2).max(40)).min(1).max(8),
});

const ReplySchema = z.object({
  reply: z.string().min(1).max(2000),
});

const Body = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
});

function search(keywords: string[]): Doc[] {
  const ks = keywords.map((k) => k.toLowerCase());
  return docs
    .map((d) => {
      const hay = (d.title + ' ' + d.body).toLowerCase();
      const score = ks.reduce((a, k) => a + (hay.includes(k) ? 1 : 0), 0);
      return { ...d, score };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

const SYSTEM = `You are a helpful site navigation assistant.
Answer the user briefly using ONLY the provided pages. Cite pages as
markdown links like [Title](/url). If the pages don't answer the question,
say so honestly. Never invent URLs that aren't in the provided list.`;

export async function POST(req: Request) {
  if (!features.chatbot || !features.ai) {
    return NextResponse.json(
      { error: 'Chatbot is disabled.' },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
  }

  const userMsg =
    parsed.data.messages[parsed.data.messages.length - 1].content;

  if (docs.length === 0) {
    return NextResponse.json({
      reply:
        'I don\u2019t have a search index yet. Run `npm run build-search-index` to build one.',
    });
  }

  const { keywords } = await aiCall({
    schema: QuerySchema,
    schemaName: 'search_query',
    instructions:
      'Extract 2-6 lowercase keyword search terms that would find pages relevant to the user message. No stop words. No punctuation.',
    input: userMsg,
  });

  const hits = search(keywords);
  const context = hits.length
    ? hits
        .map((h) => `- [${h.title}](${h.url}): ${h.body.slice(0, 300)}`)
        .join('\n')
    : '(no matching pages)';

  const { reply } = await aiCall({
    schema: ReplySchema,
    schemaName: 'reply',
    instructions: SYSTEM,
    input: `User: ${userMsg}\n\nRelevant pages:\n${context}`,
  });

  return NextResponse.json({ reply });
}
