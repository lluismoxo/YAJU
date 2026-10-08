import {readFile} from 'node:fs/promises';
import {renderAnalytics} from './analytics.mjs';
const cache=new Map();
function source(path){if(!cache.has(path))cache.set(path,readFile(new URL(path,import.meta.url),'utf8'));return cache.get(path)}
export async function renderPage(page){
 for(const key of [page.key,page.header,page.footer])if(!/^[a-z0-9_-]+$/.test(key))throw new Error('Invalid template key');
 const [head,header,main,footer]=await Promise.all([source(`../content/pages/${page.key}.head.html`),source(`./fragments/${page.header}.html`),source(`../content/pages/${page.key}.html`),source(`./fragments/${page.footer}.html`)]);
 const search=main.includes('data-search-scope=')?`<template id="native-search-template">${await source('./fragments/search-modal.html')}</template>`:'';
 const esc=s=>String(s||'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 return `<!DOCTYPE html><html lang="${esc(page.lang)}" dir="${esc(page.dir)}" class="${esc(page.htmlClass)}"><head>${renderAnalytics()}${head}${page.forms?'<script src="/assets/forms/forms2.js" defer></script><script src="/assets/native-forms.js" defer></script>':''}<script src="/assets/native-navigation.js" defer></script><script src="/assets/native-page.js" defer></script>${page.key==='reports__state-of-sovereign-ai-adoption-2026'?'<script src="/assets/vendor/gsap.min.js" defer></script><script src="/assets/vendor/ScrollTrigger.min.js" defer></script><script src="/assets/vendor/SplitText.min.js" defer></script><script src="/assets/native-report.js" defer></script>':''}</head><body class="${esc(page.bodyClass)}"><div>${header}${main}<script type="application/json" id="native-page-data">${JSON.stringify(page.interactions||{}).replaceAll("<","\\u003c")}</script>${footer}</div>${search}${page.extra||''}<script defer src="/_vercel/insights/script.js"></script><script defer src="/_vercel/speed-insights/script.js"></script></body></html>`;
}
