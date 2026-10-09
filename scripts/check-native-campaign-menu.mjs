import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const origin=process.env.YAJU_TEST_ORIGIN||'http://127.0.0.1:4184';
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{
 for(const width of [1440,768,390])for(const reducedMotion of ['reduce','no-preference']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/ai-spend');
  await page.evaluate(()=>{window.testShares=[];window.open=(url)=>{window.testShares.push(url);return null;};});
  const toggle=page.locator('button[data-campaign-chrome-mark]');
  const dialog=page.locator('[role="dialog"][aria-label="Navigation"]');
  async function open(){await toggle.click();await page.waitForTimeout(900);assert.equal(await dialog.getAttribute('aria-hidden'),'false');assert.equal(await toggle.getAttribute('aria-expanded'),'true');}
  async function closed(){await page.waitForTimeout(900);assert.equal(await dialog.getAttribute('aria-hidden'),'true');assert.equal(await dialog.evaluate(el=>el.inert),true);assert.equal(await toggle.getAttribute('aria-expanded'),'false');}
  await open();
  await dialog.locator('button').filter({hasText:/^English$/}).click();
  assert.equal(await dialog.locator('button').filter({hasText:/^English$/}).getAttribute('aria-expanded'),'true');
  await dialog.locator('li').filter({hasText:/^English$/}).click();
  assert.equal(await dialog.locator('button').filter({hasText:/^English$/}).getAttribute('aria-expanded'),'false');
  await toggle.focus();await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'Manage Cookies');
  await page.keyboard.press('Tab');assert.equal(await toggle.evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Escape');await closed();
  await open();await toggle.click();await closed();
  await open();await dialog.locator(':scope > button').click({position:{x:2,y:850}});await closed();
  for(const label of ['X','LinkedIn']){await open();await dialog.getByRole('button',{name:`Share on ${label}`,exact:true}).click();await closed();}
  const shares=await page.evaluate(()=>window.testShares);assert.equal(shares.length,2);
  for(const value of shares)assert.equal(new URL(value).searchParams.get('url'),`https://yajuas.com${new URL(page.url()).pathname}`);
  assert.equal(new URL(shares[0]).hostname,'twitter.com');assert.equal(new URL(shares[1]).hostname,'linkedin.com');
  await open();await dialog.getByRole('link',{name:'State of Sovereign AI',exact:true}).evaluate(el=>el.addEventListener('click',e=>e.preventDefault(),{once:true}));
  await dialog.getByRole('link',{name:'State of Sovereign AI',exact:true}).click();await closed();
  assert.deepEqual(errors,[]);results.push({width,reducedMotion,passed:true,shareDestinationsMocked:true});await context.close();
 }
}finally{await browser.close();await writeFile('artifacts/native-campaign-menu-report.json',JSON.stringify(results,null,2)+'\n');}
console.log(`PASS: ${results.length} campaign menu viewport/motion pairs; close methods, keyboard, language and mocked sharing.`);
