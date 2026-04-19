# 14 · Domain

Goal: get a real custom domain pointed at the Vercel deployment, instead of the `*.vercel.app` URL. Skip if the user is happy with the Vercel subdomain for now &mdash; this can always be done later.

## DIALOGUE — does the user want a custom domain now?

> *"Want to put this on a real domain (e.g., `your-thing.com`) instead of the `*.vercel.app` URL? Costs about $10&ndash;$15/year and takes ~10 minutes. Or we can skip and you can add one later."*

If no, skip and move on to `15-e2e-testing.md`.

If yes, **suggest 3&ndash;5 candidate names** based on `PROJECT.md`. Make them short (≤ 14 chars), brand-able, and avoid hyphens or numbers. Examples for a "garden journal" app: `tendr.app`, `growlog.co`, `plantnote.com`. Suggest both `.com` (default) and one alternative TLD per name (`.app`, `.io`, `.co`). Tell the user to use a domain checker to confirm availability.

## DIALOGUE — offer to drive the browser

> *"For the GoDaddy purchase and DNS setup, want me to drive a browser window? I'll open the registrar, walk through the purchase, and set up the DNS records. You sign in and confirm payment; I do the rest."*

If yes, follow **Browser-driven path**. If no, follow **Manual walk-through**. Both flow into the same DNS step.

---

## Browser-driven path

```bash
npx playwright install chromium  # if not already done in sub-skill 13
```

```ts
// scripts/godaddy-bootstrap.ts
import { chromium } from 'playwright';
import readline from 'node:readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const wait = (m: string) => rl.question(`\n>> ${m}\n   Press Enter when done... `);

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

await page.goto('https://www.godaddy.com');
await wait('Search for your chosen domain in the GoDaddy search bar.');
await wait('Add it to cart and complete checkout. Skip every upsell (privacy, hosting, email — Vercel covers what you need).');

await page.goto('https://dcc.godaddy.com/control/portfolio');
await wait('Sign in if prompted. Find your new domain and click into DNS / Manage DNS.');

console.log('\nNext, you\'ll add the DNS records I print below. Stay on the DNS page.');
await rl.close();
await browser.close();
```

Pause-and-resume Playwright works well here because purchase requires payment info the agent must not handle.

---

## Manual walk-through (fallback)

1. *"Open https://www.godaddy.com."*
2. *"Search for your chosen domain. If taken, try the alternates I suggested."*
3. *"Add to cart. **Skip every upsell** &mdash; privacy is included free now; you don't need their email, hosting, or 'website builder.'"*
4. *"Complete checkout."*
5. *"Once purchased, go to https://dcc.godaddy.com/control/portfolio, find the domain, and click **DNS** (or **Manage DNS**)."*

GoDaddy works fine. Cloudflare Registrar is cheaper at renewal but only sells `.com`/`.org`/etc. and requires moving DNS to Cloudflare. For an MVP, GoDaddy + their DNS is fastest.

---

## AUTONOMOUS — connect domain to Vercel

### 1. Add domain to Vercel

```bash
VERCEL_TOKEN=$(grep '^VERCEL_TOKEN=' .env.local | cut -d= -f2-) \
  npx vercel domains add <domain> --yes
```

Then attach it to the project:
```bash
VERCEL_TOKEN=… npx vercel alias set <prod-deployment-url> <domain>
```

(Or do it via the Vercel dashboard: Project &rarr; Settings &rarr; Domains &rarr; Add &rarr; type the domain.)

Vercel will tell you exactly which DNS records to add. Capture them.

### 2. DNS records the user needs to add at GoDaddy

Walk the user through it. Vercel typically wants:

- For the **apex** (`example.com`): an `A` record pointing to `76.76.21.21`.
- For the `www` subdomain: a `CNAME` pointing to `cname.vercel-dns.com`.

(Always copy the exact values from Vercel's UI &mdash; they occasionally update.)

In GoDaddy DNS:
1. Delete any default `A` record on `@` that points elsewhere (often a GoDaddy parking page).
2. Add the records Vercel provided.
3. Save.

### 3. Wait + verify

DNS propagates in 5&ndash;30 minutes typically (sometimes longer). Check:
```bash
dig <domain> +short
dig www.<domain> +short
```

When the records resolve, Vercel will auto-issue an SSL cert. The Vercel dashboard shows green checkmarks on each domain when ready.

### 4. Update everything that hardcoded the old URL

- `EMAIL_FROM` (sub-skill 03 / Resend) &mdash; switch to `noreply@<domain>` once the domain is verified inside Resend.
- `NEXTAUTH_URL` / `AUTH_URL` if Auth.js needs it.
- OAuth provider redirect URIs (Google / GitHub consoles): add `https://<domain>/api/auth/callback/<provider>`.
- Any social/OG meta tags hardcoding the `vercel.app` URL.

### 5. Verify the domain in Resend (optional but recommended)

To stop sending from `onboarding@resend.dev`:
1. Resend dashboard &rarr; Domains &rarr; Add Domain.
2. Resend gives you DNS records (SPF, DKIM, MX). Add them at GoDaddy.
3. Wait for verification, then switch `EMAIL_FROM` and redeploy.

## Exit criteria

- `https://<domain>` and `https://www.<domain>` both load the production site with valid SSL.
- All hardcoded URLs and OAuth redirect URIs are updated.
- A `# Domain` line in `PROJECT.md` records the registrar, domain, and renewal date.

Move on to `15-e2e-testing.md`.
