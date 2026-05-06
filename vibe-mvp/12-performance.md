# 12 · Performance

Goal: Lighthouse ≥ 90 on Performance, Accessibility, Best Practices, and SEO. The MVP loads fast on a mid-tier phone on 4G.

## AUTONOMOUS — measure, fix, re-measure

### 1. Build and serve a production bundle

```bash
npm run build && npm run start
```
Open the landing route and run Lighthouse in Chrome DevTools (Application > Lighthouse > "Mobile" + "Performance, Accessibility, Best Practices, SEO"). Record the four scores.

### 2. Common fixes (apply only what's needed)

- **Images.** Use `next/image` for everything. Provide `width`/`height` to avoid layout shift. Convert hero images to AVIF or WebP. Cap hero image to 200KB.
- **Fonts.** Use `next/font` to self-host. Load only the weights you actually use.
- **JavaScript.** Audit imports. A single `lodash` import in a Client Component can add 70KB. Use `lodash-es` named imports or replace with native.
- **Client vs Server Components.** Default to Server Components. Only mark `"use client"` for components that need browser APIs or interactivity.
- **Third-party scripts.** Defer or remove. No analytics in v1 unless the user specifically asked. If they did, use Vercel Analytics — it's free and one line.
- **Database calls.** Cache static or semi-static data with `unstable_cache` or route-segment `revalidate`. Don't refetch on every request.

### 3. Perceived performance

- Add a `loading.tsx` for slow routes — even a simple skeleton beats blank.
- Use `<Suspense>` to stream content as it becomes ready.
- Show optimistic UI for form submissions where you can.

### 4. Re-measure

Re-run Lighthouse. If any score is below 90, fix the highest-impact opportunity and re-run. Don't chase 100s — 90+ is the bar for MVP.

## AUTONOMOUS — SEO surface (full pre-launch checklist)

Lighthouse SEO score is a starting point, not a strategy. The agent walks a structured SEO setup so the product is findable from day one.

### 1. Per-route metadata

For every route the agent ships, ensure `<title>` + `<meta name="description">` are set explicitly. Next.js App Router supports per-route `metadata` exports:

```ts
// app/page.tsx
export const metadata = {
  title: '<Product> — <one-line value prop>',
  description: '<one to two sentences, max 155 chars, includes the audience and the differentiator>',
  openGraph: {
    title: '<same as title or marketing variant>',
    description: '<same as meta description or marketing variant>',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', images: ['/og-default.png'] },
  alternates: { canonical: 'https://<domain>/' },
};
```

The agent generates content-tailored title + description per route from `PROJECT.md` (positioning statement) and the route's purpose. For dynamic routes (`/recipes/[slug]`), use `generateMetadata` to pull from the DB.

**OG images**: ship a default `public/og-default.png` (1200×630) generated from the logo + product name in the brand display font. For content routes, generate per-page OG images via `next/og`.

### 2. Schema.org JSON-LD structured data

Add JSON-LD blocks for every route type that has a Schema.org match. Common ones:

- `Organization` schema on landing — name, URL, logo, sameAs (social links).
- `WebSite` schema with `potentialAction` for site search (lets Google show a search box in results).
- `BreadcrumbList` for any nested page.
- `Article` for blog posts (headline, datePublished, author, image).
- `Product` for SaaS landing (name, description, brand, offers).
- `FAQPage` for the FAQ route.
- `Recipe`, `Event`, `Course`, etc. — use the relevant Schema.org type if the content matches.

Implementation:

```tsx
// components/JsonLd.tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

// app/page.tsx — example
<JsonLd data={{
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Recipe Garden',
  url: 'https://recipegarden.com',
  logo: 'https://recipegarden.com/favicon.svg',
}} />
```

Verify with Google's Rich Results Test (https://search.google.com/test/rich-results) before declaring done.

### 3. sitemap.xml + robots.txt

Both are non-negotiable. Generate at build time:

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes = ['', '/about', '/faq', '/terms', '/privacy'].map(p => ({
    url: `https://<domain>${p}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: p === '' ? 1.0 : 0.6,
  }));
  // Dynamic routes from DB (e.g., recipes, blog posts)
  // const recipes = await db.select().from(...);
  // const dynamic = recipes.map(r => ({ url: `https://<domain>/recipes/${r.slug}`, lastModified: r.updatedAt }));
  return [...staticRoutes /* , ...dynamic */];
}

// app/robots.ts
import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/settings'] },
    ],
    sitemap: 'https://<domain>/sitemap.xml',
    host: 'https://<domain>',
  };
}
```

### 4. `llms.txt` + `AGENTS.txt` — the modern SEO surface for AI agents

A new convention emerging in 2025-2026: AI agents (search summarizers, research agents, coding agents) read special files at the root of a domain to understand the site's structure and what to surface. The agent ships both:

**`public/llms.txt`** — a markdown file describing the site for LLM crawlers. Format ([llmstxt.org](https://llmstxt.org/) spec):

```markdown
# Recipe Garden

> 500 well-tested recipes for casual home cooks who want results, not life stories.

Recipe Garden is a recipe app for casual home cooks 25-45 who want clean recipes without scrolling past blog content. Free to use; no signup required to browse.

## Recipes
- [Roast Chicken with Rosemary](https://recipegarden.com/recipes/roast-chicken-rosemary): A simple roast chicken recipe — 45 minutes, 6 ingredients.
- [Lentil Soup](https://recipegarden.com/recipes/lentil-soup): One-pot lentil soup, 30 minutes.

## About
- [Our Story](https://recipegarden.com/about)
- [FAQ](https://recipegarden.com/faq)
- [Contact](mailto:hello@recipegarden.com)
```

The agent generates this from the user's content + `PROJECT.md` positioning. For dynamic content sites, regenerate during deploy (sub-skill 14).

**`public/AGENTS.txt`** — a similar file aimed at coding/research agents (a related but distinct convention). Same format conceptually; describes what the site / API offers and how an agent should use it. Include API base URL, auth requirements, rate limits.

```markdown
# Recipe Garden — Agent Guide

> Public recipe data. No auth required for read; search supported.

## API
- GET https://recipegarden.com/api/v1/recipes — list with pagination
- GET https://recipegarden.com/api/v1/recipes/:slug — single recipe
- GET https://recipegarden.com/api/v1/search?q=<query> — search

## Rate limits
- 60 requests / minute / IP for unauthenticated read.

## Don't crawl
- /admin/* — private admin surface
- /api/internal/* — cron jobs, internal only
```

Both files live at the root and are referenced from `robots.txt`. The agent verifies the conventions are still active by checking the spec sites at setup time; if they've evolved, the agent updates the format.

### 5. RSS feed (when relevant)

If the product publishes content (blog posts, recipes, listings, podcasts), ship an RSS feed at `/feed.xml`. Aggregators, agents, and power users subscribe; it's the cheapest distribution channel that compounds.

```ts
// app/feed.xml/route.ts
import { db } from '@/lib/db';

export async function GET() {
  // const posts = await db.select().from(...);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>Recipe Garden</title>
        <link>https://recipegarden.com</link>
        <description>500 well-tested recipes for casual home cooks.</description>
        <language>en-us</language>
        <atom:link href="https://recipegarden.com/feed.xml" rel="self" type="application/rss+xml" />
        ${[].map((p: any) => `
          <item>
            <title>${p.title}</title>
            <link>https://recipegarden.com/recipes/${p.slug}</link>
            <guid>https://recipegarden.com/recipes/${p.slug}</guid>
            <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
            <description><![CDATA[${p.excerpt}]]></description>
          </item>
        `).join('')}
      </channel>
    </rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
```

Reference from `<link rel="alternate" type="application/rss+xml" href="/feed.xml" />` in the layout `<head>`.

### 6. Content publishing — should you blog?

Not every product benefits from a blog. The agent **proposes per platform** based on the product type:

| Product | Blog likely valuable? | Why |
| --- | --- | --- |
| Recipe app, news, content product | Yes — the content IS the product | Blog amplifies what you already have |
| SaaS / tool / dev product | Yes — for SEO long-tail + thought leadership | "How to do X with [your product]" tutorials win search |
| Marketplace | Maybe — case studies / seller stories work | Generic content on marketplace mechanics doesn't |
| Internal tool / B2B Enterprise | No usually — sales is via direct outreach | A blog there is overhead with no ROI |
| Niche utility (e.g., a single-purpose tool) | No — focus on the tool | Blog is distraction from product |

The agent **proposes 3-5 blog post topics** if blogging is recommended:

> *"For your recipe app, I'd suggest:*
> *1. 'How to substitute eggs in baking' (high-search-volume, evergreen, trust-building)*
> *2. 'The 5 herbs every home cook should know' (broad appeal, recipe linkbait)*
> *3. 'Why we removed the recipe-blog intro' (your differentiation, on-brand)*
>
> *Want me to generate drafts of these, or skip blog setup entirely?"*

If approved, scaffold the blog under `/blog/` with the same theme + footer as the rest of the site.

### Anti-patterns

- Default `<title>` and `<meta description>` from the framework. Tells every search engine you didn't think about it.
- Dynamic routes without `generateMetadata` — every dynamic page gets the same generic title.
- `noindex` accidentally left in production. The agent greps for it before deploy.
- Sitemap with stale URLs (deleted pages still listed). Regenerate every deploy from the live route manifest.
- `robots.txt` that disallows everything ("Disallow: /") — this is the most common foot-gun. Always test with Google Search Console after deploy.
- A blog with three posts and no plan to update. Empty blogs hurt trust; either commit to weekly cadence or skip entirely.

## DIALOGUE — report to the user

Tell the user:
- The four Lighthouse scores before and after.
- The top 1–2 things you changed.
- Anything you deliberately left unfixed and why (e.g., "third-party auth provider script can't be deferred without breaking sign-in").

## Exit criteria

- Lighthouse mobile scores: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.
- A `# Performance` line in `PROJECT.md` records the final scores.
- Per-route `<title>` + `<meta description>` + OpenGraph tags set on every route (no framework defaults left).
- Schema.org JSON-LD ships for every route type with a matching schema; verified via Google Rich Results Test.
- `sitemap.xml` and `robots.txt` generated at build; `robots.txt` does NOT disallow `/`.
- `public/llms.txt` and `public/AGENTS.txt` shipped, referenced from `robots.txt`.
- RSS feed at `/feed.xml` (if the product publishes content); referenced from layout `<head>`.
- Blog setup decision recorded in `PROJECT.md` (shipped with starter posts, OR explicitly skipped with reason).

Move on to `13-data-optimization.md`.
