import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {parse} from 'parse5';
import {languages} from '../src/i18n/translate.mjs';
const pages=JSON.parse(await readFile('config/native-pages.json','utf8')).concat({output:'legal/index.html'});
const attrs=n=>Object.fromEntries((n.attrs||[]).map(a=>[a.name,a.value]));
const text=n=>n.value||(n.childNodes||[]).map(text).join('');
function nodes(s){let a=[];function w(n){a.push(n);for(const c of n.childNodes||[])w(c)}w(parse(s));return a;}
test('every localized page has consistent social metadata, reachable images and one organization',async()=>{
 const checkedImages=new Set();
 for(const l of languages)for(const p of pages){const file='public'+l.prefix+'/'+p.output,s=await readFile(file,'utf8'),all=nodes(s),meta=all.filter(n=>n.tagName==='meta').map(attrs);const get=k=>meta.filter(a=>a.name===k||a.property===k);const title=text(all.find(n=>n.tagName==='title'));
 for(const k of ['description','viewport','og:image','og:title','og:description','twitter:image','twitter:title','twitter:description'])assert.equal(get(k).length,1,`${file}: ${k}`);
 assert.equal(get('og:title')[0].content,title,file);assert.equal(get('twitter:title')[0].content,title,file);assert.equal(get('og:description')[0].content,get('description')[0].content,file);assert.equal(get('twitter:description')[0].content,get('description')[0].content,file);
 assert.ok(s.indexOf('<meta charset="utf-8">')<100,file);assert.ok(!get('viewport')[0].content.includes('maximum-scale'),file);
 const image=new URL(get('og:image')[0].content);assert.equal(image.origin,'https://yajuas.com',file);if(!checkedImages.has(image.pathname)){await access('public'+decodeURIComponent(image.pathname));checkedImages.add(image.pathname)}
 const schemas=all.filter(n=>n.tagName==='script'&&attrs(n).type==='application/ld+json').flatMap(n=>{const v=JSON.parse(text(n));return v['@graph']||[v]});const orgs=schemas.filter(v=>v['@type']==='Organization');assert.equal(orgs.length,1,file);assert.equal(orgs[0].areaServed,'Worldwide');assert.ok(!JSON.stringify(orgs).includes('San Francisco'));assert.equal(schemas.find(v=>v['@type']==='WebPage').inLanguage,l.code);
 }
});
test('thank-you pages remain crawlable but are not indexed or listed in sitemap',async()=>{const xml=await readFile('public/sitemap.xml','utf8');assert.ok(!xml.includes('/lp/thank-you'));for(const l of languages){const s=await readFile('public'+l.prefix+'/lp/thank-you/index.html','utf8');assert.match(s,/<meta name="robots" content="noindex, follow">/)}});
test('contact and catalyst landing pages have a primary heading without changing styling classes',async()=>{for(const route of ['get-started','labs/catalyst-grants']){const all=nodes(await readFile('public/'+route+'/index.html','utf8'));assert.equal(all.filter(n=>n.tagName==='h1').length,1,route)}});
