import {createRequire} from 'node:module';import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const origin=process.env.YAJU_TEST_ORIGIN||'http://127.0.0.1:4184';
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{for(const reducedMotion of ['no-preference','reduce']){
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/ai-spend');await page.evaluate(()=>document.fonts.ready);
 const count=await page.locator('.dissolve-headline').count();assert.ok(count>=2);
 for(let index=0;index<count;index++){
  const title=page.locator('.dissolve-headline').nth(index);if(!await title.isVisible())continue;
  await title.scrollIntoViewIfNeeded();const box=await title.boundingBox();
  if(box.x>=1440||box.x+box.width<=0||box.y>=900||box.y+box.height<=0)continue;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(250);
  await page.mouse.move(box.x+box.width/2+8,box.y+box.height/2);await page.waitForTimeout(150);
  const state=await title.evaluate(el=>{const c=el.querySelector('canvas'),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let ink=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])ink++;return {active:el.classList.contains('is-dissolved'),mask:el.querySelector('span').style.maskImage,ink,width:c.width,height:c.height};});
  assert.equal(state.active,reducedMotion==='no-preference');
  if(reducedMotion==='no-preference'){assert.ok(state.ink>0,'Empty effect');assert.ok(state.mask.includes('radial-gradient'));}
  await page.mouse.move(1,1);await page.waitForTimeout(1800);
  assert.equal(await title.evaluate(el=>el.classList.contains('is-dissolved')),false);
  assert.equal(await title.locator('span').evaluate(el=>el.style.maskImage),'');
  results.push({index,reducedMotion,passed:true,...state});
 }
 if(reducedMotion==='no-preference'){
  // The preceding loop can leave the horizontally pinned hero out of view.
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(1800);
  const title=page.locator('.dissolve-headline').first();await title.hover();await page.waitForTimeout(200);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  assert.equal(await title.evaluate(el=>el.classList.contains('is-dissolved')),false);
 }
 assert.deepEqual(errors,[]);await context.close();
}}finally{await browser.close();await writeFile('artifacts/native-dissolve-report.json',JSON.stringify(results,null,2)+'\n');}
console.log(`PASS: ${results.length} headline/motion states, reset and preference change.`);
