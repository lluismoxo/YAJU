import {createRequire} from 'node:module';import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const origins=[process.env.YAJU_REFERENCE_ORIGIN||'http://127.0.0.1:4185',process.env.YAJU_TEST_ORIGIN||'http://127.0.0.1:4184'];
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[];
const selectors=['.campaign-slideshow__pin','.campaign-slideshow__track','.campaign-slideshow__hero-line','.campaign-slideshow__hero-body','.campaign-slideshow__trans-quote-block','.campaign-slideshow__split-type-media','.campaign-slideshow__split-zoom-media','.campaign-slideshow__final-media','.campaign-slideshow__final-bg .campaign-slideshow__media-frame'];
try{
 const contexts=await Promise.all(origins.map(()=>browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'})));
 const pages=await Promise.all(contexts.map(c=>c.newPage()));
 await Promise.all(pages.map(async(page,index)=>{await page.route('**/*',r=>new URL(r.request().url()).origin===origins[index]?r.continue():r.abort());page.on('pageerror',e=>errors.push({index,error:e.message}));await page.goto(origins[index]+'/ai-spend');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(3500);}));
 for(const offset of [0,800,1700,2800,4000,5100,7200,9600]){
  await Promise.all(pages.map(p=>p.evaluate(y=>scrollTo(0,y),offset)));await pages[0].waitForTimeout(3500);
  const states=await Promise.all(pages.map(p=>p.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{const el=document.querySelector(selector);if(!el)return[selector,null];const r=el.getBoundingClientRect(),s=getComputedStyle(el);return[selector,{x:+r.x.toFixed(2),y:+r.y.toFixed(2),width:+r.width.toFixed(2),height:+r.height.toFixed(2),opacity:s.opacity,transform:s.transform}];})),selectors)));
  results.push({offset,reference:states[0],candidate:states[1],passed:JSON.stringify(states[0])===JSON.stringify(states[1])});
 }
 assert.deepEqual(errors.filter(e=>e.index===1),[]);assert.ok(errors.filter(e=>e.index===0).every(e=>e.error.includes('Minified React error #418')),'Unexpected reference error');assert.ok(results.every(r=>r.passed),'Timeline geometry differs; inspect report');
 await Promise.all(pages.map(p=>p.setViewportSize({width:900,height:700})));await pages[0].waitForTimeout(500);await Promise.all(pages.map(p=>p.evaluate(()=>scrollTo(0,0))));await pages[0].waitForTimeout(500);await Promise.all(pages.map(p=>p.evaluate(()=>scrollTo(0,800))));await pages[0].waitForTimeout(3500);
 const chrome=await Promise.all(pages.map(p=>p.locator('button[data-campaign-chrome-mark]').evaluate(el=>getComputedStyle(el.parentElement).transform)));assert.equal(chrome[1],chrome[0],'Landscape tablet scroll visibility');
 const candidate=pages[1];await candidate.emulateMedia({reducedMotion:'reduce'});await candidate.waitForTimeout(500);assert.equal(await candidate.locator('.pin-spacer').count(),0);
 await candidate.setViewportSize({width:390,height:844});await candidate.waitForTimeout(500);assert.equal(await candidate.locator('.campaign-slideshow-desktop-root').isVisible(),false);assert.equal(await candidate.locator('.campaign-slideshow-mobile-root').isVisible(),true);
 await candidate.emulateMedia({reducedMotion:'no-preference'});await candidate.setViewportSize({width:1440,height:900});await candidate.waitForTimeout(1000);assert.equal(await candidate.locator('.pin-spacer').count(),1);
 console.log('PASS: eight original/native timeline positions; reduced-motion cleanup and responsive rebuild.');
}finally{await browser.close();await writeFile('artifacts/campaign-timeline-report.json',JSON.stringify({results,errors},null,2)+'\n');}
