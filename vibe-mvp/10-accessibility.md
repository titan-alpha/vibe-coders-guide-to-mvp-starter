# 10 · Accessibility

Goal: pass WCAG 2.2 AA on the MVP slice. This is not optional. Roughly 1 in 5 people has a disability that affects how they use software.

## AUTONOMOUS — automated axe-core scan (run this first)

axe-core catches roughly half of all WCAG violations mechanically. Lead with it; the manual passes below cover what axe can't see.

Install once if not already present:

```bash
npm install --save-dev @axe-core/playwright @playwright/test playwright
npx playwright install chromium
```

Add `e2e/a11y.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ROUTES } from './routes';

for (const route of ROUTES.filter(r => !r.auth)) {
  test(`a11y: ${route.path}`, async ({ page }) => {
    await page.goto(route.path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations,
      JSON.stringify(results.violations, null, 2),
    ).toEqual([]);
  });
}
```

(The `ROUTES` manifest lives in `e2e/routes.ts` — sub-skill 15 sets it up. If 15 hasn't run yet, inline a temporary array of the routes that exist today.)

Run against localhost (Playwright's `webServer` config from sub-skill 15 starts it for you):

```bash
npx playwright test e2e/a11y.spec.ts
```

axe catches:
- **Color contrast on every text/background combination** below 4.5:1 (body) / 3:1 (large text) / 3:1 (non-text UI).
- Missing `alt`, missing `<label>`, missing landmarks (`<main>`, `<nav>`, `<footer>`).
- Invalid ARIA, broken focus order, missing skip links.
- Heading-level skips, duplicate IDs, link-vs-button confusion.

Fix every violation. Re-run until clean. **Then proceed to the manual passes below** — axe handles the mechanical checks; the remaining ~50% need a human (you).

## AUTONOMOUS — manual passes (axe doesn't catch these)

### 1. Tap target size (WCAG 2.5.5 Target Size — Minimum, 2.5.8 Target Size — Enhanced)

Every interactive element must be ≥ 44×44 CSS pixels on mobile. Common offenders: icon-only buttons, social links in the footer, close buttons, hamburger toggles. Fix with `min-h-[44px] min-w-[44px]`, or `p-3` around a 20px icon. Verify on the `mobile-sm` Playwright project.

### 2. Type-size floor (cross-check sub-skill 02)

Skim the rendered pages and confirm no body text, label, caption, or nav item renders below **16px** (`text-base`). The only allowed exceptions are technical metadata (timestamps, version numbers, code badges) at **14px** (`text-sm`). If `text-xs` or smaller appears anywhere readable, fix it.

### 3. Keyboard pass

- Tab through every interactive element on the MVP slice. Every focusable element must show a visible focus ring (`focus-visible:ring-2 focus-visible:ring-primary` is fine).
- No keyboard traps. Modal dialogs return focus to the triggering element on close.
- Custom interactive elements (anything that isn't a native button/link/input) implement the appropriate ARIA role + keyboard handlers, or — better — are rebuilt with native elements.

### 4. Semantic HTML cross-check

- Every page has exactly one `<h1>`. Heading levels never skip.
- Buttons that look like links use `<button>`. Links that look like buttons use `<a>`. Never the reverse.
- The main page region is wrapped in `<main>`; the nav in `<nav>`; the footer in `<footer>`.
- Lists are `<ul>`/`<ol>`, not divs.

### 5. Reduced motion verification

Verify in Playwright that `prefers-reduced-motion: reduce` is respected. Add to `e2e/a11y.spec.ts`:

```ts
test('reduced motion: no non-essential animation runs', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  // For each known-animated element, assert its computed animation-duration is 0s,
  // or screenshot and compare visually to the no-motion render.
  const anims = await page.evaluate(() =>
    Array.from(document.querySelectorAll('*'))
      .map(el => getComputedStyle(el).animationName)
      .filter(n => n && n !== 'none')
  );
  expect(anims, 'no animations should run under reduced-motion').toEqual([]);
});
```

If your design uses essential motion (e.g., a loading spinner that conveys progress), exempt it explicitly with `@media (prefers-reduced-motion: no-preference)` guarding only decorative animations.

### 6. Color-blindness sanity check

Open the live site in Chrome DevTools → Rendering → "Emulate vision deficiencies" → check **Protanopia, Deuteranopia, Tritanopia, Achromatopsia** on:
- The landing page.
- Any chart, graph, or status indicator.
- Form error states.

Confirm meaning is never conveyed by color alone (red border on an invalid input must also have a text label or icon; a red/green chart must also have shape or label distinction).

### 7. Screen reader smoke test

- Page `<title>` is meaningful and unique per route.
- Images have `alt` text; decorative images have `alt=""`.
- Icon-only buttons have `aria-label`.
- Live regions (toasts, async results) use `aria-live="polite"`.

## DIALOGUE — confirm with the user

After the fixes, tell the user:
- The axe scan now passes for routes [list] with zero violations.
- The manual passes you completed (tap targets, keyboard, reduced motion, color-blindness, screen reader).
- One specific thing you'd like them to test by tabbing through manually (usually the core feature flow — keyboard navigation is the highest-value human check).

## Exit criteria

- `npx playwright test e2e/a11y.spec.ts` passes for every MVP route, on both desktop and mobile projects.
- All tap targets on mobile are ≥ 44×44 CSS pixels.
- No body text renders below 16px (metadata exceptions allowed at 14px).
- `prefers-reduced-motion: reduce` is respected (verified in Playwright).
- Color-blindness simulation reviewed for landing + any chart/status view.
- A `# Accessibility` line in `PROJECT.md` records the audit date and the routes scanned.

Move on to `11-security.md`.
