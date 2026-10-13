import {readFile,writeFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const entries=JSON.parse(await readFile('config/native-pages.json','utf8'));const browser=await chromium.launch({channel:'chrome',headless:true});const reports=[];
const selector='main button[role="tab"],main button.relative.z-10.whitespace-nowrap';
try{for(const entry of entries){if(process.argv[2]&&!entry.source.endsWith('/'+process.argv[2]+'.json'))continue;const content=JSON.parse(await readFile(entry.source,'utf8'));const source=await readFile(`src/content/pages/${content.key}.html`,'utf8');if(!source.includes('role="tab"')&&!source.includes('relative z-10 flex w-auto items-center justify-center whitespace-nowrap'))continue;
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await context.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4182'?r.continue():r.abort());const page=await context.newPage();await page.goto('http://127.0.0.1:4182'+content.route,{waitUntil:'load'});await page.waitForTimeout(3100);
 const groups=await page.evaluate(selector=>{
  const bars=[...new Set([...document.querySelectorAll(selector)].filter(button=>button.offsetWidth).map(button=>button.parentElement))];
  bars.forEach((bar,index)=>bar.dataset.migrationTabs=index);
  return bars.map(bar=>({labels:[...bar.querySelectorAll(':scope > button')].map(b=>b.textContent.trim())}));
 },selector);
 const tabs=[];
 for(let group=0;group<groups.length;group++){
  const states=[];
  for(let index=0;index<groups[group].labels.length;index++){
   // A tab can replace its content, but its selector bar remains mounted.
   const button=page.locator(`[data-migration-tabs="${group}"] > button`).nth(index);await button.scrollIntoViewIfNeeded();await button.click();await page.waitForTimeout(1000);
   const html=await button.evaluate((button,{group,index})=>{
    const section=button.closest('section');const clone=section.cloneNode(true);
    clone.querySelectorAll('button').forEach(b=>{if(b.getAttribute('role')==='tab'||b.classList.contains('whitespace-nowrap'))b.dataset.nativeTabItem=[...button.parentElement.querySelectorAll(':scope > button')].findIndex(x=>x.textContent.trim()===b.textContent.trim());});
    for(const mobile of [...clone.querySelectorAll('button')].filter(b=>!b.hasAttribute('data-native-tab-item') && b.querySelector('.icon-chevron-down'))){mobile.dataset.nativeTabToggle='';mobile.nextElementSibling?.querySelectorAll(':scope > li').forEach((li,i)=>li.dataset.nativeTabItem=i);}
    return clone.innerHTML;
   },{group,index});states.push({label:groups[group].labels[index],html});
  }
  tabs.push({states});
 }
 const updated=await page.evaluate(({source,tabs})=>{
  const d=new DOMParser().parseFromString(source,'text/html');const bars=[...new Set([...d.querySelectorAll('button[role="tab"],button.relative.z-10.whitespace-nowrap')].map(b=>b.parentElement))];
  [...new Set(bars.map(bar=>bar.closest('section')))].forEach((section,index)=>{section.dataset.nativeTabs=index;section.innerHTML=tabs[index].states[0].html;});return d.body.innerHTML;
 },{source,tabs});
 content.interactions={...content.interactions,tabs};await writeFile(`src/content/pages/${content.key}.html`,updated);await writeFile(entry.source,JSON.stringify(content,null,2)+'\n');reports.push({route:content.route,groups:tabs.length,states:tabs.reduce((n,t)=>n+t.states.length,0)});console.log(content.route,reports.at(-1).states);await context.close();
}}finally{await browser.close();await writeFile(process.argv[2]?'artifacts/tab-migration-'+process.argv[2]+'.json':'artifacts/tab-migration.json',JSON.stringify(reports,null,2)+'\n')}
