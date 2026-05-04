import { test, expect } from '@playwright/test';
import { ROUTES } from './routes';

for (const route of ROUTES.filter((r) => !r.auth)) {
  test(`visual: ${route.path}`, async ({ page }) => {
    await page.goto(route.path);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot();
  });
}
