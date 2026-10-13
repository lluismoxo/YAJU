import {readFile,writeFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const browser=await chromium.launch({channel:'chrome',headless:true});const reports=[];
try{for(const key of ['ai-observability','solutions__financial-services']){
 const file=`src/content/pages/${key}.json`,model=JSON.parse(await readFile(file,'utf8'));const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await context.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4182'?r.continue():r.abort());const page=await context.newPage();await page.goto('http://127.0.0.1:4182'+model.route);await page.waitForTimeout(3200);
 const buttons=page.locator('main button.mx-3');const count=await buttons.count();const states=[];
 for(let i=0;i<count;i++){
  await buttons.nth(i).scrollIntoViewIfNeeded();await buttons.nth(i).click();await page.waitForTimeout(1000);
  states.push(await buttons.nth(i).evaluate(button=>{
   const clone=button.closest('section').cloneNode(true);
   clone.querySelectorAll('button.mx-3').forEach((b,i)=>b.dataset.nativePageItem=i);
   for(const b of clone.querySelectorAll('button')){if(b.querySelector('.icon-arrow-left'))b.dataset.nativePageStep=-1;if(b.querySelector('.icon-arrow-right'))b.dataset.nativePageStep=1;}
   return {html:clone.innerHTML};
  }));
 }
 const source=await readFile(`src/content/pages/${key}.html`,'utf8');const updated=await page.evaluate(({source,states})=>{const d=new DOMParser().parseFromString(source,'text/html');const section=d.querySelector('button.mx-3').closest('section');section.dataset.nativePagination='0';section.innerHTML=states[0].html;return d.body.innerHTML;},{source,states});
 model.interactions={...model.interactions,pagination:[{states}]};await writeFile(file,JSON.stringify(model,null,2)+'\n');await writeFile(`src/content/pages/${key}.html`,updated);reports.push({route:model.route,states:states.length});console.log(model.route,states.length);await context.close();
}}finally{await browser.close();await writeFile('artifacts/pagination-migration.json',JSON.stringify(reports,null,2)+'\n')}
