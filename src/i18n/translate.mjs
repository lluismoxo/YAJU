import {parse,parseFragment} from 'parse5';
import {parse as parseJS} from 'acorn';
export const languages=[{code:'en-US',name:'English',prefix:'',og:'en_US'},{code:'de',name:'Deutsch',prefix:'/de',og:'de_DE'},{code:'fr',name:'Français',prefix:'/fr',og:'fr_FR'},{code:'es',name:'Español',prefix:'/es',og:'es_ES'},{code:'ja',name:'日本語',prefix:'/ja',og:'ja_JP'},{code:'ko',name:'한국어',prefix:'/ko',og:'ko_KR'}];
export const normal=s=>s.replace(/\s+/g,' ').trim();
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const uiWords=new Set(['Back','Next','Previous','Search','Close','Submit','Required','English','Navigation','Copied!','Sending…']);
export function human(s){return /[a-zA-Z]/.test(s)&&!/^\s*(https?:|\/|#|[\w.+-]+@)/.test(s)&&!/^\s*[\d\W]+$/.test(s);}
function jsHuman(s){return uiWords.has(s)||(/^[A-Z][a-z]/.test(s)&&/\s/.test(s)&&!/[{}\[\]<>]|\b(?:function|return|var|const)\b/.test(s)&&!/^\w+[=:]/.test(s));}
function edit(source,changes){for(const {start,end,text} of changes.sort((a,b)=>b.start-a.start)){source=source.slice(0,start)+text+source.slice(end);}return source;}
export function createTranslator({dictionary={},collect,language=languages[0],routes=new Set(),scripts=new Set()}={}){
 const t=s=>{const key=normal(s);if(!key||!human(key))return s;collect?.add(key);const value=dictionary[key];if(language.prefix&&!collect&&!value)throw Error(`Missing ${language.code} translation: ${key.slice(0,100)}`);return value?s.replace(s.trim(),value):s;};
 const url=value=>{if(!language.prefix||/^[#?]/.test(value))return value;let u;try{u=new URL(value,'https://yajuas.com')}catch{return value}if(u.origin!=='https://yajuas.com'||!routes.has(u.pathname.replace(/\/$/,'')||'/'))return value;return language.prefix+(u.pathname==='/'?'/':u.pathname)+u.search+u.hash;};
 function data(value,key=''){
  if(Array.isArray(value))return value.map(v=>data(v,key));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,data(v,k)]));
  if(typeof value!=='string')return value;
  if(['html','media'].includes(key))return html(value,true);
  if(['label','title','description','headline','name','text'].includes(key))return t(value);
  if(['url','href','item'].includes(key))return url(value);
  return value;
 }
 function js(source){
  let tree;try{tree=parseJS(source,{ecmaVersion:'latest',sourceType:'script'})}catch{return source}
  const changes=[];
  function walk(node){
   if(node.type==='Literal'&&typeof node.value==='string'){
    let value=node.value;
    if(/<[a-z][a-z0-9-]*[\s>]/i.test(value))value=html(value,true);
    else if(jsHuman(value))value=t(value);
    // Keep accessibility selectors in sync with translated attributes.
    else value=value.replace(/(aria-label=["'])([^"']+)(["'])/g,(_,a,b,c)=>a+t(b)+c);
    if(value!==node.value)changes.push({start:node.start,end:node.end,text:JSON.stringify(value)});
    return;
   }
   if(node.type==='TemplateLiteral'&&node.expressions.length===0&&/<[a-z][a-z0-9-]*[\s>]/i.test(node.quasis[0].value.cooked||'')){
    const value=html(node.quasis[0].value.cooked,true);if(value!==node.quasis[0].value.cooked)changes.push({start:node.start,end:node.end,text:JSON.stringify(value)});return;
   }
   for(const [key,v] of Object.entries(node)){if(['start','end','loc'].includes(key))continue;if(Array.isArray(v))v.forEach(x=>{if(x?.type)walk(x)});else if(v?.type)walk(v);}
  }
  walk(tree);return edit(source,changes);
 }
 function html(source,fragment=false){
  const tree=(fragment?parseFragment:parse)(source,{sourceCodeLocationInfo:true});const changes=[];
  function walk(node,parent){
   const loc=node.sourceCodeLocation;
   if(node.nodeName==='#text'&&loc&& !['script','style','code','pre','svg'].includes(parent?.tagName)){
    const value=t(node.value);if(value!==node.value)changes.push({start:loc.startOffset,end:loc.endOffset,text:escape(value)});return;
   }
   if(node.tagName==='script'){
    const text=node.childNodes?.[0],l=text?.sourceCodeLocation;
    if(l){
    const attrs=Object.fromEntries(node.attrs.map(a=>[a.name,a.value]));let value=text.value;
    if(attrs.type==='application/json'||attrs.type==='application/ld+json'){try{value=JSON.stringify(data(JSON.parse(value))).replaceAll('<','\\u003c')}catch(e){if(/Missing /.test(e.message))throw e}}
    else if(!attrs.src)value=js(value);
    if(value!==text.value)changes.push({start:l.startOffset,end:l.endOffset,text:value});
    }
   }
   for(const attr of node.attrs||[]){const l=loc?.attrs?.[attr.name];if(!l)continue;let value=attr.value;
    if(['alt','title','placeholder','aria-label'].includes(attr.name))value=t(value);
    else if(node.tagName==='meta'&&attr.name==='content'){
     const fields=Object.fromEntries(node.attrs.map(a=>[a.name,a.value]));if(['description','og:title','og:description','og:image:alt','twitter:title','twitter:description','twitter:image:alt'].includes(fields.name||fields.property))value=t(value);
    }
    else if(attr.name==='href')value=url(value);
    else if(attr.name==='src'&&scripts.has(value)&&language.prefix)value=language.prefix+value;
    if(value!==attr.value)changes.push({start:l.startOffset,end:l.endOffset,text:attr.name+'="'+escape(value)+'"'+(attr.name==='href'&&attr.value==='/'?' data-locale-home':'')});
   }
   if(node.tagName!=='script'&&node.tagName!=='style'&&node.tagName!=='svg'&&node.tagName!=='code'&&node.tagName!=='pre')for(const child of node.childNodes||[])walk(child,node);
   if(node.content)walk(node.content,node);
  }
  walk(tree,null);return edit(source,changes);
 }
 return {html,js,data,t,url};
}
