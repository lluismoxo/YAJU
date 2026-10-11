import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const modules=process.env.YAJU_BROWSER_MODULES||process.cwd();
const {chromium}=require(require.resolve('playwright',{paths:[modules]}));
const {PNG}=require(require.resolve('pngjs',{paths:[modules]}));
const output='artifacts/native-buttons';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),report=[],cache=new Map(),screens=new Map(),surroundings=new Map();
try{
 for(const width of [390,1440])for(const index of [1,2])for(const port of [4185,4184]){
  const origin=`http://127.0.0.1:${port}`,page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());if(url.origin===origin)return route.continue();
   if(['image','font'].includes(req.resourceType())&&req.method()==='GET'){
    if(!cache.has(url.href))cache.set(url.href,(async()=>{const r=await route.fetch({timeout:15000});return{body:await r.body(),status:r.status(),contentType:r.headers()['content-type']};})().catch(()=>null));
    const resource=await cache.get(url.href);if(resource)return route.fulfill(resource);
   }
   return route.abort();
  });
  await page.goto(origin+'/');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(2500);
  const button=page.locator('.left-text-container').nth(index).locator('a.web3-primary-solid-btn').first();
  await button.scrollIntoViewIfNeeded();await page.waitForTimeout(800);
  const states=[];
  for(const state of ['idle','hover','pressed','released','leave','keyboard']){
   if(state==='hover')await button.hover();
   if(state==='pressed')await button.dispatchEvent('mousedown',{button:0,buttons:1});
   if(state==='released')await button.dispatchEvent('mouseup',{button:0,buttons:0});
   if(state==='leave')await page.mouse.move(0,0);
   if(state==='keyboard'){await page.keyboard.press('Tab');await button.focus();}
   await page.waitForTimeout(650);
   const style=await button.evaluate(el=>{const s=getComputedStyle(el),p=getComputedStyle(el,'::before');return{background:s.backgroundColor,color:s.color,glow:el.classList.contains('web3-primary-solid-btn-hover'),before:{opacity:p.opacity,transform:p.transform},focus:el.matches(':focus-visible'),boxShadow:s.boxShadow}});
   const buffer=await button.screenshot();screens.set(`${width}/${index}/${port}/${state}`,PNG.sync.read(buffer));
   await writeFile(`${output}/${width}-${index}-${port}-${state}.png`,buffer);
   const rect=await button.boundingBox();
   const clip={x:Math.max(0,Math.floor(rect.x)-24),y:Math.max(0,Math.floor(rect.y)-24),width:Math.ceil(rect.width)+48,height:Math.ceil(rect.height)+48};
   const surrounding=await page.screenshot({clip});
   surroundings.set(`${width}/${index}/${port}/${state}`,PNG.sync.read(surrounding));
   await writeFile(`${output}/${width}-${index}-${port}-${state}-glow.png`,surrounding);
   states.push({state,style});
  }
  if(port===4184){
   assert.deepEqual(errors,[]);
   await page.mouse.move(0,0);await button.evaluate(el=>el.setAttribute('aria-disabled','true'));await button.hover();
   assert.equal(await button.evaluate(el=>el.classList.contains('web3-primary-solid-btn-hover')),false);
   await button.evaluate(el=>el.removeAttribute('aria-disabled'));await page.mouse.move(0,0);await button.hover();
   await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
   assert.equal(await button.evaluate(el=>el.classList.contains('web3-primary-solid-btn-hover')),false);
  }
  report.push({width,index,port,states});console.log(`Checked ${width}px variant ${index} port ${port}`);await page.close();
 }
}finally{await browser.close();await writeFile(`${output}/controls.json`,JSON.stringify(report,null,2)+'\n');}
const comparisons=[];
for(const width of [390,1440])for(const index of [1,2]){
 const [a,b]=report.filter(r=>r.width===width&&r.index===index);
 for(let i=0;i<a.states.length;i++){
  const state=a.states[i].state,ref=screens.get(`${width}/${index}/4185/${state}`),next=screens.get(`${width}/${index}/4184/${state}`);
  let pixels=0;if(ref.width!==next.width||ref.height!==next.height)pixels=-1;else for(let n=0;n<ref.data.length;n+=4)if(ref.data.subarray(n,n+4).some((v,j)=>v!==next.data[n+j]))pixels++;
  const refGlow=surroundings.get(`${width}/${index}/4185/${state}`),nextGlow=surroundings.get(`${width}/${index}/4184/${state}`);
  let glowPixels=0;if(refGlow.width!==nextGlow.width||refGlow.height!==nextGlow.height)glowPixels=-1;else for(let n=0;n<refGlow.data.length;n+=4)if(refGlow.data.subarray(n,n+4).some((v,j)=>v!==nextGlow.data[n+j]))glowPixels++;
  comparisons.push({width,index,state,glowRegionPixels:glowPixels,stylesMatch:JSON.stringify(a.states[i].style)===JSON.stringify(b.states[i].style),differentPixels:pixels});
 }
}
await writeFile(`${output}/visual.json`,JSON.stringify(comparisons,null,2)+'\n');console.log(JSON.stringify(comparisons,null,2));
assert.ok(comparisons.every(r=>r.stylesMatch&&r.differentPixels===0&&r.glowRegionPixels===0),'Review native button differences');
