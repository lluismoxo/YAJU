import {readFile,writeFile} from 'node:fs/promises';
const entries=JSON.parse(await readFile('config/native-pages.json','utf8'));
for(const entry of entries){
 const model=JSON.parse(await readFile(entry.source,'utf8'));
 const file=`src/content/pages/${model.key}.head.html`;let head=await readFile(file,'utf8');
 if(head.includes('<title>'))continue;
 const original=await readFile(`artifacts/reference-a1c700f/public/${entry.output}`,'utf8');
 const originalHead=original.match(/<head>([\s\S]*?)<\/head>/)?.[1];if(!originalHead)throw new Error(`Missing reference head: ${model.route}`);
 const metadataSource=original.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
 const tags=[...metadataSource.matchAll(/<title\b[^>]*>[\s\S]*?<\/title>|<meta\b[^>]*>|<link\b[^>]*>/g)].map(m=>m[0]).filter(tag=>tag.startsWith('<title')||tag.startsWith('<meta')||/rel="(?:canonical|alternate|icon|apple-touch-icon)"/.test(tag));
 for(const tag of tags){
  const identity=tag.match(/(?:name|property|charset|rel)="[^"]*"/)?.[0];
  if(identity&&head.includes(identity))continue;
  head+=tag;
 }
 model.title=metadataSource.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]||'';
 await writeFile(file,head);await writeFile(entry.source,JSON.stringify(model,null,2)+'\n');console.log(model.route);
}
