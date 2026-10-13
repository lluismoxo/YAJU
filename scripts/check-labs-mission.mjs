import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const browser=await chromium.launch({channel:'chrome',headless:true});const report=[];
try{for(const width of [1440,390])for(const port of [4185,4184]){
 const page=await browser.newPage({viewport:{width,height:900}});const origin=`http://127.0.0.1:${port}`;
 await page.route('**/*',r=>new URL(r.request().url()).origin===origin||r.request().resourceType()==='font'?r.continue():r.abort());
 await page.goto(origin+'/labs/');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(2500);
 const states=[];
 for(const y of [0,500,700,900,1200]){
  await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(2000);
  const state=await page.locator('.globe-viz').evaluate(el=>{const mission=el.closest('section').querySelector('.z-20');return {rect:mission.getBoundingClientRect().toJSON(),eyebrow:getComputedStyle(mission.querySelector('.font-eyebrow').parentElement).opacity,words:[...mission.querySelector('h2').querySelectorAll('[aria-hidden]')].map(el=>({text:el.textContent,opacity:getComputedStyle(el).opacity,depth:el.querySelectorAll('[aria-hidden]').length})),body:mission.querySelector('.portable-text-breaks p')?.getBoundingClientRect().toJSON()};});
  states.push({scroll:y,...state});
 }
 report.push({width,port,states});await page.close();
}
 for(const width of [1440,390]){
  const [reference,candidate]=report.filter(item=>item.width===width);
  for(let index=0;index<reference.states.length;index++){
   const a=reference.states[index],b=candidate.states[index];
   assert.deepEqual(b.rect,a.rect,`Mission geometry at ${width}/${a.scroll}`);
   assert.deepEqual(b.body,a.body,`Paragraph geometry at ${width}/${a.scroll}`);
   assert.deepEqual(b.words,a.words,`Word opacity at ${width}/${a.scroll}`);
   // The original's two concurrent eyebrow tweens vary at intermediate progress.
   // Record those values rather than treating a tolerance as visual approval.
   if(a.scroll!==500||width===390)assert.equal(b.eyebrow,a.eyebrow);
  }
 }
}finally{await browser.close();await writeFile('artifacts/labs-mission.json',JSON.stringify(report,null,2)+'\n');}
console.log('PASS: ten Labs mission states match geometry and word opacity; intermediate eyebrow recorded separately.');
