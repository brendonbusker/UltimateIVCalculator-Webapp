import { test, expect } from '@playwright/test';
import { SITE } from '../../lib/site-config';

test('SEO content and metadata are present without JavaScript or Pokémon APIs', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.route('https://**/*', route => route.abort());
  const response = await page.goto('./');
  expect(response?.status()).toBe(200);
  const html = await response!.text();
  expect(html).toContain('About this Pokémon IV calculator');
  await expect(page).toHaveTitle(SITE.title);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', SITE.description);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', SITE.url);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', SITE.url);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary');
  await expect(page.locator('meta[name="keywords"]')).toHaveCount(0);
  expect(await page.locator('meta[name="robots"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('content')).join(' '))).not.toMatch(/noindex|none/i);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'About this Pokémon IV calculator' })).toBeVisible();
  await expect(page.getByText('Gen 3', { exact: true }).last()).toBeVisible();
  const data = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
  expect(data.url).toBe(SITE.url);
  expect(data['@type']).toBe('WebApplication');
  expect(data.aggregateRating).toBeUndefined();
  const icon = await page.locator('link[rel="icon"]').getAttribute('href');
  const iconUrl = new URL(icon!, page.url());
  expect(iconUrl.pathname).toBe(`${new URL(page.url()).pathname}icon.svg`);
  const iconResponse = await context.request.get(iconUrl.href);
  expect(iconResponse.ok()).toBeTruthy();
  expect(iconResponse.headers()['content-type']).toContain('image/svg+xml');
  const sitemap = await context.request.get(new URL('sitemap.xml', page.url()).href);
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()['content-type']).toContain('xml');
  expect(await sitemap.text()).toContain(`<loc>${SITE.url}</loc>`);
  await context.close();
});

test('guide follows the device at all widths and FAQ works with a keyboard', async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('.is-ready')).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const scene = await page.locator('.device-scene').boundingBox();
    const guide = await page.locator('.calculator-guide').boundingBox();
    expect(guide!.y).toBeGreaterThanOrEqual(scene!.y + scene!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  const question = page.getByText('Why do I get an IV range instead of one number?', { exact: true });
  await question.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/At lower levels, rounding/)).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/At lower levels, rounding/)).not.toBeVisible();
});
