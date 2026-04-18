/**
 * Build a simple content index for the chatbot (sub-skill 05-chatbot).
 *
 * Walks `app/` looking for page.tsx / page.mdx files, extracts a title + body
 * per route, and writes the result to `public/search-index.json`. The chatbot
 * API route reads that file at runtime.
 *
 * Run: `npm run build-search-index` (also runs automatically before `next build`
 * via the `prebuild` script if you add one).
 */

import fs from 'node:fs';
import path from 'node:path';

type Doc = { url: string; title: string; body: string };

function walk(dir: string, out: Doc[] = []): Doc[] {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // Skip api, route groups that Next.js hides, and private folders.
    if (entry.isDirectory()) {
      if (entry.name === 'api' || entry.name.startsWith('_')) continue;
      walk(full, out);
    } else if (entry.name === 'page.tsx' || entry.name === 'page.mdx') {
      const raw = fs.readFileSync(full, 'utf8');
      const rel = path.relative('app', dir);
      const url = '/' + rel.replace(/\\/g, '/').replace(/\([^)]+\)\/?/g, '');
      out.push({
        url: url === '/' ? '/' : url.replace(/\/$/, ''),
        title: titleFrom(raw, url),
        body: textFrom(raw).slice(0, 4000),
      });
    }
  }
  return out;
}

function titleFrom(raw: string, fallback: string): string {
  return (
    raw.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1]
    ?? raw.match(/title:\s*['"]([^'"]+)['"]/)?.[1]
    ?? fallback
  );
}

function textFrom(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/[{}`]/g, ' ')
    .replace(/\s+/g, ' ');
}

const docs = walk('app');
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync(
  path.join('public', 'search-index.json'),
  JSON.stringify(docs),
);
console.log(`Indexed ${docs.length} pages \u2192 public/search-index.json`);
