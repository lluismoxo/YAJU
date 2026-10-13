import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const origins=['http://127.0.0.1:4185','http://127.0.0.1:4184'];
const results=[];const browser=await chromium.launch({channel:'chrome',headless:true});
const gridSelector='a[class~="group/calloutCard"]';
try{
 for(const width of [1440,768,390])for(const route of ['/ai-observability','/solutions/financial-services']){
  const contexts=await Promise.all(origins.map(()=>browser.newContext({viewport:{width,height:900},locale:'en-US',timezoneId:'Europe/Madrid'})));
  const pages=await Promise.all(contexts.map(c=>c.newPage()));
  for(let i=0;i<2;i++)await pages[i].route('**/*',r=>new URL(r.request().url()).origin===origins[i]?r.continue():r.abort());
  const checks=[];
  try{
   await Promise.all(pages.map((p,i)=>p.goto(origins[i]+route,{waitUntil:'load'})));
   await Promise.all(pages.map(p=>p.evaluate(()=>document.fonts.ready)));
   await Promise.all(pages.map(p=>p.waitForTimeout(1500)));
   const sections=pages.map(p=>p.getByRole('button',{name:'1',exact:true}).first().locator('xpath=ancestor::section[1]'));
   async function check(state,expected){
    const values=await Promise.all(sections.map(s=>s.evaluate(section=>[...section.querySelectorAll('[class*="motion-safe:opacity-0"]')].map(node=>node.className.includes('animate-')))));
    assert.ok(values[0].length);
    assert.deepEqual(values[1],values[0],`${route} ${width} ${state}`);
    assert.equal(values[0].some(Boolean),expected,`Reference ${state}`);checks.push({state,animated:expected,elements:values[0].length});
   }
   await check('before entering',false);
   for(const [fraction,expected] of [[0.15,false],[0.25,true]]){
    await Promise.all(sections.map(s=>s.evaluate((section,{fraction,gridSelector})=>{const r=section.querySelector(gridSelector).parentElement.getBoundingClientRect();scrollTo({top:scrollY+r.top-innerHeight+r.height*fraction,behavior:'instant'});},{fraction,gridSelector})));
    await Promise.all(pages.map(p=>p.waitForTimeout(1100)));
    await check(`${fraction*100}% visible`,expected);
   }
   await Promise.all(pages.map(p=>p.evaluate(()=>scrollTo({top:0,behavior:'instant'}))));
   await Promise.all(pages.map(p=>p.waitForTimeout(400)));
   await check('stays revealed after leaving',true);
   const images=await Promise.all(sections.map(s=>s.locator('img').first().elementHandle()));
   await Promise.all(sections.map(s=>s.getByRole('button',{name:'1',exact:true}).click()));
   for(const image of images)assert.equal(await image.evaluate(node=>node.isConnected),true,'Clicking the selected page keeps its image');
   checks.push({state:'selected page preserves DOM',passed:true});
   await Promise.all(sections.map(s=>s.getByRole('button',{name:'2',exact:true}).click()));
   await Promise.all(pages.map(p=>p.waitForTimeout(1200)));
   await check('next page after reveal',true);
   results.push({route,width,pass:true,checks});console.log('PASS',width,route);
  }catch(error){results.push({route,width,pass:false,checks,error:error.message});console.log('FAIL',width,route,error.message);}
  finally{await Promise.all(contexts.map(c=>c.close()));}
 }
}finally{await browser.close();await writeFile('artifacts/native-pagination-reveal.json',JSON.stringify(results,null,2)+'\n');}
assert.equal(results.filter(r=>!r.pass).length,0);
