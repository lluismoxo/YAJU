import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const modules=process.env.YAJU_BROWSER_MODULES||process.cwd();
const {chromium}=require(require.resolve('playwright',{paths:[modules]}));
const {PNG}=require(require.resolve('pngjs',{paths:[modules]}));
const extended=process.env.YAJU_BUTTON_VARIANTS==='extended';
const cases=extended?[
 {route:'/',selector:'main a.rounded-full.border.border-neutral-15'},
 {route:'/solutions/healthcare-and-life-sciences',selector:'main a.rounded-full.border.border-pureWhite'},
 {route:'/agent-orchestration-system',selector:'main a.ease-button-gradient[href="/mcp-gateway"]'},
 {route:'/labs/catalyst-grants',selector:'main a.ease-button-gradient[href="/labs"]'}
]:[1,2].map(index=>({route:'/',selector:`.left-text-container >> nth=${index} >> a.web3-primary-solid-btn`}));
const referenceOnly=process.env.YAJU_COMPARE_REFERENCE==='1';
const widths=(process.env.YAJU_BUTTON_WIDTHS||'390,1440').split(',').map(Number);
const indices=process.env.YAJU_BUTTON_CASES?process.env.YAJU_BUTTON_CASES.split(',').map(Number):[...cases.keys()];
const output=process.env.YAJU_BUTTON_OUTPUT||(extended?'artifacts/native-buttons-extended':'artifacts/native-buttons');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),report=[],cache=new Map(),screens=new Map(),surroundings=new Map();
try{
 for(const width of widths)for(const index of indices)for(const port of [4185,4184]){
  const origin=`http://127.0.0.1:${referenceOnly?4185:port}`,page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());if(url.origin===origin)return route.continue();
   if(['image','font'].includes(req.resourceType())&&req.method()==='GET'){
    if(!cache.has(url.href))cache.set(url.href,(async()=>{const r=await route.fetch({timeout:15000});return{body:await r.body(),status:r.status(),contentType:r.headers()['content-type']};})().catch(()=>null));
    const resource=await cache.get(url.href);if(resource)return route.fulfill(resource);
   }
   return route.abort();
  });
  await page.goto(origin+cases[index].route);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(2500);
  const button=page.locator(cases[index].selector).first();
  await button.scrollIntoViewIfNeeded();await page.waitForTimeout(800);
  const states=[];
  if(process.env.YAJU_BUTTON_DIAGNOSTICS==='1'){
   const diagnostic=await button.evaluate(el=>{const items=[];for(let n=el;n;n=n.parentElement){const css=getComputedStyle(n);items.push({html:n===el?n.outerHTML:undefined,tag:n.tagName,classes:n.className,style:n.getAttribute('style'),rect:n.getBoundingClientRect().toJSON(),css:Object.fromEntries([...css].map(k=>[k,css.getPropertyValue(k)]))});}return items});
   await writeFile(`${output}/${width}-${index}-${port}-diagnostics.json`,JSON.stringify(diagnostic,null,2));
   const sections=await page.locator('main > *').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,classes:n.className,text:n.textContent.slice(0,140),rect:n.getBoundingClientRect().toJSON(),children:[...n.children].map(c=>({tag:c.tagName,classes:c.className,height:c.getBoundingClientRect().height}))})));
   await writeFile(`${output}/${width}-${index}-${port}-sections.json`,JSON.stringify(sections,null,2));
  }
  for(const state of ['idle','hover','pressed','released','leave','keyboard']){
   if(state==='hover')await button.hover();
   if(state==='pressed')await button.dispatchEvent('mousedown',{button:0,buttons:1});
   if(state==='released')await button.dispatchEvent('mouseup',{button:0,buttons:0});
   if(state==='leave')await page.mouse.move(0,0);
   if(state==='keyboard'){await page.keyboard.press('Tab');await button.focus();}
   await page.waitForTimeout(650);
   const style=await button.evaluate(el=>{const s=getComputedStyle(el),p=getComputedStyle(el,'::before');return{background:s.backgroundColor,backgroundImage:s.backgroundImage,color:s.color,glow:el.classList.contains('web3-primary-solid-btn-hover'),before:{opacity:p.opacity,transform:p.transform},focus:el.matches(':focus-visible'),boxShadow:s.boxShadow,outline:s.outline,outlineOffset:s.outlineOffset}});
   // Derive both regions from one viewport paint. Separate clipped screenshots can
   // rerasterize the same text/background differently, even in original/original runs.
   const rect=await button.boundingBox(),viewport=PNG.sync.read(await page.screenshot());
   function crop(padding){
    const x=Math.max(0,Math.floor(rect.x)-padding),y=Math.max(0,Math.floor(rect.y)-padding);
    const right=Math.min(viewport.width,Math.ceil(rect.x+rect.width)+padding);
    const bottom=Math.min(viewport.height,Math.ceil(rect.y+rect.height)+padding);
    const result=new PNG({width:right-x,height:bottom-y});
    PNG.bitblt(viewport,result,x,y,result.width,result.height,0,0);return result;
   }
   const buttonImage=crop(0),surrounding=crop(24);
   screens.set(`${width}/${index}/${port}/${state}`,buttonImage);
   surroundings.set(`${width}/${index}/${port}/${state}`,surrounding);
   await writeFile(`${output}/${width}-${index}-${port}-${state}.png`,PNG.sync.write(buttonImage));
   await writeFile(`${output}/${width}-${index}-${port}-${state}-glow.png`,PNG.sync.write(surrounding));
   states.push({state,style,geometry:await button.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scrollY}})});
  }
  if(port===4184&&!referenceOnly){
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
for(const width of widths)for(const index of indices){
 const [a,b]=report.filter(r=>r.width===width&&r.index===index);
 for(let i=0;i<a.states.length;i++){
  const state=a.states[i].state,ref=screens.get(`${width}/${index}/4185/${state}`),next=screens.get(`${width}/${index}/4184/${state}`);
  let pixels=0;if(ref.width!==next.width||ref.height!==next.height)pixels=-1;else for(let n=0;n<ref.data.length;n+=4)if(ref.data.subarray(n,n+4).some((v,j)=>v!==next.data[n+j]))pixels++;
  const refGlow=surroundings.get(`${width}/${index}/4185/${state}`),nextGlow=surroundings.get(`${width}/${index}/4184/${state}`);
  let glowPixels=0;if(refGlow.width!==nextGlow.width||refGlow.height!==nextGlow.height)glowPixels=-1;else for(let n=0;n<refGlow.data.length;n+=4)if(refGlow.data.subarray(n,n+4).some((v,j)=>v!==nextGlow.data[n+j]))glowPixels++;
  comparisons.push({width,index,state,geometryMatch:JSON.stringify(a.states[i].geometry)===JSON.stringify(b.states[i].geometry),glowRegionPixels:glowPixels,stylesMatch:JSON.stringify(a.states[i].style)===JSON.stringify(b.states[i].style),differentPixels:pixels});
 }
}
await writeFile(`${output}/visual.json`,JSON.stringify(comparisons,null,2)+'\n');console.log(JSON.stringify(comparisons,null,2));
assert.ok(comparisons.every(r=>r.geometryMatch&&r.stylesMatch&&r.differentPixels===0&&r.glowRegionPixels===0),'Review native button differences');
