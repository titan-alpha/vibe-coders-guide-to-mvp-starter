import puppeteer from 'puppeteer';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3998';
// Login is omitted: it only exists when FEATURE_AUTH/auth flag is on.
const ROUTES = [
  '/', '/about', '/faq', '/changelog', '/press', '/status',
  '/llms.txt', '/AGENTS.txt', '/sitemap.xml', '/robots.txt',
];

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const errors = [];
const results = [];
page.on('pageerror', (e) => errors.push({ kind: 'pageerror', msg: e.message }));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push({ kind: 'console', msg: m.text() });
});

for (const route of ROUTES) {
  const url = BASE + route;
  try {
    const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const status = r?.status() ?? 0;
    const title = await page.title().catch(() => '');
    const h1 = await page.$eval('h1', (el) => el.textContent?.trim()).catch(() => null);
    results.push({ route, status, title: (title ?? '').slice(0, 60), h1: h1?.slice(0, 60) ?? null });
  } catch (e) {
    results.push({ route, error: e.message });
  }
}

console.log(JSON.stringify({ results, errors }, null, 2));
await browser.close();
const bad = results.filter((r) => r.error || (r.status && r.status >= 400));
process.exit(bad.length || errors.length ? 1 : 0);
