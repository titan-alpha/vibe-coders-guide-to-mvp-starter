# Pattern: Productivity Tool

A product where one user (or a small team) creates, edits, organizes, and revisits their own content. Note-taking, task tracking, document editing, planners, calendars-with-extra. Loaded by sub-skill 01 when `decisions.product_category == 'productivity-tool'`.

## Canonical surfaces

- **Public landing** — show the actual workspace, screenshot or video. Don't sell features; sell the feeling of "this is mine."
- **Empty workspace** (just-signed-up) — the most-important page. Single primary action: "Create your first [thing]." Optional sample data the user can dismiss.
- **Workspace shell** — sidebar + main area. Sidebar lists the user's content (notes / tasks / projects). Main area is the editor / detail view.
- **Editor** — the surface where work happens. Auto-save is universal; the visible "saving..." indicator builds trust.
- **Search** (sub-skill 13) — across all the user's own content. ⌘F local; ⌘K global. Both expected.
- **Sharing** (sub-skill 02 sharing section) — share a single item via link (with permission level) or invite collaborators. Even if collaboration is post-MVP, shipping the share-via-link pattern is cheap.
- **Settings** — `/settings` for account, theme, keyboard shortcuts, notifications, billing.
- **Trash / archive** — soft-delete with 30-day recovery. Universal expectation. Permanent delete from trash.

## Navigation pattern

- Sidebar nav with the user's content tree. Collapsible sections; drag-to-reorder for items. Persistent across pages.
- Top of sidebar: workspace switcher (if multi-workspace) + new-item CTA + search.
- Header: standard 5-element rule. Theme toggle especially valued — productivity users often work in dark mode at night.
- ⌘K command palette: open any item by name, run actions ("create new note", "open settings"), navigate.
- Breadcrumb at top of editor when nested (folder > subfolder > document).

## Editor design

The editor is the soul of the product. Get this right:

- **Distraction-free** — minimal chrome around the writing area. Toolbar appears on selection (Notion-style) or stays slim on top (Linear-style). Either is fine; pick one.
- **Keyboard-first** — every formatting action has a shortcut (`⌘B` bold, `⌘I` italic, `⌘K` link, `⌘1-3` headings). Display them in a `?` shortcuts overlay.
- **Auto-save** — debounced 1-2 seconds after typing stops. Indicator: "Saved 3s ago" / "Saving..." / "Offline — will save when reconnected."
- **Undo / redo** — multi-level (`⌘Z` / `⌘⇧Z`). Most users assume this works; build it from day one.
- **Slash commands** for inserting blocks (`/heading`, `/list`, `/divider`, `/image`). Notion popularized this; users now expect it.
- **Versioning** — for any non-trivial editor, store the last 10 versions automatically. "Restore previous version" in a menu. Surprises users in a good way the one time they need it.

## Key UX conventions

- **Sidebar item context menu** — right-click (desktop) / long-press (mobile): rename, duplicate, move to folder, share, delete. Universal pattern.
- **Quick-create** — `n` from anywhere creates a new item. ⌘N is the alternative.
- **Drag and drop** to reorder sidebar items, to move into folders, to attach files. Modern productivity tools all do this.
- **Bulk operations on the sidebar** — select multiple items (⌘-click / Shift-click), apply action.
- **Empty state per item type** — a new note shouldn't say "Start writing"; it should show the slash-command hint. A new task list shouldn't say "Add a task"; it should focus the input field.
- **Print / export** — `⌘P` works; export to PDF, Markdown, or HTML expected. 30 minutes of work; users notice when missing.
- **Mobile parity for read** — even desktop-first productivity tools need mobile read access. Editing on mobile can be partial (no slash commands, simpler toolbar).

## What kills productivity tool MVPs

- No auto-save. Users assume it works; one lost session = uninstall.
- Slow load on the editor. Users open tools dozens of times daily; 2s load = friction = abandonment.
- No keyboard shortcuts. Power users (the only ones who become daily-active in productivity tools) demand them.
- Missing offline support — for many productivity tools (notes especially), offline write + sync-when-online is table stakes. Service worker + IndexedDB. This is a real engineering build but often non-optional.
- Sharing as a v2 feature. Users save things they want to share. Even if collaboration is v2, ship share-via-link from day one.
- No search. A productivity tool with content past 50 items NEEDS search. Postgres FTS works fine.

## Schema starter

```ts
export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  parentId: uuid('parent_id'),                          // for folder/nesting
  type: text('type').notNull(),                          // 'note' | 'task' | 'list' | etc.
  title: text('title'),
  body: text('body'),                                    // markdown or rich-text JSON
  metadata: jsonb('metadata'),                           // type-specific (task done? list items?)
  position: integer('position'),                         // for manual ordering
  searchVector: tsVector('search_vector'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),                    // soft delete; trash for 30 days
});

export const itemVersions = pgTable('item_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: uuid('item_id').notNull().references(() => items.id),
  body: text('body'),                                    // snapshot at this version
  versionNumber: integer('version_number').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({ uniq: unique().on(t.itemId, t.versionNumber) }));

// Sharing — see sub-skill 02 sharing section for the full ACL model
export const itemShares = pgTable('item_shares', {
  itemId: uuid('item_id').notNull().references(() => items.id),
  shareToken: text('share_token').primaryKey(),         // sha256-hashed token in URL
  permission: text('permission').notNull(),              // 'view' | 'edit'
  expiresAt: timestamp('expires_at'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Cross-references

- Sharing patterns → sub-skill 02 sharing section.
- Search → sub-skill 13 (Postgres FTS is plenty here).
- File / image upload (attachments) → sub-skill 13 file upload pipeline.
- Versioning of content (drafts, history) → above schema; consider adding to feedback loop in dogfooding.
- For multi-user / team productivity tools: → sub-skill 04 B2B section for organizations + memberships.
- Performance is the metric → sub-skill 12 Lighthouse 90+; the editor's first paint matters most.
