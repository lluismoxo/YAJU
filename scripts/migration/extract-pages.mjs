// Import the reviewed rendered reference into editable templates. Not part of builds.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const routes=JSON.parse(await readFile('artifacts/inventory/routes.json','utf8')).filter(r=>!r.error);
routes.push(...JSON.parse(await readFile('artifacts/inventory/extra-routes.json','utf8')));
await mkdir('src/content/pages',{recursive:true});await mkdir('src/components/fragments',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();const manifest=[];const failures=[];
try{for(const route of routes){
 const html=await readFile(`artifacts/inventory/${route.key}.html`,'utf8');
 const parts=await page.evaluate(html=>{
  const d=new DOMParser().parseFromString(html,'text/html');const main=d.querySelector('main');const shell=[...d.body.children].find(e=>e.contains(main));
  if(!main||!shell)return {error:'No main shell'};
  d.querySelectorAll('script:not([type="application/ld+json"]),link[as="script"],next-route-announcer').forEach(e=>e.remove());
  const desktop=d.querySelector('nav.hidden');const mobile=d.querySelector('nav[aria-label="Mobile navigation"]');
  const standard=!!(desktop?.children[1] && mobile);
  const children=[...shell.children];
  const banner=children.find(e=>e.querySelector('[aria-label="Close banner"]'));if(banner)banner.dataset.siteBanner='';
  const overlay=children.find(e=>e.className.includes('backdrop-blur'));if(overlay)overlay.dataset.navOverlay='';
  if(standard){
  desktop.dataset.desktopNav='';desktop.children[0].dataset.navBar='';desktop.children[1].dataset.desktopPanel='';
  [...desktop.querySelector('ul').children].forEach((e,i)=>e.dataset.menuItem=String(i));
  [...desktop.children[1].firstElementChild.firstElementChild.children].forEach((e,i)=>e.dataset.desktopMenu=String(i));
  mobile.dataset.mobileNav='';const panel=children.find(e=>e.className.includes('group/navContent'));if(!panel)return {error:'No mobile panel'};
  panel.dataset.mobilePanel='';panel.firstElementChild.dataset.mobileRoot='';panel.firstElementChild.querySelectorAll('li > button').forEach((e,i)=>e.dataset.mobileMenuItem=String(i));
  [...panel.children].slice(1).forEach((e,i)=>e.dataset.mobileMenu=String(i));
  }
  const footer=d.querySelector('footer');footer?.querySelectorAll('button[aria-expanded]').forEach((e,i)=>e.dataset.footerAccordion=String(i));
  const mainWrapper=children.find(e=>e.contains(main));const mainIndex=children.indexOf(mainWrapper);
  const header=children.slice(0,mainIndex).map(e=>e.outerHTML).join('');
  const footerHTML=children.slice(mainIndex+1).map(e=>e.outerHTML).join('');
  return {head:d.head.innerHTML,header,footer:footerHTML,main:mainWrapper.outerHTML,bodyClass:d.body.className,htmlClass:d.documentElement.className,lang:d.documentElement.lang,dir:d.documentElement.dir,
    headerClass:desktop?.className||'',barClass:desktop?.children[0]?.className||'',mobileClass:mobile?.className||'',
    extra:[...d.body.children].filter(e=>e!==shell).map(e=>e.outerHTML).join('')};
 },html);
 if(parts.error){failures.push({route:route.route,error:parts.error});continue}
 function normalize(s){return s.replaceAll('/_yaju/','/_next/').replaceAll('-yaju-v5.css','.css')}
 const refs={};for(const name of ['header','footer']){const data=normalize(parts[name]);const hash=createHash('sha256').update(data).digest('hex').slice(0,12);refs[name]=`${name}-${hash}`;await writeFile(`src/components/fragments/${refs[name]}.html`,data)}
 await writeFile(`src/content/pages/${route.key}.html`,normalize(parts.main));await writeFile(`src/content/pages/${route.key}.head.html`,normalize(parts.head));
 const content={route:route.route.replace(/\/$/,'')||'/',title:route.title,key:route.key,...refs,bodyClass:parts.bodyClass,htmlClass:parts.htmlClass,lang:parts.lang,dir:parts.dir,extra:normalize(parts.extra),navigation:{desktop:parts.headerClass,bar:parts.barClass,mobile:parts.mobileClass},buttons:route.buttons,forms:route.forms};
 await writeFile(`src/content/pages/${route.key}.json`,JSON.stringify(content,null,2)+'\n');
 manifest.push({source:`src/content/pages/${route.key}.json`,output:route.route==='/'?'index.html':route.route.slice(1)+'index.html',render:'page'});
}
await writeFile('config/native-pages.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({pages:manifest.length,failures},null,2));
}finally{await browser.close()}
