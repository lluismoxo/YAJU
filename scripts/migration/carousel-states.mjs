import {readFile,writeFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const entries=JSON.parse(await readFile('config/native-pages.json','utf8'));const browser=await chromium.launch({channel:'chrome',headless:true});const reports=[];
try{for(const entry of entries){const content=JSON.parse(await readFile(entry.source,'utf8'));const source=await readFile(`src/content/pages/${content.key}.html`,'utf8');if(!source.includes('aria-label="Next"'))continue;
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await context.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4182'?r.continue():r.abort());const page=await context.newPage();await page.goto('http://127.0.0.1:4182'+content.route);await page.waitForTimeout(3200);
const count=await page.locator('main button[aria-label="Next"]').count();const models=[];
for(let group=0;group<count;group++){
 const next=page.locator('main button[aria-label="Next"]').nth(group);await next.scrollIntoViewIfNeeded();await page.waitForTimeout(1600);const states=[];
 for(let step=0;step<30;step++){
  const state=await next.evaluate(b=>({html:b.closest('section').innerHTML,disabled:b.disabled}));states.push(state);
  if(state.disabled)break;
  await next.click();await page.waitForTimeout(1600);
  if(step===29)throw new Error('Unbounded carousel '+content.route);
 }
 models.push({states});
}
const updated=await page.evaluate(({source,models})=>{const d=new DOMParser().parseFromString(source,'text/html');[...d.querySelectorAll('button[aria-label="Next"]')].forEach((b,i)=>{const section=b.closest('section');section.dataset.nativeCarousel=i;section.innerHTML=models[i].states[0].html;});return d.body.innerHTML;},{source,models});
content.interactions={...content.interactions,carousels:models};await writeFile(`src/content/pages/${content.key}.html`,updated);await writeFile(entry.source,JSON.stringify(content,null,2)+'\n');reports.push({route:content.route,groups:models.length,states:models.reduce((n,m)=>n+m.states.length,0)});console.log(content.route,reports.at(-1).states);await context.close();
}}finally{await browser.close();await writeFile('artifacts/carousel-migration.json',JSON.stringify(reports,null,2)+'\n');}
