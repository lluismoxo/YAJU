// Freeze only the particle loop after page startup to compare its deterministic first paint.
import {createRequire} from 'node:module';import {writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const origins=[process.env.YAJU_REFERENCE_ORIGIN||'http://127.0.0.1:4185',process.env.YAJU_TEST_ORIGIN||'http://127.0.0.1:4184'];
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{for(let index=0;index<2;index++){
 const states=[];
 for(const origin of origins){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();await page.goto(origin+'/ai-spend');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(3500);
  const title=page.locator('.dissolve-headline').nth(index),box=await title.boundingBox();
  await page.evaluate(()=>{window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{};});
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(200);
  const state=await title.evaluate(el=>{const c=el.querySelector('canvas');return {active:el.classList.contains('is-dissolved'),width:c.width,height:c.height,style:c.style.cssText,mask:el.querySelector('.dissolve-headline__text').style.maskImage,pixels:c.toDataURL()};});
  state.pixelHash=createHash('sha256').update(state.pixels).digest('hex');delete state.pixels;
  states.push(state);await context.close();
 }
 results.push({index,reference:states[0],candidate:states[1],passed:JSON.stringify(states[0])===JSON.stringify(states[1])});
 assert.equal(states[0].active,true,'Reference did not activate');assert.deepEqual(states[1],states[0],`Headline ${index}`);
}}finally{await browser.close();await writeFile('artifacts/dissolve-reference-report.json',JSON.stringify(results,null,2)+'\n');}
console.log('PASS: two original/native particle first paints match exactly.');
