# 11 · Security

Goal: don't ship the obvious mistakes. This is not a pen-test — it is a hygiene checklist.

## AUTONOMOUS — run the checklist

### Secrets

- `.env.local` is in `.gitignore`. Verify with `git check-ignore .env.local`.
- `git log -p -- .env.local` returns nothing. If a secret was ever committed, **rotate it now** and tell the user.
- No secret is referenced in client-side code. Anything used in a React Client Component must be safe to expose; Server Components and Route Handlers are where secrets live.

### Security headers (full stack)

Add a `next.config.ts` `headers()` function that sets ALL of these for every route:

```ts
// next.config.ts
const securityHeaders = [
  // HSTS — force HTTPS for 2 years across all subdomains; submit to preload list.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Defeat MIME sniffing (XSS in user-uploaded content).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Disable framing — defeats clickjacking unless the app embeds itself.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Modern referrer policy — browsers strip the path on cross-origin requests.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features the app doesn't need.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // Cross-Origin Opener Policy — isolates browser context, defeats some Spectre-class attacks.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Cross-Origin Resource Policy — only same-origin can load this resource.
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  // CSP — strict baseline. Loosen per-route only when a feature genuinely needs it.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https://*.googleusercontent.com https://www.google-analytics.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.upstash.io https://api.openai.com https://api.resend.com https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

export default {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

After deploy, test with **https://securityheaders.com/?q=your-domain.com** — aim for an A or A+ grade. Anything less than A means you're missing a header that's free to add.

**HSTS preload list**: After the site has been on HTTPS with the `preload` directive for at least 30 days, submit to https://hstspreload.org/ to get baked into Chrome / Firefox / Safari. Once preloaded, browsers refuse plain HTTP to your domain even on first visit.

### Input validation

- Every Route Handler or Server Action that takes user input validates it with **Zod** before doing anything with it.
- Database queries use parameterized queries or an ORM (Drizzle, Prisma). Never string-concatenate SQL.
- File uploads (if any) check MIME type, size cap, and store outside the web root.

### Auth surface

- All authed routes call `auth()` server-side. Do not gate purely with client-side redirects.
- Session cookies are `httpOnly`, `Secure`, `SameSite=Lax`. Auth.js does this by default — verify it wasn't overridden.
- Sign-out clears the session server-side, not just client-side.

### Dependencies

- `npm audit --omit=dev` — fix high/critical. Document why if you can't.
- Pin exact versions for anything in the auth/crypto path.

### Rate limiting (per-IP, per-user, per-route)

Every public endpoint that triggers cost (AI calls, email sends, DB writes, signups) needs rate limiting. Three dimensions to apply, layered:

| Dimension | Why | Default budget |
| --- | --- | --- |
| Per-IP | Stops anonymous abuse and brute-force attempts on auth | 10 req/min on auth, 60 req/min on read endpoints |
| Per-authenticated-user | Caps individual users so one runaway script doesn't drain your AI budget | 30 req/min for AI; 100 req/min for general API |
| Per-route global | Backstop against viral spikes that would melt your DB | 1000 req/min on the hot path; deny politely past that |

Use **Upstash Ratelimit** (free tier covers MVP-scale, edge-runtime compatible, Vercel KV under the hood):

```bash
npm install @upstash/ratelimit @upstash/redis
```

```ts
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Sliding window beats fixed window — no edge cases at minute boundaries.
export const limiters = {
  auth:        new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10,  '1 m'), prefix: 'rl:auth' }),
  aiPerUser:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30,  '1 m'), prefix: 'rl:ai-user' }),
  aiGlobal:    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(1000,'1 m'), prefix: 'rl:ai-global' }),
  general:     new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60,  '1 m'), prefix: 'rl:general' }),
};

export function clientKey(req: Request): string {
  // Prefer forwarded IP from the platform (Vercel sets x-forwarded-for, x-real-ip).
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0].trim();
  return fwd ?? req.headers.get('x-real-ip') ?? 'anon';
}
```

Apply at every public Route Handler entry:

```ts
import { limiters, clientKey } from '@/lib/rate-limit';
import { auth } from '@/auth';

export async function POST(req: Request) {
  const ip = clientKey(req);
  const ipResult = await limiters.general.limit(ip);
  if (!ipResult.success) return Response.json({ error: 'rate_limited' }, { status: 429, headers: rateLimitHeaders(ipResult) });

  const session = await auth();
  if (session?.user?.id) {
    const userResult = await limiters.aiPerUser.limit(session.user.id);
    if (!userResult.success) return Response.json({ error: 'user_rate_limited' }, { status: 429, headers: rateLimitHeaders(userResult) });
  }
  // ... handle request
}

function rateLimitHeaders(r: { limit: number; remaining: number; reset: number }) {
  return {
    'X-RateLimit-Limit':     String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset':     String(Math.ceil(r.reset / 1000)),
    'Retry-After':           String(Math.ceil((r.reset - Date.now()) / 1000)),
  };
}
```

For Vercel Edge Middleware (pre-routing), the same pattern works — use `req.ip` directly.

**Anti-pattern**: rate limiting only the failures (e.g., only failed logins). Successful requests cost too. Limit everything that has a cost ceiling.

### API isolation (subdomain pattern, never the raw IP)

A monolith where the marketing landing, the app, and the API all live under one origin works at MVP scale. Two patterns improve security as you grow:

1. **Subdomain isolation** — `app.domain.com` for the application UI, `api.domain.com` for the API surface, `admin.domain.com` for the founder dashboard. Each subdomain gets its own CSP, its own cookie scope, its own rate-limit budgets, and its own ingress rules. When an attacker finds an XSS in a marketing landing on `domain.com`, the cookies for `api.domain.com` are protected (cookies set with the `Domain=api.domain.com` attribute, NOT `Domain=.domain.com`).

2. **Never expose the raw deployment URL or IP.** A `*.vercel.app` URL still works after you point a custom domain (sub-skill 15), and an attacker who finds the raw URL bypasses any subdomain-scoped controls. After custom domain is live, set up a Vercel redirect from `*.vercel.app` to the custom domain, OR use Vercel's "Production Branch URL Protection" (deployment protection) to require auth.

3. **For projects with separate frontend/backend deploys**: the backend lives at `api.<domain>` (or a private subdomain), CORS allowlist names ONLY the frontend's public domain, and ingress is restricted at the platform level (Cloudflare WAF rules, Vercel firewall, or AWS API Gateway resource policies) to drop requests not bearing your CSRF/origin signature.

**MVP move**: in `next.config.ts` or via Vercel project settings, configure rewrites so `api.<domain>` resolves to the same Next.js app (or a separate one), and all `/api/*` routes only accept requests with `Origin` matching the app domain. The agent sets this up at sub-skill 15 (domain) when the custom domain is wired.

### Backend lockdown (only if the project has a separate backend)

Some projects deploy the backend separately from the frontend (e.g., Express/Fastify on a different host, or a Lambda). When that's the case, the backend must **only accept requests from your own deployed frontend**. Otherwise anyone can point another app at your backend and reuse it for free.

1. **CORS allowlist &mdash; never `*`.** Configure CORS to allow exactly the origins you control.
   ```ts
   const allowed = new Set([
     'https://your-domain.com',
     'https://www.your-domain.com',
     ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
   ]);

   app.use((req, res, next) => {
     const origin = req.headers.origin;
     if (origin && allowed.has(origin)) {
       res.setHeader('Access-Control-Allow-Origin', origin);
       res.setHeader('Vary', 'Origin');
       res.setHeader('Access-Control-Allow-Credentials', 'true');
       res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
       res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
     }
     if (req.method === 'OPTIONS') return res.sendStatus(204);
     next();
   });
   ```
2. **Origin/Referer verification on state-changing requests.** Browsers send `Origin` on cross-origin POSTs &mdash; if it's missing or not in the allowlist, reject. This blocks CSRF and casual reuse.
3. **Auth tokens scoped to the frontend domain.** Cookies set `SameSite=Strict` (or `Lax` if OAuth redirects need it) and `Secure`. JWTs in `Authorization` headers should be issued with an audience claim matching your frontend.
4. **Don't expose API surface in production.** Disable Swagger / OpenAPI docs unless gated behind admin auth. Don't return verbose error stack traces.

For Next.js projects where the API routes live in the same app as the frontend, CORS is automatically same-origin and this section is moot &mdash; your concern is just the cookie/SameSite settings.

### Encryption — at rest, in transit, and key management

**In transit (every byte that crosses the network):**

- **TLS 1.3 only.** Vercel and modern PaaS default to this; verify with `curl -v https://your-domain.com 2>&1 | grep -i 'SSL connection'`.
- **HSTS preload** (above) prevents downgrade attacks.
- **Certificate management is automatic** on Vercel / Netlify / Cloudflare — Let's Encrypt rotation is handled. For self-managed deploys, use `certbot --nginx` with auto-renewal.
- **Internal service-to-service calls** (when the app calls a backend on a separate host) ALSO use TLS — never HTTP, even on a "private" network. Internal-only is a myth; cross-AZ traffic on AWS traverses fiber that other tenants share.

**At rest (data sitting in storage):**

Three layers, applied per data class:

1. **Disk-level encryption** — your DB provider does this for free. Verify it's on:
   - Neon: enabled by default (AES-256, AWS KMS managed keys).
   - Supabase: enabled by default.
   - Postgres on Vercel: enabled by default.
   - Self-managed RDS: turn on "Encryption at rest" in the console (cannot be added later — clone-restore needed).
   - **Tell the user**: *"Disk-level encryption is on by default for `<provider>`. This protects against an attacker stealing the physical disk or a backup."*

2. **Application-level encryption for high-sensitivity columns** — disk encryption doesn't help if an attacker gets DB credentials. For PII you'd be embarrassed to see in a breach (SSNs, plaintext personal notes, OAuth refresh tokens, anything HIPAA/GLBA-classified), encrypt at the application layer using **envelope encryption**:

   ```ts
   // lib/crypto.ts
   import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

   // 32-byte data-encryption key. In production, fetched from KMS per-request and cached briefly.
   const DEK = Buffer.from(process.env.APP_ENCRYPTION_KEY!, 'base64');
   if (DEK.length !== 32) throw new Error('APP_ENCRYPTION_KEY must be 32 bytes (base64-encoded)');

   export function encrypt(plaintext: string): string {
     const iv = randomBytes(12);
     const cipher = createCipheriv('aes-256-gcm', DEK, iv);
     const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
     const tag = cipher.getAuthTag();
     // Format: iv (12) | tag (16) | ciphertext, base64.
     return Buffer.concat([iv, tag, ct]).toString('base64');
   }

   export function decrypt(blob: string): string {
     const buf = Buffer.from(blob, 'base64');
     const iv = buf.subarray(0, 12);
     const tag = buf.subarray(12, 28);
     const ct = buf.subarray(28);
     const decipher = createDecipheriv('aes-256-gcm', DEK, iv);
     decipher.setAuthTag(tag);
     return decipher.update(ct).toString('utf8') + decipher.final('utf8');
   }
   ```

   Generate the key once: `openssl rand -base64 32 | tr -d '\n'` — store as `APP_ENCRYPTION_KEY` in `.env.local` and Vercel env. Encrypted columns use `text` type in the schema; the encrypt/decrypt happens in the model layer.

3. **Field-level encryption with customer-held keys (BYOK)** — only relevant for B2B Enterprise customers who require it. Defer until a customer asks. Mention it as "post-MVP" if SOC 2 / HIPAA buyers are in the audience.

**Key management:**

- **Local dev**: `.env.local`, gitignored. Generated with `openssl rand`.
- **Production**: Vercel encrypted env vars (or AWS Secrets Manager / GCP Secret Manager / equivalent). Vercel encrypts at rest with their own KMS; you don't hold the keys but you don't have to manage rotation either.
- **Per-environment**: dev / staging / prod NEVER share keys. Generate fresh per environment.
- **Rotation**: target 90 days for credentials that touch user data (DB passwords, encryption keys, OAuth secrets). For OAuth secrets and Stripe webhook secrets that don't have an obvious rotation moment, set a calendar reminder. Auth.js + Resend / Stripe rotate API keys without breaking sessions if you do it carefully (overlap window).
- **Never log keys** (see SKILL.md logging discipline rule). The agent grep-tests this in sub-skill 17.

**For HIPAA / GLBA / SOC 2 projects**: envelope encryption with a customer-key-management-service (KMS) — AWS KMS, GCP Cloud KMS, HashiCorp Vault — becomes mandatory. The agent flags this in 03-compliance and ships the KMS integration here in 11.

### Cost ceilings at the platform level (defense in depth)

Sub-skill 07 wired in-app ceilings that throw `BudgetExhausted` when monthly caps are hit. That's the agent-controlled layer. **The platform itself also offers cost-cap controls** at the account level — and those are the ultimate backstop. Configure both; if either fires, the founder is protected from a runaway bill.

| Service | Where to set the platform-level cap | Behavior at cap |
| --- | --- | --- |
| **OpenAI** | Dashboard → Billing → Usage limits → Hard limit + Soft limit | Hard limit refuses API calls; soft limit emails the account holder. Set hard limit to ~3× the in-app ceiling so the in-app one trips first; the hard limit is the catastrophe stopper. |
| **Vercel** | Dashboard → Settings → Billing → Spend Management → Set monthly budget | Hard cap pauses the project at the cap (Hobby/Pro). Pause behavior matters: the user's site goes dark — usually preferable to a $5K bill, but the founder needs to know this is the trade. |
| **Resend** | Dashboard → Settings → Limits — set daily / monthly send limits | Refuses sends past the cap. Critical: align with the in-app cap so transactional email keeps flowing while marketing email caps out. |
| **Stripe** | No spend cap (you receive money, not pay it). But: rate limits + radar rules to prevent fraud-driven processing fee runaway. |
| **Neon / Supabase / Vercel Postgres** | Dashboard → Compute autoscaling settings — set max compute size + max storage | Limits scale-up under load; can refuse new connections if hit. |
| **Sentry** | Dashboard → Stats → Spike Protection (on by default for free tier) | Drops events past the burst threshold; better than burning quota in 5 minutes during an error storm. |
| **Anthropic / Claude API** | Dashboard → Limits → Set monthly cap | Hard cap, similar to OpenAI's. |

The agent walks the user through setting each — typically by sending them a one-click link to the right dashboard page and waiting for confirmation. Each cap is recorded in `STATE.yaml`:

```yaml
decisions:
  platform_cost_caps:
    openai:
      hard_limit_usd: 200       # 3× the in-app cap
      soft_limit_usd: 100       # email alert
      configured_at: "2026-05-04"
    vercel:
      monthly_budget_usd: 50
      pause_on_cap: true
      configured_at: "2026-05-04"
    # ... etc.
```

**The agent flags before launch** (sub-skill 17 ship checklist verifies): every external service that bills usage-based has BOTH an in-app ceiling AND a platform-level cap. Without both, a bug or viral spike can drain the account.

### Disaster preparedness — backups, runbook, status page

Pre-launch, the agent ships a basic disaster-recovery posture so the founder isn't improvising at 2 AM when production goes down.

#### Database backups — verify they exist; verify they restore

Most managed Postgres providers do daily backups by default. The agent **verifies** for the chosen provider and writes the verification to `PROJECT.md`:

| Provider | Default | Retention | Verification command |
| --- | --- | --- | --- |
| **Neon** | Continuous (point-in-time recovery) | 7 days (Free), 14 days (Launch), 30 days (Scale) | Console → Branches → Restore: confirm "Restore" option exists |
| **Supabase** | Daily | 7 days (Free), 14+ (paid) | Console → Database → Backups |
| **Vercel Postgres** | Daily | 7 days (Hobby), 30 days (Pro) | Console → Storage → Backups |
| **Self-managed RDS / Cloud SQL** | Configurable | Whatever the founder set | Take a manual snapshot now: `aws rds create-db-snapshot ...` |

**Verify recovery actually works** before relying on it. The agent does a one-time test:

1. In a non-production database (a Neon dev branch, a Supabase dev project, or a duplicated RDS instance), restore the latest backup.
2. Run `npm run test:integration` against the restored copy.
3. If tests pass, recovery works. Document the procedure in the runbook.
4. If tests fail, fix backup config before launch.

#### Runbook — one page, written by the agent

`docs/runbook.md` covers the small set of foreseeable incidents. The agent generates it tailored to the actual stack:

```markdown
# Runbook

## Production is down (returning 5xx everywhere)
1. Check `https://<status-page-url>` — has the agent posted an incident?
2. Check Vercel Dashboard → Deployments → latest. If a recent deploy is the cause:
   `vercel rollback` (or in the dashboard, "Promote previous deployment").
3. Check the platform's own status page: status.vercel.com / status.openai.com / status.resend.com / etc.
4. Check `/admin/alerts` for what fired.

## Database is down or slow
1. Provider status page (status.neon.tech / status.supabase.com / etc.).
2. Connection pool saturated? Check the provider dashboard for connection count vs limit.
3. Long-running query? `SELECT pid, age(clock_timestamp(), query_start), query FROM pg_stat_activity WHERE state != 'idle' ORDER BY 2 DESC LIMIT 5;`
4. If saturation: temporarily raise the pool limit, kill long queries, deploy a fix.

## I leaked a secret
1. Rotate the leaked credential **immediately** at the issuing service (OpenAI / Resend / Stripe / Auth.js / etc.).
2. Update the new secret in `.env.local` AND in Vercel env (Production + Preview + Development).
3. Redeploy.
4. Audit recent activity on that service for unauthorized use.
5. If the leak was in a git commit, rewrite history with `git filter-repo` or accept that it's published and rely on (1).

## I deleted production data
1. Check provider's point-in-time recovery — Neon supports up to 7 days; restore a branch from before the deletion.
2. If unrecoverable: communicate to users via status page + email. Honesty over silence.

## Cost ceiling tripped, service degraded
1. Check `/admin/cost` for which service hit the cap.
2. If legitimate growth: raise the cap (in-app + platform) and redeploy / refresh.
3. If runaway: identify the source via `/admin/usage` or `/admin/analytics`, fix the bug or rate-limit, then raise.
```

The agent **commits this runbook** at sub-skill 14 deploy time and references it in `STATE.yaml`'s `# Decisions`. The user reads it once before launch so they're not learning the layout during an incident.

#### Status page — minimum viable

A `/status` route that's not gated by auth, returns plain HTML, and the founder can update without a deploy. Three variants depending on how invested the user is:

- **Lowest-effort**: `/status` is a static page that says "All systems normal." The founder edits it in the deploy and pushes when there's an incident. Adequate for an MVP with < 100 users.
- **Better**: `/status` reads from a `status_messages` table in the same DB; the founder updates it via `/admin/status` (a tiny admin page). Updates are instant, no deploy needed.
- **Best**: third-party (BetterStack / Statuspage.io / Instatus). Higher cost and external surface but built-in incident timeline. Worth it past 1000 users.

The agent ships option 1 by default at MVP scale and surfaces options 2-3 as "post-MVP if you grow."

#### Backup verification before launch

The agent runs through these manually before declaring ready-to-ship:

- [ ] DB backup retention configured and visible in the provider console.
- [ ] One-time restore test passed (`npm run test:integration` against restored copy).
- [ ] `docs/runbook.md` is committed and referenced from `README.md`.
- [ ] `/status` route exists and returns 200 from public traffic.
- [ ] Founder has the runbook URL bookmarked.

### Structured logging (implementing the SKILL.md logging rule)

SKILL.md's logging discipline rule covers the WHAT and WHY. This section ships the HOW.

Install **pino** as the structured logger. It's the fastest Node logger by an order of magnitude, supports redaction natively, JSON output that platforms like Vercel / Datadog / Cloudwatch parse for free.

```bash
npm install pino
```

```ts
// lib/log.ts
import pino from 'pino';

const SECRET_PATTERNS = [
  // API key prefixes — extend as you add SDKs.
  /sk_(test|live)_[A-Za-z0-9]{16,}/g,
  /pk_(test|live)_[A-Za-z0-9]{16,}/g,
  /re_[A-Za-z0-9]{16,}/g,
  /whsec_[A-Za-z0-9]{16,}/g,
  /phc_[A-Za-z0-9]{16,}/g,
  /SG\.[A-Za-z0-9_-]{20,}/g,
  /Bearer\s+[A-Za-z0-9._-]{20,}/g,
  // bcrypt hashes
  /\$2[aby]\$\d{2}\$[A-Za-z0-9./]{53}/g,
  // session-token-shaped strings (32+ hex)
  /\b[a-f0-9]{32,}\b/g,
];

function scrub(value: unknown): unknown {
  if (typeof value === 'string') {
    let out = value;
    for (const pat of SECRET_PATTERNS) out = out.replace(pat, '[REDACTED]');
    return out;
  }
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) result[k] = scrub(v);
    return result;
  }
  return value;
}

export const log = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  // Pino's own redact does field-name based redaction; combine with the pattern-based scrub above.
  redact: {
    paths: [
      'req.headers.authorization', 'req.headers.cookie',
      '*.password', '*.passwordHash', '*.password_hash',
      '*.apiKey', '*.api_key', '*.secret',
      '*.token', '*.accessToken', '*.refreshToken',
      '*.email',  // log user.id instead; if you must log email, hash it
      '*.ssn', '*.dob', '*.phoneNumber', '*.creditCard',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    log: (obj) => scrub(obj) as Record<string, unknown>,
  },
});

// Convenience factory for request-scoped child loggers — auto-includes request ID + user ID.
export function logFor(req: Request, userId?: string) {
  return log.child({
    requestId: req.headers.get('x-request-id') ?? crypto.randomUUID(),
    userId: userId ?? null,
    method: req.method,
    path: new URL(req.url).pathname,
  });
}
```

Use it everywhere instead of `console.log`:

```ts
// app/api/some-route/route.ts
import { logFor } from '@/lib/log';

export async function POST(req: Request) {
  const log = logFor(req);
  log.debug({ event: 'someroute.start' }, 'request received');  // dev only
  try {
    // ... work ...
    log.info({ event: 'someroute.success', durationMs: 12 }, 'request handled');
  } catch (err) {
    log.error({ event: 'someroute.error', err }, 'request failed');
    throw err;
  }
}
```

**Test-environment logging** — Vitest sets `NODE_ENV=test`; pino picks up `LOG_LEVEL=debug` by default in non-prod. Tests that need silent logs (e.g., expected-error paths) wrap with `vi.spyOn(log, 'error').mockImplementation(() => {})`.

**Anti-patterns** (the agent never does these):
- `console.log(req.body)` — body might contain passwords / PII.
- `console.log(user)` — `user` likely has email + phone + sometimes payment context.
- `console.log({ err })` where `err.config.headers.Authorization` exists — axios + fetch errors include the auth header in the request config.
- Logging full URLs with query strings — query strings often carry tokens.
- Adding a "debug mode" env flag that bypasses redaction. There's no environment where bypassing redaction is correct.

### Route inventory and orphan deletion

Every route is attack surface and a maintenance burden. Audit them.

1. **List every defined route** in the codebase:
   ```bash
   # Next.js App Router
   find app -path "*/route.ts" -o -path "*/route.tsx" | sort
   ```
   For Express-style backends, walk router definitions. For other frameworks, equivalent.
2. **List every route the frontend actually calls:**
   ```bash
   grep -rE "fetch\(['\"\`]/api/|axios\.[a-z]+\(['\"\`]/api/" app components | \
     grep -oE "/api/[a-zA-Z0-9/_-]+" | sort -u
   ```
3. **Cross-reference.** Routes defined but never called are **orphans** &mdash; relics from earlier iterations or speculative endpoints. Each one is unmaintained attack surface for no benefit.
4. **For each defined route, also confirm:**
   - Does it require auth? If yes, is `auth()` actually called server-side at the top?
   - Does it leak fields the UI doesn't use? (Sub-skill 12 covers this in depth for backend projects.)
   - Is it referenced anywhere public (sitemap, OpenAPI doc, README) that would let a scraper find it?
5. **Delete the orphans.** Tell the user before deleting: *"I found these routes that don't appear to be called from the frontend: \<list\>. They're attack surface for no benefit. OK to delete them?"*

## DIALOGUE — confirm with the user

Report:
- Which headers you added.
- Whether `npm audit` is clean.
- Whether any rate limiting is in place, and on which endpoints.
- Which rate limits are configured + on which endpoints.
- Whether disk-level encryption is on for the DB (provider name + verification method).
- Whether application-level encryption is wired for any sensitive columns.
- Whether the structured logger is installed and used.

If you found anything you couldn't fix in this pass, list it under `# Open questions` in `PROJECT.md`.

## Exit criteria

- Headers configured.
- `npm audit --omit=dev` shows zero high/critical.
- Inputs validated with Zod on every server entry point.
- If a separate backend exists: CORS allowlist set to deployed frontend origin(s) only; no `*`. Origin verification on state-changing requests.
- Route inventory complete; orphan routes deleted (with user confirmation); every authed route actually checks auth server-side.
- Rate limiting active on auth, AI, email, and DB-write endpoints. `429` includes `Retry-After`.
- Security headers score A or A+ on https://securityheaders.com.
- HSTS active with `preload` directive (preload submission optional but recommended).
- Disk-level encryption verified on the DB provider.
- Application-level encryption wired for any column the agent classified as PII / regulated.
- `lib/log.ts` exists; no raw `console.log` calls remain in `app/`, `lib/`, or `pages/` (run `grep -r 'console\.log' app lib pages 2>/dev/null` to verify).
- Production `LOG_LEVEL` is `info` or `warn`. No `debug` level in Vercel env vars.
- A `# Security` line in `PROJECT.md` records the audit date and any deferred items.
- Platform-level cost caps configured for every billing-meter service (OpenAI, Vercel, Resend, Neon, Sentry as relevant). Recorded in `STATE.yaml decisions.platform_cost_caps`. Defense-in-depth alongside in-app ceilings from sub-skill 07.
- DB backup retention verified; one-time restore test passed.
- `docs/runbook.md` committed; `/status` route returns 200.

Move on to `12-performance.md`.
