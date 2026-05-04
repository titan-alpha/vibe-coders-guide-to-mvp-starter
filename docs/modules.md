# Modules architecture

This template ships with **every optional surface pre-built**. The agent doesn't generate auth, an admin dashboard, a feedback form, or a notifications system from scratch — the code is already here. What changes per-project is which modules are **enabled**.

## How modules turn on and off

Two layers, working together:

1. **Code is always present.** All module files live in the template. Routes exist. Components exist. DB schemas exist.
2. **Feature flags decide what renders.** Each module reads one or more flags from the `feature_flags` table at runtime. If the flag is off, the route 404s and the components don't render.

The flags table is part of `db/schema.ts`; `lib/feature-flag.ts` exports the `flag(key, userId?)` helper. Sub-skill 13 documents the helper; sub-skill 07 Tab 9 is the admin UI for toggling at runtime.

### Setup-time flag decisions

When the agent generates a new project from this template:

1. Copy the template to the user's project directory.
2. Read `STATE.yaml decisions` (whatever the user set in the configurator or chat).
3. Run `npm run setup-flags` (the script ships in `scripts/setup-flags.ts`) which inserts initial rows into `feature_flags` based on STATE decisions. For example:
   - `decisions.notifications_enabled === true` → insert `{ key: 'notifications', enabled: true }`.
   - `decisions.feedback_enabled === true` → insert `{ key: 'feedback', enabled: true }`.
   - `decisions.cost_monitoring_enabled === true` → insert `{ key: 'cost_monitoring', enabled: true }`.

After setup, the founder can flip any flag on/off at runtime via `/admin/features` — no deploy required.

### Runtime flag decisions

```ts
// app/admin/notifications/page.tsx (example)
import { flag } from '@/lib/feature-flag';
import { notFound } from 'next/navigation';

export default async function NotificationsTab() {
  if (!(await flag('notifications'))) notFound();
  // ... render the tab body
}
```

The `flag()` helper is cached for 30 seconds via `unstable_cache`; admin toggles invalidate via `revalidateTag('feature-flags')`. So a flag flip is visible to all users within 30 seconds without restart.

## Module catalog

Every module here is gated by one or more flags. The agent picks which to enable based on the user's mode + decisions.

| Module | Flag(s) | Routes | Schema tables | When enabled |
| --- | --- | --- | --- | --- |
| **Auth** | `auth` | `/login`, `/signup`, `/api/auth/*`, `/reset/*` | `users`, `allowedEmails`, `userConsents`, `authTokens`, `waitlist` | Any mode where the user picks an access model other than "no signup" |
| **Compliance docs** | `legal` | `/terms`, `/privacy` | (none) | When `decisions.access_model` is set OR sub-skill 03 ran |
| **Admin shell** | `admin` | `/admin/*` (all admin tabs) | (varies per sub-flag) | When the founder needs to manage users / monitor / configure |
| **Admin: Notifications tab** | `admin` + `notifications` | `/admin/notifications`, `/api/notifications/*` | `notifications`, `notification_recipients` | When the user opted in for the notification center |
| **Admin: Feedback tab** | `admin` + `feedback` | `/admin/feedback`, `/api/feedback` | `feedback` | When the user opted in for feedback collection |
| **Admin: Cost tab** | `admin` + `cost_monitoring` | `/admin/cost`, `/api/internal/cron/cost-rollup` | `service_unit_costs`, `service_usage_daily`, `service_ceilings` | When the user opted in for cost monitoring |
| **Admin: Alerts tab** | `admin` + `error_alerts` | `/admin/alerts`, `/api/internal/sentry-webhook` | `alert_events` | When the user opted in for error alerts |
| **Admin: Features tab** | `admin` + `features_admin` | `/admin/features` | (uses `feature_flags`) | When the founder wants to flip features at runtime from the dashboard |
| **Admin: Analytics tab** | `admin` + `analytics` | `/admin/analytics` | `user_actions`, `request_metrics` | When the user opted in for analytics |
| **Admin: Users tab** | `admin` + `auth` | `/admin/users` | (uses `users`) | When auth is on |
| **Admin: Waitlist tab** | `admin` + `auth` (when waitlist) | `/admin/waitlist` | (uses `waitlist`) | When access model is waitlist or paid |
| **Admin: Usage tab** | `admin` + `usage_gating` | `/admin/usage` | (uses `users.usage*` columns) | When per-user usage gating is enabled (typical for AI-cost products) |
| **AI integration** | `ai` | `/api/ai/*` | (none required for stateless calls) | When the product has any AI feature |
| **AI caching** | `ai` + `ai_cache` | (none — library only) | `ai_cache` | When repeat-prompt caching makes sense |
| **Content moderation** | `moderation` | `/api/internal/moderation/*` | `moderation_queue` | When the platform has user-generated content |
| **Chatbot** | `chatbot` | `/api/chatbot` | (uses content index) | When the user picked the chatbot in sub-skill 06 |
| **Email service** | `email` | (none — library only) | (none) | When at least one email trigger is wired |
| **Lifecycle email** | `email` + `lifecycle_email` | `/api/internal/cron/lifecycle` | (uses `users.email_lifecycle`) | When the agent wired drip / digest / re-engage triggers |
| **Stripe** | `stripe` | `/api/stripe/*` (checkout, webhook) | `subscriptions` | When `decisions.monetization_path` is `stripe-saas` or `stripe-paid-beta` |
| **B2B multi-tenant** | `b2b` | `/org/*`, `/api/org/*` | `organizations`, `memberships`, `team_invites` | When `decisions.vertical_classification` is B2B with teams |
| **File uploads** | `uploads` | `/api/uploads/sign` | `uploads` | When the product accepts user uploads |
| **Search** | `search` | `/api/search` | (uses `tsvector` columns on indexed tables) | When the product has > 50 searchable items |
| **Sharing — public link** | `sharing_public` | `/p/[slug]` | (uses `visibility` + `public_slug` on shareable tables) | When sharing is needed |
| **Sharing — permissioned link** | `sharing_permissioned` | (consumed via `?share=token`) | `item_shares` | When the product is collaborative |
| **Sharing — per-user invite** | `sharing_invite` | `/invite/accept` | `item_invites` | B2B / teams |
| **Notifications center** | `notifications` | `/api/notifications/*` (unread-count, recent, mark-read) | (uses notifications tables above) | Bell icon in header lights up |
| **Feature flags admin UI** | `features_admin` | `/admin/features` | (uses `feature_flags`) | When the founder wants runtime control |
| **Press kit** | `press` | `/press` | (none) | When launching publicly |
| **Public changelog** | `public_changelog` | `/changelog` | (reads `CHANGELOG.md`) | When versions are user-visible |
| **Status page** | `status` | `/status` | `status_messages` (optional) | Always recommended; on by default |

## Default-on flags

These ship with `enabled: true` because every project benefits:

- `legal` — TOS + Privacy pages exist as soon as the user has signup.
- `status` — the `/status` route is reachable from day one.
- `theme_toggle` — light + dark are non-negotiable per sub-skill 02.

All others default to `enabled: false`. The setup script flips them on per the user's STATE decisions.

## Adding a new module

The pattern, for any future module:

1. Add the schema (if any) to `db/schema.ts`.
2. Add routes under `app/<module>/` and/or `app/api/<module>/`. Each protected route checks `await flag('<module>')` at the top and `notFound()`s if false.
3. Add components to `components/<module>/`.
4. Add the flag to the catalog in this file and to `scripts/setup-flags.ts`'s mapping.
5. Document the flag in the README's "Configurable surfaces" section.

The `flag()` helper auto-registers unknown flags as `enabled: false`, so new code that adds `flag('foo')` calls won't crash — it'll just render the off-state until an admin enables it.

## Why this pattern

- **Less code generation per project.** The agent doesn't write auth from scratch; it flips a flag.
- **Faster iteration.** Adding a feature post-launch is "flag it on" not "deploy it."
- **Smaller diffs.** Code changes affect specific modules; the rest of the project stays stable.
- **Easier debugging.** Module boundaries are explicit; problems narrow to one directory.
- **Shared improvements.** When a module gets better here in the template, every project benefits on its next sync.

## Cross-references

- Sub-skill 13 (`13-data-optimization`): the `feature_flags` schema + `flag()` helper specification.
- Sub-skill 07 Tab 9 (`07-admin-dashboard`): the runtime UI for flipping flags.
- `STATE.template.yaml`: `decisions.features` array tracks per-flag state at planning time.
- `SKILL.md` "Per-category pattern catalog" rule: patterns/<category>.md tells the agent which modules typically apply per product type.
