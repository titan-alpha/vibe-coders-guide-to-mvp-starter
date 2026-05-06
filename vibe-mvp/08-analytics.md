# 08 · Analytics

Goal: instrument the product so the founder can answer two questions — *"Is this working?"* (investor / KPI lens) and *"What should I change?"* (product / improvement lens) — and surface the answers in an **Analytics tab** of the admin dashboard.

This sub-skill is **optional** and gated by user dialogue. Many MVPs ship without analytics; many should not. Default recommendation:

| Mode | Default |
| --- | --- |
| `quick-ship` | skip |
| `content-site` | optional — usually a hosted tool (Plausible) is enough |
| `beta-with-users` | optional — small N often makes analytics noisy |
| `full-mvp` | included |
| `investor-ready` | required — investors will ask |

This sub-skill assumes sub-skill 07 (admin dashboard) is done. Without it there's nowhere to render the charts.

## DIALOGUE — what kind of analytics, and for whom?

Two questions. Don't conflate them — they drive different metric sets.

1. **Are you gathering analytics for investor-facing KPIs?**
   *(MRR, retention curves, growth rate, North Star Metric — the numbers a deck would quote.)*
2. **Are you gathering analytics for internal product improvement?**
   *(Funnel completion, feature usage, where users get stuck, page-level engagement — the numbers a PM would act on.)*

Both, one, or neither — all valid answers. The agent picks the metric set and instrumentation depth from the answers.

| Answer | What gets built |
| --- | --- |
| Investor only | KPI dashboard (DAU/MAU/WAU, retention by cohort, growth rate, MRR if monetized, North Star). Minimal event instrumentation — mostly aggregates over `users` and existing tables. |
| Internal only | Funnel + feature-usage analytics. Heavier event instrumentation across signup flow, core feature, AI calls, page views. |
| Both | Two-section Analytics tab: *Investor KPIs* on top, *Product analytics* below. Full instrumentation. |
| Neither | Skip this sub-skill. Move to `09-monetization.md`. |

Then ask one more thing:

3. **Self-hosted or hosted?**
   - **Self-hosted (default)**: events stored in your own Postgres. No third party. You own the data. ~30 LOC of instrumentation + a few aggregation queries.
   - **PostHog (recommended for internal-product analytics with deep funnels / session recordings)**: hosted, generous free tier (1M events/month), one-line install. Better tooling than you'll build yourself if you need session replay or feature flags later.
   - **Plausible (recommended for content sites)**: hosted, privacy-friendly (no cookies, GDPR-clean), tiny script. Simple page-view + referrer + outbound-link analytics. ~$9/mo.

For investor KPIs, **always self-hosted** — these come from your domain data (users, subscriptions, usage), not from a tracking script.

## AUTONOMOUS — analyze the codebase before instrumenting

Build a list of *signals to instrument* before writing any code. Let the existing schema do the work where it can.

### 1. What can we already compute?

Read the schema and the existing tables. Most of the investor KPIs come from data that already exists:

| KPI | Source |
| --- | --- |
| DAU / WAU / MAU | `users.lastSignInAt` (add this column if missing) |
| Signups (daily/weekly cohort) | `users.createdAt` |
| Activation rate | requires defining the "aha" event — agent proposes; user confirms |
| Retention curve | `users.createdAt` + a `user_actions` event log |
| MRR / ARR | Stripe subscriptions table (sub-skill 09) |
| Churn | `users.deactivatedAt` + Stripe `customer.subscription.deleted` events |
| Usage volume | `users.usageConsumed` (sub-skill 07) |

If a KPI can't be computed without new data, propose the smallest possible change. *"Add `lastSignInAt`," "add a `user_actions` event log,"* not *"build a real-time event pipeline."*

### 2. Define the North Star Metric

For any project tracking investor KPIs, the **single most-important number** is its North Star Metric. It's product-specific and worth one round of dialogue:

> *"Looking at your product, the candidate North Stars are:*
> - *<candidate 1 — e.g., 'weekly active creators' for a marketplace>*
> - *<candidate 2 — e.g., 'recipes saved per active user per week' for a recipe app>*
> - *<candidate 3 — e.g., 'paid conversations per workspace per week' for a B2B chat tool>*
>
> *I'd propose `<top pick>` because <one-line reasoning>. Sound right?"*

The North Star sits at the top of the Analytics tab as a single big number with a 12-week trend.

### 3. Map the funnels (if internal product analytics)

For each user journey in `PROJECT.md`'s MVP slice, list the steps as funnel stages. Example for a SaaS signup → activation funnel:

```
Visit landing → Click signup → Submit signup form → Verify email →
First action → Second action (defines retention)
```

Each transition is an event. For each event, decide: client-side (page view, button click) or server-side (form submit, AI call, payment). Server-side is more reliable; client-side catches engagement-only events.

### 4. Instrumentation plan — show the user before building

Come back with a single document:

> *"Here's what I'd track:*
>
> ***Investor KPIs (computed from existing data):***
> - *DAU/WAU/MAU, signups, retention curve, MRR, churn, North Star = `<picked metric>`.*
>
> ***Product funnels (need 6 new event call sites):***
> - *`landing.viewed` (in app/page.tsx)*
> - *`signup.started`, `signup.submitted` (in app/signup/page.tsx)*
> - *`onboarding.completed` (in /onboarding)*
> - *`core_feature.used` (in lib/<feature>.ts)*
> - *`session.ended` (in middleware on inactivity)*
>
> ***Schema additions:***
> - *`users.last_sign_in_at` column (one migration)*
> - *`user_actions` table (id, userId, event, properties JSONB, createdAt)*
>
> *Sound right? Anything to add or remove before I instrument?"*

Iterate. Don't over-instrument. Five well-placed events beat fifty noisy ones.

## AUTONOMOUS — build it (self-hosted path)

### 1. Schema additions

```ts
// lib/db/schema.ts (extend)
export const userActions = pgTable('user_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),  // null for anonymous events
  event: text('event').notNull(),
  properties: jsonb('properties'),                      // arbitrary JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Indexes for the queries the dashboard runs:
// - idx_user_actions_event_created on (event, createdAt desc)
// - idx_user_actions_user_created on (userId, createdAt desc)
```

Add `lastSignInAt` to the existing `users` table if missing. Auth.js's `signIn` callback updates it.

### 2. The `track` helper

```ts
// lib/analytics.ts
import 'server-only';
import { db } from '@/lib/db';
import { userActions } from '@/lib/db/schema';

export async function track(event: string, args: { userId?: string | null; properties?: Record<string, unknown> } = {}) {
  // Best-effort: never block the user request if analytics writes fail.
  try {
    await db.insert(userActions).values({
      event,
      userId: args.userId ?? null,
      properties: args.properties ?? null,
    });
  } catch (err) {
    console.error('analytics:track failed', err);
  }
}
```

A few rules:
- **Server-side only.** Don't ship a tracking script that fires from the client. Server actions and API routes already know who the user is.
- **Best-effort.** Wrap in try/catch. Analytics never blocks user-facing work.
- **Event names are dot-namespaced.** `signup.submitted`, `core_feature.used`, `chatbot.opened`. Lowercase, no spaces.
- **Properties are flat JSON.** Strings, numbers, booleans. No nested objects (kills query performance).

### 3. Wire the call sites

Examples — adapt to the actual codebase:

```ts
// app/signup/page.tsx — inside the server action, after the user row is created:
await track('signup.submitted', { userId: user.id, properties: { hasIntendedUse: !!intendedUse } });

// lib/ai-gated.ts — after a successful gatedAiCall:
await track('ai.call', { userId, properties: { feature: args.feature, ms: durationMs } });

// app/api/auth/[...nextauth]/callbacks — bump lastSignInAt:
await db.update(users).set({ lastSignInAt: new Date() }).where(eq(users.id, user.id));
```

### 4. Aggregation views

For the dashboard, aggregations should be **cached** (the chart load shouldn't run a 30-second SQL query on every page visit). Use Next.js `unstable_cache` with a 5-minute revalidate, or a materialized view if Postgres + the data volume warrants.

```ts
// lib/analytics-aggregates.ts
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const getDailyActiveUsers = unstable_cache(async (days = 90) => {
  return db.execute(sql`
    select date_trunc('day', last_sign_in_at) as day, count(distinct id)::int as count
    from users
    where last_sign_in_at > now() - interval '${sql.raw(String(days))} days'
    group by 1 order by 1
  `);
}, ['analytics-dau'], { revalidate: 300 });

export const getRetentionByWeekCohort = unstable_cache(async () => {
  return db.execute(sql`
    with cohorts as (
      select id as user_id, date_trunc('week', created_at) as cohort_week
      from users
    ),
    actions as (
      select distinct user_id, date_trunc('week', created_at) as action_week
      from user_actions
    )
    select
      c.cohort_week,
      a.action_week,
      count(distinct c.user_id)::int as active
    from cohorts c
    join actions a on a.user_id = c.user_id
    where c.cohort_week >= now() - interval '12 weeks'
    group by 1, 2 order by 1, 2
  `);
}, ['analytics-retention'], { revalidate: 600 });

export const getNorthStar = unstable_cache(async () => {
  // Project-specific. Example for "weekly active creators":
  return db.execute(sql`
    select date_trunc('week', created_at) as week, count(distinct user_id)::int as creators
    from user_actions
    where event = 'core_feature.used'
      and created_at > now() - interval '12 weeks'
    group by 1 order by 1
  `);
}, ['analytics-north-star'], { revalidate: 300 });
```

### 5. Add the Analytics tab to the admin dashboard

```tsx
// app/admin/layout.tsx — add a 6th tab
<Link href="/admin/analytics" className="tab">Analytics</Link>
```

```tsx
// app/admin/analytics/page.tsx
import { getDailyActiveUsers, getRetentionByWeekCohort, getNorthStar } from '@/lib/analytics-aggregates';
import { LineChart, BarChart, AreaChart } from '@/components/charts';   // recharts wrappers

export const revalidate = 60;

export default async function AnalyticsTab() {
  const [dau, retention, northStar] = await Promise.all([
    getDailyActiveUsers(),
    getRetentionByWeekCohort(),
    getNorthStar(),
  ]);

  return (
    <section className="space-y-8">
      {/* North Star — single big number + 12-week trend */}
      <div className="card bg-base-200 p-6">
        <div className="opacity-70 text-sm">North Star — Weekly Active Creators</div>
        <div className="text-5xl font-semibold">{northStar.at(-1)?.creators ?? 0}</div>
        <AreaChart data={northStar} x="week" y="creators" height={120} />
      </div>

      {/* Investor KPIs row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <KpiCard title="DAU (today)" value={dau.at(-1)?.count} trend={dau} />
        <KpiCard title="Signups (this week)" value={...} />
        <KpiCard title="MRR" value={...} />
      </div>

      {/* Retention heatmap (cohort by cohort) */}
      <div className="card bg-base-100 p-6">
        <h2 className="text-xl font-semibold mb-4">Retention by signup cohort</h2>
        <RetentionHeatmap data={retention} />
      </div>

      {/* Funnels (only if internal product analytics) */}
      <FunnelChart name="Signup → activation" steps={[
        { event: 'landing.viewed' },
        { event: 'signup.started' },
        { event: 'signup.submitted' },
        { event: 'onboarding.completed' },
        { event: 'core_feature.used' },
      ]} />
    </section>
  );
}
```

Charts: install **recharts** (`npm install recharts`) if not already installed by sub-skill 07. The retention heatmap is a custom grid; the others are stock recharts.

## AUTONOMOUS — backend KPIs (do this regardless of which path you picked)

The instrumentation above tracks user-facing events. The user **also** needs visibility into the *backend* — system health (latency, errors, throughput) and product KPIs measured server-side (signup completion the server actually saw, subscription state from Stripe, AI cost per request). Otherwise the Analytics tab tells half the story.

This section is **non-negotiable** when sub-skill 08 runs. The backend metrics live alongside the frontend ones in the same Analytics admin tab so the founder gets one unified surface.

### 1. Two layers, captured separately

| Layer | What it answers | Examples |
| --- | --- | --- |
| **System health** | Is the platform operating correctly? | p50 / p95 / p99 latency per route; 5xx error rate per route; request volume per route; DB query duration; webhook delivery success; background-job success rate; cache hit ratio |
| **Server-confirmed product KPIs** | Did the user actually achieve the value? | Signup confirmed server-side (vs front-end "submit clicked"); subscription active right now (from Stripe webhooks, not optimistic UI); AI cost per user per day; payments captured vs declined; emails delivered vs bounced |

The server-side product KPIs are the **authoritative** version. Front-end events tell you the user *tried*; backend tells you whether it *worked*. Investors ask for the backend numbers.

### 2. System-health instrumentation (a single middleware does the work)

Wrap every Route Handler with one helper. Captures duration + status + path + method + error class:

```ts
// lib/request-metrics.ts
import 'server-only';
import { db } from '@/lib/db';
import { requestMetrics } from '@/lib/db/schema';
import { log } from '@/lib/log';

export async function withMetrics<T>(
  meta: { route: string; method: string; userId?: string | null },
  handler: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  let status = 200;
  let errorClass: string | null = null;
  try {
    const result = await handler();
    return result;
  } catch (err) {
    status = (err as { status?: number })?.status ?? 500;
    errorClass = (err as Error)?.name ?? 'Error';
    throw err;
  } finally {
    const ms = Date.now() - start;
    // Best-effort write; analytics never blocks the user.
    db.insert(requestMetrics).values({
      route: meta.route, method: meta.method, userId: meta.userId ?? null,
      status, errorClass, durationMs: ms, createdAt: new Date(),
    }).catch((e) => log.error({ event: 'request_metrics.insert_failed', err: e }));
  }
}
```

Schema:

```ts
// lib/db/schema.ts (extend)
export const requestMetrics = pgTable('request_metrics', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: uuid('user_id'),                                 // nullable for anonymous
  route: text('route').notNull(),                          // canonical e.g., 'POST /api/feedback'
  method: text('method').notNull(),
  status: integer('status').notNull(),
  errorClass: text('error_class'),                         // null on 2xx
  durationMs: integer('duration_ms').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  routeCreatedIdx: index('idx_request_metrics_route_created').on(t.route, t.createdAt.desc()),
  statusCreatedIdx: index('idx_request_metrics_status_created').on(t.status, t.createdAt.desc()),
}));
```

Use it inside Route Handlers:

```ts
// app/api/feedback/route.ts
import { withMetrics } from '@/lib/request-metrics';
import { auth } from '@/auth';

export async function POST(req: Request) {
  const session = await auth();
  return withMetrics(
    { route: 'POST /api/feedback', method: 'POST', userId: session?.user?.id ?? null },
    async () => {
      // ... existing handler body ...
      return Response.json({ ok: true });
    },
  );
}
```

For Vercel-hosted apps, the platform's own analytics also captures p95 latency and error rate per route — surface that as an embedded panel if the user has a Pro plan; the in-DB version above works on any tier and is the source of truth for the Analytics tab.

### 3. Server-confirmed product KPIs

For each "the user did the thing" moment, instrument the **point where the server confirms it succeeded**, not the click:

| Event | Where to instrument | Why server-side matters |
| --- | --- | --- |
| Signup completed | After the `users` row insert + `userConsents` rows are saved (sub-skill 04) | Front-end "submit" can succeed but the row insert can fail (DB constraint, race). |
| Email verified | When the verify token is consumed in `/reset/confirm` | Front-end click ≠ token actually consumed. |
| Subscription active | Stripe webhook `customer.subscription.created` / `.updated` (sub-skill 09) | Optimistic UI lies during Stripe processing delays. |
| Payment captured | Webhook `checkout.session.completed` with `payment_status === 'paid'` | "Buy" click happens before money moves. |
| AI feature succeeded | Inside `gatedAiCall` (sub-skill 07), only on the success path | Failed AI calls inflate front-end "feature_used" counts. |
| Email delivered | Resend / SendGrid webhook `email.delivered` (sub-skill 04) | Sent ≠ delivered ≠ opened. |
| Webhook handled | At the END of each webhook switch case, only on success | Webhook received ≠ webhook handled correctly. |

Each of these calls the same `track()` helper from the self-hosted path, OR posts to PostHog via the same mirror interface — but with an event name that reflects server-confirmation: `signup.confirmed_server`, `subscription.active`, `email.delivered`, etc. The naming distinction matters because the Analytics tab shows both `signup.submitted` (front-end click) and `signup.confirmed_server` (DB write succeeded) as separate funnel steps — the gap between them is your "drop-off where things broke."

### 4. Aggregations the Analytics tab queries

Add four backend panels to the existing Analytics tab (sub-skill 08 step 5). Cache via `unstable_cache` with a 1-minute revalidate (system health is the highest-frequency surface).

```ts
// lib/analytics-aggregates-backend.ts
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// p50 / p95 / p99 latency per route, last 24h.
export const getLatencyByRoute = unstable_cache(async () => {
  return db.execute(sql`
    select route, method,
      percentile_cont(0.5)  within group (order by duration_ms) as p50,
      percentile_cont(0.95) within group (order by duration_ms) as p95,
      percentile_cont(0.99) within group (order by duration_ms) as p99,
      count(*)::int as requests
    from request_metrics
    where created_at > now() - interval '24 hours'
    group by route, method
    order by p95 desc
  `);
}, ['backend-latency-by-route'], { revalidate: 60 });

// 5xx error rate per route, last 24h. Anything above 1% is a yellow flag,
// above 5% is red.
export const getErrorRateByRoute = unstable_cache(async () => {
  return db.execute(sql`
    select route,
      sum(case when status >= 500 then 1 else 0 end)::float / count(*)::float as error_rate,
      sum(case when status >= 500 then 1 else 0 end)::int as errors,
      count(*)::int as requests
    from request_metrics
    where created_at > now() - interval '24 hours'
    group by route
    having count(*) > 5
    order by error_rate desc
  `);
}, ['backend-error-rate'], { revalidate: 60 });

// Server-confirmed funnel: front-end submitted vs server-confirmed.
export const getSignupFunnelGap = unstable_cache(async () => {
  return db.execute(sql`
    select
      sum(case when event = 'signup.submitted'         then 1 else 0 end)::int as submitted,
      sum(case when event = 'signup.confirmed_server'  then 1 else 0 end)::int as confirmed,
      sum(case when event = 'signup.submitted' then 1 else 0 end) -
      sum(case when event = 'signup.confirmed_server' then 1 else 0 end) as drop_off
    from user_actions
    where created_at > now() - interval '7 days'
  `);
}, ['backend-signup-funnel'], { revalidate: 300 });

// AI cost per user per day (sub-skill 07 logs cost in user_actions.properties).
export const getAiCostPerUser = unstable_cache(async () => {
  return db.execute(sql`
    select user_id,
      date_trunc('day', created_at) as day,
      count(*)::int as calls,
      sum((properties->>'cost_usd')::numeric) as cost_usd
    from user_actions
    where event = 'ai.call' and created_at > now() - interval '14 days'
    group by user_id, day
    order by day desc, cost_usd desc
    limit 100
  `);
}, ['backend-ai-cost-per-user'], { revalidate: 300 });
```

Render these as a "**Backend**" section above (or alongside) the existing investor + product sections in the Analytics tab:

```tsx
// app/admin/analytics/page.tsx — add to the existing render
<section className="space-y-4">
  <h2 className="text-lg font-semibold">Backend health</h2>
  <LatencyTable data={latency} />
  <ErrorRateTable data={errors} />
</section>

<section className="space-y-4">
  <h2 className="text-lg font-semibold">Server-confirmed funnels</h2>
  <SignupGapCard data={signupGap} />
  <AiCostPerUserTable data={aiCost} />
</section>
```

### 5. Retention policy (don't ship a runaway cost)

`request_metrics` accumulates a row per request — at 100K requests/day that's 36M rows/year. Add a daily cleanup job (Vercel Cron or an external scheduler):

```sql
-- Keep 30 days of request_metrics; aggregate older data into a daily rollup table if needed.
delete from request_metrics where created_at < now() - interval '30 days';
```

For projects expecting >1K req/sec, instead of writing every request to Postgres, sample (write 1 in N) or pipe to a dedicated metrics store (ClickHouse, Tinybird). The above design is right for MVP-scale (≤ 100K req/day).

## AUTONOMOUS — build it (PostHog path)

If the user picked PostHog:

```bash
npm install posthog-js posthog-node
```

Walkthrough:

1. *"Open https://posthog.com/signup."*
2. *"Create a project. Copy the Project API Key (`phc_...`) from Settings → Project."*
3. *"Paste the key here."*

Append to `.env.local`:
```
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

```ts
// lib/posthog.ts
import { PostHog } from 'posthog-node';
export const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, { host: process.env.NEXT_PUBLIC_POSTHOG_HOST });
```

Mirror the `track` interface from the self-hosted path so call sites are identical:

```ts
export async function track(event: string, args: { userId?: string | null; properties?: Record<string, unknown> } = {}) {
  posthog.capture({ event, distinctId: args.userId ?? 'anonymous', properties: args.properties });
}
```

For the Admin tab, embed PostHog dashboards via `<iframe>` (PostHog supports embedding) or build the same custom charts pulling from PostHog's HogQL API. The custom-chart route is more work but stays self-contained.

PostHog also gives you free session recordings, heatmaps, and feature flags — note these to the user as post-MVP capabilities they get "for free" by being on PostHog.

## AUTONOMOUS — build it (Plausible path)

If the user picked Plausible (typically a content site):

1. *"Open https://plausible.io/register. Sign up. Add your site."*
2. *"Copy the script tag from the snippet page."*

Add to `app/layout.tsx`:
```tsx
<script defer data-domain="<your-domain>" src="https://plausible.io/js/script.js"></script>
```

Plausible auto-tracks page views. No event instrumentation needed for a content site. Embed the dashboard via shared link in an admin tab, or just bookmark the Plausible dashboard.

## Cross-references

- **Sub-skill 03 (compliance)**: any client-side tracking (PostHog with `posthog-js`, Plausible) needs disclosure in the privacy policy and — for EU users — a cookie banner. Self-hosted server-side tracking sidesteps both, which is one of its advantages.
- **Sub-skill 07 (admin dashboard)**: the Analytics tab lives there. Make sure that sub-skill is done before this one.
- **Sub-skill 09 (monetization)**: MRR / churn KPIs depend on Stripe being wired. If monetization comes after, the MRR/churn cards stay empty until then; mark them "pending sub-skill 09."

## Anti-patterns to avoid

- **Tracking everything by default.** Pick five well-defined events, not fifty noisy ones. Instrument what you'll act on.
- **Client-side tracking when server-side will do.** Server-side is more reliable, doesn't need a cookie banner, and isn't blocked by ad blockers.
- **Vanity metrics.** "Total page views" or "average time on site" decide nothing. Pick metrics that change a decision.
- **Custom-rolling a session-replay tool.** That's where PostHog earns its keep — don't reinvent it for an MVP.
- **Forgetting to wire `lastSignInAt`.** Without it, DAU/WAU/MAU are wrong. Auth.js callback bumps it on every successful sign-in.
- **Letting analytics writes block user-facing requests.** Always best-effort try/catch.
- **Frontend-only analytics.** Front-end events tell you the user *tried*; backend tells you whether it *worked*. Ship both, or the Analytics tab tells half the story (and the half investors care about more is the backend half).
- **Treating front-end "submit" as proof of completion.** `signup.submitted` is a click; `signup.confirmed_server` is the DB write. The gap between them is real and tells you when something's broken.
- **Writing every request to Postgres past 100K req/day.** Sample (1-in-N) or move to a dedicated metrics store. Don't let the metrics table out-grow the application data.

## Exit criteria

- The user has answered the two scope questions; the chosen metric set is captured in `STATE.yaml # Decisions`.
- For self-hosted: `lib/analytics.ts` and `lib/analytics-aggregates.ts` exist; `userActions` (and any other added) tables are migrated; ≥5 event call sites are wired.
- For PostHog: `lib/posthog.ts` is wired and the same `track` interface is exported; events flow through to the PostHog dashboard.
- For Plausible: the script is in `app/layout.tsx` and the Plausible dashboard shows page views from localhost.
- The admin dashboard has an **Analytics** tab rendering at least: the North Star number with trend, DAU/signups/key KPIs, and (if internal analytics) at least one funnel chart.
- **Backend KPIs are wired** alongside the frontend events: `request_metrics` table + `withMetrics` helper applied to every public Route Handler; server-confirmed product events fire (`signup.confirmed_server`, `subscription.active`, `email.delivered`, etc.); the Analytics tab has a "Backend health" section (latency p50/p95/p99 by route + 5xx error rate by route) and a "Server-confirmed funnels" section (signup gap + AI cost per user). 30-day cleanup job runs.
- A `# Analytics` section in `PROJECT.md` lists: scope (investor / internal / both), tool (self-hosted / PostHog / Plausible), the North Star definition, the events instrumented (frontend + backend), and the retention policy for `request_metrics`.

Move on to `09-monetization.md`.
