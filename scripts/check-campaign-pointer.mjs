import {createRequire} from 'node:module';import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const origins=[process.env.YAJU_REFERENCE_ORIGIN||'http://127.0.0.1:4185',process.env.YAJU_TEST_ORIGIN||'http://127.0.0.1:4184'];
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{for(const hasTouch of [false,true]){
 const states=[];
 for(const origin of origins){
  const page=await browser.newPage({viewport:{width:1440,height:900},hasTouch,reducedMotion:'reduce'});
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin+'/ai-spend');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(3500);
  const state={touch:hasTouch,videoHits:await page.locator('main [data-campaign-video-hit]').count(),staticThumbs:await page.locator('.campaign-up-next__thumb-static').count(),cursorCount:await page.locator('.campaign-play-cursor').count(),cards:[]};
  if(!hasTouch){await page.mouse.move(300,400);state.cursor=await page.locator('.campaign-play-cursor').evaluate(el=>({opacity:el.style.opacity,transform:el.style.transform,play:el.classList.contains('campaign-play-cursor--play')}));}
  for(let index=0;index<3;index++){
   const card=page.locator('.campaign-up-next__copy').nth(index);await card.scrollIntoViewIfNeeded();await page.waitForTimeout(500);
   if(!hasTouch){await card.hover();await page.waitForTimeout(300);state.cards.push(await page.locator('.campaign-up-next__thumb-cursor').evaluate(el=>({src:el.querySelector('img')?.getAttribute('src'),srcset:el.querySelector('img')?.getAttribute('srcset'),visible:el.querySelector('.is-visible')!==null,transform:el.style.transform})));await page.mouse.move(2,400);assert.equal(await page.locator('.campaign-up-next__thumb-cursor-frame').evaluate(el=>el.classList.contains('is-visible')),false);}
   else state.cards.push(await card.evaluate(el=>({src:el.parentElement.querySelector('img')?.getAttribute('src'),description:el.querySelector('.campaign-up-next__description').className})));
  }
  states.push(state);await page.close();
 }
 assert.deepEqual(states[1],states[0]);assert.equal(states[0].videoHits,0,'Video triggers must be reviewed if content changes');
 results.push({hasTouch,reference:states[0],candidate:states[1],passed:true});
}}finally{await browser.close();await writeFile('artifacts/campaign-pointer-report.json',JSON.stringify(results,null,2)+'\n');}
console.log('PASS: original/native pointer, three hover thumbnails, touch thumbnails and current video-trigger inventory.');
