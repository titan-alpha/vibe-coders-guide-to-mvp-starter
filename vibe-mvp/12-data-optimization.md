# 12 · Data Optimization

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

Move on to `13-deploy.md`.
