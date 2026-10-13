import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderAnalytics} from '../src/components/analytics.mjs';
test('only first-party consent code is initially rendered, with denied defaults',()=>{
 const html=renderAnalytics();
 assert.equal((html.match(/id="yaju-consent-controller"/g)||[]).length,1);
 assert.doesNotMatch(html,/<script\b[^>]*\bsrc=/);
 assert.doesNotMatch(html,/gtm\.js|GTM-5W6STPC/);
 assert.match(html,/analytics_storage:'denied'/);
 assert.match(html,/ad_storage:'denied'/);
 assert.match(html,/ga-disable-/);
});
test('every rendered full content page has one controller and no unconditional tracking tags',async()=>{
 const pages=JSON.parse(await readFile('config/native-pages.json','utf8'));
 for(const output of [...pages.map(p=>p.output),'legal/index.html']){
  const html=await readFile('public/'+output,'utf8');
  assert.equal((html.match(/id="yaju-consent-controller"/g)||[]).length,1,output);
  assert.doesNotMatch(html,/<script\b[^>]*src="[^"]*(?:googletagmanager|google-analytics|\/_vercel\/)/,output);
 }
});
test('search discovery lists only canonical indexable pages and advertises the sitemap',async()=>{
 const xml=await readFile('public/sitemap.xml','utf8');
 assert.ok((xml.match(/<loc>/g)||[]).length>=50);
 assert.match(xml,/<loc>https:\/\/yajuas.com\/<\/loc>/);
 assert.doesNotMatch(xml,/<loc>[^<]*\/register/);
 assert.match(await readFile('public/robots.txt','utf8'),/Sitemap: https:\/\/yajuas.com\/sitemap.xml/);
});
