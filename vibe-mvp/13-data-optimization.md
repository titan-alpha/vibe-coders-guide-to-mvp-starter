# 13 · Data Optimization

Goal: ensure every piece of data flowing between the frontend and backend is doing the least work necessary. For projects with persistent data, this is the difference between a snappy MVP and one that feels broken under any load.

This skill is **optional** &mdash; skip if the project is purely client-side or has no backend talking to a database.

## DIALOGUE — does this apply?

> *"Does your product have a backend that the frontend talks to &mdash; a server, a database, or external API calls? If it's purely a static site or all-client-side, we can skip this."*

If no, move on to `13-deploy.md`.

If yes, propose the audit:

> *"Want me to audit the data flow between your frontend and backend? I'll look for over-fetching, missing pagination, debounce gaps, and a few other common slow spots, then propose the highest-impact fixes. Open `localhost:3000` if you want to watch the changes land in real time."*

## AUTONOMOUS — audit the data flow

Read every place the frontend talks to the backend (API routes, Server Actions, fetch calls, database queries). For each, evaluate against the 10 checks below. Keep a scratch list of issues with concrete fixes.

### 1. Over-fetching
Does the endpoint return more fields than the UI uses? A list view rarely needs the full object for every row. **Fix**: narrow the response shape, or add a query param like `?fields=id,name,avatar`.

### 2. Under-fetching (N+1)
Does the UI make many small requests for related data &mdash; e.g., one request for a list, then one per item for details? **Fix**: consolidate into a single endpoint that returns the joined result, or add a batch loader (DataLoader pattern).

### 3. Pagination
Lists with no upper bound are bombs. Every list endpoint must paginate &mdash; cursor-based for feeds (better UX, no skipped items), offset-based for admin tables. The frontend shows "load more" or infinite scroll, never renders 10,000 rows. **Fix**: add `limit` + cursor/offset params; default `limit` to something sane like 20.

### 4. Caching strategy
- **Static or semi-static data** (settings, public catalog): wrap in Next.js `unstable_cache` or use route-segment `revalidate` with sensible TTL (5 min for "near-real-time", 1 hour for "rarely changes").
- **User-specific data**: never shared cache. Use SWR / React Query for client-side dedup + revalidation.
- **Admin queries**: cache aggressively &mdash; the founder doesn't need real-time precision (sub-skill 06 mentions this).
- **Cache invalidation**: any mutation to cached data must invalidate the cache key. The `revalidateTag` / `revalidatePath` APIs (Next.js) make this cheap.

### 5. Debouncing user input
Search inputs, autocomplete, "save as you type": every keystroke can't fire a request. **Fix**: debounce 200&ndash;400ms (lodash-es `debounce`, or a small custom `useDebouncedValue` hook). For autocomplete specifically, also abort in-flight requests when a new query supersedes them (`AbortController`).

### 6. Optimistic updates
Toggles, likes, edits: update the UI immediately, then reconcile with the server response. On failure, snap back with an error toast. SWR and React Query both expose this as `optimisticData` / `mutate`. Without it, every action feels slow even when the network is fast.

### 7. WebSockets vs polling vs streaming
- **Real-time presence, chat, multi-user state**: WebSockets (Pusher, Ably, or self-hosted via `ws` / Socket.IO).
- **One-way streams** (LLM tokens, log tails, notifications): Server-Sent Events (SSE). Cheaper than WebSockets, easier to deploy on Vercel.
- **Status that updates every few minutes**: polling. Simpler than WebSockets, no infrastructure to maintain.
- **Status that updates every second**: WebSockets/SSE.

Don't reach for WebSockets just because they sound real-time. Polling at 5s often "feels" real-time enough and avoids a stateful connection.

### 8. Response shape
- Don't deeply nest response objects if the frontend just flattens them.
- Don't return both `id` and `_id`. Pick one.
- Define the contract with **Zod** (or similar) shared between frontend and backend &mdash; same schema, same parsed type, fewer mismatches.

### 9. Compression
Ensure server returns Brotli/Gzip on JSON. Vercel does this automatically. Custom Express backends need `compression` middleware (already present in dream-forward; check this project too).

### 10. Deduplication
If the same data is fetched by multiple components on a page (header avatar, sidebar profile, settings link), deduplicate at the data-fetching layer. SWR does this automatically with the same key; React Query does the same with the same query key.

## AUTONOMOUS — search (when the platform has searchable content)

Content products, catalogs, and most consumer MVPs need search. The agent **proposes a search strategy** based on the platform's content shape and scale.

### Decision tree

| Content shape + scale | Recommendation |
| --- | --- |
| < 10K rows, simple keyword match (recipes, blog posts, FAQs) | **Postgres full-text search** (`tsvector` + `tsquery`). Free, in your existing DB. |
| 10K–100K rows OR semantic search needed | **pgvector** for semantic + Postgres FTS for keyword. Hybrid. Free. |
| > 100K rows OR sub-100ms search latency needed at scale | **Typesense** (OSS, self-hostable, free) OR **Meilisearch** (OSS, free). Fast, dedicated, low ops cost. |
| Marketplace / e-commerce / "search must include faceting + ranking + analytics" | **Algolia** (paid, ~$1/1000 records). Best-in-class but expensive past free tier. |
| User wants to defer (no search v1) | Render a `<input>` that filters client-side over a list of < 200 items. Upgrade later. |

### Postgres FTS pattern (default for most MVPs)

```sql
-- Add a generated tsvector column on the searchable table.
alter table recipes add column search_vector tsvector
  generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(array_to_string(ingredients, ' '), '')
    )
  ) stored;

create index idx_recipes_search on recipes using gin (search_vector);
```

Query:

```ts
// lib/search.ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function searchRecipes(q: string, limit = 20) {
  return db.execute(sql`
    select id, slug, title, description,
      ts_rank(search_vector, plainto_tsquery('english', ${q})) as rank
    from recipes
    where search_vector @@ plainto_tsquery('english', ${q})
    order by rank desc
    limit ${limit}
  `);
}
```

### pgvector hybrid pattern

For semantic search (typo tolerance, "find similar" queries), generate embeddings with the existing `aiCall` infrastructure, store via pgvector, and rank by cosine similarity. Pair with FTS for hybrid: re-rank top-K from each, return the merged set.

### Scaling the search index alongside the DB

When users start hitting search 100+ times/sec, FTS competes with regular reads. Move search to a read replica or graduate to Typesense/Meilisearch. The agent flags this as "post-MVP" unless the user is starting from known-high-traffic.

### Search UI

A simple `<input>` with debounced fetch (300ms) hits a `/api/search` endpoint that returns JSON. Renders results below. Highlight matching terms with `<mark>`. Empty-state copy: "No results — try [synonym] or browse [category]."

For instant-feedback patterns, add `pg_trgm` for fuzzy matching:

```sql
create extension if not exists pg_trgm;
create index idx_recipes_title_trgm on recipes using gin (title gin_trgm_ops);
```

Then `select * from recipes where title % 'rost chiken'` matches "Roast Chicken" despite typos.

### Anti-patterns

- Defaulting to Algolia at MVP scale. Postgres FTS is free and covers 80% of cases. Move only when you have a specific reason.
- Client-side search over a fetched JSON of all rows. Works at < 200 rows; falls over past that.
- Search that queries the DB on every keystroke without debounce. Cripples the DB.
- No empty-state UX. "No results" with no further action means the user bounces.

## AUTONOMOUS — file / image upload pipeline (for products with user uploads)

If the product accepts user-uploaded files (avatars at minimum, often more — recipe photos, listings, attachments), the agent ships the full pipeline. Skipping this means founders end up with one of: no uploads at all (poor UX), uploads broken at edge cases (file too big, wrong format, corrupted), or uploads as security holes (no virus posture, MIME spoofing).

### Decision tree — which storage?

| Need | Recommendation | Why |
| --- | --- | --- |
| Simple uploads, < 5 GB total expected, want zero ops | **Vercel Blob** | Free tier, integrates with Vercel deploys, simple API. Best for MVP-scale apps already on Vercel. |
| Higher volume, want CDN built-in, edge-optimized | **Cloudflare R2** | S3-compatible API, no egress fees, generous free tier (10 GB + 10M reads/month). Best for image-heavy products. |
| Power features (image transformations, signed URLs, image-specific metadata extraction) | **UploadThing** | Wraps storage + provides image processing + signed URLs out of the box. Slight markup over R2 but saves implementation time. |
| Already AWS-heavy or need specific compliance (HIPAA/FedRAMP) | **AWS S3** + CloudFront | More setup; required for some regulated workloads. |
| Self-host, full control, willing to manage | **MinIO** + Caddy | Only when there's a real reason to self-host (e.g., on-prem requirement). Adds ops burden. |

The agent picks based on `STATE.yaml decisions` + the platform's expected scale. Default: Cloudflare R2 for image-heavy products; Vercel Blob for everything else.

### The upload flow — three pieces

1. **Browser uploads directly to storage** via signed URLs (NOT through your server). Keeps file bytes off your bandwidth + your function execution time.
2. **Server validates + records the upload** after success.
3. **Client renders** from a CDN-served URL.

```ts
// app/api/uploads/sign/route.ts — server generates a signed upload URL
import { auth } from '@/auth';
import { z } from 'zod';
import { put } from '@vercel/blob';
import { limiters, clientKey } from '@/lib/rate-limit';

const Schema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  bytes: z.number().int().positive().max(10 * 1024 * 1024),  // 10 MB max
});

export async function POST(req: Request) {
  // Rate limit BEFORE any work
  const r = await limiters.general.limit(clientKey(req));
  if (!r.success) return Response.json({ error: 'rate_limited' }, { status: 429 });

  const session = await auth();
  if (!session?.user) return Response.json({ error: 'auth_required' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  // For Vercel Blob: server-side upload happens after the client posts the file to a route handler.
  // For R2 / S3: generate a presigned PUT URL and return it; client uploads directly.
  // Pattern below shows R2:
  const key = `uploads/${session.user.id}/${crypto.randomUUID()}-${parsed.data.filename}`;
  const presignedUrl = await s3.getSignedUrl('putObject', {
    Bucket: process.env.R2_BUCKET, Key: key,
    ContentType: parsed.data.contentType, ContentLength: parsed.data.bytes,
    Expires: 60,  // 60-second window to upload
  });
  return Response.json({ uploadUrl: presignedUrl, key, publicUrl: `https://cdn.<domain>/${key}` });
}
```

### Image processing — resize + format convert + EXIF strip

For image uploads specifically, process after upload OR via on-the-fly transformation:

- **Vercel Blob + next/image**: next/image handles resize + format negotiation (WebP/AVIF) on demand. Free at MVP scale.
- **Cloudflare R2 + Cloudflare Images / Image Resizing**: same model on Cloudflare's edge.
- **UploadThing**: built-in.

For all paths: **strip EXIF data** before display (privacy — EXIF includes camera GPS coordinates, device info). With sharp:

```ts
// scripts/process-upload.ts (runs after upload completes, OR in a background job)
import sharp from 'sharp';
const buffer = await fetch(originalUrl).then(r => r.arrayBuffer());
const processed = await sharp(Buffer.from(buffer))
  .rotate()                     // honor EXIF orientation
  .resize({ width: 2048, withoutEnlargement: true })
  .webp({ quality: 85 })
  .toBuffer();                  // EXIF stripped automatically by sharp's pipeline
await uploadProcessedVersion(processed);
```

### Validate at the edge

The browser-side validation is convenience; server-side validation is security. The signed-URL pattern above limits content type and size at sign-time. Additionally:

- **Magic-number check** post-upload (on a webhook from the storage provider): a `.jpg` file might actually be HTML. Verify the file header matches the claimed type.
- **Filename sanitization**: strip path separators, double-dots, control characters before storing.
- **Size limit at the edge**: signed URL `ContentLength` bounds it; verify post-upload too.

### Virus posture (when content is shared with other users)

For files that other users will see/download (listing photos, shared documents), run a virus scan:

- **ClamAV** for self-managed; runs as a sidecar service.
- **Cloudflare Workers AI** has a malware-detection endpoint (paid).
- **VirusTotal API** for URL-based scans (free tier, 4 lookups/min).

Mark uploads as `pending_scan`; only flip to `published` after scan returns clean. This is post-MVP for many platforms; mandatory for any UGC platform with file uploads.

### Schema starter

```ts
export const uploads = pgTable('uploads', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  storageKey: text('storage_key').notNull().unique(),     // path within the bucket
  publicUrl: text('public_url').notNull(),                  // CDN-fronted URL
  contentType: text('content_type').notNull(),
  bytes: integer('bytes').notNull(),
  width: integer('width'),                                   // for images, after processing
  height: integer('height'),
  status: text('status').notNull().default('pending'),       // 'pending' | 'processed' | 'flagged' | 'deleted'
  metadata: jsonb('metadata'),                                // EXIF stripped; minimal residual
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Anti-patterns

- Routing uploads THROUGH your server. Wastes bandwidth + function execution time. Use signed URLs.
- No size limit at sign-time. Users can upload 5 GB files and exhaust your quota.
- No content-type whitelist. PDF or HTML uploaded as image becomes a vector.
- Storing EXIF-rich images. Privacy leak (GPS coordinates from phone photos especially).
- Public URLs that include the user ID in the path. Enumeration leak. Use UUIDs for object keys.

### Cross-references

- Rate limiting on `/api/uploads/sign` → sub-skill 11.
- Image transformation + serving → sub-skill 12 (next/image).
- Storage cost in cost monitoring → sub-skill 07 Tab 7 + sub-skill 11 platform caps.
- For UGC products with file uploads, virus scanning is part of the moderation pipeline → sub-skill 05.

## AUTONOMOUS — feature flags (the post-MVP iteration tool)

A 30-minute add that pays compound interest. Lets the founder ship features behind a flag, roll out gradually, kill features without redeploying. Different from access modes (sub-skill 04, which gate users) — flags gate FEATURES.

### Schema

```ts
// lib/db/schema.ts
export const featureFlags = pgTable('feature_flags', {
  key: text('key').primaryKey(),                      // e.g., 'new_dashboard', 'experimental_search'
  enabled: boolean('enabled').notNull().default(false),
  rolloutPct: integer('rollout_pct').notNull().default(100),  // when enabled, what % of users see it
  scheduledActivation: timestamp('scheduled_activation'),     // null = manual; set = auto-flip-on at this time
  description: text('description'),                            // human-readable: what this flag controls
  addedBy: text('added_by').notNull().default('agent'),       // 'agent' | 'admin'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### The `flag()` helper

```ts
// lib/feature-flag.ts
import 'server-only';
import { db } from '@/lib/db';
import { featureFlags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

const getFlag = unstable_cache(
  async (key: string) => {
    const [row] = await db.select().from(featureFlags).where(eq(featureFlags.key, key));
    return row ?? null;
  },
  ['feature-flag'],
  { revalidate: 30, tags: ['feature-flags'] },  // 30s cache; admin changes invalidate via revalidateTag
);

/**
 * Check whether a feature is enabled for a given user.
 *
 * Auto-registers the flag on first call so it appears in the admin Features tab —
 * the agent doesn't need to manually add rows when introducing a new flag.
 */
export async function flag(key: string, userId?: string | null, description?: string): Promise<boolean> {
  let row = await getFlag(key);
  if (!row) {
    // Auto-register: insert disabled by default; admin enables in Tab 9.
    await db.insert(featureFlags).values({
      key, enabled: false, rolloutPct: 100,
      description: description ?? `Auto-registered by code on ${new Date().toISOString()}`,
    }).onConflictDoNothing();
    return false;
  }
  if (!row.enabled) return false;
  if (row.rolloutPct >= 100) return true;
  if (row.rolloutPct <= 0) return false;
  // Stable hash bucket per (key, userId) so the same user gets a consistent answer.
  if (!userId) return Math.random() * 100 < row.rolloutPct;  // anonymous = uncorrelated
  const hash = simpleHash(`${key}:${userId}`) % 100;
  return hash < row.rolloutPct;
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
```

### Usage in code

```ts
// Anywhere in a server component or route handler:
import { flag } from '@/lib/feature-flag';
import { auth } from '@/auth';

export default async function Dashboard() {
  const session = await auth();
  const showNewDashboard = await flag('new_dashboard', session?.user?.id, 'Redesigned dashboard with the activity timeline');

  return showNewDashboard ? <NewDashboard /> : <ClassicDashboard />;
}
```

The first call to `flag('new_dashboard', ...)` auto-registers it in the `feature_flags` table with `enabled: false`. The flag appears in the Features admin tab (sub-skill 07 Tab 9). The founder enables it when ready. **No deploy required to flip features on or off.**

### Patterns

- **Kill switch**: name flag `kill_<feature>` (default `enabled: true`, set `enabled: false` to disable the feature in an emergency without a deploy).
- **Gradual rollout**: enable + set `rolloutPct: 5` → 25 → 50 → 100 over days, watching `request_metrics` (sub-skill 08) for error rate and latency regressions.
- **Scheduled activation**: schedule a flag to flip on at midnight UTC of a launch date. The Tab 9 cron handles the flip automatically.
- **A/B test**: pair a flag with sub-skill 08 analytics — emit a `feature.<key>.shown` event with the flag value, compare conversion / retention by variant.

### Anti-patterns

- Hard-coding `if (process.env.NODE_ENV === 'development')` to gate features. Doesn't work post-deploy. Use a flag.
- Removing flag-checked code in the same deploy that disables the flag. Always: (1) disable flag in production, (2) wait a week to confirm no reports, (3) remove the dead code in a separate deploy. Otherwise rolling back is harder.
- Letting flags accumulate forever. Quarterly: review the flag list, delete fully-rolled-out or fully-killed flags + their checks.

### Cross-references

- Admin UI to toggle / schedule / set rollout → sub-skill 07 Tab 9.
- Analytics integration for measuring flag effects → sub-skill 08.
- The `kill_list` discipline (sub-skill 17 + SKILL.md) — flags make killing easy.

## DIALOGUE — propose fixes (use layman language)

Come back to the user with a short list of the highest-impact fixes. Lead with what matters in plain words:

> *"I audited the data flow. The biggest wins:*
>
> - *The dashboard fetches every user's full profile when it only needs name + avatar &mdash; that's about 10x more data than it shows. I'd narrow the response to just the fields used. Big payload reduction.*
> - *The search input fires a request on every keystroke. I'd debounce it to 300ms (one request per pause typing instead of per character).*
> - *The activity feed has no pagination &mdash; at 1000 items it'll crawl. I'd add cursor-based pagination, 20 per page with a 'Load more' button.*
> - *The chat reconnects via polling every 2 seconds. I'd switch to a WebSocket so messages arrive instantly without burning requests.*
>
> *About 30 minutes of work total. You can watch it on `localhost:3000`. Want me to do all four, or pick a subset?"*

Apply what's agreed. Note rejected items in `# Open questions` for post-MVP revisit.

## Anti-patterns to avoid

- **Caching everything.** Cache only what's safe and beneficial. A wrong cache hit (stale user data, mismatched permissions) is worse than a slow request.
- **Pre-mature WebSockets.** If polling at 30s suffices, WebSockets are over-engineering &mdash; you'll spend a week debugging connection drops.
- **Skipping pagination "because the data is small now."** The first 10x of growth will surprise you and a paginated endpoint is a 30-minute change at MVP, a week-long migration at scale.
- **Treating every fetch as cacheable.** Auth-dependent endpoints, admin queries, anything user-specific &mdash; default to no cache, opt in.

## Exit criteria

- Every list endpoint paginates with a defined max page size.
- Every search/autocomplete input is debounced (200&ndash;400ms) and aborts superseded requests.
- Public, semi-static read endpoints have appropriate cache TTLs.
- Real-time-feeling features use the right transport (polling/SSE/WebSockets) for their actual latency need.
- A `# Data` section in `PROJECT.md` records the audit findings, the changes made, and any items deferred to post-MVP.
- Search is wired (or explicitly skipped with reason) using the appropriate strategy from the decision tree.
- `feature_flags` table exists; `flag()` helper is at `lib/feature-flag.ts`; auto-registration verified (calling `flag('test', null)` inserts a row with `enabled: false`); cross-references the Features tab in sub-skill 07 (Tab 9).

Move on to `14-deploy.md`.
