import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile-sm', use: { ...devices['iPhone SE'] } },
    { name: 'mobile-lg', use: { ...devices['iPhone 14'] } },
    { name: 'tablet',    use: { ...devices['iPad Mini'] } },
    { name: 'desktop',   use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'wide',      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
  ],
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
});
