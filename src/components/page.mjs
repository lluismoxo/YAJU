import {readFile} from 'node:fs/promises';
import {renderAnalytics} from './analytics.mjs';
import {annotateCardDates,annotateInteractionDates} from './card-dates.mjs';
const cache=new Map();
function source(path){if(!cache.has(path))cache.set(path,readFile(new URL(path,import.meta.url),'utf8'));return cache.get(path)}
export async function renderPage(page){
 for(const key of [page.key,page.header,page.footer])if(!/^[a-z0-9_-]+$/.test(key))throw new Error('Invalid template key');
 const [head,header,main,footer]=await Promise.all([source(`../content/pages/${page.key}.head.html`),source(`./fragments/${page.header}.html`),source(`../content/pages/${page.key}.html`),source(`./fragments/${page.footer}.html`)]);
 // The campaign uses separate original layouts, not a scaled desktop stage on phones.
 const campaign=page.key==='ai-spend';
 const stack=main.includes('data-native-stack');
 const labs=page.key==='labs', report=page.key==='reports__state-of-sovereign-ai-adoption-2026';
 const animations=(campaign||labs||report||stack)?'<script src="/assets/vendor/gsap.min.js" defer></script><script src="/assets/vendor/ScrollTrigger.min.js" defer></script>'+((labs||report)?'<script src="/assets/vendor/SplitText.min.js" defer></script>':''):'';
 const content=campaign?main.replace('</main>',`${await source('./fragments/campaign-mobile.html')}</main>`):main;
 const campaignLayout=campaign?'<style>.campaign-slideshow-desktop-root{display:none}.campaign-slideshow-mobile-root{display:block}@media (min-width:1025px),(min-width:768px) and (orientation:landscape) and (min-height:600px){.campaign-slideshow-desktop-root{display:block}.campaign-slideshow-mobile-root{display:none}}</style>':'';
 const search=main.includes('data-search-scope=')?`<template id="native-search-template">${await source('./fragments/search-modal.html')}</template>`:'';
 const esc=s=>String(s||'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 return `<!DOCTYPE html><html lang="${esc(page.lang)}" dir="${esc(page.dir)}" class="${esc(page.htmlClass)}"><head>${renderAnalytics()}${head}${campaignLayout}${animations}${stack?'<script src="/assets/native-stack.js" defer></script>':''}${page.key==='labs'?'<script src="/assets/native-labs.js" defer></script><script src="/assets/native-globe.js" defer></script>':''}${page.forms?'<script src="/assets/forms/forms2.js" defer></script><script src="/assets/native-forms.js" defer></script>':''}<script src="/assets/native-navigation.js" defer></script><script src="/assets/native-page.js" defer></script>${main.includes('dissolve-headline__canvas')?'<script src="/assets/native-dissolve-headline.js" defer></script>':''}${campaign?'<script src="/assets/native-campaign.js" defer></script>':''}${page.key==='reports__state-of-sovereign-ai-adoption-2026'?'<script src="/assets/native-report.js" defer></script>':''}</head><body class="${esc(page.bodyClass)}"><div>${header}${annotateCardDates(content)}<script type="application/json" id="native-page-data">${JSON.stringify(annotateInteractionDates(page.interactions||{})).replaceAll("<","\\u003c")}</script>${footer}</div>${search}${page.extra||''}</body></html>`;
}
