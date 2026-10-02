import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const {chromium} = require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES || process.cwd()]}));
const origin = process.argv[2] || 'http://127.0.0.1:4180';
const browser = await chromium.launch({channel:'chrome',headless:true});
const checks=[];
try {
  for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    const context=await browser.newContext({viewport,reducedMotion:'no-preference'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin || ['image','font'].includes(route.request().resourceType()) ? route.continue() : route.abort());
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/legal/',{waitUntil:'load'});
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').innerText(),'Skip to content');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator(':focus').getAttribute('id'),'main-content');
    checks.push(`${viewport.width}: keyboard skip to main`);
    if(viewport.width<1024){
      const toggle=page.getByRole('button',{name:'Open navigation menu',exact:true});
      await toggle.focus();await page.keyboard.press('Enter');
      await page.getByRole('button',{name:'Product',exact:true}).focus();await page.keyboard.press('Enter');
      await page.getByRole('button',{name:/Back/}).focus();await page.keyboard.press('Enter');
      await page.keyboard.press('Escape');
      assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      assert.equal(await toggle.evaluate(e=>document.activeElement===e),true);
      assert.notEqual(await page.locator('body').evaluate(e=>getComputedStyle(e).overflowY),'hidden');
      checks.push('mobile: keyboard open/submenu/back/Escape and scroll unlock');
    } else {
      const product=page.getByRole('link',{name:'Product',exact:true}).first();
      await product.focus();await page.waitForTimeout(400);
      assert.equal(await page.locator('[data-desktop-menu]').first().getAttribute('aria-hidden'),'false');
      await page.locator('[data-desktop-menu]').first().locator('a').first().focus();
      assert.ok(await page.locator('[data-desktop-panel]').evaluate(e=>e.classList.contains('grid-rows-[1fr]')), 'Menu must remain open when focus enters its links');
      await page.keyboard.press('Escape');
      await page.waitForFunction(()=>document.querySelector('[data-desktop-panel]').getBoundingClientRect().height===0,{},{timeout:3000});
      assert.equal(await page.locator('[data-desktop-panel]').evaluate(e=>e.getBoundingClientRect().height),0);
      checks.push('desktop: keyboard menu and Escape');
    }
    for(const link of await page.locator('main a').evaluateAll(links=>links.map(a=>a.getAttribute('href')))) {
      const response=await context.request.get(origin+link);assert.equal(response.status(),200,link);
    }
    checks.push(`${viewport.width}: all policy destinations return 200`);
    assert.deepEqual(errors,[]);
    checks.push(`${viewport.width}: no JavaScript exceptions`);
    await page.screenshot({path:`artifacts/pilot-full-${viewport.width}.png`,fullPage:true});
    await context.close();
  }
  const nojs=await browser.newContext({javaScriptEnabled:false});const page=await nojs.newPage();
  await page.goto(origin+'/legal/',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('main a').count(),9);
  assert.match(await page.locator('h1').innerText(),/Yaju Legal/);
  checks.push('policy content and nine links available without JavaScript');
  await nojs.close();
  await mkdir('artifacts',{recursive:true});
  await writeFile('artifacts/pilot-interactions.json',JSON.stringify({generatedAt:new Date().toISOString(),checks},null,2)+'\n');
  console.log(checks.join('\n'));
} finally {await browser.close();}
