// One-time public-copy translation. Production builds never call a translation service.
import {readFile,writeFile} from 'node:fs/promises';
const source=JSON.parse(await readFile('locales/en-US.json','utf8'));
const locales=process.argv.slice(2).length?process.argv.slice(2):['de','fr','es','ja','ko'];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function translate(items,locale){
 const q=items.map(([s],i)=>`[${String(i).padStart(5,'0')}]\n`+s.replace(/\bYaju\b/g,'__YAJU__')).join('\n');
 const url=new URL('https://translate.googleapis.com/translate_a/single');for(const [k,v]of Object.entries({client:'gtx',sl:'en',tl:locale,dt:'t',q}))url.searchParams.set(k,v);
 let payload;
 for(let retry=0;retry<5;retry++){
  try{const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error(`Translation HTTP ${response.status}`);payload=await response.json();break}catch(e){if(retry===4)throw e;await pause(2000*2**retry)}
 }
 const translated=payload[0].map(part=>part[0]||'').join('');
 const matches=[...translated.matchAll(/\[\s*(\d{5})\s*\]/g)];
 if(matches.length!==items.length||matches.some((m,i)=>Number(m[1])!==i)){
  if(items.length===1)throw Error(`Lost translation boundary ${locale}: ${items[0][0].slice(0,50)}`);
  const mid=Math.ceil(items.length/2);return {...await translate(items.slice(0,mid),locale),...await translate(items.slice(mid),locale)};
 }
 return Object.fromEntries(matches.map((m,i)=>{let value=translated.slice(m.index+m[0].length,matches[i+1]?.index).trim().replace(/__\s*YAJU\s*__/gi,'Yaju');if(!value)throw Error('Empty translation');return[items[i][0],value]}));
}
for(const locale of locales){
 let dictionary={};try{dictionary=JSON.parse(await readFile(`locales/${locale}.json`,'utf8'))}catch{}
 const pending=Object.entries(source).filter(([k])=>!dictionary[k]);const batches=[];let batch=[],size=0;
 for(const item of pending){if(size+item[0].length>3500&&batch.length){batches.push(batch);batch=[];size=0}batch.push(item);size+=item[0].length+12}if(batch.length)batches.push(batch);
 console.log(`${locale}: ${pending.length} strings / ${batches.length} batches`);
 for(let i=0;i<batches.length;i++){
  Object.assign(dictionary,await translate(batches[i],locale));
  await writeFile(`locales/${locale}.json`,JSON.stringify(dictionary,null,2)+'\n');
  if(i%10===0||i===batches.length-1)console.log(`${locale}: ${i+1}/${batches.length}`);
  await pause(180);
 }
}
