# 07 · Admin Dashboard

Goal: add a private `/admin` route where the project owner can (a) see KPIs that actually matter for *their* MVP and (b) operate the user base — add users, approve from the waitlist, grant or limit usage, deactivate. Built bottom-up from the codebase, not top-down from a generic template.

## DIALOGUE — does the project want one?

For any project with auth (any access mode from sub-skill 01), the dashboard is **strongly recommended** — without it the founder has no way to add users, see who's waiting, or grant usage.

For a static content site with no auth, ask plainly:

> *"Want a private admin dashboard at `/admin` where you can see KPIs and metrics for your MVP? It would be locked to a password you pick."*

If the project has auth, frame it differently:

> *"You'll need an admin dashboard to manage the people on the platform — approve waitlist signups, add users by email, grant usage, deactivate misbehaving accounts. I'll build that plus a few KPIs tailored to your MVP. Sound good?"*

Then, in the same exchange, ask about notifications:

> *"The dashboard will also let you send notifications to all users or to specific users — they appear in a bell icon at the top-right of the site. OK to include that, or skip notifications and just have the user-management tabs?"*

If the user opts out of notifications: skip Tab 5 entirely AND tell them to inform sub-skill 02 to leave out the bell icon (or note in `STATE.yaml` `# Decisions`: "Notification center: skipped — header has no bell icon").

Then, in the same exchange, ask about feedback collection:

> *"One more thing while we're here — want me to wire a feedback collection system? Three pieces:*
> *(a) A 'Feedback' item in the hamburger menu, opens a small form;*
> *(b) 2–3 contextual feedback prompts I'll propose based on your product (e.g., a 'how did this go?' prompt after a key user action);*
> *(c) A Feedback tab in this admin dashboard so you can search, filter, and reply.*
>
> *It's the cheapest way to learn what to build next. OK to include, or skip?"*

If the user opts out of feedback: skip the new tab AND the hamburger item AND the contextual prompts. Record in `STATE.yaml # Decisions`: "Feedback collection: skipped".

Then, in the same exchange, ask about the cost-monitoring and alerts tabs:

> *"Two more decisions while we're here:*
>
> *Want a **Cost Monitoring** tab? It calculates your projected monthly spend across services (OpenAI, Vercel, Resend, Stripe, Neon, etc.) based on actual usage × documented unit prices, and lets you set per-service ceilings. When you hit 80% of any ceiling, it pings you. Strongly recommended — surprise bills are real risks for founders.*
>
> *Want an **Alerts** tab? It's where production errors land. The agent wires Sentry-style error tracking + sends an email to your inbox (via Resend) for anything above 'warning' severity. The tab shows the dispatched-history so you can see what fired and when.*
>
> *Both, one, or neither?"*

Skip-paths recorded in `STATE.yaml`:
- `decisions.cost_monitoring_enabled: false` — skip Tab 7
- `decisions.error_alerts_enabled: false` — skip Tab 8

Then, in the same exchange, ask about the features tab:

> *"One more — want a **Features** tab? It exposes feature flags at runtime — toggle features on/off without a deploy, schedule features to come online on a specific calendar date, run a percentage-based gradual rollout. Useful when you want to ship behind a flag and roll out controlled. Pairs with the feature_flags schema sub-skill 13 sets up.*
>
> *Want this, or skip?"*

Skip-path: `decisions.features_admin_enabled: false` in `STATE.yaml`. Note: the underlying feature-flag schema still ships (sub-skill 13) — only the admin UI for it is gated.

If the user declines the dashboard altogether, skip and move on to `08-monetization.md`. (For a project with auth, gently flag that without an admin dashboard they'll be running SQL by hand to manage users — they'll likely come back to this.)

## AUTONOMOUS — analyze the codebase

Build a mental model of what data already flows through the project.

### 1. Inventory existing data

- **Database schema.** Read every migration / model definition. List the tables and the lifecycle of each row: created when? updated when? what triggers each change?
- **User events.** Grep for any analytics calls (PostHog, Mixpanel, plain `console.log`, etc.) and any `console`/log statements that imply tracked behavior. Note what's already captured.
- **Auth.** Read sub-skill 04's schema. You should see `users`, `waitlist`, `allowedEmails`, `userConsents`, `authTokens`. The `users` table has `usageGranted` and `usageConsumed` columns to power the Usage tab.
- **Money flow.** Any Stripe / payment integration? What events fire? (Sub-skill 08 may or may not be done yet — if not, leave hooks for later.)
- **AI usage.** Any calls through `lib/ai.ts`? If yes, that's where you'll log per-user usage (see "Usage instrumentation" below).

Write the inventory to a scratch note (mentally or in a temp file). Don't show this to the user yet — it's input to step 3.

### 2. Research KPIs for this kind of project

Read `PROJECT.md` for the audience and MVP slice. Then choose the 4–6 KPIs that actually tell the founder if the MVP is working. Suggested starting points by project type:

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

- **Already captured** → great, query it.
- **Capturable with a small change** → propose a minimal change. Examples: "add a `signed_up_at` timestamp," "log a `feature_used` event in `lib/ai.ts`," "record `referrer` on the signup form."
- **Requires major instrumentation** → defer. Note as post-MVP.

## DIALOGUE — propose KPIs and the initial usage budget

Come back to the user with a concrete proposal:

> *"Here are the 5 KPIs I'd track for your MVP:*
> 1. *DAU — do people come back?*
> 2. *Activation rate — do new users hit the aha moment?*
> 3. *Top 5 used features — where is value?*
> 4. *AI cost per user — is the unit economics sane?*
> 5. *7-day retention by signup cohort — are we keeping people?*
>
> *Of those, 3 we can compute today from existing data. 2 need small additions:*
> - *We'd add a `signed_up_at` column to `users` (one migration).*
> - *We'd log a `feature_used` event in `lib/ai.ts` (a few lines).*"

Then, in the same conversation, propose the **initial usage grant per user** — the number that goes into `INITIAL_USAGE_GRANT` and gets baked into every new `users.usageGranted` value at signup.

The right number depends on the product. Reason out loud, then propose:

> *"Each AI call through your `lib/ai.ts` costs roughly $0.0002 (gpt-5-nano + minimal). If we want a beta user to be able to do ~100 meaningful actions before you'd want to top them up, that's about $0.02 per user — comfortable. I'd suggest **`INITIAL_USAGE_GRANT=100`**. From the dashboard you'll be able to grant more — to one user, or to all users in bulk. Want to start at 100 or pick a different number?"*

Heuristics, by product type:

| Product | Suggested initial grant | Reasoning |
| --- | --- | --- |
| AI-feature SaaS (one call per action) | 50–200 | Enough for a real evaluation, low enough to detect runaway use |
| Content product with 1 AI summary per page | 1000+ | Reads cost almost nothing; cap is more about abuse than economics |
| Image generation / heavy AI | 5–20 | Each call costs cents, not millicents |
| Marketplace / no AI | irrelevant — set to a high number and ignore | Usage gating doesn't apply |

Iterate until both the KPI list and the usage number feel right. Persist `INITIAL_USAGE_GRANT` in `.env.local`.

## AUTONOMOUS — usage instrumentation

If the product has any per-user usage that needs gating (AI calls, generations, exports, anything that costs you money or compute per call), wire it through a tiny helper. Example for AI:

```ts
// lib/ai-gated.ts
import 'server-only';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { aiCall } from '@/lib/ai';

export class UsageExhausted extends Error {}

export async function gatedAiCall<T>(args: { userId: string } & Parameters<typeof aiCall>[0]) {
  const [u] = await db.select({
    granted: users.usageGranted, consumed: users.usageConsumed, deactivated: users.deactivatedAt,
  }).from(users).where(eq(users.id, args.userId));
  if (!u || u.deactivated) throw new UsageExhausted('Account deactivated');
  if (u.consumed >= u.granted) throw new UsageExhausted('Usage exhausted — contact admin');

  const result = await aiCall(args);
  await db.update(users).set({ usageConsumed: sql`${users.usageConsumed} + 1` }).where(eq(users.id, args.userId));
  return result;
}
```

Replace `aiCall` callers with `gatedAiCall` everywhere a user triggered the call. (Background jobs and admin-triggered calls should use raw `aiCall`.) Surface `UsageExhausted` to the UI as a friendly "you've used your monthly quota — contact us" message.

## AUTONOMOUS — lock the route with a password (placeholder + forced change on first login)

The admin dashboard is for the **founder only**, not regular users. Don't tie it to the user-account system — gate it with a dedicated password the founder picks. This works regardless of which auth mode the rest of the app uses.

The flow has three states:

1. **Setup** — agent generates a placeholder password, shows it to the user once, and stores it in `.env.local` as `ADMIN_PASSWORD_BOOTSTRAP`.
2. **First login** — user signs in with the placeholder. Middleware accepts it but redirects to `/admin/change-password`. User cannot reach any admin page until they set a real password.
3. **Steady state** — middleware checks the bcrypt hash stored in the DB. The bootstrap env var is no longer consulted (and the agent tells the user they can delete it).

### Step 1 — generate the placeholder + show it to the user

Use a memorable-but-random pattern so it's easy to type once:

```bash
node -e "console.log('vibe-admin-' + crypto.randomBytes(4).toString('hex'))"
# example output: vibe-admin-9f3a2c8b
```

Append to `.env.local`:
```
ADMIN_PASSWORD_BOOTSTRAP=vibe-admin-9f3a2c8b   # placeholder; remove after first login
INITIAL_USAGE_GRANT=100                          # baked into every new user's usageGranted at signup
```

Tell the user, in chat, in plain English:

> *"Your one-time admin password is **`vibe-admin-9f3a2c8b`**.*
>
> *Open `/admin` (or `https://<your-domain>/admin` once deployed). Sign in with username `admin` and that password. The first thing you'll see is a 'Set your admin password' form — pick something you'll remember, at least 12 characters. After that, the placeholder stops working and you can delete `ADMIN_PASSWORD_BOOTSTRAP` from `.env.local` (and from Vercel env).*"

### Step 2 — schema for the persistent admin password

Add a single-row table (or a one-row settings table if you prefer one bag for all admin settings):

```ts
// lib/db/schema.ts (extend)
export const adminSettings = pgTable('admin_settings', {
  id: integer('id').primaryKey().default(1),         // single-row pattern
  passwordHash: text('password_hash'),               // null until first change
  passwordSetAt: timestamp('password_set_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

Seed the row at migration time:
```sql
insert into admin_settings (id) values (1) on conflict do nothing;
```

### Step 3 — middleware checks hash first, then bootstrap

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/admin')) return NextResponse.next();

  // /admin/change-password is the one admin route reachable with bootstrap creds.
  // Allow it through with bootstrap auth so the user can land here and set the real password.
  const isChangePage = req.nextUrl.pathname === '/admin/change-password';

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    });
  }
  const [user, pass] = Buffer.from(authHeader.slice(6), 'base64').toString().split(':');
  if (user !== 'admin' || !pass) return new NextResponse('Auth failed', { status: 401 });

  // Edge runtime can't import bcryptjs cleanly; do the check via a lightweight API route.
  const result = await fetch(`${req.nextUrl.origin}/api/admin/verify`, {
    method: 'POST',
    body: JSON.stringify({ password: pass }),
  }).then(r => r.json() as Promise<{ ok: boolean; mustChange: boolean }>);

  if (!result.ok) {
    return new NextResponse('Auth failed', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    });
  }

  if (result.mustChange && !isChangePage) {
    return NextResponse.redirect(new URL('/admin/change-password', req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: '/admin/:path*' };
```

```ts
// app/api/admin/verify/route.ts
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { adminSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const { password } = (await req.json()) as { password: string };
  const [row] = await db.select().from(adminSettings).where(eq(adminSettings.id, 1));

  // Persistent hash exists → use it. Bootstrap env var is no longer consulted.
  if (row?.passwordHash) {
    const ok = await bcrypt.compare(password, row.passwordHash);
    return Response.json({ ok, mustChange: false });
  }

  // No persistent hash yet → accept bootstrap and force a change on first page hit.
  const bootstrap = process.env.ADMIN_PASSWORD_BOOTSTRAP;
  if (bootstrap && password === bootstrap) {
    return Response.json({ ok: true, mustChange: true });
  }

  return Response.json({ ok: false, mustChange: false });
}
```

### Step 4 — the change-password page

```tsx
// app/admin/change-password/page.tsx
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { adminSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export default function ChangePasswordPage() {
  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold">Set your admin password</h1>
      <p className="text-sm opacity-75 mt-2">
        You're using the one-time placeholder password. Pick a real one (≥ 12 characters).
        After this, the placeholder stops working — you can remove <code>ADMIN_PASSWORD_BOOTSTRAP</code> from your env.
      </p>
      <form
        className="mt-6 space-y-3"
        action={async (formData: FormData) => {
          'use server';
          const next = String(formData.get('newPassword'));
          const confirm = String(formData.get('confirmPassword'));
          if (next.length < 12) throw new Error('Password must be at least 12 characters.');
          if (next !== confirm) throw new Error('Passwords do not match.');
          const passwordHash = await bcrypt.hash(next, 12);
          await db.update(adminSettings)
            .set({ passwordHash, passwordSetAt: new Date(), updatedAt: new Date() })
            .where(eq(adminSettings.id, 1));
          redirect('/admin');
        }}
      >
        <input name="newPassword"     type="password" required minLength={12} className="input input-bordered w-full" placeholder="New password (min 12)" autoComplete="new-password" />
        <input name="confirmPassword" type="password" required minLength={12} className="input input-bordered w-full" placeholder="Confirm new password" autoComplete="new-password" />
        <button className="btn btn-primary w-full">Set password</button>
      </form>
    </main>
  );
}
```

After the user submits, the persistent hash is set, the next request validates against it, `mustChange` becomes false, and `/admin` renders normally. The browser's stored Basic Auth credentials no longer match the bootstrap, so the user will be re-prompted for their new password — that's the one they typed in the form.

### Step 5 — tell the user to delete the bootstrap env var

Once the change-password flow has succeeded, surface a one-line note in the chat:

> *"Done. You can now remove `ADMIN_PASSWORD_BOOTSTRAP` from `.env.local` and Vercel env — it's no longer used. Your real password lives only in the database (as a bcrypt hash)."*

For better UX (custom login form instead of the browser prompt), build `/admin/login` that POSTs the password to a Route Handler, which sets a signed `admin_session` cookie on success. Middleware then checks the cookie. This is a v1.5 upgrade — basic auth + the change-password flow are enough to ship.

## AUTONOMOUS — build the dashboard with up to 9 tabs (subtract any skipped)

`/admin` has up to 9 tabs: **Overview**, **Users**, **Waitlist**, **Usage**, **Notifications**, **Feedback**, **Cost**, **Alerts**, **Features**. (Skip Notifications if the user opted out in the DIALOGUE above — see `STATE.yaml # Decisions`. Skip Feedback the same way if feedback collection was declined. Skip Cost if `decisions.cost_monitoring_enabled` is false. Skip Alerts if `decisions.error_alerts_enabled` is false. Skip Features if `decisions.features_admin_enabled` is false.) Use DaisyUI tabs (`tabs tabs-bordered`) or shadcn-style segmented routes — either works.

```tsx
// app/admin/layout.tsx
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
      </header>
      <nav className="tabs tabs-bordered">
        <Link href="/admin"               className="tab">Overview</Link>
        <Link href="/admin/users"         className="tab">Users</Link>
        <Link href="/admin/waitlist"      className="tab">Waitlist</Link>
        <Link href="/admin/usage"         className="tab">Usage</Link>
        <Link href="/admin/notifications" className="tab">Notifications</Link>
        <Link href="/admin/feedback"      className="tab">Feedback</Link>
        <Link href="/admin/cost"          className="tab">Cost</Link>
        <Link href="/admin/alerts"        className="tab">Alerts</Link>
        <Link href="/admin/features"      className="tab">Features</Link>
      </nav>
      {children}
    </main>
  );
}
```

### Tab 1 — Overview (KPIs)

The original KPI dashboard. Use `unstable_cache` with a 60s revalidate.

```tsx
// app/admin/page.tsx
import { getKpis } from '@/lib/admin-kpis';
import { KpiCards, RetentionChart, TopFeatures } from './components';

export const revalidate = 60;

export default async function AdminOverview() {
  const kpis = await getKpis();
  return (
    <>
      <KpiCards data={kpis.summary} />
      <div className="grid lg:grid-cols-2 gap-4">
        <RetentionChart data={kpis.retention} />
        <TopFeatures data={kpis.topFeatures} />
      </div>
    </>
  );
}
```

Charts: install **recharts** (`npm install recharts`).

### Tab 2 — Users

List every user. Per-row actions: deactivate / reactivate, grant +N usage, view details.

```tsx
// app/admin/users/page.tsx
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { addUserAction, grantUsageAction, deactivateUserAction } from './actions';
import { emailEnabled } from '@/lib/email';

export default async function UsersTab() {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(500);
  return (
    <section className="space-y-6">
      <form action={addUserAction} className="flex gap-2 items-end flex-wrap">
        <label className="form-control flex-1 min-w-[260px]">
          <span className="label-text">Add user by email</span>
          <input name="email" type="email" required className="input input-bordered" placeholder="user@example.com" />
        </label>
        <button className="btn btn-primary" type="submit">
          {emailEnabled ? 'Send invite' : 'Whitelist email'}
        </button>
        <p className="text-xs opacity-70 basis-full">
          {emailEnabled
            ? 'A magic-link invite will be emailed. They click, complete signup, and they\'re in.'
            : 'No email service configured. The user will be allowed to sign up at /signup with a password they choose. Tell them out-of-band.'}
        </p>
      </form>

      <table className="table">
        <thead><tr>
          <th>Email</th><th>Name</th><th>Joined</th><th>Status</th><th>Usage</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {rows.map(u => (
            <tr key={u.id} className={u.deactivatedAt ? 'opacity-50' : ''}>
              <td>{u.email}</td>
              <td>{u.firstName} {u.lastName}</td>
              <td>{u.createdAt.toISOString().slice(0, 10)}</td>
              <td>{u.deactivatedAt ? 'Deactivated' : 'Active'}</td>
              <td>{u.usageConsumed} / {u.usageGranted}</td>
              <td className="space-x-2">
                <form action={grantUsageAction} className="inline">
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="number" name="amount" defaultValue={100} className="input input-xs input-bordered w-16" />
                  <button className="btn btn-xs">Grant</button>
                </form>
                <form action={deactivateUserAction} className="inline">
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="action" value={u.deactivatedAt ? 'reactivate' : 'deactivate'} />
                  <button className="btn btn-xs btn-error">{u.deactivatedAt ? 'Reactivate' : 'Deactivate'}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

`actions.ts`:

```ts
'use server';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { users, allowedEmails } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendEmail, emailEnabled } from '@/lib/email';

export async function addUserAction(formData: FormData) {
  const email = String(formData.get('email')).toLowerCase().trim();
  if (emailEnabled) {
    const raw = crypto.randomBytes(32).toString('base64url');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await db.insert(allowedEmails).values({ email, inviteTokenHash: hash, expiresAt }).onConflictDoUpdate({
      target: allowedEmails.email,
      set: { inviteTokenHash: hash, expiresAt, inviteAcceptedAt: null },
    });
    const url = `${process.env.AUTH_URL}/signup?email=${encodeURIComponent(email)}&token=${raw}`;
    await sendEmail({
      to: email,
      subject: "You're invited",
      html: `<p>You have access. Set up your account here (link expires in 14 days):</p><p><a href="${url}">${url}</a></p>`,
    });
  } else {
    await db.insert(allowedEmails).values({ email }).onConflictDoNothing();
  }
}

export async function grantUsageAction(formData: FormData) {
  const userId = String(formData.get('userId'));
  const amount = Number(formData.get('amount'));
  if (!Number.isFinite(amount) || amount <= 0) return;
  await db.update(users).set({ usageGranted: sql`${users.usageGranted} + ${amount}` }).where(eq(users.id, userId));
}

export async function deactivateUserAction(formData: FormData) {
  const userId = String(formData.get('userId'));
  const action = String(formData.get('action'));
  await db.update(users).set({
    deactivatedAt: action === 'deactivate' ? new Date() : null,
  }).where(eq(users.id, userId));
}
```

Add a global "Grant +N to all active users" form at the top of the tab (one-line server action that updates every non-deactivated user).

### Tab 3 — Waitlist

List every pending waitlist entry. Per-row actions: approve (which calls `addUserAction` under the hood, then marks the waitlist row `approvedAt`), reject.

```tsx
// app/admin/waitlist/page.tsx
import { db } from '@/lib/db';
import { waitlist } from '@/lib/db/schema';
import { isNull, desc } from 'drizzle-orm';
import { approveWaitlistAction, rejectWaitlistAction } from './actions';
import { emailEnabled } from '@/lib/email';

export default async function WaitlistTab() {
  const pending = await db.select().from(waitlist)
    .where(isNull(waitlist.approvedAt))
    .orderBy(desc(waitlist.createdAt));
  return (
    <section className="space-y-4">
      <p className="opacity-75 text-sm">
        Approving {emailEnabled ? 'sends a magic-link invite email.' : 'whitelists the email — tell the user to sign up at /signup with a password they choose.'}
      </p>
      <table className="table">
        <thead><tr><th>Email</th><th>Joined</th><th>Intended use</th><th>Actions</th></tr></thead>
        <tbody>
          {pending.map(w => (
            <tr key={w.id}>
              <td>{w.email}</td>
              <td>{w.createdAt.toISOString().slice(0, 10)}</td>
              <td className="max-w-md truncate">{w.intendedUse ?? '—'}</td>
              <td className="space-x-2">
                <form action={approveWaitlistAction} className="inline">
                  <input type="hidden" name="id" value={w.id} />
                  <button className="btn btn-xs btn-success">Approve</button>
                </form>
                <form action={rejectWaitlistAction} className="inline">
                  <input type="hidden" name="id" value={w.id} />
                  <button className="btn btn-xs btn-ghost">Reject</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

`actions.ts` for the waitlist tab:

```ts
'use server';
import { db } from '@/lib/db';
import { waitlist } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { addUserAction } from '../users/actions';

export async function approveWaitlistAction(formData: FormData) {
  const id = String(formData.get('id'));
  const [w] = await db.select().from(waitlist).where(eq(waitlist.id, id));
  if (!w) return;
  // Reuse addUserAction so the whitelist/invite branch logic lives in one place.
  const fd = new FormData(); fd.set('email', w.email);
  await addUserAction(fd);
  await db.update(waitlist).set({ approvedAt: new Date() }).where(eq(waitlist.id, id));
}

export async function rejectWaitlistAction(formData: FormData) {
  const id = String(formData.get('id'));
  await db.update(waitlist).set({ rejectedAt: new Date() }).where(eq(waitlist.id, id));
}
```

### Tab 4 — Usage

A single page with: total usage today / this week / this month, a chart of daily totals, and the top 20 users by `usageConsumed`. Useful for spotting runaway use and deciding when to top up everyone.

```tsx
// app/admin/usage/page.tsx
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc, sql } from 'drizzle-orm';
import { UsageOverTimeChart } from '../components';
import { grantToAllAction } from './actions';

export default async function UsageTab() {
  const totals = await db.select({
    granted: sql<number>`sum(${users.usageGranted})`,
    consumed: sql<number>`sum(${users.usageConsumed})`,
  }).from(users);
  const top = await db.select().from(users).orderBy(desc(users.usageConsumed)).limit(20);
  return (
    <section className="space-y-6">
      <div className="stats">
        <div className="stat">
          <div className="stat-title">Granted (all users)</div>
          <div className="stat-value">{totals[0].granted}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Consumed</div>
          <div className="stat-value">{totals[0].consumed}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Remaining</div>
          <div className="stat-value">{Number(totals[0].granted) - Number(totals[0].consumed)}</div>
        </div>
      </div>

      <UsageOverTimeChart />

      <form action={grantToAllAction} className="flex gap-2 items-end">
        <label className="form-control">
          <span className="label-text">Grant +N to every active user</span>
          <input name="amount" type="number" defaultValue={100} className="input input-bordered w-32" />
        </label>
        <button className="btn btn-primary">Apply</button>
      </form>

      <table className="table">
        <thead><tr><th>Email</th><th>Consumed / Granted</th><th>Status</th></tr></thead>
        <tbody>
          {top.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.usageConsumed} / {u.usageGranted}</td>
              <td>{u.deactivatedAt ? 'Deactivated' : 'Active'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

For per-day usage you'll need an event log (`usage_events` with `userId`, `createdAt`, `cost`); add it now if you don't have one — it's two columns and a `db.insert` call inside `gatedAiCall`. Aggregate daily totals in `unstable_cache` with a 5-minute revalidate.

### Tab 5 — Notifications

A single page where the founder writes a message and pushes it to all active users or to a hand-picked set. Messages land in the in-app notification surface (the bell icon in the header — see hand-off below). No email is sent from this tab; if email notifications are also wanted, route them through sub-skill 04's email-trigger catalog (e.g., add a "Custom admin announcement" trigger).

**Database schema additions.** Extend `lib/db/schema.ts`:

```ts
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),                       // markdown allowed
  actionUrl: text('action_url'),                      // optional CTA link
  audience: text('audience').notNull(),               // 'all' | 'specific'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: text('created_by').notNull().default('admin'),
});

export const notificationRecipients = pgTable('notification_recipients', {
  notificationId: uuid('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  readAt: timestamp('read_at'),
}, (t) => ({ pk: primaryKey({ columns: [t.notificationId, t.userId] }) }));
```

**Compose form (`app/admin/notifications/page.tsx`).** A single form on this tab with:

- **Audience selector** — radio buttons "All active users" / "Specific users".
- When "Specific users" is selected: a multi-select component (use `<select multiple>` for MVP, or daisyUI's combobox-style if you have it). The server action queries `users` for active rows. Also include a text input "Filter by email" that filters the multi-select live (use a basic client component for filtering).
- **Subject** — text input, required, max 120 chars.
- **Body** — textarea, required, max 2000 chars, markdown allowed (show a small "Markdown supported" hint).
- **Action URL** — optional text input; renders as a CTA button at the bottom of the rendered notification.
- **Send** button.

Below the form, show **Sent history** — a table of past notifications with subject, audience ("All — 47 users" or "3 users"), sent date, read count (`X / Y read`).

**Server action for sending:**

```ts
'use server';
import { db } from '@/lib/db';
import { users, notifications, notificationRecipients } from '@/lib/db/schema';
import { eq, isNull, inArray } from 'drizzle-orm';

export async function sendNotificationAction(formData: FormData) {
  const subject = String(formData.get('subject')).trim();
  const body = String(formData.get('body')).trim();
  const actionUrl = String(formData.get('actionUrl') ?? '').trim() || null;
  const audience = String(formData.get('audience'));         // 'all' | 'specific'
  const userIds = formData.getAll('userIds').map(String);    // empty if 'all'

  if (!subject || !body) return;

  const [n] = await db.insert(notifications).values({ subject, body, actionUrl, audience }).returning();

  let recipients: { id: string }[] = [];
  if (audience === 'all') {
    recipients = await db.select({ id: users.id }).from(users).where(isNull(users.deactivatedAt));
  } else if (userIds.length) {
    recipients = await db.select({ id: users.id }).from(users).where(inArray(users.id, userIds));
  }

  if (recipients.length) {
    await db.insert(notificationRecipients).values(
      recipients.map(r => ({ notificationId: n.id, userId: r.id }))
    );
  }
}
```

Note: this writes only to the in-app notification surface. If the founder also wants emails to go out, they should pick the matching trigger in sub-skill 04's email-trigger analysis (e.g., add a "Custom admin announcement" trigger to the catalog).

### Tab 6 — Feedback

(Skip this entire section if feedback collection was declined in the opening DIALOGUE — see `STATE.yaml # Decisions`.)

**Database schema additions** to `lib/db/schema.ts`:

```ts
export const feedback = pgTable('feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),  // null for anonymous
  surface: text('surface').notNull(),                  // 'general' | <platform-specific surface name>
  rating: integer('rating'),                            // 1-5 thumbs/stars; null for free-text only
  category: text('category'),                           // 'bug' | 'idea' | 'praise' | 'other' | platform-specific
  body: text('body').notNull(),                         // the actual feedback text
  contextUrl: text('context_url'),                      // page URL the feedback was filed from
  contextMeta: jsonb('context_meta'),                   // arbitrary JSON: route params, user state, screenshot URL
  status: text('status').notNull().default('new'),     // 'new' | 'seen' | 'resolved' | 'wontfix'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: text('resolved_by'),                      // 'admin' for now
  internalNote: text('internal_note'),                  // admin-only follow-up notes
});
```

**Admin tab UI** (`app/admin/feedback/page.tsx`):

```tsx
import { db } from '@/lib/db';
import { feedback, users } from '@/lib/db/schema';
import { desc, eq, and, ilike, sql } from 'drizzle-orm';
import { markStatusAction, addNoteAction } from './actions';

export default async function FeedbackTab({ searchParams }: { searchParams: { q?: string; status?: string; surface?: string } }) {
  const conditions = [];
  if (searchParams.q) conditions.push(ilike(feedback.body, `%${searchParams.q}%`));
  if (searchParams.status) conditions.push(eq(feedback.status, searchParams.status));
  if (searchParams.surface) conditions.push(eq(feedback.surface, searchParams.surface));

  const rows = await db.select({
    f: feedback,
    user: { id: users.id, email: users.email, firstName: users.firstName, lastName: users.lastName },
  })
    .from(feedback)
    .leftJoin(users, eq(feedback.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(feedback.createdAt))
    .limit(200);

  // Counts for the filter chips
  const counts = await db.select({
    status: feedback.status,
    count: sql<number>`count(*)::int`,
  }).from(feedback).groupBy(feedback.status);

  return (
    <section className="space-y-4">
      <form className="flex flex-wrap gap-2 items-end">
        <label className="form-control flex-1 min-w-[260px]">
          <span className="label-text">Search feedback</span>
          <input name="q" defaultValue={searchParams.q ?? ''} className="input input-bordered" placeholder="anything in the body…" />
        </label>
        <select name="status" defaultValue={searchParams.status ?? ''} className="select select-bordered">
          <option value="">All statuses</option>
          {['new', 'seen', 'resolved', 'wontfix'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="surface" defaultValue={searchParams.surface ?? ''} className="select select-bordered">
          <option value="">All surfaces</option>
          {/* surfaces are populated from the contextual prompts list — see below */}
          <option value="general">general</option>
        </select>
        <button className="btn btn-primary">Filter</button>
      </form>

      <div className="flex gap-2 text-xs opacity-70">
        {counts.map(c => <span key={c.status}>{c.status}: <strong>{c.count}</strong></span>)}
      </div>

      <ul className="space-y-3">
        {rows.map(({ f, user }) => (
          <li key={f.id} className={`p-4 rounded-lg border ${f.status === 'new' ? 'border-primary/40 bg-primary/5' : 'border-base-300/60'}`}>
            <header className="flex items-baseline justify-between gap-3">
              <div className="text-sm">
                {f.rating != null && <span className="badge badge-sm mr-2">{'★'.repeat(f.rating)}</span>}
                {f.category && <span className="badge badge-ghost badge-sm mr-2">{f.category}</span>}
                <span className="opacity-70">{f.surface}</span>
                <span className="opacity-40 ml-2">·</span>
                <span className="opacity-50 text-xs ml-2">{f.createdAt.toISOString().slice(0, 10)}</span>
              </div>
              <div className="text-xs opacity-60">
                {user ? `${user.firstName ?? ''} ${user.lastName ?? ''} (${user.email})`.trim() : 'anonymous'}
              </div>
            </header>
            <p className="mt-2 whitespace-pre-wrap">{f.body}</p>
            {f.contextUrl && <a href={f.contextUrl} className="link text-xs opacity-70 mt-1 inline-block">{f.contextUrl}</a>}
            <footer className="mt-3 flex flex-wrap gap-2 items-center">
              {(['seen', 'resolved', 'wontfix'] as const).map(s => (
                <form key={s} action={markStatusAction} className="inline">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="status" value={s} />
                  <button className={`btn btn-xs ${f.status === s ? 'btn-primary' : 'btn-ghost border border-base-300/50'}`}>{s}</button>
                </form>
              ))}
            </footer>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

**Server actions** (`app/admin/feedback/actions.ts`):

```ts
'use server';
import { db } from '@/lib/db';
import { feedback } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function markStatusAction(formData: FormData) {
  const id = String(formData.get('id'));
  const status = String(formData.get('status'));
  if (!['new', 'seen', 'resolved', 'wontfix'].includes(status)) return;
  await db.update(feedback).set({
    status,
    resolvedAt: status === 'resolved' || status === 'wontfix' ? new Date() : null,
    resolvedBy: status === 'resolved' || status === 'wontfix' ? 'admin' : null,
  }).where(eq(feedback.id, id));
  revalidatePath('/admin/feedback');
}

export async function addNoteAction(formData: FormData) {
  const id = String(formData.get('id'));
  const note = String(formData.get('internalNote') ?? '').trim() || null;
  await db.update(feedback).set({ internalNote: note }).where(eq(feedback.id, id));
  revalidatePath('/admin/feedback');
}
```

### User-facing feedback form

This is the form that the hamburger menu item opens. **The form fields adapt to the platform.** Default fields (always present):

- **Body** (textarea, required, 10–2000 chars).
- **Category** (radio: Bug / Idea / Praise / Other).
- **Rating** (1–5, optional — show only if the agent thinks it's relevant; SaaS tools often skip, content platforms often include).

**The agent decides per-platform** which fields and which categories make sense. Read `PROJECT.md` audience and idea, then propose to the user:

> *"For your platform, I'd put these fields on the feedback form: \<list\>. Category options: \<list\>. The rating field would be \<included / omitted\> because \<reason\>. Sound right?"*

For example, a developer tool might use categories `Bug | Feature request | Docs unclear | Other`. A creative platform might include a `Compliment a creator` category.

Implementation (`components/FeedbackModal.tsx` — drop-in client component):

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function FeedbackModal({ open, onClose, surface = 'general' }: { open: boolean; onClose: () => void; surface?: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  async function submit(formData: FormData) {
    setSubmitting(true);
    formData.set('surface', surface);
    formData.set('contextUrl', window.location.href);
    const r = await fetch('/api/feedback', { method: 'POST', body: formData });
    setSubmitting(false);
    if (r.ok) { setDone(true); setTimeout(() => { setDone(false); onClose(); router.refresh(); }, 1500); }
  }

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="text-lg font-semibold">Send feedback</h3>
        {done ? (
          <p className="mt-4 text-success">Thanks — we read every one of these.</p>
        ) : (
          <form action={submit} className="space-y-3 mt-4">
            <div className="flex gap-2">
              {/* Categories — agent customizes this list per platform */}
              {['Bug', 'Idea', 'Praise', 'Other'].map(c => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="category" value={c.toLowerCase()} required className="hidden peer" />
                  <span className="btn btn-sm btn-ghost border border-base-300/60 peer-checked:btn-primary">{c}</span>
                </label>
              ))}
            </div>
            <textarea name="body" required minLength={10} maxLength={2000} rows={5}
              className="textarea textarea-bordered w-full" placeholder="Tell us what's on your mind…" />
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
              <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Sending…' : 'Send'}</button>
            </div>
          </form>
        )}
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}
```

**API endpoint** (`app/api/feedback/route.ts`):

```ts
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { feedback } from '@/lib/db/schema';
import { limiters, clientKey } from '@/lib/rate-limit';
import { z } from 'zod';

const Schema = z.object({
  surface: z.string().min(1).max(64),
  category: z.enum(['bug', 'idea', 'praise', 'other']),  // or whatever the agent customized to
  body: z.string().min(10).max(2000),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  contextUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  // Rate-limit feedback to stop drive-by spam (per-IP, generous).
  const r = await limiters.general.limit(clientKey(req));
  if (!r.success) return Response.json({ error: 'rate_limited' }, { status: 429 });

  const session = await auth();
  const fd = await req.formData();
  const parsed = Schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return Response.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });

  await db.insert(feedback).values({
    userId: session?.user?.id ?? null,
    surface: parsed.data.surface,
    category: parsed.data.category,
    body: parsed.data.body,
    rating: parsed.data.rating ?? null,
    contextUrl: parsed.data.contextUrl ?? null,
  });

  return Response.json({ ok: true });
}
```

### Platform-unique feedback surfaces

The agent **analyzes the product and proposes 2–3 contextual feedback prompts**. Read `PROJECT.md` (idea + audience + MVP slice). Match against patterns:

| Platform pattern | Suggested contextual surface |
| --- | --- |
| User-generated content (recipes, posts, listings) | After view: "How was this {item}?" thumbs up/down |
| AI feature with subjective output (image generation, summaries, recommendations) | Inline thumb up/down on each AI response with optional comment |
| Workflow tool with discrete tasks completed | After task complete: "Did this take more time than expected?" |
| Long-form content / tutorials / docs | Bottom-of-page: "Was this helpful?" yes/no/partially |
| Onboarding flow | After completion of first 60-second flow: "Anything confusing?" |
| Empty / error states | "We're sorry — tell us what you were trying to do?" |
| Admin dashboard / data view | "Find this view useful?" thumb up/down with optional comment |

Propose to the user:

> *"For your platform, the most valuable feedback surfaces would be:*
> *1. \<surface 1 + one-sentence rationale\>*
> *2. \<surface 2 + one-sentence rationale\>*
> *3. \<surface 3 + one-sentence rationale\>*
>
> *Each one shows a tiny prompt at the right moment, captures the response, tags it with the surface name so you can filter in the admin tab. Keep all 3, drop one, swap one?"*

Then implement each as a small `<FeedbackPrompt surface="X" />` client component that, on click, opens the same `FeedbackModal` with a pre-filled `surface` prop. Each prompt is one or two lines of JSX in the relevant page/component.

Persist the agreed list in `STATE.yaml # Decisions` as `feedback_surfaces: [<list>]`.

### Hamburger menu wiring (cross-references sub-skill 02)

Add a "Feedback" link to the hamburger menu (defined in 02-design item #10). The link is a button (not a nav link) that opens `<FeedbackModal surface="general" />`.

```tsx
// Inside the hamburger menu component:
<button onClick={() => setFeedbackOpen(true)} className="menu-item">
  <MessageCircle className="w-4 h-4" /> Feedback
</button>
{feedbackOpen && <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />}
```

### Tab 7 — Cost Monitoring

The founder needs full awareness of and control over service costs. Surprise bills are an existential MVP risk — a viral mention plus uncapped LLM costs equals a $5,000 wake-up call. The Cost tab makes spend visible and ceilings enforceable.

**Schema additions** to `lib/db/schema.ts`:

```ts
// Documented unit costs per service. Seeded by the agent at setup with
// current published prices; user can override in the UI when they have a
// negotiated rate.
export const serviceUnitCosts = pgTable('service_unit_costs', {
  service: text('service').primaryKey(),       // 'openai_gpt5_nano' | 'resend_email' | 'vercel_function_invocation' | 'stripe_processing_fee' | 'neon_compute_hour' | ...
  unit_label: text('unit_label').notNull(),    // 'per 1k input tokens', 'per email', 'per invocation', 'per $1 charged', 'per compute-hour'
  unit_cost_usd: numeric('unit_cost_usd', { precision: 12, scale: 8 }).notNull(),
  source: text('source'),                      // 'OpenAI pricing page 2026-04-01' — the agent records when prices were last verified
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Aggregated usage per service, per day. Updated nightly from underlying
// event tables (user_actions, request_metrics, ai_cache misses, etc.).
export const serviceUsageDaily = pgTable('service_usage_daily', {
  id: uuid('id').defaultRandom().primaryKey(),
  service: text('service').notNull(),
  day: date('day').notNull(),
  units: numeric('units', { precision: 18, scale: 4 }).notNull(),    // tokens / emails / invocations / dollars-charged / compute-hours
  cost_usd: numeric('cost_usd', { precision: 12, scale: 4 }).notNull(),
}, (t) => ({ uniq: unique().on(t.service, t.day) }));

// User-set per-service monthly ceilings. Read from STATE.yaml at first run,
// editable in the Cost tab afterwards.
export const serviceCeilings = pgTable('service_ceilings', {
  service: text('service').primaryKey(),
  monthly_cap_usd: numeric('monthly_cap_usd', { precision: 12, scale: 2 }).notNull(),
  alert_at_pct: integer('alert_at_pct').notNull().default(80),    // alert when this fraction of the cap is hit
  hard_block: boolean('hard_block').notNull().default(false),     // true = stop calling the service when cap hit; false = alert only
});
```

**Daily aggregator** (cron job at 02:00 UTC, sub-skill 14 wires the schedule):

```ts
// app/api/internal/cron/cost-rollup/route.ts
import { db } from '@/lib/db';
import { userActions, requestMetrics, aiCache, serviceUsageDaily, serviceUnitCosts } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(req: Request) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) return new Response('forbidden', { status: 403 });
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Aggregate per service. Each service has its own SQL — examples:
  await db.execute(sql`
    insert into service_usage_daily (service, day, units, cost_usd)
    select 'openai_gpt5_nano', date_trunc('day', created_at)::date,
      sum((properties->>'tokens')::numeric),
      sum((properties->>'tokens')::numeric / 1000) * (select unit_cost_usd from service_unit_costs where service = 'openai_gpt5_nano')
    from user_actions
    where event = 'ai.call' and date_trunc('day', created_at)::date = ${yesterday}
    group by 2
    on conflict (service, day) do update set units = excluded.units, cost_usd = excluded.cost_usd
  `);
  // Resend emails, Vercel function invocations, Stripe fees, Neon compute hours similar.

  // After rollup, check ceilings — if month-to-date >= alert_at_pct of monthly_cap, fire an alert.
  await checkCeilingsAndAlert();
  return Response.json({ ok: true });
}
```

**Tab UI** (`app/admin/cost/page.tsx`):

```tsx
import { db } from '@/lib/db';
import { serviceUsageDaily, serviceCeilings, serviceUnitCosts } from '@/lib/db/schema';
import { setCeilingAction } from './actions';
import { sql } from 'drizzle-orm';

export default async function CostTab() {
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const mtd = await db.execute(sql`
    select service,
      sum(units) as units,
      sum(cost_usd) as cost_usd
    from service_usage_daily
    where day >= ${monthStart.toISOString().slice(0, 10)}
    group by service
    order by cost_usd desc
  `);
  const ceilings = await db.select().from(serviceCeilings);
  const ceilingByService = Object.fromEntries(ceilings.map(c => [c.service, c]));

  return (
    <section className="space-y-6">
      <div className="stats">
        <div className="stat">
          <div className="stat-title">Month-to-date spend</div>
          <div className="stat-value">${Number(mtd.reduce((acc, r) => acc + Number(r.cost_usd ?? 0), 0)).toFixed(2)}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Projected monthly</div>
          <div className="stat-value">${projectMonthly(mtd).toFixed(2)}</div>
          <div className="stat-desc opacity-70">Linear projection from current pace</div>
        </div>
      </div>

      <table className="table">
        <thead><tr><th>Service</th><th>Units this month</th><th>Spend</th><th>Ceiling</th><th>% used</th><th>Set ceiling</th></tr></thead>
        <tbody>
          {mtd.map(row => {
            const c = ceilingByService[row.service];
            const cap = c ? Number(c.monthly_cap_usd) : null;
            const pct = cap ? (Number(row.cost_usd) / cap) * 100 : null;
            const overAlert = pct !== null && pct >= (c?.alert_at_pct ?? 80);
            return (
              <tr key={row.service} className={overAlert ? 'bg-warning/10' : ''}>
                <td>{row.service}</td>
                <td>{Number(row.units).toLocaleString()}</td>
                <td>${Number(row.cost_usd).toFixed(2)}</td>
                <td>{cap ? `$${cap.toFixed(2)}` : <span className="opacity-40">no cap</span>}</td>
                <td>{pct !== null ? `${pct.toFixed(0)}%` : '—'}</td>
                <td>
                  <form action={setCeilingAction} className="inline">
                    <input type="hidden" name="service" value={row.service} />
                    <input type="number" name="monthly_cap_usd" step={1} min={0} defaultValue={cap ?? ''} className="input input-bordered input-xs w-20" placeholder="0" />
                    <button className="btn btn-xs ml-1">Save</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <details className="text-xs opacity-70">
        <summary>Unit prices (verified by the agent at setup; edit if you have a negotiated rate)</summary>
        <ul className="mt-2 ml-4 list-disc">
          {(await db.select().from(serviceUnitCosts)).map(p => (
            <li key={p.service}>{p.service} — ${Number(p.unit_cost_usd).toFixed(8)} {p.unit_label} (verified {p.source ?? 'unknown'})</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function projectMonthly(mtd: { cost_usd: number | string }[]): number {
  const total = mtd.reduce((acc, r) => acc + Number(r.cost_usd ?? 0), 0);
  const today = new Date().getUTCDate();
  const daysInMonth = new Date(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0).getUTCDate();
  return (total / today) * daysInMonth;
}
```

**Hard-block enforcement**: when `serviceCeilings.hard_block` is true and month-to-date cost ≥ ceiling, the relevant call site refuses to call the upstream service. Per service:

- OpenAI: `cachedAiCall` (sub-skill 05) checks ceiling first; throws `BudgetExhausted` if at cap.
- Resend / SendGrid: `sendEmail` (sub-skill 04) throws if at cap. Critical-class transactional emails (password reset) bypass the cap with a logged warning; lifecycle emails respect the cap.
- Stripe: not directly cappable, but a high `stripe_processing` projection means the founder is taking lots of revenue (good problem). The cap here is mostly informational.

**Anti-patterns**:
- Setting cost ceilings only in dev. **Production env vars must include** `*_MONTHLY_CAP_USD` for every external service that costs money.
- Forgetting to seed `service_unit_costs`. The agent verifies all current prices on the relevant pricing pages at setup and again whenever the user explicitly asks.
- Hard-blocking transactional email at the cap. Password reset email failing because of a budget cap is worse than the budget overage. Critical email bypasses; lifecycle respects.

### Tab 8 — Alerts

The Alerts tab is where production errors and ceiling-breach events land. The agent wires error capture (Sentry or self-hosted equivalent) and dispatch to the founder's email via Resend.

**Schema additions** to `lib/db/schema.ts`:

```ts
export const alertEvents = pgTable('alert_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  level: text('level').notNull(),                      // 'info' | 'warn' | 'error' | 'critical'
  source: text('source').notNull(),                    // 'sentry' | 'cost_ceiling' | 'health_check' | 'manual'
  title: text('title').notNull(),                      // short description
  body: text('body').notNull(),                        // markdown allowed; full context
  context: jsonb('context'),                           // structured payload (route, user_id if relevant, stack trace)
  status: text('status').notNull().default('new'),     // 'new' | 'acknowledged' | 'resolved'
  dispatched_to: text('dispatched_to'),                // email address email was sent to (or null)
  dispatched_at: timestamp('dispatched_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  acknowledgedAt: timestamp('acknowledged_at'),
  resolvedAt: timestamp('resolved_at'),
});
```

**Email dispatch** — fires when an event is created at level `warn`+ AND `STATE.yaml decisions.error_alerts_enabled === true` AND email service is configured (sub-skill 04):

```ts
// lib/alerts.ts
import 'server-only';
import { db } from '@/lib/db';
import { alertEvents } from '@/lib/db/schema';
import { sendEmail, emailEnabled } from '@/lib/email';

const ALERT_RECIPIENT = process.env.ALERT_EMAIL_RECIPIENT ?? '';   // founder's email, set at setup
const FREQUENCY_CAP_MINUTES = 15;                                  // don't email for the same source+title more than once per 15min

export async function alert(args: {
  level: 'info' | 'warn' | 'error' | 'critical';
  source: string;
  title: string;
  body: string;
  context?: Record<string, unknown>;
}) {
  const [row] = await db.insert(alertEvents).values({
    level: args.level, source: args.source, title: args.title, body: args.body, context: args.context,
  }).returning();

  if (args.level === 'info') return;                     // info doesn't trigger email
  if (!emailEnabled || !ALERT_RECIPIENT) return;
  // Frequency-cap: skip if we already emailed this source+title in the last N minutes.
  const recent = await db.execute(sql`
    select 1 from alert_events
    where source = ${args.source} and title = ${args.title}
    and dispatched_at > now() - interval '${FREQUENCY_CAP_MINUTES} minutes'
    limit 1
  `);
  if (recent.length) return;

  await sendEmail({
    to: ALERT_RECIPIENT,
    subject: `[${args.level.toUpperCase()}] ${args.title}`,
    html: `<h2>${args.title}</h2><p>${args.body}</p><pre style="background:#f4f4f5;padding:12px;border-radius:6px">${JSON.stringify(args.context ?? {}, null, 2)}</pre><p><a href="${process.env.AUTH_URL}/admin/alerts">View in admin</a></p>`,
  }).catch(() => {});

  await db.update(alertEvents).set({ dispatched_to: ALERT_RECIPIENT, dispatched_at: new Date() })
    .where(eq(alertEvents.id, row.id));
}
```

**Sources of alerts** — wired from these places:

- Unhandled errors in any Route Handler (already captured by `withMetrics` from sub-skill 08; extend it to call `alert()` when `status >= 500`).
- Cost-ceiling breaches (cost rollup cron — see Tab 7).
- Health check failures (synthetic probe of `/api/health` from a Vercel Cron every 5 min).
- Webhook delivery failures (Stripe / Resend webhook handlers post `error` alerts when their internal handler throws).
- Manual `alert()` calls from anywhere the agent decides matters.

**Sentry integration (optional, recommended)** — for richer client-side error capture (uncaught React errors, source-mapped stack traces, breadcrumbs). When configured (env: `SENTRY_DSN`), the agent wires `@sentry/nextjs` and forwards Sentry's high-severity events into the same `alertEvents` table via Sentry webhook to `/api/internal/sentry-webhook`.

**Tab UI** (`app/admin/alerts/page.tsx`):

```tsx
import { db } from '@/lib/db';
import { alertEvents } from '@/lib/db/schema';
import { eq, desc, and, ilike } from 'drizzle-orm';
import { ackAction, resolveAction, testAlertAction } from './actions';

export default async function AlertsTab({ searchParams }: { searchParams: { level?: string; status?: string } }) {
  const conds = [];
  if (searchParams.level) conds.push(eq(alertEvents.level, searchParams.level));
  if (searchParams.status) conds.push(eq(alertEvents.status, searchParams.status));
  const rows = await db.select().from(alertEvents)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(alertEvents.createdAt))
    .limit(200);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <form className="flex gap-2 items-end">
          <select name="level" defaultValue={searchParams.level ?? ''} className="select select-bordered select-sm">
            <option value="">All levels</option>
            {['info', 'warn', 'error', 'critical'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select name="status" defaultValue={searchParams.status ?? ''} className="select select-bordered select-sm">
            <option value="">All statuses</option>
            {['new', 'acknowledged', 'resolved'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-sm">Filter</button>
        </form>
        <form action={testAlertAction}>
          <button className="btn btn-sm btn-ghost border border-base-300/60">Send test alert</button>
        </form>
      </header>

      <ul className="space-y-2">
        {rows.map(r => (
          <li key={r.id} className={`p-4 rounded-lg border ${r.status === 'new' ? 'border-warning/40 bg-warning/5' : 'border-base-300/60'}`}>
            <div className="flex items-baseline justify-between">
              <div>
                <span className={`badge badge-sm mr-2 ${r.level === 'critical' ? 'badge-error' : r.level === 'error' ? 'badge-error opacity-80' : r.level === 'warn' ? 'badge-warning' : 'badge-info'}`}>{r.level}</span>
                <span className="opacity-70 text-xs mr-2">{r.source}</span>
                <strong>{r.title}</strong>
              </div>
              <span className="text-xs opacity-60">{r.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</span>
            </div>
            <p className="mt-2 text-sm opacity-80 whitespace-pre-wrap">{r.body}</p>
            {r.context && <pre className="mt-2 text-xs bg-base-200 p-2 rounded overflow-x-auto">{JSON.stringify(r.context, null, 2)}</pre>}
            <footer className="mt-3 flex gap-2 items-center text-xs opacity-70">
              {r.dispatched_to && <span>📧 sent to {r.dispatched_to} at {r.dispatched_at?.toISOString().slice(11, 16)}</span>}
              <div className="ml-auto flex gap-1">
                <form action={ackAction} className="inline">
                  <input type="hidden" name="id" value={r.id} />
                  <button className={`btn btn-xs ${r.status === 'acknowledged' ? 'btn-primary' : 'btn-ghost border border-base-300/50'}`} disabled={r.status !== 'new'}>Ack</button>
                </form>
                <form action={resolveAction} className="inline">
                  <input type="hidden" name="id" value={r.id} />
                  <button className={`btn btn-xs ${r.status === 'resolved' ? 'btn-success' : 'btn-ghost border border-base-300/50'}`}>Resolve</button>
                </form>
              </div>
            </footer>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

**Frequency-capping**: the dispatcher above caps email sends to once per `(source, title)` per 15 minutes. Without this, a tight loop of errors would email the founder hundreds of times. The DB still records every event; only the email is rate-limited.

**Test alert button** — fires a synthetic event so the founder can verify their email gets delivered before relying on the system.

**Anti-patterns**:
- Alerting on every `info` and `warn`. The founder will start ignoring the inbox. Default to `error`+ for email; `warn` shows in the tab without email.
- No frequency cap. A 100-rps error spike emails the founder 100x/sec.
- Alerts that don't link to the admin tab. The email should always include a link to `/admin/alerts` for context.
- Storing the user's email PII in the alert body. Logs PII rules from sub-skill 11 still apply — redact via the same scrubber.

### Tab 9 — Features

Feature flags let the admin toggle features on/off **at runtime** (no deploy needed), schedule features to activate on a future date/time, and roll out gradually by percentage. Pairs with sub-skill 13's `feature_flags` table.

**Tab UI** (`app/admin/features/page.tsx`):

```tsx
import { db } from '@/lib/db';
import { featureFlags } from '@/lib/db/schema';
import { setFlagAction, scheduleFlagAction, deleteFlagAction } from './actions';
import { desc } from 'drizzle-orm';

export default async function FeaturesTab() {
  const flags = await db.select().from(featureFlags).orderBy(desc(featureFlags.updatedAt));
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Feature flags</h2>
        <p className="text-sm opacity-70">Toggle features at runtime. Schedule activations. Roll out by percentage.</p>
      </header>

      <table className="table">
        <thead><tr>
          <th>Flag</th><th>Status</th><th>Rollout</th><th>Scheduled activation</th><th>Updated</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {flags.map(f => (
            <tr key={f.key} className={f.enabled ? '' : 'opacity-60'}>
              <td>
                <div className="font-mono text-sm">{f.key}</div>
                {f.description && <div className="text-xs opacity-70">{f.description}</div>}
              </td>
              <td>
                <form action={setFlagAction} className="inline">
                  <input type="hidden" name="key" value={f.key} />
                  <input type="hidden" name="enabled" value={String(!f.enabled)} />
                  <button className={`btn btn-xs ${f.enabled ? 'btn-success' : 'btn-ghost border border-base-300/60'}`}>
                    {f.enabled ? 'On' : 'Off'}
                  </button>
                </form>
              </td>
              <td>
                <form action={setFlagAction} className="inline">
                  <input type="hidden" name="key" value={f.key} />
                  <input type="hidden" name="rollout_pct" value={String(f.rolloutPct ?? 100)} />
                  <input type="number" name="rolloutPct" min={0} max={100} step={5} defaultValue={f.rolloutPct ?? 100}
                    className="input input-xs input-bordered w-16" /> %
                  <button className="btn btn-xs ml-1">Save</button>
                </form>
              </td>
              <td>
                <form action={scheduleFlagAction} className="inline">
                  <input type="hidden" name="key" value={f.key} />
                  <input type="datetime-local" name="scheduled_activation"
                    defaultValue={f.scheduledActivation?.toISOString().slice(0, 16) ?? ''}
                    className="input input-xs input-bordered" />
                  <button className="btn btn-xs ml-1">Set</button>
                </form>
              </td>
              <td className="text-xs opacity-60">{f.updatedAt.toISOString().slice(0, 16).replace('T', ' ')}</td>
              <td>
                <form action={deleteFlagAction} className="inline">
                  <input type="hidden" name="key" value={f.key} />
                  <button className="btn btn-xs btn-ghost text-error">Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

**Server actions** (`app/admin/features/actions.ts`):

```ts
'use server';
import { db } from '@/lib/db';
import { featureFlags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function setFlagAction(formData: FormData) {
  const key = String(formData.get('key'));
  const enabled = formData.get('enabled') === 'true';
  const rolloutPct = formData.get('rolloutPct') !== null ? Number(formData.get('rolloutPct')) : undefined;
  await db.update(featureFlags).set({
    enabled,
    ...(rolloutPct !== undefined ? { rolloutPct } : {}),
    updatedAt: new Date(),
  }).where(eq(featureFlags.key, key));
  revalidatePath('/admin/features');
}

export async function scheduleFlagAction(formData: FormData) {
  const key = String(formData.get('key'));
  const dt = String(formData.get('scheduled_activation'));
  await db.update(featureFlags).set({
    scheduledActivation: dt ? new Date(dt) : null,
    updatedAt: new Date(),
  }).where(eq(featureFlags.key, key));
  revalidatePath('/admin/features');
}

export async function deleteFlagAction(formData: FormData) {
  const key = String(formData.get('key'));
  await db.delete(featureFlags).where(eq(featureFlags.key, key));
  revalidatePath('/admin/features');
}
```

**Cron for scheduled activations** (extend the lifecycle cron from sub-skill 04):

```ts
// inside the daily cron
import { featureFlags } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

await db.update(featureFlags)
  .set({ enabled: true, scheduledActivation: null, updatedAt: new Date() })
  .where(sql`scheduled_activation is not null and scheduled_activation <= now() and enabled = false`);
```

So a flag with `scheduled_activation = '2026-06-01 09:00:00'` automatically flips on at that moment without manual intervention.

**Add flags from code**: when the developer adds a `flag('new_dashboard', userId)` call in code (sub-skill 13's helper), the agent appends a row to `featureFlags` with sensible defaults (`enabled: false`, `rollout_pct: 0`, description: derived from the call site). New flags appear in the Features tab automatically; the founder doesn't need to know they were added.

## Hand-off to the header bell icon (sub-skill 02)

The bell icon lives in the global header rule defined by sub-skill 02 (design). This admin sub-skill owns the data layer and the API contract; sub-skill 02 owns the front-end rendering of the bell, the dropdown, and the unread badge.

The bell needs three endpoints, all scoped to the currently signed-in user via `auth()`:

- **Unread count** — `GET /api/notifications/unread-count` returns `{ count: number }`. Cache for 30s on the client.
- **Recent list** — `GET /api/notifications/recent?limit=10` returns the 10 most recent notifications addressed to the current user, each with `readAt` so the client can style unread ones bold.
- **Mark read** — `POST /api/notifications/mark-read` with body `{ notificationId }` (or `{ all: true }` for "mark all read") sets `readAt` on the join row(s).

Stub route handlers:

```ts
// app/api/notifications/unread-count/route.ts
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { notificationRecipients } from '@/lib/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ count: 0 });
  const [row] = await db.select({ count: sql<number>`count(*)::int` })
    .from(notificationRecipients)
    .where(and(eq(notificationRecipients.userId, session.user.id), isNull(notificationRecipients.readAt)));
  return Response.json({ count: row?.count ?? 0 });
}
```

```ts
// app/api/notifications/recent/route.ts
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { notifications, notificationRecipients } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ items: [] });
  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit') ?? 10), 50);
  const items = await db.select({
    id: notifications.id,
    subject: notifications.subject,
    body: notifications.body,
    actionUrl: notifications.actionUrl,
    createdAt: notifications.createdAt,
    readAt: notificationRecipients.readAt,
  })
    .from(notificationRecipients)
    .innerJoin(notifications, eq(notifications.id, notificationRecipients.notificationId))
    .where(eq(notificationRecipients.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return Response.json({ items });
}
```

```ts
// app/api/notifications/mark-read/route.ts
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { notificationRecipients } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });
  const { notificationId, all } = await req.json();
  if (all) {
    await db.update(notificationRecipients)
      .set({ readAt: new Date() })
      .where(and(eq(notificationRecipients.userId, session.user.id), isNull(notificationRecipients.readAt)));
  } else if (notificationId) {
    await db.update(notificationRecipients)
      .set({ readAt: new Date() })
      .where(and(
        eq(notificationRecipients.userId, session.user.id),
        eq(notificationRecipients.notificationId, String(notificationId)),
      ));
  }
  return Response.json({ ok: true });
}
```

The header bell consumes these three endpoints; the agent wires the front-end in sub-skill 02 when building the header. If the founder opted out of notifications in the opening DIALOGUE, sub-skill 02 should leave the bell out of the header entirely — `STATE.yaml # Decisions` is the source of truth.

## Cache aggressively

Aggregation queries are the slow part. `unstable_cache` for 60s on the Overview tab, 5 minutes on Usage. Per-row admin actions invalidate via `revalidatePath('/admin/users')` etc.

## Don't link to it from the public site

Don't add an "Admin" link to the public nav. The founder bookmarks `/admin` themselves. The fewer signals that the route exists, the less attack surface.

## Anti-patterns to avoid

- **Google-Analytics-style dashboards.** The founder wants 5 numbers that decide whether to keep going, not 50 charts that don't.
- **Building before measuring.** If a chart can't be computed because the data isn't captured, instrument first or drop the chart.
- **Hardcoding the admin password.** Always env var. Rotate-able.
- **A weak admin password.** Use `openssl rand -base64 32`. Don't let the user pick something memorable.
- **Skipping the codebase analysis.** A generic dashboard tells the founder nothing they didn't already know.
- **Letting a deactivated user keep a session.** Auth.js's Credentials `authorize` callback already rejects users with `deactivatedAt`; for OAuth/magic-link, also reject in the `signIn` callback.
- **Sending the invite email from a different code path than `lib/email.ts`.** Single helper, single template, single sender.
- **Granting unlimited usage by default.** Set a finite `INITIAL_USAGE_GRANT`. You can always grant more from the dashboard.

## Exit criteria

- `ADMIN_PASSWORD_BOOTSTRAP` was generated, shown once, and used for the first login; the user has since changed it via `/admin/change-password` and the persistent bcrypt hash is stored in `admin_settings.password_hash`. `INITIAL_USAGE_GRANT` is in `.env.local` (and Vercel env after deploy), gitignored.
- Visiting `/admin` without credentials returns 401.
- Visiting `/admin` with the correct password renders the up to 9-tab dashboard (subtract any skipped: Notifications / Feedback / Cost / Alerts / Features).
- **Overview** renders 4–6 KPIs with real data.
- **Users** lists users; Add User works (sends invite if email is configured, whitelists otherwise); Grant +N works; Deactivate / Reactivate works.
- **Waitlist** lists pending entries; Approve moves the email to `allowedEmails` (and sends an invite if email is configured); Reject works.
- **Usage** shows totals, top-20-by-usage, and a Grant-+N-to-all-active-users form.
- **Notifications** tab works: send to all, send to specific users (multi-select with email filter), sent-history table with read counts.
- DB has `notifications` and `notification_recipients` tables.
- The three header bell endpoints (`/api/notifications/unread-count`, `/api/notifications/recent`, `/api/notifications/mark-read`) exist and return correct data for the signed-in user.
- `STATE.yaml # Decisions` records whether notifications are enabled (so sub-skill 02 knows whether to render the bell).
- Feedback collection is wired (or explicitly skipped, recorded in `STATE.yaml`).
- If wired: `feedback` schema exists; `/admin/feedback` tab works (search, filter by status, mark seen/resolved/wontfix); `/api/feedback` endpoint accepts submissions, rate-limited; hamburger menu has the Feedback item; agreed contextual prompts are placed at the surfaces decided with the user; `feedback_surfaces` list is in `STATE.yaml # Decisions`.
- Cost Monitoring tab works (enabled or explicitly skipped). If enabled: `serviceUnitCosts` seeded with verified prices, daily rollup cron runs, ceilings settable per-service in the UI, hard-block respected on at-capacity calls.
- Alerts tab works (enabled or explicitly skipped). If enabled: `alert()` is wired into Route Handler errors (via `withMetrics` extension), webhook handler errors, cost ceiling breaches, and health checks. Email dispatch fires for `error`+ levels through Resend (or SendGrid). Frequency-capped at once per 15 min per `(source, title)`. Test alert button verified end-to-end before exit.
- Features tab works (or explicitly skipped). If enabled: `feature_flags` table seeded; admin can toggle / set rollout % / schedule activation; scheduled activations fire via cron; new code-side `flag()` calls auto-register flags into the table.
- Any new instrumentation is documented under `# Decisions` in `PROJECT.md`.

Move on to `08-analytics.md` (or skip to `09-monetization.md` if analytics aren't in scope for this mode).
