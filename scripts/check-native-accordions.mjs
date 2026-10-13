// Exercise native accordion media and scroll-anchor preservation without sending form data.
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const origin=process.env.YAJU_TEST_ORIGIN||'http://127.0.0.1:4184';
const manifest=JSON.parse(await readFile('config/native-pages.json','utf8'));
const entries=[];
for(const entry of manifest){
 const content=JSON.parse(await readFile(entry.source,'utf8'));
 if(content.interactions?.accordions?.length)entries.push(content);
}
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try{
 for(const width of [1440,768,390])for(const content of entries){
  const context=await browser.newContext({viewport:{width,height:1024},reducedMotion:'reduce'});
  await context.route('**/*',request=>new URL(request.request().url()).origin===origin?request.continue():request.abort());
  const page=await context.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+content.route);await page.evaluate(()=>document.fonts.ready);
  let states=0;
  for(const [group,model] of content.interactions.accordions.entries()){
   const buttons=page.locator(`[data-native-accordion="${group}"] > li > div > button`);
   assert.equal(await buttons.count(),model.states.length,content.route);
   for(let index=0;index<model.states.length;index++){
    const button=buttons.nth(index);
    await button.scrollIntoViewIfNeeded();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const hasMedia=Boolean(model.states[index].media);
    const handle=hasMedia?await page.locator(`[data-accordion-media="${group}"]`).elementHandle():null;
    if(await button.getAttribute('aria-expanded')!=='true')await button.click();
    assert.equal(await button.getAttribute('aria-expanded'),'true',`${content.route}: ${index}`);
    if(hasMedia){
     const result=await page.evaluate(({group,html,previous})=>{
      const media=document.querySelector(`[data-accordion-media="${group}"]`);
      const template=document.createElement('template');template.innerHTML=html;
      const expected=template.content.querySelector('img'),actual=media.querySelector('img');
      return {sameNode:media===previous,src:actual.getAttribute('src'),expectedSrc:expected.getAttribute('src')};
     },{group,html:model.states[index].media,previous:handle});
     assert.equal(result.sameNode,true,`${content.route}: media anchor replaced`);
     assert.equal(result.src,result.expectedSrc,`${content.route}: wrong media`);
     await handle.dispose();
    }
    states++;
   }
  }
  assert.deepEqual(errors,[],content.route);
  results.push({route:content.route,width,states,passed:true});
  console.log(content.route,width,'PASS');await context.close();
 }
}finally{
 await browser.close();await writeFile('artifacts/native-accordions-report.json',JSON.stringify(results,null,2)+'\n');
}
