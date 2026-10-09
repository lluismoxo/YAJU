// Preserve the original campaign's distinct small-screen markup as a static fragment.
// Run only against the frozen reference; this importer is not part of the build.
import {writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const origin=process.env.YAJU_REFERENCE_ORIGIN||'http://127.0.0.1:4185';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 await page.goto(origin+'/ai-spend');
 await page.locator('.campaign-slideshow-mobile-root').waitFor();
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>!document.querySelector('.campaign-slideshow-mobile-root img[alt="Yaju"]'));
 await page.waitForTimeout(500);
 const html=await page.locator('.campaign-slideshow-mobile-root').evaluate(el=>{const copy=el.cloneNode(true);for(const parent of [copy,...copy.querySelectorAll('*')]){for(const node of [...parent.childNodes])if(node.nodeType===3&&node.previousSibling?.nodeType===3)parent.insertBefore(document.createComment(''),node);}return copy.outerHTML;});
 if(/<script\b/i.test(html))throw new Error('Unexpected script in campaign fragment');
 await writeFile('src/components/fragments/campaign-mobile.html',html.replace(/https?:\/\/(?:127\.0\.0\.1|localhost):\d+(?=\/)/g,'').replaceAll('/_yaju/','/_next/').replaceAll('-yaju-v5.css','.css')+'\n');
 console.log('Captured original reduced-motion campaign mobile markup.');
}finally{await browser.close()}
