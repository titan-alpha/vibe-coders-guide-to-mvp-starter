# Vibe MVP Starter

A Next.js 15 + TypeScript + Tailwind v4 + DaisyUI starter with every feature
pre-scaffolded and env-var toggleable. **The Vibe Coder's Guide to MVP skill
bundle ships inside this project** at `./vibe-mvp/` — your agent reads
[`./vibe-mvp/SKILL.md`](./vibe-mvp/SKILL.md) to work through discover → design →
auth → AI → compliance → accessibility → security → performance → deploy → domain →
e2e → ship → deliverables.

## Point your agent here first

```
./vibe-mvp/SKILL.md
```

That's the entry point. The agent starts there, then walks the numbered
sub-skills in order. Have it copy `vibe-mvp/` into `.claude/skills/vibe-mvp/`
(for Claude Code) or `.codex/skills/vibe-mvp/` (for Codex) so your agent
platform auto-loads it.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind v4** + **DaisyUI 5** for UI
- **Lucide** for icons
- **Auth.js v5** for auth (magic link via Resend, or OAuth)
- **Drizzle ORM** with libsql (SQLite) for local dev, Turso for prod
- **OpenAI** (`gpt-5-nano` + reasoning effort `minimal` + Zod schemas) for AI features
- **Resend** for transactional email
- **Playwright** for e2e

## Feature flags

Every optional surface is gated by an env var. Copy `.env.example` to `.env.local` and
toggle what you want.

| Env var | Default | What it enables |
| --- | --- | --- |
| `FEATURE_AUTH` | `false` | Login, signup, sign-out, auth-gated routes |
| `FEATURE_EMAIL_VERIFY` | `false` | Email verification flow (requires Resend + DB) |
| `FEATURE_AI` | `false` | `/api/ai/*` AI endpoints using `lib/ai.ts` |
| `FEATURE_CHATBOT` | `false` | Floating bottom-right chatbot |
| `FEATURE_ADMIN` | `false` | Password-gated `/admin` dashboard |
| `FEATURE_DELIVERABLES` | `false` | `/api/deliverables/*` generator endpoints |
| `FEATURE_ANALYTICS` | `false` | Server-side event tracking via `lib/track.ts` |

A feature being **off** means:
- Routes return `404`.
- UI components (chatbot, admin link) don't mount.
- No related deps are loaded in production bundles for components guarded by
  `"use client"` feature checks.

A feature being **on** means the skeleton works, but you will still need to provide
the necessary credentials (OpenAI key, Resend key, admin password, etc.) in
`.env.local`.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Visit http://localhost:3000. You'll see the landing page. Open `.env.local` and
start flipping features on one at a time.

## Enabling features (quick recipes)

**Auth (magic link):**
```
FEATURE_AUTH=true
RESEND_API_KEY=re_...
AUTH_SECRET=<openssl rand -base64 32>
EMAIL_FROM="App <onboarding@resend.dev>"
```

**AI:**
```
FEATURE_AI=true
OPENAI_API_KEY=sk-...
```

**Admin:**
```
FEATURE_ADMIN=true
ADMIN_PASSWORD=<openssl rand -base64 32>
```

**Chatbot:** (depends on `FEATURE_AI` + a built search index)
```
FEATURE_CHATBOT=true
FEATURE_AI=true
OPENAI_API_KEY=sk-...
# then: npm run build-search-index
```

**Deliverables:**
```
FEATURE_DELIVERABLES=true
# install generator deps on demand:
# npm install --save-dev pptxgenjs docx exceljs
```

## Project structure

```
app/                          # Next.js App Router
  layout.tsx                  # Root shell: Header + children + Footer + Chatbot
  page.tsx                    # Landing page
  (legal)/                    # Terms + Privacy pages
  admin/                      # Password-gated admin dashboard
  login/                      # Sign-in page (when FEATURE_AUTH=true)
  api/
    ai/                       # AI endpoints (when FEATURE_AI=true)
    chatbot/                  # Chatbot endpoint (when FEATURE_CHATBOT=true)
    deliverables/             # Deliverable generators (when FEATURE_DELIVERABLES=true)
    health/                   # Health check (always on)
components/                   # Shared UI
  Header.tsx / Footer.tsx     # Site chrome
  Chatbot.tsx                 # Floating assistant
  LogoMark.tsx                # Brand mark (also used as favicon source)
lib/
  features.ts                 # Typed feature-flag reader
  ai.ts                       # OpenAI helper (gpt-5-nano + Zod)
  email.ts                    # Resend wrapper
  auth.ts                     # Auth.js config
  db.ts                       # Drizzle client
  track.ts                    # Analytics event helper
db/
  schema.ts                   # Drizzle schema
middleware.ts                 # Admin basic-auth gate
PROJECT.md                    # Your project's source of truth — fill in as you go
```

## The skill bundle (already included)

The Vibe MVP skill bundle lives at [`./vibe-mvp/`](./vibe-mvp/) in this project.
It's 15 numbered markdown files plus an entry-point `SKILL.md` that walks your
agent through using this starter end-to-end: discovering your audience, tailoring
the landing page, choosing which features to enable, wiring credentials, running
compliance + quality passes, shipping to Vercel, testing end-to-end, and packaging
deliverables.

To have your agent platform auto-load the skills, copy the directory:

```bash
# Claude Code
mkdir -p .claude/skills && cp -r vibe-mvp .claude/skills/vibe-mvp

# Codex
mkdir -p .codex/skills && cp -r vibe-mvp .codex/skills/vibe-mvp
```

Then ask your agent to read `vibe-mvp/SKILL.md` and follow it.

## License

MIT. Ship it.
