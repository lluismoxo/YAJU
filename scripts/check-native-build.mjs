// Validate the candidate independently: it is deliberately not the production build.
import assert from 'node:assert/strict';
import {readFile,access,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve('artifacts/native-all');
const entries=JSON.parse(await readFile('config/native-pages.json','utf8'));
const missing=[];let forms=0;
for(const entry of entries){
 const html=await readFile(resolve(root,entry.output),'utf8');
 assert.ok(html.includes('<main'),`Missing main: ${entry.output}`);
 assert.ok(/<title>[^<]+<\/title>/.test(html),`Missing title: ${entry.output}`);
 assert.equal(html.split("gtag('config', 'G-3T9YSET1R9')").length-1,1,`Analytics: ${entry.output}`);
 assert.ok(!html.includes('self.__next_f'),`RSC payload: ${entry.output}`);
 assert.ok(!/https?:\/\/(?:127\.0\.0\.1|localhost):\d+/.test(html),`Temporary development URL: ${entry.output}`);
 assert.ok(!/<script\b[^>]*src="[^\"]*(?:_yaju\/static|site-updates-)/.test(html),`Legacy runtime: ${entry.output}`);
 const model=JSON.parse(await readFile(entry.source,'utf8'));
 assert.equal(html.includes('/assets/native-report.js'),model.key==='reports__state-of-sovereign-ai-adoption-2026',`Report code loaded outside its route: ${entry.output}`);
 for(const vendor of ['gsap','ScrollTrigger','SplitText'])assert.equal(html.includes(`/assets/vendor/${vendor}.min.js`),model.key==='reports__state-of-sovereign-ai-adoption-2026'||(model.key==='ai-spend'&&vendor!=='SplitText'),`Animation vendor scope: ${entry.output}`);
 assert.equal(html.includes('/assets/native-dissolve-headline.js'),model.key==='ai-spend',`Headline effect scope: ${entry.output}`);
 assert.equal(html.includes('class="campaign-slideshow-mobile-root"'),model.key==='ai-spend',`Campaign mobile template scope: ${entry.output}`);
 assert.equal(html.includes('/assets/native-campaign.js'),model.key==='ai-spend',`Campaign animation scope: ${entry.output}`);
 forms+=model.forms;
 for(const fragment of html.matchAll(/<(?:script|link|img|source|video)\b[^>]*>/g)){
  const value=fragment[0].match(/\b(?:src|href)="([^\"]+)"/)?.[1];
  if(!value?.startsWith('/')||value.startsWith('//')||value.startsWith('/_vercel/'))continue;
  const path=new URL(value,'https://yajuas.com').pathname;
  try{await access(resolve(root,'.'+decodeURIComponent(path)));}catch{missing.push({page:entry.output,path});}
 }
}
await writeFile('artifacts/native-build-report.json',JSON.stringify({pages:entries.length,forms,missing},null,2)+'\n');
assert.deepEqual(missing,[]);console.log(`PASS: ${entries.length} native pages; titles, analytics, runtime isolation and local media/resources verified.`);
