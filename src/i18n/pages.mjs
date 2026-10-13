import {parse} from 'parse5';
import {languages,createTranslator} from './translate.mjs';
const origin='https://yajuas.com';
export const languagePath=(route,language)=>language.prefix+(route==='/'?'/':route.replace(/\/$/,''));
export function alternates(route){return languages.map(l=>({lang:l.code,href:origin+languagePath(route,l)})).concat({lang:'x-default',href:origin+languagePath(route,languages[0])});}
export function decorate(source,route,language){
 const tree=parse(source,{sourceCodeLocationInfo:true}),changes=[];let count=0;
 function text(n){return n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('')}
 function walk(n){
  if(n.tagName==='button'&&text(n).trim()==='English'){
   const siblings=n.parentNode.childNodes,options=siblings[siblings.indexOf(n)+1];
   if(options?.tagName==='ul'){
    const id=`yaju-language-${++count}`,loc=n.sourceCodeLocation;
    const button=source.slice(loc.startOffset,loc.endOffset).replace(/<button\b/,'<button data-language-trigger aria-haspopup="true" aria-expanded="false" aria-controls="'+id+'"').replace('English',language.name);
    changes.push({start:loc.startOffset,end:loc.endOffset,text:button});
    const ul=options.sourceCodeLocation;
    const start=source.slice(ul.startTag.startOffset,ul.startTag.endOffset).replace('<ul','<ul id="'+id+'" data-language-options aria-hidden="true"');
    const links=languages.map(l=>`<li><a style="display:block;padding:8px 12px;border-radius:6px;${l.code===language.code?'background:rgba(128,128,128,.18);':''}" tabindex="-1" href="${languagePath(route,l)}" lang="${l.code}" hreflang="${l.code}"${l.code===language.code?' aria-current="true"':''}>${l.name}</a></li>`).join('');
    changes.push({start:ul.startOffset,end:ul.endOffset,text:start+links+'</ul>'});
   }
  }
  for(const c of n.childNodes||[])walk(c);
 }
 walk(tree);
 for(const c of changes.sort((a,b)=>b.start-a.start))source=source.slice(0,c.start)+c.text+source.slice(c.end);
 if(!count)source=source.replace('</body>',`<nav aria-label="Language" style="padding:16px;text-align:right;font-size:14px">${languages.map(l=>`<a style="margin:0 6px" href="${languagePath(route,l)}" lang="${l.code}" hreflang="${l.code}">${l.name}</a>`).join('')}</nav></body>`);
 source=source.replace(/<html\b([^>]*)\blang="[^"]*"/,'<html$1lang="'+language.code+'"');
 source=source.replace(/<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>/g,'').replace(/<meta\b[^>]*property="og:(?:locale(?::alternate)?|url)"[^>]*>/g,'');
 const seo=`<link rel="canonical" href="${origin+languagePath(route,language)}">`+alternates(route).map(a=>`<link rel="alternate" hreflang="${a.lang}" href="${a.href}">`).join('')+`<meta property="og:url" content="${origin+languagePath(route,language)}"><meta property="og:locale" content="${language.og}">`+languages.filter(l=>l!==language).map(l=>`<meta property="og:locale:alternate" content="${l.og}">`).join('');
 return source.replace('</head>',seo+'<script src="/assets/native-language.js" defer></script>'+(language.prefix?'<style>html[lang="ja"],html[lang="ko"]{word-break:normal;overflow-wrap:anywhere}html[lang="de"] main,html[lang="fr"] main{overflow-wrap:anywhere}</style>':'')+'</head>');
}
export function localizedPage(source,route,language,dictionary,routes,scripts){
 // Add the language selector after translating, retaining native language names.
 // Temporarily protect its existing English label so it can be located reliably.
 const marker='YAJU_LANGUAGE_TRIGGER';
 const prepared=source.replaceAll('>English<','>'+marker+'<');
 const tr=createTranslator({language,dictionary:{...dictionary,[marker]:marker},routes,scripts});
 let html=language.prefix?tr.html(prepared):prepared;
 html=html.replaceAll(marker,'English');
 return decorate(html,route,language);
}
