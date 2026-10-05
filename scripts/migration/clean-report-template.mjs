// Remove capture-time GSAP state once; retain semantic content, classes and media.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const file='src/content/pages/reports__state-of-sovereign-ai-adoption-2026.html';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();
 const html=await page.evaluate(source=>{
  const document=new DOMParser().parseFromString(source,'text/html');
  const desktop=document.querySelector('[data-component="idc-report-hero"]');
  const mobile=document.querySelector('[data-component="idc-report-hero-mobile"]');
  const spacer=desktop.querySelector(':scope > .pin-spacer');
  if(spacer){const stage=spacer.firstElementChild;stage.removeAttribute('style');spacer.replaceWith(stage);}
  for(const hero of [desktop,mobile]){
   hero.querySelectorAll('[data-idc-clip] .portable-text-breaks > *').forEach(text=>{
    text.querySelectorAll('span[aria-hidden="true"]').forEach(span=>span.replaceWith(...span.childNodes));text.removeAttribute('aria-label');
   });
   hero.querySelectorAll('[data-idc-grid], [data-idc-marks], [data-idc-plane], [data-slide1-image], [data-slide1-copy], [data-slide2-image], [data-slide2-copy], [data-idc-clip-inner], [data-idc-number], [data-idc-digit], [data-slide4-title]').forEach(el=>{
    for(const property of ['transform','translate','rotate','scale','opacity','visibility'])el.style.removeProperty(property);
    if(!el.style.length)el.removeAttribute('style');
   });
   hero.querySelector('[data-slide1-copy]').style.opacity='0';
  }
  desktop.querySelector('h1 .portable-text-breaks > *').innerHTML=mobile.querySelector('h1 .portable-text-breaks > *').innerHTML;
  desktop.querySelector('[data-slide1-zoom]').style.transform='scale(1.12)';
  desktop.querySelector('[data-idc-plane]').style.opacity='0';
  return document.body.innerHTML+'\n';
 },await readFile(file,'utf8'));
 await writeFile(file,html);
} finally {await browser.close();}
