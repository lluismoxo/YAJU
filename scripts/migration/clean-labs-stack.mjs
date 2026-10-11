// Strip only capture-time pinning from the three Labs featured-work cards.
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const file='src/content/pages/labs.html';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 const result=await page.evaluate(source=>{
  const doc=new DOMParser().parseFromString(source,'text/html');
  const texts=[...doc.querySelectorAll('.left-text-container')];
  const cards=texts.map(text=>text.parentElement);
  for(const card of cards){
   while(card.parentElement.classList.contains('pin-spacer'))card.parentElement.replaceWith(card);
   for(const property of ['transform','translate','rotate','scale','inset','margin','max-width','width','max-height','height','padding','box-sizing','position','top','left','right','bottom'])card.style.removeProperty(property);
   const text=card.querySelector('.left-text-container');
   for(const property of ['transform','translate','rotate','scale'])text.style.removeProperty(property);
   if(!text.style.length)text.removeAttribute('style');
  }
  const parents=new Set(cards.map(card=>card.parentElement));
  for(const parent of parents)parent.dataset.nativeStack='';
  return {html:doc.body.innerHTML+'\n',cards:cards.length,groups:parents.size};
 },await readFile(file,'utf8'));
 assert.equal(result.cards,3);assert.equal(result.groups,1);
 await writeFile(file,result.html);
}finally{await browser.close();}
