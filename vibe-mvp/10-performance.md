# 10 · Performance

Goal: Lighthouse ≥ 90 on Performance, Accessibility, Best Practices, and SEO. The MVP loads fast on a mid-tier phone on 4G.

## AUTONOMOUS — measure, fix, re-measure

### 1. Build and serve a production bundle

```bash
npm run build && npm run start
```
Open the landing route and run Lighthouse in Chrome DevTools (Application > Lighthouse > "Mobile" + "Performance, Accessibility, Best Practices, SEO"). Record the four scores.

### 2. Common fixes (apply only what's needed)

- **Images.** Use `next/image` for everything. Provide `width`/`height` to avoid layout shift. Convert hero images to AVIF or WebP. Cap hero image to 200KB.
- **Fonts.** Use `next/font` to self-host. Load only the weights you actually use.
- **JavaScript.** Audit imports. A single `lodash` import in a Client Component can add 70KB. Use `lodash-es` named imports or replace with native.
- **Client vs Server Components.** Default to Server Components. Only mark `"use client"` for components that need browser APIs or interactivity.
- **Third-party scripts.** Defer or remove. No analytics in v1 unless the user specifically asked. If they did, use Vercel Analytics — it's free and one line.
- **Database calls.** Cache static or semi-static data with `unstable_cache` or route-segment `revalidate`. Don't refetch on every request.

### 3. Perceived performance

- Add a `loading.tsx` for slow routes — even a simple skeleton beats blank.
- Use `<Suspense>` to stream content as it becomes ready.
- Show optimistic UI for form submissions where you can.

### 4. Re-measure

Re-run Lighthouse. If any score is below 90, fix the highest-impact opportunity and re-run. Don't chase 100s — 90+ is the bar for MVP.

## DIALOGUE — report to the user

Tell the user:
- The four Lighthouse scores before and after.
- The top 1–2 things you changed.
- Anything you deliberately left unfixed and why (e.g., "third-party auth provider script can't be deferred without breaking sign-in").

## Exit criteria

- Lighthouse mobile scores: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.
- A `# Performance` line in `PROJECT.md` records the final scores.

Move on to `11-deploy.md`.
