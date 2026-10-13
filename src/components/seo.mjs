import {parse} from 'parse5';
const origin='https://yajuas.com';
const fallbackImage='/assets/img/000000000000b4a5418ab7062d06c2d4c47923c4-1200x630.webp';
const products=new Set(['/','/agent-orchestration-system','/agent-hub','/ai-governance','/ai-observability','/ai-spend-explorer','/cli','/credential-vault','/cost-control','/mcp-gateway','/optimizer','/self-hosted','/software-factory','/token-monitoring']);
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const text=n=>n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');
const attrs=n=>Object.fromEntries((n.attrs||[]).map(a=>[a.name,a.value]));
// Source-offset edits preserve existing classes, DOM structure and animation markup.
export function optimizeSeo(source,route,language,dictionary={}){
 const genericAlts=new Set(['Image for Context','Image description','Placeholder'].flatMap(v=>[v,dictionary[v]]).filter(Boolean));
 const tree=parse(source,{sourceCodeLocationInfo:true}),nodes=[];
 function walk(n){nodes.push(n);for(const c of n.childNodes||[])walk(c)}walk(tree);
 const edits=[],remove=n=>{const l=n.sourceCodeLocation;if(l)edits.push({start:l.startOffset,end:l.endOffset,text:''})};
 const metas=new Map(nodes.filter(n=>n.tagName==='meta').map(n=>{const a=attrs(n);return[a.name||a.property,a.content]}));
 const title=text(nodes.find(n=>n.tagName==='title')).trim(),description=(metas.get('description')||'').replace(/\s+/g,' ').trim();
 const canonical=attrs(nodes.find(n=>n.tagName==='link'&&attrs(n).rel==='canonical')).href;
 let image=(metas.get('og:image')||fallbackImage).replace(/\.webp&.*$/,'.webp');image=new URL(image,origin).href;
 const size=image.match(/-(\d+)x(\d+)\.(?:webp|png|jpg)/);
 const replaced=new Set(['description','viewport','og:title','og:description','og:image','og:image:width','og:image:height','og:image:alt','og:site_name','og:type','twitter:card','twitter:site','twitter:creator','twitter:title','twitter:description','twitter:image','twitter:image:alt','twitter:image:width','twitter:image:height']);
 for(const n of nodes){const a=attrs(n);
  if(n.tagName==='meta'&&(a.charset||replaced.has(a.name||a.property)||(route==='/lp/thank-you'&&a.name==='robots')))remove(n);
  if(n.tagName==='script'&&a.type==='application/ld+json'){try{const v=JSON.parse(text(n));if(['Organization','WebSite','SoftwareApplication'].includes(v['@type']))remove(n)}catch{}}
  if(n.tagName==='img'){
   let parent=n.parentNode,link,footer=false;while(parent){if(parent.tagName==='a'&&!link)link=parent;if(parent.tagName==='footer')footer=true;parent=parent.parentNode}
   let tag=source.slice(n.sourceCodeLocation.startOffset,n.sourceCodeLocation.endOffset);
   // Linked decorative covers already have a visible article title; empty alt avoids repeated noise.
   if(genericAlts.has(a.alt)&&(link||a.src?.includes('/blog-covers/')))tag=tag.replace(/\balt="[^"]*"/,'alt=""');
   if(footer&&!a.loading)tag=tag.replace('<img','<img loading="lazy"');
   if((a.loading==='lazy'||footer)&&!a.decoding)tag=tag.replace('<img','<img decoding="async"');
   if(tag!==source.slice(n.sourceCodeLocation.startOffset,n.sourceCodeLocation.endOffset))edits.push({start:n.sourceCodeLocation.startOffset,end:n.sourceCodeLocation.endOffset,text:tag});
  }
 }
 for(const e of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,e.start)+e.text+source.slice(e.end);
 const meta=(key,value,property=false)=>`<meta ${property?'property':'name'}="${key}" content="${escape(value)}">`;
 const organization={'@type':'Organization','@id':origin+'/#organization',name:'Yaju AS',url:origin+'/',logo:origin+'/assets/blog-covers/yaju-logo-negro.png',foundingDate:'2024',foundingLocation:{'@type':'Place',name:'Barcelona'},areaServed:'Worldwide',sameAs:['https://www.linkedin.com/company/yaju-as']};
 const definition='Yaju is the infrastructure layer that deploys, governs and observes AI agents between your teams’ frameworks and enterprise systems.';
 const softwareDescription=dictionary[definition]||definition;
 const graph=[organization,{'@type':'WebSite','@id':origin+'/#website',url:origin+'/',name:'Yaju AS',publisher:{'@id':organization['@id']},inLanguage:['en-US','de','fr','es','ja','ko']},{'@type':'WebPage','@id':canonical+'#webpage',url:canonical,name:title,description,inLanguage:language.code,isPartOf:{'@id':origin+'/#website'},about:{'@id':organization['@id']},primaryImageOfPage:{'@type':'ImageObject',url:image,...(size?{width:Number(size[1]),height:Number(size[2])}:{})}}];
 if((route.startsWith('/customer-stories/')||route.startsWith('/blog/'))&&!route.includes('/tag/')&&!metas.get('robots')?.includes('noindex'))graph.push({'@type':'Article','@id':canonical+'#article',headline:text(nodes.find(n=>n.tagName==='h1')),description,image,mainEntityOfPage:{'@id':canonical+'#webpage'},inLanguage:language.code,publisher:{'@id':organization['@id']}});
 if(products.has(route))graph.push({'@type':'SoftwareApplication','@id':origin+'/#software',name:'Yaju Agent Orchestration System',url:origin+'/agent-orchestration-system',applicationCategory:'BusinessApplication',description:softwareDescription,publisher:{'@id':organization['@id']}});
 const extra=meta('viewport','width=device-width, initial-scale=1, viewport-fit=cover')+meta('description',description)+meta('og:title',title,true)+meta('og:description',description,true)+meta('og:type',metas.get('og:type')||'website',true)+meta('og:site_name','Yaju AS',true)+meta('og:image',image,true)+(size?meta('og:image:width',size[1],true)+meta('og:image:height',size[2],true):'')+meta('og:image:alt',title,true)+meta('twitter:card','summary_large_image')+meta('twitter:title',title)+meta('twitter:description',description)+meta('twitter:image',image)+meta('twitter:image:alt',title)+(route==='/lp/thank-you'?meta('robots','noindex, follow'):'')+'<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@graph':graph}).replaceAll('<','\\u003c')+'</script>';
 return source.replace('<head>','<head><meta charset="utf-8">').replace('</head>',extra+'</head>');
}
