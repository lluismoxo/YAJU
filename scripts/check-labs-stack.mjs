import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const mediaCache=new Map();
const {PNG}=require(require.resolve('pngjs',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const browser=await chromium.launch({channel:'chrome',headless:true});const report=[];
try{
 for(const width of [1440,768,390])for(const port of [4185,4184]){
  const page=await browser.newPage({viewport:{width,height:900}}),origin=`http://127.0.0.1:${port}`;
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.hostname==='cdn.jsdelivr.net'&&url.pathname.startsWith('/npm/three-globe/example/img/'))return readFile('node_modules/three-globe/example/img/'+url.pathname.split('/').pop()).then(body=>route.fulfill({body,headers:{'access-control-allow-origin':'*','content-type':url.pathname.endsWith('.jpg')?'image/jpeg':'image/png'}}));if(url.origin===origin)return route.continue();
   if(['image','font'].includes(req.resourceType())&&req.method()==='GET'){
    if(!mediaCache.has(url.href))mediaCache.set(url.href,(async()=>{const response=await route.fetch({timeout:15000});return {body:await response.body(),status:response.status(),contentType:response.headers()['content-type']};})().catch(()=>null));
    const resource=await mediaCache.get(url.href);if(resource)return route.fulfill(resource);
   }return route.abort();});
  await page.goto(origin+'/labs/');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(3000);
  const states=[];
  for(const y of [0,1600,1900,2200,2600,3000,3400]){
   await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(1000);
   const cards=await page.locator('.left-text-container').evaluateAll(texts=>texts.map(text=>{const card=text.parentElement,r=card.getBoundingClientRect(),t=text.getBoundingClientRect(),s=getComputedStyle(card);return {rect:[r.x,r.y,r.width,r.height],textRect:[t.x,t.y,t.width,t.height],transform:s.transform,position:s.position};}));
   states.push({y,cards});
   if(y===2200)await page.screenshot({path:`artifacts/labs-stack-${port}-${width}.png`});
  }
  const media=await page.locator('.left-text-container').evaluateAll(texts=>texts.map(text=>({buttons:[...text.querySelectorAll('a')].map(a=>a.outerHTML),images:[...text.parentElement.querySelectorAll('img')].map(img=>({src:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight,rect:img.getBoundingClientRect().toJSON()}))})));
  if(port===4184){assert.deepEqual(errors,[]);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(600);assert.equal(await page.locator('[data-native-stack] > .pin-spacer').count(),0);await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(600);assert.equal(await page.locator('[data-native-stack] > .pin-spacer').count(),3);}

  report.push({port,width,states,errors,media});await page.close();
 }
}finally{await browser.close();await writeFile('artifacts/labs-stack.json',JSON.stringify(report,null,2)+'\n');}
for(const width of [1440,768,390]){const [a,b]=report.filter(r=>r.width===width);assert.deepEqual(b.states,a.states,`Stack geometry at ${width}px`);const ref=PNG.sync.read(await readFile(`artifacts/labs-stack-4185-${width}.png`)),next=PNG.sync.read(await readFile(`artifacts/labs-stack-4184-${width}.png`));assert.equal(next.width,ref.width);assert.equal(next.height,ref.height);assert.deepEqual(next.data,ref.data,`Stack pixels at ${width}px`);}
console.log('PASS: 21 Labs stacking states and responsive pin cleanup match the original.');
