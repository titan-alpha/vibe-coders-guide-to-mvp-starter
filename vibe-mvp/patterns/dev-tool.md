# Pattern: Dev Tool

A product whose audience is developers. Different conventions, different metrics, different UX expectations than consumer products. Loaded by sub-skill 01 when `decisions.product_category == 'dev-tool'`.

## Canonical surfaces

- **Public landing** — code sample above the fold within the first 500 pixels. Marketing copy is suspect; show what it does. Include the install command (`npm install @your/thing`) literally on the landing.
- **Docs / `/docs`** — the second-most-important surface after the landing. Search is non-negotiable here.
- **Quickstart** — separate from full docs, gets users to "first thing working" in under 5 minutes.
- **API reference** — auto-generated from code if possible (TypeDoc, OpenAPI). Hand-written stays out of date.
- **Dashboard / authed shell** — sidebar nav with persistent workspace; ⌘K command palette is expected.
- **API keys page** — for products users integrate with. Generate, label, revoke.
- **Status page** — `/status` (sub-skill 11). Devs check this first when something seems broken; it's part of trust.
- **Open source repo link** — even if the product itself is closed, having a public repo for examples / SDKs / templates earns trust.
- **CLI** (when applicable) — many dev products ship a CLI alongside the web app. Don't force-build one if not needed; mention as post-MVP.

## Navigation pattern

- Header: logo + title + theme + bell + hamburger. Theme toggle is essential — devs work in dark mode.
- Sidebar nav for the dashboard (not top-nav). Persistent across views; collapsible.
- ⌘K command palette opens from anywhere — search, navigate, run actions.
- Keyboard shortcuts: `j`/`k` to navigate lists; `g h` to go home; `?` to show shortcuts. Document them in `/help/shortcuts`.

## Key UX conventions

- **Code blocks** are everywhere; they need: syntax highlighting (Shiki), copy-to-clipboard button, language label, line numbers for long blocks. Theme matches the surrounding UI (light/dark variant).
- **Curl examples next to JS examples next to Python examples** — tabbed code blocks. Devs use the language they already use.
- **Empty states** — show the actual command to run, not a marketing illustration. "No projects yet — run `your-cli init` to create one."
- **Errors** are important; show full context + the action (retry, view logs, contact support). Stack traces are okay for devs (not for consumers).
- **Loading states** can be terse ("Loading...") because devs are okay with it; consumers want personality.
- **Dark mode is default for devs**. System preference still wins (sub-skill 02 rule), but dev tools usually default-prefer dark.
- **Settings in `/settings`** — keyboard shortcuts, theme override, API key management, billing.

## What kills dev tool MVPs

- Marketing copy that doesn't show code. Devs scan for the signal "what does this actually do" — give it to them in the first 500 pixels.
- Docs that are out of date with the product. Auto-generate where possible. Always.
- A dashboard without a command palette. Devs expect ⌘K.
- A product with no API keys / API access for users to programmatically use. Even if "API" isn't the value prop, devs will ask.
- Onboarding that requires a long form. A dev evaluating tools tries 5 in an hour; if your signup is 3 fields longer than the next, you lose.

## Schema starter

```ts
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  label: text('label').notNull(),                          // user-facing name
  keyHash: text('key_hash').notNull(),                     // sha256 of the actual key
  prefix: text('prefix').notNull(),                        // first 8 chars, shown in UI for identification
  scopes: jsonb('scopes'),                                  // string[]
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usageEvents = pgTable('usage_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  apiKeyId: uuid('api_key_id').notNull().references(() => apiKeys.id),
  endpoint: text('endpoint').notNull(),
  durationMs: integer('duration_ms'),
  status: integer('status').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Cross-references

- API surface itself → sub-skill 11 (API isolation pattern: `api.<domain>` subdomain).
- Versioning is critical for APIs → sub-skill 14 (semver becomes user-visible via `/api/v1/...`).
- Rate limiting per API key → sub-skill 11.
- Status page → sub-skill 11 disaster prep.
- Search for docs → sub-skill 13 (Algolia DocSearch is free for open-source projects; otherwise Postgres FTS).
- llms.txt + AGENTS.txt → sub-skill 12 SEO; especially relevant for dev tools where AI agents will be the consumers.
