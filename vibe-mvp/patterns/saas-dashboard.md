# Pattern: SaaS Dashboard

A workspace product where authed users spend significant time, do persistent work, and return repeatedly. CRMs, project trackers, analytics tools, billing systems. Loaded by sub-skill 01 when `decisions.product_category == 'saas-dashboard'`.

## Canonical surfaces

- **Public landing** — value prop + screenshot of the actual product. Lead with the dashboard, not abstractions.
- **Pricing page** — for paid SaaS, this is where conversion happens. Three tiers max; clear feature table; prominent "talk to sales" if enterprise.
- **Authed app shell** — sidebar nav + main area + (sometimes) right rail for context. This is where users live.
- **Settings** — `/settings`, sub-paths for account / team / billing / API keys / notifications.
- **Onboarding flow** — checklist-driven, not modal-tour. "You've done 3 of 5 setup tasks; do this next."
- **Search** — ⌘K command palette across all entities (records, settings, actions).
- **Notifications** — both in-app (sub-skill 07's bell) and email digest preferences in settings.

## Navigation pattern

- **Sidebar nav** is the spine. Sections grouped by entity (e.g., "Customers", "Invoices", "Reports"). Collapsible sections; persistent across views.
- Header lives ABOVE the sidebar OR alongside it. Standard 5 elements.
- ⌘K command palette is non-negotiable for SaaS — it's how power users get around.
- For B2B with workspaces (multi-tenant): a workspace switcher in the top-left of the sidebar (current workspace name + chevron). See sub-skill 04 B2B section.
- Breadcrumbs at the top of any nested view. Helps users know where they are.

## Key UX conventions

- **Tables are central** — almost every SaaS view has at least one. Sortable columns, filterable, paginatable (cursor-paginate at scale, not offset). Sticky header on long tables. Empty-state row when no data ("No customers yet — [add one]").
- **Detail panes / drawers** — clicking a row opens a side drawer with details, not a full page transition. Faster, less context loss.
- **Bulk actions** — select multiple rows, apply action (delete, export, change status). Universal expectation.
- **Filters in the URL** — so users can save / share filtered views. `?status=active&plan=pro`.
- **Saved views** (post-MVP nice-to-have) — let users bookmark a particular filter combination.
- **Inline edit** for simple fields (rename, toggle status). Click the field, edit in place, autosave. Faster than opening a modal.
- **Empty states** with sample data — for new accounts, show fake/demo rows so the UI doesn't look broken. Label them as samples.
- **Activity log** per entity — "John updated the price 3 days ago." Audit trail builds trust + helps debugging.
- **Keyboard shortcuts** — `c` to create, `/` to focus search, `?` to show shortcuts, `g` then a letter for navigation.

## Onboarding pattern

Use a **persistent setup checklist** in a corner of the dashboard, not a blocking modal tour:

```
✓ Add your first customer
✓ Connect Stripe
○ Invite a teammate
○ Set up email notifications
○ Send your first invoice
```

Each item links directly to the relevant action. Users do them at their own pace; the checklist persists until everything's done. This converts better than tours because it doesn't hijack attention.

## What kills SaaS dashboard MVPs

- Top-nav instead of sidebar nav for the dashboard. Sidebar is the convention; users have muscle memory.
- No ⌘K. Power users will judge the product as primitive.
- Empty tables on first sign-in with no demo data. Looks broken; users bounce.
- Modal-tour onboarding. Blocks the user from doing anything until they click through. They hate it.
- Inconsistent table designs across pages. One pattern; reuse the component.
- Settings scattered across the app instead of consolidated under `/settings`.
- Treating mobile as an afterthought when the audience uses mobile (e.g., field-service ops). Even desktop-first SaaS needs functional mobile.

## Schema starter

```ts
// For multi-tenant SaaS — see sub-skill 04 B2B section for the full pattern.
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('free'),     // free | pro | enterprise
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const memberships = pgTable('memberships', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: text('role').notNull(),                     // owner | admin | member | guest
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.organizationId, t.userId] }) }));

// Per-entity activity log — universal SaaS pattern
export const activityLog = pgTable('activity_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  actorId: uuid('actor_id').notNull(),              // user who took the action
  entityType: text('entity_type').notNull(),         // 'customer' | 'invoice' | etc.
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),                  // 'created' | 'updated' | 'deleted' | 'status_changed' | etc.
  diff: jsonb('diff'),                                // before/after for changed fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Cross-references

- B2B multi-tenant + RBAC → sub-skill 04 (B2B section).
- Stripe Subscriptions → sub-skill 09 (paid SaaS path).
- Onboarding checklist as part of activation → sub-skill 02 activation section.
- Per-org analytics + cost monitoring → sub-skill 07 + 08.
- ⌘K command palette: build with `cmdk` library; wire all search + actions through it.
