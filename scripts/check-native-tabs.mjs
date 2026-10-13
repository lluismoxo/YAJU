import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const entries=[...JSON.parse(await readFile('artifacts/tab-migration.json','utf8')),...JSON.parse(await readFile('artifacts/tab-migration-versions.json','utf8'))].filter(e=>!process.argv[2]||e.route===process.argv[2]);
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try {
 for(const width of [1440,390])for(const {route} of entries){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4183'?r.continue():r.abort());
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4183'+route);await page.evaluate(()=>document.fonts.ready);
  const models=await page.evaluate(()=>JSON.parse(document.querySelector('#native-page-data').textContent).tabs);
  for(let group=0;group<models.length;group++){
   const section=page.locator(`[data-native-tabs="${group}"]`);
   for(let index=0;index<models[group].states.length;index++){
    if(width<768){await section.locator('[data-native-tab-toggle]:visible').click();await section.locator(`li[data-native-tab-item="${index}"]:visible`).click();}
    else await section.locator(`button[data-native-tab-item="${index}"]:visible`).click();
    const actual=await section.evaluate(el=>el.textContent.replace(/\s+/g,' ').trim());
    const expected=await page.evaluate(html=>{const el=document.createElement('div');el.innerHTML=html;return el.textContent.replace(/\s+/g,' ').trim();},models[group].states[index].html);
    assert.equal(actual,expected,`${route}: state ${index}`);
    assert.equal(await section.locator('[data-native-tab-toggle]').first().getAttribute('aria-expanded'),'false');
   }
   if(width>=768){const last=models[group].states.length-1;await section.locator(`button[data-native-tab-item="${last}"]:visible`).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.dataset.nativeTabItem),'0');}
  }
  assert.deepEqual(errors,[]);results.push({route,width,states:models.reduce((n,m)=>n+m.states.length,0),passed:true});console.log(route,width,'PASS');await context.close();
 }
}finally{await browser.close();await writeFile(process.argv[2]?'artifacts/native-tabs-versions-report.json':'artifacts/native-tabs-report.json',JSON.stringify(results,null,2)+'\n');}
