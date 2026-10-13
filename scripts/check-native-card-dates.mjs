import assert from 'node:assert/strict';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {annotateCardDates} from '../src/components/card-dates.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const origins=[process.env.YAJU_REFERENCE_ORIGIN||'http://127.0.0.1:4185',process.env.YAJU_TEST_ORIGIN||'http://127.0.0.1:4184'];
const routes=[];
for(const name of await readdir('src/content/pages')){
 if(!name.endsWith('.json'))continue;
 const html=await readFile('src/content/pages/'+name.replace('.json','.html'),'utf8');
 if(annotateCardDates(html).includes('data-native-card-date'))routes.push(JSON.parse(await readFile('src/content/pages/'+name,'utf8')).route);
}
const results=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const settings of [{locale:'en-US',timezoneId:'Europe/Madrid'},{locale:'es-ES',timezoneId:'Europe/Madrid'},{locale:'en-US',timezoneId:'America/Los_Angeles'}]){
  const contexts=await Promise.all(origins.map(()=>browser.newContext({...settings,viewport:{width:1440,height:900}})));
  for(let i=0;i<contexts.length;i++)await contexts[i].route('**/*',r=>new URL(r.request().url()).origin===origins[i]?r.continue():r.abort());
  for(const route of routes){
   const pages=await Promise.all(contexts.map(context=>context.newPage()));
   const states=[];
   try{
    await Promise.all(pages.map((page,i)=>page.goto(origins[i]+route,{waitUntil:'load'})));
    await Promise.all(pages.map(page=>page.waitForTimeout(3000)));
    async function compare(state){
     const values=await Promise.all(pages.map(page=>page.locator('main p.font-eyebrow').evaluateAll(nodes=>nodes.map(node=>node.textContent.trim()).filter(text=>/ - .+ \d{2}, \d{4}$/.test(text)))));
     assert.ok(values[0].length,`${route}: missing reference dates`);
     assert.deepEqual(values[1],values[0],`${route}: ${state} ${JSON.stringify(settings)}`);
     states.push({state,dates:values[1]});
    }
    await compare('initial');
    const count=await pages[1].locator('[data-native-page-item]').count();
    for(let i=0;i<count;i++){
     await Promise.all(pages.map(page=>page.getByRole('button',{name:String(i+1),exact:true}).first().click()));
     await Promise.all(pages.map(page=>page.waitForTimeout(500)));
     await compare(`page-${i+1}`);
    }
    results.push({route,...settings,pass:true,states});
    console.log('PASS',settings.locale,settings.timezoneId,route);
   }catch(error){results.push({route,...settings,pass:false,states,error:error.message});console.log('FAIL',route,error.message);}
   finally{await Promise.all(pages.map(page=>page.close()));}
  }
  await Promise.all(contexts.map(context=>context.close()));
 }
}finally{await browser.close();await writeFile('artifacts/native-card-dates-report.json',JSON.stringify({origins,results},null,2)+'\n');}
assert.equal(results.filter(result=>!result.pass).length,0);
