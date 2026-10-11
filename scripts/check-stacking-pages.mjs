import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const mediaCache=new Map();
const output=process.env.YAJU_STACK_OUTPUT||'artifacts';await mkdir(output,{recursive:true});
const widths=process.env.YAJU_STACK_WIDTHS?process.env.YAJU_STACK_WIDTHS.split(',').map(Number):[1440,768,390];
const {PNG}=require(require.resolve('pngjs',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const browser=await chromium.launch({channel:'chrome',headless:true});const report=[],bases=new Map();
const routes=process.argv.slice(2);if(!routes.length)routes.push('/','/about','/labs/agentic-task-ecosystem');
try{
 for(const route of routes)for(const width of widths)for(const port of [4185,4184]){
  const page=await browser.newPage({viewport:{width,height:900}}),origin=`http://127.0.0.1:${port===4184&&process.env.YAJU_COMPARE_REFERENCE==='1'?4185:port}`,key=route.replaceAll('/','_')||'home';
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.hostname==='cdn.jsdelivr.net'&&url.pathname.startsWith('/npm/three-globe/example/img/'))return readFile('node_modules/three-globe/example/img/'+url.pathname.split('/').pop()).then(body=>route.fulfill({body,headers:{'access-control-allow-origin':'*','content-type':url.pathname.endsWith('.jpg')?'image/jpeg':'image/png'}}));if(url.origin===origin)return route.continue();
   if(['image','font'].includes(req.resourceType())&&req.method()==='GET'){
    if(!mediaCache.has(url.href))mediaCache.set(url.href,(async()=>{const response=await route.fetch({timeout:15000});return {body:await response.body(),status:response.status(),contentType:response.headers()['content-type']};})().catch(()=>null));
    const resource=await mediaCache.get(url.href);if(resource)return route.fulfill(resource);
   }return route.abort();});
  await page.goto(origin+route);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(3000);
  const count=await page.locator('.left-text-container').count();
  if(port===4185)bases.set(`${route}/${width}`,Math.round(await page.locator('.left-text-container').first().evaluate(el=>el.parentElement.getBoundingClientRect().top+scrollY)));
  const base=bases.get(`${route}/${width}`),states=[];let diagnostics;
  for(const y of [0,Math.max(0,base-300),base,base+300,base+600,base+1000,base+1600]){
   await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(1000);
   const cards=await page.locator('.left-text-container').evaluateAll(texts=>texts.map(text=>{const card=text.parentElement,r=card.getBoundingClientRect(),t=text.getBoundingClientRect(),s=getComputedStyle(card);return {rect:[r.x,r.y,r.width,r.height],textRect:[t.x,t.y,t.width,t.height],transform:s.transform,position:s.position};}));
   states.push({y,cards});
   if(y===base+600){diagnostics=await page.locator('.left-text-container').evaluateAll(texts=>texts.map(text=>[text,...text.querySelectorAll('a, a span')].map(el=>({tag:el.tagName,classes:el.className,inline:el.style.cssText,ancestors:(()=>{const result=[];for(let p=el.parentElement;p&&p.tagName!=='BODY';p=p.parentElement)result.push({tag:p.tagName,classes:p.className,style:p.style.cssText});return result;})(),rect:el.getBoundingClientRect().toJSON(),css:Object.fromEntries(['font-family','font-size','font-weight','line-height','letter-spacing','color','background-color','border-radius','border-width','padding','transform','filter','opacity','will-change','position','z-index'].map(key=>[key,getComputedStyle(el).getPropertyValue(key)]))}))));await page.screenshot({path:`${output}/stack-${key}-${port}-${width}.png`});}
  }
  const media=await page.locator('.left-text-container').evaluateAll(texts=>texts.map(text=>({buttons:[...text.querySelectorAll('a')].map(a=>a.outerHTML),images:[...text.parentElement.querySelectorAll('img')].map(img=>({src:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight,rect:img.getBoundingClientRect().toJSON()}))})));
  if(port===4184&&process.env.YAJU_COMPARE_REFERENCE!=='1'){assert.deepEqual(errors,[]);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(600);assert.equal(await page.locator('[data-native-stack] > .pin-spacer').count(),0);await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(600);assert.equal(await page.locator('[data-native-stack] > .pin-spacer').count(),count);
   await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
   assert.equal(await page.locator('[data-native-stack] > .pin-spacer').count(),0);
   await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
   await page.waitForTimeout(600);
   assert.equal(await page.locator('[data-native-stack] > .pin-spacer').count(),count);
   assert.equal(await page.locator('[data-native-stack] .left-text-container').count(),count);
  }

  report.push({route,port,width,base,states,errors,media,diagnostics});console.log(`Checked ${route} ${width}px ${port}`);await page.close();
 }
}finally{await browser.close();await writeFile(`${output}/stacking-pages.json`,JSON.stringify(report,null,2)+'\n');}
const differences=[];
for(const route of routes)for(const width of widths){
 const [a,b]=report.filter(r=>r.route===route&&r.width===width),key=route.replaceAll('/','_')||'home';
 const geometry=a.states.map((state,index)=>({scroll:state.y,equal:JSON.stringify(state)===JSON.stringify(b.states[index])}));
 const ref=PNG.sync.read(await readFile(`${output}/stack-${key}-4185-${width}.png`)),next=PNG.sync.read(await readFile(`${output}/stack-${key}-4184-${width}.png`));
 let pixels=0;for(let i=0;i<ref.data.length;i+=4)if(ref.data.subarray(i,i+4).some((v,j)=>v!==next.data[i+j]))pixels++;
 differences.push({route,width,geometry,differentPixels:pixels});
}
await writeFile(`${output}/stacking-pages-summary.json`,JSON.stringify(differences,null,2)+'\n');
console.log(JSON.stringify(differences.map(({route,width,geometry,differentPixels})=>({route,width,matchingStates:geometry.filter(x=>x.equal).length,total:geometry.length,differentPixels})),null,2));
assert.ok(differences.every(result=>result.differentPixels===0&&result.geometry.every(state=>state.equal)),'Review stacking-pages-summary.json for remaining differences');
