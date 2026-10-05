// No analytics, submissions, or third-party requests are allowed in this check.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.env.YAJU_BROWSER_MODULES || process.cwd()] }));
const origin = process.env.YAJU_TEST_ORIGIN || 'http://127.0.0.1:4184';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/reports/state-of-sovereign-ai-adoption-2026`);
    await page.waitForTimeout(3500);
    const hero = page.locator(`[data-component="${width < 768 ? 'idc-report-hero-mobile' : 'idc-report-hero'}"]`);
    const words = hero.locator('[data-slide1-copy] [data-report-word]');
    assert.ok(await words.count() > 5, 'Headline must be split into accessible animated words');
    assert.ok(await words.evaluateAll(nodes => nodes.every(node => ['none','matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(node).transform))), 'Headline must finish revealing');
    const clips = hero.locator('[data-idc-clip-inner]');
    assert.ok(await clips.evaluateAll(nodes => nodes.some(node => Number(getComputedStyle(node).opacity) === 0)), 'Later images must wait for their scene');
    await page.evaluate(() => scrollTo(0, 1700));
    await page.waitForTimeout(3300);
    // Changing the OS motion preference while reading must never leave content hidden.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(200);
    assert.ok(await clips.evaluateAll(nodes => nodes.every(node => Number(getComputedStyle(node).opacity) === 1)), 'Reduced motion must expose every image');
    assert.ok(await hero.locator('[data-report-word]').evaluateAll(nodes => nodes.every(node => ['none','matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(node).transform))), 'Reduced motion must expose every word');
    await page.setViewportSize({ width: width === 1440 ? 390 : 1440, height: 900 });
    await page.waitForTimeout(200);
    const newHero = page.locator(`[data-component="${width === 1440 ? 'idc-report-hero-mobile' : 'idc-report-hero'}"]`);
    assert.ok(await newHero.isVisible(), 'Correct hero must remain visible after resizing');
    assert.deepEqual(errors, []);
    results.push({ width, headline: 'passed', deferredImages: 'passed', preferenceChange: 'passed', responsiveSwitch: 'passed', errors });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile('artifacts/native-report-motion-check.json', JSON.stringify(results, null, 2) + '\n');
}
console.log(JSON.stringify(results, null, 2));
