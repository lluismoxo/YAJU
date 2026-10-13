import {secureHtml} from '../components/security.mjs';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {languages,createTranslator} from './translate.mjs';
import {localizedPage,alternates,languagePath} from './pages.mjs';
export async function buildLanguages(staging,root,inputs){
 const pages=JSON.parse(await readFile(resolve(root,'config/native-pages.json'),'utf8'));
 pages.push({output:'legal/index.html'});
 const routeFor=p=>'/'+p.output.replace(/index.html$/,'').replace(/\/$/,'');
 const routes=new Set(inputs.filter(p=>p.output.endsWith('/index.html')||p.output==='index.html').map(routeFor));
 const assets=['native-navigation.js','native-page.js','native-forms.js','native-stack.js','native-labs.js','native-campaign.js','native-report.js','native-dissolve-headline.js','forms/forms2.js'].map(s=>'/assets/'+s);
 const scripts=new Set(assets);
 const sources=new Map(await Promise.all(pages.map(async p=>[p.output,await readFile(resolve(staging,p.output),'utf8')])));
 const resources=new Map(await Promise.all(assets.map(async p=>[p,await readFile(resolve(staging,'.'+p),'utf8')])));
 const forms=(await readdir(resolve(staging,'assets/forms'))).filter(s=>s.endsWith('.html'));
 const sitemap=[];
 async function emit(path,content){await mkdir(dirname(path),{recursive:true});await writeFile(path,content)}
 for(const language of languages){
  const dictionary=language.prefix?JSON.parse(await readFile(resolve(root,`locales/${language.code}.json`),'utf8')):{};
  const tr=createTranslator({language,dictionary,routes,scripts});
  for(const page of pages){
   const route=routeFor(page),source=sources.get(page.output);
   const html=secureHtml(localizedPage(source,route,language,dictionary,routes,scripts));
   await emit(resolve(staging,'.'+language.prefix+'/'+page.output),html);
   if(!/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(source))sitemap.push('<url><loc>https://yajuas.com'+languagePath(route,language)+'</loc>'+alternates(route).map(a=>`<xhtml:link rel="alternate" hreflang="${a.lang}" href="${a.href}" />`).join('')+'</url>');
  }
  if(language.prefix){
   for(const [path,source] of resources){let js=tr.js(source);if(path.endsWith('/forms2.js'))js=js.replace('fetch(BASE + id','fetch('+JSON.stringify(language.prefix)+' + BASE + id');await emit(resolve(staging,'.'+language.prefix+path),js);}
   for(const form of forms)await emit(resolve(staging,'.'+language.prefix+'/assets/forms/'+form),tr.html(await readFile(resolve(staging,'assets/forms/'+form),'utf8'),true));
   for(const entry of inputs.filter(p=>p.render==='redirect')){
    const {renderRedirect}=await import('../components/redirect.mjs');
    const data=JSON.parse(await readFile(resolve(root,entry.source),'utf8'));
    let html=renderRedirect({...data,destination:tr.url(data.destination)},{legacy:false});
    html=html.replace('lang="en"',`lang="${language.code}"`);
    await emit(resolve(staging,'.'+language.prefix+'/'+entry.output),html);
   }
  }
 }
 await emit(resolve(staging,'assets/native-language.js'),await readFile(resolve(root,'src/client/language.js'),'utf8'));
 await emit(resolve(staging,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'+sitemap.join('')+'</urlset>\n');
 await emit(resolve(staging,'robots.txt'),'User-agent: *\nAllow: /\n\nSitemap: https://yajuas.com/sitemap.xml\n');
 console.log(`Localized ${pages.length} content pages in ${languages.length} languages; ${sitemap.length} indexable URLs.`);
}
