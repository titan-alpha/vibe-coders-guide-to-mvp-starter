# 11 · Deploy

Goal: get the MVP live on the internet, under an account the user controls, with the agent doing as much of the work as possible. **Check for an existing deployment first &mdash; don't force the user to move to Vercel if they're already somewhere that works.**

## AUTONOMOUS — detect existing deployment

Before asking anything, walk the repo for deploy evidence. Look at:

| Signal | Likely platform | Agent can manage autonomously? |
| --- | --- | --- |
| `.vercel/project.json`, `vercel.json` | **Vercel** | Yes (CLI + token) |
| `netlify.toml`, `_redirects`, `netlify/functions/` | **Netlify** | Yes (CLI + token) |
| `wrangler.toml`, `wrangler.jsonc`, `.cloudflare/` | **Cloudflare** Workers/Pages | Yes (CLI + token) |
| `fly.toml` | **Fly.io** | Yes (flyctl) |
| `railway.json`, `.railway/` | **Railway** | Yes (CLI) |
| `render.yaml` | **Render** | Partial (dashboard-first; limited CLI) |
| `Procfile` + Heroku remote | **Heroku** | Yes (CLI + token) |
| `buildspec.yml`, `samconfig.toml`, `template.yaml`, `amplify.yml`, CDK code, `serverless.yml`, `sst.config.ts` | **AWS** (SAM / Amplify / CDK / Serverless / SST) | No &mdash; usually requires IAM, interactive steps, and custom pipelines |
| `app.yaml`, `cloudbuild.yaml` | **GCP** App Engine / Cloud Run | No &mdash; gcloud auth + manual per-service config |
| `Dockerfile` + `k8s/`, `helm/`, or similar | **Custom / Kubernetes** | No |
| `.github/workflows/*.yml` with deploy steps | **CI-based deploy** (platform depends on steps inside) | Sometimes &mdash; depends on target |

Also read:
- `package.json` `scripts.deploy` or `scripts.release`
- `README.md` for a "Deployment" section
- `.git/config` remotes (e.g., `heroku`, `dokku`)

Summarize what you find in one line for the user. Pick one of the three paths below.

## Path A — Existing deployment, agent can manage it

If you found evidence of a platform in the "Yes" column above, **continue using that platform**. Don't pitch Vercel. Confirm with the user:

> *"Looks like this project already deploys to **{platform}**. I can drive deploys there &mdash; I just need you to give me {the relevant token} once. Sound good?"*

Token / credential flow by platform (all land in `.env.local`, gitignored, loaded on every deploy):

| Platform | Env var | Where to get it |
| --- | --- | --- |
| Vercel | `VERCEL_TOKEN` | https://vercel.com/account/tokens |
| Netlify | `NETLIFY_AUTH_TOKEN` | https://app.netlify.com/user/applications#personal-access-tokens |
| Cloudflare | `CLOUDFLARE_API_TOKEN` | https://dash.cloudflare.com/profile/api-tokens (scoped: *Edit Cloudflare Workers* or *Pages*) |
| Fly.io | `FLY_API_TOKEN` | `flyctl auth token` |
| Railway | `RAILWAY_TOKEN` | https://railway.app/account/tokens |
| Heroku | `HEROKU_API_KEY` | https://dashboard.heroku.com/account |

Offer to **drive a browser** to the right page (see SKILL.md Browser automation). Once the token lands in `.env.local`, deploy with the platform's CLI:

```bash
# Vercel
VERCEL_TOKEN=… npx vercel --prod --yes

# Netlify
NETLIFY_AUTH_TOKEN=… npx netlify deploy --prod --dir=<build-dir>

# Cloudflare Pages
CLOUDFLARE_API_TOKEN=… npx wrangler pages deploy <build-dir>

# Fly.io
FLY_API_TOKEN=… flyctl deploy

# Railway
RAILWAY_TOKEN=… npx @railway/cli up

# Heroku
git push heroku main
```

Push production env vars using the platform's CLI equivalent (`vercel env add`, `netlify env:set`, `wrangler secret put`, `flyctl secrets set`, `railway variables set`, `heroku config:set`). Confirm with the user before adding anything they haven't authorized.

Skip to the **Smoke test** section below.

## Path B — Existing deployment, agent can't manage it autonomously

If you found evidence in the "No" column (AWS, GCP, custom Kubernetes, hand-rolled pipelines), be honest:

> *"Your project currently deploys to **{platform}**. I can't drive that deploy end-to-end from here &mdash; it needs manual steps (IAM policies / kubectl / custom pipelines) every time we ship.
>
> Two options:*
> - *Keep it. You run `<the existing command>` when we need to deploy; I just prep the build and confirm the env var set.*
> - *Migrate to **Vercel** &mdash; takes ~10 minutes. The trade: I can handle the full deploy cycle for you after that. Every code change I make gets pushed and deployed automatically. Env vars, domains, redeploys &mdash; all from my side. You focus on the product.*
>
> *What do you prefer?"*

Don't push. If they want to keep their infrastructure, document the deploy steps clearly in `PROJECT.md` and walk them through pushing a build. The rest of this guide still works &mdash; domain, e2e, ship-checklist all apply.

If they want to migrate, follow **Path C** below.

## Path C — No existing deployment (or the user opted in to switch)

Go with **Vercel**. It's the cheapest, fastest, and most agent-friendly for MVP-grade Next.js apps, and it's what the rest of this guide assumes by default.

### C.1 Offer to drive the browser

> *"For the Vercel signup and token flow, want me to drive a Chrome window? I'll open each page; you just sign in and click 'Create Token' where I pause &mdash; I handle the navigation."*

If yes, use the Playwright headed-mode script (identical pattern to sub-skill 12 and 13 &mdash; open `https://vercel.com/login`, pause for sign-in, navigate to `https://vercel.com/account/tokens`, pause while the user creates + copies the token, then read it from stdin).

Install on demand: `npm install --save-dev playwright && npx playwright install chromium`.

If no, walk manually:
1. *"Open https://vercel.com/signup. Sign up with GitHub."*
2. *"Open https://vercel.com/account/tokens. Click **Create Token**. Name it after the project. Scope: **Full Account**. Expiration: 90 days."*
3. *"Copy the token (you won't see it again). Paste it here."*

Before asking, run `grep -q '^VERCEL_TOKEN=' .env.local 2>/dev/null && echo found` &mdash; skip if you already have one.

Append to `.env.local`:
```
VERCEL_TOKEN=<token>
```
Confirm `.env.local` is gitignored.

### C.2 Push to GitHub first (if not already)

- If `gh` is installed: `gh repo create <name> --private --source=. --remote=origin --push`.
- Otherwise: open https://github.com/new (or via the Playwright window), have the user create the repo, then `git remote add origin <url> && git push -u origin main`.

### C.3 Link and deploy

```bash
VERCEL_TOKEN=$(grep '^VERCEL_TOKEN=' .env.local | cut -d= -f2-) \
  npx vercel link --yes --project <project-name>
```

Push production env vars. For every key in `.env.local` that production needs (auth secrets, DB URLs, `OPENAI_API_KEY`, `RESEND_API_KEY`, `ADMIN_PASSWORD`, etc.) &mdash; but **not** `VERCEL_TOKEN` itself:

```bash
echo "$VALUE" | VERCEL_TOKEN=… npx vercel env add KEY production
```

Confirm with the user before pushing any secret whose origin is unclear.

Deploy:
```bash
VERCEL_TOKEN=… npx vercel --prod --yes
```

Capture the production URL.

## Smoke test (all paths)

- `curl -I <prod-url>` returns 200 and the security headers from sub-skill 09.
- Open the URL (`open <prod-url>`) and click through the MVP slice. Sub-skill 13 (e2e testing) exercises this more thoroughly &mdash; this is just a sanity check.
- If anything breaks in production that worked locally, the cause is almost always (a) missing env var, (b) Server vs Client Component mismatch, or (c) a build-time vs runtime data-fetch difference. Fix and redeploy.

## Anti-patterns to avoid

- **Pitching Vercel when an existing deploy already works.** Respect what's there.
- **Silently migrating without asking.** If you're switching hosts, the user needs to know &mdash; DNS, analytics, URLs, and webhooks all change.
- **Hand-editing env vars in the Vercel dashboard UI when the CLI can do it scriptably.** Scripted = reproducible.
- **Storing `VERCEL_TOKEN` (or any platform token) in production env.** It belongs on the developer's machine only.

## Exit criteria

- The MVP slice works on the production URL.
- Whichever platform is in use (existing or Vercel), the agent can redeploy with a single command using credentials in `.env.local`.
- A `# Deploy` section in `PROJECT.md` records: platform, production URL, GitHub repo URL, project/app name, and the redeploy command.
- The user has the production URL in their hands.

Move on to `12-domain.md`.
