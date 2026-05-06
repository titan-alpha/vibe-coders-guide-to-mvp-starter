# 14 · Deploy

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

If yes, use the Playwright headed-mode script (identical pattern to sub-skill 14 and 15 &mdash; open `https://vercel.com/login`, pause for sign-in, navigate to `https://vercel.com/account/tokens`, pause while the user creates + copies the token, then read it from stdin).

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

## AUTONOMOUS — bump version, write CHANGELOG entry, tag the release

Per SKILL.md's versioning operating rule, every deploy gets a `vMAJOR.MINOR.PATCH` bump. The agent does this **before** triggering the platform deploy so the deployed artifact is associated with a known version.

### 1. Pick the bump type

Read the diff since the last tag (or since the initial commit if there's no tag yet). Classify the changes:

```bash
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo '')
if [ -n "$LAST_TAG" ]; then
  git log "$LAST_TAG"..HEAD --oneline
else
  git log --oneline | head -50
fi
```

| Bump | Triggered by changes that include any of: |
| --- | --- |
| **MAJOR** | Removed routes, removed/renamed API fields, schema migrations requiring user action, env var renames, breaking redirects |
| **MINOR** | New routes, new optional fields, new pages, new admin tabs, new opt-in features |
| **PATCH** | Bug fixes, copy edits, dependency bumps without behavior change, perf, security patches |

If the diff has multiple categories, pick the highest. **A single MAJOR change makes the whole release MAJOR**, regardless of how many PATCH-class fixes ride along.

For pre-MVP (`v0.x.y`), the rules relax slightly: any bump increments MINOR by default; reserve MAJOR for the eventual `v1.0.0` graduation when you commit to API stability.

### 2. Bump `package.json`

```bash
# npm version handles the bump + amends package-lock.json + tags + commits
npm version <patch|minor|major>          # also creates the git tag automatically
# or, if you want to set explicitly:
npm version 0.3.0 --no-git-tag-version    # no auto-tag; you'll tag after CHANGELOG
```

For `0.x.y` projects, use `--allow-same-version` if you're aligning to a tag that already exists.

### 3. Write the CHANGELOG entry

Open `CHANGELOG.md` (create it if absent — Keep-a-Changelog format). The agent wrote entries to the `## [Unreleased]` section as work happened during 03–13; now promote them to a versioned heading and start a fresh `## [Unreleased]`.

```markdown
# Changelog

All notable changes to this project will be documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.0] — 2026-05-04

### Added
- Notifications admin tab + bell icon in the header.
- Feedback collection: hamburger item + 3 contextual prompts + admin tab.

### Changed
- Mode-customization: "giving up" items in the configurator are clickable
  to promote skills back into the plan.

### Fixed
- Sticky footer was floating mid-page on short routes; now hugs viewport bottom.
```

If `git log` shows commits that don't fit a CHANGELOG bullet (e.g., refactoring with no user-visible effect), they can be omitted. The CHANGELOG is for the user's reader — your future-self, your customers — not a comprehensive git mirror.

### 4. Create the git tag

```bash
VERSION=$(node -p "require('./package.json').version")
git add CHANGELOG.md package.json package-lock.json
git commit -m "release: v$VERSION"
git tag -a "v$VERSION" -m "v$VERSION"
git push --follow-tags origin main         # or whichever branch the user deploys from
```

If `npm version` already created the tag in step 2, just `git push --follow-tags` — don't tag twice.

### 5. Record in `STATE.yaml`

Append the new version + date to `decisions.released_versions` (append-only history) so the next deploy knows what the previous version was without parsing git tags:

```yaml
decisions:
  released_versions:
    - { version: "0.2.0", date: "2026-04-12", url: "https://example.com" }
    - { version: "0.3.0", date: "2026-05-04", url: "https://example.com" }
```

### 6. Ship CHANGELOG as a public `/changelog` route + first-sign-in surface

The CHANGELOG is marketing surface, not just an internal artifact. Two surfaces ship at every MAJOR/MINOR release (PATCH-only releases skip both):

#### Public `/changelog` route

Renders `CHANGELOG.md` from the repo as a clean web page. Updates with every deploy.

```tsx
// app/changelog/page.tsx
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { compileMDX } from 'next-mdx-remote/rsc';      // or any markdown renderer

export default async function ChangelogPage() {
  const md = await readFile(path.join(process.cwd(), 'CHANGELOG.md'), 'utf8');
  const { content } = await compileMDX({ source: md });
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">What's new</h1>
        <p className="opacity-70 mt-2">Every meaningful change to <strong>{PRODUCT_NAME}</strong>, newest first.</p>
      </header>
      <article className="prose prose-lg max-w-none">{content}</article>
    </main>
  );
}

export const metadata = { title: "What's new — <Product>", description: 'Recent updates and changes.' };
```

The route is linked from the footer (sub-skill 02 footer rule allows "Changelog" as an optional discoverable link, only shown when the route exists).

#### "What's new" first-sign-in surface

When a user signs in for the first time AFTER a MINOR or MAJOR release, show a small panel with the highlights from the latest CHANGELOG entry. Doesn't block — appears as a dismissible card on the dashboard or as a small toast on hover-of-the-bell:

```tsx
// components/WhatsNewCard.tsx — render conditionally on the first authed page after a release
const userLastSeenVersion = await getUserLastSeenVersion(user.id);
const currentVersion = process.env.APP_VERSION;   // or read from package.json at build

if (compareSemver(userLastSeenVersion, currentVersion) < 0) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <h3 className="font-semibold">New in v{currentVersion}</h3>
      <ul className="text-sm mt-2 space-y-1">
        {/* Render Added + Changed bullets from the latest CHANGELOG entry — agent extracts at build time */}
      </ul>
      <button className="btn btn-sm btn-ghost mt-3" onClick={dismissAndUpdateLastSeen}>Got it</button>
    </div>
  );
}
```

The agent **extracts** the latest CHANGELOG entry at build time and ships it as a static JSON in `public/whats-new.json` so the client doesn't need to parse markdown:

```ts
// scripts/extract-whats-new.ts (run as part of the build, before deploy)
import { readFile, writeFile } from 'node:fs/promises';
const md = await readFile('CHANGELOG.md', 'utf8');
// Parse the first version section after [Unreleased]
const match = md.match(/## \[(\d+\.\d+\.\d+)\] — (.+?)\n([\s\S]+?)(?=\n## \[|\n*$)/);
if (match) {
  await writeFile('public/whats-new.json', JSON.stringify({
    version: match[1], date: match[2], body: match[3].trim(),
  }));
}
```

#### Mode-gate (skip both for `quick-ship`)

For `quick-ship` mode, both surfaces are noise — the user has 5 friends looking at it, no need for changelog choreography. Skip both. For everything else, ship both.

#### Anti-patterns

- Writing the CHANGELOG entry only after release. The agent writes entries to the `## [Unreleased]` section throughout development; the deploy promotes them.
- Public CHANGELOG with internal language ("refactored the AuthHandler dispatcher"). The CHANGELOG is for users + customers + investors. Use voice-consistent (sub-skill 02), user-visible language.
- "What's new" card that BLOCKS interaction (modal). Always dismissible inline; user can ignore it.
- Showing "What's new" for PATCH releases. PATCH = bug fixes; users don't need a celebration.

## Smoke test (all paths)

- `curl -I <prod-url>` returns 200 and the security headers from sub-skill 09.
- Open the URL (`open <prod-url>`) and click through the MVP slice. Sub-skill 13 (e2e testing) exercises this more thoroughly &mdash; this is just a sanity check.
- If anything breaks in production that worked locally, the cause is almost always (a) missing env var, (b) Server vs Client Component mismatch, or (c) a build-time vs runtime data-fetch difference. Fix and redeploy.

## Anti-patterns to avoid

- **Pitching Vercel when an existing deploy already works.** Respect what's there.
- **Silently migrating without asking.** If you're switching hosts, the user needs to know &mdash; DNS, analytics, URLs, and webhooks all change.
- **Hand-editing env vars in the Vercel dashboard UI when the CLI can do it scriptably.** Scripted = reproducible.
- **Storing `VERCEL_TOKEN` (or any platform token) in production env.** It belongs on the developer's machine only.
- **Deploying without a version bump.** Every shipped artifact gets a semver tag so you can correlate deployed code to a specific commit and CHANGELOG entry. "Untagged HEAD" is the version of nothing.
- **Editing a previously-shipped CHANGELOG entry to add forgotten changes.** If you missed something, write a follow-up PATCH bump. CHANGELOG history is append-only.
- **Reusing a tag** (force-pushing `v0.3.0` to point at a different commit). Once a tag is pushed, treat it as immutable. If `v0.3.0` shipped broken, `v0.3.1` fixes it.

## Exit criteria

- The MVP slice works on the production URL.
- Whichever platform is in use (existing or Vercel), the agent can redeploy with a single command using credentials in `.env.local`.
- A `# Deploy` section in `PROJECT.md` records: platform, production URL, GitHub repo URL, project/app name, and the redeploy command.
- The user has the production URL in their hands.
- `package.json` `version` is bumped for this release (see SKILL.md versioning rule); a matching `vX.Y.Z` git tag exists; `CHANGELOG.md` has a new section for this version with at least the user-visible bullets; the version + date is appended to `STATE.yaml decisions.released_versions`.
- At MINOR/MAJOR releases, `/changelog` route is reachable + footer-linked; `public/whats-new.json` is generated at build; first-sign-in "what's new" surface displays for users on a previous version.

Move on to `15-domain.md`.
