# Pattern: Marketplace

A two-sided product where one set of users supplies (listings, items, services) and another consumes (browses, books, buys). Loaded by sub-skill 01 when `decisions.product_category == 'marketplace'`.

## Canonical surfaces

Every marketplace MVP needs at minimum:

- **Public landing** — clarity about both sides ("for cooks" / "for diners"), one CTA per side.
- **Listing index** — the browseable list of supply. Sortable + filterable. Infinite scroll OR cursor-paginated; never offset pagination past page 5.
- **Listing detail** — the page that converts. Above-the-fold: hero media, price, primary CTA, supplier identity. Below: details, reviews, related listings.
- **Search** (sub-skill 13) — keyword + filters. For marketplaces, search IS navigation; bury this and you've buried the product.
- **Supplier dashboard** — separate authed shell where a supplier creates / edits / manages their listings. Not in the same nav as the consumer side; conceptually a different app.
- **Transaction flow** — booking / purchase / messaging-to-buy, depending on type. **The fewer steps the better**; every step loses ~25% of remaining users.
- **Reviews / trust signals** — supplier rating, listing reviews, verified-supplier badge. No marketplace works without trust signals visible from the listing index.

## Navigation pattern

- Header: logo + title + theme + bell + hamburger (the standard 5-element rule from sub-skill 02). The hamburger contains the consumer-side top-level pages; the supplier dashboard is a separate sub-app reached via a top-right "Sell" / "List" / "Provide" CTA.
- For mobile: a bottom tab bar is often appropriate (Home / Search / Saved / Account). The hamburger still exists but mobile uses tabs as the primary surface because thumb-reach matters.

## Key UX conventions (don't re-invent these)

- **Listing cards on the index** — image, title, price, supplier, 1-2 trust signals (rating + review count). Three-line max. Cards stack on mobile, grid on desktop (3-4 per row).
- **Filters as a sidebar** on desktop, **as a sticky top sheet** on mobile. Filter state in the URL (so users can share filtered links).
- **Save / favorite** is universal; a heart icon, anonymous-allowed (saved to localStorage until they sign in, then merged).
- **Empty index after filters** — show "0 results — try removing [most-restrictive filter]" with a one-click revert. Not just "no results."
- **Listing detail's primary CTA** stays sticky on mobile scroll. Desktop has it visible without scroll above the fold.
- **Two-sided onboarding** — when a new user lands, ask "are you here to [browse] or [provide]?" early. Don't assume one side.

## What kills marketplace MVPs

- Empty listing index at launch. Seed before public launch (sub-skill 02 seeding step). Ideally you've recruited 10-20 real suppliers pre-launch; if not, generate plausible seed listings and label them as such.
- Reviews launch with zero reviews on every listing. Either seed, OR show "Be the first to review" copy, OR don't show the review widget at all on day one.
- No trust signal from the supplier side. A listing without seller identity converts at half the rate.
- Treating supplier dashboard as an afterthought. Supplier UX is at least as important as consumer UX — bad supplier tools = no supply = no consumers.

## Schema starter (Drizzle)

```ts
export const listings = pgTable('listings', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplierId: uuid('supplier_id').notNull().references(() => users.id),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priceCents: integer('price_cents'),
  currency: text('currency').notNull().default('usd'),
  status: text('status').notNull().default('draft'),  // draft | active | paused | sold
  primaryImageUrl: text('primary_image_url'),
  metadata: jsonb('metadata'),                         // category-specific
  searchVector: tsVector('search_vector'),             // sub-skill 13 FTS
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  listingId: uuid('listing_id').notNull().references(() => listings.id),
  reviewerId: uuid('reviewer_id').references(() => users.id),
  rating: integer('rating').notNull(),                 // 1-5
  body: text('body'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Cross-references

- Search is non-negotiable here → sub-skill 13.
- Image upload pipeline is non-negotiable → sub-skill 13 (file upload section).
- Trust + sub-processor disclosure → sub-skill 03 compliance.
- For paid marketplaces: Stripe Connect for split payments → sub-skill 09.
