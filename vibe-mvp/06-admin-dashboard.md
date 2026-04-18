# 06 · Admin Dashboard

Goal: optionally add a private `/admin` route where the project owner sees the KPIs that actually matter for *their* MVP. Built bottom-up from the codebase, not top-down from a generic template.

## DIALOGUE — does the project want one?

Ask the user, plainly:

- *"Want a private admin dashboard at `/admin` where you can see KPIs and metrics for your MVP? It would be locked to your account."*

If **no**, skip and move on to `07-accessibility.md`. (Easy to add post-MVP.)

If **yes**, **don't ask the user what metrics they want yet.** That answer is almost always "I don't know &mdash; what should I track?" Do the analysis below first, then come back with a tailored proposal.

## AUTONOMOUS — analyze the codebase

Build a mental model of what data already flows through the project.

### 1. Inventory existing data

- **Database schema.** Read every migration / model definition. List the tables and the lifecycle of each row: created when? updated when? what triggers each change?
- **User events.** Grep for any analytics calls (PostHog, Mixpanel, plain `console.log`, etc.) and any `console`/log statements that imply tracked behavior. Note what's already captured.
- **Auth.** Who are the users, how are they identified, when do they sign up?
- **Money flow.** Any Stripe / payment integration? What events fire?
- **AI usage.** Any calls through `lib/ai.ts`? Token counts logged?

Write the inventory to a scratch note (mentally or in a temp file). Don't show this to the user yet &mdash; it's input to step 3.

### 2. Research KPIs for this kind of project

Read `PROJECT.md` for the audience and MVP slice. Then choose the 4&ndash;6 KPIs that actually tell the founder if the MVP is working. Suggested starting points by project type:

| Project type | Core KPIs |
| --- | --- |
| Two-sided marketplace | Supply count, demand count, time-to-match, take rate, weekly retention of repeat users |
| Content product | DAU, sessions, depth-per-session, return rate, top 10 content items |
| SaaS tool | Signups, activation rate (define the "aha" event), weekly retention, conversion to paid |
| AI-feature product | Requests per user, success rate (parsed without error), p95 latency, cost per user, top-used feature |
| Social / community | DAU, posts per active user, comment / reply ratio, retention by cohort week |

Don't pad with vanity metrics. Five charts that change behavior beat fifty that don't.

### 3. Identify the gap

For each chosen KPI, ask: *is this data already being captured?*

- **Already captured** &rarr; great, query it.
- **Capturable with a small change** &rarr; propose a minimal change. Examples: "add a `signed_up_at` timestamp," "log a `feature_used` event in `lib/ai.ts`," "record `referrer` on the signup form."
- **Requires major instrumentation** &rarr; defer. Note as post-MVP.

## DIALOGUE — propose and confirm

Come back to the user with a concrete proposal, in this shape:

> *"Here are the 5 KPIs I'd track for your MVP:*
> 1. *DAU &mdash; do people come back?*
> 2. *Activation rate &mdash; do new users hit the aha moment?*
> 3. *Top 5 used features &mdash; where is value?*
> 4. *AI cost per user &mdash; is the unit economics sane?*
> 5. *7-day retention by signup cohort &mdash; are we keeping people?*
>
> *Of those, 3 we can compute today from existing data. 2 need small additions:*
> - *We'd add a `signed_up_at` column to `users` (one migration).*
> - *We'd log a `feature_used` event in `lib/ai.ts` (a few lines).*
>
> *Sound right? Anything to add or remove?"*

Iterate until the list feels right. Don't over-design. Five charts is plenty.

## AUTONOMOUS — build it

### 1. Add the missing instrumentation

Make the small changes you proposed. Keep the diff focused &mdash; this is a metrics pass, not a refactor.

- Migrations get reviewed by the user before running on prod.
- New event logs use a single helper (e.g., `lib/track.ts`) so you can swap analytics providers later in one place.

### 2. Lock the route with a password

The admin dashboard is for the **founder only**, not regular users. Don't tie it to the user-account system &mdash; gate it with a dedicated password the founder picks. This works even before sub-skill 03 (auth) is wired and stays simple as the project grows.

Add to `.env.local` and to Vercel env (sub-skill 11):
```
ADMIN_PASSWORD=<long random string>     # generate with: openssl rand -base64 32
```

Use Next.js middleware with HTTP Basic Auth. One file, no UI, browser handles the credential prompt. Strong-password-only; nothing to phish.

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/admin')) return NextResponse.next();

  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString();
    const [user, pass] = decoded.split(':');
    if (user === 'admin' && pass === process.env.ADMIN_PASSWORD) {
      return NextResponse.next();
    }
  }
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
  });
}

export const config = {
  matcher: '/admin/:path*',
};
```

For better UX (custom login form instead of the browser prompt), build `/admin/login` that POSTs the password to a Route Handler, which sets a signed `admin_session` cookie on success. Middleware then checks the cookie. This is a v1.5 upgrade &mdash; basic auth is enough to ship.

### 3. Build the route

```tsx
// app/admin/page.tsx
import { getKpis } from '@/lib/admin-kpis';
import { KpiCards, RetentionChart, TopFeatures } from './components';

export const revalidate = 60; // cache aggregations for 60s

export default async function AdminPage() {
  // Middleware already gated /admin/* with the admin password. No further auth check needed here.
  const kpis = await getKpis();

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <KpiCards data={kpis.summary} />
      <div className="grid lg:grid-cols-2 gap-4">
        <RetentionChart data={kpis.retention} />
        <TopFeatures data={kpis.topFeatures} />
      </div>
    </main>
  );
}
```

```ts
// lib/admin-kpis.ts
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db'; // or whichever client

export const getKpis = unstable_cache(async () => {
  const [summary, retention, topFeatures] = await Promise.all([
    fetchSummary(),
    fetchRetention(),
    fetchTopFeatures(),
  ]);
  return { summary, retention, topFeatures };
}, ['admin-kpis'], { revalidate: 60 });
```

Charts: install **recharts** (`npm install recharts`). Big numbers: DaisyUI `stat` / `card` components &mdash; no custom CSS needed.

### 4. Cache aggressively

Aggregation queries are the slow part. `unstable_cache` for 60s (or route segment `revalidate`) keeps the dashboard snappy and your DB happy.

### 5. Don't link to it from the public site

Don't add an "Admin" link to the public nav. The founder bookmarks `/admin` themselves. The fewer signals that the route exists, the less attack surface.

## Anti-patterns to avoid

- **Google-Analytics-style dashboards.** The founder wants 5 numbers that decide whether to keep going, not 50 charts that don't.
- **Building before measuring.** If a chart can't be computed because the data isn't captured, instrument first or drop the chart.
- **Hardcoding the admin password.** Always env var. Rotate-able.
- **A weak admin password.** Use `openssl rand -base64 32`. Don't let the user pick something memorable.
- **Skipping the codebase analysis.** A generic dashboard tells the founder nothing they didn't already know.

## Exit criteria

- `ADMIN_PASSWORD` is in `.env.local` (and Vercel env after deploy), gitignored.
- Visiting `/admin` without credentials returns 401.
- Visiting `/admin` with the correct password renders the dashboard.
- 4&ndash;6 KPIs render with real data.
- Any new instrumentation is documented under `# Decisions` in `PROJECT.md`.

Move on to `07-compliance.md`.
