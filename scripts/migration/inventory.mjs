// One-time migration inventory of the immutable reference. Never runs in production.
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname,sep} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const base=resolve('artifacts/reference-a1c700f/public');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff'};
const server=createServer(async(req,res)=>{try{let p=resolve(base,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(p!==base&&!p.startsWith(base+sep))throw Error();if((await stat(p)).isDirectory())p=resolve(p,'index.html');res.writeHead(200,{'Content-Type':mime[extname(p)]||'application/octet-stream'});res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const entries=JSON.parse(await readFile('config/site-inputs.json','utf8'));
const routes=entries.filter(e=>e.source.endsWith('.html')&&e.source.startsWith('src/pages/')&&!e.output.startsWith('assets/forms/')).map(e=>'/'+e.output.replace(/index\.html$/,''));
if(process.argv[2]) routes.splice(0,routes.length,...process.argv[2].split(','));
const browser=await chromium.launch({channel:'chrome',headless:true});
await mkdir('artifacts/inventory',{recursive:true});
const results=[];let index=0;
try{await Promise.all(Array.from({length:3},async()=>{
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 while(index<routes.length){const route=routes[index++];const key=route==='/'?'home':route.replace(/^\//,'').replace(/\/$/,'').replaceAll('/','__');const page=await context.newPage();
 try{await page.goto(origin+route,{waitUntil:'load'});await page.waitForTimeout(3100);
 const inventory=await page.evaluate(()=>{
 const main=document.querySelector('main');
 return {title:document.title,mainLength:main?.innerHTML.length,mainText:main?.innerText.slice(0,150),
 buttons:[...main?.querySelectorAll('button')||[]].map(e=>({text:e.textContent.trim(),role:e.getAttribute('role'),aria:e.getAttribute('aria-expanded'),cls:e.className,html:e.outerHTML})),
 tabs:[...main?.querySelectorAll('[role="tab"]')||[]].length,
 forms:[...document.forms].map(e=>({id:e.id,action:e.action,html:e.outerHTML})),
 videos:[...main?.querySelectorAll('video')||[]].map(e=>({src:e.currentSrc,html:e.outerHTML})),
 inputs:[...main?.querySelectorAll('input,select')||[]].map(e=>e.outerHTML),
 nav:[...document.querySelectorAll('nav')].map(e=>({aria:e.getAttribute('aria-label'),cls:e.className})),
 scripts:[...document.scripts].filter(e=>e.src).map(e=>e.getAttribute('src'))};
 });
 const html=await page.content();await writeFile(`artifacts/inventory/${key}.html`,html);await writeFile(`artifacts/inventory/${key}.json`,JSON.stringify(inventory,null,2));
 results.push({route,key,title:inventory.title,mainLength:inventory.mainLength,buttons:inventory.buttons.map(b=>b.text),tabs:inventory.tabs,forms:inventory.forms.length,videos:inventory.videos.length,inputs:inventory.inputs.length,nav:inventory.nav});
 console.log(`${results.length}/${routes.length} ${route}: ${inventory.buttons.length} buttons, ${inventory.forms.length} forms`);
 }catch(e){results.push({route,key,error:e.message});console.error(route,e.message)}finally{await page.close()}
 }
 await context.close();
}));}finally{await browser.close();server.close();await writeFile(process.argv[2]?'artifacts/inventory/extra-routes.json':'artifacts/inventory/routes.json',JSON.stringify(results,null,2)+'\n')}
