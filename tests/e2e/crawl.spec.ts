import { test, expect } from '@playwright/test';
import { ROUTES } from './routes';

for (const route of ROUTES.filter((r) => !r.auth)) {
  test(`crawl: ${route.path}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    const response = await page.goto(route.path);
    expect(response?.status() ?? 500).toBeLessThan(400);
    await page.waitForLoadState('networkidle');
    expect(consoleErrors, 'no console errors').toEqual([]);
  });
}
