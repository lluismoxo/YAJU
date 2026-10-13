// Compare viewport and card pixels from the same paint, without clipped screenshots.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {resolve,extname,sep} from 'node:path';
const require=createRequire(import.meta.url);
const paths=[process.env.YAJU_BROWSER_MODULES||process.cwd()];
const {chromium}=require(require.resolve('playwright',{paths}));
const {PNG}=require(require.resolve('pngjs',{paths}));
const control=process.env.YAJU_REFERENCE_CONTROL==='1';
const reference=resolve('artifacts/reference-a1c700f/public');
const fixture=JSON.parse(await readFile('tests/fixtures/production-a1c700f.sha256.json','utf8'));
for(const [name,hash] of Object.entries(fixture.files))assert.equal(createHash('sha256').update(await readFile(resolve(reference,name))).digest('hex'),hash,`Modified reference: ${name}`);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.mp4':'video/mp4'};
async function serve(directory){
 const root=resolve(directory);
 const server=createServer(async(req,res)=>{
  try{
   let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
   assert.ok(file===root||file.startsWith(root+sep));
   if((await stat(file)).isDirectory())file=resolve(file,'index.html');
   const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
 });
 await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
 return {server,origin:`http://127.0.0.1:${server.address().port}`};
}
const output=`artifacts/pagination-same-paint${control?'-control':''}`;
await mkdir(output,{recursive:true});
const referenceServer=await serve(reference);
const candidateServer=await serve(control?reference:'artifacts/native-all').catch(error=>{referenceServer.server.close();throw error;});
const servers=[referenceServer,candidateServer];
const origins=servers.map(entry=>entry.origin);
const browser=await chromium.launch({channel:'chrome',headless:true}).catch(error=>{servers.forEach(entry=>entry.server.close());throw error;});
const report={control,browser:browser.version(),motion:'no-preference',generatedAt:new Date().toISOString(),complete:false,results:[]};
function differences(a,b,rect){
 assert.equal(a.width,b.width);assert.equal(a.height,b.height);
 const bounds=rect?{left:Math.max(0,Math.floor(rect.x)),top:Math.max(0,Math.floor(rect.y)),right:Math.min(a.width,Math.ceil(rect.x+rect.width)),bottom:Math.min(a.height,Math.ceil(rect.y+rect.height))}:{left:0,top:0,right:a.width,bottom:a.height};
 let changed=0;
 for(let y=bounds.top;y<bounds.bottom;y++)for(let x=bounds.left;x<bounds.right;x++){
  const i=(y*a.width+x)*4;if(a.data.subarray(i,i+4).some((v,j)=>v!==b.data[i+j]))changed++;
 }
 return {changedPixels:changed,bounds};
}
try{
 for(const width of (process.env.YAJU_TEST_WIDTHS||'1440,768,390').split(',').map(Number))for(const route of ['/ai-observability','/solutions/financial-services']){
  const contexts=await Promise.all(origins.map(()=>browser.newContext({viewport:{width,height:900},locale:'en-US',timezoneId:'Europe/Madrid',reducedMotion:'no-preference'})));
  try{
   const pages=await Promise.all(contexts.map(c=>c.newPage()));
   for(let i=0;i<pages.length;i++)await pages[i].route('**/*',r=>new URL(r.request().url()).origin===origins[i]?r.continue():r.abort());
   await Promise.all(pages.map(async(p,i)=>{const response=await p.goto(origins[i]+route);assert.equal(response.status(),200);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(3000);}));
   const sections=pages.map(p=>p.getByRole('button',{name:'1',exact:true}).first().locator('xpath=ancestor::section[1]'));
   const counts=await Promise.all(sections.map(s=>s.getByRole('button',{name:/^\d+$/}).count()));assert.equal(counts[0],counts[1]);
   for(let index=0;index<counts[0];index++){
    await Promise.all(sections.map(s=>s.getByRole('button',{name:String(index+1),exact:true}).click()));
    await Promise.all(pages.map(p=>p.mouse.move(0,0)));
    await Promise.all(pages.map(p=>p.waitForTimeout(1800)));
    const cards=sections.map(s=>s.locator('a[class~="group/calloutCard"]'));
    const content=await Promise.all(cards.map(c=>c.evaluateAll(nodes=>nodes.map(n=>({href:n.getAttribute('href'),text:n.textContent})))));assert.deepEqual(content[0],content[1]);
    for(let card=0;card<content[0].length;card++){
     await Promise.all(cards.map(c=>c.nth(card).scrollIntoViewIfNeeded()));
     await Promise.all(pages.map(p=>p.waitForTimeout(1500)));
     const boxes=await Promise.all(cards.map(c=>c.nth(card).boundingBox()));assert.deepEqual(boxes[0],boxes[1]);
     const media=await Promise.all(cards.map(c=>c.nth(card).locator('img').evaluateAll(images=>images.map(image=>({path:new URL(image.currentSrc).pathname,width:image.naturalWidth,height:image.naturalHeight})))));
     assert.deepEqual(media[0],media[1],'Card media and intrinsic dimensions');
     assert.ok(media[0].length&&media[0].every(image=>image.width>0&&image.height>0),'Card images must load');
     const shots=await Promise.all(pages.map(async(p,i)=>{
      await p.evaluate(async()=>{await Promise.all([...document.images].filter(img=>{const r=img.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;}).map(img=>img.decode().catch(()=>{})));});
      let previous=await p.screenshot({animations:'disabled'});
      for(let attempt=0;attempt<5;attempt++){
       await p.waitForTimeout(250);const next=await p.screenshot({animations:'disabled'});
       if(next.equals(previous)){await writeFile(`${output}/${width}-${route.replaceAll('/','_')}-${index+1}-${card+1}-${i}.png`,next);return PNG.sync.read(next);}previous=next;
      }
      throw new Error('Unstable paint');
     }));
     const result={width,route,page:index+1,card:card+1,viewport:differences(...shots),region:differences(...shots,boxes[0])};
     report.results.push(result);console.log(JSON.stringify(result));
    }
   }
  }finally{await Promise.all(contexts.map(c=>c.close()));}
 }
 report.complete=true;
}catch(error){report.error=error.message;throw error;}
finally{await browser.close();servers.forEach(entry=>entry.server.close());await writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');}
console.log(`Cards: ${report.results.length}; exact regions: ${report.results.filter(r=>r.region.changedPixels===0).length}`);
if(report.results.some(result=>result.viewport.changedPixels||result.region.changedPixels))process.exitCode=1;
