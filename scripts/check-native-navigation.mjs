import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.env.YAJU_BROWSER_MODULES || process.cwd()] }));
const origin = new URL(process.env.YAJU_TEST_ORIGIN || 'http://127.0.0.1:4184').origin;
// One consumer of each standard header variant. Campaign and registration use separate navigation.
const routes = ['/', '/blog/what-your-corpus-leaves-out', '/blog/the-future-of-work-debate-has-an-evidence-problem', '/agent-academy', '/labs/futures-of-work', '/software-factory-demo', '/labs/scholars'];
const results = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1440, 768, 390]) {
    for (const route of routes) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      const errors = [], checks = [];
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', request => new URL(request.request().url()).origin === origin ? request.continue() : request.abort());
      try {
        await page.goto(origin + route, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        for (const label of ['Product', 'Solutions', 'Resources', 'Blog', 'Company']) {
          if (width >= 1024) {
            const link = page.getByRole('link', { name: label, exact: true }).first();
            await link.focus();
            const active = page.locator('[data-desktop-menu][aria-hidden="false"]');
            await page.waitForFunction(() => document.querySelector('[data-desktop-panel]').getBoundingClientRect().height > 0);
            assert.equal(await active.count(), 1);
            await active.locator('a').first().focus();
            assert.ok(await page.locator('[data-desktop-panel]').evaluate(el => el.getBoundingClientRect().height > 0));
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => document.querySelector('[data-desktop-panel]').getBoundingClientRect().height === 0);
          } else {
            const toggle = page.locator('[data-mobile-nav] button');
            await toggle.focus();
            await page.keyboard.press('Enter');
            assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
            assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).overflowY), 'hidden');
            await page.getByRole('button', { name: label, exact: true }).first().focus();
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('[data-mobile-menu][aria-hidden="false"]').count(), 1);
            await page.getByRole('button', { name: /Back/ }).focus();
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('[data-mobile-root]').getAttribute('aria-hidden'), 'false');
            await page.keyboard.press('Escape');
            assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
            assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
            assert.notEqual(await page.locator('body').evaluate(el => getComputedStyle(el).overflowY), 'hidden');
          }
          checks.push(`${label}: keyboard open, navigate and close`);
        }
        if (width < 1024) {
          await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
          await page.setViewportSize({ width: 1440, height: 900 });
          await page.waitForFunction(() => getComputedStyle(document.body).overflowY !== 'hidden');
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await page.locator('[data-mobile-panel]').getAttribute('aria-hidden'), 'true');
          checks.push('resize to desktop closes drawer and unlocks scroll');
        }
        assert.deepEqual(errors, []);
        results.push({ route, width, pass: true, checks });
        console.log(`PASS ${width} ${route}: ${checks.length} checks`);
      } catch (error) {
        results.push({ route, width, pass: false, checks, error: error.message, errors });
        console.log(`FAIL ${width} ${route}: ${error.message}`);
      } finally { await context.close(); }
    }
  }
} finally {
  await browser.close();
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/native-navigation-report.json', JSON.stringify({ origin, results }, null, 2) + '\n');
}
const failures = results.filter(result => !result.pass);
console.log(JSON.stringify({ pairs: results.length, checks: results.reduce((sum, result) => sum + result.checks.length, 0), failures }, null, 2));
assert.equal(failures.length, 0);
