import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {languages} from '../src/i18n/translate.mjs';
const require=createRequire(import.meta.url);const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const origin=process.env.YAJU_TEST_ORIGIN||'http://127.0.0.1:4190';
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
await mkdir('artifacts/i18n',{recursive:true});
try{
 for(const language of languages){
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   const analytics=[];await context.route('**/*',r=>{const url=r.request().url();if(/googletagmanager|google-analytics/.test(url))analytics.push(url);return new URL(url).origin===origin?r.continue():r.abort()});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+language.prefix+'/');await page.waitForTimeout(300);
   assert.equal(await page.locator('html').getAttribute('lang'),language.code);
   assert.equal(analytics.length,0,'Analytics before consent');
   const decline=page.locator('[data-choice="reject"]');
   if(await decline.count())await decline.first().click();
   const button=page.locator('[data-language-trigger]').last();await button.scrollIntoViewIfNeeded();await button.click();assert.equal(await button.getAttribute('aria-expanded'),'true');
   const id=await button.getAttribute('aria-controls');assert.equal(await page.locator('#'+id+' a').count(),6);
   await page.waitForTimeout(300);assert.equal(await page.locator('#'+id).isVisible(),true);
   await page.screenshot({path:`artifacts/i18n/${language.code}-${width}-footer.png`});
   await page.keyboard.press('Escape');assert.equal(await button.getAttribute('aria-expanded'),'false');
   await button.click();await page.locator('#'+id+' a[hreflang="es"]').click();await page.waitForURL('**/es/');assert.equal(await page.locator('html').getAttribute('lang'),'es');
   await page.goto(origin+language.prefix+'/developers/');await page.waitForTimeout(200);assert.equal(await page.locator('html').getAttribute('lang'),language.code);
   await page.screenshot({path:`artifacts/i18n/${language.code}-${width}-developers.png`});
   assert.equal(errors.length,0,JSON.stringify(errors));results.push({language:language.code,width,errors,analyticsBeforeConsent:analytics.length});await context.close();
  }
 }
}finally{await browser.close();await writeFile('artifacts/i18n/browser.json',JSON.stringify(results,null,2));}
console.log(`PASS: ${results.length} locale/viewport cases, language menu, metadata, no analytics before consent, no browser exceptions.`);
