// Compare FAQ reveal timing and multiple-open behaviour with the frozen original.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
const cases=[['/labs/catalyst-grants','What types of projects do these grants support?'],['/pricing','What counts as an agent?']];
try{
 for(const width of [390,1440])for(const [route,label] of cases)for(const port of [4185,4184]){
  const origin=`http://127.0.0.1:${port}`,page=await browser.newPage({viewport:{width,height:900}});
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin+route);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(900);
  const first=page.locator('main button').filter({hasText:label}).first(),list=first.locator('xpath=ancestor::ul[1]');
  const states=[];
  const capture=async name=>{await page.waitForTimeout(1000);states.push({name,drawers:await list.locator(':scope > li > div > button').evaluateAll(buttons=>buttons.map(b=>({open:b.nextElementSibling.getBoundingClientRect().height>0,height:b.nextElementSibling.getBoundingClientRect().height})))})};
  // Jump directly to the tail: touching the column must not open its first drawer.
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await capture('jump-past');
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(500);
  for(const ratio of [0.15,0.5]){
   await list.evaluate((el,ratio)=>{const r=el.parentElement.getBoundingClientRect();scrollTo(0,scrollY+r.top-innerHeight+r.height*ratio)},ratio);
   await capture(`visible-${ratio}`);
  }
  const second=list.locator(':scope > li > div > button').nth(1);await second.click();await capture('open-second');
  await first.click();await capture('close-first');
  results.push({width,route,port,states});await page.close();console.log(width,route,port);
 }
}finally{await browser.close();await mkdir('artifacts/native-faq-reveal',{recursive:true});await writeFile('artifacts/native-faq-reveal/controls.json',JSON.stringify(results,null,2)+'\n')}
for(let i=0;i<results.length;i+=2){
 assert.deepEqual(results[i+1].states,results[i].states,`${results[i].route} ${results[i].width}: FAQ reveal differs`);
 const states=results[i+1].states;
 assert.equal(states[1].drawers[0].open,false);
 assert.equal(states[2].drawers[0].open,true);
 assert.equal(states[3].drawers[1].open,true);
 assert.equal(states[4].drawers[0].open,false);
}
console.log('PASS: FAQ reveal and multiple-open states match the original.');
