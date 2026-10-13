import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {parse} from 'parse5';
import {languages,normal} from '../src/i18n/translate.mjs';
import {alternates,languagePath} from '../src/i18n/pages.mjs';
const pages=JSON.parse(await readFile('config/native-pages.json','utf8'));pages.push({output:'legal/index.html'});
const english=JSON.parse(await readFile('locales/en-US.json','utf8'));
let checked=0;
function nodes(html){const all=[];function walk(n){all.push(n);for(const c of n.childNodes||[])walk(c);if(n.content)walk(n.content)}walk(parse(html));return all;}
for(const language of languages){
 const dict=language.prefix?JSON.parse(await readFile(`locales/${language.code}.json`,'utf8')):english;
 for(const key of Object.keys(english))assert.ok(typeof dict[key]==='string'&&dict[key].trim(),`${language.code}: missing ${key.slice(0,50)}`);
 for(const p of pages){
  const file='public'+language.prefix+'/'+p.output,route='/'+p.output.replace(/index.html$/,'').replace(/\/$/,'');
  const html=await readFile(file,'utf8'),all=nodes(html);
  const elements=all.filter(n=>n.tagName).map(n=>({tag:n.tagName,attrs:Object.fromEntries(n.attrs.map(a=>[a.name,a.value])),node:n}));
  assert.equal(elements.find(n=>n.tag==='html').attrs.lang,language.code,file);
  const canonical=elements.filter(n=>n.tag==='link'&&n.attrs.rel==='canonical');assert.equal(canonical.length,1,file);assert.equal(canonical[0].attrs.href,'https://yajuas.com'+languagePath(route,language),file);
  const alternate=elements.filter(n=>n.tag==='link'&&n.attrs.hreflang);assert.equal(alternate.length,7,file);
  for(const link of alternates(route))assert.ok(alternate.some(n=>n.attrs.hreflang===link.lang&&n.attrs.href===link.href),file);
  assert.equal(elements.find(n=>n.attrs.property==='og:locale')?.attrs.content,language.og,file);
  const title=all.find(n=>n.tagName==='title')?.childNodes?.[0]?.value;
  assert.ok(title&&title.trim(),file);
  const meta=elements.find(n=>n.tag==='meta'&&n.attrs.name==='description');assert.ok(meta?.attrs.content,file);
  if(language.prefix){
   const original=nodes(await readFile('public/'+p.output,'utf8'));
   const oldTitle=original.find(n=>n.tagName==='title')?.childNodes?.[0]?.value;
   assert.equal(title,dict[normal(oldTitle)]||oldTitle,file);
   assert.equal(html.includes('YAJU_LANGUAGE_TRIGGER'),false,file);
  }
  for(const n of elements){
   if(n.tag==='a'&&n.attrs.href?.startsWith(language.prefix+'/')&&!n.attrs.href.startsWith('//')){
    const path=new URL(n.attrs.href,'https://yajuas.com').pathname;
    if(!/\.[a-z\d]+$/i.test(path)&&!path.includes('/blog/search')&&!path.includes('/newsroom/search')){
     // Check only known generated routes; pre-existing external product endpoints stay unchanged.
     if(pages.some(x=>'/'+x.output.replace(/index.html$/,'').replace(/\/$/,'')===path.replace(language.prefix,'').replace(/\/$/,'')||path===language.prefix+'/'))await access('public'+path.replace(/\/$/,'')+'/index.html');
    }
   }
   if(n.tag==='script'&&n.attrs.src?.startsWith('/'))await access('public'+n.attrs.src);
  }
  checked++;
 }
}
const xml=await readFile('public/sitemap.xml','utf8');assert.equal((xml.match(/<url>/g)||[]).length,360);assert.equal((xml.match(/<xhtml:link /g)||[]).length,360*7);
console.log(`PASS: ${checked} pages, six languages, reciprocal hreflang/canonicals/metadata, complete catalogs, 360 sitemap URLs.`);
