# Pattern: Community

A product where users post content for other users to see, react to, and respond to. Forums, social platforms, niche-interest communities. Loaded by sub-skill 01 when `decisions.product_category == 'community'`.

## Canonical surfaces

- **Public landing** — show actual community content, not abstractions. The landing IS a sample of what the community is like.
- **Feed / homepage (authed)** — the river of recent posts. Sort: chronological, hot, top-of-week, etc. — pick one default deliberately.
- **Post detail** — the post, its reactions, threaded responses. Reverse-chronological replies for chat-feel; hierarchical for forum-feel.
- **Profile** — user identity surface. Avatar, bio, recent posts, follower/following count if applicable.
- **Compose** — the create-a-post flow. Should be ALWAYS reachable (top-right `+` button or sticky compose at the top of the feed). Friction in compose = no posts = dead community.
- **Search** (sub-skill 13) — for finding past discussions. Critical for any community past 100 posts.
- **Notifications** (sub-skill 07's bell) — replies to your posts, mentions, follows. Drives return visits.
- **Moderation queue** (sub-skill 05) — admin surface for flagged content. Non-negotiable for any UGC platform.
- **Rules / guidelines page** — visible from compose AND linked from the footer. Even if minimal: "Be kind, no spam, no promotions."

## Navigation pattern

- Header: standard 5-element rule. Bell icon is critical here — notifications drive engagement.
- For mobile: bottom tab bar (Feed / Search / Compose / Notifications / Profile) is conventional. Compose tab is a `+` icon, often centered + visually emphasized.
- Compose CTA persistently reachable. Top-right `+` on desktop; bottom-center on mobile. **Reduce friction to post.**

## Key UX conventions

- **Post cards in the feed** — author avatar + name, body excerpt (3-4 lines max with "Read more"), reactions row, reply count, timestamp ("2h ago" not "2026-05-04 14:23"), share button.
- **Inline reactions** — like / thumbs / emoji-reacts. Count visible. One-tap to react.
- **Threaded replies** with depth limit (3-4 levels max — past that it's unreadable).
- **@-mentions** with autocomplete during compose. Trigger notification to the mentioned user.
- **Markdown or rich-text** in compose. Markdown is simpler to ship; rich-text feels more polished. Pick one.
- **Image attachments** — file upload pipeline (sub-skill 13). Drag-and-drop into compose; paste-to-upload from clipboard.
- **Infinite scroll** in the feed (cursor-paginated, not offset). Load 20 at a time. Pause loading at 1000+ items to avoid memory bloat.
- **Soft-delete** for posts — user "deletes" their own; data retained 30 days for moderation review. Hard-delete after.
- **Block / mute** users — universally expected. Block hides from feed; mute keeps in feed but suppresses notifications.
- **Report content** — surfaces directly to moderation queue (sub-skill 05).

## Trust + safety

For community products, sub-skill 05's content moderation is **mandatory, not optional**. Layer 1 (OpenAI Moderation), Layer 2 (public-domain pattern repos), Layer 3 (bespoke). Plus:

- **New-user posting rules** — first 24h or first 5 posts go through moderation queue automatically. Reduces drive-by spam.
- **Rate limiting per user** — can't post more than N times per hour. Default: 10/hr for new users; 30/hr for established (defined by account age + post count).
- **Account age + post count visible on every post** — "@noa · joined Apr 2026 · 47 posts" — helps other users assess credibility.
- **Reaction abuse prevention** — one reaction per user per post. No reaction-spamming.

## What kills community MVPs

- **Cold start** — empty feed. Nobody wants to be first. Either invite-only seed (10-20 trusted users posting before public launch) OR seed plausible content + label as agent-generated OR delay launch until you have 50 real users in a private beta.
- **No compose CTA visible from the feed.** Users have to navigate to find "post," they don't.
- Moderation as an afterthought. Will be weaponized within the first 50 users.
- No notifications. Users don't return without a reason; notifications are the reason.
- Algorithmic feed too early. Chronological is fine at MVP scale; algorithmic ranking is a v2 problem.
- Anonymous posting without identity layer. Drives bad behavior; very few communities need it.

## Schema starter

```ts
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id').notNull().references(() => users.id),
  parentId: uuid('parent_id'),                          // null = top-level; uuid = reply
  body: text('body').notNull(),
  imageUrls: jsonb('image_urls'),                        // string[]
  status: text('status').notNull().default('published'), // published | flagged | removed | deleted
  reactionCount: integer('reaction_count').notNull().default(0),  // denormalized for performance
  replyCount: integer('reply_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),                    // soft delete
});

export const reactions = pgTable('reactions', {
  postId: uuid('post_id').notNull().references(() => posts.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: text('type').notNull().default('like'),          // like | love | laugh | etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.postId, t.userId] }) }));   // one reaction per user per post

export const blocks = pgTable('blocks', {
  blockerId: uuid('blocker_id').notNull().references(() => users.id),
  blockedId: uuid('blocked_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.blockerId, t.blockedId] }) }));
```

## Cross-references

- Content moderation is mandatory → sub-skill 05.
- Notifications drive engagement → sub-skill 07's notifications tab + bell.
- File upload pipeline for images → sub-skill 13.
- Search → sub-skill 13.
- Rate limiting per user (post creation) → sub-skill 11.
- Real-time updates (live feed) — post-MVP usually; if needed, SSE or WebSockets.
