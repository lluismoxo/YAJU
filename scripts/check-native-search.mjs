import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const origin=process.env.YAJU_TEST_ORIGIN||'http://127.0.0.1:4184';
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{
 for(const width of [1440,768,390])for(const scope of ['blog','newsroom']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();const errors=[],submissions=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Validate the existing destination without depending on the unavailable search backend.
  await page.route(`**/${scope}/search?*`,r=>{submissions.push(r.request().url());return r.fulfill({status:200,contentType:'text/html',body:'<p>Simulated search destination</p>'});});
  await page.goto(`${origin}/${scope}`);await page.evaluate(()=>document.fonts.ready);
  const triggers=page.getByRole('button',{name:'Open blog search'}),count=await triggers.count();
  for(let index=0;index<count;index++){
   const trigger=triggers.nth(index);await trigger.scrollIntoViewIfNeeded();
   const overflow=await page.evaluate(()=>document.body.style.overflow),scroll=await page.evaluate(()=>scrollY);
   await trigger.click();const input=page.getByRole('searchbox',{name:'Search articles'});
   await input.waitFor();await page.waitForTimeout(100);
   assert.equal(await input.evaluate(e=>e===document.activeElement),true);
   assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
   await page.keyboard.press('Tab');assert.equal(await page.getByRole('dialog').locator('button').first().evaluate(e=>e===document.activeElement),true);
   await page.keyboard.press('Shift+Tab');assert.equal(await input.evaluate(e=>e===document.activeElement),true);
   await input.fill('Yaju');await page.getByRole('button',{name:'Clear search',exact:true}).click();
   assert.equal(await input.inputValue(),'');assert.equal(await page.getByRole('button',{name:'Clear search',exact:true}).count(),0);
   await input.fill('  ');await input.press('Enter');assert.equal(submissions.length,0);
   await page.keyboard.press('Escape');await page.waitForTimeout(350);
   assert.equal(await page.getByRole('dialog').count(),0);
   assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
   assert.equal(await page.evaluate(()=>document.body.style.overflow),overflow);
   assert.equal(await page.evaluate(()=>scrollY),scroll);
   await trigger.click();await page.getByRole('dialog').locator('button').first().click();await page.waitForTimeout(350);
   assert.equal(await page.getByRole('dialog').count(),0);
   await trigger.click();await page.waitForTimeout(100);await page.mouse.click(2,2);await page.waitForTimeout(350);
   assert.equal(await page.getByRole('dialog').count(),0);
  }
  await triggers.first().click();const input=page.getByRole('searchbox',{name:'Search articles'});
  await input.fill('  Yaju & análisis  ');await input.press('Enter');await page.waitForURL(`**/${scope}/search?*`);
  assert.equal(submissions.length,1);const url=new URL(submissions[0]);
  assert.equal(url.pathname,`/${scope}/search`);assert.equal(url.searchParams.get('q'),'Yaju & análisis');
  assert.deepEqual(errors,[]);
  results.push({scope,width,triggers:count,passed:true,submission:'mocked'});console.log(scope,width,'PASS');await context.close();
 }
}finally{await browser.close();await writeFile('artifacts/native-search-report.json',JSON.stringify(results,null,2)+'\n');}
