import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const report=[];
try {
 for(const width of [1440,390]) {
  for(const port of [4185,4184]) {
   const origin=`http://127.0.0.1:${port}`;
   const page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390});
   if(process.env.YAJU_GLOBE_STATIC==='1')await page.addInitScript(()=>{
    window.__globeControls=[];
    Object.defineProperty(Object.prototype,'autoRotate',{configurable:true,set(value){
      const record={control:this,requested:value};window.__globeControls.push(record);
      Object.defineProperty(this,'autoRotate',{configurable:true,get:()=>false,set:next=>{record.requested=next;}});
    }});
   });
   const errors=[], network=[];
   page.on('requestfailed',request=>network.push({url:request.url(),error:request.failure()?.errorText}));
   page.on('console',message=>{if(message.type()==='error')network.push({console:message.text()});});
   page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/*',route=>{const request=route.request();const url=new URL(request.url());if(url.hostname==='cdn.jsdelivr.net'&&url.pathname.startsWith('/npm/three-globe/example/img/'))return readFile('node_modules/three-globe/example/img/'+url.pathname.split('/').pop()).then(body=>route.fulfill({body,headers:{'access-control-allow-origin':'*','content-type':url.pathname.endsWith('.jpg')?'image/jpeg':'image/png'}}));return url.origin===origin||(['image','font'].includes(request.resourceType())&&request.method()==='GET')?route.continue():route.abort();});
   await page.goto(origin+'/labs/');
   await page.waitForTimeout(6500);
   const globe=page.locator('.globe-viz');
   await globe.scrollIntoViewIfNeeded();
   const state=await globe.evaluate(el=>({rect:{width:el.clientWidth,height:el.clientHeight},canvases:[...el.querySelectorAll('canvas')].map(c=>({width:c.width,height:c.height,opacity:c.style.opacity,engine:c.dataset.engine||null})),pixels:(()=>{const canvas=el.querySelector(':scope > canvas');if(!canvas)return 0;return canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.filter((n,i)=>i%4===3&&n>0).length;})()}));
   await writeFile(`artifacts/globe-canvas-${port}-${width}.png`,Buffer.from((await globe.locator(':scope > canvas').evaluate(c=>c.toDataURL())).split(',')[1],'base64'));
   await globe.screenshot({path:`artifacts/globe-${port}-${width}.png`});
   const controls=await page.evaluate(()=>window.__globeControls?.map(({control:c,requested})=>({requested,speed:c.autoRotateSpeed,damping:c.dampingFactor,zoom:c.enableZoom,rotate:c.enableRotate,camera:c.object?.position.toArray()}))||[]);
   const composition=await globe.evaluate(el=>{const result=[];for(let node=el;node&&node!==document.body;node=node.parentElement){const s=getComputedStyle(node),r=node.getBoundingClientRect();result.push({tag:node.tagName,className:node.className,rect:{x:r.x,y:r.y,width:r.width,height:r.height},background:s.background,transform:s.transform,padding:s.padding});}return result;});
   const mission=await globe.evaluate(el=>{const section=el.closest('section');return {html:section.querySelector('.z-20').outerHTML,rect:section.querySelector('.z-20').getBoundingClientRect().toJSON()};});
   report.push({port,width,state,errors,network,controls,composition,mission});
   if(port===4184){assert.equal(state.canvases.length,2);assert.ok(state.pixels>100,'ASCII globe must be visible');assert.deepEqual(errors,[]);await page.setViewportSize({width:900,height:700});await page.waitForTimeout(500);assert.equal(await globe.locator(':scope > canvas').evaluate(c=>c.width),500);
    await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide')));
    assert.equal(await globe.locator('canvas').count(),0,'Leaving the page must dispose both canvases');
    await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
    await page.waitForTimeout(2000);
    assert.equal(await globe.locator('canvas').count(),2,'History restoration must mount one globe');}
   await page.close();
  }
 }
 if(process.env.YAJU_GLOBE_STATIC==='1')for(const width of [1440,390]){
  const pair=report.filter(item=>item.width===width);
  assert.deepEqual(pair[1].controls,pair[0].controls,'Camera and interaction settings must match');
  assert.deepEqual(await readFile(`artifacts/globe-4184-${width}.png`),await readFile(`artifacts/globe-4185-${width}.png`),'The globe and surrounding gradient must match byte for byte');
  assert.deepEqual(await readFile(`artifacts/globe-canvas-4184-${width}.png`),await readFile(`artifacts/globe-canvas-4185-${width}.png`),'The static ASCII canvas must match byte for byte');
 }
}finally{await browser.close();await writeFile('artifacts/globe-controls.json',JSON.stringify(report,null,2)+'\n');}
console.log('PASS: Labs globe renders visible ASCII on desktop/touch and resizes without errors.');
