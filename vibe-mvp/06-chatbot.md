# 06 · Chatbot

Goal: optionally add a persistent AI navigation assistant to the bottom-right of the site. It helps users find what they need by searching the site's content and answering with hyperlinks. Strictly opt-in &mdash; many MVPs don't need it.

## DIALOGUE — does the product want one?

Ask the user, plainly:

- *"Want to add an AI chatbot in the bottom-right of the site? It's a navigation assistant that can answer user questions about your app and link them to the right pages. It uses `gpt-5-nano`, so cost is negligible."*

If **no**, skip this skill and move on to `06-admin-dashboard.md`. (You can revisit post-MVP.)

If **yes**, confirm two things:

- *"Should it answer for everyone, or only authenticated users?"*
- *"Anything off-limits? (e.g., 'don't discuss pricing', 'don't make up features that don't exist')"*

Carry the answers into the assistant's instructions in step 3 below.

## AUTONOMOUS — build it

The chatbot has three parts:
1. A **content index** of the site (built at build time).
2. A **chat UI** in the root layout that persists across navigation.
3. A **server endpoint** that uses `gpt-5-nano` twice &mdash; once to extract a search query, once to answer using the top 5 hits as context.

This skill assumes sub-skill 04 (`lib/ai.ts`) is already in place. If it isn't, do that first.

### 1. Build a content index

Scan wherever the site's content lives &mdash; `app/` for App Router pages, `content/`, `posts/`, MDX, etc. Adapt the walker to the actual project layout.

```ts
// scripts/build-search-index.ts
import fs from 'node:fs';
import path from 'node:path';

type Doc = { url: string; title: string; body: string };

function walk(dir: string, out: Doc[] = []): Doc[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('_') && entry.name !== 'api') {
      walk(full, out);
    } else if (entry.name === 'page.tsx' || entry.name === 'page.mdx') {
      const raw = fs.readFileSync(full, 'utf8');
      const url = '/' + path.relative('app', dir).replace(/\\/g, '/');
      out.push({
        url: url === '/' ? '/' : url,
        title: titleFrom(raw, url),
        body: textFrom(raw).slice(0, 4000),
      });
    }
  }
  return out;
}

function titleFrom(raw: string, fallback: string) {
  return raw.match(/<h1[^>]*>([^<]+)/)?.[1]
      ?? raw.match(/title:\s*['"]([^'"]+)['"]/)?.[1]
      ?? fallback;
}
function textFrom(s: string) {
  return s.replace(/<[^>]+>/g, ' ').replace(/[{}`]/g, ' ').replace(/\s+/g, ' ');
}

const docs = walk('app');
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/search-index.json', JSON.stringify(docs));
console.log(`Indexed ${docs.length} pages.`);
```

Wire it into the build:

```jsonc
// package.json
{
  "scripts": {
    "prebuild": "tsx scripts/build-search-index.ts",
    "build": "next build"
  }
}
```

For an MVP, a substring/keyword scan is fine. If the site has more than ~200 pages, swap in `flexsearch` or a vector index later.

### 2. Chatbot UI (persists across navigation)

Mount the chatbot **outside** `{children}` in the root layout. In the App Router, the root layout doesn't unmount across navigation, so the component &mdash; and its message state &mdash; survive route changes naturally.

```tsx
// components/Chatbot.tsx
'use client';

import { useEffect, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Persist open state across reloads.
  useEffect(() => {
    setOpen(localStorage.getItem('chatbot.open') === '1');
  }, []);
  useEffect(() => {
    localStorage.setItem('chatbot.open', open ? '1' : '0');
  }, [open]);

  async function send() {
    if (!input.trim() || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: input }];
    setMessages(next); setInput(''); setLoading(true);
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({ messages: next }),
      });
      const { reply } = await res.json();
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Sorry, something went wrong. Try again?' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="w-80 sm:w-96 h-[28rem] flex flex-col rounded-2xl border border-base-300 bg-base-100 shadow-2xl">
          <div className="flex justify-between items-center p-3 border-b border-base-300">
            <strong>Assistant</strong>
            <button onClick={() => setOpen(false)} aria-label="Close" className="btn btn-ghost btn-sm">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <div
                  className={`inline-block max-w-[85%] rounded-xl px-3 py-2 ${
                    m.role === 'user' ? 'bg-primary text-primary-content' : 'bg-base-200'
                  }`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownLinks(m.content) }}
                />
              </div>
            ))}
            {loading && <div className="opacity-60 text-sm">Thinking…</div>}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); void send(); }}
            className="p-3 border-t border-base-300 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="input input-bordered flex-1"
              placeholder="Ask anything…"
              aria-label="Message"
            />
            <button className="btn btn-primary" disabled={loading}>Send</button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="btn btn-primary btn-circle btn-lg shadow-xl"
          aria-label="Open assistant"
        >💬</button>
      )}
    </div>
  );
}

// Render only [text](url) markdown links. Escape everything else.
function renderMarkdownLinks(s: string) {
  const escaped = s.replace(/[<>&]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;'
  );
  return escaped.replace(
    /\[([^\]]+)\]\((\/[^)\s]*)\)/g,
    (_, text, url) => `<a href="${url}" class="link link-primary">${text}</a>`
  );
}
```

Note the link regex only allows internal URLs starting with `/` &mdash; this prevents the model from emitting outbound links the user didn't ask for. If you want to allow external links, expand the regex but use a sanitizer (`isomorphic-dompurify`) on the assistant output.

Mount in the root layout:

```tsx
// app/layout.tsx
import { Chatbot } from '@/components/Chatbot';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
```

### 3. Two-call server endpoint

```ts
// app/api/chatbot/route.ts
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { aiCall } from '@/lib/ai';

type Doc = { url: string; title: string; body: string };

const indexPath = path.join(process.cwd(), 'public/search-index.json');
const docs: Doc[] = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

const QuerySchema = z.object({
  keywords: z.array(z.string().min(2).max(40)).min(1).max(8),
});

const ReplySchema = z.object({
  reply: z.string().min(1).max(2000),
});

const Body = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(2000),
  })).min(1).max(20),
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
say so honestly and suggest what the user might search for instead.
Never invent URLs that aren't in the provided list.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('bad input', { status: 400 });

  const userMsg = parsed.data.messages[parsed.data.messages.length - 1].content;

  // Call 1: extract keywords for site search.
  const { keywords } = await aiCall({
    schema: QuerySchema,
    schemaName: 'search_query',
    instructions:
      'Extract 2-6 lowercase keyword search terms that would find pages relevant ' +
      'to the user message. No stop words. No punctuation.',
    input: userMsg,
  });

  const hits = search(keywords);
  const context = hits.length
    ? hits.map((h) => `- [${h.title}](${h.url}): ${h.body.slice(0, 300)}`).join('\n')
    : '(no matching pages)';

  // Call 2: respond using the top hits as context.
  const { reply } = await aiCall({
    schema: ReplySchema,
    schemaName: 'reply',
    instructions: SYSTEM,
    input: `User: ${userMsg}\n\nRelevant pages:\n${context}`,
  });

  return Response.json({ reply });
}
```

### 4. Rate limit and gate (if applicable)

- Wrap the route in a per-IP rate limit (5 messages / minute is generous for an MVP).
- If the user said "auth-only" in the dialogue, check `auth()` at the top and return 401 otherwise.
- Add a hard ceiling on token usage per session if you're worried about cost (`gpt-5-nano` is cheap, but log token counts anyway).

## Anti-patterns to avoid

- **Sending the entire site as context.** Search first, send the top 5 only &mdash; that's how this stays cheap.
- **Letting the assistant invent URLs.** Pin it strictly to the pages you found. The link-render regex above enforces this on the client side too.
- **Storing chat history server-side without consent.** For v1, in-memory per-tab is plenty.
- **Using `dangerouslySetInnerHTML` without sanitization.** The escape + narrow regex above is the minimum bar; switch to DOMPurify if you ever broaden the allowed HTML.

## Exit criteria

- The chatbot toggles from the bottom-right and survives navigation between routes.
- Open state persists across page reloads (localStorage).
- A test query returns a useful answer with at least one valid internal hyperlink.
- A `# Chatbot` line in `PROJECT.md` notes which content is indexed and the per-message cost ceiling.

Move on to `07-admin-dashboard.md`.
