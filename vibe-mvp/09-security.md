# 09 · Security

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
- A `# Security` line in `PROJECT.md` records the audit date.

Move on to `10-performance.md`.
