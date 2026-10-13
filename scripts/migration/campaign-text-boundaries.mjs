// Keep React's adjacent text-node boundaries in the static campaign template.
// They affect kerning even when outerHTML and computed styles are identical.
import {readFile,writeFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const origin=process.env.YAJU_REFERENCE_ORIGIN||'http://127.0.0.1:4185';const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await page.goto(origin+'/ai-spend');await page.waitForTimeout(3500);
 const groups=await page.locator('.campaign-slideshow').evaluate(root=>{
  const groups=[];const escape=value=>{const el=document.createElement('span');el.textContent=value;return el.innerHTML;};
  for(const parent of root.querySelectorAll('*')){let group=[];const flush=()=>{if(group.length>1)groups.push(group.map(escape));group=[];};for(const node of parent.childNodes){if(node.nodeType===3)group.push(node.nodeValue);else flush();}flush();}return groups;
 });
 const path='src/content/pages/ai-spend.html';let html=await readFile(path,'utf8'),changed=0;
 for(const group of groups){const before=group.join(''),after=group.join('<!---->');if(before.length<5)throw new Error('Ambiguous text boundary');if(html.includes(before)){html=html.replaceAll(before,after);changed++;}}
 await writeFile(path,html);console.log(`Preserved ${changed} original adjacent text groups.`);
}finally{await browser.close();}
