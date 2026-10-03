import {readFile,writeFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const manifest=JSON.parse(await readFile('config/native-pages.json','utf8'));const browser=await chromium.launch({channel:'chrome',headless:true});
let next=0;const reports=[];
try{await Promise.all(Array.from({length:3},async()=>{
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await context.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4182'?r.continue():r.abort());
 while(next<manifest.length){const entry=manifest[next++];const content=JSON.parse(await readFile(entry.source,'utf8'));if(!content.buttons.length)continue;
 const mainPath=`src/content/pages/${content.key}.html`;const source=await readFile(mainPath,'utf8');if(!source.includes('border-none bg-transparent pb-9 text-left'))continue;
 const page=await context.newPage();try{
 await page.goto('http://127.0.0.1:4182'+content.route,{waitUntil:'load'});await page.waitForTimeout(3100);
 const groups=await page.evaluate(()=>{const lists=[...new Set([...document.querySelectorAll('main button')].filter(b=>b.classList.contains('pb-9')).map(b=>b.closest('ul')))];lists.forEach((list,index)=>list.dataset.migrationAccordion=index);return lists.map(list=>({count:list.querySelectorAll(':scope > li > div > button').length,multiple:!!list.querySelector('button i')}))});
 const accordions=[];
 for(let g=0;g<groups.length;g++){
  const list=page.locator(`[data-migration-accordion="${g}"]`);const states=[];
  for(let i=0;i<groups[g].count;i++){
   const button=list.locator(':scope > li > div > button').nth(i);await button.scrollIntoViewIfNeeded();await page.waitForTimeout(800);
   if(await button.evaluate(b=>parseFloat(b.nextElementSibling.style.height)===0))await button.click();
   await page.waitForTimeout(900);
   states.push(await button.evaluate(b=>({label:b.textContent.trim(),openClass:b.parentElement.className,media:b.closest('section').querySelector('img')?.parentElement.outerHTML||null})));
  }
  accordions.push({multiple:groups[g].multiple,states});
 }
 const updated=await page.evaluate(({source,accordions})=>{
  const d=new DOMParser().parseFromString(source,'text/html');const lists=[...new Set([...d.querySelectorAll('button')].filter(b=>b.classList.contains('pb-9')).map(b=>b.closest('ul')))];
  lists.forEach((list,g)=>{list.dataset.nativeAccordion=g;const buttons=list.querySelectorAll(':scope > li > div > button');buttons.forEach((button,i)=>{button.dataset.accordionItem=i;accordions[g].states[i].closedClass=button.parentElement.className;});const media=list.closest('section').querySelector('img')?.parentElement;if(media&&accordions[g].states.some(s=>s.media))media.dataset.accordionMedia=g;});
  return {html:d.body.innerHTML,accordions};
 },{source,accordions});
 content.interactions={...content.interactions,accordions:updated.accordions};await writeFile(mainPath,updated.html);await writeFile(entry.source,JSON.stringify(content,null,2)+'\n');reports.push({route:content.route,groups:groups.length,states:groups.reduce((n,g)=>n+g.count,0)});console.log(content.route,reports.at(-1).states);
 }finally{await page.close()}
 }
 await context.close();
}));}finally{await browser.close();await writeFile('artifacts/accordion-migration.json',JSON.stringify(reports,null,2)+'\n')}
