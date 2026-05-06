# 04 · Auth (signup, login, verification, access modes)

Goal: pick the simplest user authentication that fits the audience and the **access model** chosen in sub-skill 01, then wire the full flow — signup, login, sign-out, password reset, and (when needed) email verification — without rolling your own session logic.

This sub-skill assumes sub-skill 03 (compliance) has already produced the Terms of Service and Privacy Policy pages. The signup form built here links to them and records consent against their version.

## DIALOGUE — confirm the access model

Look up the access model from `PROJECT.md # Decisions`. Reaffirm with the user, because it changes everything that follows:

| Access model | What this sub-skill builds |
| --- | --- |
| **Open signup** | Public signup form, anyone can register, immediate access. |
| **Free beta with waitlist** | Public waitlist form (email + optional intro). Signup is **gated** until an admin (sub-skill 07) approves the email. Approved users can self-register with a password they choose. |
| **Paid beta** | Same as open or waitlist, plus a Stripe-gated step (sub-skill 08) before the user can use the product. |

Then ask one or two more:

1. **How do you want users to sign in once they have access?**
   - **Email + password** (most common when admins want to whitelist specific emails). Requires email service for password reset and (recommended) for email verification.
   - **Magic link only** (passwordless). Friendlier; requires email service.
   - **OAuth only** (Google / GitHub). No email service needed for sign-in but you'll still want one for invites / password reset on credentials accounts.
2. **Will user data be tied to accounts?** (Determines whether a database is part of this step — yes for any waitlist/paid-beta product.)

## AUTONOMOUS — pick the stack

| User experience | Use |
| --- | --- |
| No login | Skip this skill |
| Magic link only | **Auth.js v5** Email provider + **Resend** |
| OAuth only | **Auth.js v5** with Google &/or GitHub providers |
| Email + password (with verification + reset) | **Auth.js v5** Credentials provider + Drizzle/Prisma + **Resend** |
| Phone / SMS | **Clerk** (paid; warn the user) |

Default for **free beta with waitlist or paid beta**: **Auth.js v5 Credentials (email + password) + Drizzle + Resend**, because the admin-controlled access pattern works best when each user explicitly sets a password they own (no email-roundtrip every login). Magic link is fine too if email reliability is high.

Default for **open signup**: **Auth.js v5 with magic link via Resend, plus Google as a one-tap option.** Lowest friction.

## Implementation rules (apply to every path)

- Never write your own password hashing or session storage. If you find yourself reading `bcrypt` docs, stop and reconsider — use `bcryptjs` via Auth.js's Credentials adapter, never hand-roll it.
- Walk the user through every external console (Google Cloud, GitHub OAuth, Resend) step-by-step. Don't assume they've done it before.
- Store all credentials in `.env.local`:
  ```
  AUTH_SECRET=...           # generate with `openssl rand -base64 32`
  AUTH_GOOGLE_ID=...
  AUTH_GOOGLE_SECRET=...
  AUTH_GITHUB_ID=...
  AUTH_GITHUB_SECRET=...
  RESEND_API_KEY=re_...
  EMAIL_FROM="App <onboarding@resend.dev>"   # use Resend default until a domain is verified
  ACCESS_MODE=open|waitlist|paid
  ```
- Build one `/login` page (DaisyUI `btn` + provider logos is enough) and a sign-out button visible from the authed shell. Don't invent custom auth UI in v1.
- One `auth()` server-side check per protected route. Don't sprinkle checks throughout components.

## Email service — Resend (default) or SendGrid (alternative)

If the chosen path needs email (magic link, password verification, password reset, or admin invites), set up an email provider.

Ask first:

> *"Default email service is Resend (free tier, simplest setup). If you already have a SendGrid account from another project, we can use it instead. Either works. Which do you have or prefer?"*

Before asking, run `grep -qE '^(RESEND_API_KEY|SENDGRID_API_KEY)=' .env.local 2>/dev/null && echo found`. If one is already set, skip the corresponding walkthrough.

### Resend walkthrough (default)

Walk the user through it:

1. *"Open https://resend.com/signup."*
2. *"Sign up (Google or email both work). Verify your email if asked."*
3. *"Once you're in, go to https://resend.com/api-keys."*
4. *"Click **Create API Key**. Name it after the project. **Sending Access** scope is fine. Copy the key &mdash; you won't see it again. Paste it here."*

Append to `.env.local`:
```
RESEND_API_KEY=re_...
EMAIL_FROM="App <onboarding@resend.dev>"
```

`onboarding@resend.dev` is Resend's shared sender that works immediately without verifying a domain. For production, the user should add their own domain in Resend (DNS records: SPF, DKIM, MX) and switch `EMAIL_FROM` to `noreply@<their-domain>`. That's a sub-skill 14 (domain) follow-up.

### SendGrid walkthrough (alternative)

Walk the user through it:

1. *"Open https://signup.sendgrid.com if you don't have an account."*
2. *"Sign in. Settings → API Keys → Create API Key. Choose 'Restricted Access' and grant 'Mail Send: Full Access'. Name it after the project. Copy the key."*
3. *"Sender Authentication → Single Sender Verification (fastest path) → add the email you'll send from. Verify it via the email SendGrid sends."*

Append to `.env.local`:
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="App <verified-sender@example.com>"
```

### Install (pick ONE)

Install only the package for the chosen provider — this is an OR, not an AND:

```bash
npm install resend         # if Resend
npm install @sendgrid/mail # if SendGrid
```

### `lib/email.ts` — single entry point

Create `lib/email.ts` as the **single entry point** for every outbound email (signup verification, password reset, admin invite, marketing — all routed through here). It picks the implementation based on which key is set:

```ts
import { Resend } from 'resend';
import sgMail from '@sendgrid/mail';

const FROM = process.env.EMAIL_FROM ?? 'App <onboarding@resend.dev>';
const useResend = Boolean(process.env.RESEND_API_KEY);
const useSendGrid = Boolean(process.env.SENDGRID_API_KEY);

if (useSendGrid) sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
const resend = useResend ? new Resend(process.env.RESEND_API_KEY!) : null;

export const emailEnabled = useResend || useSendGrid;

export async function sendEmail(args: { to: string; subject: string; html: string }) {
  if (!emailEnabled) throw new Error('Email service not configured.');
  if (useResend) {
    const { error } = await resend!.emails.send({ from: FROM, ...args });
    if (error) throw new Error(`Resend send failed: ${error.message}`);
  } else {
    await sgMail.send({ from: FROM, ...args });
  }
}
```

The exported `emailEnabled` boolean lets the admin dashboard (sub-skill 07) branch between *"send an invite email"* and *"just whitelist the address."*

## AUTONOMOUS — analyze the platform and propose email triggers

Once an email service is wired, the agent should figure out **which emails this specific product actually needs** rather than dumping a generic catalogue on the user.

### 1. Read the project context

Read `PROJECT.md` and `STATE.yaml` end-to-end. Pull out:

- **What the product does** (the one-line description and the core user flow).
- **Who uses it** (target audience — consumers, internal team, paid B2B, etc.).
- **Access mode** — open / waitlist / paid (from `PROJECT.md # Decisions`).
- **AI usage limits** — does sub-skill 07's `usageGranted` / `usageConsumed` model apply? (i.e., is this an AI product that meters per-user calls?)
- **Product shape** — content product (posts, comments, subscribers, digests) vs. SaaS tool vs. utility.
- **Stripe / billing** — is sub-skill 08 in scope?
- **Admin flows** — does the admin dashboard issue invites, deactivate users, grant usage?

### 2. Trigger catalog (source of truth)

Pick the triggers that fit the product. Don't propose all of them. The catalog:

- **Universal (any product with auth)**: signup confirmation; email verification (if pre-verification required); password reset; sign-in from a new device (security alert).
- **Waitlist mode**: waitlist confirmation ("we got your request"); approval invite (with one-time signup link); rejection (optional, polite, with reason).
- **Admin invite mode**: admin-issued invite ("You've been invited to join X").
- **Usage-gated AI products**: low-usage warning at 80% consumed; usage exhausted; usage refilled (when admin grants more).
- **Content products**: weekly digest of new posts; comment notification; subscriber confirmation.
- **Paid beta / Stripe**: subscription receipt; failed payment; subscription cancelled; renewal reminder (3 days before).
- **Engagement**: re-engagement after N days inactive; first-action celebration ("you did your first X!"); milestone unlocks.
- **Lifecycle**: account deactivation notice (when admin deactivates); data export ready (when user requests via sub-skill 03's `/account/data`).

### 3. Present the proposed list

Show the user a markdown table — one row per proposed trigger. Use the same columns:

| Trigger | When it fires | Why it's worth including for your product |
| --- | --- | --- |
| Signup confirmation | First successful signup | Confirms it worked + sets expectations |
| Low-usage warning | User has 20% of grant left | Lets users self-serve before they're blocked |
| (etc.) |

### 4. Ask for approval per row

For each row, the user can **approve**, **decline**, or **edit** (rename, change firing condition, change copy direction). Capture decisions before generating templates.

### 5. Generate templates autonomously — match the platform's locked identity

For approved triggers, write `lib/email-templates.ts` with one exported function per trigger (e.g., `signupConfirmationHtml(args)`, `lowUsageWarningHtml(args)`, `subscriptionReceiptHtml(args)`). Emails are a brand surface — they should look like the product, not like generic transactional HTML. Every template **must** conform to the design tokens locked in sub-skill 02.

**Token-loading note (do this first).** Before writing any template, populate the `TOKENS` constant from the values locked in `STATE.yaml # Decisions`:

- **Tone label** — `editorial` / `tech` / `friendly` / `luxurious` / `playful` / `brutalist`. Used to drive copy voice (see point g below).
- **Display font** — e.g., `Fraunces`, `Inter Tight`, `Space Grotesk`. Used for H1 and primary CTA.
- **Primary color** — convert the locked OKLCH value to hex for email-client compatibility.
- **Neutral / surface colors** — background, foreground, muted, border (all as hex).
- **Logo** — read `public/favicon.svg`, replace any `var(--…)` fills with the resolved hex colors, then base64-encode it as a `data:image/svg+xml;base64,…` URL.

If sub-skill 02 has not been run (or design tokens are not locked in `STATE.yaml # Decisions`), **refuse to generate templates**:

> *"I can't generate platform-conforming email templates until the design tokens are locked in sub-skill 02. Want to finish that first, or would you prefer placeholder templates I'll restyle later?"*

You may store the resolved tokens directly in `lib/email-templates.ts` (simplest), or duplicate them in `PROJECT.md` for runtime access if `STATE.yaml` isn't queryable from server code. Either works — pick what fits the project.

**Each template must:**

a. Read the locked design tokens (above).
b. **Apply the tokens as CSS custom properties** at the top of every email's outer container, **and** inline the resolved values on every element that uses them — Gmail and other clients are inconsistent about CSS variables, so the inline value is the source of truth and the variable is a progressive enhancement.
c. **Use the platform display font** for the H1 and primary CTA, with the system fallback chain (`'Inter Tight', system-ui, -apple-system, sans-serif`). Load the Google Font via a `<link>` in the email's `<head>` *and* always inline `font-family` on every element that uses it (Gmail strips `<style>` blocks, so the inline `font-family` is what actually paints).
d. **Use the locked primary color for the primary CTA button** — never a default blue.
e. **Inline the platform logo** (16–20px tall) at the top-left next to the platform title in the display font. Use the SVG from `public/favicon.svg`, base64-encoded as a `data:` URL inside the `<img src="…"/>` tag (some clients block external images by default; data URLs render reliably). Resolve any CSS-variable fills in the SVG to hex before embedding.
f. **Keep the layout simple and elegant**:
   - Single column.
   - One H1 (the email's subject restated as the headline).
   - One paragraph of body copy.
   - One primary CTA (single button) — never multiple buttons of equal weight.
   - One muted footer line (sender info + unsubscribe for marketing).
   - Generous whitespace: 32px padding around the container, 24px between major elements.
   - No background images, no gradients, no decorative borders. Trust the platform's color and typography to do the work.
g. **Match the platform's tone in voice.** Read the tone label from `STATE.yaml` and write copy that matches:
   - **Friendly** → conversational ("Hey Noa, your account is ready 👋").
   - **Editorial** → measured prose, full sentences, no exclamations.
   - **Tech** → terse, factual, no fluff.
   - **Luxurious** → spare, refined, generous spacing in the copy itself.
   - **Playful** → energetic, punctuated, light emoji.
   - **Brutalist** → blunt, uppercase headlines acceptable, no pleasantries.

A footer line is included only on **marketing-class** emails (digests, re-engagement, milestones) with the unsubscribe link — never on transactional ones (receipts, password reset, security alerts).

**Token-application pattern (CSS variables + inline fallback):**

```html
<div style="--brand-primary: #2563eb; --brand-surface: #f8fafc; --brand-fg: #0f172a; font-family: 'Inter Tight', system-ui, sans-serif; background: #f8fafc; color: #0f172a; max-width: 560px; margin: 24px auto; padding: 32px;">
  <!-- content -->
</div>
```

**Primary CTA pattern (uses the locked primary color):**

```html
<a href="<actionUrl>" style="display: inline-block; padding: 12px 24px; background: var(--brand-primary, #2563eb); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-family: 'Inter Tight', system-ui, sans-serif;">Confirm your account</a>
```

**Skeleton — all templates compose from a single `shell()` helper so consistency is enforced by construction:**

```ts
// lib/email-templates.ts
import { readFileSync } from 'node:fs';

// Read the locked tokens once at module load. These come from STATE.yaml
// (or duplicate them in PROJECT.md for runtime access if STATE.yaml isn't
// queryable from server code — both work; pick what fits the project).
const TOKENS = {
  primary: '#2563eb',                    // resolved from STATE.yaml OKLCH
  surface: '#f8fafc',
  fg: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  displayFont: "'Inter Tight', system-ui, sans-serif",
  bodyFont: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  productName: 'Acme',                   // from PROJECT.md # Idea
  logoDataUrl: '',                       // base64-encoded SVG of public/favicon.svg
};

function shell(args: { headline: string; bodyHtml: string; ctaText?: string; ctaUrl?: string; footerHtml?: string }) {
  const { headline, bodyHtml, ctaText, ctaUrl, footerHtml } = args;
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:${TOKENS.surface};color:${TOKENS.fg};font-family:${TOKENS.bodyFont};line-height:1.55;">
  <div style="max-width:560px;margin:24px auto;padding:32px;background:#fff;border:1px solid ${TOKENS.border};border-radius:12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
      <tr>
        <td style="vertical-align:middle;">
          <img src="${TOKENS.logoDataUrl}" alt="" width="20" height="20" style="vertical-align:middle;display:inline-block;margin-right:8px;">
          <span style="font-family:${TOKENS.displayFont};font-weight:600;font-size:16px;vertical-align:middle;">${TOKENS.productName}</span>
        </td>
      </tr>
    </table>
    <h1 style="font-family:${TOKENS.displayFont};font-size:24px;line-height:1.2;margin:0 0 16px 0;color:${TOKENS.fg};">${headline}</h1>
    <div style="font-size:16px;color:${TOKENS.fg};">${bodyHtml}</div>
    ${ctaText && ctaUrl ? `
      <div style="margin:32px 0;">
        <a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;background:${TOKENS.primary};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-family:${TOKENS.displayFont};">${ctaText}</a>
      </div>` : ''}
    ${footerHtml ? `<hr style="border:none;border-top:1px solid ${TOKENS.border};margin:32px 0 16px 0;"><div style="font-size:13px;color:${TOKENS.muted};">${footerHtml}</div>` : ''}
  </div>
</body></html>`;
}

export function signupConfirmationHtml(args: { firstName: string }) {
  return shell({
    headline: `Welcome to ${TOKENS.productName}, ${args.firstName}.`,
    bodyHtml: `<p>Your account is ready. Sign in below to get started.</p>`,
    ctaText: 'Open the app',
    ctaUrl: process.env.AUTH_URL,
    footerHtml: `Sent because you signed up at ${TOKENS.productName}.`,
  });
}
// ... one exported function per approved trigger, all composed from shell().
```

### 6. Wire each template at its trigger point

For each approved trigger, add a call to `sendEmail(...)` at the right place in the codebase:

- **Signup confirmation** → end of the `signup` server action (after `signIn(...)`), `await sendEmail({ to: email, subject: 'Welcome to ...', html: signupConfirmationHtml({ firstName }) })`.
- **Email verification** → in the signup action *before* `signIn`, generate an `authTokens` row with `purpose: 'verify'` and email the link.
- **Password reset** → already wired in `/reset/request` route — replace the inline HTML with `passwordResetHtml({ url })`.
- **Sign-in from new device** → in the Auth.js `signIn` callback, compare request IP/UA against last-seen values stored on the user row; on mismatch send `newDeviceSignInHtml(...)`.
- **Waitlist confirmation** → end of the waitlist server action.
- **Approval invite** → in the admin "approve" action (sub-skill 07) right after inserting `allowedEmails`.
- **Low-usage warning** → inside `gatedAiCall` (sub-skill 07's helper) when `consumed/granted >= 0.8` AND `lastLowUsageWarningAt` (a new column on `users`) is more than 7 days ago. Update the column when sent.
- **Usage exhausted** → same helper, when the call is rejected because `consumed >= granted`.
- **Usage refilled** → in the admin "grant usage" action.
- **Subscription receipt / failed payment / cancelled / renewal reminder** → Stripe webhook handlers (`checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`, scheduled job 3 days before `current_period_end`).
- **Weekly digest** → cron / scheduled job (sub-skill 09 if present).
- **Comment notification / subscriber confirmation** → in the comment-create / subscribe server actions.
- **Re-engagement / first-action / milestone** → background job comparing `users.lastSeenAt` and event counts.
- **Account deactivation notice** → admin "deactivate" action.
- **Data export ready** → background job that produces the export file, then emails the download link.

Add any new columns the wiring requires (e.g., `lastLowUsageWarningAt timestamp`, `lastSeenAt timestamp`, `lastSignInIp inet`, `lastSignInUa text`) to `lib/db/schema.ts` and run `drizzle-kit push`.

### 7. DEV/TEST helper — `lib/email-debug.ts`

In development, intercept `sendEmail` and write the rendered HTML to disk instead of actually sending — so the agent can show the user what each trigger looks like before going live:

```ts
// lib/email-debug.ts
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function writeDebugEmail(args: { to: string; subject: string; html: string }) {
  const dir = join(process.cwd(), 'tmp', 'emails');
  await mkdir(dir, { recursive: true });
  const safe = args.subject.replace(/[^a-z0-9]+/gi, '-').slice(0, 60);
  const file = join(dir, `${Date.now()}-${safe}.html`);
  await writeFile(file, `<!-- to: ${args.to} | subject: ${args.subject} -->\n${args.html}`, 'utf8');
  return file;
}
```

Then short-circuit `sendEmail` in development:

```ts
// at the top of sendEmail() in lib/email.ts
if (process.env.NODE_ENV !== 'production' && process.env.EMAIL_DEBUG !== 'off') {
  const { writeDebugEmail } = await import('./email-debug');
  const path = await writeDebugEmail(args);
  console.log(`[email-debug] wrote ${path}`);
  return;
}
```

Add `tmp/` to `.gitignore`. After generating templates, the agent should trigger one of each via a small script or by walking the user through the corresponding flow, then `open tmp/emails/<file>.html` to preview.

### Lifecycle email (the retention lever, not the plumbing)

The transactional triggers above (signup, reset, etc.) are plumbing. Lifecycle email is what drives retention — the agent ships these as a separate class, with explicit timing and content rules:

| Trigger | Fires when | Content shape | Who needs it |
| --- | --- | --- | --- |
| **Welcome / day-1** | 24h after signup | Personal note from founder + the single most-important next step | Every product with auth |
| **Day-3 onboarding** | 72h after signup | "How's it going? Here's a tip you might have missed: [feature]" | Products with depth (more than one core feature) |
| **Day-7 re-engagement** | 7d if no return visit | "We noticed you haven't been back. Here's what's new since you signed up." | Products with retention as a goal |
| **Day-14 milestone-or-bust** | 14d post-signup | "Has [product] been useful? Quick reply if anything's blocking you." (founder-personal) | All products. This is your last chance to reactivate. |
| **Weekly digest** | Every Mon (or audience-relevant day) | Round-up of the user's own activity + new content/features | Content products, social products, productivity tools |
| **Re-engagement after N days inactive** | 30d / 60d / 90d inactive | Tiered: 30d = "still here?"; 60d = "what changed?"; 90d = "we're sorry to see you go" with optional unsubscribe | Any product where churn is a real metric |
| **Win-back after deactivation** | 30d after `deactivatedAt` | "If you cancel intentionally — no email. If something pushed you out — we want to fix it." | Products with monetization |
| **Feature announcement** | Triggered manually or on every MINOR/MAJOR release tag (sub-skill 14) | "What's new in v0.4 — TLDR: [headline + screenshot]" | Any product after first 50 users |

The agent **proposes which lifecycle triggers fit the platform** based on `PROJECT.md` audience + `decisions.access_model` + product type — same proposal-table dialogue as the transactional triggers section already uses.

**Implementation pattern** — these aren't fired by user actions; they're scheduled. Use Vercel Cron (or platform equivalent) hitting an internal API route that queries who's eligible for which template:

```ts
// app/api/internal/cron/lifecycle/route.ts
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, lt, gt, and, isNull } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { day1WelcomeHtml, day7ReengageHtml /* ... */ } from '@/lib/email-templates';

export async function GET(req: Request) {
  // Auth: require a CRON_SECRET header so randos can't trigger sends.
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return new Response('forbidden', { status: 403 });
  }

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Day-1 welcome — users who signed up between 24-48h ago and haven't been welcomed yet.
  const candidates = await db.select().from(users).where(and(
    lt(users.createdAt, dayAgo),
    gt(users.createdAt, twoDaysAgo),
    isNull(users.welcomedAt),
  ));
  for (const u of candidates) {
    await sendEmail({ to: u.email, subject: `Welcome, ${u.firstName}`, html: day1WelcomeHtml({ firstName: u.firstName }) });
    await db.update(users).set({ welcomedAt: now }).where(eq(users.id, u.id));
  }
  // ... similarly for day-3, day-7, etc. ...
  return Response.json({ ok: true });
}
```

Schedule in `vercel.json`:

```json
{ "crons": [{ "path": "/api/internal/cron/lifecycle", "schedule": "0 14 * * *" }] }
```

(Daily at 14:00 UTC = morning ET, when emails get the best open rates for B2C; B2B audiences are fine in the same window.)

**Conform to platform email styling.** Each lifecycle template uses the same `shell()` helper from the existing email-templates section so brand consistency is automatic. The agent uses the configurator's `component_pick` channel to show 2-3 visual variants of the day-1 welcome and lets the user pick — same flow as the design picks in 02-design.

**Frequency cap**: no user receives more than 2 lifecycle emails in any 7-day window. If both day-7 re-engage and weekly digest are eligible the same day, send the more-targeted one (re-engage) and skip the digest.

**Unsubscribe**: every lifecycle email includes a one-click `/unsubscribe?token=...` link that flips `users.email_lifecycle = false` (separate from transactional). The agent adds the column when wiring the first lifecycle trigger.

## Auth.js — install and wire

```bash
npm install next-auth@beta @auth/drizzle-adapter   # or @auth/prisma-adapter
npm install bcryptjs                                # only if Credentials path
```

`auth.ts` (project root):
```ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { users, allowedEmails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    ...(process.env.AUTH_GOOGLE_ID ? [Google] : []),
    ...(process.env.RESEND_API_KEY ? [Resend({ from: process.env.EMAIL_FROM! })] : []),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const [user] = await db.select().from(users).where(eq(users.email, String(creds.email)));
        if (!user || !user.passwordHash || user.deactivatedAt) return null;
        const ok = await bcrypt.compare(String(creds.password), user.passwordHash);
        return ok ? user : null;
      },
    }),
  ],
  callbacks: {
    // Free beta with waitlist (or paid): block sign-in unless the email is whitelisted.
    async signIn({ user }) {
      if (process.env.ACCESS_MODE === 'open') return true;
      if (!user.email) return false;
      const [allowed] = await db.select().from(allowedEmails).where(eq(allowedEmails.email, user.email));
      return Boolean(allowed);
    },
  },
  pages: { signIn: '/login' },
});
```

Wire the route handler `app/api/auth/[...nextauth]/route.ts`:
```ts
export { GET, POST } from '@/auth';
```

Server-side gate on protected routes:
```ts
const session = await auth();
if (!session?.user) redirect('/login');
```

## Database schema — users, waitlist, whitelist, consent, invites

Use Drizzle (or Prisma equivalent). The shape below is the minimum that supports every access mode and every admin-dashboard action in sub-skill 07.

```ts
// lib/db/schema.ts
import { pgTable, uuid, text, timestamp, integer, inet } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  passwordHash: text('password_hash'),                    // null for OAuth-only users
  intendedUse: text('intended_use'),                      // optional "how do you plan to use this?"
  emailVerifiedAt: timestamp('email_verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deactivatedAt: timestamp('deactivated_at'),             // set by admin to block login
  // Per-user usage budget (sub-skill 07 grants and decrements this).
  usageGranted: integer('usage_granted').notNull().default(0),
  usageConsumed: integer('usage_consumed').notNull().default(0),
});

// Public waitlist signups before admin approval.
export const waitlist = pgTable('waitlist', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  intendedUse: text('intended_use'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  approvedAt: timestamp('approved_at'),
  rejectedAt: timestamp('rejected_at'),
});

// Emails the admin has whitelisted for self-signup. Approving from the waitlist
// inserts here. Adding a user via the admin dashboard also inserts here.
export const allowedEmails = pgTable('allowed_emails', {
  email: text('email').primaryKey(),
  invitedBy: uuid('invited_by'),                          // admin user id (or null for system)
  invitedAt: timestamp('invited_at').defaultNow().notNull(),
  inviteTokenHash: text('invite_token_hash'),             // null when admin chose "whitelist only" (no email sent)
  inviteAcceptedAt: timestamp('invite_accepted_at'),
  expiresAt: timestamp('expires_at'),                     // token expiry (typically +14d)
});

// Versioned consent records: who agreed to what, when.
export const userConsents = pgTable('user_consents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  consentType: text('consent_type').notNull(),            // 'tos' | 'privacy' | 'marketing'
  documentVersion: text('document_version').notNull(),    // e.g., '2026-04-19' (last_updated of the doc)
  acceptedAt: timestamp('accepted_at').defaultNow().notNull(),
  ipAddress: inet('ip_address'),
});

// Password-reset and email-verification tokens (single table, scoped by purpose).
export const authTokens = pgTable('auth_tokens', {
  tokenHash: text('token_hash').primaryKey(),             // store sha256(token); never the raw token
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: text('purpose').notNull(),                     // 'verify' | 'reset'
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
});
```

Run the migration before wiring the form (`drizzle-kit push` for MVP; proper migrations later).

## Signup flow — the form everyone agreed on

The signup form has the **same fields regardless of access mode**. What differs is whether the form even renders, and what happens after submit.

Required fields:
- **Email** (`type="email" required autocomplete="email"`)
- **First name** (`required autocomplete="given-name"`)
- **Last name** (`required autocomplete="family-name"`)
- **Password** (`type="password" required minlength="12" autocomplete="new-password"`) — only on Credentials path
- **Optional**: "How do you plan to use this?" textarea (rows=3, maxlength=500)
- **Required checkbox**: *"I agree to the [Terms of Service](/terms) and [Privacy Policy](/privacy)."* (cannot submit without it)
- **Optional checkbox** (unticked default): *"I'd like occasional product updates by email."*

Submit handler must, in order:
1. Re-check email-allowed status against `allowedEmails` if `ACCESS_MODE !== 'open'`.
2. Hash password with `bcryptjs` (cost 10–12), store as `passwordHash`.
3. Insert `users` row with the initial `usageGranted` from `INITIAL_USAGE_GRANT` env var (set in sub-skill 07).
4. Insert `userConsents` rows: one for `tos`, one for `privacy`, plus one for `marketing` if checked. Each row stores the document `last_updated` date as `documentVersion`, plus the request IP.
5. (If invite token in URL) mark `allowedEmails.inviteAcceptedAt`.
6. Sign the user in immediately (or send verification email first if you require pre-verification).

```tsx
// app/signup/page.tsx
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { users, allowedEmails, userConsents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { signIn } from '@/auth';

const TOS_VERSION = '2026-04-19';      // bump when the doc changes
const PRIVACY_VERSION = '2026-04-19';

export default function SignupPage({ searchParams }: { searchParams: { token?: string; email?: string } }) {
  return (
    <form action={async (formData: FormData) => {
      'use server';
      const email = String(formData.get('email')).toLowerCase().trim();
      const firstName = String(formData.get('firstName')).trim();
      const lastName = String(formData.get('lastName')).trim();
      const password = String(formData.get('password'));
      const intendedUse = String(formData.get('intendedUse') ?? '').trim() || null;
      const acceptTos = formData.get('acceptTos') === 'on';
      const acceptMarketing = formData.get('acceptMarketing') === 'on';

      if (!acceptTos) throw new Error('You must agree to the Terms and Privacy Policy.');

      if (process.env.ACCESS_MODE !== 'open') {
        const [allowed] = await db.select().from(allowedEmails).where(eq(allowedEmails.email, email));
        if (!allowed) throw new Error('This email is not on the access list. Join the waitlist to request access.');
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const initialGrant = Number(process.env.INITIAL_USAGE_GRANT ?? 0);
      const [user] = await db.insert(users).values({
        email, firstName, lastName, passwordHash, intendedUse, usageGranted: initialGrant,
      }).returning();

      const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? null;
      await db.insert(userConsents).values([
        { userId: user.id, consentType: 'tos',     documentVersion: TOS_VERSION,     ipAddress: ip },
        { userId: user.id, consentType: 'privacy', documentVersion: PRIVACY_VERSION, ipAddress: ip },
        ...(acceptMarketing ? [{ userId: user.id, consentType: 'marketing', documentVersion: PRIVACY_VERSION, ipAddress: ip }] : []),
      ]);

      if (searchParams.token) {
        await db.update(allowedEmails).set({ inviteAcceptedAt: new Date() }).where(eq(allowedEmails.email, email));
      }

      await signIn('credentials', { email, password, redirectTo: '/' });
    }} className="max-w-md mx-auto space-y-4 p-6">
      <h1 className="text-3xl font-semibold">Create your account</h1>

      <input name="email"     type="email"    required defaultValue={searchParams.email ?? ''} className="input input-bordered w-full" placeholder="Email" autoComplete="email" />
      <input name="firstName" type="text"     required className="input input-bordered w-full" placeholder="First name" autoComplete="given-name" />
      <input name="lastName"  type="text"     required className="input input-bordered w-full" placeholder="Last name"  autoComplete="family-name" />
      <input name="password"  type="password" required minLength={12} className="input input-bordered w-full" placeholder="Password (min 12 chars)" autoComplete="new-password" />

      <textarea name="intendedUse" rows={3} maxLength={500} className="textarea textarea-bordered w-full" placeholder="How do you plan to use this? (optional)" />

      <label className="label cursor-pointer justify-start gap-2">
        <input type="checkbox" name="acceptTos" required className="checkbox checkbox-sm" />
        <span className="label-text">I agree to the <a className="link" href="/terms">Terms of Service</a> and <a className="link" href="/privacy">Privacy Policy</a>.</span>
      </label>
      <label className="label cursor-pointer justify-start gap-2">
        <input type="checkbox" name="acceptMarketing" className="checkbox checkbox-sm" />
        <span className="label-text">I'd like occasional product updates by email. (Optional, unsubscribe any time.)</span>
      </label>

      <button className="btn btn-primary w-full">Create account</button>
    </form>
  );
}
```

If `ACCESS_MODE` is `waitlist` or `paid`, the public `/signup` page should redirect to `/waitlist` unless an `?email=&token=` invite query is present.

## Waitlist mode (only if `ACCESS_MODE === 'waitlist'` or `'paid'`)

Public `/waitlist` page:

```tsx
// app/waitlist/page.tsx
import { db } from '@/lib/db';
import { waitlist } from '@/lib/db/schema';

export default function WaitlistPage() {
  return (
    <form action={async (formData: FormData) => {
      'use server';
      const email = String(formData.get('email')).toLowerCase().trim();
      const intendedUse = String(formData.get('intendedUse') ?? '').trim() || null;
      await db.insert(waitlist).values({ email, intendedUse }).onConflictDoNothing();
    }} className="max-w-md mx-auto space-y-4 p-6">
      <h1 className="text-3xl font-semibold">Join the waitlist</h1>
      <p className="opacity-75">We're letting people in gradually. Drop your email and we'll be in touch.</p>
      <input name="email" type="email" required className="input input-bordered w-full" placeholder="Email" />
      <textarea name="intendedUse" rows={3} maxLength={500} className="textarea textarea-bordered w-full" placeholder="How do you plan to use this? (optional)" />
      <button className="btn btn-primary w-full">Request access</button>
    </form>
  );
}
```

When the admin (sub-skill 07) approves a waitlist row, two paths:

- **Email service available** — generate a one-time invite token, store `sha256(token)` as `inviteTokenHash`, send an email with link `https://<domain>/signup?email=<email>&token=<token>`. User clicks, signup form prefills email, and on submit the token is validated and consumed.
- **Email service not available** — just insert into `allowedEmails` with no token. The user is told (out-of-band, e.g., the admin emails them personally) to go to `/signup` and create their account. The Auth.js `signIn` callback only allows whitelisted emails through, so unauthorized users can't slip in.

The admin dashboard (sub-skill 07) detects which mode using `emailEnabled` from `lib/email.ts`.

## Password reset (Credentials path)

Two routes: request, and confirm.

```ts
// app/(auth)/reset/request/route.ts — POST { email }
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { users, authTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, emailEnabled } from '@/lib/email';

export async function POST(req: Request) {
  if (!emailEnabled) return new Response('Email not configured', { status: 503 });
  const { email } = await req.json();
  const [user] = await db.select().from(users).where(eq(users.email, email));
  // Always respond 200 to avoid user-enumeration. Only send if the user exists.
  if (user) {
    const raw = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await db.insert(authTokens).values({ tokenHash, userId: user.id, purpose: 'reset', expiresAt });
    const url = `${process.env.AUTH_URL}/reset/confirm?token=${raw}`;
    await sendEmail({
      to: email,
      subject: 'Reset your password',
      html: `<p>Click to reset your password (expires in 1 hour):</p><p><a href="${url}">${url}</a></p>`,
    });
  }
  return new Response('ok');
}
```

```ts
// app/(auth)/reset/confirm/route.ts — POST { token, newPassword }
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, authTokens } from '@/lib/db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';

export async function POST(req: Request) {
  const { token, newPassword } = await req.json();
  if (newPassword.length < 12) return new Response('Password too short', { status: 400 });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [row] = await db.select().from(authTokens).where(
    and(eq(authTokens.tokenHash, tokenHash), eq(authTokens.purpose, 'reset'), isNull(authTokens.consumedAt), gt(authTokens.expiresAt, new Date()))
  );
  if (!row) return new Response('Invalid or expired token', { status: 400 });
  await db.update(users).set({ passwordHash: await bcrypt.hash(newPassword, 12) }).where(eq(users.id, row.userId));
  await db.update(authTokens).set({ consumedAt: new Date() }).where(eq(authTokens.tokenHash, tokenHash));
  return new Response('ok');
}
```

Build minimal pages at `/reset/request` (form: email) and `/reset/confirm` (form: new password, token from URL).

Email-verification at signup uses the same `authTokens` table with `purpose: 'verify'`. Optional for MVP — recommend it for any project that ships marketing emails (otherwise spam traps poison your sender reputation).

## OAuth providers — console walkthroughs

If the user picked Google or GitHub, walk them through the console step-by-step. **Offer to drive a browser** (see SKILL.md "Browser automation"): you can `open https://...` to take them to the right page, or run a Playwright script that opens a window and waits at credential-entry steps.

### Google (Google Cloud Console)
1. Go to https://console.cloud.google.com/apis/credentials.
2. Create a project if needed. Top-left dropdown &rarr; **New Project**.
3. **OAuth consent screen** &rarr; External &rarr; fill app name, user support email, developer contact &rarr; Save.
4. **Credentials** &rarr; **Create Credentials** &rarr; **OAuth client ID** &rarr; Web application.
5. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (and the production URL after deploy).
6. Copy Client ID + Client Secret. Paste them.

### GitHub
1. Go to https://github.com/settings/developers &rarr; **New OAuth App**.
2. Name, homepage URL, callback URL: `http://localhost:3000/api/auth/callback/github`.
3. Generate a client secret. Copy ID + secret. Paste them.

For OAuth users, the first sign-in inserts a `users` row with no `passwordHash`. Capture first/last name from the OAuth profile (Google provides `given_name` / `family_name`); ask for `intendedUse` and consent on a brief one-screen onboarding immediately after first sign-in if `users.intendedUse` is null and `userConsents` is empty.

## AUTONOMOUS — B2B multi-tenant + RBAC (gated to B2B products with teams)

For B2B products where users belong to organizations / workspaces / teams, the single-user auth model from above isn't enough. The agent ships organizations + memberships + roles + team invites — distinct from the admin-issued individual invites covered earlier.

**When to run this**: `STATE.yaml decisions.vertical_classification` is `B2B` (small or Enterprise) AND the product has any concept of "team" / "workspace" / "organization." If the product is B2B but solo-user (e.g., a freelancer tool), skip this section.

### Schema additions

```ts
// lib/db/schema.ts — extend
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),               // URL-safe; used in /org/:slug routes
  name: text('name').notNull(),
  plan: text('plan').notNull().default('free'),        // 'free' | 'pro' | 'enterprise' — gated by sub-skill 09
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const memberships = pgTable('memberships', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),                        // 'owner' | 'admin' | 'member' | 'guest'
  invitedBy: uuid('invited_by').references(() => users.id),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.organizationId, t.userId] }) }));

// Pending team invites (distinct from sub-skill 04's allowedEmails which is for admin-issued individual invites)
export const teamInvites = pgTable('team_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull(),                        // role they'll get on accept
  inviteTokenHash: text('invite_token_hash').notNull(),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  invitedAt: timestamp('invited_at').defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at'),
  expiresAt: timestamp('expires_at').notNull(),         // typically +7d
});
```

### The four roles

| Role | Can | Cannot |
| --- | --- | --- |
| **owner** | Everything: invite/remove members, change plan, transfer ownership, delete the org | (nothing — can do everything) |
| **admin** | Invite/remove members (not owners), change settings, manage billing | Delete the org, transfer ownership |
| **member** | Use the product, create / edit content within the org | Invite members, change billing, manage settings |
| **guest** | View-only access to specific shared resources within the org | Create new content, see other members' content |

The agent picks the right granularity per product. Most B2B MVPs need owner / admin / member only. Guest is for products with external collaborators.

### Per-route auth — every authed route is org-scoped

Every authed route checks BOTH user-auth AND org-membership-auth:

```ts
// lib/auth-helpers.ts
import 'server-only';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { memberships, organizations } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function requireMembership(orgSlug: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Response('auth_required', { status: 401 });

  const [row] = await db.select({ org: organizations, role: memberships.role })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(and(eq(organizations.slug, orgSlug), eq(memberships.userId, session.user.id)));

  if (!row) throw new Response('not_a_member', { status: 403 });
  return { user: session.user, org: row.org, role: row.role };
}

export function requireRole(actualRole: string, requiredRoles: string[]) {
  if (!requiredRoles.includes(actualRole)) {
    throw new Response('insufficient_role', { status: 403 });
  }
}
```

```ts
// Example use in a route handler:
export async function POST(req: Request, { params }: { params: { orgSlug: string } }) {
  const { user, org, role } = await requireMembership(params.orgSlug);
  requireRole(role, ['owner', 'admin']);  // only owner/admin can do this action
  // ... handler body ...
}
```

### URL pattern — org slug in the path

Routes follow the convention `/org/:slug/...` (or `:slug.<domain>` subdomain pattern for true multi-tenancy at scale):

- `/org/acme/dashboard`
- `/org/acme/team`
- `/org/acme/settings`

The current org context is read from the URL, not from a session variable. This makes "switch workspace" trivial (change the URL) and "use multiple orgs in different tabs" work out of the box.

### Workspace switcher in the header

Per sub-skill 02's header rule (5-element layout), the workspace switcher lives in the **hamburger menu** as the first item, OR as a left-of-logo dropdown for SaaS dashboards (per `patterns/saas-dashboard.md`). Pattern:

```tsx
// components/WorkspaceSwitcher.tsx
const userOrgs = await db.select({ org: organizations }).from(memberships)
  .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
  .where(eq(memberships.userId, user.id));

return (
  <select onChange={(e) => router.push(`/org/${e.target.value}/dashboard`)}>
    {userOrgs.map(({ org }) => <option key={org.slug} value={org.slug}>{org.name}</option>)}
  </select>
);
```

### Team invite flow

Distinct from admin-issued individual invites. Any owner/admin can invite teammates:

```tsx
// app/org/[slug]/team/page.tsx
'use server';
async function inviteAction(formData: FormData) {
  const { user, org, role } = await requireMembership(orgSlug);
  requireRole(role, ['owner', 'admin']);

  const email = String(formData.get('email')).toLowerCase().trim();
  const newRole = String(formData.get('role')) as 'admin' | 'member' | 'guest';

  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await db.insert(teamInvites).values({
    organizationId: org.id, email, role: newRole, inviteTokenHash: tokenHash,
    invitedBy: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await sendEmail({
    to: email,
    subject: `${user.firstName} invited you to ${org.name}`,
    html: `<p>${user.firstName} invited you to join <strong>${org.name}</strong> as a ${newRole}.</p>
           <p><a href="${process.env.AUTH_URL}/invite/accept?token=${token}">Accept invite</a></p>
           <p><small>This invite expires in 7 days.</small></p>`,
  });
}
```

The `/invite/accept` route validates the token, signs the user up if needed (uses sub-skill 04's signup flow with the email pre-filled), then inserts the membership row + marks the invite accepted.

### Per-org data isolation — RLS or query-level

Every query against shared tables must filter by `organization_id`. Two ways to enforce:

1. **Query-level (Drizzle)** — every `select`/`update`/`delete` includes `where(eq(<table>.organizationId, org.id))`. Simple, explicit, easy to forget.
2. **Postgres Row-Level Security (RLS)** — define policies that filter by `organization_id` automatically based on a session variable. Harder to set up, impossible to forget. Recommended for B2B-Enterprise where data isolation is part of the trust story.

The agent defaults to (1) for B2B-small (simpler, MVP-friendly) and (2) for B2B-Enterprise (compliance + trust requirement). Document the choice in `STATE.yaml decisions.tenant_isolation`.

### Org deletion + member removal

- **Owner deletes the org**: cascade-delete all org-scoped data (memberships, invites, content). Soft-delete the org row (`deleted_at`) for 30 days for accidental-delete recovery.
- **Owner transfers ownership**: change `role` of another member from `admin` → `owner` and self → `admin` (or leave the org).
- **Admin removes a member**: delete the membership row. Their content created within the org stays (assigned to a "former member" placeholder if needed).
- **Member leaves voluntarily**: same as removal, initiated by them.

### Anti-patterns

- Storing the active org in the user's session. Breaks "different orgs in different tabs." URL-based context wins.
- Letting non-owners delete the org. Owner-only with a "type the org name to confirm" speedbump.
- Sending team invites that don't expire. Stale invites are a security smell. 7-day default.
- Forgetting `organization_id` on a query. RLS prevents this; query-level review catches it. Both are defenses-in-depth.
- One role for everyone (admin or none). Even small teams want owner / admin / member granularity.

### Cross-references

- patterns/saas-dashboard.md for the SaaS-specific UX patterns.
- Sub-skill 09 monetization: per-org billing means the Stripe customer is the org, not the user.
- Sub-skill 08 analytics: org-level KPIs distinct from user-level (e.g., "active orgs" alongside "active users").
- Sub-skill 11 security: tenant isolation via RLS is part of the security posture for regulated industries.
- Sub-skill 03 compliance: SOC 2 / Enterprise contracts almost always require RBAC + audit logs.

## Anti-patterns to avoid

- Building custom auth UI before Auth.js is wired. Get the flow working with stock components first; restyle later.
- Sending email from your own SMTP server. Use Resend (or Postmark) — it's free for MVP volume and handles deliverability.
- Calling `auth()` inside React Server Components multiple times for the same request. Wrap once at the top of the page.
- Storing the password hash in plaintext columns "for now." There's no "for now" with passwords.
- **Letting waitlist signups skip the consent checkboxes.** The waitlist form is a public marketing form, not an account; it doesn't need TOS/Privacy consent. The *signup* form (after approval) is where consent is captured. Don't blur the two.
- **Pre-ticked marketing consent.** Void under GDPR. Always unticked default.
- **Storing raw invite/reset tokens in the DB.** Always store `sha256(token)` and discard the raw value after sending it.
- **Returning a different status from `/reset/request` based on whether the email exists.** That's user enumeration. Always respond `200 ok`.
- **Generic email templates** — using a default "Roboto / Helvetica + #4f46e5 button" template that doesn't reference the platform's actual locked colors and font. Emails are a brand surface; they should look like the product.
- **Loading the display font from a `<link>` only.** Gmail strips `<style>` blocks. Always inline `font-family` on every element using the display font, with the system fallback chain.
- **Using PNG/JPG logos in emails.** Use the SVG (base64-encoded as a data URL) so it scales sharply on retina and dark mode.

## Exit criteria

- The user can sign up, sign in, and sign out on `localhost`.
- The signup form requires first name, last name, email, password (Credentials path), the TOS+Privacy checkbox, and offers an unticked marketing checkbox plus an optional intended-use textarea.
- `userConsents` has a row for every consent each user gave, including the document version and request IP.
- If the access model is `waitlist` or `paid`, the public `/signup` page rejects (or 404s) and `/waitlist` is the only public entry.
- Password reset works end-to-end on `localhost` (request → email → click link → set new password → log in).
- `lib/email.ts` exports `emailEnabled` so sub-skill 07 can branch invite-vs-whitelist.
- `.env.local` contains every secret used and is gitignored.
- A line in `PROJECT.md` under `# Decisions` records the chosen auth path, the access mode, and the document versions referenced by signup (`TOS_VERSION`, `PRIVACY_VERSION`).
- If email is configured, every approved trigger has a template in `lib/email-templates.ts` and a wired call site.
- Every generated email template uses the locked display font, primary color, and inline-base64 logo from sub-skill 02's design decisions.
- Templates compose from a single `shell()` helper so the styling is consistent by construction.
- If sub-skill 02 hasn't locked design tokens, the agent did not generate templates — it stopped and asked.
- The DEV email-debug helper writes to `tmp/emails/` and is gitignored.
- Lifecycle email work is scheduled via cron (`vercel.json` or platform equivalent), frequency-capped to 2 per user per 7-day window, and one-click-unsubscribable; the `users.email_lifecycle` column has been added and wired into the unsubscribe handler.
- For B2B products with teams: organizations + memberships + teamInvites tables exist; requireMembership / requireRole helpers used on every authed route; workspace switcher present in header (per patterns/saas-dashboard.md); team invite flow (distinct from admin individual invites) ships an email + acceptance UI; tenant isolation strategy (query-level vs RLS) recorded in STATE.yaml.

Move on to `05-ai-integration.md`.
