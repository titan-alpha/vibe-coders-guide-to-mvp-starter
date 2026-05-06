# Pattern: Content Platform

A product where the content IS the product — recipes, articles, podcasts, videos, courses, guides, listings of curated information. Loaded by sub-skill 01 when `decisions.product_category == 'content-platform'`.

## Canonical surfaces

- **Public landing** — the highest-quality piece of content visible above the fold. Don't lead with marketing; lead with proof. The landing IS a content sample.
- **Content index** — list/grid of all content. Categorized + searchable. The default sort is a deliberate product decision (newest? most-read? curated?).
- **Content detail page** — the most-important page in the entire product. Everything else exists to get users here. Reading speed = retention.
- **Search** (sub-skill 13) — non-negotiable for any catalog past 50 items.
- **Category / tag pages** — for SEO + discoverability. Each category gets its own listing index page.
- **Author / creator profile** (if multi-author) — bio + their published content.
- **Save / bookmark** — universal even on free content. Intent signal.
- **RSS feed** + sitemap (sub-skill 12) — content distribution channels.

## Navigation pattern

- Header: standard 5-element rule. The hamburger contains category pages, About, FAQ.
- For long content: a **table-of-contents sidebar** (sticky on desktop, collapsible on mobile) listing the article's H2s.
- Reading progress bar at the top of long-form content (subtle, not loud).
- Related-content links at the bottom of every detail page (3-5; either hand-curated or "more from this author / category").

## Content detail page — the make-or-break design

For a recipe app, an article site, a podcast platform — the detail page is everything:

- **Above the fold**: title, byline (if relevant), hero media, the *first sentence of value*. No life-story intro. No SEO blog-spam preamble.
- **Body typography**: 18-20px body text, 1.6-1.8 line-height, max 70 characters per line. **Reading speed is the metric.**
- **Single-column layout** for the body. No sidebars distracting the reader. Sidebar nav lives outside the reading column.
- **Sticky primary action** on long content (save, share, "start cooking" / "play episode" / "open course"). Bottom-right on desktop; bottom-fixed bar on mobile.
- **Comments / reviews** — only if the audience actually wants to discuss. Many content sites are better without comments. Surveys: 80% of readers don't read comments; 20% do but rarely contribute.

## Key UX conventions

- **Index cards** — image (or generated cover), title, 1-2 line excerpt, metadata (date / read-time / category). 3 cards/row desktop, stacked mobile.
- **Empty index** — never. Ship with seed content. A content site with 5 articles looks like an abandoned blog.
- **Search results** — show the matching snippet from the body, not just the title. Highlight the matched terms with `<mark>`.
- **404 inside content paths** — for old URLs, suggest 3 related current pieces. Don't dead-end the reader.
- **Print stylesheet** — `@media print` rules so users can print recipes / articles / guides cleanly. Free engagement, surprises users in a good way.
- **Read-time estimate** — show "~5 min read" on long content. Sets expectation; users opt in.

## What kills content platform MVPs

- Empty content index at launch (see seeding rule above).
- Detail pages that bury the value under preamble. The first sentence of every detail page should provide value.
- Slow page loads on detail (the highest-volume page). Lighthouse perf 90+ matters more here than anywhere else.
- No SEO foundation. Sub-skill 12's full SEO pass is mandatory for content sites — that's where the audience comes from.
- Author voice that doesn't match the audience. Re-read sub-skill 02's brand-voice section before writing any sample content.

## Schema starter (Drizzle)

```ts
export const content = pgTable('content', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id').references(() => users.id),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  body: text('body').notNull(),                        // markdown or HTML depending on editor choice
  category: text('category'),
  tags: jsonb('tags'),                                  // string[]
  heroImageUrl: text('hero_image_url'),
  readMinutes: integer('read_minutes'),
  publishedAt: timestamp('published_at'),
  searchVector: tsVector('search_vector'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bookmarks = pgTable('bookmarks', {
  userId: uuid('user_id').notNull().references(() => users.id),
  contentId: uuid('content_id').notNull().references(() => content.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.contentId] }) }));
```

## Cross-references

- SEO is the lifeblood here → sub-skill 12 (the full SEO surface, especially Schema.org `Article` + RSS + llms.txt).
- Search → sub-skill 13.
- Content seeding → sub-skill 02 seeding section. Mandatory before launch.
- Reading-time + perf → sub-skill 12 performance.
- For monetized content sites: AdSense → sub-skill 09.
