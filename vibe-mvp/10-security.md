# 10 · Security

Goal: don't ship the obvious mistakes. This is not a pen-test — it is a hygiene checklist.

## AUTONOMOUS — run the checklist

### Secrets

- `.env.local` is in `.gitignore`. Verify with `git check-ignore .env.local`.
- `git log -p -- .env.local` returns nothing. If a secret was ever committed, **rotate it now** and tell the user.
- No secret is referenced in client-side code. Anything used in a React Client Component must be safe to expose; Server Components and Route Handlers are where secrets live.

### Headers

Add a `next.config.ts` `headers()` function that sets, for all routes:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (loosen only if the app needs them)
- A `Content-Security-Policy` covering `default-src 'self'` plus the specific origins you actually use (auth providers, image CDN, analytics). Start strict, loosen as needed.

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

### Rate limiting

- If there is a public endpoint that triggers email send, AI calls, or DB writes, put it behind rate limiting (Vercel KV + a 5-line middleware, or `@upstash/ratelimit`).

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

If you found anything you couldn't fix in this pass, list it under `# Open questions` in `PROJECT.md`.

## Exit criteria

- Headers configured.
- `npm audit --omit=dev` shows zero high/critical.
- Inputs validated with Zod on every server entry point.
- If a separate backend exists: CORS allowlist set to deployed frontend origin(s) only; no `*`. Origin verification on state-changing requests.
- Route inventory complete; orphan routes deleted (with user confirmation); every authed route actually checks auth server-side.
- A `# Security` line in `PROJECT.md` records the audit date and any deferred items.

Move on to `11-performance.md`.
