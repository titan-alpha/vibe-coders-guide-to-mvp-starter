# 07 · Monetization

Goal: pick the right way for the product to make money &mdash; or skip monetization entirely if the user wants to prioritize reach. Two patterns cover ~95% of MVPs: **ad revenue** (AdSense) and **direct payment** (Stripe). The agent helps the user pick, walks them through getting credentials, and wires it up.

## DIALOGUE — does the product want monetization at MVP stage?

Many MVPs ship without monetization to focus on user acquisition. Ask, in plain language:

> *"Do you want to make money from this MVP at launch, or wait until you have users? Both are valid. Charging early proves people will actually pay; waiting prioritizes growth so you have someone to charge later."*

If the user wants to wait, skip and move on to `08-compliance.md`.

If they want monetization, recommend a path based on the product (use the simplest one that fits, per the operating rule in `SKILL.md`):

| Product type | Recommended monetization | Why |
| --- | --- | --- |
| Content / media / blog / tool with high pageviews and casual usage | **AdSense** (display ads) | Passive revenue, no friction for users, no payment infrastructure needed |
| SaaS / utility with paid features or premium tiers | **Stripe Checkout** | Battle-tested, hosted payment page (no PCI scope) |
| Marketplace (platform takes a cut) | **Stripe Connect** | Splits payments between you and sellers automatically |
| Free-to-use community | **AdSense** initially; add Stripe for premium features later | Ads cover hosting; charge for power features when traction proves it |

> *"For your product I'd suggest **\<path\>** because **\<reason in one line\>**. Want to set that up now? You can open `localhost:3000` in a browser and watch as we wire it in."*

Defer to the user if they prefer the other path. Both are documented below.

---

## Path A — AdSense (display ads)

Best fit for products where users spend time reading, browsing, or scrolling.

### A.1 Walk the user through getting AdSense credentials

> *"Open https://adsense.google.com. Sign in with the Google account you want the ad revenue paid into. Complete the AdSense application and submit `<your domain>` as the site to monetize. AdSense will give you a one-line `<script>` snippet to verify ownership."*

Offer browser automation (sub-skill SKILL.md "Browser automation" rule) for the AdSense UI &mdash; you can drive Chrome through the signup flow and pause at credential entry.

### A.2 Wire ownership verification

When the user pastes the snippet, extract the publisher ID (it looks like `ca-pub-XXXXXXXXXXXXXXXX`).

1. **Add the loader script** to the site `<head>` &mdash; in Next.js App Router that's `app/layout.tsx`:
   ```tsx
   // app/layout.tsx
   <head>
     <script
       async
       src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
       crossOrigin="anonymous"
     />
   </head>
   ```
   For non-Next.js (Vite, plain HTML), put the same `<script>` inside the `<head>` of `index.html`.

2. **Create `public/ads.txt`** &mdash; this is the IAB "Authorized Digital Sellers" file. AdSense needs it to authorize Google as a direct seller of your inventory; without it, fill rate and revenue drop silently. The file lives at `https://<your-domain>/ads.txt`:
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```
   - `google.com` &mdash; the SSP being authorized
   - `pub-...` &mdash; your publisher ID, **without** the `ca-` prefix
   - `DIRECT` &mdash; you have a direct relationship with Google
   - `f08c47fec0942fa0` &mdash; Google's fixed TAG ID, same value for every AdSense publisher

3. **Deploy the changes** (sub-skill 13).

4. Return to AdSense, click **Verify**, then **Request review**. Review usually takes a few days. Tell the user this in plain terms: *"Google reviews your site to make sure it has real content and follows their policies. Until they approve, the ad slots stay empty. Average wait is 2&ndash;7 days."*

### A.3 Add ad units once approved

Once AdSense approves the site, the user creates ad units in their dashboard. Each unit returns a 10-digit slot ID.

For a typical landing/content site, two side-column ads (160&times;600 wide skyscraper) is a good starting point &mdash; doesn't disrupt content flow, fills space many sites waste.

```tsx
// components/AdSlot.tsx
'use client';
import { useEffect } from 'react';

const ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX';

export function AdSlot({ slotId }: { slotId: string }) {
  useEffect(() => {
    try {
      const w = window as unknown as { adsbygoogle: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {}
  }, [slotId]);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', width: 160, height: 600 }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slotId}
    />
  );
}
```

Place two `<AdSlot>` components in the layout flanking the main content. **Hide them on viewports below 1280px** (Tailwind's `xl` breakpoint) so mobile and tablet users get clean content:
```tsx
<aside className="hidden xl:block w-[180px]"><AdSlot slotId="..." /></aside>
```

Slot IDs go in env vars (`VITE_ADSENSE_SLOT_LEFT`, `_RIGHT` for Vite; `NEXT_PUBLIC_ADSENSE_SLOT_LEFT`, `_RIGHT` for Next.js client components) so prod and dev can differ if needed.

### A.4 Anti-patterns to avoid

- **Loading the AdSense script on pages that don't show ads.** Kills perf for no benefit.
- **Stuffing ads into the main content** before approval. They render empty and look broken.
- **Forgetting `ads.txt`.** Silently kills bid rate and ~30&ndash;50% of revenue.
- **Using ad blockers in your dev browser when testing.** Ads will look broken; switch browsers or disable the blocker for the dev domain.

---

## Path B — Stripe (direct payment)

Best fit for SaaS, paid features, subscriptions, or one-time purchases.

### B.1 Walk the user through getting Stripe credentials

> *"Open https://dashboard.stripe.com/register. Sign up &mdash; you can complete full account activation later (test mode works without it)."*

> *"In the Stripe dashboard, top-right account menu &rarr; **Developers** &rarr; **API keys**. Copy two values: the **Publishable key** (starts with `pk_test_` for test mode, `pk_live_` for production) and the **Secret key** (starts with `sk_test_` / `sk_live_`). Paste them here."*

Before asking, run `grep -q '^STRIPE_' .env.local 2>/dev/null && echo found`. Skip if you already have them.

Append to `.env.local`:
```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # added later in step B.4
```

### B.2 Install + central client

```bash
npm install stripe @stripe/stripe-js
```

```ts
// lib/stripe.ts
import 'server-only';
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});
```

### B.3 Stripe Checkout (use this — never roll your own card form)

Stripe Checkout is a hosted page that handles cards, Apple Pay, Google Pay, fraud detection, 3D Secure, and PCI compliance. **You never see card data**, so PCI scope is theirs to handle.

```ts
// app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'auth required' }, { status: 401 });
  }

  const { priceId } = await req.json();
  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',          // or 'payment' for one-time
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${req.headers.get('origin')}/account?success=1`,
    cancel_url: `${req.headers.get('origin')}/pricing`,
    customer_email: session.user.email!,
  });
  return NextResponse.redirect(checkout.url!, { status: 303 });
}
```

Create `Price` objects (and the `Product` they belong to) in the Stripe dashboard &rarr; Products. Each Price has an ID like `price_1Q...`. Store them as env vars or in a config map keyed by SKU.

### B.4 Webhook for fulfillment

Payments succeed asynchronously. The user lands on `/success` immediately, but **fulfill access only when the webhook confirms**. Otherwise refunds, chargebacks, and failed payments leave you out of pocket.

Walk the user through getting the webhook secret:

> *"In Stripe dashboard &rarr; Developers &rarr; **Webhooks** &rarr; **Add endpoint**.*
> - *URL: `https://<your-domain>/api/stripe/webhook`*
> - *Events: select `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`*
>
> *Click Add endpoint, then copy the **Signing secret** (`whsec_...`). Paste it here."*

```ts
// app/api/stripe/webhook/route.ts
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';   // not 'edge' — needs the raw body

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      // grant access, mark order paid in DB, send confirmation email, etc.
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      // revoke access
      break;
    }
  }

  return new Response('ok');
}
```

For local testing of webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (Stripe CLI). It prints a webhook secret you can put in `.env.local` for dev.

### B.5 Test it end-to-end on `localhost`

Suggest: *"Open `localhost:3000` and walk through a purchase with me. Use card `4242 4242 4242 4242` &mdash; that's Stripe's test card. Any future expiry, any 3-digit CVC."*

The flow should: click "Buy" &rarr; Stripe Checkout opens &rarr; pay with test card &rarr; redirect back to `/success` &rarr; webhook fires &rarr; access granted in your DB.

### B.6 Anti-patterns to avoid

- **Building your own card form.** Use Stripe Checkout. PCI compliance is theirs.
- **Storing card numbers.** Ever. Anywhere. Even temporarily. Even hashed. Use Stripe's tokens.
- **Skipping webhook signature verification.** Anyone can POST fake events to your webhook URL otherwise.
- **Granting access in the success-page redirect.** It's not authoritative. Webhook is.
- **Hardcoding price IDs.** Keep them in env vars or a config so test/prod swap cleanly.

---

## Exit criteria (path-specific)

**AdSense:**
- Loader snippet in `<head>` of every page.
- `public/ads.txt` deployed and live at `/ads.txt` (verify with `curl https://<domain>/ads.txt`).
- Ad slots in place (hidden on small viewports), waiting for AdSense approval.
- A `# Monetization` line in `PROJECT.md` records the publisher ID and any deferred decisions.

**Stripe:**
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` in `.env.local` (gitignored) and in production env (sub-skill 13).
- Checkout flow tested end-to-end on `localhost` with test card `4242 4242 4242 4242`.
- Webhook signature verification confirmed (a tampered request returns 400).
- Access granted only after webhook fires &mdash; not on success-page redirect.
- A `# Monetization` line in `PROJECT.md` records the chosen plan structure (one-time vs subscription, price IDs).

Move on to `08-compliance.md`.
