import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const revalidate = 60;

export default async function ChangelogPage() {
  let content = '';
  try {
    content = await readFile(path.join(process.cwd(), 'CHANGELOG.md'), 'utf8');
  } catch {
    content = '# Changelog\n\nNo changelog yet.';
  }
  // Simple markdown-ish render: preserve as <pre>. Upgrade to a real
  // markdown renderer (next-mdx-remote / marked) when content gets heavier.
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold">What&apos;s new</h1>
      <pre className="mt-8 whitespace-pre-wrap font-sans text-base leading-relaxed">{content}</pre>
    </main>
  );
}

export const metadata = { title: "What's new — Vibe MVP", description: 'Recent updates.' };
