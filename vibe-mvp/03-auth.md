# 03 · Auth (signup, login, verification)

Goal: pick the simplest user authentication that fits the audience and wire the full flow &mdash; signup, login, sign-out, and (when needed) email verification &mdash; without rolling your own session logic.

## DIALOGUE — ask the user

Ask one or two at a time. Confirm understanding before moving on.

1. **Do you actually need accounts in v1?** Many MVPs don't. If the core loop works without login, skip this skill and revisit post-launch.
2. **If yes &mdash; how do you want users to sign in?** Choose one path:
   - **Magic link** (email a one-tap login link). Friendliest. Requires an email service.
   - **OAuth only** (Google / GitHub / etc.). Zero email needed.
   - **Email + password** (with verification). Traditional. Requires an email service.
3. **Will user data be tied to accounts?** (Determines whether a database is part of this step.)

## AUTONOMOUS — pick the stack

| User experience | Use |
| --- | --- |
| No login | Skip this skill |
| Magic link only | **Auth.js v5** Email provider + **Resend** (recommended for MVP) |
| OAuth only | **Auth.js v5** with Google &/or GitHub providers |
| Email + password with verification | **Auth.js v5** Credentials provider + Drizzle/Prisma + **Resend** for verification emails |
| Phone / SMS | **Clerk** (paid; warn the user) |

Default recommendation: **Auth.js v5 with magic link via Resend, plus Google as a one-tap option.** It's the lowest-friction path that still feels modern.

## Implementation rules (apply to every path)

- Never write your own password hashing or session storage. If you find yourself reading `bcrypt` docs, stop and reconsider.
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
  ```
- Build one `/login` page (DaisyUI `btn` + provider logos is enough) and a sign-out button visible from the authed shell. Don't invent custom auth UI in v1.
- One `auth()` server-side check per protected route. Don't sprinkle checks throughout components.

## Email service — Resend setup (DIALOGUE inside AUTONOMOUS)

If the chosen path needs email (magic link or password verification), set up **Resend**. It's the modern standard: instant signup, free tier of 100 emails/day, simple SDK, and works without DNS changes for development.

Walk the user through it:

1. *"Open https://resend.com/signup."*
2. *"Sign up (Google or email both work). Verify your email if asked."*
3. *"Once you're in, go to https://resend.com/api-keys."*
4. *"Click **Create API Key**. Name it after the project. **Sending Access** scope is fine. Copy the key &mdash; you won't see it again. Paste it here."*

Before asking, run `grep -q '^RESEND_API_KEY=' .env.local 2>/dev/null && echo found`. If you already have one, skip.

Append to `.env.local`:
```
RESEND_API_KEY=re_...
EMAIL_FROM="App <onboarding@resend.dev>"
```

`onboarding@resend.dev` is Resend's shared sender that works immediately without verifying a domain. For production, the user should add their own domain in Resend (DNS records: SPF, DKIM, MX) and switch `EMAIL_FROM` to `noreply@<their-domain>`. That's a sub-skill 12 (domain) follow-up.

Install:
```bash
npm install resend
```

Create `lib/email.ts` as the **single entry point** for every outbound email:
```ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.EMAIL_FROM ?? 'App <onboarding@resend.dev>';

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
}) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}
```

## Auth.js — install and wire

```bash
npm install next-auth@beta @auth/drizzle-adapter   # or @auth/prisma-adapter
```

`auth.ts` (project root):
```ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db'; // wherever the Drizzle/Prisma client lives

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google,
    Resend({
      from: process.env.EMAIL_FROM!,
    }),
  ],
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

## Email + password with verification (only if the user chose this path)

Use Auth.js Credentials provider with a verification token table.

Flow:
1. User submits email + password on `/signup`.
2. Hash the password with `bcryptjs` (`npm install bcryptjs`); store in `users.password_hash`.
3. Generate a verification token (`crypto.randomUUID()`); store in `verification_tokens` with a 24h expiry.
4. Send via `sendEmail` with a link to `/verify?token=...`.
5. On `/verify`, look up the token, mark the user verified, log them in, and delete the token.
6. Block login until `users.verified_at` is set.

Keep the email template minimal:
```ts
const html = `
  <p>Welcome! Click below to verify your email:</p>
  <p><a href="${verifyUrl}">Verify email</a></p>
  <p>This link expires in 24 hours.</p>
`;
```

For password reset, the same pattern (different token table or a `purpose` column).

## Anti-patterns to avoid

- Building custom auth UI before Auth.js is wired. Get the flow working with stock components first; restyle later.
- Sending email from your own SMTP server. Use Resend (or Postmark) &mdash; it's free for MVP volume and handles deliverability.
- Calling `auth()` inside React Server Components multiple times for the same request. Wrap once at the top of the page.
- Storing the password hash in plaintext columns "for now." There's no "for now" with passwords.

## Exit criteria

- The user can sign up, sign in, and sign out on `localhost`.
- If verification is part of the flow, the verification email arrives in the user's inbox and the link works.
- `.env.local` contains every secret used and is gitignored.
- A line in `PROJECT.md` under `# Decisions` records the chosen auth path and why.

Move on to `04-ai-integration.md`.
