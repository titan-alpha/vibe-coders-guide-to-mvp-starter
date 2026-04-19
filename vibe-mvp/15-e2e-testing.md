# 15 · E2E Testing

Goal: drive the live MVP end-to-end with a real browser, capture screenshots of every key view, and visually inspect those screenshots for design or alignment issues. Make final fixes before ship.

## DIALOGUE — confirm with the user

Browser automation will open visible windows on the user's machine and exercise every flow, including auth and any AI features. Confirm before kicking off.

> *"I'd like to run end-to-end tests against the production deployment with a real browser. I'll exercise every key flow (signup, sign-in, the main feature, sign-out) and capture screenshots of each view. I'll then look at the screenshots myself and propose any design or alignment fixes I notice. The whole pass takes 5&ndash;10 minutes. OK to start?"*

If the user has data isolation concerns, ask whether to test against staging or production. If they don't have a staging env, point at production but use a clearly-marked test account (e.g., `e2e+<timestamp>@<domain>`).

## AUTONOMOUS — set up Playwright

```bash
npm install --save-dev @playwright/test playwright
npx playwright install chromium
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile',  use: { ...devices['iPhone 14'] } },
  ],
});
```

## AUTONOMOUS — write the tests

For each user flow in `PROJECT.md`'s MVP slice, write one Playwright spec. Include screenshot capture so you can inspect visuals after.

```ts
// e2e/01-landing.spec.ts
import { test, expect } from '@playwright/test';

test('landing page loads and is on-brand', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/); // not the framework default
  await page.screenshot({ path: testInfo.outputPath('landing.png'), fullPage: true });
});

// e2e/02-signup.spec.ts
test('user can sign up and reach the authed shell', async ({ page }, testInfo) => {
  const email = `e2e+${Date.now()}@example.com`;
  await page.goto('/login');
  await page.click('text=Sign in with Google'); // or whichever provider
  // for magic-link flows, intercept the email via Resend webhook or read from a test inbox
  // ... finish the flow
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('signed-in.png'), fullPage: true });
});

// e2e/03-core-flow.spec.ts — the one feature your MVP exists for
test('core feature works end-to-end', async ({ page }, testInfo) => {
  // walk through the MVP slice from PROJECT.md
  // screenshot at every meaningful state change
});

// e2e/04-mobile.spec.ts — same flows on mobile viewport
```

Run against the production URL:
```bash
E2E_BASE_URL=https://<your-domain> npx playwright test --project=desktop
E2E_BASE_URL=https://<your-domain> npx playwright test --project=mobile
```

Test results land in `playwright-report/` and screenshots in `test-results/`.

## AUTONOMOUS — review screenshots visually

This is the critical step. **Open each screenshot and look at it.** You can read images. Check for:

- Layout / alignment: anything misaligned, overlapping, cut off, or mis-padded?
- Typography: any text rendering at the wrong size, broken line wrapping, missing fonts?
- Color: anything off-brand, low contrast, or inconsistent?
- States: empty states, loading states, error states &mdash; do they look intentional or like bugs?
- Mobile: does anything overflow horizontally or sit too close to the safe area?
- Navigation: are CTAs prominent? Does the eye know where to go?

For each issue, propose a small fix and confirm with the user before applying:
> *"On the dashboard, the 'Create' button overlaps the search bar at the 768px breakpoint. I'd like to wrap them in a flex column on screens narrower than `md`. OK?"*

Fix, redeploy, re-run the relevant test. Repeat until the screenshots look right.

## AUTONOMOUS — what to test, by feature

Map this to whatever the project actually has:

| Feature | What to drive |
| --- | --- |
| Landing page | Loads, hero CTA visible, no console errors |
| Auth | Sign up (new email), sign in (existing), sign out, /verify link if used |
| MVP core slice | The full happy path from PROJECT.md, plus one error path |
| AI feature (sub-skill 04) | Submit input, get a typed response, check loading + error states |
| Chatbot (sub-skill 05) | Toggle open, send message, verify reply contains a valid internal link |
| Admin dashboard (sub-skill 06) | Reject without password (401), accept with password, charts render |
| 404 / error pages | Visit `/this-does-not-exist`, confirm on-brand 404 |
| Mobile viewport | Re-run the core slice on iPhone 14 viewport |

## Anti-patterns to avoid

- **Snapshot tests with no visual review.** A green test that no human looked at will let a broken layout ship. Always look at the screenshots.
- **Hardcoded selectors that depend on implementation detail.** Prefer `getByRole`, `getByLabel`, `getByTestId`. Add `data-testid` attributes if you need them.
- **Flaky timing.** Use `expect(locator).toBeVisible()` &mdash; never `setTimeout` / `waitForTimeout` to "let things settle."
- **Skipping mobile.** Most MVP traffic is mobile.

## Exit criteria

- Every flow in the MVP slice has a passing Playwright spec.
- Screenshots from desktop and mobile have been reviewed (by you, looking at them).
- Any issues found have been fixed and re-verified.
- A `# E2E` section in `PROJECT.md` lists the tested flows and the date of the last clean run.

Move on to `16-ship-checklist.md`.
